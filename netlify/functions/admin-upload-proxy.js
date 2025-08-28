import jwt from 'jsonwebtoken';
import S3Storage from './s3-storage.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

// Stream-based proxy upload to handle large files efficiently
export default async (req, context) => {
  if (req.method !== 'PUT' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log('Proxy upload function called');

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

    // Get blob key from headers
    const blobKey = req.headers.get('x-blob-key');
    const contentType = req.headers.get('content-type') || 'application/octet-stream';
    
    if (!blobKey) {
      return new Response(JSON.stringify({ error: 'Missing blob key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Read file data from request body
    const fileBuffer = await req.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);
    
    console.log(`Proxy uploading file: ${blobKey}, size: ${uint8Array.length} bytes`);

    // Upload to S3 through backend
    const s3Storage = new S3Storage();
    await s3Storage.uploadFile(blobKey, uint8Array, contentType);
    
    console.log(`✅ File uploaded successfully via proxy: ${blobKey}`);

    return new Response(JSON.stringify({ 
      success: true,
      blobKey,
      size: uint8Array.length
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-blob-key'
      }
    });
  } catch (error) {
    console.error('Proxy upload error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error', 
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
