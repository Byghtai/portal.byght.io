import { initDatabase } from './db.js';

export default async (req, context) => {
  try {
    // Umgebungsvariablen überprüfen
    const envCheck = {
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET'
    };

    // Datenbankverbindung testen
    let dbStatus = 'NOT TESTED';
    try {
      await initDatabase();
      dbStatus = 'SUCCESS';
    } catch (dbError) {
      dbStatus = `ERROR: ${dbError.message}`;
    }

    return new Response(JSON.stringify({
      environment: envCheck,
      database: dbStatus,
      timestamp: new Date().toISOString()
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
