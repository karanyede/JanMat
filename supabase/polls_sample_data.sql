-- Enhanced Polls Sample Data for JanMat
-- Run this after setting up users and basic data

-- First, ensure we have polls data by checking for government users
DO $$
DECLARE
    gov_user_id uuid;
BEGIN
    -- Get a government user ID
    SELECT id INTO gov_user_id 
    FROM public.users 
    WHERE role = 'government' 
    LIMIT 1;
    
    -- If no government user exists, create one
    IF gov_user_id IS NULL THEN
        INSERT INTO public.users (
            id, email, full_name, role, department, avatar_url, bio, is_public
        ) VALUES (
            gen_random_uuid(),
            'admin@mumbai.gov.in',
            'Mumbai Municipal Corporation',
            'government',
            'Public Works',
            'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100',
            'Official account of Mumbai Municipal Corporation',
            true
        ) RETURNING id INTO gov_user_id;
    END IF;
    
    -- Clear existing sample polls to avoid duplicates
    DELETE FROM public.polls WHERE title LIKE '%sample%' OR title IN (
        'Should we build a new library downtown?',
        'New Bus Route Proposal',
        'Community Garden Initiative',
        'Street Light Upgrade Program',
        'Waste Management System',
        'Traffic Signal Optimization'
    );
    
    -- Insert diverse poll samples
    INSERT INTO public.polls (title, description, options, creator_id, is_active, end_date, created_at) VALUES
    
    -- Active polls
    (
        'New Bus Route Proposal',
        'We are considering a new bus route connecting the IT hub to the main railway station. This would help reduce traffic congestion and provide better public transport connectivity.',
        '[
            {"text": "Strongly support - much needed connectivity", "votes": 45},
            {"text": "Support with some route modifications", "votes": 23},
            {"text": "Neutral - need more details", "votes": 12},
            {"text": "Against - focus on existing routes first", "votes": 8}
        ]'::jsonb,
        gov_user_id,
        true,
        NOW() + INTERVAL '15 days',
        NOW() - INTERVAL '3 days'
    ),
    
    (
        'Community Garden Initiative',
        'Proposal to convert the vacant lot on Park Street into a community garden where residents can grow vegetables and herbs. This would promote sustainability and community engagement.',
        '[
            {"text": "Excellent idea - promote green spaces", "votes": 67},
            {"text": "Good but needs proper maintenance plan", "votes": 34},
            {"text": "Better to use space for parking", "votes": 15},
            {"text": "Need more information about costs", "votes": 9}
        ]'::jsonb,
        gov_user_id,
        true,
        NOW() + INTERVAL '22 days',
        NOW() - INTERVAL '5 days'
    ),
    
    (
        'Street Light Upgrade Program',
        'We plan to upgrade old street lights to LED technology in Phase 1 areas. This will improve safety and reduce energy consumption by 60%.',
        '[
            {"text": "Priority - safety is most important", "votes": 89},
            {"text": "Support but include motion sensors", "votes": 41},
            {"text": "Good initiative for energy savings", "votes": 28},
            {"text": "Focus on other infrastructure first", "votes": 7}
        ]'::jsonb,
        gov_user_id,
        true,
        NOW() + INTERVAL '10 days',
        NOW() - INTERVAL '7 days'
    ),
    
    (
        'Waste Management System',
        'Introduction of segregated waste collection with separate bins for wet waste, dry waste, and recyclables. Includes door-to-door collection service.',
        '[
            {"text": "Essential for cleanliness", "votes": 92},
            {"text": "Support with awareness campaigns", "votes": 38},
            {"text": "Implement gradually area by area", "votes": 25},
            {"text": "Current system works fine", "votes": 4}
        ]'::jsonb,
        gov_user_id,
        true,
        NOW() + INTERVAL '18 days',
        NOW() - INTERVAL '2 days'
    ),
    
    (
        'Weekend Farmers Market',
        'Proposal to organize a weekly farmers market in the central plaza every Saturday. Local farmers can sell fresh produce directly to residents.',
        '[
            {"text": "Great for supporting local farmers", "votes": 73},
            {"text": "Yes, but ensure traffic management", "votes": 29},
            {"text": "Prefer weekday market instead", "votes": 14},
            {"text": "Existing vendors might be affected", "votes": 11}
        ]'::jsonb,
        gov_user_id,
        true,
        NOW() + INTERVAL '25 days',
        NOW() - INTERVAL '1 day'
    ),
    
    -- Recently ended polls for variety
    (
        'Traffic Signal Optimization',
        'Installation of smart traffic signals that adjust timing based on real-time traffic flow. This pilot program would cover 10 major intersections.',
        '[
            {"text": "Absolutely needed for traffic flow", "votes": 156},
            {"text": "Good but include pedestrian sensors", "votes": 78},
            {"text": "Costly - focus on basic maintenance", "votes": 34},
            {"text": "Pilot test in 2-3 intersections first", "votes": 45}
        ]'::jsonb,
        gov_user_id,
        false,
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '32 days'
    ),
    
    (
        'Public Wi-Fi in Parks',
        'Free Wi-Fi installation in all major parks and public spaces to promote digital connectivity and support students and remote workers.',
        '[
            {"text": "Essential for digital inclusion", "votes": 134},
            {"text": "Support with usage time limits", "votes": 67},
            {"text": "Focus on basic amenities first", "votes": 43},
            {"text": "Security concerns need addressing", "votes": 29}
        ]'::jsonb,
        gov_user_id,
        false,
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '35 days'
    );
    
    RAISE NOTICE 'Sample polls data inserted successfully with government user ID: %', gov_user_id;
    
END $$;
