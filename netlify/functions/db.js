import { Pool } from 'pg';

// PostgreSQL-Verbindung konfigurieren
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Für Netlify immer SSL verwenden
  max: 20, // Maximale Anzahl von Verbindungen
  idleTimeoutMillis: 30000, // Verbindungen nach 30 Sekunden schließen
  connectionTimeoutMillis: 2000, // Verbindungs-Timeout nach 2 Sekunden
});

// Verbindungsfehler abfangen
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
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
        customer VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Prüfen ob expiry_date Spalte existiert und hinzufügen falls nicht
    try {
      await client.query('SELECT expiry_date FROM users LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "expiry_date" does not exist')) {
        console.log('Adding expiry_date column to users table...');
        await client.query('ALTER TABLE users ADD COLUMN expiry_date DATE');
      } else {
        throw error;
      }
    }

    // Prüfen ob customer Spalte existiert und hinzufügen falls nicht
    try {
      await client.query('SELECT customer FROM users LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "customer" does not exist')) {
        console.log('Adding customer column to users table...');
        await client.query('ALTER TABLE users ADD COLUMN customer VARCHAR(100)');
      } else {
        throw error;
      }
    }

    // Files-Tabelle erstellen
    await client.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100),

        blob_key VARCHAR(255) NOT NULL,
        uploaded_by INTEGER REFERENCES users(id),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        product_label VARCHAR(50),
        version_label VARCHAR(20),
        language_label VARCHAR(20)
      )
    `);

    // Prüfen ob Label-Spalten existieren und hinzufügen falls nicht
    try {
      await client.query('SELECT product_label FROM files LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "product_label" does not exist')) {
        console.log('Adding label columns to files table...');
        await client.query('ALTER TABLE files ADD COLUMN product_label VARCHAR(50)');
        await client.query('ALTER TABLE files ADD COLUMN version_label VARCHAR(20)');
        await client.query('ALTER TABLE files ADD COLUMN language_label VARCHAR(20)');
      } else {
        throw error;
      }
    }

    // Prüfen ob confluence_label Spalte existiert und hinzufügen falls nicht
    try {
      await client.query('SELECT confluence_label FROM files LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "confluence_label" does not exist')) {
        console.log('Adding confluence_label column to files table...');
        await client.query('ALTER TABLE files ADD COLUMN confluence_label VARCHAR(50)');
      } else {
        throw error;
      }
    }

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
    console.error('Database initialization failed:', error);
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
      console.log('Default admin user created');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Benutzer nach Username finden
export async function findUserByUsername(username) {
  const client = await pool.connect();
  try {
    // Prüfen ob expiry_date Spalte existiert
    let hasExpiryDate = true;
    try {
      await client.query('SELECT expiry_date FROM users LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "expiry_date" does not exist')) {
        hasExpiryDate = false;
      } else {
        throw error;
      }
    }

    // Prüfen ob customer Spalte existiert
    let hasCustomer = true;
    try {
      await client.query('SELECT customer FROM users LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "customer" does not exist')) {
        hasCustomer = false;
      } else {
        throw error;
      }
    }

    // Query anpassen basierend auf Spaltenverfügbarkeit
    let selectFields = 'id, username, password_hash, is_admin';
    if (hasExpiryDate) {
      selectFields += ', expiry_date';
    }
    if (hasCustomer) {
      selectFields += ', customer';
    }
    
    const query = `SELECT ${selectFields} FROM users WHERE username = $1`;
    
    const result = await client.query(query, [username]);
    if (result.rows[0]) {
      return {
        id: result.rows[0].id,
        username: result.rows[0].username,
        password_hash: result.rows[0].password_hash,
        isAdmin: result.rows[0].is_admin,
        expiry_date: hasExpiryDate ? result.rows[0].expiry_date : null,
        customer: hasCustomer ? result.rows[0].customer : null
      };
    }
    return null;
  } catch (error) {
    console.error('Database error in findUserByUsername:', error);
    throw error;
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
    // Prüfen ob expiry_date Spalte existiert
    let hasExpiryDate = true;
    try {
      await client.query('SELECT expiry_date FROM users LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "expiry_date" does not exist')) {
        hasExpiryDate = false;
      } else {
        throw error;
      }
    }

    // Prüfen ob customer Spalte existiert
    let hasCustomer = true;
    try {
      await client.query('SELECT customer FROM users LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "customer" does not exist')) {
        hasCustomer = false;
      } else {
        throw error;
      }
    }

    // Query anpassen basierend auf Spaltenverfügbarkeit
    const query = hasExpiryDate && hasCustomer
      ? `SELECT 
          u.id, 
          u.username, 
          u.is_admin, 
          u.expiry_date, 
          u.customer,
          u.created_at,
          COUNT(fua.file_id) as file_count
        FROM users u
        LEFT JOIN file_user_assignments fua ON u.id = fua.user_id
        GROUP BY u.id, u.username, u.is_admin, u.expiry_date, u.customer, u.created_at
        ORDER BY u.created_at DESC`
      : hasExpiryDate
      ? `SELECT 
          u.id, 
          u.username, 
          u.is_admin, 
          u.expiry_date, 
          u.created_at,
          COUNT(fua.file_id) as file_count
        FROM users u
        LEFT JOIN file_user_assignments fua ON u.id = fua.user_id
        GROUP BY u.id, u.username, u.is_admin, u.expiry_date, u.created_at
        ORDER BY u.created_at DESC`
      : `SELECT 
          u.id, 
          u.username, 
          u.is_admin, 
          u.created_at,
          COUNT(fua.file_id) as file_count
        FROM users u
        LEFT JOIN file_user_assignments fua ON u.id = fua.user_id
        GROUP BY u.id, u.username, u.is_admin, u.created_at
        ORDER BY u.created_at DESC`;

    const result = await client.query(query);
    // Konvertiere snake_case zu camelCase für das Frontend
    return result.rows.map(row => ({
      id: row.id,
      username: row.username,
      isAdmin: row.is_admin,
      expiryDate: hasExpiryDate ? row.expiry_date : null,
      customer: hasCustomer ? row.customer : null,
      createdAt: row.created_at,
      fileCount: parseInt(row.file_count)
    }));
  } catch (error) {
    console.error('Database error in getAllUsers:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Neuen Benutzer erstellen
export async function createUser(username, passwordHash, isAdmin = false, expiryDate = null, customer = null) {
  const client = await pool.connect();
  try {
    // Prüfen ob expiry_date Spalte existiert
    let hasExpiryDate = true;
    try {
      await client.query('SELECT expiry_date FROM users LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "expiry_date" does not exist')) {
        hasExpiryDate = false;
      } else {
        throw error;
      }
    }

    // Prüfen ob customer Spalte existiert
    let hasCustomer = true;
    try {
      await client.query('SELECT customer FROM users LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "customer" does not exist')) {
        hasCustomer = false;
      } else {
        throw error;
      }
    }

    // Query anpassen basierend auf Spaltenverfügbarkeit
    let result;
    if (hasExpiryDate && hasCustomer) {
      result = await client.query(
        'INSERT INTO users (username, password_hash, is_admin, expiry_date, customer) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, is_admin, expiry_date, customer, created_at',
        [username, passwordHash, isAdmin, expiryDate, customer]
      );
    } else if (hasExpiryDate) {
      result = await client.query(
        'INSERT INTO users (username, password_hash, is_admin, expiry_date) VALUES ($1, $2, $3, $4) RETURNING id, username, is_admin, expiry_date, created_at',
        [username, passwordHash, isAdmin, expiryDate]
      );
    } else {
      result = await client.query(
        'INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, $3) RETURNING id, username, is_admin, created_at',
        [username, passwordHash, isAdmin]
      );
    }

    if (result.rows[0]) {
      return {
        id: result.rows[0].id,
        username: result.rows[0].username,
        isAdmin: result.rows[0].is_admin,
        expiryDate: hasExpiryDate ? result.rows[0].expiry_date : null,
        customer: hasCustomer ? result.rows[0].customer : null,
        createdAt: result.rows[0].created_at
      };
    }
    return null;
  } catch (error) {
    console.error('Database error in createUser:', error);
    throw error;
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
    // Prüfen ob expiry_date Spalte existiert
    let hasExpiryDate = true;
    try {
      await client.query('SELECT expiry_date FROM users LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "expiry_date" does not exist')) {
        hasExpiryDate = false;
      } else {
        throw error;
      }
    }

    if (!hasExpiryDate) {
      throw new Error('expiry_date Spalte existiert nicht in der Datenbank');
    }

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

// Benutzerdetails aktualisieren (Username, Customer, Password)
export async function updateUserDetails(userId, updates) {
  const client = await pool.connect();
  try {
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (updates.username !== undefined) {
      updateFields.push(`username = $${paramCount}`);
      values.push(updates.username);
      paramCount++;
    }

    if (updates.customer !== undefined) {
      updateFields.push(`customer = $${paramCount}`);
      values.push(updates.customer);
      paramCount++;
    }

    if (updates.passwordHash !== undefined) {
      updateFields.push(`password_hash = $${paramCount}`);
      values.push(updates.passwordHash);
      paramCount++;
    }

    if (updates.expiryDate !== undefined) {
      updateFields.push(`expiry_date = $${paramCount}`);
      values.push(updates.expiryDate);
      paramCount++;
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add userId as the last parameter
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, username, is_admin, expiry_date, customer
    `;

    const result = await client.query(query, values);
    
    if (result.rows[0]) {
      return {
        id: result.rows[0].id,
        username: result.rows[0].username,
        isAdmin: result.rows[0].is_admin,
        expiryDate: result.rows[0].expiry_date,
        customer: result.rows[0].customer
      };
    }
    return null;
  } catch (error) {
    console.error('Database error in updateUserDetails:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Datei-Metadaten speichern
export async function saveFileMetadata(filename, fileSize, mimeType, blobKey, uploadedBy, productLabel = null, versionLabel = null, languageLabel = null, confluenceLabel = null) {
  const client = await pool.connect();
  try {
    console.log('Saving file metadata:', { filename, fileSize, mimeType, blobKey, uploadedBy });
    // Prüfen ob Label-Spalten existieren
    let hasProductLabel = true;
    let hasVersionLabel = true;
    let hasLanguageLabel = true;
    let hasConfluenceLabel = true;
    
    try {
      await client.query('SELECT product_label FROM files LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "product_label" does not exist')) {
        hasProductLabel = false;
      } else {
        throw error;
      }
    }
    
    try {
      await client.query('SELECT version_label FROM files LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "version_label" does not exist')) {
        hasVersionLabel = false;
      } else {
        throw error;
      }
    }
    
    try {
      await client.query('SELECT language_label FROM files LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "language_label" does not exist')) {
        hasLanguageLabel = false;
      } else {
        throw error;
      }
    }
    
    try {
      await client.query('SELECT confluence_label FROM files LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "confluence_label" does not exist')) {
        hasConfluenceLabel = false;
      } else {
        throw error;
      }
    }
    
    // Query anpassen basierend auf Spaltenverfügbarkeit
    const columns = ['filename', 'file_size', 'mime_type', 'blob_key', 'uploaded_by'];
    const values = [filename, fileSize, mimeType, blobKey, uploadedBy];
    const placeholders = ['$1', '$2', '$3', '$4', '$5'];
    let paramIndex = 6;
    
    if (hasProductLabel) {
      columns.push('product_label');
      values.push(productLabel);
      placeholders.push(`$${paramIndex++}`);
    }
    
    if (hasVersionLabel) {
      columns.push('version_label');
      values.push(versionLabel);
      placeholders.push(`$${paramIndex++}`);
    }
    
    if (hasLanguageLabel) {
      columns.push('language_label');
      values.push(languageLabel);
      placeholders.push(`$${paramIndex++}`);
    }
    
    if (hasConfluenceLabel) {
      columns.push('confluence_label');
      values.push(confluenceLabel);
      placeholders.push(`$${paramIndex++}`);
    }
    
    const query = `
      INSERT INTO files (${columns.join(', ')}) 
      VALUES (${placeholders.join(', ')}) 
      RETURNING id
    `;
    
    const result = await client.query(query, values);
    console.log('File metadata saved successfully, ID:', result.rows[0].id);
    return result.rows[0].id;
  } catch (error) {
    console.error('Error saving file metadata:', error);
    throw error;
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

// Alle Dateien für Admin abrufen
export async function getAllFiles() {
  const client = await pool.connect();
  try {
    // Prüfen ob Label-Spalten existieren
    let hasProductLabel = true;
    let hasVersionLabel = true;
    let hasLanguageLabel = true;
    let hasConfluenceLabel = true;
    
    try {
      await client.query('SELECT product_label FROM files LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "product_label" does not exist')) {
        hasProductLabel = false;
      } else {
        throw error;
      }
    }
    
    try {
      await client.query('SELECT version_label FROM files LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "version_label" does not exist')) {
        hasVersionLabel = false;
      } else {
        throw error;
      }
    }
    
    try {
      await client.query('SELECT language_label FROM files LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "language_label" does not exist')) {
        hasLanguageLabel = false;
      } else {
        throw error;
      }
    }
    
    try {
      await client.query('SELECT confluence_label FROM files LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "confluence_label" does not exist')) {
        hasConfluenceLabel = false;
      } else {
        throw error;
      }
    }
    
    // Query anpassen basierend auf Spaltenverfügbarkeit
    const selectFields = [
      'f.id', 'f.filename', 'f.file_size as "size"', 'f.mime_type as "mimeType"',
      'f.uploaded_at as "uploadedAt"', 'f.blob_key as "blobKey"'
    ];
    
    const groupByFields = [
      'f.id', 'f.filename', 'f.file_size', 'f.mime_type', 
      'f.uploaded_at', 'f.blob_key'
    ];
    
    if (hasProductLabel) {
      selectFields.push('f.product_label as "productLabel"');
      groupByFields.push('f.product_label');
    } else {
      selectFields.push('NULL as "productLabel"');
    }
    
    if (hasVersionLabel) {
      selectFields.push('f.version_label as "versionLabel"');
      groupByFields.push('f.version_label');
    } else {
      selectFields.push('NULL as "versionLabel"');
    }
    
    if (hasLanguageLabel) {
      selectFields.push('f.language_label as "languageLabel"');
      groupByFields.push('f.language_label');
    } else {
      selectFields.push('NULL as "languageLabel"');
    }
    
    if (hasConfluenceLabel) {
      selectFields.push('f.confluence_label as "confluenceLabel"');
      groupByFields.push('f.confluence_label');
    } else {
      selectFields.push('NULL as "confluenceLabel"');
    }
    
    selectFields.push('array_agg(u.username) as assigned_users');
    
    const query = `
      SELECT ${selectFields.join(', ')}
      FROM files f
      LEFT JOIN file_user_assignments fua ON f.id = fua.file_id
      LEFT JOIN users u ON fua.user_id = u.id
      GROUP BY ${groupByFields.join(', ')}
      ORDER BY f.uploaded_at DESC
    `;
    
    const result = await client.query(query);
    return result.rows.map(row => ({
      ...row,
      assignedUsers: row.assigned_users.filter(user => user !== null),
      uploadedAt: row.uploadedAt ? new Date(row.uploadedAt).toISOString() : null
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
    console.log(`Fetching file metadata for ID: ${fileId}`);
    
    const result = await client.query(
      'SELECT id, filename, file_size, mime_type, blob_key FROM files WHERE id = $1',
      [fileId]
    );
    
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    
    // Manual mapping to ensure correct property names
    const fileMetadata = {
      id: row.id,
      filename: row.filename,
      size: row.file_size,
      mimeType: row.mime_type,
      blobKey: row.blob_key
    };
    
    if (fileMetadata) {
      console.log(`File metadata found:`, {
        id: fileMetadata.id,
        filename: fileMetadata.filename,
        size: fileMetadata.size,
        mimeType: fileMetadata.mimeType,
        blobKey: fileMetadata.blobKey || 'NULL'
      });
    } else {
      console.log(`No file found with ID: ${fileId}`);
    }
    
    return fileMetadata;
  } catch (error) {
    console.error(`Error fetching file metadata for ID ${fileId}:`, error);
    throw error;
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

// Prüfen ob Benutzer Admin ist
export async function isUserAdmin(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [userId]
    );
    return result.rows.length > 0 && result.rows[0].is_admin;
  } finally {
    client.release();
  }
}

// Alle Admin-Benutzer abrufen
export async function getAllAdminUsers() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id FROM users WHERE is_admin = true'
    );
    return result.rows.map(row => row.id);
  } finally {
    client.release();
  }
}

