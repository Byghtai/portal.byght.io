import jwt from 'jsonwebtoken';
import { deleteFile, getFileById } from './db.js';
import S3Storage from './s3-storage.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export default async (req, context) => {
  if (req.method !== 'DELETE') {
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

    const { fileId } = await req.json();

    if (!fileId) {
      return new Response(JSON.stringify({ error: 'File ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Datei-Metadaten abrufen um den Blob-Key zu bekommen
    const fileMetadata = await getFileById(fileId);
    
    if (!fileMetadata) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Store blob key for later deletion
    const blobKey = fileMetadata.blobKey;
    
    console.log(`Starting deletion of file ${fileId} with blob key: ${blobKey}`);
    
    // Delete file from S3 storage (BEFORE DB deletion)
    let fileDeleted = false;
    let fileExistedBefore = false;
    let fileExistsAfter = false;
    
    if (blobKey) {
      try {
        const s3Storage = new S3Storage();
        console.log(`Attempting to delete file from S3: ${blobKey}`);
        
        // Check if file exists before deletion
        try {
          fileExistedBefore = await s3Storage.fileExists(blobKey);
          console.log(`File exists in S3 before deletion: ${fileExistedBefore}`);
        } catch (e) {
          console.log(`File does not exist in S3 before deletion: ${blobKey}`);
          fileExistedBefore = false;
        }
        
        // Delete file - with explicit await and try-catch
        if (fileExistedBefore) {
          try {
            await s3Storage.deleteFile(blobKey);
            console.log(`S3 file deletion command executed for: ${blobKey}`);
          } catch (deleteError) {
            console.error(`Error on first S3 deletion attempt: ${deleteError.message}`);
            // Continue anyway and check
          }
        }
        
        // Only check if file existed before
        if (fileExistedBefore) {
          // Wait briefly for deletion to take effect
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Check if file still exists after deletion
          try {
            fileExistsAfter = await s3Storage.fileExists(blobKey);
            console.log(`File still exists in S3 after deletion: ${fileExistsAfter}`);
            
            // If file still exists, try deleting again
            if (fileExistsAfter) {
              console.log(`Second S3 deletion attempt for stubborn file: ${blobKey}`);
              try {
                await s3Storage.deleteFile(blobKey);
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (deleteError2) {
                console.error(`Error on second S3 deletion attempt: ${deleteError2.message}`);
              }
              
              // Check again
              try {
                fileExistsAfter = await s3Storage.fileExists(blobKey);
                console.log(`File exists in S3 after second deletion attempt: ${fileExistsAfter}`);
              } catch (e) {
                fileExistsAfter = false;
                console.log(`File successfully removed from S3 after second deletion attempt`);
              }
            }
          } catch (e) {
            console.log(`File no longer exists in S3 after deletion: ${blobKey}`);
            fileExistsAfter = false;
          }
          
          fileDeleted = !fileExistsAfter;
        } else {
          // File didn't exist, so mark as "deleted"
          fileDeleted = true;
          console.log(`File did not exist in S3, no deletion necessary`);
        }
        
        console.log(`S3 file deletion status - Existed before: ${fileExistedBefore}, Exists after: ${fileExistsAfter}, Deleted: ${fileDeleted}`);
        
      } catch (storageError) {
        console.error('Error deleting from S3 storage:', storageError);
        // We continue despite storage error, as DB deletion is more important
      }
    } else {
      console.warn(`No blob key found for file ${fileId}`);
    }
    
    // Delete file from database (including all assignments)
    await deleteFile(fileId);
    console.log(`File successfully deleted from database: ${fileId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: fileDeleted 
        ? 'File and associated storage data successfully deleted' 
        : fileExistedBefore 
          ? 'File deleted from database, but storage deletion failed'
          : 'File deleted from database (no storage data present)',
      fileDeleted: fileDeleted,
      blobKey: blobKey,
      fileId: fileId,
      debugInfo: {
        fileExistedBefore: fileExistedBefore,
        fileExistsAfter: fileExistsAfter,
        fileDeleted: fileDeleted
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete file error:', error);
    
    // Spezifische Fehlermeldungen für verschiedene Fehlertypen
    if (error.message === 'File not found') {
      return new Response(JSON.stringify({ error: 'Datei nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      error: 'Server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
