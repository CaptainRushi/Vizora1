import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';

/**
 * CRITICAL ARCHITECTURAL RULE:
 * All schema-related operations MUST have a valid project_id.
 * This middleware enforces the project-scoped boundary.
 */
export const requireProjectContext = async (req: Request, res: Response, next: NextFunction) => {
    const projectId = req.params.id;

    console.log(`[requireProjectContext] Checking project: ${projectId}`);

    if (!projectId) {
        console.error('[requireProjectContext] No project ID in params');
        return res.status(400).json({
            error: "Project context required",
            message: "All schema operations must be performed within a project"
        });
    }

    // Verify project exists
    try {
        const { data: project, error } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .single();

        if (error) {
            console.error(`[requireProjectContext] DB Error for ${projectId}:`, error);
            // If it's a "Row not found" error (code PGRST116), handle as 404
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    error: "Project not found",
                    message: `No project exists with id: ${projectId}`
                });
            }
            return res.status(500).json({
                error: "Database error verifying project",
                details: error.message
            });
        }

        if (!project) {
            return res.status(404).json({
                error: "Project not found",
                message: `No project exists with id: ${projectId}`
            });
        }

        console.log(`[requireProjectContext] Project verified: ${projectId}`);
        next();
    } catch (err: any) {
        console.error('[requireProjectContext] Unexpected error:', err);
        res.status(500).json({ error: err.message });
    }
};
