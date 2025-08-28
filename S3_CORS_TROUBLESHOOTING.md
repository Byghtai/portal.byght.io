# S3 CORS Troubleshooting Guide

## Problem
Direct browser uploads to S3-compatible storage fail with CORS errors, even when CORS is configured on the bucket.

## Solution Implemented
The application now uses direct S3 upload only:

### Upload Flow
1. **Direct Upload**: All files are uploaded directly to S3 using presigned URLs
2. **No Fallback**: No proxy upload fallback - CORS must be properly configured
3. **Error Handling**: Clear error messages with CORS configuration instructions

## CORS Configuration

### Required S3 Bucket CORS Configuration
Apply this configuration to your S3 bucket (save as `cors.json` and apply via S3 console or CLI):

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
      "AllowedOrigins": [
        "https://portal-byght-io.netlify.app",
        "https://portal.byght.io",
        "http://localhost:5173",
        "http://localhost:3000"
      ],
      "ExposeHeaders": [
        "ETag",
        "x-amz-server-side-encryption",
        "x-amz-request-id",
        "x-amz-id-2",
        "Content-Length",
        "Content-Type"
      ],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

### Apply CORS Configuration

#### For AWS S3:
```bash
aws s3api put-bucket-cors --bucket your-bucket-name --cors-configuration file://cors.json
```

#### For S3-Compatible Storage (e.g., Contabo, DigitalOcean):
Use the provider's web console or API to apply the CORS configuration. Some providers may require:
1. Navigate to bucket settings
2. Find CORS configuration section
3. Paste the JSON configuration
4. Save and wait for propagation (can take up to 15 minutes)

## How Direct Upload Works

### All File Sizes
- All files are uploaded directly to S3 using presigned URLs
- No proxy fallback - CORS must be properly configured
- Progress tracking for all uploads
- Supports files up to 100MB (configurable limit)

## Troubleshooting Steps

### 1. Verify CORS is Applied
Check if CORS configuration is active:
```bash
# AWS S3
aws s3api get-bucket-cors --bucket your-bucket-name

# Or test with curl
curl -X OPTIONS https://your-bucket.s3.region.amazonaws.com \
  -H "Origin: https://portal.byght.io" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: Content-Type" -v
```

### 2. Check for CORS Response Headers
In browser DevTools Network tab, look for:
- `Access-Control-Allow-Origin` header in response
- Successful OPTIONS preflight request (status 200)

### 3. Common Issues and Solutions

#### Issue: CORS not working despite configuration
**Possible Causes:**
- Configuration not yet propagated (wait 15 minutes)
- Incorrect bucket endpoint in environment variables
- CloudFlare or CDN interfering with CORS headers

**Solutions:**
- Clear browser cache and retry
- Verify S3_ENDPOINT in environment variables
- Temporarily bypass CDN if using one

#### Issue: Direct upload fails for any file size
**Possible Causes:**
- CORS not properly configured on S3 bucket
- Network timeout for slow connections
- S3 endpoint configuration issues

**Solutions:**
- Verify CORS configuration is applied correctly
- Check S3 endpoint and credentials
- Retry upload
- Consider chunked upload for very slow connections

#### Issue: "Network Error" in console
**Possible Causes:**
- Ad blockers or browser extensions interfering
- Corporate firewall blocking S3 domain
- SSL/TLS certificate issues

**Solutions:**
- Disable browser extensions temporarily
- Try from different network
- Check S3 endpoint SSL certificate validity

### 4. Testing CORS Configuration

#### Manual Test with JavaScript Console:
```javascript
// Test CORS from browser console
fetch('https://your-bucket.s3.region.amazonaws.com/test', {
  method: 'PUT',
  headers: {
    'Content-Type': 'text/plain'
  },
  body: 'test'
}).then(r => console.log('Success:', r.status))
  .catch(e => console.error('CORS Error:', e));
```

## File Size Recommendations

| File Size | Upload Method | Performance |
|-----------|--------------|-------------|
| < 1MB | Direct or Proxy | Fast (1-2s) |
| 1-5MB | Direct preferred, Proxy fallback | Good (2-5s) |
| 5-50MB | Direct only (CORS required) | Depends on connection |
| > 50MB | Direct only (CORS required) | Consider chunking |

## Advanced Configuration

### Increasing Proxy Upload Limit
To support larger files via proxy (not recommended due to performance):

1. Modify `MAX_PROXY_SIZE` in `AdminPanel.jsx`
2. Ensure Netlify Function timeout is sufficient
3. Consider Netlify bandwidth costs

### Direct Upload Only
The application now uses direct upload only:

1. All files are uploaded directly to S3 using presigned URLs
2. Clear CORS configuration instructions shown on error
3. No proxy fallback mechanism

## Monitoring

### Success Indicators:
- Console shows: "File uploaded to S3 successfully"
- Progress bar reaches 100%
- File appears in file list

### Failure Indicators:
- Console shows: "S3 direct upload failed - likely CORS issue"
- Error message about CORS configuration
- Upload progress stops and shows error status

## Support

If CORS issues persist:
1. Verify your S3-compatible storage provider supports CORS
2. Check provider-specific documentation
3. Consider using AWS S3 directly for better CORS support
4. Contact your S3 provider's support team
