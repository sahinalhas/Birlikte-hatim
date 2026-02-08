-- Fix permissions for system triggers by making them SECURITY DEFINER
-- This allows triggers to modify tables (like inserting juz_assignments or updating group stats)
-- without being blocked by RLS policies of the user triggering them.

-- 1. Function to update member counts on groups
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.groups 
        SET total_members = (
            SELECT COUNT(*) FROM public.group_members 
            WHERE group_id = NEW.group_id AND status = 'active'
        )
        WHERE id = NEW.group_id;
    ELSIF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        UPDATE public.groups 
        SET total_members = (
            SELECT COUNT(*) FROM public.group_members 
            WHERE group_id = COALESCE(NEW.group_id, OLD.group_id) AND status = 'active'
        )
        WHERE id = COALESCE(NEW.group_id, OLD.group_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- 2. Function to auto-create juz assignments for Hatim groups
CREATE OR REPLACE FUNCTION create_juz_assignments()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'hatim' THEN
        INSERT INTO public.juz_assignments (group_id, juz_number, status)
        SELECT NEW.id, generate_series(1, 30), 'pending';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- 3. Function to update group progress when a juz is completed
CREATE OR REPLACE FUNCTION update_group_progress()
RETURNS TRIGGER AS $$
DECLARE
    completed_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT 
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*)
    INTO completed_count, total_count
    FROM public.juz_assignments
    WHERE group_id = NEW.group_id;
    
    UPDATE public.groups 
    SET 
        completed_percentage = ROUND((completed_count::DECIMAL / total_count) * 100, 2),
        status = CASE WHEN completed_count = total_count THEN 'completed' ELSE status END,
        completed_at = CASE WHEN completed_count = total_count THEN NOW() ELSE completed_at END
    WHERE id = NEW.group_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;
