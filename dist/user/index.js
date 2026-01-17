import { Hono } from 'hono';
import db from '../db/index.js';
import * as z from 'zod';
import { zValidator } from '@hono/zod-validator';
const userRoutes = new Hono();
// GET all users with their roles
userRoutes.get('/', (c) => {
    let sql = 'SELECT * FROM users';
    let stmt = db.prepare(sql);
    const allUsers = stmt.all();
    return c.json({ message: 'List of users', data: allUsers });
});
userRoutes.get('/:id', (c) => {
    const { id } = c.req.param();
    let sql = 'SELECT * FROM users WHERE id = @id';
    let stmt = db.prepare(sql);
    let user = stmt.get({ id: id });
    if (!user) {
        return c.json({ message: 'User not found' }, 404);
    }
    return c.json({
        message: `User details for ID: ${id}`,
        data: user
    });
});
const createUserSchema = z.object({
    username: z.string("กรุณากรอกชื่อผู้ใช้")
        .min(5, "ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 5 ตัวอักษร"),
    password: z.string("กรุณากรอกชื่อผู้ใช้"),
    firstname: z.string("กรุณากรอกชื่อจริง").optional(),
    lastname: z.string("กรุณากรอกนามสกุล").optional(),
});
// POST create a new user
userRoutes.post('/', zValidator('json', createUserSchema, (result, c) => {
    if (!result.success) {
        return c.json({
            message: 'Validation Failed',
            errors: result.error.issues
        }, 400);
    }
}), async (c) => {
    const body = await c.req.json();
    let sql = `INSERT INTO users 
                      (username, password, firstname, lastname)
               VALUES (@username, @password, @firstname, @lastname)
               `;
    let stmt = db.prepare(sql);
    let result = stmt.run(body);
    if (result.changes === 0) {
        return c.json({ message: 'Failed to create user' }, 500);
    }
    let lastRowid = result.lastInsertRowid;
    let sql2 = 'SELECT * FROM users WHERE id = ?';
    let stmt2 = db.prepare(sql2);
    let newUser = stmt2.get(lastRowid);
    return c.json({ message: 'User created', data: newUser }, 201);
});
// PUT update a user
const updateUserSchema = z.object({
    username: z.string("กรุณากรอกชื่อผู้ใช้")
        .min(5, "ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 5 ตัวอักษร").optional(),
    password: z.string("กรุณากรอกชื่อผู้ใช้").optional(),
    firstname: z.string("กรุณากรอกชื่อจริง").optional(),
    lastname: z.string("กรุณากรอกนามสกุล").optional(),
});
userRoutes.put('/:id', zValidator('json', updateUserSchema, (result, c) => {
    if (!result.success) {
        return c.json({
            message: 'Validation Failed',
            errors: result.error.issues
        }, 400);
    }
}), async (c) => {
    const { id } = c.req.param();
    const body = await c.req.json();
    // Check if user exists
    let checkSql = 'SELECT * FROM users WHERE id = @id';
    let checkStmt = db.prepare(checkSql);
    let existingUser = checkStmt.get({ id: id });
    if (!existingUser) {
        return c.json({ message: 'User not found' }, 404);
    }
    // Build update query dynamically
    const fields = Object.keys(body).filter(key => body[key] !== undefined);
    if (fields.length === 0) {
        return c.json({ message: 'No fields to update' }, 400);
    }
    const setClause = fields.map(field => `${field} = @${field}`).join(', ');
    let sql = `UPDATE users SET ${setClause} WHERE id = @id`;
    let stmt = db.prepare(sql);
    const params = { ...body, id: parseInt(id) };
    let result = stmt.run(params);
    if (result.changes === 0) {
        return c.json({ message: 'Failed to update user' }, 500);
    }
    // Return updated user
    let selectSql = 'SELECT * FROM users WHERE id = ?';
    let selectStmt = db.prepare(selectSql);
    let updatedUser = selectStmt.get(parseInt(id));
    return c.json({ message: 'User updated', data: updatedUser });
});
// DELETE a user
userRoutes.delete('/:id', (c) => {
    const { id } = c.req.param();
    // Check if user exists
    let checkSql = 'SELECT * FROM users WHERE id = @id';
    let checkStmt = db.prepare(checkSql);
    let existingUser = checkStmt.get({ id: id });
    if (!existingUser) {
        return c.json({ message: 'User not found' }, 404);
    }
    let sql = 'DELETE FROM users WHERE id = @id';
    let stmt = db.prepare(sql);
    let result = stmt.run({ id: id });
    if (result.changes === 0) {
        return c.json({ message: 'Failed to delete user' }, 500);
    }
    return c.json({ message: 'User deleted' });
});
export default userRoutes;
