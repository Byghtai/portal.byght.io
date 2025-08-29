# AWS S3 Deployment Guide

## Schritt-für-Schritt Anleitung zur Umstellung auf AWS S3

### Phase 1: AWS S3 Setup

#### 1.1 AWS Account und S3 Bucket erstellen

1. **AWS Console öffnen** und sich anmelden
2. **S3 Service** aufrufen
3. **"Create bucket"** klicken
4. **Bucket-Konfiguration:**
   - **Bucket name**: `byght-portal-files` (oder eindeutiger Name)
   - **Region**: `eu-central-1` (Frankfurt)
   - **Block Public Access**: Alle Optionen aktiviert lassen
   - **Bucket Versioning**: Optional aktivieren
   - **Tags**: Optional für Kostenverfolgung

#### 1.2 IAM User und Policy erstellen

1. **IAM Console** öffnen
2. **Users** → **"Create user"**
3. **User details:**
   - **User name**: `byght-s3-user`
   - **Access type**: Programmatic access
4. **Permissions**: **"Attach policies directly"**
5. **Policy erstellen** (JSON):

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
                "arn:aws:s3:::byght-portal-files",
                "arn:aws:s3:::byght-portal-files/*"
            ]
        }
    ]
}
```

6. **Access Key** generieren und sicher speichern

#### 1.3 CORS-Konfiguration anwenden

```bash
# AWS CLI installieren (falls nicht vorhanden)
# https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

# CORS-Konfiguration anwenden
aws s3api put-bucket-cors \
  --bucket byght-portal-files \
  --cors-configuration file://CORS.json
```

### Phase 2: Netlify Environment Variables aktualisieren

#### 2.1 Alte Variablen entfernen

In Netlify Dashboard → Site settings → Environment variables:

**Entfernen:**
- `OBJECT_STORAGE_ENDPOINT`
- `OBJECT_STORAGE_ACCESS_KEY`
- `OBJECT_STORAGE_SECRET_KEY`
- `OBJECT_STORAGE_BUCKET`
- `OBJECT_STORAGE_REGION`

#### 2.2 Neue AWS Variablen hinzufügen

**Hinzufügen:**
- `AWS_ACCESS_KEY_IDX` = `your_access_key_from_iam`
- `AWS_SECRET_ACCESS_KEYX` = `your_secret_key_from_iam`
- `AWS_S3_BUCKETX` = `byght-portal-files`
- `AWS_REGIONX` = `eu-central-1`

### Phase 3: Datenmigration

#### 3.1 Migrationsskript vorbereiten

```bash
# Dependencies installieren
npm install @aws-sdk/client-s3

# Migrationsskript ausführbar machen
chmod +x migrate-to-aws-s3.js
```

#### 3.2 Migration durchführen

```bash
# Temporär alte Umgebungsvariablen setzen (für Migration)
export OBJECT_STORAGE_ACCESS_KEY="your_hetzner_key"
export OBJECT_STORAGE_SECRET_KEY="your_hetzner_secret"
export OBJECT_STORAGE_BUCKET="your_hetzner_bucket"
export OBJECT_STORAGE_ENDPOINT="your_hetzner_endpoint"

# Neue AWS Variablen setzen
export AWS_ACCESS_KEY_IDX="your_aws_key"
export AWS_SECRET_ACCESS_KEYX="your_aws_secret"
export AWS_S3_BUCKETX="byght-portal-files"
export AWS_REGIONX="eu-central-1"

# Migration starten
node migrate-to-aws-s3.js
```

### Phase 4: Testing

#### 4.1 Lokales Testing

```bash
# Development Server starten
npm run dev

# Test-Upload durchführen
# Test-Download durchführen
# Admin-Panel testen
```

#### 4.2 Production Testing

1. **Netlify Deployment** triggern
2. **Live-Site testen:**
   - File Upload
   - File Download
   - Admin Panel Funktionalität
   - User Management

### Phase 5: Cleanup

#### 5.1 Hetzner Object Storage bereinigen

Nach erfolgreicher Migration und Testing:

1. **Hetzner Object Storage** löschen oder deaktivieren
2. **Alte Umgebungsvariablen** aus anderen Systemen entfernen
3. **Backup** der alten Konfiguration erstellen

#### 5.2 Monitoring einrichten

1. **AWS CloudWatch** aktivieren
2. **S3 Metrics** überwachen
3. **Kosten-Tracking** einrichten

## Troubleshooting

### Häufige Probleme

#### CORS-Fehler
```bash
# CORS-Konfiguration überprüfen
aws s3api get-bucket-cors --bucket byght-portal-files
```

#### Access Denied
- IAM Policy überprüfen
- Bucket-Name in Policy korrekt?
- Access Keys gültig?

#### Region Mismatch
- `AWS_REGIONX` muss mit Bucket-Region übereinstimmen
- Standard: `eu-central-1`

### Rollback-Plan

Falls Probleme auftreten:

1. **Alte Umgebungsvariablen** wiederherstellen
2. **S3 Storage-Klasse** auf Hetzner-Konfiguration zurücksetzen
3. **Netlify** neu deployen

## Kostenoptimierung

### S3 Lifecycle Rules

```bash
# Lifecycle Rule für alte Dateien
aws s3api put-bucket-lifecycle-configuration \
  --bucket byght-portal-files \
  --lifecycle-configuration file://lifecycle-rules.json
```

### Monitoring

- **CloudWatch Alarms** für Kosten
- **S3 Analytics** aktivieren
- **Storage Classes** für alte Dateien

## Sicherheit

### Best Practices

1. **IAM Least Privilege**: Nur notwendige Rechte
2. **Server-Side Encryption**: AES256 aktiviert
3. **Access Logging**: Optional aktivieren
4. **Versioning**: Für kritische Daten

### Compliance

- **GDPR**: Daten in EU-Region
- **Audit Logs**: CloudTrail aktivieren
- **Backup Strategy**: Cross-Region Replication

## Support

Bei Problemen:

1. **AWS S3 Dokumentation** konsultieren
2. **Netlify Logs** überprüfen
3. **Browser Developer Tools** für CORS-Fehler
4. **AWS Support** bei AWS-spezifischen Problemen
