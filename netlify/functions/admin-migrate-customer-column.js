import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Token und Admin-Status verifizieren
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!decoded.isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const client = await pool.connect();
    try {
      console.log('Starting customer column migration...');
      
      // Prüfen ob customer Spalte bereits existiert
      let hasCustomer = true;
      try {
        await client.query('SELECT customer FROM users LIMIT 1');
        console.log('Customer column already exists');
      } catch (error) {
        if (error.message.includes('column "customer" does not exist')) {
          hasCustomer = false;
          console.log('Customer column does not exist, creating...');
        } else {
          throw error;
        }
      }

      if (!hasCustomer) {
        // Customer-Spalte hinzufügen
        await client.query('ALTER TABLE users ADD COLUMN customer VARCHAR(100)');
        console.log('Customer column added successfully');
        
        // Verifizieren dass die Spalte erstellt wurde
        try {
          await client.query('SELECT customer FROM users LIMIT 1');
          console.log('Customer column verified');
        } catch (verifyError) {
          throw new Error('Failed to verify customer column creation: ' + verifyError.message);
        }
      }

      // Zusätzlich prüfen ob updated_at Spalte existiert
      let hasUpdatedAt = true;
      try {
        await client.query('SELECT updated_at FROM users LIMIT 1');
      } catch (error) {
        if (error.message.includes('column "updated_at" does not exist')) {
          hasUpdatedAt = false;
          console.log('Adding updated_at column...');
          await client.query('ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: hasCustomer ? 'Customer column already existed' : 'Customer column created successfully',
        hasCustomer: true,
        hasUpdatedAt: hasUpdatedAt || false
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
