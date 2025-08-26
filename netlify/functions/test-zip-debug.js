import { getStore } from "@netlify/blobs";
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export default async (req, context) => {
  console.log('=== ZIP DEBUG FUNCTION START ===');
  console.log('Method:', req.method);
  console.log('Context:', context ? 'Available' : 'Not available');
  
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

    console.log('=== ZIP DEBUG UPLOAD START ===');
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    console.log('Content-Type:', req.headers.get('content-type'));
    
    // FormData parsen mit detailliertem Error Handling
    let formData;
    try {
      console.log('Parsing FormData...');
      
      // Prüfe ob Content-Type korrekt ist
      const contentType = req.headers.get('content-type');
      if (!contentType || !contentType.includes('multipart/form-data')) {
        console.warn('Warning: Content-Type is not multipart/form-data:', contentType);
      }
      
      formData = await req.formData();
      console.log('FormData parsed successfully');
      
      // Log alle FormData Einträge
      console.log('FormData entries:');
      for (const [key, value] of formData.entries()) {
        if (value && typeof value === 'object' && 'name' in value && 'size' in value) {
          console.log(`  ${key}: File(name=${value.name}, size=${value.size}, type=${value.type || 'unknown'})`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }
    } catch (formError) {
      console.error('FormData parsing error:', formError);
      console.error('FormData error stack:', formError.stack);
      return new Response(JSON.stringify({ 
        error: 'FormData parsing failed',
        details: formError.message,
        stack: formError.stack,
        contentType: req.headers.get('content-type')
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const file = formData.get('file');
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const debugInfo = {
      fileName: file.name,
      fileSize: file.size,
      fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
      fileType: file.type,
      lastModified: file.lastModified,
      isZip: file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')
    };

    console.log('File info:', debugInfo);

    // Test 1: Versuche ArrayBuffer zu lesen
    let arrayBufferTest = { success: false, error: null, size: 0 };
    try {
      console.log('Test 1: Reading as ArrayBuffer...');
      
      // Prüfe ob file.arrayBuffer() verfügbar ist
      if (typeof file.arrayBuffer !== 'function') {
        throw new Error('file.arrayBuffer() method not available');
      }
      
      const buffer = await file.arrayBuffer();
      arrayBufferTest.success = true;
      arrayBufferTest.size = buffer.byteLength;
      console.log('ArrayBuffer read successful, size:', buffer.byteLength);
      
      // ZIP Header Analyse
      if (buffer.byteLength >= 4) {
        const uint8Array = new Uint8Array(buffer);
        const header = uint8Array.slice(0, 4);
        const headerHex = Array.from(header).map(b => b.toString(16).padStart(2, '0')).join('');
        arrayBufferTest.headerHex = headerHex;
        arrayBufferTest.isValidZip = headerHex.startsWith('504b');
        console.log('ZIP header:', headerHex, 'Valid:', arrayBufferTest.isValidZip);
      }
    } catch (error) {
      arrayBufferTest.error = error.message;
      console.error('ArrayBuffer read failed:', error);
    }

    // Test 2: Versuche Stream zu lesen
    let streamTest = { success: false, error: null, chunks: 0, totalSize: 0 };
    try {
      console.log('Test 2: Reading as Stream...');
      
      // Prüfe ob file.stream() verfügbar ist
      if (typeof file.stream !== 'function') {
        throw new Error('file.stream() method not available');
      }
      
      const stream = file.stream();
      const reader = stream.getReader();
      const chunks = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        streamTest.chunks++;
        streamTest.totalSize += value.length;
        console.log(`Chunk ${streamTest.chunks}: ${value.length} bytes`);
      }
      
      streamTest.success = true;
      console.log('Stream read successful, chunks:', streamTest.chunks, 'total:', streamTest.totalSize);
    } catch (error) {
      streamTest.error = error.message;
      console.error('Stream read failed:', error);
    }

    // Test 3: Versuche in Netlify Blobs zu speichern (nur wenn < 10MB)
    let blobTest = { success: false, error: null, attempted: false };
    if (file.size < 10 * 1024 * 1024) { // Nur für kleine Dateien testen
      try {
        console.log('Test 3: Storing in Netlify Blobs...');
        blobTest.attempted = true;
        
        // Prüfe ob context.site.id verfügbar ist
        if (!context || !context.site || !context.site.id) {
          throw new Error('Netlify context.site.id not available - are you running locally?');
        }
        
        const filesStore = getStore({ name: 'test-debug', siteID: context.site.id });
        const testKey = `test_${Date.now()}_${file.name}`;
        
        const buffer = await file.arrayBuffer();
        await filesStore.set(testKey, new Uint8Array(buffer));
        
        blobTest.success = true;
        blobTest.key = testKey;
        console.log('Blob storage successful, key:', testKey);
        
        // Cleanup - lösche Test-Blob wieder
        try {
          await filesStore.delete(testKey);
          console.log('Test blob deleted');
        } catch (deleteError) {
          console.error('Could not delete test blob:', deleteError);
        }
      } catch (error) {
        blobTest.error = error.message;
        console.error('Blob storage failed:', error);
      }
    } else {
      blobTest.attempted = false;
      blobTest.reason = 'File too large for test (> 10MB)';
    }

    console.log('=== ZIP DEBUG UPLOAD END ===');

    return new Response(JSON.stringify({ 
      success: true,
      debugInfo,
      tests: {
        arrayBuffer: arrayBufferTest,
        stream: streamTest,
        blobStorage: blobTest
      },
      recommendation: getRecommendation(debugInfo, arrayBufferTest, streamTest, blobTest)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Debug upload error:', error);
    return new Response(JSON.stringify({ 
      error: 'Debug upload failed',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

function getRecommendation(fileInfo, arrayBufferTest, streamTest, blobTest) {
  const recommendations = [];
  
  if (fileInfo.fileSize > 100 * 1024 * 1024) {
    recommendations.push('File exceeds 100MB limit. Consider splitting the archive.');
  }
  
  if (!arrayBufferTest.success && !streamTest.success) {
    recommendations.push('File cannot be read properly. The file might be corrupted.');
  }
  
  if (arrayBufferTest.isValidZip === false) {
    recommendations.push('Invalid ZIP header detected. The file might not be a valid ZIP archive.');
  }
  
  if (blobTest.attempted && !blobTest.success) {
    recommendations.push('Netlify Blobs storage failed. This might be a platform limitation.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('File appears to be valid. If upload still fails, it might be a temporary issue.');
  }
  
  return recommendations;
}
