import { getStore } from "@netlify/blobs";
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export default async (req, context) => {
  console.log('=== COMBINE CHUNKS START ===');
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
    
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const filesStore = getStore({ name: 'portal-files', siteID: context.site.id });
    
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
    console.log('Combining chunks for session:', sessionId, session);
    
    // Prüfe ob alle Chunks vorhanden sind
    if (session.uploadedChunks < session.totalChunks) {
      return new Response(JSON.stringify({ 
        error: 'Not all chunks uploaded',
        details: `Uploaded ${session.uploadedChunks}/${session.totalChunks} chunks`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Lade alle Chunks und kombiniere sie
    console.log('Loading and combining chunks...');
    const chunks = [];
    let totalSize = 0;
    
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkKey = `lazy_chunk_${sessionId}_${i}`;
      const chunk = await filesStore.get(chunkKey, { type: 'arrayBuffer' });
      
      if (!chunk) {
        return new Response(JSON.stringify({ 
          error: `Chunk ${i} not found`,
          details: `Missing chunk: ${chunkKey}`
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      chunks.push(new Uint8Array(chunk));
      totalSize += chunk.byteLength;
      console.log(`Loaded chunk ${i}: ${chunk.byteLength} bytes`);
    }
    
    // Kombiniere Chunks
    console.log('Combining chunks into final file...');
    const combinedBuffer = new Uint8Array(totalSize);
    let offset = 0;
    
    for (const chunk of chunks) {
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Speichere finale Datei
    const finalKey = `file_${Date.now()}_${session.fileName}`;
    await filesStore.set(finalKey, combinedBuffer);
    
    console.log('Final file stored:', finalKey, 'Size:', totalSize);
    
    // Cleanup - lösche Session und Chunks
    console.log('Cleaning up session and chunks...');
    await filesStore.delete(sessionKey);
    
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkKey = `lazy_chunk_${sessionId}_${i}`;
      await filesStore.delete(chunkKey);
    }
    
    console.log('Cleanup completed');
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'File successfully combined from chunks',
      fileKey: finalKey,
      fileName: session.fileName,
      fileSize: totalSize,
      originalChunks: session.totalChunks,
      sessionId: sessionId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Combine chunks error:', error);
    return new Response(JSON.stringify({ 
      error: 'Combine chunks failed',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
