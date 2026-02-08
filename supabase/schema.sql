-- ============================================
-- Birlikte İbadet - Veritabanı Şeması
-- ============================================

-- UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    profile_photo TEXT,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    birth_year INTEGER,
    country VARCHAR(2),
    city VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'Europe/Istanbul',
    language VARCHAR(2) DEFAULT 'tr',
    
    -- Settings JSON
    settings JSONB DEFAULT '{
        "notification_enabled": true,
        "notification_times": ["09:00", "20:00"],
        "prayer_time_reminders": true,
        "theme": "auto"
    }',
    
    -- Stats
    total_hatims INTEGER DEFAULT 0,
    total_salawat BIGINT DEFAULT 0,
    total_groups_joined INTEGER DEFAULT 0,
    total_groups_created INTEGER DEFAULT 0,
    badges TEXT[] DEFAULT '{}',
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    
    fcm_token TEXT,
    last_active TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON public.users(last_active);

-- ============================================
-- 2. GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    title VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('hatim', 'salavat', 'yasin', 'custom')),
    
    -- Configuration
    distribution_mode VARCHAR(20) DEFAULT 'manual' CHECK (distribution_mode IN ('auto', 'manual', 'hybrid')),
    total_juz INTEGER DEFAULT 30,
    target_count BIGINT, -- For salawat/yasin
    current_count BIGINT DEFAULT 0,
    
    -- Intention
    intention TEXT,
    intention_person VARCHAR(100),
    
    -- Timeline
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Access
    privacy VARCHAR(20) DEFAULT 'private' CHECK (privacy IN ('private', 'public', 'unlisted')),
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    qr_code_url TEXT,
    
    -- Settings JSON
    settings JSONB DEFAULT '{
        "allow_multiple_juz_per_person": true,
        "allow_late_join": true,
        "auto_redistribute": true,
        "reminder_enabled": true,
        "reminder_frequency": "daily"
    }',
    
    -- Stats
    total_members INTEGER DEFAULT 0,
    completed_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for groups
CREATE INDEX IF NOT EXISTS idx_groups_creator ON public.groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON public.groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_groups_status_end_date ON public.groups(status, end_date);
CREATE INDEX IF NOT EXISTS idx_groups_type_privacy ON public.groups(type, privacy);

-- ============================================
-- 3. GROUP MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'left')),
    
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(group_id, user_id)
);

-- Indexes for group_members
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id, status);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id, status);

-- ============================================
-- 4. JUZ ASSIGNMENTS TABLE (for hatim groups)
-- ============================================
CREATE TABLE IF NOT EXISTS public.juz_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    juz_number INTEGER NOT NULL CHECK (juz_number BETWEEN 1 AND 30),
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'abandoned')),
    
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    notes TEXT
);

-- Indexes for juz_assignments
CREATE INDEX IF NOT EXISTS idx_juz_group ON public.juz_assignments(group_id, juz_number);
CREATE INDEX IF NOT EXISTS idx_juz_user ON public.juz_assignments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_juz_status ON public.juz_assignments(status);

-- ============================================
-- 5. ACTIVITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    type VARCHAR(30) NOT NULL CHECK (type IN ('juz_complete', 'salawat_add', 'yasin_complete', 'member_joined', 'group_completed')),
    
    -- Polymorphic data
    data JSONB, -- { "juz_number": 5 } or { "count": 1000 }
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for activities
CREATE INDEX IF NOT EXISTS idx_activities_group ON public.activities(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user ON public.activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(type);

-- ============================================
-- 6. CONTRIBUTIONS TABLE (Salawat/Yasin)
-- ============================================
CREATE TABLE IF NOT EXISTS public.contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    count BIGINT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(group_id, user_id)
);

-- Index for contributions
CREATE INDEX IF NOT EXISTS idx_contributions_group ON public.contributions(group_id);

-- ============================================
-- 7. MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'voice_note')),
    content TEXT,
    audio_url TEXT,
    duration_seconds INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Index for messages
CREATE INDEX IF NOT EXISTS idx_messages_group ON public.messages(group_id, created_at DESC);

-- ============================================
-- 8. REACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    emoji VARCHAR(10) NOT NULL, -- '❤️', '🤲', '✨'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(activity_id, user_id)
);

-- Index for reactions
CREATE INDEX IF NOT EXISTS idx_reactions_activity ON public.reactions(activity_id);

