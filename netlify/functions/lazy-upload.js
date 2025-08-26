import { getStore } from "@netlify/blobs";
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export default async (req, context) => {
  console.log('=== LAZY UPLOAD START ===');
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
      // JSON Request für Chunk-Daten oder Lazy Loading
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
      // Initialisiere Lazy Upload
      const file = uploadData.file;
      const metadata = uploadData.metadata;
      
      // Prüfe Dateigröße
      if (file.size > 500 * 1024 * 1024) { // 500MB Limit für Lazy Loading
        return new Response(JSON.stringify({ 
          error: 'File too large',
          details: `File size ${file.size} bytes exceeds the 500MB limit`
        }), {
          status: 413,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Erstelle Lazy Upload-Session
      const sessionId = `lazy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const chunkSize = 5 * 1024 * 1024; // 5MB Chunks
      const totalChunks = Math.ceil(file.size / chunkSize);
      
      const sessionData = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        totalChunks: totalChunks,
        chunkSize: chunkSize,
        uploadedChunks: 0,
        chunkKeys: [], // Speichert die Keys der hochgeladenen Chunks
        metadata: metadata,
        createdAt: new Date().toISOString(),
        status: 'uploading'
      };
      
      await filesStore.set(`lazy_session_${sessionId}`, JSON.stringify(sessionData));
      
      console.log('Lazy upload session created:', sessionId, sessionData);
      
      return new Response(JSON.stringify({ 
        success: true,
        sessionId: sessionId,
        totalChunks: totalChunks,
        chunkSize: chunkSize,
        message: 'Lazy upload session initialized. Upload chunks as needed.'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } else if (uploadData.action === 'upload_chunk') {
      // Lade spezifischen Chunk hoch
      const { sessionId, chunkIndex, chunkData, fileName, totalSize } = uploadData;
      
      // Prüfe Session
      const sessionKey = `lazy_session_${sessionId}`;
      const sessionStr = await filesStore.get(sessionKey);
      if (!sessionStr) {
        return new Response(JSON.stringify({ error: 'Lazy upload session not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const session = JSON.parse(sessionStr);
      console.log('Processing chunk:', chunkIndex, 'for lazy session:', sessionId);
      
      // Speichere Chunk
      const chunkKey = `lazy_chunk_${sessionId}_${chunkIndex}`;
      const chunkBuffer = Buffer.from(chunkData, 'base64');
      await filesStore.set(chunkKey, chunkBuffer);
      
      // Update Session
      if (!session.chunkKeys.includes(chunkKey)) {
        session.chunkKeys.push(chunkKey);
        session.uploadedChunks = session.chunkKeys.length;
      }
      
      await filesStore.set(sessionKey, JSON.stringify(session));
      
      console.log(`Chunk ${chunkIndex} uploaded, ${session.uploadedChunks}/${session.totalChunks} complete`);
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Chunk uploaded successfully',
        uploadedChunks: session.uploadedChunks,
        totalChunks: session.totalChunks,
        chunkKey: chunkKey
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } else if (uploadData.action === 'get_chunk') {
      // Lazy Loading: Lade spezifischen Chunk nach
      const { sessionId, chunkIndex } = uploadData;
      
      // Prüfe Session
      const sessionKey = `lazy_session_${sessionId}`;
      const sessionStr = await filesStore.get(sessionKey);
      if (!sessionStr) {
        return new Response(JSON.stringify({ error: 'Lazy upload session not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const session = JSON.parse(sessionStr);
      const chunkKey = `lazy_chunk_${sessionId}_${chunkIndex}`;
      
      // Prüfe ob Chunk existiert
      const chunk = await filesStore.get(chunkKey);
      if (!chunk) {
        return new Response(JSON.stringify({ 
          error: 'Chunk not found',
          details: `Chunk ${chunkIndex} has not been uploaded yet`
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Konvertiere zu base64 für Übertragung
      const chunkArrayBuffer = await chunk.arrayBuffer();
      const chunkBase64 = Buffer.from(chunkArrayBuffer).toString('base64');
      
      return new Response(JSON.stringify({ 
        success: true,
        chunkData: chunkBase64,
        chunkIndex: chunkIndex,
        chunkSize: chunkArrayBuffer.byteLength
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } else if (uploadData.action === 'get_session_info') {
      // Hole Session-Informationen
      const { sessionId } = uploadData;
      
      const sessionKey = `lazy_session_${sessionId}`;
      const sessionStr = await filesStore.get(sessionKey);
      if (!sessionStr) {
        return new Response(JSON.stringify({ error: 'Lazy upload session not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const session = JSON.parse(sessionStr);
      
      return new Response(JSON.stringify({ 
        success: true,
        session: {
          fileName: session.fileName,
          fileSize: session.fileSize,
          fileType: session.fileType,
          totalChunks: session.totalChunks,
          uploadedChunks: session.uploadedChunks,
          chunkSize: session.chunkSize,
          status: session.status,
          createdAt: session.createdAt
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } else if (uploadData.action === 'complete_session') {
      // Markiere Session als vollständig
      const { sessionId } = uploadData;
      
      const sessionKey = `lazy_session_${sessionId}`;
      const sessionStr = await filesStore.get(sessionKey);
      if (!sessionStr) {
        return new Response(JSON.stringify({ error: 'Lazy upload session not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const session = JSON.parse(sessionStr);
      session.status = 'completed';
      session.completedAt = new Date().toISOString();
      
      await filesStore.set(sessionKey, JSON.stringify(session));
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Session marked as completed',
        sessionId: sessionId,
        totalChunks: session.totalChunks,
        uploadedChunks: session.uploadedChunks
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Lazy upload error:', error);
    return new Response(JSON.stringify({ 
      error: 'Lazy upload failed',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
