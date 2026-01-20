
import axios from 'axios';

async function testMe() {
    const userId = '062400e9-ea2d-450f-9099-2396e952796e'; // Found in migration or logs? No, wait.
    // I need a real userId. I'll get it from auth.users via supabase.

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = 'https://yalhbgbmdfgmksfbzvpu.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbGhiZ2JtZGZnbWtzZmJ6dnB1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzUwNDY4NCwiZXhwIjoyMDgzMDgwNjg0fQ.NVOMbIt67QEOLybD0vpU7_GvaxenUEAguvpEEv9LLvk';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error || !users.length) {
        console.error('Failed to get test user:', error);
        return;
    }

    const testUser = users[0];
    console.log('Testing with userId:', testUser.id);

    try {
        const response = await axios.get('http://localhost:3001/api/me', {
            headers: { 'x-user-id': testUser.id }
        });
        console.log('Response:', response.data);
    } catch (err: any) {
        console.error('Error Status:', err.response?.status);
        console.error('Error Data:', JSON.stringify(err.response?.data, null, 2));
    }
}

testMe();
