import { createAdminUserIfNotExists } from './db.js';

export default async (req, context) => {
  // CORS Headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers
    });
  }

  try {
    // Admin-User erstellen (nur falls nicht vorhanden)
    const created = await createAdminUserIfNotExists();
    
    if (created) {
      return new Response(JSON.stringify({ 
        message: 'Admin-User erfolgreich erstellt',
        username: 'admin',
        password: 'admin123'
      }), {
        status: 200,
        headers
      });
    } else {
      return new Response(JSON.stringify({ 
        message: 'Admin-User existiert bereits',
        username: 'admin'
      }), {
        status: 200,
        headers
      });
    }
  } catch (error) {
    console.error('Setup admin error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers
    });
  }
};
