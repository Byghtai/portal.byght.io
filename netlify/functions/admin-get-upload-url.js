import jwt from 'jsonwebtoken';
import S3Storage from './s3-storage.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

// File size limits
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILE_SIZE_MB = 100;

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log('Get upload URL function called');

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

    // Request body parsen
    const body = await req.json();
    const { filename, fileSize, contentType } = body;

    if (!filename) {
      return new Response(JSON.stringify({ error: 'Filename is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check file size before generating URL
    if (fileSize && fileSize > MAX_FILE_SIZE) {
      const fileSizeMB = Math.round(fileSize / (1024 * 1024) * 100) / 100;
      return new Response(JSON.stringify({ 
        error: 'File too large',
        details: `File size ${fileSizeMB}MB exceeds the ${MAX_FILE_SIZE_MB}MB limit`,
        fileSize: fileSize,
        maxSize: MAX_FILE_SIZE,
        fileSizeMB: fileSizeMB,
        maxSizeMB: MAX_FILE_SIZE_MB
      }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Eindeutigen Blob-Key generieren (mit sicherer Dateinamen-Behandlung)
    const safeFileName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobKey = `${Date.now()}-${Math.random().toString(36).substring(7)}-${safeFileName}`;

    // Presigned Upload URL generieren
    // WICHTIG: Keine ContentType übergeben - das vermeidet Signatur-Mismatches
    const s3Storage = new S3Storage();
    const uploadUrl = await s3Storage.getSignedUploadUrl(
      blobKey,
      900  // URL ist nur 15 Minuten gültig (reduziert Timing-Probleme)
      // Kein contentType - wird nicht signiert
    );

    console.log(`Generated presigned upload URL for file: ${filename}, key: ${blobKey}`);

    return new Response(JSON.stringify({ 
      success: true,
      uploadUrl,
      blobKey,
      uploaderId: decoded.userId,
      expiresIn: 900,  // 15 Minuten
      generatedAt: new Date().toISOString(),  // Server-Zeit für Debugging
      serverTime: Date.now()  // Unix timestamp für Zeitsynchronisation
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  } catch (error) {
    console.error('Get upload URL error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error', 
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
