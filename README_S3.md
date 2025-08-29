# AWS S3 Storage Setup

## Prerequisites

1. **AWS Account** mit S3-Zugriff
2. **S3 Bucket** erstellt in der gewünschten Region
3. **IAM User** mit S3-Berechtigungen

## Environment Variables

Add these to your Netlify environment:

```env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=eu-central-1
```

## AWS S3 Bucket Setup

### 1. Create S3 Bucket

```bash
aws s3 mb s3://your-bucket-name --region eu-central-1
```

### 2. Configure CORS

Apply the CORS configuration to your S3 bucket:

```bash
aws s3api put-bucket-cors \
  --bucket your-bucket-name \
  --cors-configuration file://CORS.json
```

### 3. IAM Policy

Create an IAM policy for your S3 user:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:GetBucketLocation"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
            ]
        }
    ]
}
```

## Features

- **Server-Side Encryption**: AES256 encryption enabled
- **Virtual Hosted URLs**: More efficient than path-style URLs
- **Better CORS Support**: AWS S3 has superior CORS handling
- **Presigned URLs**: Secure direct upload/download
- **Error Handling**: Comprehensive error messages

## Migration from Hetzner Object Storage

If migrating from Hetzner Object Storage:

1. **Update environment variables** from `OBJECT_STORAGE_*` to `AWS_*`
2. **Transfer existing files** using AWS CLI or S3 browser
3. **Update CORS configuration** using the new CORS.json
4. **Test upload/download** functionality

## Troubleshooting

### Common Issues

1. **Access Denied**: Check IAM permissions
2. **CORS Errors**: Verify CORS configuration is applied
3. **Region Mismatch**: Ensure AWS_REGION matches bucket region
4. **Invalid Credentials**: Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

### Testing CORS

```bash
# Test CORS configuration
aws s3api get-bucket-cors --bucket your-bucket-name
```

## Cost Optimization

- **Lifecycle Rules**: Set up automatic deletion of old files
- **Storage Classes**: Use S3-IA for infrequently accessed files
- **Monitoring**: Enable CloudWatch for cost tracking
