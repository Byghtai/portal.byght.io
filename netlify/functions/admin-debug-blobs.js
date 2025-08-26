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
      console.log('Starting database structure check...');
      
      // Check if label columns exist in files table
          let hasProductLabel = false;
    let hasVersionLabel = false;
    let hasLanguageLabel = false;
    let hasConfluenceLabel = false;
      
      try {
        await client.query('SELECT product_label FROM files LIMIT 1');
        hasProductLabel = true;
        console.log('✓ product_label column exists');
      } catch (error) {
        if (error.message.includes('column "product_label" does not exist')) {
          console.log('✗ product_label column missing');
        } else {
          throw error;
        }
      }
      
      try {
        await client.query('SELECT version_label FROM files LIMIT 1');
        hasVersionLabel = true;
        console.log('✓ version_label column exists');
      } catch (error) {
        if (error.message.includes('column "version_label" does not exist')) {
          console.log('✗ version_label column missing');
        } else {
          throw error;
        }
      }
      
      try {
        await client.query('SELECT language_label FROM files LIMIT 1');
        hasLanguageLabel = true;
        console.log('✓ language_label column exists');
      } catch (error) {
        if (error.message.includes('column "language_label" does not exist')) {
          console.log('✗ language_label column missing');
        } else {
          throw error;
        }
      }
      
      try {
        await client.query('SELECT confluence_label FROM files LIMIT 1');
        hasConfluenceLabel = true;
        console.log('✓ confluence_label column exists');
      } catch (error) {
        if (error.message.includes('column "confluence_label" does not exist')) {
          console.log('✗ confluence_label column missing');
        } else {
          throw error;
        }
      }
      
      // Add missing columns
      const addedColumns = [];
      if (!hasProductLabel) {
        console.log('Adding product_label column...');
        await client.query('ALTER TABLE files ADD COLUMN product_label VARCHAR(50)');
        addedColumns.push('product_label');
      }
      
      if (!hasVersionLabel) {
        console.log('Adding version_label column...');
        await client.query('ALTER TABLE files ADD COLUMN version_label VARCHAR(20)');
        addedColumns.push('version_label');
      }
      
      if (!hasLanguageLabel) {
        console.log('Adding language_label column...');
        await client.query('ALTER TABLE files ADD COLUMN language_label VARCHAR(20)');
        addedColumns.push('language_label');
      }
      
      if (!hasConfluenceLabel) {
        console.log('Adding confluence_label column...');
        await client.query('ALTER TABLE files ADD COLUMN confluence_label VARCHAR(20)');
        addedColumns.push('confluence_label');
      }
      
      // Get current table structure
      const structureResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'files'
        ORDER BY ordinal_position
      `);
      
      // Get file count
      const fileCountResult = await client.query('SELECT COUNT(*) as count FROM files');
      const fileCount = fileCountResult.rows[0].count;
      
      // Get sample files to check data
      const sampleFilesResult = await client.query(`
        SELECT id, filename, product_label, version_label, language_label, confluence_label
        FROM files
        LIMIT 5
      `);
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Database structure check completed',
        structure: {
          columns: structureResult.rows,
          fileCount: fileCount,
          sampleFiles: sampleFilesResult.rows
        },
        fixes: {
          addedColumns: addedColumns,
          hasProductLabel: hasProductLabel || addedColumns.includes('product_label'),
          hasVersionLabel: hasVersionLabel || addedColumns.includes('version_label'),
          hasLanguageLabel: hasLanguageLabel || addedColumns.includes('language_label'),
          hasConfluenceLabel: hasConfluenceLabel || addedColumns.includes('confluence_label')
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database debug error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
