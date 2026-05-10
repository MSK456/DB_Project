import 'dotenv/config';
import { pool } from '../src/db/index.js';
import fs from 'fs';

async function extractFullSchema() {
  try {
    let tablesSql = "\n-- 1. TABLES\n";
    let viewsSql = "\n-- 2. VIEWS\n";
    let triggersSql = "\n-- 3. TRIGGERS\n";
    let eventsSql = "\n-- 4. EVENTS\n";

    // Use local DB name for extraction
    const dbName = 'rideflowdb'; 
    
    console.log(`Extracting from local database: ${dbName}...`);

    const [entities] = await pool.query(`
      SELECT TABLE_NAME, TABLE_TYPE 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ?
    `, [dbName]);

    const tables = entities.filter(e => e.TABLE_TYPE === 'BASE TABLE').map(e => e.TABLE_NAME);
    const views = entities.filter(e => e.TABLE_TYPE === 'VIEW').map(e => e.TABLE_NAME);

    for (const name of tables) {
      const [[createTable]] = await pool.query(`SHOW CREATE TABLE \`${dbName}\`.\`${name}\``);
      tablesSql += `-- Table: ${name}\n`;
      tablesSql += createTable['Create Table'] + ";\n\n";
    }

    for (const name of views) {
      const [[createView]] = await pool.query(`SHOW CREATE VIEW \`${dbName}\`.\`${name}\``);
      // Fixed Regex to avoid "CREATE VIEW VIEW"
      let stmt = createView['Create View'].replace(/CREATE ALGORITHM=[^ ]+ DEFINER=`[^`]+`@`[^`]+` SQL SECURITY DEFINER VIEW/, 'CREATE VIEW');
      viewsSql += `-- View: ${name}\n`;
      viewsSql += stmt + ";\n\n";
    }

    const [triggers] = await pool.query(`SHOW TRIGGERS FROM \`${dbName}\``);
    for (const trigger of triggers) {
      if (trigger.Trigger === 'after_ride_status_change') continue;
      const [[createTrigger]] = await pool.query(`SHOW CREATE TRIGGER \`${dbName}\`.\`${trigger.Trigger}\``);
      triggersSql += `-- Trigger: ${trigger.Trigger}\n`;
      triggersSql += "DELIMITER //\n";
      let stmt = createTrigger['SQL Original Statement'].replace(/CREATE DEFINER=`[^`]+`@`[^`]+` TRIGGER/, 'CREATE TRIGGER');
      triggersSql += stmt + " //\n";
      triggersSql += "DELIMITER ;\n\n";
    }

    const [events] = await pool.query(`SHOW EVENTS FROM \`${dbName}\``);
    for (const event of events) {
      const [[createEvent]] = await pool.query(`SHOW CREATE EVENT \`${dbName}\`.\`${event.Name}\``);
      eventsSql += `-- Event: ${event.Name}\n`;
      let stmt = createEvent['Create Event'].replace(/CREATE DEFINER=`[^`]+`@`[^`]+` EVENT/, 'CREATE EVENT');
      eventsSql += stmt + ";\n\n";
    }

    const finalSql = `-- RideFlow Complete Database Schema\n` + 
                     `SET FOREIGN_KEY_CHECKS = 0;\n` +
                     tablesSql + viewsSql + triggersSql + eventsSql +
                     `SET FOREIGN_KEY_CHECKS = 1;\n`;

    fs.writeFileSync('rideflow_schema.sql', finalSql);
    console.log("Successfully regenerated rideflow_schema.sql with fixed View syntax.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

// Restore local credentials in memory for the pool if needed, 
// but since I restored .env in the previous turn, it should work.
extractFullSchema();
