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
      console.log('Checking confluence_label column...');
      
      // Prüfen ob confluence_label Spalte existiert
      let confluenceColumnExists = true;
      try {
        await client.query('SELECT confluence_label FROM files LIMIT 1');
      } catch (error) {
        if (error.message.includes('column "confluence_label" does not exist')) {
          confluenceColumnExists = false;
        } else {
          throw error;
        }
      }

      if (!confluenceColumnExists) {
        console.log('Adding confluence_label column...');
        await client.query('ALTER TABLE files ADD COLUMN confluence_label VARCHAR(50)');
        console.log('confluence_label column added successfully');
      } else {
        console.log('confluence_label column already exists, checking size...');
        
        // Prüfen die aktuelle Spaltengröße
        const columnInfo = await client.query(`
          SELECT character_maximum_length 
          FROM information_schema.columns 
          WHERE table_name = 'files' AND column_name = 'confluence_label'
        `);
        
        const currentLength = columnInfo.rows[0]?.character_maximum_length;
        console.log('Current confluence_label column length:', currentLength);
        
        if (currentLength && currentLength < 50) {
          console.log('Extending confluence_label column to VARCHAR(50)...');
          await client.query('ALTER TABLE files ALTER COLUMN confluence_label TYPE VARCHAR(50)');
          console.log('confluence_label column extended successfully');
        } else {
          console.log('confluence_label column is already the correct size');
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Confluence label column has been fixed successfully. The column now supports values up to 50 characters.'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Fix confluence column error:', error);
    return new Response(JSON.stringify({ 
      error: 'Database fix failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
