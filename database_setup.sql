-- ─── LOGIN SESSIONS ─────────────────────────────
CREATE TABLE IF NOT EXISTS login_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  login_at      TIMESTAMPTZ DEFAULT NOW(),
  logout_at     TIMESTAMPTZ,
  duration_mins INTEGER,
  ip_address    VARCHAR(50),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TASK TIME LOGS ─────────────────────────────
CREATE TABLE IF NOT EXISTS task_time_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID REFERENCES tasks(id),
  user_id         UUID REFERENCES users(id),
  project_id      UUID REFERENCES projects(id),
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ,
  duration_mins   INTEGER DEFAULT 0,
  technologies    TEXT[],
  notes           TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TECHNOLOGY USAGE ───────────────────────────
CREATE TABLE IF NOT EXISTS technology_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  task_id       UUID REFERENCES tasks(id),
  project_id    UUID REFERENCES projects(id),
  technology    VARCHAR(100) NOT NULL,
  duration_mins INTEGER DEFAULT 0,
  logged_date   DATE DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DAILY WORK SUMMARY ─────────────────────────
CREATE TABLE IF NOT EXISTS daily_work_summary (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id),
  work_date           DATE DEFAULT CURRENT_DATE,
  total_login_mins    INTEGER DEFAULT 0,
  total_active_mins   INTEGER DEFAULT 0,
  tasks_worked_on     INTEGER DEFAULT 0,
  technologies_used   TEXT[],
  first_login         TIMESTAMPTZ,
  last_activity       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, work_date)
);
