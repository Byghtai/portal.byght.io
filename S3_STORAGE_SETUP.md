# S3 Storage Setup für portal.byght.io

## Übersicht

Das Portal verwendet jetzt ausschließlich S3-kompatiblen Object Storage für die Dateispeicherung. Die Netlify Blobs-Option wurde vollständig entfernt.

## Erforderliche Umgebungsvariablen

Fügen Sie folgende Umgebungsvariablen in Ihren Netlify-Einstellungen hinzu:

### Obligatorische Variablen:
```
OBJECT_STORAGE_ENDPOINT=portal-byght-io.nbg1.your-objectstorage.com
OBJECT_STORAGE_ACCESS_KEY=your_access_key_here
OBJECT_STORAGE_SECRET_KEY=your_secret_key_here
OBJECT_STORAGE_BUCKET=your_bucket_name_here
```

### Optionale Variablen:
```
OBJECT_STORAGE_REGION=nbg1
```

## Konfiguration in Netlify

1. Gehen Sie zu Ihrem Netlify Dashboard
2. Wählen Sie Ihr Projekt aus
3. Navigieren Sie zu **Site settings** → **Environment variables**
4. Fügen Sie die oben genannten Variablen hinzu

## S3 Storage Features

### Unterstützte Operationen:
- ✅ **Upload**: Dateien hochladen (bis 100MB)
- ✅ **Download**: Dateien herunterladen
- ✅ **Delete**: Dateien löschen
- ✅ **Exists Check**: Prüfen ob Datei existiert
- ✅ **Signed URLs**: Generierung von temporären Download-Links

### Dateitypen:
- Alle Dateitypen werden unterstützt
- Spezielle Validierung für ZIP-Dateien
- MIME-Type wird automatisch erkannt und gespeichert

## Technische Details

### S3-Kompatibilität:
- Verwendet AWS SDK v3 für S3
- Unterstützt S3-kompatible Storage-Provider
- `forcePathStyle: true` für maximale Kompatibilität

### Sicherheit:
- Zugangsdaten werden über Umgebungsvariablen verwaltet
- Keine hartcodierten Credentials
- JWT-basierte Authentifizierung für alle Operationen

### Fehlerbehandlung:
- Detaillierte Logging für alle Storage-Operationen
- Graceful Error Handling
- Automatische Wiederholungsversuche bei Löschoperationen

## Migration von Netlify Blobs

**Wichtig**: Bestehende Dateien in Netlify Blobs sind nicht mehr zugänglich, da das System jetzt ausschließlich S3 verwendet.

### Empfohlene Schritte:
1. Konfigurieren Sie die S3-Umgebungsvariablen
2. Testen Sie das System mit neuen Uploads
3. Laden Sie bei Bedarf wichtige Dateien neu hoch

## Troubleshooting

### Häufige Fehler:

**"Missing required S3 storage environment variables"**
- Überprüfen Sie, ob alle erforderlichen Umgebungsvariablen gesetzt sind
- Stellen Sie sicher, dass die Variablen in Netlify korrekt konfiguriert sind

**"Access Denied"**
- Überprüfen Sie Ihre S3-Zugangsdaten
- Stellen Sie sicher, dass der Bucket existiert und zugänglich ist
- Prüfen Sie die IAM-Berechtigungen

**"Endpoint not found"**
- Überprüfen Sie die Endpoint-URL
- Stellen Sie sicher, dass der Service erreichbar ist

### Logs überprüfen:
- Alle Storage-Operationen werden in den Netlify Function Logs protokolliert
- Überprüfen Sie die Logs im Netlify Dashboard unter **Functions**

## Support

Bei Problemen mit der S3-Konfiguration:
1. Überprüfen Sie die Umgebungsvariablen
2. Testen Sie die S3-Verbindung separat
3. Kontaktieren Sie den Systemadministrator
