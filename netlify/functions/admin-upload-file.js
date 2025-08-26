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
        console.log('File details:', {
          name: file.name,
          size: file.size,
          type: file.type
        });
        
        // Prüfen ob die ZIP-Datei gültig ist
        // Zuerst prüfen wir die Größe ohne die ganze Datei zu laden
        if (file.size > 100 * 1024 * 1024) { // 100MB Limit
          return new Response(JSON.stringify({ 
            error: 'File too large',
            details: `File size ${file.size} bytes exceeds the 100MB limit`
          }), {
            status: 413,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        try {
          console.log('Attempting to read ZIP file as ArrayBuffer...');
          const fileBuffer = await file.arrayBuffer();
          console.log('ZIP file buffer read successfully, size:', fileBuffer.byteLength);
          
          // Prüfen ZIP-Header (verschiedene ZIP-Formate unterstützen)
          const uint8Array = new Uint8Array(fileBuffer);
          if (uint8Array.length >= 4) {
            const header = uint8Array.slice(0, 4);
            const headerHex = Array.from(header).map(b => b.toString(16).padStart(2, '0')).join('');
            console.log('ZIP header hex:', headerHex);
            
            // Verschiedene ZIP-Header-Signaturen prüfen
            const validZipHeaders = [
              '504b0304', // Standard ZIP (PK\x03\x04)
              '504b0506', // Empty ZIP archive (PK\x05\x06)
              '504b0708', // Spanned archive (PK\x07\x08)
              '504b4c49', // ZIP64 (PKLI)
              '504b5370', // Self-extracting archive (PKSp)
              '504b0102', // Central directory header
              '504b0201', // Alternative central directory
              '504b1e03', // ZIP64 end of central directory
              '504b1f06'  // ZIP64 end of central directory locator
            ];
            
            const isValidZip = validZipHeaders.some(validHeader => headerHex.startsWith(validHeader.substring(0, 8)));
            
            if (!isValidZip) {
              console.warn(`Warning: File header ${headerHex} is not a standard ZIP header, but continuing...`);
            } else {
              console.log('Valid ZIP header detected:', headerHex);
            }
          }
          
          console.log('Attempting to store ZIP file in Netlify Blobs...');
          console.log(`Blob key: ${blobKey}, Size: ${uint8Array.byteLength} bytes`);
          
          try {
            await filesStore.set(blobKey, uint8Array);
            console.log('ZIP file stored in Blobs successfully');
          } catch (blobError) {
            console.error('Netlify Blobs storage error:', blobError);
            console.error('Blob Error details:', {
              message: blobError.message,
              code: blobError.code,
              statusCode: blobError.statusCode
            });
            throw blobError;
          }
        } catch (zipError) {
          console.error('Error processing ZIP file:', zipError);
          console.error('ZIP Error Stack:', zipError.stack);
          
          // Versuche trotzdem die Datei zu speichern, falls es nur ein Validierungsproblem ist
          try {
            console.log('Attempting fallback upload for problematic ZIP file...');
            console.log('Using stream-based approach...');
            
            const fallbackBuffer = file.stream();
            const chunks = [];
            const reader = fallbackBuffer.getReader();
            let totalSize = 0;
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
              totalSize += value.length;
              console.log(`Read chunk: ${value.length} bytes, total: ${totalSize} bytes`);
              
              // Sicherheitscheck während des Streamings
              if (totalSize > 100 * 1024 * 1024) {
                throw new Error(`File size exceeds limit during streaming: ${totalSize} bytes`);
              }
            }
            
            console.log(`Stream reading complete: ${chunks.length} chunks, ${totalSize} bytes total`);
            
            const combinedBuffer = new Uint8Array(totalSize);
            let offset = 0;
            for (const chunk of chunks) {
              combinedBuffer.set(chunk, offset);
              offset += chunk.length;
            }
            
            console.log('Attempting to store via fallback method...');
            await filesStore.set(blobKey, combinedBuffer);
            console.log('ZIP file stored via fallback method successfully');
          } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            return new Response(JSON.stringify({ 
              error: 'Error processing ZIP file',
              details: zipError.message,
              fallbackError: fallbackError.message,
              fileType: file.type,
              fileName: file.name,
              fileSize: file.size,
              recommendation: 'The ZIP file might be corrupted or use an unsupported format. Please try re-creating the ZIP archive or contact support.',
              errorId: context.requestId || 'unknown'
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            });
          }
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
