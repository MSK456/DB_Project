-- ============================================
-- RideFlow — Database Role-Based Access Control
-- DCL Implementation for Database Systems Lab
-- ============================================

-- Step 1: Create application-level MySQL roles
CREATE ROLE IF NOT EXISTS 'rideflow_rider_role';
CREATE ROLE IF NOT EXISTS 'rideflow_driver_role';
CREATE ROLE IF NOT EXISTS 'rideflow_support_role';
CREATE ROLE IF NOT EXISTS 'rideflow_admin_role';

-- Step 2: RIDER ROLE permissions
-- Riders can read their own rides and insert new ones
-- Can view and insert payments
GRANT SELECT, INSERT ON Ride TO 'rideflow_rider_role';
GRANT SELECT, INSERT ON payment TO 'rideflow_rider_role';
GRANT SELECT ON driver TO 'rideflow_rider_role';
GRANT SELECT ON vehicle TO 'rideflow_rider_role';
GRANT SELECT ON promo_code TO 'rideflow_rider_role';
GRANT SELECT, UPDATE ON rider_wallet TO 'rideflow_rider_role';
GRANT SELECT, INSERT ON rating TO 'rideflow_rider_role';

-- Step 3: DRIVER ROLE permissions
-- Drivers can view rides assigned to them, update status
-- Can view their wallet, cannot touch payment records directly
GRANT SELECT, UPDATE ON ride TO 'rideflow_driver_role';
GRANT SELECT ON user TO 'rideflow_driver_role';
GRANT SELECT, UPDATE ON driver TO 'rideflow_driver_role';
GRANT SELECT, INSERT, UPDATE ON vehicle TO 'rideflow_driver_role';
GRANT SELECT, UPDATE ON wallet TO 'rideflow_driver_role';
GRANT SELECT ON wallet_transaction TO 'rideflow_driver_role';
GRANT SELECT, INSERT ON rating TO 'rideflow_driver_role';
GRANT SELECT, INSERT ON payout_request TO 'rideflow_driver_role';

-- Step 4: SUPPORT ROLE permissions
-- Support staff can VIEW everything but cannot DELETE or modify financial data
GRANT SELECT ON * TO 'rideflow_support_role';
REVOKE DELETE ON ride FROM 'rideflow_support_role';
REVOKE DELETE ON payment FROM 'rideflow_support_role';
REVOKE DELETE ON user FROM 'rideflow_support_role';

-- Step 5: ADMIN ROLE — full privileges
GRANT ALL PRIVILEGES ON * TO 'rideflow_admin_role';

-- Step 6: Create named MySQL users assigned to each role
-- These are reporting/audit users, not the main app connection user

CREATE USER IF NOT EXISTS 'rf_rider_user'@'%' 
  IDENTIFIED BY 'RiderUser@2026!';
GRANT 'rideflow_rider_role' TO 'rf_rider_user'@'%';

CREATE USER IF NOT EXISTS 'rf_driver_user'@'%'
  IDENTIFIED BY 'DriverUser@2026!';
GRANT 'rideflow_driver_role' TO 'rf_driver_user'@'%';

CREATE USER IF NOT EXISTS 'rf_support_user'@'%'
  IDENTIFIED BY 'SupportUser@2026!';
GRANT 'rideflow_support_role' TO 'rf_support_user'@'%';

CREATE USER IF NOT EXISTS 'rf_admin_user'@'%'
  IDENTIFIED BY 'AdminUser@2026!';
GRANT 'rideflow_admin_role' TO 'rf_admin_user'@'%';

FLUSH PRIVILEGES;
