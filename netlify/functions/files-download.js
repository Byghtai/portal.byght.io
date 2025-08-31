import jwt from 'jsonwebtoken';
import { getFileById, hasFileAccess } from './db.js';
import S3Storage from './s3-storage.js';

const JWT_SECRET = process.env.JWT_SECRET;

export default async (req, context) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('Download function called');
    
    // JWT_SECRET prüfen
    if (!JWT_SECRET) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
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
      console.log(`User authenticated: ${decoded.userId} (Admin: ${decoded.isAdmin})`);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // File ID aus Query-Parametern abrufen
    const url = new URL(req.url);
    const fileId = url.searchParams.get('fileId');
    
    if (!fileId) {
      return new Response(JSON.stringify({ error: 'File ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Attempting to download file ID: ${fileId}`);

    // Datei-Metadaten aus der Datenbank abrufen
    let fileMetadata;
    try {
      fileMetadata = await getFileById(fileId);
    } catch (dbError) {
      console.error('Database error:', dbError);
      return new Response(JSON.stringify({ 
        error: 'Database connection failed',
        details: dbError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!fileMetadata) {
      console.log(`File not found in database: ${fileId}`);
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`File metadata retrieved: ${fileMetadata.filename} (${fileMetadata.size} bytes)`);
    console.log(`Blob key: ${fileMetadata.blobKey || 'NULL/UNDEFINED'}`);

    // Prüfen ob Benutzer Zugriff hat
    let hasAccess;
    try {
      hasAccess = await hasFileAccess(decoded.userId, fileId);
    } catch (accessError) {
      console.error('Access check error:', accessError);
      return new Response(JSON.stringify({ 
        error: 'Access check failed',
        details: accessError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!hasAccess && !decoded.isAdmin) {
      console.log(`Access denied for user ${decoded.userId} to file ${fileId}`);
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Access granted for file: ${fileMetadata.blobKey}`);

    // Check if blobKey exists and is not empty
    if (!fileMetadata.blobKey || fileMetadata.blobKey.trim() === '') {
      console.error(`No blob key found for file: ${fileId} (filename: ${fileMetadata.filename})`);
      console.error(`File metadata:`, JSON.stringify(fileMetadata, null, 2));
      return new Response(JSON.stringify({ 
        error: 'File storage key not found',
        details: 'The file exists in the database but has no storage key. This may indicate a problem during file upload.',
        fileId: fileId,
        filename: fileMetadata.filename
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Always use presigned URL for download
    console.log('Generating presigned download URL');
    try {
      const s3Storage = new S3Storage();
      
      // Test S3 connection first
      try {
        await s3Storage.testConnection();
        console.log('S3 connection test successful');
      } catch (connectionError) {
        console.error('S3 connection test failed:', connectionError);
        return new Response(JSON.stringify({ 
          error: 'S3 connection failed',
          details: connectionError.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const signedUrl = await s3Storage.getSignedDownloadUrl(fileMetadata.blobKey, 3600); // 1 hour expiry
      
      return new Response(JSON.stringify({
        downloadUrl: signedUrl,
        filename: fileMetadata.filename,
        size: fileMetadata.size,
        mimeType: fileMetadata.mimeType
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (s3Error) {
      console.error('Error generating signed URL:', s3Error);
      return new Response(JSON.stringify({ 
        error: 'Failed to generate download link',
        details: s3Error.message,
        blobKey: fileMetadata.blobKey
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Download error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
