-- RideFlow Complete Database Schema
SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABLES
-- Table: admin_log
CREATE TABLE `admin_log` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `action` varchar(255) NOT NULL,
  `target_table` varchar(50) DEFAULT NULL,
  `target_id` int DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `admin_log_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: driver
CREATE TABLE `driver` (
  `driver_id` int NOT NULL,
  `license_number` varchar(50) NOT NULL,
  `cnic` varchar(20) NOT NULL,
  `profile_photo` varchar(255) DEFAULT NULL,
  `verification_status` enum('Pending','Verified','Rejected') DEFAULT 'Pending',
  `availability_status` enum('Online','Offline','On Trip') DEFAULT 'Offline',
  `total_trips` int DEFAULT '0',
  `avg_rating` decimal(2,1) DEFAULT '5.0',
  `current_city` varchar(100) DEFAULT 'Unknown',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `location_updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`driver_id`),
  UNIQUE KEY `license_number` (`license_number`),
  UNIQUE KEY `cnic` (`cnic`),
  KEY `idx_driver_city` (`current_city`),
  KEY `idx_driver_availability` (`availability_status`),
  KEY `idx_driver_location` (`latitude`,`longitude`),
  KEY `idx_driver_availability_location` (`availability_status`,`verification_status`,`latitude`,`longitude`),
  CONSTRAINT `driver_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `driver_chk_1` CHECK ((`total_trips` >= 0)),
  CONSTRAINT `driver_chk_2` CHECK ((`avg_rating` between 0 and 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: fare_config
CREATE TABLE `fare_config` (
  `config_id` int NOT NULL AUTO_INCREMENT,
  `vehicle_type` enum('Economy','Premium','Bike') NOT NULL,
  `base_rate` decimal(10,2) NOT NULL DEFAULT '50.00',
  `per_km_rate` decimal(10,2) NOT NULL DEFAULT '20.00',
  `per_min_rate` decimal(10,2) NOT NULL DEFAULT '3.00',
  `surge_multiplier` decimal(3,2) NOT NULL DEFAULT '1.50',
  `commission_rate` decimal(4,2) NOT NULL DEFAULT '0.20',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`config_id`),
  UNIQUE KEY `vehicle_type` (`vehicle_type`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: payment
CREATE TABLE `payment` (
  `payment_id` int NOT NULL AUTO_INCREMENT,
  `ride_id` int NOT NULL,
  `rider_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('Cash','Wallet','Card') NOT NULL,
  `payment_status` enum('Pending','Paid','Failed','Refunded') DEFAULT 'Pending',
  `transaction_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `promo_code` varchar(20) DEFAULT NULL,
  `discount_amount` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `ride_id` (`ride_id`),
  KEY `rider_id` (`rider_id`),
  KEY `promo_code` (`promo_code`),
  CONSTRAINT `payment_ibfk_1` FOREIGN KEY (`ride_id`) REFERENCES `ride` (`ride_id`),
  CONSTRAINT `payment_ibfk_2` FOREIGN KEY (`rider_id`) REFERENCES `user` (`user_id`),
  CONSTRAINT `payment_ibfk_3` FOREIGN KEY (`promo_code`) REFERENCES `promo_code` (`code`),
  CONSTRAINT `payment_chk_1` CHECK ((`amount` >= 0)),
  CONSTRAINT `payment_chk_2` CHECK ((`discount_amount` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: payout_request
CREATE TABLE `payout_request` (
  `payout_id` int NOT NULL AUTO_INCREMENT,
  `driver_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('Pending','Approved','Rejected','Processed') DEFAULT 'Pending',
  `requested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` timestamp NULL DEFAULT NULL,
  `admin_note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`payout_id`),
  KEY `driver_id` (`driver_id`),
  CONSTRAINT `payout_request_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `driver` (`driver_id`),
  CONSTRAINT `payout_request_chk_1` CHECK ((`amount` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: promo_code
CREATE TABLE `promo_code` (
  `code` varchar(20) NOT NULL,
  `discount_type` enum('Percent','Flat') NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `min_ride_amount` decimal(10,2) DEFAULT '0.00',
  `expiry_date` date NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `usage_count` int DEFAULT '0',
  `max_usage` int DEFAULT NULL,
  PRIMARY KEY (`code`),
  CONSTRAINT `promo_code_chk_1` CHECK ((`discount_value` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: rating
CREATE TABLE `rating` (
  `rating_id` int NOT NULL AUTO_INCREMENT,
  `ride_id` int NOT NULL,
  `rated_by` enum('Rider','Driver') NOT NULL,
  `rated_user_id` int NOT NULL,
  `score` int NOT NULL,
  `comment` text,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`rating_id`),
  KEY `ride_id` (`ride_id`),
  KEY `idx_rating_driver` (`rated_user_id`),
  CONSTRAINT `rating_ibfk_1` FOREIGN KEY (`ride_id`) REFERENCES `ride` (`ride_id`),
  CONSTRAINT `rating_ibfk_2` FOREIGN KEY (`rated_user_id`) REFERENCES `user` (`user_id`),
  CONSTRAINT `rating_chk_1` CHECK ((`score` between 1 and 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: ride
CREATE TABLE `ride` (
  `ride_id` int NOT NULL AUTO_INCREMENT,
  `rider_id` int NOT NULL,
  `driver_id` int DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `pickup_location` varchar(255) NOT NULL,
  `pickup_city` varchar(100) NOT NULL DEFAULT 'Unknown',
  `dropoff_location` varchar(255) NOT NULL,
  `dropoff_city` varchar(100) NOT NULL DEFAULT 'Unknown',
  `status` enum('Requested','Accepted','Driver En Route','Arrived at Pickup','In Progress','Completed','Cancelled') DEFAULT 'Requested',
  `request_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `start_time` timestamp NULL DEFAULT NULL,
  `end_time` timestamp NULL DEFAULT NULL,
  `fare` decimal(10,2) DEFAULT NULL,
  `distance_km` decimal(8,2) DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `pickup_lat` decimal(10,8) DEFAULT NULL,
  `pickup_lng` decimal(11,8) DEFAULT NULL,
  `dropoff_lat` decimal(10,8) DEFAULT NULL,
  `dropoff_lng` decimal(11,8) DEFAULT NULL,
  `actual_distance_km` decimal(8,2) DEFAULT NULL,
  `actual_duration_minutes` int DEFAULT NULL,
  `route_polyline` text,
  `wallet_hold_amount` decimal(10,2) DEFAULT NULL,
  `fare_estimated` decimal(10,2) DEFAULT NULL,
  `fare_locked_at` timestamp NULL DEFAULT NULL,
  `payment_status` enum('Pending','Held','Paid','Released') DEFAULT 'Pending',
  PRIMARY KEY (`ride_id`),
  KEY `vehicle_id` (`vehicle_id`),
  KEY `idx_ride_rider_id` (`rider_id`),
  KEY `idx_ride_driver_id` (`driver_id`),
  KEY `idx_ride_status` (`status`),
  KEY `idx_ride_city` (`pickup_city`),
  CONSTRAINT `ride_ibfk_1` FOREIGN KEY (`rider_id`) REFERENCES `user` (`user_id`),
  CONSTRAINT `ride_ibfk_2` FOREIGN KEY (`driver_id`) REFERENCES `driver` (`driver_id`),
  CONSTRAINT `ride_ibfk_3` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle` (`vehicle_id`),
  CONSTRAINT `ride_chk_1` CHECK ((`fare` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: ride_history
CREATE TABLE `ride_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `ride_id` int NOT NULL,
  `final_status` enum('Completed','Cancelled') DEFAULT 'Completed',
  `archived_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `rider_id` int DEFAULT NULL,
  `driver_id` int DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `pickup_location` varchar(255) DEFAULT NULL,
  `dropoff_location` varchar(255) DEFAULT NULL,
  `distance_km` decimal(10,2) DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `fare_amount` decimal(10,2) DEFAULT NULL,
  `completion_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`history_id`),
  UNIQUE KEY `ride_id` (`ride_id`),
  CONSTRAINT `ride_history_ibfk_1` FOREIGN KEY (`ride_id`) REFERENCES `ride` (`ride_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: rider_wallet
CREATE TABLE `rider_wallet` (
  `rider_wallet_id` int NOT NULL AUTO_INCREMENT,
  `rider_id` int NOT NULL,
  `balance` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`rider_wallet_id`),
  UNIQUE KEY `rider_id` (`rider_id`),
  CONSTRAINT `rider_wallet_ibfk_1` FOREIGN KEY (`rider_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `rider_wallet_chk_1` CHECK ((`balance` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: user
CREATE TABLE `user` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(15) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('Admin','Rider','Driver') NOT NULL,
  `account_status` enum('Active','Suspended','Banned') DEFAULT 'Active',
  `registration_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `profile_photo` varchar(255) DEFAULT NULL,
  `refresh_token` text,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: vehicle
CREATE TABLE `vehicle` (
  `vehicle_id` int NOT NULL AUTO_INCREMENT,
  `driver_id` int NOT NULL,
  `make` varchar(50) NOT NULL,
  `model` varchar(50) NOT NULL,
  `year` int NOT NULL,
  `color` varchar(30) DEFAULT NULL,
  `license_plate` varchar(20) NOT NULL,
  `vehicle_type` enum('Economy','Premium','Bike') NOT NULL,
  `verification_status` enum('Pending','Verified','Rejected') DEFAULT 'Pending',
  PRIMARY KEY (`vehicle_id`),
  UNIQUE KEY `license_plate` (`license_plate`),
  KEY `idx_vehicle_driver` (`driver_id`),
  KEY `idx_vehicle_type_status` (`vehicle_type`,`verification_status`),
  CONSTRAINT `vehicle_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `driver` (`driver_id`) ON DELETE CASCADE,
  CONSTRAINT `vehicle_chk_1` CHECK ((`year` >= 2000))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: wallet
CREATE TABLE `wallet` (
  `wallet_id` int NOT NULL AUTO_INCREMENT,
  `driver_id` int NOT NULL,
  `balance` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`wallet_id`),
  UNIQUE KEY `driver_id` (`driver_id`),
  CONSTRAINT `wallet_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `driver` (`driver_id`) ON DELETE CASCADE,
  CONSTRAINT `wallet_chk_1` CHECK ((`balance` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: wallet_transaction
CREATE TABLE `wallet_transaction` (
  `transaction_id` int NOT NULL AUTO_INCREMENT,
  `wallet_owner_id` int NOT NULL,
  `owner_type` enum('Rider','Driver') NOT NULL,
  `txn_type` enum('TopUp','TripPayment','TripEarning','Payout','Refund') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `balance_after` decimal(10,2) NOT NULL,
  `reference_id` int DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `note` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`transaction_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- 2. VIEWS
-- View: activeridesview
CREATE VIEW `activeridesview` AS select `r`.`ride_id` AS `ride_id`,`r`.`status` AS `status`,`r`.`pickup_location` AS `pickup_location`,`r`.`pickup_city` AS `pickup_city`,`r`.`dropoff_location` AS `dropoff_location`,`r`.`dropoff_city` AS `dropoff_city`,`r`.`request_time` AS `request_time`,`r`.`start_time` AS `start_time`,`ru`.`full_name` AS `rider_name`,`ru`.`phone` AS `rider_phone`,`du`.`full_name` AS `driver_name`,`du`.`phone` AS `driver_phone`,`d`.`avg_rating` AS `driver_rating`,`v`.`make` AS `make`,`v`.`model` AS `model`,`v`.`color` AS `color`,`v`.`license_plate` AS `license_plate`,`v`.`vehicle_type` AS `vehicle_type` from ((((`ride` `r` join `user` `ru` on((`r`.`rider_id` = `ru`.`user_id`))) join `driver` `d` on((`r`.`driver_id` = `d`.`driver_id`))) join `user` `du` on((`d`.`driver_id` = `du`.`user_id`))) join `vehicle` `v` on((`r`.`vehicle_id` = `v`.`vehicle_id`))) where (`r`.`status` in ('Accepted','Driver En Route','In Progress'));

-- View: topdriversview
CREATE VIEW `topdriversview` AS select `d`.`driver_id` AS `driver_id`,`u`.`full_name` AS `full_name`,`u`.`email` AS `email`,`u`.`phone` AS `phone`,`d`.`avg_rating` AS `avg_rating`,`d`.`total_trips` AS `total_trips`,`d`.`current_city` AS `current_city`,`d`.`availability_status` AS `availability_status`,`d`.`verification_status` AS `verification_status` from (`driver` `d` join `user` `u` on((`d`.`driver_id` = `u`.`user_id`))) where ((`d`.`avg_rating` >= 4.5) and (`d`.`verification_status` = 'Verified') and (`u`.`account_status` = 'Active')) order by `d`.`avg_rating` desc,`d`.`total_trips` desc;


-- 3. TRIGGERS
-- Trigger: after_payment_paid_promo
DELIMITER //
CREATE TRIGGER `after_payment_paid_promo` AFTER UPDATE ON `payment` FOR EACH ROW BEGIN
      IF NEW.payment_status = 'Paid' 
         AND OLD.payment_status != 'Paid' 
         AND NEW.promo_code IS NOT NULL THEN
          UPDATE Promo_Code 
          SET usage_count = usage_count + 1
          WHERE code = NEW.promo_code;
      END IF;
    END //
DELIMITER ;

-- Trigger: after_rating_inserted
DELIMITER //
CREATE TRIGGER `after_rating_inserted` AFTER INSERT ON `rating` FOR EACH ROW BEGIN
      DECLARE v_avg       DECIMAL(3,2);
      DECLARE v_driver_id INT;
      DECLARE v_admin_id  INT;

      IF NEW.rated_by = 'Rider' THEN
        SET v_driver_id = NEW.rated_user_id;

        SELECT AVG(score) INTO v_avg
        FROM Rating
        WHERE rated_user_id = v_driver_id AND rated_by = 'Rider';

        UPDATE Driver SET avg_rating = ROUND(v_avg, 1)
        WHERE driver_id = v_driver_id;

        IF v_avg < 3.5 THEN
          UPDATE Driver SET verification_status = 'Pending'
          WHERE driver_id = v_driver_id AND verification_status = 'Verified';

          SELECT user_id INTO v_admin_id
          FROM User WHERE role = 'Admin' LIMIT 1;

          IF v_admin_id IS NOT NULL THEN
            INSERT INTO Admin_Log (admin_id, action, target_table, target_id)
            VALUES (
              v_admin_id,
              CONCAT('Driver auto-flagged: avg rating dropped to ', ROUND(v_avg, 1)),
              'Driver',
              v_driver_id
            );
          END IF;
        END IF;
      END IF;
    END //
DELIMITER ;

-- Trigger: after_ride_completed
DELIMITER //
CREATE TRIGGER `after_ride_completed` AFTER UPDATE ON `ride` FOR EACH ROW BEGIN
        -- Handle history logging
        IF (NEW.status = 'Completed' OR NEW.status = 'Cancelled') AND OLD.status != NEW.status THEN
          INSERT IGNORE INTO ride_history (
            ride_id, rider_id, driver_id, vehicle_id,
            pickup_location, dropoff_location,
            distance_km, duration_minutes, fare_amount,
            final_status, completion_time
          )
          VALUES (
            NEW.ride_id, NEW.rider_id, NEW.driver_id, NEW.vehicle_id,
            NEW.pickup_location, NEW.dropoff_location,
            NEW.distance_km, NEW.duration_minutes, NEW.fare,
            NEW.status, NOW()
          );
        END IF;

        -- Handle driver trip count
        IF NEW.status = 'Completed' AND OLD.status != 'Completed' AND NEW.driver_id IS NOT NULL THEN
          UPDATE driver
          SET total_trips = total_trips + 1
          WHERE driver_id = NEW.driver_id;
        END IF;
      END //
DELIMITER ;


-- 4. EVENTS
-- Event: expire_promo_codes
CREATE EVENT `expire_promo_codes` ON SCHEDULE EVERY 1 DAY STARTS '2026-05-10 00:00:00' ON COMPLETION NOT PRESERVE ENABLE COMMENT 'Deactivates promo codes whose expiry_date has passed' DO UPDATE Promo_Code
        SET    is_active = FALSE
        WHERE  expiry_date < CURDATE() AND is_active = TRUE;

SET FOREIGN_KEY_CHECKS = 1;
