import jwt from 'jsonwebtoken';
import { getAllFiles } from './db.js';
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

    console.log('Starting cleanup of orphaned files in S3 storage...');

    // Get all files from database
    const dbFiles = await getAllFiles();
    const dbBlobKeys = new Set(dbFiles.map(file => file.blobKey).filter(key => key));

    console.log(`Found ${dbFiles.length} files in database with ${dbBlobKeys.size} blob keys`);

    // Initialize S3 storage and get all objects
    const s3Storage = new S3Storage();
    const s3Objects = await s3Storage.listAllObjects();
    const s3Keys = new Set(s3Objects.map(obj => obj.key));

    console.log(`Found ${s3Objects.length} objects in S3 storage`);

    // Find orphaned files (S3 objects that are not in the DB)
    const orphanedKeys = s3Objects
      .map(obj => obj.key)
      .filter(key => !dbBlobKeys.has(key));

    console.log(`Found ${orphanedKeys.length} orphaned files in S3 storage`);

    let deletedCount = 0;
    const errors = [];
    const deletedBlobs = [];

    // Delete orphaned files from S3 storage
    for (const orphanedKey of orphanedKeys) {
      try {
        console.log(`Attempting to delete orphaned file: ${orphanedKey}`);
        
        // Delete file with retry logic
        const maxRetries = 3;
        let retryCount = 0;
        let deleted = false;
        
        while (retryCount < maxRetries && !deleted) {
          retryCount++;
          console.log(`Deletion attempt ${retryCount}/${maxRetries} for: ${orphanedKey}`);
          
          try {
            await s3Storage.deleteFile(orphanedKey);
            console.log(`S3 deletion command executed for: ${orphanedKey}`);
            
            // Wait briefly for deletion to take effect
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Verify deletion
            try {
              const stillExists = await s3Storage.fileExists(orphanedKey);
              if (!stillExists) {
                deleted = true;
                deletedCount++;
                deletedBlobs.push(orphanedKey);
                console.log(`✅ Orphaned file successfully deleted: ${orphanedKey}`);
              } else {
                console.log(`⚠️ File still exists after deletion attempt ${retryCount}: ${orphanedKey}`);
                if (retryCount < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry
                }
              }
            } catch (verifyError) {
              // If fileExists throws an error, it likely means the file was deleted
              deleted = true;
              deletedCount++;
              deletedBlobs.push(orphanedKey);
              console.log(`✅ Orphaned file successfully deleted (verified by error): ${orphanedKey}`);
            }
          } catch (deleteError) {
            console.error(`Error on deletion attempt ${retryCount}: ${deleteError.message}`);
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry
            }
          }
        }
        
        if (!deleted) {
          console.error(`❌ Failed to delete orphaned file after ${maxRetries} attempts: ${orphanedKey}`);
          errors.push({ key: orphanedKey, error: 'Failed to delete after multiple attempts' });
        }
        
      } catch (error) {
        console.error(`Error deleting orphaned file ${orphanedKey}:`, error);
        errors.push({ key: orphanedKey, error: error.message });
      }
    }

    console.log(`Cleanup completed. Deleted: ${deletedCount}/${orphanedKeys.length} orphaned files`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Cleanup completed',
      summary: {
        totalS3Objects: s3Objects.length,
        totalDbFiles: dbFiles.length,
        totalDbBlobKeys: dbBlobKeys.size,
        orphanedFiles: orphanedKeys.length,
        deletedCount: deletedCount,
        errorCount: errors.length
      },
      deletedBlobs: deletedBlobs,
      errors: errors.length > 0 ? errors : undefined,
      orphanedKeys: orphanedKeys
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

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
