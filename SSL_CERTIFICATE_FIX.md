# SSL-Zertifikatsproblem bei S3-Uploads - Lösung

## Problem
Beim Upload von Dateien tritt der Fehler `net::ERR_CERT_COMMON_NAME_INVALID` auf. Dies geschieht, weil:

1. **Virtual-Hosted-Style URLs**: Die S3-Konfiguration verwendete URLs wie `https://bucket-name.endpoint.com`
2. **SSL-Zertifikat**: Das SSL-Zertifikat ist nur für `*.nbg1.your-objectstorage.com` gültig, nicht für `bucket-name.nbg1.your-objectstorage.com`

## Lösung
Umstellung auf **Path-Style URLs**:

### Änderungen in `netlify/functions/s3-storage.js`:
```javascript
// Vorher (Virtual-Hosted-Style):
endpoint: `https://${this.bucket}.${this.endpoint}`,
forcePathStyle: false,

// Nachher (Path-Style):
endpoint: `https://${this.endpoint}`,
forcePathStyle: true,
```

### URL-Formen im Vergleich:

#### Virtual-Hosted-Style (vorher - problematisch):
```
https://portal-byght-io.nbg1.your-objectstorage.com/file-key
```

#### Path-Style (nachher - funktioniert):
```
https://nbg1.your-objectstorage.com/portal-byght-io/file-key
```

## Vorteile der Path-Style URLs

1. **SSL-Kompatibilität**: Verwendet die Basis-Domain, für die das SSL-Zertifikat gültig ist
2. **Weniger Konfiguration**: Keine spezielle DNS-Konfiguration erforderlich
3. **Bessere Kompatibilität**: Funktioniert mit allen S3-kompatiblen Storage-Providern

## CORS-Konfiguration

Die CORS-Konfiguration wurde ebenfalls aktualisiert, um localhost für die Entwicklung zu unterstützen:

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

## Umgebungsvariablen

Stellen Sie sicher, dass Ihre Netlify-Umgebungsvariablen korrekt konfiguriert sind:

```bash
OBJECT_STORAGE_ENDPOINT=nbg1.your-objectstorage.com
OBJECT_STORAGE_ACCESS_KEY=your_access_key_here
OBJECT_STORAGE_SECRET_KEY=your_secret_key_here
OBJECT_STORAGE_BUCKET=portal-byght-io
OBJECT_STORAGE_REGION=nbg1
```

## Testing

Nach der Änderung sollten Uploads funktionieren:

1. **Browser-Konsole**: Keine SSL-Zertifikatsfehler mehr
2. **Upload-URLs**: Verwenden jetzt path-style Format
3. **CORS**: Funktioniert mit allen konfigurierten Origins

## Fallback-Strategie

Falls path-style URLs nicht funktionieren, können Sie zurück zu virtual-hosted-style wechseln, aber dann müssen Sie:

1. **SSL-Zertifikat**: Ein Wildcard-Zertifikat für `*.nbg1.your-objectstorage.com` konfigurieren
2. **DNS**: Sicherstellen, dass `bucket-name.nbg1.your-objectstorage.com` auf den S3-Service zeigt

## Monitoring

Überwachen Sie die Uploads nach der Änderung:

- **Erfolgreiche Uploads**: Console zeigt "File uploaded to S3 successfully"
- **Keine SSL-Fehler**: Browser-Netzwerk-Tab zeigt keine Zertifikatsfehler
- **Korrekte URLs**: Upload-URLs verwenden path-style Format
