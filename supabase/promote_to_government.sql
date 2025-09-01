-- SQL script to promote a user to government official
-- Replace 'prathamesh korde' with the actual full_name of the user you want to promote

UPDATE public.users 
SET role = 'government', 
    department = 'Municipal Corporation',
    updated_at = NOW()
WHERE full_name ILIKE '%prathamesh korde%' 
   OR email ILIKE '%prathamesh%';

-- Also update the auth.users metadata if it exists
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "government"}'::jsonb
WHERE email ILIKE '%prathamesh%';

-- Verify the changes
SELECT id, email, full_name, role, department, updated_at 
FROM public.users 
WHERE full_name ILIKE '%prathamesh korde%' 
   OR email ILIKE '%prathamesh%';
