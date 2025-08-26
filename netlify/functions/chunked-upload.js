import { getStore } from "@netlify/blobs";
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export default async (req, context) => {
  console.log('=== CHUNKED UPLOAD START ===');
  console.log('Method:', req.method);
  
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

    console.log('Auth successful, parsing request...');
    
    // Prüfe Content-Type
    const contentType = req.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    let uploadData;
    
    if (contentType && contentType.includes('application/json')) {
      // JSON Request für Chunk-Daten
      uploadData = await req.json();
      console.log('JSON request received:', {
        action: uploadData.action,
        fileName: uploadData.fileName,
        totalSize: uploadData.totalSize,
        chunkIndex: uploadData.chunkIndex,
        totalChunks: uploadData.totalChunks
      });
    } else {
      // FormData für den ersten Chunk
      const formData = await req.formData();
      const file = formData.get('file');
      const metadata = formData.get('metadata');
      
      if (!file) {
        return new Response(JSON.stringify({ error: 'No file provided' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      uploadData = {
        action: 'init',
        file: file,
        metadata: metadata ? JSON.parse(metadata) : {}
      };
      
      console.log('FormData request received:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
    }
    
    const filesStore = getStore({ name: 'portal-files', siteID: context.site.id });
    
    if (uploadData.action === 'init') {
      // Initialisiere Upload
      const file = uploadData.file;
      const metadata = uploadData.metadata;
      
      // Prüfe Dateigröße
      if (file.size > 100 * 1024 * 1024) { // 100MB Limit
        return new Response(JSON.stringify({ 
          error: 'File too large',
          details: `File size ${file.size} bytes exceeds the 100MB limit`
        }), {
          status: 413,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Erstelle Upload-Session
      const sessionId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const sessionData = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
                 totalChunks: Math.ceil(file.size / (3 * 1024 * 1024)), // 3MB Chunks
        uploadedChunks: 0,
        metadata: metadata,
        createdAt: new Date().toISOString()
      };
      
      await filesStore.set(`session_${sessionId}`, JSON.stringify(sessionData));
      
      console.log('Upload session created:', sessionId, sessionData);
      
      return new Response(JSON.stringify({ 
        success: true,
        sessionId: sessionId,
        totalChunks: sessionData.totalChunks,
                 chunkSize: 3 * 1024 * 1024
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } else if (uploadData.action === 'upload_chunk') {
      // Lade Chunk hoch
      const { sessionId, chunkIndex, chunkData, fileName, totalSize } = uploadData;
      
      // Prüfe Session
      const sessionKey = `session_${sessionId}`;
      const sessionStr = await filesStore.get(sessionKey);
      if (!sessionStr) {
        return new Response(JSON.stringify({ error: 'Upload session not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const session = JSON.parse(sessionStr);
      console.log('Processing chunk:', chunkIndex, 'for session:', sessionId);
      
      // Speichere Chunk
      const chunkKey = `chunk_${sessionId}_${chunkIndex}`;
      const chunkBuffer = Buffer.from(chunkData, 'base64');
      await filesStore.set(chunkKey, chunkBuffer);
      
      // Update Session
      session.uploadedChunks++;
      await filesStore.set(sessionKey, JSON.stringify(session));
      
      console.log(`Chunk ${chunkIndex} uploaded, ${session.uploadedChunks}/${session.totalChunks} complete`);
      
      if (session.uploadedChunks === session.totalChunks) {
        // Alle Chunks hochgeladen - kombiniere Datei
        console.log('All chunks uploaded, combining file...');
        
        const chunks = [];
        let totalSize = 0;
        
        for (let i = 0; i < session.totalChunks; i++) {
          const chunkKey = `chunk_${sessionId}_${i}`;
          const chunk = await filesStore.get(chunkKey, { type: 'arrayBuffer' });
          chunks.push(new Uint8Array(chunk));
          totalSize += chunk.byteLength;
        }
        
        // Kombiniere Chunks
        const combinedBuffer = new Uint8Array(totalSize);
        let offset = 0;
        for (const chunk of chunks) {
          combinedBuffer.set(chunk, offset);
          offset += chunk.length;
        }
        
        // Speichere finale Datei
        const finalKey = `file_${Date.now()}_${session.fileName}`;
        await filesStore.set(finalKey, combinedBuffer);
        
        // Cleanup - lösche Session und Chunks
        await filesStore.delete(sessionKey);
        for (let i = 0; i < session.totalChunks; i++) {
          await filesStore.delete(`chunk_${sessionId}_${i}`);
        }
        
        console.log('File successfully combined and stored:', finalKey);
        
        return new Response(JSON.stringify({ 
          success: true,
          message: 'File upload completed',
          fileKey: finalKey,
          fileName: session.fileName,
          fileSize: totalSize
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // Chunk hochgeladen, aber noch nicht fertig
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Chunk uploaded successfully',
          uploadedChunks: session.uploadedChunks,
          totalChunks: session.totalChunks
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Chunked upload error:', error);
    return new Response(JSON.stringify({ 
      error: 'Chunked upload failed',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
