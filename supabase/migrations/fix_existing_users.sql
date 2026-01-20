-- One-time fix for existing users who signed up before the trigger update
-- This ensures all existing users have a linked workspace

DO $$
DECLARE
    user_record RECORD;
    ws_id UUID;
BEGIN
    FOR user_record IN 
        SELECT id FROM public.users WHERE workspace_id IS NULL
    LOOP
        -- Try to find an existing workspace owned by this user
        SELECT id INTO ws_id
        FROM public.workspaces
        WHERE owner_id = user_record.id
        LIMIT 1;

        -- If no workspace exists, create one
        IF ws_id IS NULL THEN
            INSERT INTO public.workspaces (name, type, owner_id)
            VALUES ('Personal Workspace', 'personal', user_record.id)
            RETURNING id INTO ws_id;
        END IF;

        -- Link workspace to user
        UPDATE public.users
        SET workspace_id = ws_id
        WHERE id = user_record.id;

        RAISE NOTICE 'Linked workspace % to user %', ws_id, user_record.id;
    END LOOP;
END $$;
