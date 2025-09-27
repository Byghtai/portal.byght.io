import { initDatabase, deleteTrainingPassword } from './db.js';

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

  // Nur DELETE-Anfragen erlauben
  if (event.httpMethod !== 'DELETE') {
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
    
    // TODO: Token-Validierung implementieren
    // Für jetzt nehmen wir an, dass der Token gültig ist

    // Password ID aus Query-Parametern extrahieren
    const { passwordId } = event.queryStringParameters || {};

    if (!passwordId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password ID is required' }),
      };
    }

    // Training-Passwort löschen
    const deleted = await deleteTrainingPassword(parseInt(passwordId));

    if (!deleted) {
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
        message: 'Training password deleted successfully'
      }),
    };

  } catch (error) {
    console.error('Error deleting training password:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
