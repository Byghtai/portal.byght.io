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

    // Für Hetzner S3-kompatiblen Storage verwenden wir PATH-STYLE URLs
    // Das vermeidet CORS-Probleme, da alle Requests zum gleichen Host gehen
    // Ergebnis: https://nbg1.your-objectstorage.com/portal-byght-io/key
    this.client = new S3Client({
      endpoint: `https://${this.endpoint}`,
      region: this.region,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
      forcePathStyle: true, // Path-style URLs für bessere CORS-Kompatibilität
    });
    
    // Remove the flexible checksums middleware that adds checksum headers
    // This middleware causes CORS issues with S3-compatible storages
    this.client.middlewareStack.remove('flexibleChecksumsMiddleware');
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

  async getSignedUploadUrl(key, expiresIn = 3600, contentType = null) {
    try {
      if (!key) {
        throw new Error('No S3 key provided for signed upload URL generation');
      }
      
      // Create minimal command - only bucket and key, nothing else!
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key
        // NO ContentType - don't sign it to avoid mismatches
        // NO ChecksumAlgorithm - avoid CORS preflight
      });
      
      // Ensure no automatic checksums are added
      if (command.input) {
        delete command.input.ChecksumAlgorithm;
        delete command.input.ContentType;
      }

      // Generate URL with MINIMAL headers - only what's absolutely necessary
      const url = await getSignedUrl(this.client, command, { 
        expiresIn,
        // Don't sign ANY headers except the absolute minimum
        signableHeaders: new Set([
          'host'
          // That's it! No content-type, no checksums, nothing else
        ]),
        // Exclude all optional headers
        unhoistableHeaders: new Set([
          'x-amz-checksum-algorithm',
          'x-amz-checksum-crc32',
          'x-amz-checksum-crc32c', 
          'x-amz-checksum-sha1',
          'x-amz-checksum-sha256',
          'x-amz-sdk-checksum-algorithm',
          'x-amz-content-sha256',
          'content-type',
          'x-amz-date',
          'x-amz-security-token'
        ])
      });
      
      // Log warning if URL still contains checksum parameters
      if (url.includes('x-amz-checksum') || url.includes('x-amz-sdk-checksum')) {
        console.warn('WARNING: URL still contains checksum parameters that may cause CORS issues');
        console.warn('These parameters should not be present. Check AWS SDK configuration.');
      }
      
      console.log(`Generated signed upload URL for key: ${key}`);
      console.log(`URL structure: ${url.split('?')[0]}`);
      console.log(`URL length: ${url.length} characters`);
      
      // Return the URL as-is - don't modify it or the signature will break
      return url;
    } catch (error) {
      console.error(`Error generating signed upload URL for ${key}:`, error);
      throw error;
    }
  }
}

export default S3Storage;
