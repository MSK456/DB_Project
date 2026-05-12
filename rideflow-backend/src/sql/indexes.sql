-- ─────────────────────────────────────────────────────────────────────────────
-- RideFlow — Performance Indexes
-- Executed automatically on server startup via src/db/setup.js
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ride_rider_id         ON Ride(rider_id);
CREATE INDEX IF NOT EXISTS idx_ride_driver_id        ON Ride(driver_id);
CREATE INDEX IF NOT EXISTS idx_ride_status           ON Ride(status);
CREATE INDEX IF NOT EXISTS idx_ride_city             ON Ride(pickup_city);
CREATE INDEX IF NOT EXISTS idx_driver_city           ON Driver(current_city);
CREATE INDEX IF NOT EXISTS idx_driver_availability   ON Driver(availability_status);
CREATE INDEX IF NOT EXISTS idx_vehicle_driver        ON Vehicle(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_type_status   ON Vehicle(vehicle_type, verification_status);
CREATE INDEX IF NOT EXISTS idx_rating_driver         ON Rating(rated_user_id);
