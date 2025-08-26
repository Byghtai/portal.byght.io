# 🚀 Deployment Guide for Byght Portal

This guide walks you through deploying the application on Netlify with Neon PostgreSQL.

## 📋 Prerequisites

- GitHub Account
- Netlify Account (free)
- Neon PostgreSQL Account (free)

## 🗄️ Step 1: Set up Neon PostgreSQL Database

### 1.1 Create Neon Account
1. Go to [neon.tech](https://neon.tech)
2. Click "Sign Up" and create a free account
3. Verify your email address

### 1.2 Create New Project
1. After login, click "Create New Project"
2. Choose a project name (e.g., "byght-portal")
3. Choose a region (e.g., "Frankfurt" for better performance in Germany)
4. Click "Create Project"

### 1.3 Copy Connection URL
1. After project creation, you'll see the connection URL
2. Copy the URL (it looks like: `postgresql://username:password@host:port/database`)
3. **Important**: Save this URL securely - you'll need it for Netlify

## 🌐 Step 2: Create Netlify Site

### 2.1 Connect GitHub Repository
1. Go to [netlify.com](https://netlify.com) and log in
2. Click "Add new site" → "Import an existing project"
3. Choose "GitHub" as Git provider
4. Select your repository `portal.byght.io`
5. Click "Deploy site"

### 2.2 Configure Build Settings
Netlify should automatically detect the correct settings:
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: `18`

If not, set these manually.

## 🔧 Step 3: Set Environment Variables

### 3.1 Generate JWT Secret
Generate a secure JWT secret:
```bash
# Execute in command line:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3.2 Add Environment Variables in Netlify
1. Go to your Netlify site
2. Click "Site settings" → "Environment variables"
3. Add the following variables:

| Variable | Value | Description |
|----------|------|--------------|
| `JWT_SECRET` | `your-generated-jwt-secret` | Secure JWT signing |
| `DATABASE_URL` | `your-neon-postgresql-url` | Neon database connection |

### 3.2.1 Example Environment Variables:
```
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
DATABASE_URL=postgresql://username:password@ep-cool-name-123456.eu-west-2.aws.neon.tech/neondb
```

## 🌍 Step 4: Configure Custom Domain

### 4.1 Add Domain
1. Go to "Domain settings" in your Netlify site
2. Click "Add custom domain"
3. Enter `portal.byght.io`
4. Follow the DNS instructions

### 4.2 DNS Settings
Add the following DNS records at your domain provider:
```
Type: CNAME
Name: portal
Value: your-netlify-site.netlify.app
```

## ✅ Step 5: Test Deployment

### 5.1 Create Admin User
1. After deployment, visit this URL: `https://portal.byght.io/.netlify/functions/setup-admin`
2. The admin user will be created with:
   - **Username**: `admin`
   - **Password**: `admin123`

### 5.2 Test First Login
1. Go to `https://portal.byght.io`
2. You should be redirected to the login page
3. Log in with the created credentials:
   - **Username**: `admin`
   - **Password**: `admin123`

### 5.2 Check Database Tables
Tables are created automatically on first login. You can check them in the Neon Console:
1. Go to your Neon project
2. Click "SQL Editor"
3. Execute: `SELECT * FROM users;`

### 5.3 Test Admin Panel
1. After login, you'll see the "Admin Panel" button
2. Click it and test:
   - Create new user
   - Upload file
   - Assign file to user

## 🔒 Step 6: Security

### 6.1 Change Admin Password
1. Log in as admin
2. Go to Admin Panel
3. Create a new admin user
4. Log out and log back in with the new admin
5. Delete the default admin user

### 6.2 Check SSL Certificate
Netlify provides SSL certificates automatically. Verify that `https://portal.byght.io` works.

## 🚨 Troubleshooting

### Problem: "Database connection failed"
- Check the `DATABASE_URL` in Netlify environment variables
- Make sure the Neon database is running
- Check firewall settings

### Problem: "JWT verification failed"
- Generate a new JWT_SECRET
- Make sure it's set in environment variables
- Redeploy the site

### Problem: "File upload failed"
- Check Netlify Blobs configuration
- Make sure the site ID is correct
- Check Netlify Functions logs

## 📊 Monitoring

### Netlify Functions Logs
1. Go to your Netlify site
2. Click "Functions"
3. Check logs for errors

### Neon Database Monitoring
1. Go to your Neon project
2. Click "Metrics"
3. Monitor database performance

## 🔄 Updates

### Deploy Code Changes
1. Push changes to GitHub
2. Netlify deploys automatically
3. Check deployment logs

### Database Migrations
The database schema is created automatically on first login. For schema changes:
1. Modify SQL statements in `netlify/functions/db.js`
2. Deploy changes
3. Tables will be updated on next login

## 💰 Costs

### Free Limits
- **Neon**: 3 projects, 0.5 GB storage, 10 GB transfer
- **Netlify**: 100 GB bandwidth, 300 build minutes/month
- **Netlify Functions**: 125,000 calls/month

### Upgrade Options
- **Neon Pro**: $10/month for more storage and performance
- **Netlify Pro**: $19/month for more bandwidth and build minutes

---

## 🎉 Done!

Your Byght Portal application is now running at:
- **URL**: https://portal.byght.io
- **Database**: Neon PostgreSQL
- **Hosting**: Netlify
- **File Storage**: Netlify Blobs

The application is ready for production use!
