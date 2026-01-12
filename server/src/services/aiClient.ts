import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : undefined,
    defaultHeaders: {
        "HTTP-Referer": process.env.SITE_URL || "https://vizora.app",
        "X-Title": "Vizora Schema Intelligence",
    },
});

export async function askAI(prompt: string, systemPrompt: string) {
    try {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: "system", content: systemPrompt + "\n\nCRITICAL: You must return a valid JSON object only." },
            { role: "user", content: prompt }
        ];

        const response = await openai.chat.completions.create({
            model: (process.env.OPENROUTER_API_KEY ? "openai/gpt-4o-mini" : "gpt-4o-mini") as string,
            messages: messages,
            response_format: { type: "json_object" }
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('AI returned empty response');

        return JSON.parse(content);
    } catch (error) {
        console.error('[aiClient] Error calling AI:', error);
        throw error;
    }
}

export async function generateTextAI(prompt: string, systemPrompt: string) {
    try {
        const response = await openai.chat.completions.create({
            model: process.env.OPENROUTER_API_KEY ? "openai/gpt-4o-mini" : "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ]
        });

        return response.choices[0]?.message?.content || '';
    } catch (error) {
        console.error('[aiClient] Error calling AI (text):', error);
        throw error;
    }
}
