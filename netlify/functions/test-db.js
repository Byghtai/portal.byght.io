import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export default async (req, context) => {
  if (req.method !== 'GET') {
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
      console.log('Testing database connection...');
      
      // Test basic connection
      const connectionTest = await client.query('SELECT NOW() as current_time');
      console.log('Database connection successful:', connectionTest.rows[0]);
      
      // Test files table structure
      const tableStructure = await client.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'files' 
        ORDER BY ordinal_position
      `);
      
      console.log('Files table structure:', tableStructure.rows);
      
      // Test users table structure
      const usersStructure = await client.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `);
      
      console.log('Users table structure:', usersStructure.rows);
      
      // Count records
      const filesCount = await client.query('SELECT COUNT(*) as count FROM files');
      const usersCount = await client.query('SELECT COUNT(*) as count FROM users');
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Database connection and structure test completed',
        database: {
          connection: 'OK',
          currentTime: connectionTest.rows[0].current_time,
          tables: {
            files: {
              structure: tableStructure.rows,
              recordCount: filesCount.rows[0].count
            },
            users: {
              structure: usersStructure.rows,
              recordCount: usersCount.rows[0].count
            }
          }
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Database test error:', error);
    return new Response(JSON.stringify({ 
      error: 'Database test failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
