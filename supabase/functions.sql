-- Database Functions for JanMat
-- These functions handle complex operations and maintain data consistency

-- Function to handle user profile creation after auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'citizen')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to upvote an issue
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

-- Function to downvote an issue
CREATE OR REPLACE FUNCTION public.downvote_issue(issue_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID := auth.uid();
BEGIN
    -- Check if user already downvoted
    IF user_id = ANY(
        SELECT downvoted_by FROM public.issues WHERE id = issue_id
    ) THEN
        -- Remove downvote
        UPDATE public.issues 
        SET 
            downvotes = downvotes - 1,
            downvoted_by = array_remove(downvoted_by, user_id),
            upvoted_by = array_remove(upvoted_by, user_id)
        WHERE id = issue_id;
        RETURN FALSE;
    ELSE
        -- Add downvote and remove from upvotes if present
        UPDATE public.issues 
        SET 
            downvotes = downvotes + 1,
            downvoted_by = array_append(downvoted_by, user_id),
            upvotes = CASE 
                WHEN user_id = ANY(upvoted_by) THEN upvotes - 1
                ELSE upvotes
            END,
            upvoted_by = array_remove(upvoted_by, user_id)
        WHERE id = issue_id;
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to like news
CREATE OR REPLACE FUNCTION public.like_news(news_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID := auth.uid();
BEGIN
    -- Check if user already liked
    IF user_id = ANY(
        SELECT liked_by FROM public.news WHERE id = news_id
    ) THEN
        -- Remove like
        UPDATE public.news 
        SET 
            likes = likes - 1,
            liked_by = array_remove(liked_by, user_id)
        WHERE id = news_id;
        RETURN FALSE;
    ELSE
        -- Add like
        UPDATE public.news 
        SET 
            likes = likes + 1,
            liked_by = array_append(liked_by, user_id)
        WHERE id = news_id;
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to vote on a poll
CREATE OR REPLACE FUNCTION public.vote_on_poll(poll_id UUID, option_index INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID := auth.uid();
    poll_options JSONB;
    updated_options JSONB;
BEGIN
    -- Check if user already voted
    IF user_id = ANY(
        SELECT voted_by FROM public.polls WHERE id = poll_id
    ) THEN
        RETURN FALSE; -- User already voted
    END IF;

    -- Get current options
    SELECT options INTO poll_options FROM public.polls WHERE id = poll_id;
    
    -- Update the vote count for the selected option
    updated_options := jsonb_set(
        poll_options,
        ARRAY[option_index::text, 'votes'],
        ((poll_options->option_index->>'votes')::int + 1)::text::jsonb
    );

    -- Update poll with new vote
    UPDATE public.polls 
    SET 
        options = updated_options,
        voted_by = array_append(voted_by, user_id)
    WHERE id = poll_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to follow/unfollow a user
CREATE OR REPLACE FUNCTION public.toggle_follow(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID := auth.uid();
BEGIN
    -- Check if already following
    IF current_user_id = ANY(
        SELECT followers FROM public.users WHERE id = target_user_id
    ) THEN
        -- Unfollow
        UPDATE public.users 
        SET followers = array_remove(followers, current_user_id)
        WHERE id = target_user_id;
        
        UPDATE public.users 
        SET following = array_remove(following, target_user_id)
        WHERE id = current_user_id;
        
        RETURN FALSE;
    ELSE
        -- Follow
        UPDATE public.users 
        SET followers = array_append(followers, current_user_id)
        WHERE id = target_user_id;
        
        UPDATE public.users 
        SET following = array_append(following, target_user_id)
        WHERE id = current_user_id;
        
        -- Create notification
        INSERT INTO public.notifications (user_id, title, message, type, related_id)
        VALUES (
            target_user_id,
            'New Follower',
            (SELECT full_name FROM public.users WHERE id = current_user_id) || ' started following you',
            'follow',
            current_user_id
        );
        
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark story as viewed
CREATE OR REPLACE FUNCTION public.view_story(story_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID := auth.uid();
BEGIN
    -- Check if user already viewed
    IF user_id = ANY(
        SELECT viewed_by FROM public.stories WHERE id = story_id
    ) THEN
        RETURN FALSE; -- Already viewed
    ELSE
        -- Mark as viewed
        UPDATE public.stories 
        SET viewed_by = array_append(viewed_by, user_id)
        WHERE id = story_id;
        
        -- Create notification for story owner
        INSERT INTO public.notifications (user_id, title, message, type, related_id)
        VALUES (
            (SELECT user_id FROM public.stories WHERE id = story_id),
            'Story View',
            (SELECT full_name FROM public.users WHERE id = auth.uid()) || ' viewed your story',
            'story_view',
            story_id
        );
        
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired stories
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.stories 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
    target_user_id UUID,
    notification_title TEXT,
    notification_message TEXT,
    notification_type TEXT,
    related_object_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (target_user_id, notification_title, notification_message, notification_type, related_object_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user feed (issues from followed users and public issues)
CREATE OR REPLACE FUNCTION public.get_user_feed(
    page_limit INTEGER DEFAULT 20,
    page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    issue_id UUID,
    title TEXT,
    description TEXT,
    category issue_category,
    status issue_status,
    priority issue_priority,
    location TEXT,
    image_urls TEXT[],
    upvotes INTEGER,
    created_at TIMESTAMPTZ,
    reporter_name TEXT,
    reporter_avatar TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.title,
        i.description,
        i.category,
        i.status,
        i.priority,
        i.location,
        i.image_urls,
        i.upvotes,
        i.created_at,
        u.full_name,
        u.avatar_url
    FROM public.issues i
    JOIN public.users u ON i.reporter_id = u.id
    WHERE i.is_public = true
    ORDER BY 
        CASE 
            WHEN i.reporter_id = ANY(
                SELECT following FROM public.users WHERE id = auth.uid()
            ) THEN 1
            ELSE 2
        END,
        i.created_at DESC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
