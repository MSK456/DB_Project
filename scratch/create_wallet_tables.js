import { pool } from "../src/db/index.js";

async function migrate() {
  try {
    console.log("Creating missing wallet tables...");

    // 1. Rider_Wallet
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Rider_Wallet (
        rider_wallet_id INT AUTO_INCREMENT PRIMARY KEY,
        rider_id INT NOT NULL UNIQUE,
        balance DECIMAL(10,2) DEFAULT 0 CHECK (balance >= 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rider_id) REFERENCES User(user_id) ON DELETE CASCADE
      )
    `);
    console.log("✅ Rider_Wallet table ready");

    // 2. Wallet_Transaction
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Wallet_Transaction (
        transaction_id INT AUTO_INCREMENT PRIMARY KEY,
        wallet_owner_id INT NOT NULL,
        owner_type ENUM('Rider', 'Driver') NOT NULL,
        txn_type ENUM('TopUp', 'TripPayment', 'TripEarning', 'Payout', 'Refund') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        balance_after DECIMAL(10,2) NOT NULL,
        reference_id INT,
        reference_type VARCHAR(50),
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Wallet_Transaction table ready");

    // 3. Payout_Request
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Payout_Request (
        payout_id INT AUTO_INCREMENT PRIMARY KEY,
        driver_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
        status ENUM('Pending', 'Processed', 'Rejected') DEFAULT 'Pending',
        admin_note TEXT,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP NULL,
        FOREIGN KEY (driver_id) REFERENCES Driver(driver_id) ON DELETE CASCADE
      )
    `);
    console.log("✅ Payout_Request table ready");

    // 4. Initialize wallets for existing Riders
    console.log("Initializing wallets for existing riders...");
    await pool.query(`
      INSERT IGNORE INTO Rider_Wallet (rider_id)
      SELECT user_id FROM User WHERE role = 'Rider'
    `);
    console.log("✅ Initialized rider wallets");

    // 5. Initialize wallets for existing Drivers
    await pool.query(`
      INSERT IGNORE INTO Wallet (driver_id)
      SELECT driver_id FROM Driver
    `);
    console.log("✅ Initialized driver wallets");

    console.log("Migration successful!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

migrate();
