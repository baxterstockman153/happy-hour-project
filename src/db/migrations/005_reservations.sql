CREATE TABLE reservations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id          UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  deal_id           UUID REFERENCES happy_hour_deals(id) ON DELETE SET NULL,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255) NOT NULL,
  phone             VARCHAR(50),
  party_size        INTEGER NOT NULL DEFAULT 1,
  reservation_date  DATE NOT NULL,
  reservation_time  TIME NOT NULL,
  special_requests  TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT party_size_range CHECK (party_size >= 1 AND party_size <= 20),
  CONSTRAINT valid_status CHECK (status IN ('confirmed', 'cancelled'))
);

CREATE INDEX idx_reservations_venue ON reservations(venue_id);
CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_date ON reservations(reservation_date);
