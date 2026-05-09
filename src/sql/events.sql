-- ─────────────────────────────────────────────────────────────────────────────
-- RideFlow — MySQL Event Scheduler
-- Enable the scheduler once (requires SUPER privilege):
--   SET GLOBAL event_scheduler = ON;
-- Then create the event:
-- ─────────────────────────────────────────────────────────────────────────────

SET GLOBAL event_scheduler = ON;

-- Nightly event: deactivate expired promo codes
CREATE EVENT IF NOT EXISTS expire_promo_codes
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURDATE()) + INTERVAL 1 DAY)
COMMENT 'Deactivates promo codes whose expiry_date has passed'
DO
    UPDATE Promo_Code
    SET    is_active = FALSE
    WHERE  expiry_date < CURDATE()
      AND  is_active   = TRUE;
