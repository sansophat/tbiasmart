const { createClient } = require('@libsql/client/web');

const url = 'libsql://tbiasmart-sansophat.aws-ap-northeast-1.turso.io';
const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTIwNTgxNzIsImlkIjoiMDFhMTNlZmQtNWIwMS03NzdkLTgxOWUtOWIzNzFkZmQ2MjRmIiwia2lkIjoicHRSQk5aRWxyWVZzdlpXUzhOZS1XelczMUk3d1pkVGFMS0tFM3c0VzZ3ayIsInJpZCI6ImQxMWRmZWNjLWIwMmUtNDZhNy1hNmJjLTllMTEyNzdjMTg3MiJ9.OElfSOYKd5lbwQ-L_z5UPCeC3tzasR-cBVTr6SePxYfKj77G_pPBXVEQmSkX53zB6l0kKOi7M-IqYhYu0kALCQ';

const client = createClient({ url, authToken });

async function main() {
  try {
    console.log('Testing Turso ping...');
    const ping = await client.execute('SELECT 1 as test');
    console.log('Ping result:', ping.rows);

    console.log('Creating tables...');
    await client.batch([
      'CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT);',
      'CREATE TABLE IF NOT EXISTS attendance_records (id TEXT PRIMARY KEY, employee_id TEXT, date TEXT, record TEXT NOT NULL, created_at TEXT);',
      'CREATE TABLE IF NOT EXISTS staff_alerts (id TEXT PRIMARY KEY, alert TEXT NOT NULL, created_at TEXT);',
      'CREATE TABLE IF NOT EXISTS leave_requests (id TEXT PRIMARY KEY, request TEXT NOT NULL, created_at TEXT);'
    ]);
    console.log('All tables created successfully!');

    // Seed initial data from system_database.json if present
    const fs = require('fs');
    if (fs.existsSync('./data/system_database.json')) {
      const dbData = JSON.parse(fs.readFileSync('./data/system_database.json', 'utf8'));
      console.log('Seeding initial employees and system state into Turso...');

      const statements = [];
      const now = new Date().toISOString();
      for (const [key, val] of Object.entries(dbData)) {
        if (key === 'attendanceRecords' && Array.isArray(val)) {
          for (const rec of val.slice(0, 300)) {
            if (rec && rec.id) {
              statements.push({
                sql: 'INSERT INTO attendance_records (id, employee_id, date, record, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET record = excluded.record',
                args: [rec.id, rec.employeeId || '', rec.date || now.split('T')[0], JSON.stringify(rec), rec.timestamp ? new Date(rec.timestamp).toISOString() : now]
              });
            }
          }
        } else if (key === 'staffAlerts') {
          // ignore
        } else if (val !== undefined) {
          statements.push({
            sql: 'INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
            args: [key, JSON.stringify(val), now]
          });
        }
      }

      // Execute in chunks
      const chunkSize = 50;
      for (let i = 0; i < statements.length; i += chunkSize) {
        const chunk = statements.slice(i, i + chunkSize);
        await client.batch(chunk);
      }
      console.log('Successfully seeded', statements.length, 'records into Turso SQLite Cloud!');
    }

    const testSelect = await client.execute('SELECT key FROM app_state');
    console.log('State keys in Turso:', testSelect.rows.map(r => r.key));

    const empSelect = await client.execute("SELECT value FROM app_state WHERE key = 'employees'");
    if (empSelect.rows.length > 0) {
      const emps = JSON.parse(empSelect.rows[0].value);
      console.log('Total employees now in Turso SQLite Cloud:', emps.length);
      console.log('Employee names:', emps.slice(0, 5).map(e => e.nameEn).join(', ') + '...');
    }
  } catch (err) {
    console.error('Turso test error:', err);
  }
}

main();
