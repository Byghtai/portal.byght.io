import { initDatabase, createTrainingPassword } from './db.js';
import bcrypt from 'bcryptjs';

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

  // Nur POST-Anfragen erlauben
  if (event.httpMethod !== 'POST') {
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
    
    // Request Body parsen
    const { password, expiryDate } = JSON.parse(event.body || '{}');

    if (!password || !expiryDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password and expiry date are required' }),
      };
    }

    // Passwort-Validierung (dieselben Regeln wie bei Usern)
    if (password.length < 12) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password must be at least 12 characters long' }),
      };
    }

    let criteriaCount = 0;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (hasUppercase) criteriaCount++;
    if (hasLowercase) criteriaCount++;
    if (hasNumbers) criteriaCount++;
    if (hasSpecialChars) criteriaCount++;

    if (criteriaCount < 3) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Password must contain at least 3 of the following: uppercase letters, lowercase letters, numbers, special characters' 
        }),
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

    // Passwort sicher hashen und salzen
    const hashedPassword = await bcrypt.hash(password, 12); // Höhere Runden für bessere Sicherheit

    // TODO: Aktuelle User-ID aus Token extrahieren
    // Für jetzt verwenden wir eine Dummy-ID
    const createdBy = 1; // TODO: Aus Token extrahieren

    // Training-Passwort in Datenbank speichern (nur Hash)
    const trainingPassword = await createTrainingPassword(hashedPassword, expiryDate, createdBy);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Training password created successfully',
        trainingPassword: {
          id: trainingPassword.id,
          expiryDate: trainingPassword.expiryDate,
          createdAt: trainingPassword.createdAt
        }
      }),
    };

  } catch (error) {
    console.error('Error creating training password:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
