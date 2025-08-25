import { getStore } from "@netlify/blobs";
import jwt from 'jsonwebtoken';
import { getFileById, hasFileAccess } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async (req, context) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
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

    // Datei-Metadaten aus der Datenbank abrufen
    const fileMetadata = await getFileById(fileId);
    
    if (!fileMetadata) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prüfen ob Benutzer Zugriff hat
    const hasAccess = await hasFileAccess(decoded.userId, fileId);
    if (!hasAccess && !decoded.isAdmin) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Datei aus Blob Storage abrufen
    const filesStore = getStore({ name: 'portal-files', siteID: context.site.id });
    const fileBlob = await filesStore.get(fileMetadata.blobKey, { type: 'stream' });
    
    if (!fileBlob) {
      return new Response(JSON.stringify({ error: 'File data not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Datei als Download zurückgeben
    return new Response(fileBlob, {
      status: 200,
      headers: {
        'Content-Type': fileMetadata.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileMetadata.filename}"`,
        'Content-Length': fileMetadata.size
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
