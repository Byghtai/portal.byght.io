import jwt from 'jsonwebtoken';
import { getFileById, hasFileAccess } from './db.js';
import S3Storage from './s3-storage.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

/**
 * Best Practice S3 Download Implementation
 * Verwendet ausschließlich Presigned URLs für sichere, direkte Downloads
 */
export default async (req, context) => {
  // Nur GET-Methode erlauben
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    // 1. Token-Verifizierung
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const token = authHeader.substring(7);
    let decoded;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log(`User authenticated: ${decoded.userId} (Admin: ${decoded.isAdmin})`);
    } catch (error) {
      console.error('Token verification failed:', error);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 2. File ID aus Query-Parametern
    const url = new URL(req.url);
    const fileId = url.searchParams.get('fileId');
    
    if (!fileId) {
      return new Response(JSON.stringify({ error: 'File ID required' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    console.log(`Download request for file ID: ${fileId}`);

    // 3. Datei-Metadaten aus Datenbank abrufen
    const fileMetadata = await getFileById(fileId);
    
    if (!fileMetadata) {
      console.error(`File not found in database: ${fileId}`);
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    console.log(`File found: ${fileMetadata.filename} (blob_key: ${fileMetadata.blobKey})`);

    // 4. Zugriffsberechtigungen prüfen
    const hasAccess = await hasFileAccess(decoded.userId, fileId);
    if (!hasAccess && !decoded.isAdmin) {
      console.error(`Access denied for user ${decoded.userId} to file ${fileId}`);
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 5. Blob Key validieren
    if (!fileMetadata.blobKey || fileMetadata.blobKey.trim() === '') {
      console.error(`Missing blob_key for file ${fileId}: ${fileMetadata.filename}`);
      return new Response(JSON.stringify({ 
        error: 'File not available',
        details: 'File metadata incomplete. Please contact administrator.',
        fileId: fileId,
        filename: fileMetadata.filename
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 6. S3 Storage initialisieren und Presigned URL generieren
    try {
      const s3Storage = new S3Storage();
      
      // Prüfen ob Datei in S3 existiert
      const fileExists = await s3Storage.fileExists(fileMetadata.blobKey);
      if (!fileExists) {
        console.error(`File not found in S3: ${fileMetadata.blobKey}`);
        return new Response(JSON.stringify({ 
          error: 'File not found in storage',
          details: 'The file exists in database but not in storage. Please contact administrator.',
          fileId: fileId,
          filename: fileMetadata.filename
        }), {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // Presigned URL mit 1 Stunde Gültigkeit generieren
      const expiresIn = 3600; // 1 hour
      const downloadUrl = await s3Storage.getSignedDownloadUrl(fileMetadata.blobKey, expiresIn);
      
      console.log(`Presigned URL generated for file: ${fileMetadata.filename}`);
      
      // 7. Response mit Download-URL
      return new Response(JSON.stringify({
        success: true,
        downloadUrl: downloadUrl,
        filename: fileMetadata.filename,
        size: fileMetadata.size,
        mimeType: fileMetadata.mimeType || 'application/octet-stream',
        expiresIn: expiresIn,
        method: 'presigned-url'
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        }
      });
      
    } catch (s3Error) {
      console.error('S3 operation failed:', s3Error);
      console.error('Error details:', {
        message: s3Error.message,
        name: s3Error.name,
        code: s3Error.code,
        statusCode: s3Error.$metadata?.httpStatusCode
      });
      
      // Detaillierte Fehlerbehandlung
      let errorMessage = 'Failed to generate download link';
      let statusCode = 500;
      
      if (s3Error.name === 'NoSuchKey' || s3Error.$metadata?.httpStatusCode === 404) {
        errorMessage = 'File not found in storage';
        statusCode = 404;
      } else if (s3Error.name === 'AccessDenied' || s3Error.$metadata?.httpStatusCode === 403) {
        errorMessage = 'Storage access denied';
        statusCode = 403;
      } else if (s3Error.name === 'InvalidAccessKeyId' || s3Error.name === 'SignatureDoesNotMatch') {
        errorMessage = 'Storage configuration error';
        statusCode = 500;
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage,
        details: s3Error.message,
        fileId: fileId,
        filename: fileMetadata.filename
      }), {
        status: statusCode,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
  } catch (error) {
    console.error('Unexpected error in download function:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error',
      details: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
