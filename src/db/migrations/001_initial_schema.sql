-- 001_initial_schema.sql
-- Initial database schema for Happy Hour project

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Venues ──

CREATE TABLE venues (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(255) NOT NULL,
  address    VARCHAR(255) NOT NULL,
  city       VARCHAR(100) NOT NULL,
  state      VARCHAR(2)   NOT NULL,
  zip        VARCHAR(10)  NOT NULL,
  location   GEOGRAPHY(Point, 4326) NOT NULL,
  phone      VARCHAR(20),
  website    VARCHAR(512),
  image_url  VARCHAR(512),
  category   VARCHAR(20)  NOT NULL CHECK (category IN ('bar', 'restaurant', 'brewery', 'lounge', 'pub', 'winery', 'other')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Happy Hour Deals ──

CREATE TABLE happy_hour_deals (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id    UUID        NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  day_of_week INTEGER[]   NOT NULL,
  start_time  TIME        NOT NULL,
  end_time    TIME        NOT NULL,
  description TEXT        NOT NULL,
  deal_type   VARCHAR(10) NOT NULL CHECK (deal_type IN ('drinks', 'food', 'both')),
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Users ──

CREATE TABLE users (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(100),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Admin Users ──

CREATE TABLE admin_users (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('super_admin', 'editor')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── User Favorites ──

CREATE TABLE user_favorites (
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  venue_id   UUID        NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, venue_id)
);

-- ── Indexes ──

CREATE INDEX idx_venues_location        ON venues USING GIST (location);
CREATE INDEX idx_deals_venue_day        ON happy_hour_deals (venue_id, day_of_week);
CREATE INDEX idx_deals_is_active        ON happy_hour_deals (is_active);
CREATE INDEX idx_users_email            ON users (email);
CREATE INDEX idx_admin_users_email      ON admin_users (email);
