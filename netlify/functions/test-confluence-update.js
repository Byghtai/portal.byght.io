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
      console.log('Testing confluence_label column...');
      
      // 1. Prüfen ob Spalte existiert
      let confluenceColumnExists = true;
      try {
        await client.query('SELECT confluence_label FROM files LIMIT 1');
        console.log('✓ confluence_label column exists');
      } catch (error) {
        if (error.message.includes('column "confluence_label" does not exist')) {
          console.log('✗ confluence_label column missing');
          confluenceColumnExists = false;
        } else {
          throw error;
        }
      }

      // 2. Spalte hinzufügen falls nicht vorhanden
      if (!confluenceColumnExists) {
        console.log('Adding confluence_label column...');
        await client.query('ALTER TABLE files ADD COLUMN confluence_label VARCHAR(50)');
        console.log('✓ confluence_label column added');
      }

      // 3. Spaltengröße prüfen
      const columnInfo = await client.query(`
        SELECT character_maximum_length 
        FROM information_schema.columns 
        WHERE table_name = 'files' AND column_name = 'confluence_label'
      `);
      
      const currentLength = columnInfo.rows[0]?.character_maximum_length;
      console.log('Current confluence_label column length:', currentLength);
      
      // 4. Spalte erweitern falls zu klein
      if (currentLength && currentLength < 50) {
        console.log('Extending confluence_label column from VARCHAR(' + currentLength + ') to VARCHAR(50)...');
        await client.query('ALTER TABLE files ALTER COLUMN confluence_label TYPE VARCHAR(50)');
        console.log('✓ confluence_label column extended');
      }

      // 5. Test-Update durchführen
      const testValue = 'Cloud';
      console.log('Testing update with value:', testValue);
      
      // Erste Datei finden
      const fileResult = await client.query('SELECT id, filename FROM files LIMIT 1');
      if (fileResult.rows.length === 0) {
        return new Response(JSON.stringify({ 
          error: 'No files found in database',
          confluenceColumnExists,
          currentLength
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const testFile = fileResult.rows[0];
      console.log('Testing with file:', testFile.filename);

      // Update testen
      const updateResult = await client.query(
        `UPDATE files 
         SET confluence_label = $1
         WHERE id = $2 
         RETURNING id, filename, confluence_label`,
        [testValue, testFile.id]
      );

      console.log('Update result:', updateResult.rows[0]);

      // 6. Aktuelle Spaltengröße nach Update prüfen
      const finalColumnInfo = await client.query(`
        SELECT character_maximum_length 
        FROM information_schema.columns 
        WHERE table_name = 'files' AND column_name = 'confluence_label'
      `);
      
      const finalLength = finalColumnInfo.rows[0]?.character_maximum_length;

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Confluence label test completed successfully',
        testFile: testFile.filename,
        testValue: testValue,
        updateResult: updateResult.rows[0],
        confluenceColumnExists,
        initialLength: currentLength,
        finalLength: finalLength
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Test confluence update error:', error);
    return new Response(JSON.stringify({ 
      error: 'Test failed',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
