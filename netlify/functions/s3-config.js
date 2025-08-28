// S3 Storage Configuration
export const S3_CONFIG = {
  endpoint: process.env.OBJECT_STORAGE_ENDPOINT || 'nbg1.your-objectstorage.com',
  accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY,
  secretAccessKey: process.env.OBJECT_STORAGE_SECRET_KEY,
  bucket: process.env.OBJECT_STORAGE_BUCKET,
  region: process.env.OBJECT_STORAGE_REGION || 'nbg1',
};

// Validate S3 configuration
export function validateS3Config() {
  const requiredVars = ['accessKeyId', 'secretAccessKey', 'bucket'];
  const missingVars = requiredVars.filter(varName => !S3_CONFIG[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`Missing S3 configuration variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
}

// Check if S3 storage is properly configured
export function isS3Configured() {
  return validateS3Config();
}
