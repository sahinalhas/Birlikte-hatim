-- Fix for infinite recursion in RLS policies

-- 1. Create a helper function to check membership without triggering RLS recursion
-- This function is SECURITY DEFINER, so it runs with the privileges of the creator (bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_member_of(_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_id = _group_id
    AND user_id = auth.uid()
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Group Members Policy
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;

CREATE POLICY "Members can view group members" ON public.group_members
    FOR SELECT USING (
        -- User can always see their own membership
        user_id = auth.uid() 
        OR 
        -- User can see other members if they are a member of the group (safe check)
        public.is_member_of(group_id)
    );

-- 3. Update Groups Policy
DROP POLICY IF EXISTS "Members can view their groups" ON public.groups;

CREATE POLICY "Members can view their groups" ON public.groups
    FOR SELECT USING (
        -- User can view group if they are a member (safe check)
        public.is_member_of(id)
        OR
        -- OR if they are the owner (though they should be a member too)
        creator_id = auth.uid()
        OR
        -- OR if it's public (already covered by another policy, but good for completeness in logic)
        privacy = 'public'
    );

-- 4. Update other policies to use the safe function
-- Activities
DROP POLICY IF EXISTS "Members can view activities" ON public.activities;
CREATE POLICY "Members can view activities" ON public.activities
    FOR SELECT USING (
        public.is_member_of(group_id)
    );

-- Juz Assignments
DROP POLICY IF EXISTS "Members can view juz assignments" ON public.juz_assignments;
CREATE POLICY "Members can view juz assignments" ON public.juz_assignments
    FOR SELECT USING (
        public.is_member_of(group_id)
    );
    
DROP POLICY IF EXISTS "Members can assign themselves juz" ON public.juz_assignments;
CREATE POLICY "Members can assign themselves juz" ON public.juz_assignments
    FOR UPDATE USING (
        public.is_member_of(group_id)
    );

-- Contributions
DROP POLICY IF EXISTS "Members can view contributions" ON public.contributions;
CREATE POLICY "Members can view contributions" ON public.contributions
    FOR SELECT USING (
        public.is_member_of(group_id)
    );

-- Messages
DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
CREATE POLICY "Members can view messages" ON public.messages
    FOR SELECT USING (
        public.is_member_of(group_id)
    );
