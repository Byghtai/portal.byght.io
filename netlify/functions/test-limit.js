export default async (req, context) => {
  console.log('=== TEST LIMIT START ===');
  console.log('Method:', req.method);
  console.log('Content-Type:', req.headers.get('content-type'));
  console.log('Content-Length:', req.headers.get('content-length'));
  
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
    // Versuche den Body zu lesen
    const bodyText = await req.text();
    const bodySize = bodyText.length;
    
    console.log('Body size:', bodySize, 'bytes');
    console.log('Body size in MB:', (bodySize / (1024 * 1024)).toFixed(2), 'MB');
    
    // Prüfe ob es ein FormData ist
    if (req.headers.get('content-type')?.includes('multipart/form-data')) {
      console.log('Attempting to parse FormData...');
      try {
        const formData = await req.formData();
        console.log('FormData parsed successfully');
        
        const file = formData.get('file');
        if (file) {
          console.log('File found:', {
            name: file.name,
            size: file.size,
            type: file.type
          });
        }
      } catch (formError) {
        console.error('FormData parsing failed:', formError.message);
        return new Response(JSON.stringify({ 
          error: 'FormData parsing failed',
          details: formError.message,
          bodySize: bodySize,
          bodySizeMB: (bodySize / (1024 * 1024)).toFixed(2)
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Request processed successfully',
      bodySize: bodySize,
      bodySizeMB: (bodySize / (1024 * 1024)).toFixed(2),
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Test limit error:', error);
    return new Response(JSON.stringify({ 
      error: 'Request processing failed',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
