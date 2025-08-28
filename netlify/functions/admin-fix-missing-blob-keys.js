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
      console.log('Searching for files with missing blob keys...');
      
      // Find files with null or empty blob_key
      const filesWithMissingKeys = await client.query(`
        SELECT id, filename, file_size, mime_type, blob_key, uploaded_at
        FROM files 
        WHERE blob_key IS NULL OR blob_key = ''
        ORDER BY id
      `);
      
      console.log(`Found ${filesWithMissingKeys.rows.length} files with missing blob keys`);
      
      const fixedFiles = [];
      const deletedFiles = [];
      
      for (const file of filesWithMissingKeys.rows) {
        console.log(`Processing file ID ${file.id}: ${file.filename}`);
        
        // Since we can't recreate the S3 blob without the original file,
        // we should delete these orphaned database entries
        try {
          // First, delete file assignments
          await client.query('DELETE FROM file_user_assignments WHERE file_id = $1', [file.id]);
          console.log(`Deleted file assignments for file ID ${file.id}`);
          
          // Then delete the file record
          await client.query('DELETE FROM files WHERE id = $1', [file.id]);
          console.log(`Deleted file record for file ID ${file.id}`);
          
          deletedFiles.push({
            id: file.id,
            filename: file.filename,
            reason: 'Missing blob key - orphaned database entry'
          });
        } catch (deleteError) {
          console.error(`Error deleting file ID ${file.id}:`, deleteError);
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true,
        message: `Processed ${filesWithMissingKeys.rows.length} files with missing blob keys`,
        results: {
          totalFound: filesWithMissingKeys.rows.length,
          fixed: fixedFiles.length,
          deleted: deletedFiles.length
        },
        fixedFiles: fixedFiles,
        deletedFiles: deletedFiles
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Fix blob keys error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
