# S3 URL-Form Fix für Hetzner S3 Bucket

## Problem
Der Upload zum Hetzner S3 Bucket funktionierte nicht, weil die URL-Form inkonsistent war. Das System verwendete eine gemischte Form:
- Endpoint enthielt bereits den Bucket-Namen: `portal-byght-io.nbg1.your-objectstorage.com`
- `forcePathStyle: true` erzwang path-style URLs
- Ergebnis: `https://portal-byght-io.nbg1.your-objectstorage.com/bucket-name/key`

Diese gemischte Form ist unüblich und führt zu Problemen bei der Signierung.

## Lösung
Umstellung auf **path-style URLs** zur Vermeidung von SSL-Zertifikatsproblemen:

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
endpoint: `https://${this.bucket}.${this.endpoint}`,
forcePathStyle: false,

// Nachher:
endpoint: `https://${this.endpoint}`,
forcePathStyle: true,
```

## Ergebnis
Jetzt werden konsequent path-style URLs verwendet:
- **URL-Form**: `https://nbg1.your-objectstorage.com/bucket-name/key`
- **SSL-Kompatibilität**: Verwendet die Basis-Domain mit gültigem SSL-Zertifikat
- **Bessere Kompatibilität**: Funktioniert mit allen S3-kompatiblen Storage-Providern

## Umgebungsvariablen Update
Aktualisieren Sie Ihre Netlify-Umgebungsvariablen:

```bash
# Vorher:
OBJECT_STORAGE_ENDPOINT=portal-byght-io.nbg1.your-objectstorage.com

# Nachher:
OBJECT_STORAGE_ENDPOINT=nbg1.your-objectstorage.com
```

**Wichtig**: Stellen Sie sicher, dass `OBJECT_STORAGE_BUCKET=portal-byght-io` gesetzt ist.

## Vorteile
1. **SSL-Kompatibilität**: Verwendet die Basis-Domain mit gültigem SSL-Zertifikat
2. **Weniger Konfiguration**: Keine spezielle DNS-Konfiguration erforderlich
3. **Bessere Kompatibilität**: Funktioniert mit allen S3-kompatiblen Storage-Providern
4. **Korrekte Signierung**: AWS SDK kann URLs korrekt signieren

## Testing
Nach der Änderung sollten alle S3-Operationen funktionieren:
- ✅ Upload über presigned URLs
- ✅ Download über signed URLs
- ✅ Direkte S3-Operationen (List, Delete, etc.)
- ✅ Proxy-Upload für kleine Dateien
