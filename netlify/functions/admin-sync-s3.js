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

    console.log('Starting S3 synchronization...');

    const client = await pool.connect();
    const s3Storage = new S3Storage();
    
    try {
      // Step 1: Get all files from S3
      console.log('Fetching all files from S3...');
      const s3Files = await s3Storage.listAllObjects();
      console.log(`Found ${s3Files.length} files in S3`);

      // Step 2: Get all files from database
      const dbResult = await client.query(
        'SELECT id, blob_key, filename, file_size FROM files'
      );
      const dbFiles = dbResult.rows;
      console.log(`Found ${dbFiles.length} files in database`);

      // Create maps for easier lookup
      const s3Map = new Map(s3Files.map(f => [f.key, f]));
      const dbMap = new Map(dbFiles.map(f => [f.blob_key, f]));

      // Step 3: Find files in S3 but not in database (orphaned S3 files)
      const orphanedS3Files = [];
      for (const s3File of s3Files) {
        if (!dbMap.has(s3File.key)) {
          orphanedS3Files.push(s3File);
        }
      }
      console.log(`Found ${orphanedS3Files.length} orphaned files in S3`);

      // Step 4: Find files in database but not in S3 (missing S3 files)
      const missingS3Files = [];
      for (const dbFile of dbFiles) {
        if (dbFile.blob_key && !s3Map.has(dbFile.blob_key)) {
          missingS3Files.push(dbFile);
        }
      }
      console.log(`Found ${missingS3Files.length} missing files in S3`);

      // Step 5: Update file sizes if they don't match
      const sizeUpdates = [];
      for (const dbFile of dbFiles) {
        if (dbFile.blob_key && s3Map.has(dbFile.blob_key)) {
          const s3File = s3Map.get(dbFile.blob_key);
          if (dbFile.file_size !== s3File.size) {
            sizeUpdates.push({
              id: dbFile.id,
              oldSize: dbFile.file_size,
              newSize: s3File.size,
              filename: dbFile.filename
            });
            // Update the size in database
            await client.query(
              'UPDATE files SET file_size = $1 WHERE id = $2',
              [s3File.size, dbFile.id]
            );
          }
        }
      }
      console.log(`Updated ${sizeUpdates.length} file sizes`);

      // Step 6: Optional - Delete orphaned S3 files (only if requested)
      const deleteOrphaned = req.headers.get('x-delete-orphaned') === 'true';
      let deletedS3Count = 0;
      
      if (deleteOrphaned && orphanedS3Files.length > 0) {
        console.log('Deleting orphaned S3 files...');
        for (const s3File of orphanedS3Files) {
          try {
            await s3Storage.deleteFile(s3File.key);
            deletedS3Count++;
            console.log(`Deleted orphaned S3 file: ${s3File.key}`);
          } catch (error) {
            console.error(`Error deleting S3 file ${s3File.key}:`, error);
          }
        }
      }

      // Step 7: Delete database entries for missing S3 files
      let deletedDbCount = 0;
      for (const dbFile of missingS3Files) {
        try {
          // Delete file assignments first
          await client.query('DELETE FROM file_user_assignments WHERE file_id = $1', [dbFile.id]);
          // Delete the file record
          await client.query('DELETE FROM files WHERE id = $1', [dbFile.id]);
          deletedDbCount++;
          console.log(`Deleted DB entry for missing S3 file: ${dbFile.filename}`);
        } catch (error) {
          console.error(`Error deleting DB entry ${dbFile.id}:`, error);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        summary: {
          totalS3Files: s3Files.length,
          totalDbFiles: dbFiles.length,
          orphanedS3Files: orphanedS3Files.length,
          missingS3Files: missingS3Files.length,
          sizeUpdates: sizeUpdates.length,
          deletedS3Files: deletedS3Count,
          deletedDbEntries: deletedDbCount
        },
        details: {
          orphanedS3Files: orphanedS3Files.map(f => ({
            key: f.key,
            size: f.size,
            lastModified: f.lastModified
          })),
          missingS3Files: missingS3Files.map(f => ({
            id: f.id,
            filename: f.filename,
            blobKey: f.blob_key
          })),
          sizeUpdates
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('S3 sync error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
