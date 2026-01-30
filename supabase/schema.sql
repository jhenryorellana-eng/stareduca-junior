-- =====================================================
-- STAREDUCA JUNIOR - SUPABASE SCHEMA
-- Ejecutar en: Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STUDENTS TABLE
-- Sincronizados desde CEO Junior via Hub Central
-- =====================================================
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(50) UNIQUE NOT NULL,  -- ID del estudiante en CEO Junior
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    date_of_birth DATE,
    code VARCHAR(20) NOT NULL,                -- E-XXXXXXXX
    family_id VARCHAR(50) NOT NULL,
    avatar_url TEXT,
    xp_total INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_external_id ON students(external_id);
CREATE INDEX idx_students_family_id ON students(family_id);
CREATE INDEX idx_students_code ON students(code);

-- =====================================================
-- COURSES AND CONTENT
-- =====================================================
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    category VARCHAR(50) NOT NULL,
    xp_reward INTEGER DEFAULT 200,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_published ON courses(is_published);

CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    order_index INTEGER NOT NULL
);

CREATE INDEX idx_modules_course ON modules(course_id);

CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    video_url TEXT,
    duration_minutes INTEGER,
    xp_reward INTEGER DEFAULT 25,
    order_index INTEGER NOT NULL
);

CREATE INDEX idx_lessons_module ON lessons(module_id);

-- =====================================================
-- STUDENT PROGRESS
-- =====================================================
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    progress_percent INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(student_id, course_id)
);

CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);

CREATE TABLE lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    watch_time_seconds INTEGER DEFAULT 0,
    UNIQUE(student_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_student ON lesson_progress(student_id);

-- =====================================================
-- GAMIFICATION
-- =====================================================
CREATE TABLE xp_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason VARCHAR(50) NOT NULL,
    reference_id UUID,  -- Optional: course_id, lesson_id, post_id, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_xp_transactions_student ON xp_transactions(student_id);
CREATE INDEX idx_xp_transactions_date ON xp_transactions(created_at);

CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    rarity VARCHAR(20) NOT NULL,
    criteria JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE student_badges (
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (student_id, badge_id)
);

CREATE INDEX idx_student_badges_student ON student_badges(student_id);

-- =====================================================
-- COMMUNITY
-- =====================================================
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    reaction_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    is_hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_student ON posts(student_id);
CREATE INDEX idx_posts_date ON posts(created_at DESC);

CREATE TABLE reactions (
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    type VARCHAR(20) DEFAULT 'like',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (student_id, post_id)
);

CREATE INDEX idx_reactions_post ON reactions(post_id);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    is_hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_student ON comments(student_id);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_student ON notifications(student_id);
CREATE INDEX idx_notifications_unread ON notifications(student_id, is_read) WHERE is_read = FALSE;

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Update post reaction count
CREATE OR REPLACE FUNCTION update_post_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET reaction_count = reaction_count - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reactions_count_trigger
    AFTER INSERT OR DELETE ON reactions
    FOR EACH ROW
    EXECUTE FUNCTION update_post_reaction_count();

-- Update post comment count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_count_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_post_comment_count();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies would be created based on the actual auth strategy
-- For service_role access from the API, these would allow full access
-- For anon access, you'd need to create specific policies

-- =====================================================
-- SEED DATA - BADGES
-- =====================================================
INSERT INTO badges (name, description, icon, category, rarity, criteria) VALUES
('Primeros Pasos', 'Completa tu primer capítulo', 'footprint', 'learning', 'common', '{"lessons_completed": 1}'),
('Estudiante Dedicado', 'Completa 10 capítulos', 'school', 'learning', 'uncommon', '{"lessons_completed": 10}'),
('Maestro del Conocimiento', 'Completa 50 capítulos', 'psychology', 'learning', 'rare', '{"lessons_completed": 50}'),
('Racha de Fuego', 'Mantén una racha de 7 días', 'local_fire_department', 'streak', 'rare', '{"streak_days": 7}'),
('Imparable', 'Mantén una racha de 30 días', 'bolt', 'streak', 'epic', '{"streak_days": 30}'),
('Social Star', 'Publica 5 posts en la comunidad', 'star', 'social', 'uncommon', '{"posts_created": 5}'),
('Influencer', 'Recibe 100 reacciones en tus posts', 'thumb_up', 'social', 'rare', '{"reactions_received": 100}'),
('Financiero Junior', 'Completa el curso de Finanzas', 'savings', 'achievement', 'epic', '{"course_completed": "finanzas"}'),
('Emprendedor Nato', 'Completa el curso Tu Primera Empresa', 'rocket_launch', 'achievement', 'epic', '{"course_completed": "emprendimiento"}'),
('CEO Junior', 'Alcanza el nivel 25', 'workspace_premium', 'achievement', 'legendary', '{"level_reached": 25}');

-- =====================================================
-- SEED DATA - SAMPLE COURSES (Optional)
-- =====================================================
INSERT INTO courses (title, slug, description, category, xp_reward, is_published) VALUES
('Finanzas Personales para Jóvenes', 'finanzas-personales-jovenes', 'Aprende a manejar tu dinero desde joven. Presupuestos, ahorro e inversión básica.', 'finanzas', 200, TRUE),
('Tu Primera Empresa', 'tu-primera-empresa', 'Del concepto al lanzamiento. Aprende a crear y validar tu primera idea de negocio.', 'emprendimiento', 250, TRUE),
('Liderazgo Teen', 'liderazgo-teen', 'Desarrolla las habilidades de un líder. Comunicación, toma de decisiones y trabajo en equipo.', 'liderazgo', 150, TRUE),
('Programación Básica', 'programacion-basica', 'Introducción al mundo del código. Aprende los fundamentos de la programación.', 'tecnologia', 300, TRUE),
('Creatividad sin Límites', 'creatividad-sin-limites', 'Desbloquea tu potencial creativo. Técnicas para innovar y pensar diferente.', 'creatividad', 175, TRUE),
('Habla con Confianza', 'habla-con-confianza', 'Mejora tu comunicación y oratoria. Desde presentaciones hasta conversaciones difíciles.', 'comunicacion', 200, TRUE);
