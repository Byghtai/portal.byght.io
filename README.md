# Byght Download Portal

A modern download portal for customers, developed with React, Vite and Netlify Functions.

## 🚀 Features

- **Secure Authentication**: Username/password-based login with JWT
- **File Management**: Upload and manage files via admin panel
- **User Management**: Create and manage users
- **Access Control**: Users only see files assigned to them
- **Modern Design**: Responsive UI in Byght style

## 📋 Prerequisites

- Node.js 18 or higher
- npm or yarn
- Netlify Account
- Neon PostgreSQL database (free available)

## 🛠️ Installation 

1. **Clone repository**
```bash
git clone https://github.com/yourusername/portal.byght.io.git
cd portal.byght.io
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DATABASE_URL=postgresql://username:password@host:port/database
```

## 🚀 Local Development

```bash
# Start development server
npm run dev

# Test Netlify Functions locally
netlify dev
```

## 📦 Deployment to Netlify

### Option 1: Via Netlify CLI

1. **Install Netlify CLI**
```bash
npm install -g netlify-cli
```

2. **Connect to Netlify**
```bash
netlify init
```

3. **Deploy**
```bash
netlify deploy --prod
```

### Option 2: Via GitHub

1. Push repository to GitHub
2. Log into Netlify and choose "New site from Git"
3. Connect repository and configure automatic deployment

### Important Netlify Settings

1. **Set up Neon PostgreSQL database**:
   - Go to [neon.tech](https://neon.tech) and create a free account
   - Create a new project
   - Copy the connection URL (Connection String)
   - Database tables will be created automatically on first login

2. **Set environment variables in Netlify**:
   - Go to Site Settings → Environment Variables
   - Add `JWT_SECRET` with a secure value
   - Add `DATABASE_URL` with your Neon PostgreSQL URL

2. **Configure domain**:
   - Go to Domain Settings
   - Add `portal.byght.io` as Custom Domain

## 👤 Default Admin Access

After the first deployment, you need to create the admin user once:

### Create Admin User:
1. After deployment, visit this URL: `https://your-domain.netlify.app/.netlify/functions/setup-admin`
2. Or make a POST request to this URL
3. The admin user will be created with:
   - **Username**: admin
   - **Password**: admin123

⚠️ **IMPORTANT**: 
- The admin user is only created once and not rewritten on every build
- Change the admin password after first login!
- Keep the setup URL safe in case you need it later

## 📁 File Upload (Admin)

As an admin you can:
1. Navigate to the admin panel (button in dashboard)
2. Upload files and assign them to users
3. Create new users
4. Manage files and users

### Upload Process for Admins:
1. Log in as admin
2. Go to Admin Panel
3. Select "File Management"
4. Upload a file
5. Select the users who should have access
6. Click "Upload File"

## 🔧 Technical Details

### Technologies Used:
- **Frontend**: React, Vite, Tailwind CSS, React Router
- **Backend**: Netlify Functions (Serverless)
- **Database**: Neon PostgreSQL (for users and file metadata)
- **File Storage**: S3-compatible Object Storage (for actual files)
- **Authentication**: JWT Tokens
- **Hosting**: Netlify

### S3 Storage Configuration:
Das System verwendet S3-kompatiblen Object Storage für die Dateispeicherung. Siehe `S3_STORAGE_SETUP.md` für detaillierte Konfigurationsanweisungen.

### Project Structure:
```
portal.byght.io/
├── src/
│   ├── components/      # React components
│   ├── contexts/         # React contexts (Auth)
│   ├── App.jsx          # Main component
│   └── index.css        # Global styles
├── netlify/
│   └── functions/       # Serverless functions
├── dist/                # Build output
├── netlify.toml         # Netlify configuration
└── package.json         # Project dependencies
```

## 🔒 Security

- Passwords are hashed with bcrypt
- JWT tokens for session management
- Access control at file level
- Admin-only areas protected
- PostgreSQL database with encrypted connections
- Secure file storage in Netlify Blobs

## 📝 API Endpoints

All API endpoints are available under `/.netlify/functions/`:

- `POST /auth-login` - User login
- `GET /files-list` - Files for current user
- `GET /files-download` - Download file
- `GET /admin-files-list` - All files (Admin)
- `GET /admin-users-list` - All users (Admin)
- `POST /admin-create-user` - Create user (Admin)
- `DELETE /admin-delete-user` - Delete user (Admin)
- `POST /admin-upload-file` - Upload file (Admin)
- `DELETE /admin-delete-file` - Delete file (Admin)

## 🤝 Support

For questions or issues, contact the Byght team.

## 📄 License

© 2025 Byght GmbH - All rights reserved