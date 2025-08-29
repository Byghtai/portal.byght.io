import jwt from 'jsonwebtoken';
import S3Storage from './s3-storage.js';
import { pool } from './db.js';

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

    const s3Storage = new S3Storage();
    const testResults = {
      connection: false,
      listFiles: false,
      generateUrl: false,
      downloadFile: false,
      errors: []
    };

    // Test 1: Connection and list files
    try {
      console.log('Testing S3 connection and listing files...');
      const files = await s3Storage.listAllObjects();
      testResults.connection = true;
      testResults.listFiles = true;
      testResults.fileCount = files.length;
      testResults.firstFile = files.length > 0 ? files[0] : null;
      console.log(`Found ${files.length} files in S3`);
    } catch (error) {
      testResults.errors.push({
        test: 'listFiles',
        error: error.message,
        details: error.stack
      });
      console.error('List files error:', error);
    }

    // Test 2: Generate presigned URL for first file
    if (testResults.firstFile) {
      try {
        console.log(`Testing presigned URL generation for: ${testResults.firstFile.key}`);
        const signedUrl = await s3Storage.getSignedDownloadUrl(testResults.firstFile.key, 60); // 1 minute expiry
        testResults.generateUrl = true;
        testResults.sampleUrl = signedUrl.substring(0, 100) + '...'; // Truncate for security
        console.log('Presigned URL generated successfully');
      } catch (error) {
        testResults.errors.push({
          test: 'generateUrl',
          error: error.message,
          details: error.stack
        });
        console.error('Generate URL error:', error);
      }

      // Test 3: Try to download file content
      try {
        console.log(`Testing file download for: ${testResults.firstFile.key}`);
        const fileContent = await s3Storage.downloadFile(testResults.firstFile.key);
        testResults.downloadFile = true;
        testResults.downloadedSize = fileContent.length;
        console.log(`File downloaded successfully: ${fileContent.length} bytes`);
      } catch (error) {
        testResults.errors.push({
          test: 'downloadFile',
          error: error.message,
          details: error.stack
        });
        console.error('Download file error:', error);
      }
    }

    // Test 4: Check database files with blob_key
    const client = await pool.connect();
    try {
      const dbResult = await client.query(
        'SELECT COUNT(*) as total, COUNT(blob_key) as with_key FROM files'
      );
      testResults.database = {
        totalFiles: parseInt(dbResult.rows[0].total),
        filesWithKey: parseInt(dbResult.rows[0].with_key),
        filesWithoutKey: parseInt(dbResult.rows[0].total) - parseInt(dbResult.rows[0].with_key)
      };
    } finally {
      client.release();
    }

    // Test 5: Check environment variables
    testResults.environment = {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_IDX,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEYX,
      hasBucket: !!process.env.AWS_S3_BUCKETX,
      hasRegion: !!process.env.AWS_REGIONX,
      region: process.env.AWS_REGIONX || 'not set',
      bucket: process.env.AWS_S3_BUCKETX ? '***' + process.env.AWS_S3_BUCKETX.slice(-4) : 'not set'
    };

    return new Response(JSON.stringify({
      success: true,
      testResults,
      summary: {
        allTestsPassed: testResults.connection && testResults.listFiles && 
                       testResults.generateUrl && testResults.downloadFile,
        errorCount: testResults.errors.length
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Test S3 download error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
