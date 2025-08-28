import jwt from 'jsonwebtoken';
import { getFileById, hasFileAccess } from './db.js';
import S3Storage from './s3-storage.js';

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
    console.log('Download function called');
    
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
    const useSignedUrl = url.searchParams.get('signed') === 'true';
    
    if (!fileId) {
      return new Response(JSON.stringify({ error: 'File ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Attempting to download file ID: ${fileId} (signed URL: ${useSignedUrl})`);

    // Datei-Metadaten aus der Datenbank abrufen
    const fileMetadata = await getFileById(fileId);
    
    if (!fileMetadata) {
      console.log(`File not found in database: ${fileId}`);
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`File metadata retrieved: ${fileMetadata.filename} (${fileMetadata.size} bytes)`);

    // Prüfen ob Benutzer Zugriff hat
    const hasAccess = await hasFileAccess(decoded.userId, fileId);
    if (!hasAccess && !decoded.isAdmin) {
      console.log(`Access denied for user ${decoded.userId} to file ${fileId}`);
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Access granted for file: ${fileMetadata.blobKey}`);

    // Use signed URL for large files or when specifically requested
    if (useSignedUrl || fileMetadata.size > 50 * 1024 * 1024) { // 50MB threshold
      console.log('Using signed URL for download');
      try {
        const s3Storage = new S3Storage();
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
          details: s3Error.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Direct download for smaller files
    console.log('Using direct download');
    const s3Storage = new S3Storage();
    let fileData;
    
    try {
      fileData = await s3Storage.downloadFile(fileMetadata.blobKey);
      console.log(`File data retrieved from S3: ${fileData.length} bytes`);
    } catch (s3Error) {
      console.error('S3 download error:', s3Error);
      return new Response(JSON.stringify({ 
        error: 'File download failed',
        details: s3Error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!fileData || fileData.length === 0) {
      console.error('No file data received from S3');
      return new Response(JSON.stringify({ error: 'File data not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Datei als Download zurückgeben
    console.log(`Sending file response: ${fileMetadata.filename} (${fileData.length} bytes)`);
    
    return new Response(fileData, {
      status: 200,
      headers: {
        'Content-Type': fileMetadata.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileMetadata.filename}"`,
        'Content-Length': fileData.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
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
