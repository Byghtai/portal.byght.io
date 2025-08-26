import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export default async (req, context) => {
  if (req.method !== 'PUT') {
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

    const { fileId, productLabel, versionLabel, languageLabel, confluenceLabel } = await req.json();

    console.log('Update file labels request:', {
      fileId,
      productLabel,
      versionLabel,
      languageLabel,
      confluenceLabel
    });

    if (!fileId) {
      return new Response(JSON.stringify({ error: 'File ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validierung der Label-Längen
    if (confluenceLabel && confluenceLabel.length > 50) {
      return new Response(JSON.stringify({ 
        error: 'Confluence label is too long. Maximum length is 50 characters.',
        currentLength: confluenceLabel.length,
        maxLength: 50
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (productLabel && productLabel.length > 50) {
      return new Response(JSON.stringify({ 
        error: 'Product label is too long. Maximum length is 50 characters.',
        currentLength: productLabel.length,
        maxLength: 50
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (versionLabel && versionLabel.length > 20) {
      return new Response(JSON.stringify({ 
        error: 'Version label is too long. Maximum length is 20 characters.',
        currentLength: versionLabel.length,
        maxLength: 20
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (languageLabel && languageLabel.length > 20) {
      return new Response(JSON.stringify({ 
        error: 'Language label is too long. Maximum length is 20 characters.',
        currentLength: languageLabel.length,
        maxLength: 20
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const client = await pool.connect();
    try {
      // Zuerst prüfen, ob die Datei existiert
      const fileCheck = await client.query('SELECT id, filename FROM files WHERE id = $1', [fileId]);
      if (fileCheck.rowCount === 0) {
        return new Response(JSON.stringify({ error: 'File not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      console.log('Updating file:', fileCheck.rows[0].filename);

      // Prüfen ob confluence_label Spalte existiert
      let confluenceColumnExists = true;
      try {
        await client.query('SELECT confluence_label FROM files LIMIT 1');
        console.log('confluence_label column exists');
      } catch (error) {
        if (error.message.includes('column "confluence_label" does not exist')) {
          console.log('confluence_label column missing, adding it...');
          await client.query('ALTER TABLE files ADD COLUMN confluence_label VARCHAR(50)');
          confluenceColumnExists = true;
        } else {
          throw error;
        }
      }

      // Prüfen die Spaltengröße für confluence_label
      if (confluenceColumnExists) {
        try {
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
          }
        } catch (error) {
          console.log('Could not check/extend confluence_label column:', error.message);
        }
      }

      const result = await client.query(
        `UPDATE files 
         SET product_label = $1, version_label = $2, language_label = $3, confluence_label = $4
         WHERE id = $5 
         RETURNING id, filename, product_label, version_label, language_label, confluence_label`,
        [productLabel || null, versionLabel || null, languageLabel || null, confluenceLabel || null, fileId]
      );

      console.log('Update successful:', result.rows[0]);

      return new Response(JSON.stringify({ 
        success: true,
        file: result.rows[0]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update file labels error:', error);
    
    // Detailliertere Fehlermeldungen
    let errorMessage = 'Server error';
    if (error.message.includes('value too long for type')) {
      errorMessage = 'One of the labels is too long for the database column. Please use shorter values.';
    } else if (error.message.includes('column') && error.message.includes('does not exist')) {
      errorMessage = 'Database schema issue detected. Please contact administrator.';
    } else if (error.message.includes('syntax error')) {
      errorMessage = 'Database query error. Please contact administrator.';
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
