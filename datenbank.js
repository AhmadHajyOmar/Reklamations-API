const mysql = require("mysql2/promise");

// Erstelle einen Verbindungspool für die MySQL-Datenbank
const pool = mysql.createPool({
    host: "localhost", // Hostname des MySQL-Servers (lokal in diesem Fall)
    user: "root", // Benutzername für die MySQL-Datenbank
    password: "ahonewlife98MS", // Passwort für die MySQL-Datenbank
    database: "reklamationen_db", // Name der Datenbank, die verwendet wird
    port: 3306, // Standard-MySQL-Port
    waitForConnections: true, // Wartet auf eine Verbindung, wenn alle Verbindungen verwendet werden
    connectionLimit: 10, // Maximale Anzahl gleichzeitiger Verbindungen
    queueLimit: 0 // Keine Begrenzung für die Warteschlange von Verbindungen
});

module.exports = pool; // Exportiere den Verbindungspool, damit er in anderen Dateien verwendet werden kann
