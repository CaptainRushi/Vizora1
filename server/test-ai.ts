
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function test() {
    console.log("Checking OpenAI Key:", process.env.OPENAI_API_KEY ? "Present" : "Missing");
    try {
        const res = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "hi" }],
            max_tokens: 5
        });
        console.log("OpenAI Test Success:", res.choices[0].message.content);
    } catch (err: any) {
        console.error("OpenAI Test Failure:", err.message);
    }

    try {
        const { data, error } = await supabase.from('projects').select('id').limit(1);
        console.log("Supabase Test:", error ? ("Failure: " + error.message) : ("Success, found " + data.length + " projects"));
    } catch (err: any) {
        console.error("Supabase Test Unexpected Failure:", err.message);
    }
}

test();
