-- ═══════════════════════════════════════════════════════
-- OPERIX — Complete Database Schema
-- KaizenSpark Tech Pvt. Ltd.
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- ─── USERS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) CHECK (role IN (
                  'manager','employee','client'
                )) NOT NULL,
  avatar_url    VARCHAR(500),
  department    VARCHAR(100),
  phone         VARCHAR(20),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- ─── CLIENTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  company_name  VARCHAR(200) NOT NULL,
  contact_name  VARCHAR(100),
  contact_email VARCHAR(150),
  contact_phone VARCHAR(20),
  address       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);

-- ─── PROJECTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  manager_id    UUID REFERENCES users(id),
  client_id     UUID REFERENCES clients(id),
  status        VARCHAR(20) CHECK (status IN (
                  'planning','active','on_hold',
                  'completed','cancelled'
                )) DEFAULT 'planning',
  priority      VARCHAR(10) CHECK (priority IN (
                  'high','medium','low'
                )) DEFAULT 'medium',
  start_date    DATE,
  end_date      DATE,
  budget        DECIMAL(12,2),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_manager ON projects(manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ─── PROJECT MEMBERS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(50) DEFAULT 'member',
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_user ON project_members(user_id);

-- ─── TASKS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  title           VARCHAR(300) NOT NULL,
  description     TEXT,
  assigned_to     UUID REFERENCES users(id),
  created_by      UUID REFERENCES users(id),
  deadline        DATE NOT NULL,
  priority        VARCHAR(10) CHECK (priority IN (
                    'high','medium','low'
                  )) DEFAULT 'medium',
  status          VARCHAR(20) CHECK (status IN (
                    'not_started','in_progress',
                    'completed','delayed','cancelled'
                  )) DEFAULT 'not_started',
  progress        INTEGER DEFAULT 0 CHECK (
                    progress BETWEEN 0 AND 100
                  ),
  risk_score      INTEGER DEFAULT 0 CHECK (
                    risk_score BETWEEN 0 AND 100
                  ),
  estimated_hours INTEGER,
  actual_hours    INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_risk ON tasks(risk_score DESC);

-- ─── SUBTASKS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subtasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title        VARCHAR(300) NOT NULL,
  completed    BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);

-- ─── PROGRESS LOGS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID REFERENCES tasks(id) ON DELETE CASCADE,
  logged_by   UUID REFERENCES users(id),
  progress    INTEGER NOT NULL CHECK (progress BETWEEN 0 AND 100),
  note        TEXT,
  blocker     TEXT,
  hours_spent DECIMAL(4,1) DEFAULT 0,
  logged_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plogs_task ON progress_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_plogs_user ON progress_logs(logged_by);
CREATE INDEX IF NOT EXISTS idx_plogs_date ON progress_logs(logged_at DESC);

-- ─── ALERTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID REFERENCES tasks(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES projects(id),
  manager_id  UUID REFERENCES users(id),
  type        VARCHAR(30) CHECK (type IN (
                'delay_risk','overdue','burnout',
                'milestone','client_feedback'
              )) NOT NULL,
  severity    VARCHAR(10) CHECK (severity IN (
                'low','medium','high','critical'
              )) DEFAULT 'medium',
  title       VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  is_seen     BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_manager ON alerts(manager_id);
CREATE INDEX IF NOT EXISTS idx_alerts_task ON alerts(task_id);
CREATE INDEX IF NOT EXISTS idx_alerts_seen ON alerts(is_seen);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);

-- ─── BURNOUT SIGNALS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS burnout_signals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID REFERENCES users(id),
  week_start        DATE NOT NULL,
  tasks_assigned    INTEGER DEFAULT 0,
  tasks_completed   INTEGER DEFAULT 0,
  avg_progress_rate DECIMAL(5,2) DEFAULT 0,
  burnout_score     DECIMAL(5,2) DEFAULT 0,
  burnout_level     VARCHAR(10) DEFAULT 'low',
  is_flagged        BOOLEAN DEFAULT false,
  week_data         JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_burnout_employee ON burnout_signals(employee_id);
CREATE INDEX IF NOT EXISTS idx_burnout_week ON burnout_signals(week_start);
CREATE INDEX IF NOT EXISTS idx_burnout_flagged ON burnout_signals(is_flagged);

-- ─── WEEKLY REPORTS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start   DATE NOT NULL,
  week_end     DATE NOT NULL,
  content      TEXT NOT NULL,
  summary      JSONB,
  generated_by VARCHAR(20) DEFAULT 'ai',
  email_sent   BOOLEAN DEFAULT false,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_week ON weekly_reports(week_start DESC);

-- ─── AI CHAT HISTORY ────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_chats (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id),
  role       VARCHAR(10) CHECK (role IN ('user','assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aichats_user ON ai_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_aichats_created ON ai_chats(created_at DESC);

-- ─── CLIENT FEEDBACK ────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  message    TEXT NOT NULL,
  rating     INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_client ON client_feedback(client_id);
CREATE INDEX IF NOT EXISTS idx_feedback_project ON client_feedback(project_id);

-- ─── FILE UPLOADS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS file_uploads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID REFERENCES tasks(id),
  project_id  UUID REFERENCES projects(id),
  uploaded_by UUID REFERENCES users(id),
  file_name   VARCHAR(255) NOT NULL,
  file_url    VARCHAR(500) NOT NULL,
  file_size   INTEGER,
  file_type   VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_task ON file_uploads(task_id);
CREATE INDEX IF NOT EXISTS idx_files_project ON file_uploads(project_id);

-- ═══════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════

-- Manager account (password: Manager@123)
INSERT INTO users (name, email, password_hash, role, department)
VALUES (
  'Pavan Kumar',
  'pavan@kaisenspark.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhCanzi.X.T3KhW2kxNFAi',
  'manager',
  'Engineering'
) ON CONFLICT (email) DO NOTHING;

-- Employee accounts (password: Manager@123)
INSERT INTO users (name, email, password_hash, role, department) VALUES
  ('Ravi Kumar',   'ravi@kaisenspark.com',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhCanzi.X.T3KhW2kxNFAi', 'employee', 'Backend'),
  ('Priya Sharma', 'priya@kaisenspark.com',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhCanzi.X.T3KhW2kxNFAi', 'employee', 'Frontend'),
  ('Amit Patel',   'amit@kaisenspark.com',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhCanzi.X.T3KhW2kxNFAi', 'employee', 'Backend'),
  ('Sneha Reddy',  'sneha@kaisenspark.com',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhCanzi.X.T3KhW2kxNFAi', 'employee', 'QA'),
  ('Vikram Singh', 'vikram@kaisenspark.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhCanzi.X.T3KhW2kxNFAi', 'employee', 'DevOps')
ON CONFLICT (email) DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER FUNCTION
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════
-- DONE — All 14 tables, indexes, seed data, triggers
-- ═══════════════════════════════════════════════════════
