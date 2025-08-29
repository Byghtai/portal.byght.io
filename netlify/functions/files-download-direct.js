import jwt from 'jsonwebtoken';
import { getFileById, hasFileAccess } from './db.js';
import S3Storage from './s3-storage.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

/**
 * Direct download function that streams file from S3 through the server
 * Better for smaller files and avoiding CORS issues
 */
export default async (req, context) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('Direct download function called');
    
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

    // Check if blobKey exists
    if (!fileMetadata.blobKey || fileMetadata.blobKey.trim() === '') {
      console.error(`No blob key found for file: ${fileId}`);
      return new Response(JSON.stringify({ 
        error: 'File storage key not found',
        details: 'The file exists in the database but has no storage key.'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check file size - use presigned URL for large files
    const MAX_DIRECT_DOWNLOAD_SIZE = 10 * 1024 * 1024; // 10MB
    
    if (fileMetadata.size > MAX_DIRECT_DOWNLOAD_SIZE) {
      // For large files, return presigned URL instead
      console.log(`File too large for direct download (${fileMetadata.size} bytes), generating presigned URL`);
      
      const s3Storage = new S3Storage();
      const signedUrl = await s3Storage.getSignedDownloadUrl(fileMetadata.blobKey, 3600);
      
      return new Response(JSON.stringify({
        downloadUrl: signedUrl,
        filename: fileMetadata.filename,
        size: fileMetadata.size,
        mimeType: fileMetadata.mimeType,
        method: 'presigned'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Direct download for smaller files
    console.log(`Direct downloading file from S3: ${fileMetadata.blobKey}`);
    
    try {
      const s3Storage = new S3Storage();
      const fileData = await s3Storage.downloadFile(fileMetadata.blobKey);
      
      console.log(`File downloaded from S3: ${fileData.length} bytes`);
      
      // Determine content type
      const contentType = fileMetadata.mimeType || 'application/octet-stream';
      
      // Return file directly with appropriate headers
      return new Response(fileData, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileMetadata.filename}"`,
          'Content-Length': fileData.length.toString(),
          'Cache-Control': 'private, max-age=3600',
          'X-Download-Method': 'direct'
        }
      });
      
    } catch (s3Error) {
      console.error('Error downloading from S3:', s3Error);
      
      // Fallback to presigned URL if direct download fails
      console.log('Falling back to presigned URL due to direct download error');
      
      try {
        const s3Storage = new S3Storage();
        const signedUrl = await s3Storage.getSignedDownloadUrl(fileMetadata.blobKey, 3600);
        
        return new Response(JSON.stringify({
          downloadUrl: signedUrl,
          filename: fileMetadata.filename,
          size: fileMetadata.size,
          mimeType: fileMetadata.mimeType,
          method: 'presigned-fallback'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (fallbackError) {
        console.error('Fallback to presigned URL also failed:', fallbackError);
        return new Response(JSON.stringify({ 
          error: 'Failed to download file',
          details: s3Error.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
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
