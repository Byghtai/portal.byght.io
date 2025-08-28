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
    let s3DeletionSuccess = false;
    let fileExistedBefore = false;
    
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
        
        // Delete file with retry logic
        if (fileExistedBefore) {
          const maxRetries = 3;
          let retryCount = 0;
          
          while (retryCount < maxRetries && !s3DeletionSuccess) {
            retryCount++;
            console.log(`S3 deletion attempt ${retryCount}/${maxRetries} for: ${blobKey}`);
            
            try {
              await s3Storage.deleteFile(blobKey);
              console.log(`S3 file deletion command executed for: ${blobKey}`);
              
              // Wait briefly for deletion to take effect
              await new Promise(resolve => setTimeout(resolve, 200));
              
              // Verify deletion
              try {
                const stillExists = await s3Storage.fileExists(blobKey);
                if (!stillExists) {
                  s3DeletionSuccess = true;
                  console.log(`✅ File successfully deleted from S3: ${blobKey}`);
                } else {
                  console.log(`⚠️ File still exists after deletion attempt ${retryCount}: ${blobKey}`);
                  if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry
                  }
                }
              } catch (verifyError) {
                // If fileExists throws an error, it likely means the file was deleted
                s3DeletionSuccess = true;
                console.log(`✅ File successfully deleted from S3 (verified by error): ${blobKey}`);
              }
            } catch (deleteError) {
              console.error(`Error on S3 deletion attempt ${retryCount}: ${deleteError.message}`);
              if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry
              }
            }
          }
          
          if (!s3DeletionSuccess) {
            console.error(`❌ Failed to delete file from S3 after ${maxRetries} attempts: ${blobKey}`);
          }
        } else {
          // File didn't exist, so mark as "deleted"
          s3DeletionSuccess = true;
          console.log(`ℹ️ File did not exist in S3, no deletion necessary: ${blobKey}`);
        }
        
      } catch (storageError) {
        console.error('Error with S3 storage operations:', storageError);
        // We continue despite storage error, as DB deletion is more important
      }
    } else {
      console.warn(`No blob key found for file ${fileId}`);
      s3DeletionSuccess = true; // No S3 file to delete
    }
    
    // Delete file from database (including all assignments)
    await deleteFile(fileId);
    console.log(`✅ File successfully deleted from database: ${fileId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: s3DeletionSuccess 
        ? 'File and associated storage data successfully deleted' 
        : 'File deleted from database, but S3 storage deletion failed',
      fileDeleted: s3DeletionSuccess,
      blobKey: blobKey,
      fileId: fileId,
      debugInfo: {
        fileExistedBefore: fileExistedBefore,
        s3DeletionSuccess: s3DeletionSuccess,
        blobKey: blobKey
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
