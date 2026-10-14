// =============================================
// NEON CELLE — Datenbank-Verbindung (IONOS MySQL)
// =============================================
// Trägt die Zugangsdaten über Umgebungsvariablen ein (siehe .env.example).
// In deinem IONOS-Kundencenter findest du sie unter:
// Hosting -> Datenbanken -> MySQL-Datenbank -> "Datenbank-Zugangsdaten"

require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Legt beim Serverstart automatisch alle benötigten Tabellen an,
// falls sie noch nicht existieren (kein manuelles SQL-Importieren nötig).
async function initSchema() {
    const statements = [
        `CREATE TABLE IF NOT EXISTS umfrage (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titel VARCHAR(255) NOT NULL,
            beschreibung TEXT NULL,
            custom_link VARCHAR(500) NULL,
            aktiv TINYINT(1) NOT NULL DEFAULT 1,
            erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        `CREATE TABLE IF NOT EXISTS umfrage_frage (
            id INT AUTO_INCREMENT PRIMARY KEY,
            umfrage_id INT NOT NULL,
            frage_text VARCHAR(500) NOT NULL,
            frage_typ ENUM('choice','checkbox','dropdown','text') NOT NULL,
            reihenfolge INT NOT NULL DEFAULT 0,
            FOREIGN KEY (umfrage_id) REFERENCES umfrage(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        `CREATE TABLE IF NOT EXISTS umfrage_option (
            id INT AUTO_INCREMENT PRIMARY KEY,
            frage_id INT NOT NULL,
            option_text VARCHAR(255) NOT NULL,
            reihenfolge INT NOT NULL DEFAULT 0,
            FOREIGN KEY (frage_id) REFERENCES umfrage_frage(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        `CREATE TABLE IF NOT EXISTS umfrage_antwort (
            id INT AUTO_INCREMENT PRIMARY KEY,
            umfrage_id INT NOT NULL,
            eingereicht_am DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (umfrage_id) REFERENCES umfrage(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        `CREATE TABLE IF NOT EXISTS umfrage_antwort_detail (
            id INT AUTO_INCREMENT PRIMARY KEY,
            antwort_id INT NOT NULL,
            frage_id INT NOT NULL,
            option_id INT NULL,
            freitext VARCHAR(1000) NULL,
            FOREIGN KEY (antwort_id) REFERENCES umfrage_antwort(id) ON DELETE CASCADE,
            FOREIGN KEY (frage_id) REFERENCES umfrage_frage(id) ON DELETE CASCADE,
            FOREIGN KEY (option_id) REFERENCES umfrage_option(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    ];

    for (const sql of statements) {
        await pool.query(sql);
    }
    console.log('✅ Umfrage-Tabellen in der IONOS-Datenbank sind bereit.');
}

module.exports = { pool, initSchema };