-- ============================================
-- 9. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    type VARCHAR(30) NOT NULL,
    title VARCHAR(100) NOT NULL,
    body TEXT NOT NULL,
    
    data JSONB, -- { "group_id": "...", "juz_number": 3 }
    
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

-- ============================================
-- 10. USER BADGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    badge_id VARCHAR(50) NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, badge_id)
);

-- Index for user_badges
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);

-- ============================================
-- 11. COUNTERS TABLE (Personal tesbih counter)
-- ============================================
CREATE TABLE IF NOT EXISTS public.counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    
    value BIGINT NOT NULL DEFAULT 0,
    target INTEGER NOT NULL DEFAULT 33,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for counters
CREATE INDEX IF NOT EXISTS idx_counters_user ON public.counters(user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON public.groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate invite code for new groups
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
        NEW.invite_code = LOWER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_group_invite_code
    BEFORE INSERT ON public.groups
    FOR EACH ROW
    EXECUTE FUNCTION generate_invite_code();

-- Auto-create juz assignments when hatim group is created
CREATE OR REPLACE FUNCTION create_juz_assignments()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'hatim' THEN
        INSERT INTO public.juz_assignments (group_id, juz_number, status)
        SELECT NEW.id, generate_series(1, 30), 'pending';
    END IF;
    RETURN NEW;
END;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER create_hatim_juz_assignments
    AFTER INSERT ON public.groups
    FOR EACH ROW
    EXECUTE FUNCTION create_juz_assignments();

-- Update group member count
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
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER update_members_count
    AFTER INSERT OR UPDATE OR DELETE ON public.group_members
    FOR EACH ROW
    EXECUTE FUNCTION update_group_member_count();

-- Update group progress when juz is completed
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
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER update_hatim_progress
    AFTER UPDATE OF status ON public.juz_assignments
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION update_group_progress();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.juz_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;

-- Helper function to check membership without triggering RLS recursion
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

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Groups policies
CREATE POLICY "Anyone can view public groups" ON public.groups
    FOR SELECT USING (privacy = 'public' OR creator_id = auth.uid());

CREATE POLICY "Members can view their groups" ON public.groups
    FOR SELECT USING (
        public.is_member_of(id)
    );

CREATE POLICY "Users can create groups" ON public.groups
    FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update their groups" ON public.groups
    FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "Creators can delete their groups" ON public.groups
    FOR DELETE USING (creator_id = auth.uid());

-- Group members policies
CREATE POLICY "Members can view group members" ON public.group_members
    FOR SELECT USING (
        user_id = auth.uid() 
        OR 
        public.is_member_of(group_id)
    );

CREATE POLICY "Users can join groups" ON public.group_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave groups" ON public.group_members
    FOR UPDATE USING (user_id = auth.uid());

-- Juz assignments policies  
CREATE POLICY "Members can view juz assignments" ON public.juz_assignments
    FOR SELECT USING (
        public.is_member_of(group_id)
    );

CREATE POLICY "Members can assign themselves juz" ON public.juz_assignments
    FOR UPDATE USING (
        public.is_member_of(group_id)
    );

-- Activities policies
CREATE POLICY "Members can view activities" ON public.activities
    FOR SELECT USING (
        public.is_member_of(group_id)
    );

CREATE POLICY "Users can create activities" ON public.activities
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Contributions policies
CREATE POLICY "Members can view contributions" ON public.contributions
    FOR SELECT USING (
        public.is_member_of(group_id)
    );

CREATE POLICY "Users can manage their contributions" ON public.contributions
    FOR ALL USING (user_id = auth.uid());

-- Messages policies
CREATE POLICY "Members can view messages" ON public.messages
    FOR SELECT USING (
        public.is_member_of(group_id)
    );

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their messages" ON public.messages
    FOR UPDATE USING (user_id = auth.uid());

-- Reactions policies
CREATE POLICY "Anyone can view reactions" ON public.reactions
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their reactions" ON public.reactions
    FOR ALL USING (user_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- User badges policies
CREATE POLICY "Anyone can view badges" ON public.user_badges
    FOR SELECT USING (true);

CREATE POLICY "System can create badges" ON public.user_badges
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Counters policies
CREATE POLICY "Users can view their counter" ON public.counters
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their counter" ON public.counters
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.juz_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contributions;
