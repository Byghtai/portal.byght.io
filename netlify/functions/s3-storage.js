import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * S3 Storage Class - Optimized for Amazon AWS S3
 * Uses AWS S3 best practices and features
 */
class S3Storage {
  constructor() {
    // Get configuration from environment
    this.accessKeyId = process.env.AWS_ACCESS_KEY_IDX;
    this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEYX;
    this.bucket = process.env.AWS_S3_BUCKETX;
    this.region = process.env.AWS_REGIONX || 'eu-central-1';

    // Validate configuration without exposing sensitive data
    if (!this.accessKeyId || !this.secretAccessKey || !this.bucket) {
      const missingVars = [];
      if (!this.accessKeyId) missingVars.push('AWS access key');
      if (!this.secretAccessKey) missingVars.push('AWS secret key');
      if (!this.bucket) missingVars.push('S3 bucket name');
      
      throw new Error(`Missing required AWS S3 environment variables: ${missingVars.join(', ')}`);
    }

    // Initialize S3 Client - optimized for AWS S3
    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey
      },
      // AWS S3 supports virtual-hosted style URLs (default)
      // Format: https://bucket-name.s3.region.amazonaws.com/key
      // This is more efficient and recommended for AWS S3
    });
  }

  async uploadFile(key, data, contentType = 'application/octet-stream') {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        // AWS S3 specific optimizations
        ServerSideEncryption: 'AES256', // Enable encryption
        CacheControl: 'no-cache', // Prevent caching for sensitive files
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      console.error('S3 upload error:', error);
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
      console.error('S3 download error:', error);
      
      // Provide more specific error messages
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        throw new Error(`File not found in S3: ${key}`);
      } else if (error.name === 'AccessDenied') {
        throw new Error(`Access denied to file in S3: ${key}`);
      } else if (error.name === 'InvalidAccessKeyId') {
        throw new Error('Invalid AWS S3 access credentials');
      } else if (error.name === 'SignatureDoesNotMatch') {
        throw new Error('AWS S3 signature verification failed');
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
      console.error('S3 delete error:', error);
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
      console.error('S3 list objects error:', error);
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
      console.error('S3 signed download URL error:', error);
      throw error;
    }
  }

  /**
   * Generate a presigned URL for uploading
   * Optimized for AWS S3 with better CORS support
   */
  async getSignedUploadUrl(key, expiresIn = 300) {
    try {
      if (!key) {
        throw new Error('No S3 key provided for signed upload URL generation');
      }
      
      // AWS S3 supports more options in presigned URLs
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        // Remove ServerSideEncryption and CacheControl from presigned URL
        // These can cause issues with direct browser uploads
        // They will be set by the client during upload if needed
      });

      // Generate presigned URL
      const url = await getSignedUrl(this.client, command, {
        expiresIn
      });

      return url;
    } catch (error) {
      console.error('S3 signed upload URL error:', error);
      
      // Provide more specific error messages for debugging
      if (error.name === 'InvalidAccessKeyId') {
        throw new Error('Invalid AWS access key ID - check AWS access key environment variable');
      } else if (error.name === 'SignatureDoesNotMatch') {
        throw new Error('AWS signature verification failed - check AWS secret key environment variable');
      } else if (error.name === 'NoSuchBucket') {
        throw new Error('S3 bucket not found - check S3 bucket name environment variable');
      } else if (error.name === 'AccessDenied') {
        throw new Error('Access denied to S3 bucket - check IAM permissions');
      } else {
        throw new Error(`S3 presigned URL generation failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate a presigned URL for deleting files
   * Allows secure file deletion through presigned URLs
   */
  async getSignedDeleteUrl(key, expiresIn = 300) {
    try {
      if (!key) {
        throw new Error('No S3 key provided for signed delete URL generation');
      }
      
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      // Generate presigned URL for DELETE operation
      const url = await getSignedUrl(this.client, command, {
        expiresIn
      });

      return url;
    } catch (error) {
      console.error('S3 signed delete URL error:', error);
      
      // Provide more specific error messages for debugging
      if (error.name === 'InvalidAccessKeyId') {
        throw new Error('Invalid AWS access key ID - check AWS access key environment variable');
      } else if (error.name === 'SignatureDoesNotMatch') {
        throw new Error('AWS signature verification failed - check AWS secret key environment variable');
      } else if (error.name === 'NoSuchBucket') {
        throw new Error('S3 bucket not found - check S3 bucket name environment variable');
      } else if (error.name === 'AccessDenied') {
        throw new Error('Access denied to S3 bucket - check IAM permissions');
      } else {
        throw new Error(`S3 presigned delete URL generation failed: ${error.message}`);
      }
    }
  }

  /**
   * Test S3 connectivity and permissions
   */
  async testConnection() {
    try {
      // Try to list objects (requires s3:ListBucket permission)
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        MaxKeys: 1
      });
      
      await this.client.send(command);
      return true;
    } catch (error) {
      console.error('S3 connection test failed:', error);
      throw error;
    }
  }
}

export default S3Storage;
