import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import patientApp from './patient/index.js';


const app = new Hono();
app.route('/api/patients', patientApp);

serve({ fetch: app.fetch, port: 3000 });
console.log('Server is running on http://localhost:3000');
