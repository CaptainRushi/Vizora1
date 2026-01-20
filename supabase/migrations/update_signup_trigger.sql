-- Apply the updated trigger to the database

-- Drop existing trigger first
DROP TRIGGER IF EXISTS tr_new_user_setup ON auth.users;

-- Drop existing function
DROP FUNCTION IF EXISTS public.handle_new_user_setup();

-- Create updated function that auto-creates workspace
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
DECLARE
    new_workspace_id UUID;
BEGIN
    -- 1. Create user record
    INSERT INTO public.users (id, email, username, display_name)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), 
        NEW.raw_user_meta_data->>'full_name'
    )
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

    -- 2. Create a personal workspace for this user
    INSERT INTO public.workspaces (name, type, owner_id)
    VALUES (
        'Personal Workspace',
        'personal',
        NEW.id
    )
    RETURNING id INTO new_workspace_id;

    -- 3. Link the workspace back to the user
    UPDATE public.users
    SET workspace_id = new_workspace_id
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER tr_new_user_setup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();
