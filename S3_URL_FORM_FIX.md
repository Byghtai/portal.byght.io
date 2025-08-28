# S3 URL-Form Fix für Hetzner S3 Bucket

## Problem
Der Upload zum Hetzner S3 Bucket funktionierte nicht, weil die URL-Form inkonsistent war. Das System verwendete eine gemischte Form:
- Endpoint enthielt bereits den Bucket-Namen: `portal-byght-io.nbg1.your-objectstorage.com`
- `forcePathStyle: true` erzwang path-style URLs
- Ergebnis: `https://portal-byght-io.nbg1.your-objectstorage.com/bucket-name/key`

Diese gemischte Form ist unüblich und führt zu Problemen bei der Signierung.

## Lösung
Konsequente Verwendung von **virtual-hosted-style URLs**:

### Änderungen in `netlify/functions/s3-config.js`:
```javascript
// Vorher:
endpoint: process.env.OBJECT_STORAGE_ENDPOINT || 'portal-byght-io.nbg1.your-objectstorage.com',

// Nachher:
endpoint: process.env.OBJECT_STORAGE_ENDPOINT || 'nbg1.your-objectstorage.com',
```

### Änderungen in `netlify/functions/s3-storage.js`:
```javascript
// Vorher:
endpoint: `https://${this.endpoint}`,
forcePathStyle: true,

// Nachher:
endpoint: `https://${this.bucket}.${this.endpoint}`,
forcePathStyle: false,
```

## Ergebnis
Jetzt werden konsequent virtual-hosted-style URLs verwendet:
- **URL-Form**: `https://bucket-name.nbg1.your-objectstorage.com/key`
- **Konsistente Signierung**: Alle URLs folgen dem gleichen Muster
- **Bessere Kompatibilität**: Hetzner S3 unterstützt virtual-hosted-style URLs optimal

## Umgebungsvariablen Update
Aktualisieren Sie Ihre Netlify-Umgebungsvariablen:

```bash
# Vorher:
OBJECT_STORAGE_ENDPOINT=portal-byght-io.nbg1.your-objectstorage.com

# Nachher:
OBJECT_STORAGE_ENDPOINT=nbg1.your-objectstorage.com
```

## Vorteile
1. **Konsistente URL-Form**: Alle S3-Operationen verwenden das gleiche URL-Muster
2. **Bessere Hetzner-Kompatibilität**: Virtual-hosted-style URLs werden optimal unterstützt
3. **Korrekte Signierung**: AWS SDK kann URLs korrekt signieren
4. **Weniger Konfigurationsfehler**: Klare Trennung zwischen Endpoint und Bucket

## Testing
Nach der Änderung sollten alle S3-Operationen funktionieren:
- ✅ Upload über presigned URLs
- ✅ Download über signed URLs
- ✅ Direkte S3-Operationen (List, Delete, etc.)
- ✅ Proxy-Upload für kleine Dateien
