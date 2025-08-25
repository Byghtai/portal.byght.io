import { getStore } from "@netlify/blobs";
import jwt from 'jsonwebtoken';
import { saveFileMetadata, assignFileToUsers } from './db.js';

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

    // Multipart Form Data parsen
    const formData = await req.formData();
    const file = formData.get('file');
    const usersJson = formData.get('users');
    const description = formData.get('description') || '';

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let assignedUsers = [];
    try {
      assignedUsers = JSON.parse(usersJson);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid users data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Eindeutigen Blob-Key generieren
    const blobKey = `${Date.now()}-${file.name}`;

    // Datei in Netlify Blobs speichern
    const filesStore = getStore({ name: 'portal-files', siteID: context.site.id });
    const fileBuffer = await file.arrayBuffer();
    await filesStore.set(blobKey, new Uint8Array(fileBuffer));

    // Datei-Metadaten in der Datenbank speichern
    const fileId = await saveFileMetadata(
      file.name,
      file.size,
      file.type,
      description,
      blobKey,
      decoded.userId
    );

    // Datei-Benutzer-Zuordnungen erstellen
    await assignFileToUsers(fileId, assignedUsers);

    return new Response(JSON.stringify({ 
      success: true,
      file: {
        id: fileId,
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        description,
        uploadedAt: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
