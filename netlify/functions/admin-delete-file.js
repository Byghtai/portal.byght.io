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
    
    // Generate presigned delete URL for S3 file deletion
    let s3DeleteUrl = null;
    let fileExistedBefore = false;
    
    if (blobKey) {
      try {
        const s3Storage = new S3Storage();
        console.log(`Preparing presigned delete URL for file: ${blobKey}`);
        
        // Check if file exists before generating delete URL
        try {
          fileExistedBefore = await s3Storage.fileExists(blobKey);
          console.log(`File exists in S3: ${fileExistedBefore}`);
        } catch (e) {
          console.log(`File does not exist in S3: ${blobKey}`);
          fileExistedBefore = false;
        }
        
        // Generate presigned delete URL if file exists
        if (fileExistedBefore) {
          try {
            s3DeleteUrl = await s3Storage.getSignedDeleteUrl(blobKey, 300); // 5 minutes expiry
            console.log(`✅ Generated presigned delete URL for: ${blobKey}`);
          } catch (deleteUrlError) {
            console.error(`Error generating presigned delete URL: ${deleteUrlError.message}`);
          }
        } else {
          console.log(`ℹ️ File does not exist in S3, no delete URL needed: ${blobKey}`);
        }
        
      } catch (storageError) {
        console.error('Error with S3 storage operations:', storageError);
        // We continue despite storage error, as DB deletion is more important
      }
    } else {
      console.warn(`No blob key found for file ${fileId}`);
    }
    
    // Delete file from database (including all assignments)
    await deleteFile(fileId);
    console.log(`✅ File successfully deleted from database: ${fileId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: s3DeleteUrl 
        ? 'File deleted from database. Use presigned URL to delete from S3 storage.' 
        : 'File deleted from database. No S3 storage deletion needed.',
      fileId: fileId,
      blobKey: blobKey,
      s3DeleteUrl: s3DeleteUrl,
      fileExistedInS3: fileExistedBefore,
      instructions: s3DeleteUrl 
        ? 'Use the provided s3DeleteUrl with a DELETE request to remove the file from S3 storage.'
        : null
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
