import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3_CONFIG, validateS3Config } from './s3-config.js';

class S3Storage {
  constructor() {
    if (!validateS3Config()) {
      throw new Error('Missing required S3 storage environment variables');
    }

    this.endpoint = S3_CONFIG.endpoint;
    this.accessKeyId = S3_CONFIG.accessKeyId;
    this.secretAccessKey = S3_CONFIG.secretAccessKey;
    this.bucket = S3_CONFIG.bucket;
    this.region = S3_CONFIG.region;

    this.client = new S3Client({
      endpoint: `https://${this.endpoint}`,
      region: this.region,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
      forcePathStyle: false, // Use virtual-hosted-style URLs
    });
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
      console.log(`File uploaded successfully: ${key}`);
      return true;
    } catch (error) {
      console.error(`Error uploading file ${key}:`, error);
      throw error;
    }
  }

  async downloadFile(key) {
    try {
      if (!key) {
        throw new Error('No S3 key provided for download');
      }
      
      console.log(`Attempting to download file from S3: ${key}`);
      
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      
      if (!response.Body) {
        throw new Error('No file data received from S3');
      }
      
      console.log(`File downloaded successfully from S3: ${key}`);
      
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
      
      console.log(`File buffer created successfully: ${key} (${buffer.length} bytes)`);
      return buffer;
      
    } catch (error) {
      console.error(`Error downloading file ${key}:`, error);
      
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
      console.log(`File deleted successfully: ${key}`);
      return true;
    } catch (error) {
      console.error(`Error deleting file ${key}:`, error);
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

      console.log(`Listed ${allObjects.length} objects from S3 bucket`);
      return allObjects;
    } catch (error) {
      console.error('Error listing S3 objects:', error);
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
      console.error(`Error generating signed URL for ${key}:`, error);
      throw error;
    }
  }

  async getSignedUploadUrl(key, contentType = 'application/octet-stream', expiresIn = 3600) {
    try {
      if (!key) {
        throw new Error('No S3 key provided for signed upload URL generation');
      }
      
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      console.log(`Generated signed upload URL for key: ${key}`);
      console.log(`URL: ${url}`);
      return url;
    } catch (error) {
      console.error(`Error generating signed upload URL for ${key}:`, error);
      throw error;
    }
  }
}

export default S3Storage;
