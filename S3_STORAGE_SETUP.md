# S3 Storage Setup für portal.byght.io

## Übersicht

Das Portal verwendet jetzt ausschließlich S3-kompatiblen Object Storage für die Dateispeicherung. Die Netlify Blobs-Option wurde vollständig entfernt.

## Erforderliche Umgebungsvariablen

Fügen Sie folgende Umgebungsvariablen in Ihren Netlify-Einstellungen hinzu:

### Obligatorische Variablen:
```
OBJECT_STORAGE_ENDPOINT=nbg1.your-objectstorage.com
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
- ✅ **Download**: Dateien herunterladen (mit Signed URLs für große Dateien)
- ✅ **Delete**: Dateien löschen (mit Retry-Logic)
- ✅ **Exists Check**: Prüfen ob Datei existiert
- ✅ **Signed URLs**: Generierung von temporären Download-Links
- ✅ **List Objects**: Auflisten aller Objekte im Bucket
- ✅ **Cleanup**: Bereinigung verwaister Dateien

### Dateitypen:
- Alle Dateitypen werden unterstützt
- Spezielle Validierung für ZIP-Dateien
- MIME-Type wird automatisch erkannt und gespeichert

### Dateigrößen-Limits:
- **Maximum**: 100MB pro Datei
- **Empfohlen**: Bis 50MB für optimale Performance
- **Timeout**: 60 Sekunden für Upload-Funktionen

### Download-Strategien:
- **Direkte Downloads**: Für Dateien unter 50MB
- **Signed URLs**: Für große Dateien (>50MB) oder bei Problemen
- **Automatische Fallback**: Bei Download-Fehlern wird automatisch auf Signed URLs zurückgegriffen

## Technische Details

### S3-Kompatibilität:
- Verwendet AWS SDK v3 für S3
- Unterstützt S3-kompatible Storage-Provider
- Virtual-hosted-style URLs für bessere Kompatibilität mit Hetzner S3

### Sicherheit:
- Zugangsdaten werden über Umgebungsvariablen verwaltet
- Keine hartcodierten Credentials
- JWT-basierte Authentifizierung für alle Operationen
- Signed URLs mit 1-Stunden-Ablaufzeit

### Fehlerbehandlung:
- Detaillierte Logging für alle Storage-Operationen
- Graceful Error Handling
- Automatische Wiederholungsversuche bei Löschoperationen (3 Versuche)
- Verifikation nach Löschoperationen
- Spezifische Fehlermeldungen für verschiedene S3-Fehler

### Verbesserte Löschfunktionalität:
- **Retry-Logic**: Bis zu 3 Löschversuche mit Wartezeiten
- **Verifikation**: Prüfung nach jeder Löschoperation
- **Orphaned File Cleanup**: Automatische Bereinigung verwaister Dateien
- **Detaillierte Logs**: Umfassende Protokollierung aller Operationen

### Verbesserte Download-Funktionalität:
- **Stream-to-Buffer Konvertierung**: Bessere Handhabung von S3-Response-Streams
- **Signed URL Support**: Für große Dateien und bessere Performance
- **Automatische Größenprüfung**: Wählt optimale Download-Methode
- **Detaillierte Fehlerbehandlung**: Spezifische Fehlermeldungen für verschiedene Probleme
- **Frontend-Integration**: Intelligente Download-Strategien im Dashboard

## Migration von Netlify Blobs

**Wichtig**: Bestehende Dateien in Netlify Blobs sind nicht mehr zugänglich, da das System jetzt ausschließlich S3 verwendet.

## Troubleshooting

### Große Dateien können nicht hochgeladen werden:
1. Prüfen Sie die `netlify.toml` Konfiguration
2. Stellen Sie sicher, dass `request_body_size = "100mb"` gesetzt ist
3. Überprüfen Sie die Dateigröße (Maximum 100MB)

### Dateien werden nicht aus S3 gelöscht:
1. Prüfen Sie die S3-Zugangsdaten
2. Überprüfen Sie die Logs für detaillierte Fehlermeldungen
3. Verwenden Sie die "Cleanup Orphaned Files" Funktion
4. Stellen Sie sicher, dass die S3-Bucket-Berechtigungen korrekt sind

### Download-Probleme:
1. **"Download failed"**: Überprüfen Sie die S3-Zugangsdaten und Bucket-Berechtigungen
2. **Leere Dateien**: Prüfen Sie, ob die Datei korrekt in S3 gespeichert wurde
3. **Große Dateien**: Verwenden Sie Signed URLs für Dateien über 50MB
4. **Timeout-Fehler**: Erhöhen Sie die Function-Timeout-Werte in `netlify.toml`

### Performance-Probleme:
1. Reduzieren Sie die Dateigröße auf unter 50MB
2. Verwenden Sie ZIP-Dateien für mehrere Dateien
3. Überprüfen Sie die Netzwerkverbindung zum S3-Speicher
4. Nutzen Sie Signed URLs für große Dateien

## Admin-Funktionen

### Datei-Upload:
- Drag & Drop oder Dateiauswahl
- Automatische Größenprüfung
- Fortschrittsanzeige für große Dateien
- Validierung von ZIP-Dateien

### Datei-Löschung:
- Einzelne Dateien löschen
- Automatische S3-Bereinigung
- Verifikation der Löschung
- Detaillierte Rückmeldungen

### Download-Funktionen:
- Direkte Downloads für kleine Dateien
- Signed URLs für große Dateien
- Automatische Fallback-Strategien
- Detaillierte Fehlerbehandlung

### Cleanup-Funktionen:
- Bereinigung verwaister S3-Dateien
- Vergleich zwischen Datenbank und S3
- Automatische Löschung nicht referenzierter Dateien
- Detaillierte Berichte über Bereinigungsaktionen
