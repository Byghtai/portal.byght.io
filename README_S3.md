# S3 Storage Setup

## Environment Variables

Add these to your Netlify environment:

```env
OBJECT_STORAGE_ENDPOINT=nbg1.your-objectstorage.com
OBJECT_STORAGE_ACCESS_KEY=your_access_key
OBJECT_STORAGE_SECRET_KEY=your_secret_key
OBJECT_STORAGE_BUCKET=your_bucket_name
OBJECT_STORAGE_REGION=nbg1
```

## CORS Configuration

Apply `CORS.json` to your S3 bucket:

```bash
aws s3api put-bucket-cors \
  --bucket your-bucket-name \
  --endpoint-url=https://nbg1.your-objectstorage.com \
  --cors-configuration file://CORS.json
```

## Important Notes

- **Hetzner Object Storage has limited CORS support for presigned URLs**
- The implementation uses path-style URLs and minimal headers to avoid CORS issues
- Uploads use simple PUT requests without custom headers
- If issues persist, consider using AWS S3 or Cloudflare R2 instead
