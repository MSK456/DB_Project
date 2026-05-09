/**
 * @file src/sql/schema_phase3.sql
 */

-- 1. Rider wallet (symmetric to Driver wallet)
CREATE TABLE IF NOT EXISTS Rider_Wallet (
    wallet_id INT AUTO_INCREMENT PRIMARY KEY,
    rider_id INT NOT NULL UNIQUE,
    balance DECIMAL(10,2) DEFAULT 0.00 CHECK (balance >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rider_id) REFERENCES User(user_id) ON DELETE CASCADE
);

-- 2. Wallet transactions ledger (audit trail for both rider and driver)
CREATE TABLE IF NOT EXISTS Wallet_Transaction (
    txn_id INT AUTO_INCREMENT PRIMARY KEY,
    wallet_owner_id INT NOT NULL,
    owner_type ENUM('Rider', 'Driver') NOT NULL,
    txn_type ENUM('TopUp', 'Debit', 'Credit', 'Refund', 'Payout') NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    balance_after DECIMAL(10,2) NOT NULL,
    reference_id INT DEFAULT NULL,
    reference_type ENUM('Ride', 'Payment', 'Manual') DEFAULT NULL,
    note VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Payout requests from drivers
CREATE TABLE IF NOT EXISTS Payout_Request (
    payout_id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status ENUM('Pending', 'Approved', 'Rejected', 'Processed') DEFAULT 'Pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    admin_note VARCHAR(255),
    FOREIGN KEY (driver_id) REFERENCES Driver(driver_id)
);
