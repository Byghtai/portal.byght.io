import { getStore } from "@netlify/blobs";
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
    const filesStore = getStore({ name: 'portal-files', siteID: context.site.id });
    
    try {
      console.log('Starting cleanup of orphaned files...');
      
      // Get all blob keys from blob storage
      const blobs = await filesStore.list();
      const blobKeys = blobs.blobs.map(blob => blob.key);
      console.log(`Found blobs: ${blobKeys.length}`);
      
      // Get all blob keys from database
      const result = await client.query('SELECT blob_key FROM files');
      const dbBlobKeys = result.rows.map(row => row.blob_key);
      console.log(`Found DB entries: ${dbBlobKeys.length}`);
      
      // Find orphaned files (blob keys that are not in the DB)
      const orphanedBlobKeys = blobKeys.filter(key => !dbBlobKeys.includes(key));
      console.log(`Found orphaned files: ${orphanedBlobKeys.length}`);
      
      let deletedCount = 0;
      const errors = [];
      const deletedBlobs = [];
      
      // Delete orphaned files from blob storage
      for (const blobKey of orphanedBlobKeys) {
        try {
          console.log(`Attempting to delete orphaned file: ${blobKey}`);
          
          // Delete blob
          await filesStore.delete(blobKey);
          
          // Wait briefly and check if really deleted
          await new Promise(resolve => setTimeout(resolve, 50));
          
          let stillExists = false;
          try {
            const checkBlob = await filesStore.get(blobKey);
            stillExists = !!checkBlob;
          } catch (e) {
            // Blob not found = successfully deleted
            stillExists = false;
          }
          
          if (!stillExists) {
            deletedCount++;
            deletedBlobs.push(blobKey);
            console.log(`Orphaned file successfully deleted: ${blobKey}`);
          } else {
            // Second attempt
            console.log(`Second deletion attempt for: ${blobKey}`);
            await filesStore.delete(blobKey);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Check again
            try {
              const checkBlob2 = await filesStore.get(blobKey);
              if (!checkBlob2) {
                deletedCount++;
                deletedBlobs.push(blobKey);
                console.log(`Orphaned file deleted on second attempt: ${blobKey}`);
              } else {
                errors.push({ blobKey, error: 'Blob could not be deleted' });
                console.error(`Orphaned file could not be deleted: ${blobKey}`);
              }
            } catch (e) {
              deletedCount++;
              deletedBlobs.push(blobKey);
              console.log(`Orphaned file deleted on second attempt: ${blobKey}`);
            }
          }
        } catch (error) {
          console.error(`Error deleting orphaned file ${blobKey}:`, error);
          errors.push({ blobKey, error: error.message });
        }
      }
      
      console.log(`Cleanup completed. Deleted: ${deletedCount}/${orphanedBlobKeys.length}`);
      
      return new Response(JSON.stringify({ 
        success: true,
        message: `Cleanup completed`,
        summary: {
          totalBlobs: blobKeys.length,
          totalDbFiles: dbBlobKeys.length,
          orphanedBlobs: orphanedBlobKeys.length,
          deletedCount: deletedCount,
          errorCount: errors.length
        },
        deletedBlobs: deletedBlobs,
        errors: errors.length > 0 ? errors : undefined
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Cleanup orphaned files error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
