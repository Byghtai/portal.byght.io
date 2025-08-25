# Byght Download Portal

Ein modernes Download-Portal für Kunden, entwickelt mit React, Vite und Netlify Functions.

## 🚀 Features

- **Sichere Authentifizierung**: Username/Passwort-basierte Anmeldung mit JWT
- **Dateiverwaltung**: Upload und Verwaltung von Dateien über Admin-Panel
- **Benutzerverwaltung**: Erstellen und Verwalten von Benutzern
- **Zugriffskontrolle**: Benutzer sehen nur die ihnen zugewiesenen Dateien
- **Modernes Design**: Responsive UI im Byght-Stil

## 📋 Voraussetzungen

- Node.js 18 oder höhe
- npm oder yarn
- Netlify Account
- Neon PostgreSQL Datenbank (kostenlos verfügbar)

## 🛠️ Installation 

1. **Repository klonen**
```bash
git clone https://github.com/yourusername/portal.byght.io.git
cd portal.byght.io
```

2. **Abhängigkeiten installieren**
```bash
npm install
```

3. **Umgebungsvariablen konfigurieren**

Erstelle eine `.env` Datei im Hauptverzeichnis:
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DATABASE_URL=postgresql://username:password@host:port/database
```

## 🚀 Lokale Entwicklung

```bash
# Entwicklungsserver starten
npm run dev

# Netlify Functions lokal testen
netlify dev
```

## 📦 Deployment auf Netlify

### Option 1: Über Netlify CLI

1. **Netlify CLI installieren**
```bash
npm install -g netlify-cli
```

2. **Mit Netlify verbinden**
```bash
netlify init
```

3. **Deployen**
```bash
netlify deploy --prod
```

### Option 2: Über GitHub

1. Repository zu GitHub pushen
2. In Netlify einloggen und "New site from Git" wählen
3. Repository verbinden und automatisches Deployment konfigurieren

### Wichtige Netlify-Einstellungen

1. **Neon PostgreSQL Datenbank einrichten**:
   - Gehe zu [neon.tech](https://neon.tech) und erstelle ein kostenloses Konto
   - Erstelle ein neues Projekt
   - Kopiere die Verbindungs-URL (Connection String)
   - Die Datenbank-Tabellen werden automatisch beim ersten Login erstellt

2. **Umgebungsvariablen in Netlify setzen**:
   - Gehe zu Site Settings → Environment Variables
   - Füge `JWT_SECRET` mit einem sicheren Wert hinzu
   - Füge `DATABASE_URL` mit deiner Neon PostgreSQL URL hinzu

2. **Domain konfigurieren**:
   - Gehe zu Domain Settings
   - Füge `portal.byght.io` als Custom Domain hinzu

## 👤 Standard-Admin-Zugang

Nach dem ersten Deployment:
- **Username**: admin
- **Passwort**: admin123

⚠️ **WICHTIG**: Ändere das Admin-Passwort nach dem ersten Login!

## 📁 Datei-Upload (Admin)

Als Admin kannst du:
1. Zum Admin-Panel navigieren (Button im Dashboard)
2. Dateien hochladen und Benutzern zuweisen
3. Neue Benutzer erstellen
4. Dateien und Benutzer verwalten

### Upload-Prozess für Admins:
1. Logge dich als Admin ein
2. Gehe zum Admin Panel
3. Wähle "Dateiverwaltung"
4. Lade eine Datei hoch
5. Wähle die Benutzer aus, die Zugriff haben sollen
6. Klicke auf "Datei hochladen"

## 🔧 Technische Details

### Verwendete Technologien:
- **Frontend**: React, Vite, Tailwind CSS, React Router
- **Backend**: Netlify Functions (Serverless)
- **Datenbank**: Neon PostgreSQL (für Benutzer und Datei-Metadaten)
- **Dateispeicherung**: Netlify Blobs (für die eigentlichen Dateien)
- **Authentifizierung**: JWT Tokens
- **Hosting**: Netlify

### Projekt-Struktur:
```
portal.byght.io/
├── src/
│   ├── components/      # React-Komponenten
│   ├── contexts/         # React Contexts (Auth)
│   ├── App.jsx          # Hauptkomponente
│   └── index.css        # Globale Styles
├── netlify/
│   └── functions/       # Serverless Functions
├── dist/                # Build-Output
├── netlify.toml         # Netlify-Konfiguration
└── package.json         # Projektabhängigkeiten
```

## 🔒 Sicherheit

- Passwörter werden mit bcrypt gehasht
- JWT-Tokens für Session-Management
- Zugriffskontrolle auf Datei-Ebene
- Admin-only Bereiche geschützt
- PostgreSQL-Datenbank mit verschlüsselten Verbindungen
- Sichere Dateispeicherung in Netlify Blobs

## 📝 API-Endpunkte

Alle API-Endpunkte sind unter `/.netlify/functions/` verfügbar:

- `POST /auth-login` - Benutzeranmeldung
- `GET /files-list` - Dateien für aktuellen Benutzer
- `GET /files-download` - Datei herunterladen
- `GET /admin-files-list` - Alle Dateien (Admin)
- `GET /admin-users-list` - Alle Benutzer (Admin)
- `POST /admin-create-user` - Benutzer erstellen (Admin)
- `DELETE /admin-delete-user` - Benutzer löschen (Admin)
- `POST /admin-upload-file` - Datei hochladen (Admin)
- `DELETE /admin-delete-file` - Datei löschen (Admin)

## 🤝 Support

Bei Fragen oder Problemen wende dich an das Byght-Team.

## 📄 Lizenz

© 2025 Byght GmbH - Alle Rechte vorbehalten