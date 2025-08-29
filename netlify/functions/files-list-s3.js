import jwt from 'jsonwebtoken';
import { getFilesForUser } from './db.js';
import S3Storage from './s3-storage.js';
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
    // Token verifizieren
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

    // Check if we should sync with S3 (optional parameter)
    const url = new URL(req.url);
    const syncWithS3 = url.searchParams.get('sync') === 'true';

    if (syncWithS3) {
      console.log('Syncing files with S3...');
      
      const s3Storage = new S3Storage();
      const client = await pool.connect();
      
      try {
        // Get all files from S3
        const s3Files = await s3Storage.listAllObjects();
        console.log(`Found ${s3Files.length} files in S3`);
        
        // Get all files from database
        const dbResult = await client.query(
          'SELECT blob_key, id FROM files WHERE blob_key IS NOT NULL'
        );
        const dbBlobKeys = new Set(dbResult.rows.map(r => r.blob_key));
        
        // Find files in S3 but not in database
        const newS3Files = s3Files.filter(f => !dbBlobKeys.has(f.key));
        
        if (newS3Files.length > 0) {
          console.log(`Found ${newS3Files.length} new files in S3 to add to database`);
          
          // Add new S3 files to database
          for (const s3File of newS3Files) {
            try {
              // Extract filename from S3 key (last part after /)
              const filename = s3File.key.split('/').pop() || s3File.key;
              
              // Insert into database
              const insertResult = await client.query(
                `INSERT INTO files (filename, file_size, mime_type, uploaded_at, blob_key)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id`,
                [
                  filename,
                  s3File.size,
                  'application/octet-stream', // Default mime type
                  s3File.lastModified || new Date(),
                  s3File.key
                ]
              );
              
              const fileId = insertResult.rows[0].id;
              console.log(`Added S3 file to database: ${filename} (ID: ${fileId})`);
              
              // If user is admin, file is automatically accessible
              // For regular users, admin needs to assign files manually
              if (decoded.isAdmin) {
                // Admin gets automatic access to all files
                await client.query(
                  'INSERT INTO file_user_assignments (file_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                  [fileId, decoded.userId]
                );
              }
            } catch (error) {
              console.error(`Error adding S3 file ${s3File.key} to database:`, error);
            }
          }
        }
        
        // Remove database entries for files not in S3
        const dbFiles = await client.query(
          'SELECT id, blob_key, filename FROM files WHERE blob_key IS NOT NULL'
        );
        
        const s3Keys = new Set(s3Files.map(f => f.key));
        const missingFiles = dbFiles.rows.filter(f => !s3Keys.has(f.blob_key));
        
        if (missingFiles.length > 0) {
          console.log(`Found ${missingFiles.length} database entries with missing S3 files`);
          
          for (const file of missingFiles) {
            try {
              // Delete file assignments first
              await client.query('DELETE FROM file_user_assignments WHERE file_id = $1', [file.id]);
              // Delete the file record
              await client.query('DELETE FROM files WHERE id = $1', [file.id]);
              console.log(`Removed database entry for missing S3 file: ${file.filename}`);
            } catch (error) {
              console.error(`Error removing database entry ${file.id}:`, error);
            }
          }
        }
      } finally {
        client.release();
      }
    }

    // Get files for user (from database, now synced with S3 if requested)
    const userFiles = await getFilesForUser(decoded.userId);

    // If sync was requested, add sync info to response
    const response = {
      files: userFiles
    };
    
    if (syncWithS3) {
      response.synced = true;
      response.syncTime = new Date().toISOString();
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Files list error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
