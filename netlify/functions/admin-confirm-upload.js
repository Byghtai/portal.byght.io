import jwt from 'jsonwebtoken';
import { saveFileMetadata, assignFileToUsers, assignFileToAllAdmins } from './db.js';
import S3Storage from './s3-storage.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log('Confirm upload function called');

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
    const { 
      blobKey, 
      filename, 
      fileSize, 
      contentType,
      assignedUsers,
      productLabel,
      versionLabel,
      languageLabel,
      confluenceLabel
    } = body;

    if (!blobKey || !filename || !fileSize) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Überprüfen, ob die Datei tatsächlich in S3 existiert
    const s3Storage = new S3Storage();
    const fileExists = await s3Storage.fileExists(blobKey);
    
    if (!fileExists) {
      console.error(`File not found in S3: ${blobKey}`);
      return new Response(JSON.stringify({ 
        error: 'Upload verification failed',
        details: 'File was not found in storage. Upload may have failed.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`File verified in S3: ${blobKey}`);

    // Datei-Metadaten in der Datenbank speichern
    console.log('Saving file metadata to database...');
    const fileId = await saveFileMetadata(
      filename,
      fileSize,
      contentType || 'application/octet-stream',
      blobKey,
      decoded.userId,
      productLabel || null,
      versionLabel || null,
      languageLabel || null,
      confluenceLabel || null
    );
    console.log('File metadata saved, ID:', fileId);

    // Datei automatisch allen Admin-Benutzern zuweisen
    await assignFileToAllAdmins(fileId);

    // Datei-Benutzer-Zuordnungen erstellen (nur wenn Benutzer ausgewählt wurden)
    if (assignedUsers && assignedUsers.length > 0) {
      await assignFileToUsers(fileId, assignedUsers);
    }

    const fileSizeMB = Math.round(fileSize / (1024 * 1024) * 100) / 100;
    console.log(`✅ Upload confirmed successfully: ${filename} (${fileSizeMB}MB)`);

    return new Response(JSON.stringify({ 
      success: true,
      file: {
        id: fileId,
        filename: filename,
        size: fileSize,
        sizeMB: fileSizeMB,
        mimeType: contentType || 'application/octet-stream',
        uploadedAt: new Date().toISOString()
      }
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
    console.error('Confirm upload error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error', 
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
