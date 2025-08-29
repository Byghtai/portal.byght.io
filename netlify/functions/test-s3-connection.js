import S3Storage from './s3-storage.js';

export default async (req, context) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('Testing S3 connection...');
    
    // Initialize S3 storage
    const s3Storage = new S3Storage();
    
    // Test basic connectivity
    await s3Storage.testConnection();
    
    // Test presigned URL generation
    const testKey = `test-${Date.now()}.txt`;
    const presignedUrl = await s3Storage.getSignedUploadUrl(testKey, 60);
    
    // Test if we can list the bucket
    const objects = await s3Storage.listAllObjects();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'S3 connection test successful',
      bucket: s3Storage.bucket,
      region: s3Storage.region,
      presignedUrlGenerated: !!presignedUrl,
      presignedUrlPreview: presignedUrl ? presignedUrl.substring(0, 100) + '...' : null,
      objectCount: objects.length,
      testKey: testKey
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('S3 connection test failed:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'S3 connection test failed',
      details: error.message,
      errorType: error.name,
      stack: error.stack
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
};
