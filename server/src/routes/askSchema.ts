import { Router } from 'express';
import { getLatestNormalizedSchema, supabase } from '../services/schemaUtils.js';
import { askAI } from '../services/aiClient.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// ASK SCHEMA — DEEP REPLY CONTEXT DESIGN
// Engineering-Grade Schema Reasoning with Full Provenance
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 1️⃣ QUESTION CLASSIFICATION & INTENT DETECTION
// ─────────────────────────────────────────────────────────────────────────────

type IntentType =
    | 'impact_analysis'
    | 'dependency_query'
    | 'structure_query'
    | 'relationship_query'
    | 'risk_assessment'
    | 'general_query';

type OperationType =
    | 'destructive_change'
    | 'modification'
    | 'read_only'
    | 'unknown';

interface QuestionClassification {
    intent: IntentType;
    operation_type: OperationType;
    keywords_detected: string[];
}

function classifyQuestion(question: string): QuestionClassification {
    const lowerQ = question.toLowerCase();
    const keywords: string[] = [];

    // Detect keywords
    const destructiveKeywords = ['delete', 'drop', 'remove', 'truncate', 'destroy'];
    const modificationKeywords = ['change', 'modify', 'alter', 'update', 'rename', 'add'];
    const dependencyKeywords = ['relationship', 'foreign key', 'reference', 'depend', 'connect', 'link', 'join'];
    const impactKeywords = ['break', 'affect', 'impact', 'consequence', 'what happens'];
    const structureKeywords = ['what', 'which', 'list', 'show', 'describe', 'explain', 'how many', 'count'];

    destructiveKeywords.forEach(k => { if (lowerQ.includes(k)) keywords.push(k); });
    modificationKeywords.forEach(k => { if (lowerQ.includes(k)) keywords.push(k); });
    dependencyKeywords.forEach(k => { if (lowerQ.includes(k)) keywords.push(k); });
    impactKeywords.forEach(k => { if (lowerQ.includes(k)) keywords.push(k); });

    // Determine operation type
    let operation_type: OperationType = 'read_only';
    if (destructiveKeywords.some(k => lowerQ.includes(k))) {
        operation_type = 'destructive_change';
    } else if (modificationKeywords.some(k => lowerQ.includes(k))) {
        operation_type = 'modification';
    }

    // Determine intent
    let intent: IntentType = 'general_query';

    if (operation_type === 'destructive_change' || impactKeywords.some(k => lowerQ.includes(k))) {
        intent = 'impact_analysis';
    } else if (destructiveKeywords.some(k => lowerQ.includes(k))) {
        intent = 'risk_assessment';
    } else if (dependencyKeywords.some(k => lowerQ.includes(k))) {
        intent = 'relationship_query';
    } else if (structureKeywords.some(k => lowerQ.includes(k))) {
        intent = 'structure_query';
    }

    return { intent, operation_type, keywords_detected: keywords };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2️⃣ EXTRACT TARGET ENTITIES FROM QUESTION
// ─────────────────────────────────────────────────────────────────────────────

function extractTargetEntities(question: string, availableTables: string[]): string[] {
    const targets: string[] = [];
    const lowerQ = question.toLowerCase();

    for (const table of availableTables) {
        if (lowerQ.includes(table.toLowerCase())) {
            targets.push(table);
        }
    }

    return targets;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3️⃣ BUILD STRICT SCHEMA CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

interface SchemaContext {
    schema_version: number;
    tables: {
        [tableName: string]: {
            columns: string[];
            relations: {
                [columnName: string]: string;
            };
        };
    };
}

function buildSchemaContext(schema: any, version: number): SchemaContext {
    const context: SchemaContext = {
        schema_version: version,
        tables: {}
    };

    if (schema.tables) {
        for (const [tableName, tableData] of Object.entries(schema.tables)) {
            const table = tableData as any;
            const relations: { [key: string]: string } = {};

            if (table.relations && Array.isArray(table.relations)) {
                for (const rel of table.relations) {
                    if (rel.from && rel.to) {
                        const fromCol = rel.from.split('.')[1] || rel.from;
                        relations[fromCol] = rel.to;
                    }
                }
            }

            context.tables[tableName] = {
                columns: table.columns ? Object.keys(table.columns) : [],
                relations
            };
        }
    }

    return context;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4️⃣ SYSTEM PROMPT — DEEP REPLY CONTEXT (DO NOT CHANGE)
// ─────────────────────────────────────────────────────────────────────────────

const DEEP_REPLY_SYSTEM_PROMPT = `You are a schema-constrained database reasoning assistant with engineering-grade precision.

You MUST follow these rules STRICTLY:

1. Answer ONLY using the provided schema context.
2. Do NOT assume business logic, data volume, or runtime behavior.
3. Do NOT guess or generalize.
4. If information is missing, explicitly state what cannot be determined.

EVERY response MUST include ALL SIX sections below. No section is optional.

REQUIRED RESPONSE FORMAT (STRICT JSON):

{
  "question_interpretation": {
    "intent": "impact_analysis | dependency_query | structure_query | relationship_query | risk_assessment | general_query",
    "target_entities": ["table1", "table2"],
    "operation_type": "destructive_change | modification | read_only | unknown",
    "why_this_interpretation": "Detailed explanation of how the question was understood"
  },
  "answer": "Concise, factual answer. No fluff. No advice unless asked.",
  "schema_evidence": {
    "schema_version": <number>,
    "tables_involved": ["table1", "table2"],
    "columns_involved": ["table.column1", "table.column2"],
    "relationships_used": [
      {
        "from": "table1.column",
        "to": "table2.column",
        "type": "foreign_key"
      }
    ]
  },
  "impact_and_risk": {
    "risk_level": "none | low | medium | high",
    "impact_scope": ["specific_impact_1", "specific_impact_2"],
    "why_this_risk_level": "Explanation of why this risk level was assigned"
  },
  "reasoning_trace": [
    "Step 1: What was identified",
    "Step 2: What was analyzed",
    "Step 3: What was determined",
    "Step 4: Final conclusion"
  ],
  "confidence_and_limits": {
    "confidence": "high | medium | low",
    "what_is_known": ["schema structure", "table relationships"],
    "what_is_not_known": ["runtime usage", "application logic", "data volume"]
  }
}

RISK LEVEL RULES (MANDATORY):
- Any delete/drop/remove operation → minimum "medium"
- Foreign key dependency affected → "high"
- Multiple tables affected → "high"
- Standalone table with no dependencies → "low"
- Read-only queries → "none"

CONFIDENCE RULES:
- "high" → Answer derived directly from schema with clear evidence
- "medium" → Some inference required but grounded in schema
- "low" → Limited schema information available

If the question cannot be answered from the schema, respond with:
{
  "question_interpretation": {
    "intent": "general_query",
    "target_entities": [],
    "operation_type": "unknown",
    "why_this_interpretation": "The question cannot be mapped to schema entities"
  },
  "answer": "This cannot be determined from the current schema.",
  "schema_evidence": {
    "schema_version": <number>,
    "tables_involved": [],
    "columns_involved": [],
    "relationships_used": []
  },
  "impact_and_risk": {
    "risk_level": "none",
    "impact_scope": [],
    "why_this_risk_level": "No schema impact can be determined"
  },
  "reasoning_trace": ["Analyzed question", "Could not map to schema entities", "Insufficient information to provide answer"],
  "confidence_and_limits": {
    "confidence": "low",
    "what_is_known": [],
    "what_is_not_known": ["The question references concepts not present in the schema"]
  }
}`;

// ─────────────────────────────────────────────────────────────────────────────
// 5️⃣ RESPONSE INTERFACES (STRICT TYPING)
// ─────────────────────────────────────────────────────────────────────────────

interface RelationshipUsed {
    from: string;
    to: string;
    type: string;
}

interface QuestionInterpretation {
    intent: IntentType;
    target_entities: string[];
    operation_type: OperationType;
    why_this_interpretation: string;
}

interface SchemaEvidence {
    schema_version: number;
    tables_involved: string[];
    columns_involved: string[];
    relationships_used: RelationshipUsed[];
}

interface ImpactAndRisk {
    risk_level: 'none' | 'low' | 'medium' | 'high';
    impact_scope: string[];
    why_this_risk_level: string;
}

interface ConfidenceAndLimits {
    confidence: 'high' | 'medium' | 'low';
    what_is_known: string[];
    what_is_not_known: string[];
}

interface DeepReplyResponse {
    question_interpretation: QuestionInterpretation;
    answer: string;
    schema_evidence: SchemaEvidence;
    impact_and_risk: ImpactAndRisk;
    reasoning_trace: string[];
    confidence_and_limits: ConfidenceAndLimits;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6️⃣ VALIDATE AND ENFORCE RESPONSE STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

function validateDeepReplyResponse(
    aiResponse: any,
    schemaVersion: number,
    availableTables: string[],
    classification: QuestionClassification,
    targetEntities: string[]
): DeepReplyResponse {

    const defaultResponse: DeepReplyResponse = {
        question_interpretation: {
            intent: classification.intent,
            target_entities: targetEntities,
            operation_type: classification.operation_type,
            why_this_interpretation: 'Classified based on detected keywords and question structure'
        },
        answer: 'Unable to process the question. Please try rephrasing.',
        schema_evidence: {
            schema_version: schemaVersion,
            tables_involved: [],
            columns_involved: [],
            relationships_used: []
        },
        impact_and_risk: {
            risk_level: 'none',
            impact_scope: [],
            why_this_risk_level: 'Unable to assess risk'
        },
        reasoning_trace: ['Error occurred during processing'],
        confidence_and_limits: {
            confidence: 'low',
            what_is_known: [],
            what_is_not_known: ['Processing error occurred']
        }
    };

    try {
        // Build validated response
        const validated: DeepReplyResponse = {
            question_interpretation: {
                intent: aiResponse.question_interpretation?.intent || classification.intent,
                target_entities: Array.isArray(aiResponse.question_interpretation?.target_entities)
                    ? aiResponse.question_interpretation.target_entities
                    : targetEntities,
                operation_type: aiResponse.question_interpretation?.operation_type || classification.operation_type,
                why_this_interpretation: aiResponse.question_interpretation?.why_this_interpretation ||
                    `Detected keywords: ${classification.keywords_detected.join(', ') || 'none'}`
            },
            answer: aiResponse.answer || defaultResponse.answer,
            schema_evidence: {
                schema_version: schemaVersion, // Always use server-side version
                tables_involved: Array.isArray(aiResponse.schema_evidence?.tables_involved)
                    ? aiResponse.schema_evidence.tables_involved
                    : [],
                columns_involved: Array.isArray(aiResponse.schema_evidence?.columns_involved)
                    ? aiResponse.schema_evidence.columns_involved
                    : [],
                relationships_used: Array.isArray(aiResponse.schema_evidence?.relationships_used)
                    ? aiResponse.schema_evidence.relationships_used.map((r: any) => ({
                        from: r.from || '',
                        to: r.to || '',
                        type: r.type || 'foreign_key'
                    }))
                    : []
            },
            impact_and_risk: {
                risk_level: aiResponse.impact_and_risk?.risk_level || 'none',
                impact_scope: Array.isArray(aiResponse.impact_and_risk?.impact_scope)
                    ? aiResponse.impact_and_risk.impact_scope
                    : [],
                why_this_risk_level: aiResponse.impact_and_risk?.why_this_risk_level || 'No risk assessment available'
            },
            reasoning_trace: Array.isArray(aiResponse.reasoning_trace)
                ? aiResponse.reasoning_trace
                : ['Analysis performed based on schema context'],
            confidence_and_limits: {
                confidence: aiResponse.confidence_and_limits?.confidence || 'medium',
                what_is_known: Array.isArray(aiResponse.confidence_and_limits?.what_is_known)
                    ? aiResponse.confidence_and_limits.what_is_known
                    : ['schema structure'],
                what_is_not_known: Array.isArray(aiResponse.confidence_and_limits?.what_is_not_known)
                    ? aiResponse.confidence_and_limits.what_is_not_known
                    : ['runtime behavior', 'application logic']
            }
        };

        // ═══════════════════════════════════════════════════════════════════
        // SERVER-SIDE VALIDATION & ENFORCEMENT
        // ═══════════════════════════════════════════════════════════════════

        // Validate referenced tables exist in schema
        const invalidTables = validated.schema_evidence.tables_involved.filter(
            t => !availableTables.includes(t)
        );
        if (invalidTables.length > 0) {
            validated.confidence_and_limits.confidence = 'low';
            validated.confidence_and_limits.what_is_not_known.push(
                `AI referenced non-existent tables: ${invalidTables.join(', ')}`
            );
        }

        // Enforce minimum risk level for destructive operations
        if (classification.operation_type === 'destructive_change') {
            if (validated.impact_and_risk.risk_level === 'none' ||
                validated.impact_and_risk.risk_level === 'low') {
                validated.impact_and_risk.risk_level = 'medium';
                validated.impact_and_risk.why_this_risk_level =
                    `Risk elevated to medium: Destructive operation detected. ${validated.impact_and_risk.why_this_risk_level}`;
            }
        }

        // Elevate to high risk if foreign key relationships are involved
        if (classification.operation_type === 'destructive_change' &&
            validated.schema_evidence.relationships_used.length > 0) {
            validated.impact_and_risk.risk_level = 'high';
            validated.impact_and_risk.why_this_risk_level =
                `High risk: Foreign key relationships would be affected. ${validated.impact_and_risk.why_this_risk_level}`;
        }

        return validated;

    } catch (err) {
        console.error('[askSchema] Response validation error:', err);
        return defaultResponse;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ROUTE
// ═══════════════════════════════════════════════════════════════════════════

router.post('/ask', async (req, res) => {
    try {
        const { project_id, question } = req.body;

        if (!project_id || !question) {
            return res.status(400).json({ error: 'project_id and question are required' });
        }

        // STEP 1: Load schema context
        let schema: any, version: number;
        try {
            const result = await getLatestNormalizedSchema(project_id);
            schema = result.schema;
            version = result.version;
        } catch (err) {
            return res.json({
                state: "empty",
                reason: "no_schema"
            });
        }

        // STEP 2: Build schema context and get available tables
        const schemaContext = buildSchemaContext(schema, version);
        const availableTables = Object.keys(schemaContext.tables);

        // STEP 3: Classify the question
        const classification = classifyQuestion(question);

        // STEP 4: Extract target entities from question
        const targetEntities = extractTargetEntities(question, availableTables);

        // STEP 5: Construct the full system prompt
        const fullSystemPrompt = `${DEEP_REPLY_SYSTEM_PROMPT}

Schema Context:
${JSON.stringify(schemaContext, null, 2)}

Question Classification (for reference):
- Intent: ${classification.intent}
- Operation Type: ${classification.operation_type}
- Detected Keywords: ${classification.keywords_detected.join(', ') || 'none'}
- Potential Target Entities: ${targetEntities.join(', ') || 'none detected'}`;

        // STEP 6: User prompt
        const userPrompt = `User Question:
${question}

Provide a complete response with all six required sections.`;

        // STEP 7: Call AI
        const aiResponse = await askAI(userPrompt, fullSystemPrompt);

        // STEP 8: Validate and enforce response structure
        const validatedResponse = validateDeepReplyResponse(
            aiResponse,
            version,
            availableTables,
            classification,
            targetEntities
        );

        // STEP 9: Log the query
        await supabase.from('ask_schema_logs').insert({
            project_id,
            schema_version: version,
            question,
            question_intent: validatedResponse.question_interpretation.intent,
            operation_type: validatedResponse.question_interpretation.operation_type,
            referenced_tables: validatedResponse.schema_evidence.tables_involved,
            risk_level: validatedResponse.impact_and_risk.risk_level,
            confidence: validatedResponse.confidence_and_limits.confidence,
            created_at: new Date().toISOString()
        });

        // Return the deep reply response
        res.json(validatedResponse);

    } catch (error: any) {
        console.error('[askSchema Route] Error:', error);
        res.status(500).json({
            question_interpretation: {
                intent: 'general_query',
                target_entities: [],
                operation_type: 'unknown',
                why_this_interpretation: 'Server error occurred'
            },
            answer: 'An internal error occurred while processing your question. Please try again.',
            schema_evidence: {
                schema_version: 0,
                tables_involved: [],
                columns_involved: [],
                relationships_used: []
            },
            impact_and_risk: {
                risk_level: 'none',
                impact_scope: [],
                why_this_risk_level: 'Unable to assess due to error'
            },
            reasoning_trace: ['Error occurred during processing'],
            confidence_and_limits: {
                confidence: 'low',
                what_is_known: [],
                what_is_not_known: ['Processing failed due to server error']
            }
        });
    }
});

export default router;
