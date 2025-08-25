import { Pool } from 'pg';

// PostgreSQL-Verbindung konfigurieren
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Für Netlify immer SSL verwenden
});

// Datenbank-Tabellen initialisieren
export async function initDatabase() {
  const client = await pool.connect();
  try {
    // Users-Tabelle erstellen
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        expiry_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Files-Tabelle erstellen
    await client.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100),
        description TEXT,
        blob_key VARCHAR(255) NOT NULL,
        uploaded_by INTEGER REFERENCES users(id),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // File-User-Zuordnungstabelle erstellen
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_user_assignments (
        id SERIAL PRIMARY KEY,
        file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(file_id, user_id)
      )
    `);
    
    // Index für bessere Performance beim Löschen
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_file_user_assignments_file_id 
      ON file_user_assignments(file_id)
    `);

  } catch (error) {
    console.error('Datenbank-Initialisierung fehlgeschlagen:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Admin-User erstellen (nur einmalig beim ersten Setup)
export async function createAdminUserIfNotExists() {
  const client = await pool.connect();
  try {
    // Prüfen ob Admin-User bereits existiert
    const adminCheck = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('admin123', 10);
      await client.query(
        'INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, $3)',
        ['admin', hashedPassword, true]
      );
      console.log('Standard-Admin-Benutzer erstellt');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Fehler beim Erstellen des Admin-Users:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Benutzer nach Username finden
export async function findUserByUsername(username) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, username, password_hash, is_admin, expiry_date FROM users WHERE username = $1',
      [username]
    );
    if (result.rows[0]) {
      return {
        id: result.rows[0].id,
        username: result.rows[0].username,
        password_hash: result.rows[0].password_hash,
        isAdmin: result.rows[0].is_admin,
        expiry_date: result.rows[0].expiry_date
      };
    }
    return null;
  } finally {
    client.release();
  }
}

// Benutzer nach ID finden
export async function findUserById(id) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, username, is_admin, created_at FROM users WHERE id = $1',
      [id]
    );
    if (result.rows[0]) {
      return {
        id: result.rows[0].id,
        username: result.rows[0].username,
        isAdmin: result.rows[0].is_admin,
        createdAt: result.rows[0].created_at
      };
    }
    return null;
  } finally {
    client.release();
  }
}

// Alle Benutzer abrufen (ohne Passwörter)
export async function getAllUsers() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        u.id, 
        u.username, 
        u.is_admin, 
        u.expiry_date, 
        u.created_at,
        COUNT(fua.file_id) as file_count
      FROM users u
      LEFT JOIN file_user_assignments fua ON u.id = fua.user_id
      GROUP BY u.id, u.username, u.is_admin, u.expiry_date, u.created_at
      ORDER BY u.created_at DESC
    `);
    // Konvertiere snake_case zu camelCase für das Frontend
    return result.rows.map(row => ({
      id: row.id,
      username: row.username,
      isAdmin: row.is_admin,
      expiryDate: row.expiry_date,
      createdAt: row.created_at,
      fileCount: parseInt(row.file_count)
    }));
  } finally {
    client.release();
  }
}

// Neuen Benutzer erstellen
export async function createUser(username, passwordHash, isAdmin = false, expiryDate = null) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'INSERT INTO users (username, password_hash, is_admin, expiry_date) VALUES ($1, $2, $3, $4) RETURNING id, username, is_admin, expiry_date, created_at',
      [username, passwordHash, isAdmin, expiryDate]
    );
    if (result.rows[0]) {
      return {
        id: result.rows[0].id,
        username: result.rows[0].username,
        isAdmin: result.rows[0].is_admin,
        expiryDate: result.rows[0].expiry_date,
        createdAt: result.rows[0].created_at
      };
    }
    return null;
  } finally {
    client.release();
  }
}

// Benutzer löschen
export async function deleteUser(userId) {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
  } finally {
    client.release();
  }
}

// Benutzer-Ablaufdatum aktualisieren
export async function updateUserExpiryDate(userId, expiryDate) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'UPDATE users SET expiry_date = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, is_admin, expiry_date',
      [expiryDate, userId]
    );
    if (result.rows[0]) {
      return {
        id: result.rows[0].id,
        username: result.rows[0].username,
        isAdmin: result.rows[0].is_admin,
        expiryDate: result.rows[0].expiry_date
      };
    }
    return null;
  } finally {
    client.release();
  }
}

// Datei-Metadaten speichern
export async function saveFileMetadata(filename, fileSize, mimeType, description, blobKey, uploadedBy) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO files (filename, file_size, mime_type, description, blob_key, uploaded_by) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [filename, fileSize, mimeType, description, blobKey, uploadedBy]
    );
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

// Datei-Benutzer-Zuordnung erstellen
export async function assignFileToUsers(fileId, userIds) {
  const client = await pool.connect();
  try {
    for (const userId of userIds) {
      await client.query(
        'INSERT INTO file_user_assignments (file_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [fileId, userId]
      );
    }
  } finally {
    client.release();
  }
}

// Dateien für einen Benutzer abrufen
export async function getFilesForUser(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT f.id, f.filename, f.file_size as size, f.mime_type as mimeType, 
             f.description, f.uploaded_at as uploadedAt, f.blob_key as blobKey
      FROM files f
      INNER JOIN file_user_assignments fua ON f.id = fua.file_id
      WHERE fua.user_id = $1
      ORDER BY f.uploaded_at DESC
    `, [userId]);
    return result.rows.map(row => ({
      ...row,
      uploadedAt: row.uploadedat ? new Date(row.uploadedat).toISOString() : null
    }));
  } finally {
    client.release();
  }
}

