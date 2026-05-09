CREATE DATABASE RideFlowDB;
USE RideFlowDB;

CREATE TABLE User (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Rider', 'Driver') NOT NULL,
    account_status ENUM('Active', 'Suspended', 'Banned') DEFAULT 'Active',
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Driver (
    driver_id INT PRIMARY KEY,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    cnic VARCHAR(20) NOT NULL UNIQUE,
    profile_photo VARCHAR(255),
    verification_status ENUM('Pending', 'Verified', 'Rejected') DEFAULT 'Pending',
    availability_status ENUM('Online', 'Offline', 'On Trip') DEFAULT 'Offline',
    total_trips INT DEFAULT 0 CHECK (total_trips >= 0),
    avg_rating DECIMAL(2,1) DEFAULT 5.0 CHECK (avg_rating BETWEEN 0 AND 5),

    FOREIGN KEY (driver_id) REFERENCES User(user_id)
        ON DELETE CASCADE
);

CREATE TABLE Vehicle (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL CHECK (year >= 2000),
    color VARCHAR(30),
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    vehicle_type ENUM('Economy', 'Premium', 'Bike') NOT NULL,
    verification_status ENUM('Pending', 'Verified', 'Rejected') DEFAULT 'Pending',

    FOREIGN KEY (driver_id) REFERENCES Driver(driver_id)
        ON DELETE CASCADE
);

CREATE TABLE Ride (
    ride_id INT AUTO_INCREMENT PRIMARY KEY,
    rider_id INT NOT NULL,
    driver_id INT,
    vehicle_id INT,
    pickup_location VARCHAR(255) NOT NULL,
    dropoff_location VARCHAR(255) NOT NULL,
    status ENUM('Requested', 'Accepted', 'Driver En Route', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Requested',
    request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    fare DECIMAL(10,2) CHECK (fare >= 0),

    FOREIGN KEY (rider_id) REFERENCES User(user_id),
    FOREIGN KEY (driver_id) REFERENCES Driver(driver_id),
    FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id)
);

CREATE TABLE Ride_History (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL UNIQUE,
    final_status ENUM('Completed', 'Cancelled') NOT NULL,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ride_id) REFERENCES Ride(ride_id)
        ON DELETE CASCADE
);

CREATE TABLE Promo_Code (
    code VARCHAR(20) PRIMARY KEY,
    discount_type ENUM('Percent', 'Flat') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
    min_ride_amount DECIMAL(10,2) DEFAULT 0,
    expiry_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE Payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL UNIQUE,
    rider_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    payment_method ENUM('Cash', 'Wallet', 'Card') NOT NULL,
    payment_status ENUM('Pending', 'Paid', 'Failed', 'Refunded') DEFAULT 'Pending',
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    promo_code VARCHAR(20),
    discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),

    FOREIGN KEY (ride_id) REFERENCES Ride(ride_id),
    FOREIGN KEY (rider_id) REFERENCES User(user_id),
    FOREIGN KEY (promo_code) REFERENCES Promo_Code(code)
);


CREATE TABLE Rating (
    rating_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL,
    rated_by ENUM('Rider', 'Driver') NOT NULL,
    rated_user_id INT NOT NULL,
    score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ride_id) REFERENCES Ride(ride_id),
    FOREIGN KEY (rated_user_id) REFERENCES User(user_id)
);


CREATE TABLE Wallet (
    wallet_id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT NOT NULL UNIQUE,
    balance DECIMAL(10,2) DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (driver_id) REFERENCES Driver(driver_id)
        ON DELETE CASCADE
);



CREATE TABLE Admin_Log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    target_table VARCHAR(50),
    target_id INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (admin_id) REFERENCES User(user_id)
);

select * from user;

ALTER TABLE User ADD COLUMN refresh_token TEXT DEFAULT NULL;
ALTER TABLE User ADD COLUMN profile_photo VARCHAR(255) DEFAULT NULL;



-- Phase 1 Additions: Required for JWT-based session management
-- refresh_token: TEXT  stores JWT refresh token; set to NULL on logout.
ALTER TABLE User ADD COLUMN refresh_token TEXT DEFAULT NULL;
-- profile_photo: VARCHAR(255)  Cloudinary CDN URL; nullable (optional at registration).
ALTER TABLE User ADD COLUMN profile_photo VARCHAR(255) DEFAULT NULL;
