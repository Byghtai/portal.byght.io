import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import S3Storage from './s3-storage.js';

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

    console.log('Cleanup orphaned files function called');

    const client = await pool.connect();
    const s3Storage = new S3Storage();
    
    try {
      // Find files with missing or empty blob_key
      const orphanedFilesResult = await client.query(
        'SELECT id, filename, blob_key FROM files WHERE blob_key IS NULL OR blob_key = \'\' OR blob_key = \'null\''
      );
      
      const orphanedFiles = orphanedFilesResult.rows;
      console.log(`Found ${orphanedFiles.length} files with missing blob_key`);
      
      // Find files that exist in database but not in S3
      const allFilesResult = await client.query(
        'SELECT id, filename, blob_key FROM files WHERE blob_key IS NOT NULL AND blob_key != \'\' AND blob_key != \'null\''
      );
      
      const allFiles = allFilesResult.rows;
      const missingS3Files = [];
      
      for (const file of allFiles) {
        try {
          const exists = await s3Storage.fileExists(file.blob_key);
          if (!exists) {
            missingS3Files.push(file);
          }
        } catch (error) {
          console.error(`Error checking S3 file ${file.blob_key}:`, error);
          missingS3Files.push(file);
        }
      }
      
      console.log(`Found ${missingS3Files.length} files missing from S3`);
      
      // Delete orphaned files from database
      const filesToDelete = [...orphanedFiles, ...missingS3Files];
      let deletedCount = 0;
      
      for (const file of filesToDelete) {
        try {
          // Delete file assignments first (due to foreign key constraint)
          await client.query('DELETE FROM file_user_assignments WHERE file_id = $1', [file.id]);
          
          // Delete the file record
          await client.query('DELETE FROM files WHERE id = $1', [file.id]);
          
          deletedCount++;
          console.log(`Deleted orphaned file: ${file.filename} (ID: ${file.id})`);
        } catch (error) {
          console.error(`Error deleting file ${file.id}:`, error);
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: `Cleanup completed successfully`,
        orphanedFilesCount: orphanedFiles.length,
        missingS3FilesCount: missingS3Files.length,
        totalDeleted: deletedCount,
        orphanedFiles: orphanedFiles.map(f => ({ id: f.id, filename: f.filename })),
        missingS3Files: missingS3Files.map(f => ({ id: f.id, filename: f.filename, blobKey: f.blob_key }))
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
