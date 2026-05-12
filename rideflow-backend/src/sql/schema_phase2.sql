-- ─────────────────────────────────────────────────────────────────────────────
-- RideFlow Phase 2 — Schema Modifications
-- Run this manually in MySQL Workbench ONCE before starting the server.
-- ─────────────────────────────────────────────────────────────────────────────

USE RideFlowDB;

-- Ride: add city columns for location-based matching, and trip metrics
ALTER TABLE Ride ADD COLUMN pickup_city VARCHAR(100) NOT NULL DEFAULT 'Unknown' AFTER pickup_location;
ALTER TABLE Ride ADD COLUMN dropoff_city VARCHAR(100) NOT NULL DEFAULT 'Unknown' AFTER dropoff_location;
ALTER TABLE Ride ADD COLUMN distance_km DECIMAL(8,2) DEFAULT NULL;
ALTER TABLE Ride ADD COLUMN duration_minutes INT DEFAULT NULL;

-- Driver: current city for matching
ALTER TABLE Driver ADD COLUMN current_city VARCHAR(100) DEFAULT 'Unknown';

-- Promo_Code: usage tracking
ALTER TABLE Promo_Code ADD COLUMN usage_count INT DEFAULT 0;
ALTER TABLE Promo_Code ADD COLUMN max_usage INT DEFAULT NULL;

-- Fare configuration table
CREATE TABLE IF NOT EXISTS Fare_Config (
    config_id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_type ENUM('Economy', 'Premium', 'Bike') NOT NULL UNIQUE,
    base_rate DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    per_km_rate DECIMAL(10,2) NOT NULL DEFAULT 20.00,
    per_min_rate DECIMAL(10,2) NOT NULL DEFAULT 3.00,
    surge_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.50,
    commission_rate DECIMAL(4,2) NOT NULL DEFAULT 0.20,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed default fare config
INSERT IGNORE INTO Fare_Config (vehicle_type, base_rate, per_km_rate, per_min_rate, surge_multiplier, commission_rate)
VALUES
    ('Bike',    30.00, 12.00, 2.00, 1.50, 0.15),
    ('Economy', 50.00, 20.00, 3.00, 1.50, 0.20),
    ('Premium', 100.00, 35.00, 5.00, 2.00, 0.25);
