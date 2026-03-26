-- Venue owners: separate account type for businesses managing their own listings
CREATE TABLE venue_owners (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  contact_name  VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  is_suspended  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Join table linking owners to venues (many-to-many)
CREATE TABLE venue_ownership (
  venue_owner_id UUID NOT NULL REFERENCES venue_owners(id) ON DELETE CASCADE,
  venue_id       UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (venue_owner_id, venue_id)
);

CREATE INDEX idx_venue_ownership_venue ON venue_ownership(venue_id);
CREATE INDEX idx_venue_ownership_owner ON venue_ownership(venue_owner_id);
