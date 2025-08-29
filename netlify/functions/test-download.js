import jwt from 'jsonwebtoken';
import { getFileById } from './db.js';
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
    console.log('Test download function called');
    
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

    console.log(`Testing download for file ID: ${fileId}`);

    // Datei-Metadaten aus der Datenbank abrufen
    const fileMetadata = await getFileById(fileId);
    
    if (!fileMetadata) {
      console.log(`File not found in database: ${fileId}`);
      return new Response(JSON.stringify({ error: 'File not found in database' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`File metadata found: ${fileMetadata.filename} (${fileMetadata.size} bytes)`);
    console.log(`Blob key: ${fileMetadata.blobKey || 'NULL/UNDEFINED'}`);

    // Check if blobKey exists
    if (!fileMetadata.blobKey || fileMetadata.blobKey.trim() === '') {
      return new Response(JSON.stringify({ 
        error: 'File storage key not found',
        details: 'The file exists in the database but has no storage key',
        fileId: fileId,
        filename: fileMetadata.filename
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Test S3 connection and file existence
    console.log('Testing S3 connection and file existence...');
    try {
      const s3Storage = new S3Storage();
      
      // Test S3 connection
      await s3Storage.testConnection();
      console.log('S3 connection successful');
      
      // Test if file exists in S3
      const fileExists = await s3Storage.fileExists(fileMetadata.blobKey);
      console.log(`File exists in S3: ${fileExists}`);
      
      if (!fileExists) {
        return new Response(JSON.stringify({ 
          error: 'File not found in S3',
          details: 'The file exists in the database but not in S3 storage',
          fileId: fileId,
          filename: fileMetadata.filename,
          blobKey: fileMetadata.blobKey
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Test presigned URL generation
      console.log('Testing presigned URL generation...');
      const signedUrl = await s3Storage.getSignedDownloadUrl(fileMetadata.blobKey, 3600);
      console.log('Presigned URL generated successfully');
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Download test successful',
        fileInfo: {
          id: fileId,
          filename: fileMetadata.filename,
          size: fileMetadata.size,
          mimeType: fileMetadata.mimeType,
          blobKey: fileMetadata.blobKey
        },
        s3Status: {
          connection: 'OK',
          fileExists: true,
          presignedUrlGenerated: true
        },
        downloadUrl: signedUrl
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (s3Error) {
      console.error('S3 test error:', s3Error);
      return new Response(JSON.stringify({ 
        error: 'S3 test failed',
        details: s3Error.message,
        fileId: fileId,
        filename: fileMetadata.filename,
        blobKey: fileMetadata.blobKey
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Test download error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
