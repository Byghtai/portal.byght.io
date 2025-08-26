import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export default async (req, context) => {
  console.log('=== BASIC FILE TEST START ===');
  console.log('Method:', req.method);
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      message: 'GET request - function is working',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
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

    console.log('Auth successful, parsing FormData...');
    
    // FormData parsen
    const formData = await req.formData();
    console.log('FormData parsed successfully');
    
    // File-Objekt extrahieren
    const file = formData.get('file');
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('File object received:', {
      hasName: 'name' in file,
      hasSize: 'size' in file,
      hasType: 'type' in file,
      hasArrayBuffer: typeof file.arrayBuffer === 'function',
      hasStream: typeof file.stream === 'function',
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Teste verschiedene File-Methoden
    const tests = {
      arrayBuffer: { available: false, success: false, error: null },
      stream: { available: false, success: false, error: null },
      text: { available: false, success: false, error: null }
    };

    // Test 1: arrayBuffer()
    if (typeof file.arrayBuffer === 'function') {
      tests.arrayBuffer.available = true;
      try {
        const buffer = await file.arrayBuffer();
        tests.arrayBuffer.success = true;
        console.log('arrayBuffer() test successful, size:', buffer.byteLength);
      } catch (error) {
        tests.arrayBuffer.error = error.message;
        console.error('arrayBuffer() test failed:', error);
      }
    }

    // Test 2: stream()
    if (typeof file.stream === 'function') {
      tests.stream.available = true;
      try {
        const stream = file.stream();
        const reader = stream.getReader();
        let totalSize = 0;
        let chunks = 0;
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          totalSize += value.length;
          chunks++;
        }
        
        tests.stream.success = true;
        console.log('stream() test successful, chunks:', chunks, 'size:', totalSize);
      } catch (error) {
        tests.stream.error = error.message;
        console.error('stream() test failed:', error);
      }
    }

    // Test 3: text()
    if (typeof file.text === 'function') {
      tests.text.available = true;
      try {
        const text = await file.text();
        tests.text.success = true;
        console.log('text() test successful, length:', text.length);
      } catch (error) {
        tests.text.error = error.message;
        console.error('text() test failed:', error);
      }
    }

    console.log('=== BASIC FILE TEST END ===');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Basic file test completed',
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type
      },
      tests: tests,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Basic file test error:', error);
    return new Response(JSON.stringify({ 
      error: 'Basic file test failed',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
