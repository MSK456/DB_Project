import 'dotenv/config';
import { pool } from '../src/db/index.js';

async function updateSchema() {
  const connection = await pool.getConnection();
  try {
    console.log('Updating schema for Google Maps integration...');

    // Add coordinate columns to driver table
    console.log('Updating driver table...');
    await connection.execute(`
      ALTER TABLE driver 
      ADD COLUMN latitude DECIMAL(10,8) DEFAULT NULL,
      ADD COLUMN longitude DECIMAL(11,8) DEFAULT NULL,
      ADD COLUMN location_updated_at TIMESTAMP DEFAULT NULL
    `).catch(err => console.log('Driver columns might already exist:', err.message));

    // Add coordinate columns to ride table
    console.log('Updating ride table...');
    await connection.execute(`
      ALTER TABLE ride
      ADD COLUMN pickup_lat DECIMAL(10,8) DEFAULT NULL,
      ADD COLUMN pickup_lng DECIMAL(11,8) DEFAULT NULL,
      ADD COLUMN dropoff_lat DECIMAL(10,8) DEFAULT NULL,
      ADD COLUMN dropoff_lng DECIMAL(11,8) DEFAULT NULL
    `).catch(err => console.log('Ride coord columns might already exist:', err.message));

    // Add actual Google Maps data columns for completed rides
    await connection.execute(`
      ALTER TABLE ride
      ADD COLUMN actual_distance_km DECIMAL(8,2) DEFAULT NULL,
      ADD COLUMN actual_duration_minutes INT DEFAULT NULL,
      ADD COLUMN route_polyline TEXT DEFAULT NULL
    `).catch(err => console.log('Ride metric columns might already exist:', err.message));

    // Index for geospatial proximity queries
    console.log('Creating indexes...');
    await connection.execute(`CREATE INDEX idx_driver_location ON driver(latitude, longitude)`).catch(err => console.log('Index idx_driver_location might exist:', err.message));
    await connection.execute(`CREATE INDEX idx_driver_availability_location ON driver(availability_status, verification_status, latitude, longitude)`).catch(err => console.log('Index idx_driver_availability_location might exist:', err.message));

    console.log('Schema update completed successfully!');
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

updateSchema();
