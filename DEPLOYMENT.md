# 🚀 Deployment-Anleitung für Byght Portal

Diese Anleitung führt dich durch das Deployment der Anwendung auf Netlify mit Neon PostgreSQL.

## 📋 Voraussetzungen

- GitHub Account
- Netlify Account (kostenlos)
- Neon PostgreSQL Account (kostenlos)

## 🗄️ Schritt 1: Neon PostgreSQL Datenbank einrichten

### 1.1 Neon Account erstellen
1. Gehe zu [neon.tech](https://neon.tech)
2. Klicke auf "Sign Up" und erstelle ein kostenloses Konto
3. Verifiziere deine E-Mail-Adresse

### 1.2 Neues Projekt erstellen
1. Nach dem Login klicke auf "Create New Project"
2. Wähle einen Projektnamen (z.B. "byght-portal")
3. Wähle eine Region (z.B. "Frankfurt" für bessere Performance in Deutschland)
4. Klicke auf "Create Project"

### 1.3 Verbindungs-URL kopieren
1. Nach der Projekterstellung siehst du die Verbindungs-URL
2. Kopiere die URL (sie sieht so aus: `postgresql://username:password@host:port/database`)
3. **Wichtig**: Speichere diese URL sicher - du brauchst sie für Netlify

## 🌐 Schritt 2: Netlify Site erstellen

### 2.1 GitHub Repository verbinden
1. Gehe zu [netlify.com](https://netlify.com) und logge dich ein
2. Klicke auf "Add new site" → "Import an existing project"
3. Wähle "GitHub" als Git-Provider
4. Wähle dein Repository `portal.byght.io` aus
5. Klicke auf "Deploy site"

### 2.2 Build-Einstellungen konfigurieren
Netlify sollte automatisch die richtigen Einstellungen erkennen:
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: `18`

Falls nicht, stelle diese Einstellungen manuell ein.

## 🔧 Schritt 3: Umgebungsvariablen setzen

### 3.1 JWT Secret generieren
Generiere ein sicheres JWT Secret:
```bash
# In der Kommandozeile ausführen:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3.2 Umgebungsvariablen in Netlify hinzufügen
1. Gehe zu deiner Netlify Site
2. Klicke auf "Site settings" → "Environment variables"
3. Füge folgende Variablen hinzu:

| Variable | Wert | Beschreibung |
|----------|------|--------------|
| `JWT_SECRET` | `dein-generiertes-jwt-secret` | Sichere JWT-Signierung |
| `DATABASE_URL` | `deine-neon-postgresql-url` | Neon Datenbank-Verbindung |

### 3.2.1 Beispiel für Umgebungsvariablen:
```
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
DATABASE_URL=postgresql://username:password@ep-cool-name-123456.eu-west-2.aws.neon.tech/neondb
```

## 🌍 Schritt 4: Custom Domain konfigurieren

### 4.1 Domain hinzufügen
1. Gehe zu "Domain settings" in deiner Netlify Site
2. Klicke auf "Add custom domain"
3. Gib `portal.byght.io` ein
4. Folge den DNS-Anweisungen

### 4.2 DNS-Einstellungen
Füge folgende DNS-Records bei deinem Domain-Provider hinzu:
```
Type: CNAME
Name: portal
Value: deine-netlify-site.netlify.app
```

## ✅ Schritt 5: Deployment testen

### 5.1 Admin-User erstellen
1. Rufe nach dem Deployment folgende URL auf: `https://portal.byght.io/.netlify/functions/setup-admin`
2. Der Admin-User wird erstellt mit:
   - **Username**: `admin`
   - **Passwort**: `admin123`

### 5.2 Ersten Login testen
1. Gehe zu `https://portal.byght.io`
2. Du solltest zur Login-Seite weitergeleitet werden
3. Logge dich mit den erstellten Credentials ein:
   - **Username**: `admin`
   - **Passwort**: `admin123`

### 5.2 Datenbank-Tabellen prüfen
Die Tabellen werden automatisch beim ersten Login erstellt. Du kannst sie in der Neon Console überprüfen:
1. Gehe zu deinem Neon Projekt
2. Klicke auf "SQL Editor"
3. Führe aus: `SELECT * FROM users;`

### 5.3 Admin-Panel testen
1. Nach dem Login siehst du den "Admin Panel" Button
2. Klicke darauf und teste:
   - Neuen Benutzer erstellen
   - Datei hochladen
   - Datei einem Benutzer zuweisen

## 🔒 Schritt 6: Sicherheit

### 6.1 Admin-Passwort ändern
1. Logge dich als Admin ein
2. Gehe zum Admin Panel
3. Erstelle einen neuen Admin-Benutzer
4. Logge dich mit dem neuen Admin aus und wieder ein
5. Lösche den Standard-Admin-Benutzer

### 6.2 SSL-Zertifikat prüfen
Netlify stellt automatisch SSL-Zertifikate bereit. Prüfe, dass `https://portal.byght.io` funktioniert.

## 🚨 Troubleshooting

### Problem: "Database connection failed"
- Prüfe die `DATABASE_URL` in den Netlify-Umgebungsvariablen
- Stelle sicher, dass die Neon-Datenbank läuft
- Prüfe die Firewall-Einstellungen

### Problem: "JWT verification failed"
- Generiere ein neues JWT_SECRET
- Stelle sicher, dass es in den Umgebungsvariablen gesetzt ist
- Deploye die Site neu

### Problem: "File upload failed"
- Prüfe die Netlify Blobs-Konfiguration
- Stelle sicher, dass die Site-ID korrekt ist
- Prüfe die Netlify Functions-Logs

## 📊 Monitoring

### Netlify Functions Logs
1. Gehe zu deiner Netlify Site
2. Klicke auf "Functions"
3. Überprüfe die Logs für Fehler

### Neon Database Monitoring
1. Gehe zu deinem Neon Projekt
2. Klicke auf "Metrics"
3. Überwache die Datenbank-Performance

## 🔄 Updates

### Code-Änderungen deployen
1. Pushe Änderungen zu GitHub
2. Netlify deployt automatisch
3. Prüfe die Deployment-Logs

### Datenbank-Migrationen
Die Datenbank-Schema wird automatisch beim ersten Login erstellt. Für Schema-Änderungen:
1. Ändere die SQL-Statements in `netlify/functions/db.js`
2. Deploye die Änderungen
3. Die Tabellen werden beim nächsten Login aktualisiert

## 💰 Kosten

### Kostenlose Limits
- **Neon**: 3 Projekte, 0.5 GB Speicher, 10 GB Transfer
- **Netlify**: 100 GB Bandwidth, 300 Build Minutes/Monat
- **Netlify Functions**: 125.000 Aufrufe/Monat

### Upgrade-Optionen
- **Neon Pro**: $10/Monat für mehr Speicher und Performance
- **Netlify Pro**: $19/Monat für mehr Bandwidth und Build-Minuten

---

## 🎉 Fertig!

Deine Byght Portal-Anwendung läuft jetzt auf:
- **URL**: https://portal.byght.io
- **Datenbank**: Neon PostgreSQL
- **Hosting**: Netlify
- **Dateispeicherung**: Netlify Blobs

Die Anwendung ist bereit für den produktiven Einsatz!
