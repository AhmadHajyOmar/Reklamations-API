express = require('express')
swagger = require('swagger-ui-express')
swaggerOpenAPI = require('./swagger.json')
parser = require('body-parser')
reklamation = require('./reklamation')


applikation = express() // Erstelle eine neue Express-Anwendung

// Middleware, um JSON-Daten in Anfragen automatisch zu verarbeiten
applikation.use(parser.json());

// Routen für die API-Dokumentation bereitstellen
applikation.use('/api-dokumentation', swagger.serve, swagger.setup(swaggerOpenAPI))

// Login-Endpunkt, um Benutzer zu authentifizieren
applikation.post("/login", (req, res) => {
    const { username, password } = req.body; // Lese den Benutzernamen und das Passwort aus der Anfrage
    if (username === "Ahmad" && password === "123456") { // Überprüfe die Anmeldedaten
      req.session.user = { username: "Ahmad", role: "admin", angemeldet: true }; // Speichere Benutzerdetails in der Sitzung
      applikation.use('/reklamation', reklamation) // Aktiviere die Reklamations-Routen nach erfolgreicher Anmeldung
      return res.json({ nachricht: "Anmeldung erfolgreich" }); // Sende eine Erfolgsmeldung zurück
    }
  
    res.status(401).json({ fehler: "Ungültige Anmeldedaten" }); // Sende eine Fehlermeldung bei falschen Anmeldedaten
});

// Server starten und auf Port 3000 hören
applikation.listen(3000, () => {
    console.log('Server ist gestartet auf Port 3000') // Zeige eine Meldung, dass der Server läuft
})

module.exports = applikation; // Exportiere die Anwendung für Tests oder externe Nutzung