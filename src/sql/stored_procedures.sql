-- ─────────────────────────────────────────────────────────────────────────────
-- RideFlow — Stored Procedure: CalculateFare
-- Note: DELIMITER is a client concept only. mysql2 sends the full CREATE
-- PROCEDURE statement as a single call — no DELIMITER needed in code.
-- Run this file manually in Workbench (uses DELIMITER there) OR let
-- setup.js create it programmatically without DELIMITER.
-- ─────────────────────────────────────────────────────────────────────────────

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS CalculateFare(
    IN  p_distance_km     DECIMAL(8,2),
    IN  p_duration_minutes INT,
    IN  p_vehicle_type    ENUM('Economy', 'Premium', 'Bike'),
    IN  p_is_surge        BOOLEAN,
    OUT p_fare            DECIMAL(10,2)
)
BEGIN
    DECLARE v_base_rate DECIMAL(10,2);
    DECLARE v_per_km    DECIMAL(10,2);
    DECLARE v_per_min   DECIMAL(10,2);
    DECLARE v_surge     DECIMAL(3,2);
    DECLARE v_calculated DECIMAL(10,2);

    -- Fetch rate card for the given vehicle type
    SELECT base_rate, per_km_rate, per_min_rate, surge_multiplier
    INTO   v_base_rate, v_per_km, v_per_min, v_surge
    FROM   Fare_Config
    WHERE  vehicle_type = p_vehicle_type;

    -- Base fare calculation
    SET v_calculated = v_base_rate
                     + (v_per_km  * p_distance_km)
                     + (v_per_min * p_duration_minutes);

    -- Apply surge multiplier if requested
    IF p_is_surge THEN
        SET v_calculated = v_calculated * v_surge;
    END IF;

    SET p_fare = ROUND(v_calculated, 2);
END //

DELIMITER ;
