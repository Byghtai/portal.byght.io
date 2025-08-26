import jwt from 'jsonwebtoken';

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

    console.log('ZIP test upload function called');
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    // Test FormData parsing
    const formData = await req.formData();
    console.log('FormData entries:');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
      } else {
        console.log(`${key}: ${value}`);
      }
    }

    const file = formData.get('file');
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // Spezielle ZIP-Datei-Analyse
    if (file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')) {
      console.log('Analyzing ZIP file...');
      
      try {
        const buffer = await file.arrayBuffer();
        console.log('ZIP file buffer size:', buffer.byteLength);
        
        const uint8Array = new Uint8Array(buffer);
        
        // ZIP-Header-Analyse
        if (uint8Array.length >= 4) {
          const header = uint8Array.slice(0, 4);
          const headerString = String.fromCharCode(...header);
          const headerHex = Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' ');
          
          console.log('ZIP header analysis:');
          console.log('- Header string:', headerString);
          console.log('- Header hex:', headerHex);
          console.log('- Is valid ZIP header:', headerString === 'PK\x03\x04');
          
          // Erste 16 Bytes analysieren
          const first16Bytes = uint8Array.slice(0, 16);
          const first16Hex = Array.from(first16Bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
          console.log('- First 16 bytes hex:', first16Hex);
        }
        
        // Dateiende-Analyse (für ZIP-Dateien mit End-of-Central-Directory)
        if (uint8Array.length >= 22) {
          const endBytes = uint8Array.slice(-22);
          const endHex = Array.from(endBytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
          console.log('- Last 22 bytes hex:', endHex);
          
          // Prüfen auf End-of-Central-Directory Signature (0x06054b50)
          const endSignature = (endBytes[0] << 24) | (endBytes[1] << 16) | (endBytes[2] << 8) | endBytes[3];
          console.log('- End signature:', endSignature.toString(16), endSignature === 0x06054b50);
        }
        
        return new Response(JSON.stringify({ 
          success: true,
          message: 'ZIP file analyzed successfully',
          analysis: {
            fileName: file.name,
            fileSize: buffer.byteLength,
            mimeType: file.type,
            hasValidHeader: uint8Array.length >= 4 ? String.fromCharCode(...uint8Array.slice(0, 4)) === 'PK\x03\x04' : false,
            headerHex: uint8Array.length >= 4 ? Array.from(uint8Array.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' ') : null,
            first16BytesHex: Array.from(uint8Array.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '),
            last22BytesHex: uint8Array.length >= 22 ? Array.from(uint8Array.slice(-22)).map(b => b.toString(16).padStart(2, '0')).join(' ') : null
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        console.error('Error analyzing ZIP file:', error);
        return new Response(JSON.stringify({ 
          error: 'Error analyzing ZIP file',
          details: error.message,
          stack: error.stack
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      // Nicht-ZIP-Datei
      try {
        const buffer = await file.arrayBuffer();
        console.log('Non-ZIP file buffer size:', buffer.byteLength);
        
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Non-ZIP file processed successfully',
          file: {
            name: file.name,
            size: buffer.byteLength,
            type: file.type
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error reading non-ZIP file:', error);
        return new Response(JSON.stringify({ 
          error: 'Error reading file',
          details: error.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

  } catch (error) {
    console.error('ZIP test upload error:', error);
    return new Response(JSON.stringify({ 
      error: 'ZIP test upload failed',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