// Datei automatisch allen Admin-Benutzern zuweisen
export async function assignFileToAllAdmins(fileId) {
  const client = await pool.connect();
  try {
    // Alle Admin-Benutzer abrufen
    const adminUsers = await getAllAdminUsers();
    
    // Datei allen Admins zuweisen
    for (const adminId of adminUsers) {
      await client.query(
        'INSERT INTO file_user_assignments (file_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [fileId, adminId]
      );
    }
  } finally {
    client.release();
  }
}

// Dateien für einen Benutzer abrufen (mit Admin-Sonderbehandlung)
export async function getFilesForUser(userId) {
  const client = await pool.connect();
  try {
    // Prüfen ob Label-Spalten existieren
    let hasProductLabel = true;
    let hasVersionLabel = true;
    let hasLanguageLabel = true;
    let hasConfluenceLabel = true;
    
    try {
      await client.query('SELECT product_label FROM files LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "product_label" does not exist')) {
        hasProductLabel = false;
      } else {
        throw error;
      }
    }
    
    try {
      await client.query('SELECT version_label FROM files LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "version_label" does not exist')) {
        hasVersionLabel = false;
      } else {
        throw error;
      }
    }
    
    try {
      await client.query('SELECT language_label FROM files LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "language_label" does not exist')) {
        hasLanguageLabel = false;
      } else {
        throw error;
      }
    }
    
    try {
      await client.query('SELECT confluence_label FROM files LIMIT 1');
    } catch (error) {
      if (error.message.includes('column "confluence_label" does not exist')) {
        hasConfluenceLabel = false;
      } else {
        throw error;
      }
    }
    
    // Query anpassen basierend auf Spaltenverfügbarkeit
    const selectFields = [
      'f.id', 'f.filename', 'f.file_size as "size"', 'f.mime_type as "mimeType"',
      'f.uploaded_at as "uploadedAt"', 'f.blob_key as "blobKey"'
    ];
    
    if (hasProductLabel) {
      selectFields.push('f.product_label as "productLabel"');
    } else {
      selectFields.push('NULL as "productLabel"');
    }
    
    if (hasVersionLabel) {
      selectFields.push('f.version_label as "versionLabel"');
    } else {
      selectFields.push('NULL as "versionLabel"');
    }
    
    if (hasLanguageLabel) {
      selectFields.push('f.language_label as "languageLabel"');
    } else {
      selectFields.push('NULL as "languageLabel"');
    }
    
    if (hasConfluenceLabel) {
      selectFields.push('f.confluence_label as "confluenceLabel"');
    } else {
      selectFields.push('NULL as "confluenceLabel"');
    }
    
    // Prüfen ob Benutzer Admin ist
    const isAdmin = await isUserAdmin(userId);
    
    if (isAdmin) {
      // Admins bekommen alle Dateien
      const query = `
        SELECT ${selectFields.join(', ')}
        FROM files f
        ORDER BY f.uploaded_at DESC
      `;
      const result = await client.query(query);
      return result.rows.map(row => ({
        ...row,
        uploadedAt: row.uploadedAt ? new Date(row.uploadedAt).toISOString() : null
      }));
    } else {
      // Standard-Benutzer bekommen nur zugewiesene Dateien
      const query = `
        SELECT ${selectFields.join(', ')}
        FROM files f
        INNER JOIN file_user_assignments fua ON f.id = fua.file_id
        WHERE fua.user_id = $1
        ORDER BY f.uploaded_at DESC
      `;
      const result = await client.query(query, [userId]);
      return result.rows.map(row => ({
        ...row,
        uploadedAt: row.uploadedAt ? new Date(row.uploadedAt).toISOString() : null
      }));
    }
  } finally {
    client.release();
  }
}

