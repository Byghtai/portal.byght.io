# Deployment Security Guide

## Problem
Netlify erkennt AWS-Umgebungsvariablen als "exposed secrets" und blockiert den Build.

## Ursachen

### 1. Hardcoded Werte im Code
```javascript
// ❌ Falsch - hardcoded bucket name
const bucket = 'portal-byght';

// ✅ Richtig - environment variable
const bucket = process.env.AWS_S3_BUCKETX;
```

### 2. Sensitive Daten in Logs
```javascript
// ❌ Falsch - bucket name in logs
console.log('Using bucket:', this.bucket);

// ✅ Richtig - generische Fehlermeldung
console.error('S3 connection failed:', error.message);
```

### 3. Spezifische Variablen-Namen in Fehlermeldungen
```javascript
// ❌ Falsch - spezifischer Variablen-Name
throw new Error('Check AWS_S3_BUCKETX environment variable');

// ✅ Richtig - generische Beschreibung
throw new Error('Check S3 bucket name environment variable');
```

## Lösung

### 1. Environment Variables Setup

**Nur im Netlify Dashboard setzen:**

1. **Netlify Dashboard** → **Site settings** → **Environment variables**
2. **Neue Variable hinzufügen** für jede erforderliche Variable
3. **Keine .env Dateien** committen

### 2. Sichere Codierung

#### ✅ Erlaubt:
```javascript
// Environment Variables verwenden
const bucket = process.env.AWS_S3_BUCKETX;

// Generische Fehlermeldungen
console.error('S3 error:', error.message);

// Sichere Validierung
if (!process.env.AWS_S3_BUCKETX) {
  throw new Error('S3 bucket name not configured');
}
```

#### ❌ Nicht erlaubt:
```javascript
// Hardcoded Werte
const bucket = 'portal-byght';

// Sensitive Daten in Logs
console.log('Bucket:', process.env.AWS_S3_BUCKETX);

// Spezifische Variablen-Namen in Fehlermeldungen
throw new Error('AWS_S3_BUCKETX not set');
```

### 3. Build-Konfiguration

**netlify.toml:**
```toml
[build.environment]
  NODE_VERSION = "18"
  # Keine AWS-Variablen hier!
```

### 4. Dokumentation

**Sichere Dokumentation:**
```markdown
# ✅ Richtig
AWS_S3_BUCKETX=your_bucket_name_here

# ❌ Falsch
AWS_S3_BUCKETX=portal-byght
```

## Checkliste vor Deployment

- [ ] **Keine hardcoded Werte** im Code
- [ ] **Keine sensitive Daten** in Logs
- [ ] **Generische Fehlermeldungen** verwenden
- [ ] **Environment Variables** nur im Dashboard
- [ ] **Keine .env Dateien** committen
- [ ] **Sichere Dokumentation** ohne echte Werte

## Testing

### Lokales Testing
```bash
# Environment Variables lokal setzen (nicht committen!)
export AWS_ACCESS_KEY_IDX=your_key
export AWS_SECRET_ACCESS_KEYX=your_secret
export AWS_S3_BUCKETX=your_bucket

# Test ausführen
npm run dev
```

### Production Testing
```bash
# S3-Verbindung testen
curl https://your-site.netlify.app/.netlify/functions/test-s3-connection
```

## Troubleshooting

### Build-Fehler "exposed secrets"

1. **Code durchsuchen** nach hardcoded Werten
2. **Logs überprüfen** nach sensitive Daten
3. **Fehlermeldungen** auf generische Beschreibungen ändern
4. **Environment Variables** im Dashboard verifizieren

### Häufige Probleme

1. **Bucket-Name im Code**: Durch `process.env.AWS_S3_BUCKETX` ersetzen
2. **Access Key in Logs**: Generische Fehlermeldungen verwenden
3. **Spezifische Variablen-Namen**: Durch generische Beschreibungen ersetzen

## Sicherheitsrichtlinien

### Allgemein
- **Nie** Credentials im Code committen
- **Nie** sensitive Daten in Logs schreiben
- **Immer** Environment Variables verwenden
- **Regelmäßig** Credentials rotieren

### Netlify-spezifisch
- **Nur** Dashboard für Environment Variables
- **Keine** .env Dateien im Repository
- **Sichere** Fehlerbehandlung implementieren
- **Generische** Dokumentation verwenden
