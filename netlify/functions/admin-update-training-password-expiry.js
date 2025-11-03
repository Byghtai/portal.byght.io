import { initDatabase, updateTrainingPasswordExpiry } from './db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export const handler = async (event, context) => {
  // CORS-Header für alle Anfragen
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  // OPTIONS-Anfrage für CORS-Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Nur PUT-Anfragen erlauben
  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Datenbank initialisieren
    await initDatabase();

    // Authorization-Header prüfen
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization token required' }),
      };
    }

    const token = authHeader.split(' ')[1];
    
    // Token validieren
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' }),
      };
    }

    // Prüfen ob User Admin ist
    if (!decoded.isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' }),
      };
    }

    // Request Body parsen
    const { passwordId, expiryDate } = JSON.parse(event.body || '{}');

    if (!passwordId || !expiryDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password ID and expiry date are required' }),
      };
    }

    // Ablaufdatum validieren
    const expiryDateObj = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (expiryDateObj < today) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Expiry date must be in the future' }),
      };
    }

    // Training-Passwort Expiry-Date aktualisieren
    const updated = await updateTrainingPasswordExpiry(parseInt(passwordId), expiryDate);

    if (!updated) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Training password not found' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Training password expiry date updated successfully',
        trainingPassword: {
          id: updated.id,
          expiryDate: updated.expiryDate
        }
      }),
    };

  } catch (error) {
    console.error('Error updating training password expiry:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

