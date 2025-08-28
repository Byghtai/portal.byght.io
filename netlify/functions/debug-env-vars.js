// Debug function to check environment variables
export default async (req, context) => {
  const envVars = {
    OBJECT_STORAGE_ENDPOINT: process.env.OBJECT_STORAGE_ENDPOINT || 'NOT_SET',
    OBJECT_STORAGE_ACCESS_KEY: process.env.OBJECT_STORAGE_ACCESS_KEY ? 'SET (hidden)' : 'NOT_SET',
    OBJECT_STORAGE_SECRET_KEY: process.env.OBJECT_STORAGE_SECRET_KEY ? 'SET (hidden)' : 'NOT_SET',
    OBJECT_STORAGE_BUCKET: process.env.OBJECT_STORAGE_BUCKET || 'NOT_SET',
    OBJECT_STORAGE_REGION: process.env.OBJECT_STORAGE_REGION || 'NOT_SET'
  };

  return new Response(JSON.stringify({
    message: 'Environment Variables Check',
    variables: envVars,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
