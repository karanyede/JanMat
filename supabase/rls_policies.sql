-- Row Level Security (RLS) Policies for JanMat
-- These policies ensure data access is controlled based on user roles and ownership

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM public.users 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
-- Users can read public profiles and their own profile
DROP POLICY IF EXISTS "Users can view public profiles" ON public.users;
CREATE POLICY "Users can view public profiles" ON public.users
    FOR SELECT USING (
        is_public = true OR 
        id = auth.uid()
    );

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (id = auth.uid());

-- Users can insert their own profile (for registration)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (id = auth.uid());

-- Issues table policies
-- Anyone can read public issues
DROP POLICY IF EXISTS "Anyone can view public issues" ON public.issues;
CREATE POLICY "Anyone can view public issues" ON public.issues
    FOR SELECT USING (
        is_public = true OR 
        reporter_id = auth.uid() OR
        assigned_to = auth.uid()
    );

-- Authenticated users can create issues
DROP POLICY IF EXISTS "Authenticated users can create issues" ON public.issues;
CREATE POLICY "Authenticated users can create issues" ON public.issues
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        reporter_id = auth.uid()
    );

-- Users can update their own issues, government can update any issue
DROP POLICY IF EXISTS "Users can update issues" ON public.issues;
CREATE POLICY "Users can update issues" ON public.issues
    FOR UPDATE USING (
        reporter_id = auth.uid() OR 
        public.get_user_role() = 'government'
    );

-- Government users can delete issues
DROP POLICY IF EXISTS "Government can delete issues" ON public.issues;
CREATE POLICY "Government can delete issues" ON public.issues
    FOR DELETE USING (public.get_user_role() = 'government');

-- Comments table policies
-- Anyone can read comments on public issues
DROP POLICY IF EXISTS "Anyone can view comments on public issues" ON public.comments;
CREATE POLICY "Anyone can view comments on public issues" ON public.comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.issues 
            WHERE id = comments.issue_id 
            AND (is_public = true OR reporter_id = auth.uid())
        )
    );

-- Authenticated users can create comments
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
CREATE POLICY "Authenticated users can create comments" ON public.comments
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        author_id = auth.uid()
    );

-- Users can update their own comments, government can update any comment
DROP POLICY IF EXISTS "Users can update comments" ON public.comments;
CREATE POLICY "Users can update comments" ON public.comments
    FOR UPDATE USING (
        author_id = auth.uid() OR 
        public.get_user_role() = 'government'
    );

-- Users can delete their own comments, government can delete any comment
DROP POLICY IF EXISTS "Users can delete comments" ON public.comments;
CREATE POLICY "Users can delete comments" ON public.comments
    FOR DELETE USING (
        author_id = auth.uid() OR 
        public.get_user_role() = 'government'
    );

-- News table policies
-- Anyone can read published news
DROP POLICY IF EXISTS "Anyone can view published news" ON public.news;
CREATE POLICY "Anyone can view published news" ON public.news
    FOR SELECT USING (
        published = true OR 
        author_id = auth.uid() OR
        public.get_user_role() IN ('government', 'journalist')
    );

-- Government and journalist users can create news
DROP POLICY IF EXISTS "Government and journalists can create news" ON public.news;
CREATE POLICY "Government and journalists can create news" ON public.news
    FOR INSERT WITH CHECK (
        public.get_user_role() IN ('government', 'journalist') AND
        author_id = auth.uid()
    );

-- Government and journalist users can update their own news
DROP POLICY IF EXISTS "Authors can update their news" ON public.news;
CREATE POLICY "Authors can update their news" ON public.news
    FOR UPDATE USING (
        author_id = auth.uid() AND 
        public.get_user_role() IN ('government', 'journalist')
    );

-- Authors can delete their own news
DROP POLICY IF EXISTS "Authors can delete their news" ON public.news;
CREATE POLICY "Authors can delete their news" ON public.news
    FOR DELETE USING (
        author_id = auth.uid() AND 
        public.get_user_role() IN ('government', 'journalist')
    );