// Alle Dateien für Admin abrufen
export async function getAllFiles() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT f.id, f.filename, f.file_size as size, f.mime_type as mimeType, 
             f.description, f.uploaded_at as uploadedAt, f.blob_key as blobKey,
             array_agg(u.username) as assigned_users
      FROM files f
      LEFT JOIN file_user_assignments fua ON f.id = fua.file_id
      LEFT JOIN users u ON fua.user_id = u.id
      GROUP BY f.id, f.filename, f.file_size, f.mime_type, f.description, f.uploaded_at, f.blob_key
      ORDER BY f.uploaded_at DESC
    `);
    return result.rows.map(row => ({
      ...row,
      assignedUsers: row.assigned_users.filter(user => user !== null),
      uploadedAt: row.uploadedat ? new Date(row.uploadedat).toISOString() : null
    }));
  } finally {
    client.release();
  }
}

// Datei löschen
export async function deleteFile(fileId) {
  const client = await pool.connect();
  try {
    // Transaktion starten
    await client.query('BEGIN');
    
    // Zuerst alle Zuordnungen löschen
    await client.query('DELETE FROM file_user_assignments WHERE file_id = $1', [fileId]);
    
    // Dann die Datei selbst löschen
    const result = await client.query('DELETE FROM files WHERE id = $1 RETURNING id', [fileId]);
    
    // Transaktion bestätigen
    await client.query('COMMIT');
    
    // Prüfen ob eine Zeile gelöscht wurde
    if (result.rowCount === 0) {
      throw new Error('File not found');
    }
    
    return true;
  } catch (error) {
    // Transaktion rückgängig machen bei Fehler
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Datei-Metadaten nach ID abrufen
export async function getFileById(fileId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, filename, file_size as size, mime_type as mimeType, blob_key as blobKey FROM files WHERE id = $1',
      [fileId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

// Prüfen ob Benutzer Zugriff auf Datei hat
export async function hasFileAccess(userId, fileId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT 1 FROM file_user_assignments WHERE file_id = $1 AND user_id = $2',
      [fileId, userId]
    );
    return result.rows.length > 0;
  } finally {
    client.release();
  }
}

// Benutzer-IDs für eine Datei abrufen
export async function getFileUserIds(fileId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT user_id FROM file_user_assignments WHERE file_id = $1',
      [fileId]
    );
    return result.rows.map(row => row.user_id);
  } finally {
    client.release();
  }
}

export { pool };
