import { getStore } from "@netlify/blobs";
import jwt from 'jsonwebtoken';
import { saveFileMetadata, assignFileToUsers, assignFileToAllAdmins } from './db.js';

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

  console.log('Upload function called');
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

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
    console.log('Parsing FormData...');
    const formData = await req.formData();
    console.log('FormData parsed successfully');
    
    const file = formData.get('file');
    const usersJson = formData.get('users');
    
    console.log('File from FormData:', file ? {
      name: file.name,
      size: file.size,
      type: file.type
    } : 'No file found');
    console.log('Users JSON from FormData:', usersJson);
    // Labels werden nach dem Upload gesetzt
      const productLabel = null;
  const versionLabel = null;
  const languageLabel = null;
  const confluenceLabel = null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let assignedUsers = [];
    if (usersJson) {
      try {
        assignedUsers = JSON.parse(usersJson);
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid users data' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Eindeutigen Blob-Key generieren (mit sicherer Dateinamen-Behandlung)
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobKey = `${Date.now()}-${safeFileName}`;

    // Datei in Netlify Blobs speichern
    console.log('Storing file in Netlify Blobs...');
    const filesStore = getStore({ name: 'portal-files', siteID: context.site.id });
    console.log('Blob store created, reading file buffer...');
    
    try {
      // Zusätzliche Validierung für ZIP-Dateien
      if (file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')) {
        console.log('Processing ZIP file with enhanced validation...');
        
        // Prüfen ob die ZIP-Datei gültig ist
        try {
          const fileBuffer = await file.arrayBuffer();
          console.log('ZIP file buffer read, size:', fileBuffer.byteLength);
          
          // Prüfen ob die Datei zu groß ist (Netlify hat Limits)
          if (fileBuffer.byteLength > 100 * 1024 * 1024) { // 100MB Limit
            return new Response(JSON.stringify({ 
              error: 'File too large',
              details: `File size ${fileBuffer.byteLength} bytes exceeds the 100MB limit`
            }), {
              status: 413,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Prüfen ZIP-Header (PK\x03\x04)
          const uint8Array = new Uint8Array(fileBuffer);
          if (uint8Array.length >= 4) {
            const header = uint8Array.slice(0, 4);
            const headerString = String.fromCharCode(...header);
            console.log('ZIP header check:', headerString, headerString === 'PK\x03\x04');
            
            if (headerString !== 'PK\x03\x04') {
              console.warn('Warning: File does not have valid ZIP header, but continuing...');
            }
          }
          
          await filesStore.set(blobKey, uint8Array);
          console.log('ZIP file stored in Blobs successfully');
        } catch (zipError) {
          console.error('Error processing ZIP file:', zipError);
          return new Response(JSON.stringify({ 
            error: 'Error processing ZIP file',
            details: zipError.message,
            fileType: file.type,
            fileName: file.name
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } else {
        // Normale Dateiverarbeitung für andere Dateitypen
        const fileBuffer = await file.arrayBuffer();
        console.log('File buffer read, size:', fileBuffer.byteLength);
        
        // Prüfen ob die Datei zu groß ist (Netlify hat Limits)
        if (fileBuffer.byteLength > 100 * 1024 * 1024) { // 100MB Limit
          return new Response(JSON.stringify({ 
            error: 'File too large',
            details: `File size ${fileBuffer.byteLength} bytes exceeds the 100MB limit`
          }), {
            status: 413,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        await filesStore.set(blobKey, new Uint8Array(fileBuffer));
        console.log('File stored in Blobs successfully');
      }
    } catch (bufferError) {
      console.error('Error reading file buffer:', bufferError);
      return new Response(JSON.stringify({ 
        error: 'Error reading file',
        details: bufferError.message,
        fileType: file.type,
        fileName: file.name
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Datei-Metadaten in der Datenbank speichern
    console.log('Saving file metadata to database...');
    const fileId = await saveFileMetadata(
      file.name,
      file.size,
      file.type,
      blobKey,
      decoded.userId,
      productLabel,
      versionLabel,
      languageLabel,
      confluenceLabel
    );
    console.log('File metadata saved, ID:', fileId);

    // Datei automatisch allen Admin-Benutzern zuweisen
    await assignFileToAllAdmins(fileId);

    // Datei-Benutzer-Zuordnungen erstellen (nur wenn Benutzer ausgewählt wurden)
    if (assignedUsers && assignedUsers.length > 0) {
      await assignFileToUsers(fileId, assignedUsers);
    }

    return new Response(JSON.stringify({ 
      success: true,
      file: {
        id: fileId,
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
