# S3 Upload 403 Forbidden Error - Troubleshooting Guide

## Problem
Der S3-Upload schlägt mit einem 403 Forbidden Fehler fehl. Dies deutet auf ein Problem mit den AWS-Berechtigungen oder der Konfiguration hin.

## Diagnose-Schritte

### 1. S3-Verbindung testen
Rufen Sie die Test-Funktion auf, um die S3-Verbindung zu überprüfen:

```bash
curl https://your-netlify-site.netlify.app/.netlify/functions/test-s3-connection
```

### 2. Environment Variables überprüfen
Stellen Sie sicher, dass alle erforderlichen Environment Variables in Netlify gesetzt sind:

**Netlify Dashboard → Site settings → Environment variables:**

```env
AWS_ACCESS_KEY_IDX=your_aws_access_key
AWS_SECRET_ACCESS_KEYX=your_aws_secret_key
AWS_S3_BUCKETX=portal-byght
AWS_REGIONX=eu-central-1
JWT_SECRET=your_jwt_secret
```

### 3. IAM Policy überprüfen
Stellen Sie sicher, dass die IAM-Policy korrekt angewendet wurde:

1. **AWS Console → IAM → Users → Ihr User**
2. **Permissions Tab** überprüfen
3. **Policy anwenden** (falls nicht vorhanden):

```bash
# Policy erstellen
aws iam create-policy \
  --policy-name S3PortalAccess \
  --policy-document file://aws-iam-policy.json

# Policy an User anhängen
aws iam attach-user-policy \
  --user-name your-iam-user \
  --policy-arn arn:aws:iam::your-account-id:policy/S3PortalAccess
```

### 4. S3 Bucket Policy überprüfen
Stellen Sie sicher, dass der S3-Bucket keine restriktive Policy hat:

```bash
# Bucket Policy abrufen
aws s3api get-bucket-policy --bucket portal-byght

# Falls eine restriktive Policy existiert, entfernen:
aws s3api delete-bucket-policy --bucket portal-byght
```

### 5. CORS-Konfiguration überprüfen
Stellen Sie sicher, dass die CORS-Konfiguration korrekt angewendet wurde:

```bash
# CORS-Konfiguration anwenden
aws s3api put-bucket-cors \
  --bucket portal-byght \
  --cors-configuration file://CORS.json

# CORS-Konfiguration überprüfen
aws s3api get-bucket-cors --bucket portal-byght
```

### 6. Bucket-Berechtigungen überprüfen
Stellen Sie sicher, dass "Block Public Access" korrekt konfiguriert ist:

1. **AWS Console → S3 → Bucket → Permissions**
2. **Block Public Access**: Alle Optionen aktiviert lassen
3. **Bucket Policy**: Keine öffentliche Policy

## Häufige Ursachen und Lösungen

### Ursache 1: Falsche Environment Variables
**Symptom**: `InvalidAccessKeyId` oder `SignatureDoesNotMatch` Fehler

**Lösung**: 
- Environment Variables in Netlify überprüfen
- AWS Access Key und Secret Key neu generieren
- Bucket-Name und Region überprüfen

### Ursache 2: Unzureichende IAM-Berechtigungen
**Symptom**: `AccessDenied` Fehler

**Lösung**:
- IAM-Policy mit allen erforderlichen Berechtigungen anwenden
- Policy aus `aws-iam-policy.json` verwenden

### Ursache 3: Falsche Bucket-Konfiguration
**Symptom**: `NoSuchBucket` oder `AccessDenied` Fehler

**Lösung**:
- Bucket-Name in Environment Variables überprüfen
- Bucket-Region überprüfen
- Bucket-Policy entfernen (falls vorhanden)

### Ursache 4: CORS-Probleme
**Symptom**: Browser-CORS-Fehler

**Lösung**:
- CORS-Konfiguration aus `CORS.json` anwenden
- Origin-URLs in CORS-Konfiguration überprüfen

## Debugging-Tools

### 1. S3 Connection Test
```bash
curl https://your-site.netlify.app/.netlify/functions/test-s3-connection
```

### 2. Netlify Function Logs
```bash
# In Netlify Dashboard → Functions → Logs
# Nach Upload-Versuch suchen
```

### 3. Browser Developer Tools
- **Network Tab**: Upload-Request überprüfen
- **Console**: JavaScript-Fehler überprüfen

## Erwartete Logs

### Erfolgreicher Upload:
```
S3Storage initialization: { hasAccessKey: true, hasSecretKey: true, bucket: 'portal-byght', region: 'eu-central-1' }
✅ S3 connection test passed
Generating presigned upload URL: { bucket: 'portal-byght', key: '1234567890-abc123-test.zip', expiresIn: 300 }
✅ Presigned URL generated successfully
```

### Fehlerhafte Konfiguration:
```
S3Storage initialization: { hasAccessKey: false, hasSecretKey: true, bucket: 'portal-byght', region: 'eu-central-1' }
Missing required AWS S3 environment variables: AWS_ACCESS_KEY_IDX
```

## Nächste Schritte

1. **S3-Verbindung testen** mit der neuen Test-Funktion
2. **Environment Variables** in Netlify überprüfen
3. **IAM-Policy** anwenden
4. **CORS-Konfiguration** überprüfen
5. **Upload erneut versuchen**

## Support

Falls das Problem weiterhin besteht:
1. **Netlify Function Logs** überprüfen
2. **AWS CloudTrail** für detaillierte API-Logs aktivieren
3. **Browser Developer Tools** für Client-seitige Fehler überprüfen
