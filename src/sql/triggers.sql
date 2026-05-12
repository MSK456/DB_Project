-- ─────────────────────────────────────────────────────────────────────────────
-- RideFlow — Triggers
-- Run manually in Workbench OR via setup.js (which uses DROP/CREATE pattern).
-- ─────────────────────────────────────────────────────────────────────────────

-- TRIGGER 1: Auto-archive completed/cancelled rides & increment driver trips
DELIMITER //

CREATE TRIGGER after_ride_status_change
AFTER UPDATE ON ride
FOR EACH ROW
BEGIN
    -- Archive any ride that transitions to a terminal state
    IF NEW.status IN ('Completed', 'Cancelled') AND OLD.status != NEW.status THEN
        INSERT INTO ride_history (ride_id, final_status)
        VALUES (NEW.ride_id, NEW.status);
    END IF;

    -- Increment driver trip counter only on completion
    IF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
        UPDATE driver
        SET total_trips = total_trips + 1
        WHERE driver_id = NEW.driver_id;
    END IF;
END //

DELIMITER ;

-- ─────────────────────────────────────────────────────────────────────────────

-- TRIGGER 2: Recalculate driver avg_rating on every new rating insert.
-- Flags driver (sets back to Pending) if avg drops below 3.5 threshold.
DELIMITER //

CREATE TRIGGER after_rating_inserted
AFTER INSERT ON rating
FOR EACH ROW
BEGIN
    DECLARE v_avg      DECIMAL(3,2);
    DECLARE v_driver_id INT;
    DECLARE v_admin_id  INT;

    -- Only recalculate for driver-rated-by-rider ratings
    IF NEW.rated_by = 'Rider' THEN
        SET v_driver_id = NEW.rated_user_id;

        SELECT AVG(score) INTO v_avg
        FROM rating
        WHERE rated_user_id = v_driver_id AND rated_by = 'Rider';

        UPDATE driver
        SET avg_rating = ROUND(v_avg, 1)
        WHERE driver_id = v_driver_id;

        -- Quality gate: flag poor-performing drivers
        IF v_avg < 3.5 THEN
            UPDATE driver
            SET verification_status = 'Pending'
            WHERE driver_id = v_driver_id AND verification_status = 'Verified';

            -- Log the flag action against the first admin account found
            SELECT user_id INTO v_admin_id
            FROM user WHERE role = 'Admin' LIMIT 1;

            IF v_admin_id IS NOT NULL THEN
                INSERT INTO admin_log (admin_id, action, target_table, target_id)
                VALUES (
                    v_admin_id,
                    CONCAT('Driver auto-flagged: avg rating dropped to ', ROUND(v_avg, 1)),
                    'driver',
                    v_driver_id
                );
            END IF;
        END IF;
    END IF;
END //

DELIMITER ;
