# AWS S3 Deployment Guide

## Schritt-für-Schritt Anleitung zur Umstellung auf AWS S3

### Phase 1: AWS S3 Setup

#### 1.1 AWS Account und S3 Bucket erstellen

1. **AWS Console öffnen** und sich anmelden
2. **S3 Service** aufrufen
3. **"Create bucket"** klicken
4. **Bucket-Konfiguration:**
   - **Bucket name**: `your-bucket-name` (oder eindeutiger Name)
   - **Region**: `eu-central-1` (Frankfurt)
   - **Block Public Access**: Alle Optionen aktiviert lassen
   - **Bucket Versioning**: Optional aktivieren
   - **Tags**: Optional für Kostenverfolgung

#### 1.2 IAM User und Policy erstellen

1. **IAM Console** öffnen
2. **Users** → **"Create user"**
3. **User details:**
   - **User name**: `your-s3-user`
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
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
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
  --bucket your-bucket-name \
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

#### 2.2 Neue Variablen hinzufügen

**Hinzufügen:**
- `AWS_ACCESS_KEY_IDX` = `your_aws_access_key`
- `AWS_SECRET_ACCESS_KEYX` = `your_aws_secret_key`
- `AWS_S3_BUCKETX` = `your_bucket_name`
- `AWS_REGIONX` = `eu-central-1`

### Phase 3: Deployment und Testing

#### 3.1 Code deployen

```bash
git add .
git commit -m "Migrate to AWS S3"
git push origin main
```

#### 3.2 S3-Verbindung testen

```bash
# Test-Funktion aufrufen
curl https://your-site.netlify.app/.netlify/functions/test-s3-connection
```

#### 3.3 Upload testen

1. **Admin-Panel** öffnen
2. **Datei hochladen** versuchen
3. **Logs überprüfen** bei Problemen

### Phase 4: Migration bestehender Dateien

#### 4.1 Dateien von Hetzner zu AWS S3 übertragen

```bash
# AWS CLI konfigurieren
aws configure

# Dateien übertragen (falls vorhanden)
aws s3 sync s3://old-hetzner-bucket s3://your-bucket-name
```

#### 4.2 Datenbank aktualisieren

Falls bestehende Dateien migriert wurden, müssen die Blob-Keys in der Datenbank aktualisiert werden.

## Troubleshooting

### Häufige Probleme

1. **403 Forbidden**: IAM-Berechtigungen überprüfen
2. **CORS-Fehler**: CORS-Konfiguration anwenden
3. **Bucket nicht gefunden**: Bucket-Name und Region überprüfen
4. **Invalid Credentials**: Access Key und Secret Key überprüfen

### Debugging

```bash
# S3-Verbindung testen
curl https://your-site.netlify.app/.netlify/functions/test-s3-connection

# Netlify Function Logs überprüfen
# Dashboard → Functions → Logs
```

## Sicherheitshinweise

- **Access Keys** regelmäßig rotieren
- **IAM-Policy** auf Minimum-Berechtigungen beschränken
- **Bucket-Policy** für öffentlichen Zugriff entfernen
- **CORS-Konfiguration** nur für benötigte Domains
