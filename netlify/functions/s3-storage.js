import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
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
      forcePathStyle: true, // Required for S3-compatible storage
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
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      return response.Body;
    } catch (error) {
      console.error(`Error downloading file ${key}:`, error);
      throw error;
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

  async getSignedDownloadUrl(key, expiresIn = 3600) {
    try {
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
}

export default S3Storage;
