export default async (req, context) => {
  console.log('Simple test function called');
  console.log('Method:', req.method);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      message: 'GET request successful',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Versuche Body als Text zu lesen
    const bodyText = await req.text();
    console.log('Body length:', bodyText.length);
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'POST request processed',
      bodyLength: bodyText.length,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Processing failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
