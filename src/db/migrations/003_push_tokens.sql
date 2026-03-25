-- 003_push_tokens.sql
-- Push notification tokens for mobile devices

CREATE TABLE push_tokens (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL,
  platform    VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  endpoint_arn TEXT,
  is_active   BOOLEAN     DEFAULT true,
  created_at  TIMESTAMP   DEFAULT NOW(),
  updated_at  TIMESTAMP   DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;
