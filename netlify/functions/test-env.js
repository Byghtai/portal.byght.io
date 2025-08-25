import { initDatabase } from './db.js';

export default async (req, context) => {
  try {
    // Umgebungsvariablen überprüfen
    const envCheck = {
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      NETLIFY_DATABASE_URL: process.env.NETLIFY_DATABASE_URL ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET'
    };

    // DATABASE_URL Details (ohne Passwort)
    let dbUrlInfo = 'NOT SET';
    const actualDbUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    if (actualDbUrl) {
              try {
          const url = new URL(actualDbUrl);
        dbUrlInfo = {
          protocol: url.protocol,
          host: url.hostname,
          port: url.port,
          database: url.pathname.slice(1),
          username: url.username,
          hasPassword: !!url.password
        };
      } catch (error) {
        dbUrlInfo = `INVALID URL: ${error.message}`;
      }
    }

    // Datenbankverbindung testen
    let dbStatus = 'NOT TESTED';
    let dbError = null;
    try {
      await initDatabase();
      dbStatus = 'SUCCESS';
    } catch (dbError) {
      dbStatus = `ERROR: ${dbError.message}`;
    }

    return new Response(JSON.stringify({
      environment: envCheck,
      databaseUrl: dbUrlInfo,
      database: dbStatus,
      timestamp: new Date().toISOString(),
      siteId: context.site?.id || 'NOT AVAILABLE'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