// Alle bestehenden Dateien allen Admin-Benutzern zuweisen (für Migration)
export async function assignAllExistingFilesToAdmins() {
  const client = await pool.connect();
  try {
    // Alle Admin-Benutzer abrufen
    const adminUsers = await getAllAdminUsers();
    
    // Alle Dateien abrufen
    const result = await client.query('SELECT id FROM files');
    const allFiles = result.rows.map(row => row.id);
    
    // Jede Datei allen Admins zuweisen
    for (const fileId of allFiles) {
      for (const adminId of adminUsers) {
        await client.query(
          'INSERT INTO file_user_assignments (file_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [fileId, adminId]
        );
      }
    }
    
    return { filesProcessed: allFiles.length, adminsProcessed: adminUsers.length };
  } finally {
    client.release();
  }
}

// Migration: Description-Spalte entfernen
export async function removeDescriptionColumn() {
  const client = await pool.connect();
  try {
    // Prüfen ob description-Spalte existiert
    try {
      await client.query('SELECT description FROM files LIMIT 1');
      console.log('Description column exists, removing...');
      
      // Description-Spalte entfernen
      await client.query('ALTER TABLE files DROP COLUMN description');
      console.log('Description column removed successfully');
      
      return { success: true, message: 'Description column removed' };
    } catch (error) {
      if (error.message.includes('column "description" does not exist')) {
        console.log('Description column does not exist');
        return { success: true, message: 'Description column does not exist' };
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error removing description column:', error);
    throw error;
  } finally {
    client.release();
  }
}

export { pool };
