import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import db from '../db/index.js';

const patientApp = new Hono();

// Keep validation permissive to match existing SQLite schema (TEXT nullable)
const PatientSchema = z.object({
  Name: z.string().min(1, 'Name is required'),
  DOB: z.string().nullable().optional(),
  Gender: z.string().nullable().optional(),
  Phone: z.string().nullable().optional(),
  Address: z.string().nullable().optional(),
});

const UpdatePatientSchema = z.object({
  Name: z.string().min(1).nullable().optional(),
  DOB: z.string().nullable().optional(),
  Gender: z.string().nullable().optional(),
  Phone: z.string().nullable().optional(),
  Address: z.string().nullable().optional(),
});

interface Patient {
  PatientID: number;
  Name: string | null;
  DOB: string | null;
  Gender: string | null;
  Phone: string | null;
  Address: string | null;
}

// Initialize Patient table
function initializePatientTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS Patient (
      PatientID INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT,
      DOB TEXT,
      Gender TEXT,
      Phone TEXT,
      Address TEXT
    )
  `;
  
  db.exec(createTableSQL);
  console.log('Patient table initialized');
}

initializePatientTable();

// CREATE - Add new patient
patientApp.post(
  '/',
  zValidator('json', PatientSchema),
  (c) => {
    const data = c.req.valid('json');
    
    const stmt = db.prepare(`
      INSERT INTO Patient (Name, DOB, Gender, Phone, Address)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.Name,
      data.DOB ?? null,
      data.Gender ?? null,
      data.Phone ?? null,
      data.Address ?? null
    );
    
    const newPatient = {
      PatientID: result.lastInsertRowid,
      ...data,
      DOB: data.DOB ?? null,
      Gender: data.Gender ?? null,
      Phone: data.Phone ?? null,
      Address: data.Address ?? null
    };
    
    return c.json(newPatient, 201);
  }
);

// READ - Get all patients
patientApp.get('/', (c) => {
  const stmt = db.prepare('SELECT * FROM Patient ORDER BY PatientID DESC');
  const patients = stmt.all() as Patient[];
  
  return c.json(patients, 200);
});

// READ - Get patient by ID
patientApp.get('/:id', (c) => {
  const id = parseInt(c.req.param('id'));
  
  const stmt = db.prepare('SELECT * FROM Patient WHERE PatientID = ?');
  const patient = stmt.get(id) as Patient | undefined;
  
  if (!patient) {
    return c.json({ error: 'Patient not found' }, 404);
  }
  
  return c.json(patient, 200);
});

// UPDATE - Update patient by ID
patientApp.put(
  '/:id',
  zValidator('json', UpdatePatientSchema),
  (c) => {
    const id = parseInt(c.req.param('id'));
    const data = c.req.valid('json');
    
    // Check if patient exists
    const checkStmt = db.prepare('SELECT * FROM Patient WHERE PatientID = ?');
    const patient = checkStmt.get(id) as Patient | undefined;
    
    if (!patient) {
      return c.json({ error: 'Patient not found' }, 404);
    }
    
    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    
    if (data.Name !== undefined) {
      updates.push('Name = ?');
      values.push(data.Name);
    }
    if (data.DOB !== undefined) {
      updates.push('DOB = ?');
      values.push(data.DOB);
    }
    if (data.Gender !== undefined) {
      updates.push('Gender = ?');
      values.push(data.Gender);
    }
    if (data.Phone !== undefined) {
      updates.push('Phone = ?');
      values.push(data.Phone);
    }
    if (data.Address !== undefined) {
      updates.push('Address = ?');
      values.push(data.Address);
    }
    
    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }
    
    values.push(id);
    
    const updateSQL = `UPDATE Patient SET ${updates.join(', ')} WHERE PatientID = ?`;
    const updateStmt = db.prepare(updateSQL);
    updateStmt.run(...values);
    
    // Fetch updated patient
    const fetchStmt = db.prepare('SELECT * FROM Patient WHERE PatientID = ?');
    const updatedPatient = fetchStmt.get(id) as Patient;
    
    return c.json(updatedPatient, 200);
  }
);

// DELETE - Delete patient by ID
patientApp.delete('/:id', (c) => {
  const id = parseInt(c.req.param('id'));
  
  const checkStmt = db.prepare('SELECT * FROM Patient WHERE PatientID = ?');
  const patient = checkStmt.get(id) as Patient | undefined;
  
  if (!patient) {
    return c.json({ error: 'Patient not found' }, 404);
  }
  
  const deleteStmt = db.prepare('DELETE FROM Patient WHERE PatientID = ?');
  deleteStmt.run(id);
  
  return c.json({ message: 'Patient deleted successfully', PatientID: id }, 200);
});

export default patientApp;