-- Allow users to like news (update likes count)
DROP POLICY IF EXISTS "Users can like news" ON public.news;
CREATE POLICY "Users can like news" ON public.news
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Posts table policies (for government announcements)
-- Anyone can read published posts
DROP POLICY IF EXISTS "Anyone can view published posts" ON public.posts;
CREATE POLICY "Anyone can view published posts" ON public.posts
    FOR SELECT USING (
        published = true OR 
        author_id = auth.uid() OR
        public.get_user_role() = 'government'
    );

-- Only government users can create posts
DROP POLICY IF EXISTS "Government can create posts" ON public.posts;
CREATE POLICY "Government can create posts" ON public.posts
    FOR INSERT WITH CHECK (
        public.get_user_role() = 'government' AND
        author_id = auth.uid()
    );

-- Government users can update their own posts
DROP POLICY IF EXISTS "Government can update posts" ON public.posts;
CREATE POLICY "Government can update posts" ON public.posts
    FOR UPDATE USING (
        author_id = auth.uid() AND 
        public.get_user_role() = 'government'
    );

-- Government users can delete their own posts
DROP POLICY IF EXISTS "Government can delete posts" ON public.posts;
CREATE POLICY "Government can delete posts" ON public.posts
    FOR DELETE USING (
        author_id = auth.uid() AND 
        public.get_user_role() = 'government'
    );

-- Allow users to like posts (update likes count)
DROP POLICY IF EXISTS "Users can like posts" ON public.posts;
CREATE POLICY "Users can like posts" ON public.posts
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Polls table policies
-- Anyone can read active polls
DROP POLICY IF EXISTS "Anyone can view active polls" ON public.polls;
CREATE POLICY "Anyone can view active polls" ON public.polls
    FOR SELECT USING (
        is_active = true OR 
        creator_id = auth.uid() OR
        public.get_user_role() = 'government'
    );

-- Government users can create polls
DROP POLICY IF EXISTS "Government can create polls" ON public.polls;
CREATE POLICY "Government can create polls" ON public.polls
    FOR INSERT WITH CHECK (
        public.get_user_role() = 'government' AND
        creator_id = auth.uid()
    );

-- Government users can update polls
DROP POLICY IF EXISTS "Government can update polls" ON public.polls;
CREATE POLICY "Government can update polls" ON public.polls
    FOR UPDATE USING (public.get_user_role() = 'government');

-- Allow users to vote on polls (update votes)
DROP POLICY IF EXISTS "Users can vote on polls" ON public.polls;
CREATE POLICY "Users can vote on polls" ON public.polls
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Government users can delete polls
DROP POLICY IF EXISTS "Government can delete polls" ON public.polls;
CREATE POLICY "Government can delete polls" ON public.polls
    FOR DELETE USING (public.get_user_role() = 'government');

-- Stories table policies
-- Users can read stories from users they follow or their own stories
DROP POLICY IF EXISTS "Users can view relevant stories" ON public.stories;
CREATE POLICY "Users can view relevant stories" ON public.stories
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND stories.user_id = ANY(following)
        ) OR
        expires_at > NOW()
    );

-- Authenticated users can create their own stories
DROP POLICY IF EXISTS "Users can create own stories" ON public.stories;
CREATE POLICY "Users can create own stories" ON public.stories
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        user_id = auth.uid()
    );

-- Users can update their own stories (for view tracking)
DROP POLICY IF EXISTS "Users can update own stories" ON public.stories;
CREATE POLICY "Users can update own stories" ON public.stories
    FOR UPDATE USING (
        user_id = auth.uid() OR 
        auth.uid() IS NOT NULL -- Allow others to update view tracking
    );

-- Users can delete their own stories
DROP POLICY IF EXISTS "Users can delete own stories" ON public.stories;
CREATE POLICY "Users can delete own stories" ON public.stories
    FOR DELETE USING (user_id = auth.uid());

-- Notifications table policies
-- Users can only see their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

-- System can create notifications (handled by functions)
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (user_id = auth.uid());
