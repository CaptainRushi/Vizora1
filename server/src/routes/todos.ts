
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client
// Note: We use the service role key for backend operations to bypass RLS when needed,
// but for Todo operations, we should respect user context.
// However, since we are using a custom backend, we'll forward the user ID and use
// RLS policies or manual checks.
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl.trim(), supabaseKey.trim());

// Middleware to extract user ID from headers (similar to other routes)
const getUserId = (req: express.Request) => {
    return req.headers['x-user-id'] as string;
};

// GET /api/todos - Fetch all tasks for the user
router.get('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .order('completed', { ascending: true }) // Active first
            .order('due_date', { ascending: true, nullsFirst: false }) // Then by date
            .order('created_at', { ascending: false }); // Then by newest

        if (error) throw error;

        res.json(data);
    } catch (error: any) {
        console.error('[Todos] Fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/todos - Create a new task
router.post('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { title, due_date } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const { data, error } = await supabase
            .from('todos')
            .insert({
                user_id: userId,
                title,
                due_date: due_date || null
            })
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error: any) {
        console.error('[Todos] Create error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/todos/:id - Update a task
router.patch('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;
        const updates = req.body;

        // Allowed fields
        const allowed = ['title', 'completed', 'due_date'];
        const cleanUpdates: any = {};

        allowed.forEach(field => {
            if (updates[field] !== undefined) cleanUpdates[field] = updates[field];
        });

        // If marking complete, set completed_at
        if (cleanUpdates.completed === true) {
            cleanUpdates.completed_at = new Date().toISOString();
        } else if (cleanUpdates.completed === false) {
            cleanUpdates.completed_at = null;
        }

        cleanUpdates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('todos')
            .update(cleanUpdates)
            .eq('id', id)
            .eq('user_id', userId) // Security check
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error: any) {
        console.error('[Todos] Update error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/todos/:id - Delete a task
router.delete('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;

        const { error } = await supabase
            .from('todos')
            .delete()
            .eq('id', id)
            .eq('user_id', userId); // Security check

        if (error) throw error;

        res.json({ success: true });
    } catch (error: any) {
        console.error('[Todos] Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
