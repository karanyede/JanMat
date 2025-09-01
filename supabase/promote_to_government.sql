-- SQL script to promote a user to government official
-- Replace '{{USER_FULL_NAME}}' and '{{USER_EMAIL_FRAGMENT}}' with the actual values of the user you want to promote

UPDATE public.users 
SET role = 'government', 
    department = 'Municipal Corporation',
    updated_at = NOW()
WHERE full_name ILIKE '%{{USER_FULL_NAME}}%' 
   OR email ILIKE '%{{USER_EMAIL_FRAGMENT}}%';

-- Also update the auth.users metadata if it exists
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "government"}'::jsonb
WHERE email ILIKE '%{{USER_EMAIL_FRAGMENT}}%';

-- Verify the changes
SELECT id, email, full_name, role, department, updated_at 
FROM public.users 
WHERE full_name ILIKE '%{{USER_FULL_NAME}}%' 
   OR email ILIKE '%{{USER_EMAIL_FRAGMENT}}%';
