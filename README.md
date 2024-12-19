A) Einrichtung und Ausführung

Voraussetzungen:

1- Node.js und npm (Node Package Manager) sind installiert.

2- MySQL-Datenbank ist eingerichtet und zugänglich.

Schritte zur Einrichtung:

Repository klonen:

git clone https://github.com/AhmadHajyOmar/Reklamations-API.git

Abhängigkeiten installieren:

npm install express swagger-ui-express body-parser mysql2 dotenv fs crypto

Datenbank konfigurieren:

Erstelle eine MySQL-Datenbank namens reklamationen_db.

Passe die Zugangsdaten in der datenbank.js Datei an:

const pool = mysql.createPool({
    host: "Hostname des MySQL-Servers ", // Hostname des MySQL-Servers (lokal in diesem Fall)
    user: "Benutzername für die MySQL-Datenbank", // Benutzername für die MySQL-Datenbank
    password: "password", // Passwort für die MySQL-Datenbank
    database: "Name der Datenbank", // Name der Datenbank, die verwendet wird
    port: MySQL-Port, // Standard-MySQL-Port
    waitForConnections: true, // Wartet auf eine Verbindung, wenn alle Verbindungen verwendet werden
    connectionLimit: 10, // Maximale Anzahl gleichzeitiger Verbindungen
    queueLimit: 0 // Keine Begrenzung für die Warteschlange von Verbindungen
});

Swagger-Dokumentation:

Stelle sicher, dass swagger.json im Projektverzeichnis vorhanden ist.

Server starten:

npm start oder node server.js

Die API läuft nun auf http://localhost:3000.

B) Designentscheidungen und Technologien:

Verwendete Technologien:

1- Node.js: Plattform für den Server, schnell und effizient.

2- Express.js: Einfache Bibliothek für APIs.

3- MySQL: Datenbank zum Speichern von Reklamationen.

4- swagger-ui-express: Macht die API einfach testbar.

5- dotenv: Zum Verwalten von Passwörtern und anderen wichtigen Daten.

6- body-parser: Zum Verarbeiten von JSON-Daten.


Gründe für Entscheidungen:

1- Node.js & Express.js:

1.1- Diese Technologien sind einfach zu verwenden und gut dokumentiert.

1.2- Node.js ist effizient, da es asynchron arbeitet, und Express erleichtert die Entwicklung von APIs.

2- MySQL:

2.1- MySQL ist eine zuverlässige Datenbank für strukturierte Daten.

2.2- Sie eignet sich gut für das Speichern und Abfragen von Reklamationen, da sie SQL für schnelle und präzise Abfragen nutzt.

3- Swagger:

3.1- Swagger ermöglicht die Dokumentation und das einfache Testen der API.

3.2- Es hilft Entwicklern und Nutzern, die API zu verstehen und zu verwenden.

4- dotenv:

4.1- Sensible Daten wie Passwörter bleiben sicher und sind leicht zu ändern.

4.2- Konfigurationsdaten werden getrennt vom Quellcode verwaltet.

5- body-parser:

5.1- Vereinfacht das Verarbeiten von JSON-Daten in Anfragen.

5.2- Es ist wichtig, da die meisten Anfragen JSON-Daten enthalten.


C) API-Dokumentation

Basis-URL

http://localhost:3000

Endpunkte:

POST:
1- POST /
Beschreibung: Erstellt eine neue Reklamation.
Anfrage:
{
  "produktId": 101,
  "kunde": { "name": "Ahmad Hajy Omar", "email": "ahmad@gmail.com" },
  "datum": "2024-11-11",
  "beschreibung": "Produkt beschädigt"
}
Antwort:
{
  "id": "34hfr45.....",
  "produktId": 101,
  "kunde": { "name": "Ahmad Hajy Omar", "email": "ahmad@gmail.com" },
  "datum": "2024-11-11",
  "beschreibung": "Produkt beschädigt",
  "status": "Open"
}
--------------------------------------------------------
Get
1. GET /
Beschreibung: Gibt alle Reklamationen zurück.
Antwort:
[
 {
  "id": "34hfr45.....",
  "produktId": 101,
  "kunde": { "name": "Ahmad Hajy Omar", "email": "ahmad@gmail.com" },
  "datum": "2024-11-11",
  "beschreibung": "Produkt beschädigt",
  "status": "Open"
  }
]

2- GET /nameAuf

Beschreibung: Sortiert Reklamationen nach Namen aufsteigend.

3- GET /nameAb

Beschreibung: Sortiert Reklamationen nach Namen absteigend.

4- GET /pidAuf

Beschreibung: Sortiert Reklamationen nach Produkt-ID aufsteigend.

5- GET /pidAb

Beschreibung: Sortiert Reklamationen nach Produkt-ID absteigend.

6- GET /:id

Beschreibung: Gibt eine spezifische Reklamation anhand ihrer ID zurück.

7- GET /datum/:datum

Beschreibung: Gibt Reklamationen mit einem bestimmten Datum zurück.

8- GET /produkt/:produktId

Beschreibung: Gibt Reklamationen mit einer bestimmten Produkt-ID zurück.

9- GET /name/:name

Beschreibung: Gibt Reklamationen eines bestimmten Kunden zurück.

10- GET /status/:status

Beschreibung: Gibt Reklamationen mit einem bestimmten Status zurück.

11- GET /statistik/name/:name

Beschreibung: Gibt die Anzahl der Reklamationen eines bestimmten Kunden zurück.

12- GET /statistik/name/

Beschreibung: Gibt die Anzahl der Reklamationen für alle Kunden zurück.

13- GET /statistik/anzahlStatus

Beschreibung: Gibt die Anzahl der Reklamationen für jeden Status zurück.

--------------------------------------------------------
PUT

1- PUT /:id
Beschreibung: Aktualisiert eine Reklamation anhand ihrer ID.

2- PUT /produkt/:produktId
Beschreibung: Aktualisiert den Status von Reklamationen einer bestimmten Produkt-ID.

--------------------------------------------------------
DELETE

1- DELETE /:id

Beschreibung: Löscht eine Reklamation anhand ihrer ID.

2- DELETE /produkt/:produktId

Beschreibung: Löscht alle Reklamationen zu einer bestimmten Produkt-ID.

3- DELETE /datum/:datum

Beschreibung: Löscht alle Reklamationen mit einem bestimmten Datum.

4- DELETE /name/:name

Beschreibung: Löscht alle Reklamationen eines bestimmten Kunden.

D)Testbeschreibung

Die Verwendung von Postman:
Öffnen Sie Postman und senden Sie HTTP-Anfragen an die API.

POST http://localhost:3000/login

Anfrage-Body:
{
  "username": "Ahmad",
  "password": "123456"
}

Antwort (Erfolg):
{
  "nachricht": "Anmeldung erfolgreich"
}

Antwort (Fehler):
{
  "fehler": "Ungültige Anmeldedaten"
}

Nach erfolgreichem Login können Sie weitere API-Endpunkte testen.

Reklamation-Erstellen:
1- POST http://localhost:3000/reklamation/ 

Öffnen Sie das MySQL-Terminal und führen Sie SQL-Abfragen aus:
SELECT * FROM reklamationen;

Verwendung der lokalen JSON-Datei:
1- Alle Daten werden auch in der Datei db.json gespeichert.

2- Öffnen Sie diese Datei und prüfen Sie, ob die Daten korrekt synchronisiert sind

Auf die selbe Weise können GET/PUT/DELETE getestet warden.

