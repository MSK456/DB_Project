-- ─────────────────────────────────────────────────────────────────────────────
-- RideFlow — Database Views
-- Executed automatically on server startup via src/db/setup.js
-- ─────────────────────────────────────────────────────────────────────────────

-- VIEW 1: All currently active rides with full participant details
CREATE OR REPLACE VIEW ActiveRidesView AS
SELECT
    r.ride_id,
    r.status,
    r.pickup_location,
    r.pickup_city,
    r.dropoff_location,
    r.dropoff_city,
    r.request_time,
    r.start_time,
    ru.full_name  AS rider_name,
    ru.phone      AS rider_phone,
    du.full_name  AS driver_name,
    du.phone      AS driver_phone,
    d.avg_rating  AS driver_rating,
    v.make, v.model, v.color, v.license_plate, v.vehicle_type
FROM Ride r
JOIN User ru    ON r.rider_id  = ru.user_id
JOIN Driver d   ON r.driver_id = d.driver_id
JOIN User du    ON d.driver_id = du.user_id
JOIN Vehicle v  ON r.vehicle_id = v.vehicle_id
WHERE r.status IN ('Accepted', 'Driver En Route', 'In Progress');

-- VIEW 2: Top-performing, verified, active drivers
CREATE OR REPLACE VIEW TopDriversView AS
SELECT
    d.driver_id,
    u.full_name,
    u.email,
    u.phone,
    d.avg_rating,
    d.total_trips,
    d.current_city,
    d.availability_status,
    d.verification_status
FROM Driver d
JOIN User u ON d.driver_id = u.user_id
WHERE d.avg_rating >= 4.5
  AND d.verification_status = 'Verified'
  AND u.account_status = 'Active'
ORDER BY d.avg_rating DESC, d.total_trips DESC;
