import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * S3 Storage Class - Optimized for Hetzner Object Storage
 * Uses best practices to minimize CORS issues
 */
class S3Storage {
  constructor() {
    // Get configuration from environment
    this.endpoint = process.env.OBJECT_STORAGE_ENDPOINT || 'nbg1.your-objectstorage.com';
    this.accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY;
    this.secretAccessKey = process.env.OBJECT_STORAGE_SECRET_KEY;
    this.bucket = process.env.OBJECT_STORAGE_BUCKET;
    this.region = process.env.OBJECT_STORAGE_REGION || 'nbg1';

    // Validate configuration
    if (!this.accessKeyId || !this.secretAccessKey || !this.bucket) {
      throw new Error('Missing required S3 storage environment variables');
    }

    // Initialize S3 Client - optimized configuration
    this.client = new S3Client({
      endpoint: `https://${this.endpoint}`,
      region: this.region,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey
      },
      // Use path-style URLs for better compatibility with Hetzner
      // Format: https://endpoint/bucket/key
      forcePathStyle: true,
      // Disable features that might not be supported
      disableS3ExpressSessionAuth: true
    });
    
    // Try to remove checksum middleware to prevent CORS issues
    try {
      this.client.middlewareStack.remove('flexibleChecksumsMiddleware');
    } catch (e) {
      // Middleware might not exist in all versions
    }


  }

  async uploadFile(key, data, contentType = 'application/octet-stream') {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      });

      await this.client.send(command);

      return true;
    } catch (error) {

      throw error;
    }
  }

  async downloadFile(key) {
    try {
      if (!key) {
        throw new Error('No S3 key provided for download');
      }
      

      
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      
      if (!response.Body) {
        throw new Error('No file data received from S3');
      }
      

      
      // Convert the readable stream to a buffer for easier handling
      const chunks = [];
      const reader = response.Body.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      // Combine all chunks into a single buffer
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const buffer = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }
      

      return buffer;
      
    } catch (error) {

      
      // Provide more specific error messages
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        throw new Error(`File not found in S3: ${key}`);
      } else if (error.name === 'AccessDenied') {
        throw new Error(`Access denied to file in S3: ${key}`);
      } else if (error.name === 'InvalidAccessKeyId') {
        throw new Error('Invalid S3 access credentials');
      } else if (error.name === 'SignatureDoesNotMatch') {
        throw new Error('S3 signature verification failed');
      } else {
        throw new Error(`S3 download error: ${error.message}`);
      }
    }
  }

  async deleteFile(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);

      return true;
    } catch (error) {

      throw error;
    }
  }

  async fileExists(key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async listAllObjects(prefix = '') {
    try {
      const allObjects = [];
      let continuationToken = undefined;
      
      do {
        const command = new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
          MaxKeys: 1000, // Maximum allowed by S3
        });

        const response = await this.client.send(command);
        
        if (response.Contents) {
          allObjects.push(...response.Contents.map(obj => ({
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
            etag: obj.ETag
          })));
        }
        
        continuationToken = response.NextContinuationToken;
      } while (continuationToken);


      return allObjects;
    } catch (error) {

      throw error;
    }
  }

  async getSignedDownloadUrl(key, expiresIn = 3600) {
    try {
      if (!key) {
        throw new Error('No S3 key provided for signed URL generation');
      }
      
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {

      throw error;
    }
  }

  /**
   * Generate a presigned URL for uploading
   * Best Practice: Keep it as simple as possible to avoid CORS issues
   */
  async getSignedUploadUrl(key, expiresIn = 300) {
    try {
      if (!key) {
        throw new Error('No S3 key provided for signed upload URL generation');
      }
      
      // Create the simplest possible PutObjectCommand
      // DO NOT include ContentType or any other optional parameters
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      // Generate presigned URL with default settings
      // Let AWS SDK handle the minimum required headers
      const url = await getSignedUrl(this.client, command, {
        expiresIn // Default 5 minutes
      });


      
      return url;
    } catch (error) {

      throw error;
    }
  }
}

export default S3Storage;
