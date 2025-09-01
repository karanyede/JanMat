-- Fix for verification system
-- Add missing verification fields to users table and create verification_requests table

-- Add verification fields to users table if they don't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS verification_type TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Create verification_requests table
CREATE TABLE IF NOT EXISTS public.verification_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('citizen_verification', 'journalist_verification', 'official_verification')),
    documents TEXT[] DEFAULT '{}',
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for verification_requests
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON public.verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON public.verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_created_at ON public.verification_requests(created_at DESC);

-- Add updated_at trigger for verification_requests
DROP TRIGGER IF EXISTS handle_updated_at ON public.verification_requests;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function to approve verification requests and update user roles
CREATE OR REPLACE FUNCTION public.approve_verification(
    request_id UUID,
    notes TEXT DEFAULT ''
)
RETURNS BOOLEAN AS $$
DECLARE
    v_request RECORD;
    new_role user_role;
BEGIN
    -- Get the verification request details
    SELECT * INTO v_request
    FROM public.verification_requests
    WHERE id = request_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Determine the new role based on request type
    CASE v_request.request_type
        WHEN 'citizen_verification' THEN
            new_role := 'citizen';
        WHEN 'journalist_verification' THEN
            new_role := 'journalist';
        WHEN 'official_verification' THEN
            new_role := 'government';
        ELSE
            RETURN FALSE;
    END CASE;

    -- Update the user's role and verification status
    UPDATE public.users
    SET 
        role = new_role,
        is_verified = TRUE,
        verified_at = NOW(),
        verification_type = v_request.request_type,
        updated_at = NOW()
    WHERE id = v_request.user_id;

    -- Update the verification request status
    UPDATE public.verification_requests
    SET 
        status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        review_notes = notes,
        updated_at = NOW()
    WHERE id = request_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject verification requests
CREATE OR REPLACE FUNCTION public.reject_verification(
    request_id UUID,
    notes TEXT DEFAULT ''
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update the verification request status
    UPDATE public.verification_requests
    SET 
        status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        review_notes = notes,
        updated_at = NOW()
    WHERE id = request_id AND status = 'pending';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure upvote_issue function exists (may already be in functions.sql)
-- This function handles upvoting with proper concurrency control
CREATE OR REPLACE FUNCTION public.upvote_issue(issue_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID := auth.uid();
BEGIN
    -- Check if user already upvoted
    IF user_id = ANY(
        SELECT upvoted_by FROM public.issues WHERE id = issue_id
    ) THEN
        -- Remove upvote
        UPDATE public.issues 
        SET 
            upvotes = upvotes - 1,
            upvoted_by = array_remove(upvoted_by, user_id),
            downvoted_by = array_remove(downvoted_by, user_id)
        WHERE id = issue_id;
        RETURN FALSE;
    ELSE
        -- Add upvote and remove from downvotes if present
        UPDATE public.issues 
        SET 
            upvotes = upvotes + 1,
            upvoted_by = array_append(upvoted_by, user_id),
            downvotes = CASE 
                WHEN user_id = ANY(downvoted_by) THEN downvotes - 1
                ELSE downvotes
            END,
            downvoted_by = array_remove(downvoted_by, user_id)
        WHERE id = issue_id;
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
