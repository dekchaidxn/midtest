import Database from 'better-sqlite3';
import path from 'node:path';
async function initializeDatabase() {
    // สร้างการเชื่อมต่อฐานข้อมูล SQLite
    // หากไฟล์ฐานข้อมูลยังไม่มี จะถูกสร้างขึ้นใหม่
    const option = { verbose: console.log };
    const dbPath = path.resolve(process.cwd(), 'backend_test.db');
    const db = new Database(dbPath, option);
    return db;
}
const db = await initializeDatabase();
export default db;
