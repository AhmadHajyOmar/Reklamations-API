const { randomUUID } = require("crypto");
const express = require("express");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const pool = require("./datenbank");
const router = express.Router();


// Funktion: Lokale JSON-Datenbank lesen
function leseDatenbank() {
    try {
        console.log("erfolgreich gelesen");
        let datenbank = JSON.parse(fs.readFileSync("./db.json")); // Datei lesen und in JSON umwandeln
        return datenbank; // Daten zurückgeben
    } catch (error) {
        console.error("Datenbank konnte nicht gelesen werden", error); // Fehlerprotokollierung
        return []; // Leeres Array zurückgeben, falls Fehler
    }
}

// Funktion: Lokale JSON-Datenbank schreiben
function schreibeDatenbank(daten) {
    let neueJsonDaten = JSON.stringify(daten, null, 2); // JSON-Daten formatieren
    fs.writeFileSync("./db.json", neueJsonDaten); // Daten in Datei schreiben
}

// Funktion: Prüfen, ob eine ID in einer Reklamationsliste existiert
function existiertID(id, reklamationen) {
    return reklamationen.some((r) => r.id === id); // Prüfen, ob ID existiert
}

// Funktion: Validieren, ob ein Name gültig ist (nur Buchstaben)
function istNameGueltig(name) {
    return /^[A-Za-zäöüÖÜß\s]+$/.test(name); // Regex für gültige Namen
}

// Funktion: Validieren, ob eine E-Mail gültig ist
function istEmailGueltig(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); // Regex für E-Mails
}

// Funktion: Validieren, ob ein Datum korrekt ist
function istDatumGueltig(datum) {
    let datumGueltig = /^\d{4}-\d{2}-\d{2}$/.test(datum); // Regex für Datum
    if (!datumGueltig) return false; // Falls ungültig
    let [jahr, monat, tag] = datum.split("-").map(Number); // Datum aufteilen
    return !(jahr < 2024 || monat < 1 || monat > 12 || tag < 1 || tag > 31); // Prüfen
}

// Funktion: Validieren, ob eine Beschreibung nicht leer ist
function istBeschreibungGueltig(beschreibung) {
    return beschreibung && beschreibung.trim().length > 0; // Prüfen, ob Text vorhanden
}

// Funktion: Reklamationen nach Produkt-ID sortieren
function sortiereReklamationenProduktId(reklamationen, reihenfolge) {
    return reklamationen.sort((a, b) => 
        reihenfolge === "aufsteigend" ? a.produktId - b.produktId : b.produktId - a.produktId
    ); // Sortieren nach aufsteigend/absteigend
}

// Funktion: Validieren, ob eine Reklamation vollständig ist
function istReklamationGueltig(reklamation, res, aktion = "post") {
    const { produktId, kunde, datum, beschreibung } = reklamation;
    if (aktion === "post" && (!kunde || !kunde.name || !kunde.email || !datum || !beschreibung)) {
        return res.status(400).json({ fehler: "Bitte alle Pflichtfelder eingeben" }); // Fehler bei unvollständiger Reklamation
    }
    if (kunde.name && !istNameGueltig(kunde.name)) {
        return res.status(400).json({ fehler: "Name muss aus Buchstaben bestehen" }); // Name ungültig
    }
    if (kunde.email && !istEmailGueltig(kunde.email)) {
        return res.status(400).json({ fehler: "E-Mail ist ungültig" }); // E-Mail ungültig
    }
    if (datum && !istDatumGueltig(datum)) {
        return res.status(400).json({ fehler: "Datum muss im Format yyyy-mm-dd sein" }); // Datum ungültig
    }
    if (beschreibung && !istBeschreibungGueltig(beschreibung)) {
        return res.status(400).json({ fehler: "Beschreibung darf nicht leer sein" }); // Beschreibung ungültig
    }
}

// Funktion: Reklamationen nach Kundennamen sortieren
function sortiereReklamationenNachNamen(reklamationen, aufsteigend) {
    return reklamationen
        .filter((r) => r.kunde && r.kunde.name) // Nur Reklamationen mit gültigem Kundennamen
        .sort((a, b) => {
            const nameA = a.kunde.name.toLowerCase();
            const nameB = b.kunde.name.toLowerCase();
            if (nameA < nameB) return aufsteigend ? -1 : 1; // Sortieren aufsteigend
            if (nameA > nameB) return aufsteigend ? 1 : -1; // Sortieren absteigend
            return 0; // Keine Änderung
        });
}

// 1. Reklamation erstellen
router.post("/", async (req, res) => {
    const reklamationen = leseDatenbank(); // Lokale Datenbank lesen

    let reklamation = req.body; // Daten aus Anfrage-Body holen
    const { produktId, kunde, datum, beschreibung } = req.body; // Wichtige Felder extrahieren
    istReklamationGueltig(reklamation, res, "post"); // Validierung durchführen

    let neueid;
    do {
        neueid = randomUUID(); // Einzigartige ID generieren
    } while (existiertID(neueid, reklamationen)); // Sicherstellen, dass ID nicht doppelt ist

    const neueReklamation = {
        id: neueid, // Generierte ID
        ...reklamation, // Restliche Daten
        status: "Open" // Standardstatus
    };

    reklamationen.push(neueReklamation); // Neue Reklamation zur Liste hinzufügen
    schreibeDatenbank(reklamationen); // Lokale Datenbank aktualisieren

    try {
        // Neue Reklamation auch in MySQL-Datenbank speichern
        await pool.query(
            "INSERT INTO reklamationen (id, produkt_id, kunde_name, kunde_email, datum, beschreibung, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [neueid, produktId, kunde.name, kunde.email, datum, beschreibung, "Open"]
        );
        res.status(201).json({ id: neueid, produktId, kunde, datum, beschreibung, status: "Open" }); // Erfolgreiche Antwort
    } catch (error) {
        res.status(500).json({ fehler: "Fehler beim Hinzufügen der Reklamation" }); // Fehlerantwort
    }
});

// 2. Alle Reklamationen anzeigen
router.get("/", async (req, res) => {
    const reklamationen = leseDatenbank();
    //res.json(reklamationen);
    try {
        const [rows] = await pool.query("SELECT * FROM reklamationen");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ fehler: "Fehler beim Abrufen der Reklamationen" });
    }
});

// Route für das Abrufen von Reklamationen in aufsteigender Reihenfolge nach Kundennamen
router.get("/nameAuf", async (req, res) => { 
    // Liest die Reklamationen aus der lokalen JSON-Datenbank
    const reklamationen = leseDatenbank();

    // Sortiert die Reklamationen nach Namen in aufsteigender Reihenfolge
    const reklamationenNachNamen = sortiereReklamationenNachNamen(reklamationen, true);

    // Überprüft, ob keine Reklamationen vorhanden sind
    if (reklamationenNachNamen.length === 0) {
        return res.status(404).json({ fehler: "Keine Reklamationen gefunden" }); // Gibt einen Fehler zurück, falls keine Daten gefunden wurden
    }

    // Holt die Reklamationen aus der MySQL-Datenbank und sortiert sie nach Kundennamen aufsteigend
    try {
        const [rows] = await pool.query("SELECT * FROM reklamationen ORDER BY kunde_name ASC");
        res.json(rows); // Sendet die abgerufenen Daten als JSON-Antwort zurück
    } catch (error) {
        res.status(500).json({ fehler: "Fehler beim Abrufen der Reklamationen" }); // Gibt einen Fehler aus, falls die Abfrage fehlschlägt
    }
});

// Route für das Abrufen von Reklamationen in absteigender Reihenfolge nach Kundennamen
router.get("/nameAb", async (req, res) => { 
    // Liest die Reklamationen aus der lokalen JSON-Datenbank
    const reklamationen = leseDatenbank();

    // Sortiert die Reklamationen nach Namen in absteigender Reihenfolge
    const reklamationenNachNamen = sortiereReklamationenNachNamen(reklamationen, false);

    // Überprüft, ob keine Reklamationen vorhanden sind
    if (reklamationenNachNamen.length === 0) {
        return res.status(404).json({ fehler: "Keine Reklamationen gefunden" }); // Gibt einen Fehler zurück, falls keine Daten gefunden wurden
    }

    // Holt die Reklamationen aus der MySQL-Datenbank und sortiert sie nach Kundennamen absteigend
    try {
        const [rows] = await pool.query("SELECT * FROM reklamationen ORDER BY kunde_name DESC");
        res.json(rows); // Sendet die abgerufenen Daten als JSON-Antwort zurück
    } catch (error) {
        res.status(500).json({ fehler: "Fehler beim Abrufen der Reklamationen" }); // Gibt einen Fehler aus, falls die Abfrage fehlschlägt
    }
});

// Route für das Abrufen von Reklamationen sortiert nach Produkt-ID in aufsteigender Reihenfolge
router.get("/pidAuf", async (req, res) => {
    // Liest die Reklamationen aus der lokalen JSON-Datenbank
    const reklamationen = leseDatenbank();

    // Sortiert die Reklamationen nach Produkt-ID in aufsteigender Reihenfolge
    let sortiereReklamationen = sortiereReklamationenProduktId(reklamationen, "aufsteigend");
    // Die sortierten Daten werden nicht direkt verwendet, da stattdessen die Datenbankabfrage erfolgt

    // Holt die Reklamationen aus der MySQL-Datenbank und sortiert sie nach Produkt-ID aufsteigend
    try {
        const [rows] = await pool.query("SELECT * FROM reklamationen ORDER BY produkt_id ASC");
        res.json(rows); // Sendet die abgerufenen Daten als JSON-Antwort zurück
    } catch (error) {
        res.status(500).json({ fehler: "Fehler beim Abrufen der Reklamationen" }); // Gibt einen Fehler aus, falls die Abfrage fehlschlägt
    }
});

// Route für das Abrufen von Reklamationen sortiert nach Produkt-ID in absteigender Reihenfolge
router.get("/pidAb", async (req, res) => {
    // Liest die Reklamationen aus der lokalen JSON-Datenbank
    const reklamationen = leseDatenbank();

    // Sortiert die Reklamationen nach Produkt-ID in absteigender Reihenfolge
    let sortiereReklamationen = sortiereReklamationenProduktId(reklamationen, "absteigend");
    // Die sortierten Daten werden nicht direkt verwendet, da stattdessen die Datenbankabfrage erfolgt

    // Holt die Reklamationen aus der MySQL-Datenbank und sortiert sie nach Produkt-ID absteigend
    try {
        const [rows] = await pool.query("SELECT * FROM reklamationen ORDER BY produkt_id DESC");
        res.json(rows); // Sendet die abgerufenen Daten als JSON-Antwort zurück
    } catch (error) {
        res.status(500).json({ fehler: "Fehler beim Abrufen der Reklamationen" }); // Gibt einen Fehler aus, falls die Abfrage fehlschlägt
    }
});

// Route zum Abrufen einer Reklamation anhand der ID
router.get("/:id", async (req, res) => {
    const reklamationen = leseDatenbank(); // Liest die Reklamationen aus der lokalen JSON-Datenbank
    const reklamation = reklamationen.find((r) => r.id === req.params.id); // Sucht nach der Reklamation mit der entsprechenden ID

    if (!reklamation) {
        // Wenn keine Reklamation gefunden wird, gibt eine Fehlermeldung zurück
        return res.status(404).json({ fehler: "Reklamation nicht gefunden" });
    }

    // Holt die Reklamation aus der MySQL-Datenbank basierend auf der ID
    try {
        const [rows] = await pool.query("SELECT * FROM reklamationen WHERE id = ?", [req.params.id]);
        if (rows.length === 0) {
            // Fehlermeldung, wenn keine Einträge in der Datenbank gefunden werden
            return res.status(404).json({ fehler: "Reklamation nicht gefunden" });
        }
        res.json(rows[0]); // Gibt die gefundene Reklamation zurück
    } catch (error) {
        console.log(error);
        res.status(500).json({ fehler: "Fehler beim Abrufen der Reklamation" });
    }
});

// Route zum Abrufen von Reklamationen basierend auf einem bestimmten Datum
router.get("/datum/:datum", async (req, res) => {
    const reklamationen = leseDatenbank(); // Liest die Reklamationen aus der lokalen JSON-Datenbank
    let reklamationenNachDatum = reklamationen.filter((r) => r.datum === req.params.datum); // Filtert Reklamationen nach Datum

    if (reklamationenNachDatum.length === 0) {
        return res.status(404).json({ fehler: "Reklamationen mit dem angegebenen Datum nicht gefunden" });
    }

    // Holt die Reklamationen aus der MySQL-Datenbank basierend auf dem Datum
    try {
        const [rows] = await pool.query("SELECT * FROM reklamationen WHERE datum = ?", [req.params.datum]);
        if (rows.length === 0) {
            return res.status(404).json({ fehler: "Keine Reklamationen für das Datum gefunden" });
        }
        res.json(rows); // Gibt die gefundenen Reklamationen zurück
    } catch (error) {
        res.status(500).json({ fehler: "Fehler beim Abrufen der Reklamationen" });
    }
});

// Route zum Abrufen von Reklamationen basierend auf der Produkt-ID
router.get("/produkt/:produktId", async (req, res) => {
    const reklamationen = leseDatenbank(); // Liest die Reklamationen aus der lokalen JSON-Datenbank
    let reklamationenNachProduktID = reklamationen.filter((r) => r.produktId == req.params.produktId); // Filtert Reklamationen nach Produkt-ID

    if (reklamationenNachProduktID.length === 0) {
        return res.status(404).json({ fehler: "Reklamationen mit der angegebenen Produkt-ID nicht gefunden" });
    }

    // Holt die Reklamationen aus der MySQL-Datenbank basierend auf der Produkt-ID
    try {
        const [rows] = await pool.query("SELECT * FROM reklamationen WHERE produkt_id = ?", [req.params.produktId]);
        if (rows.length === 0) {
            return res.status(404).json({ fehler: "Keine Reklamationen für diese Produkt-ID gefunden" });
        }
        res.json(rows); // Gibt die gefundenen Reklamationen zurück
    } catch (error) {
        res.status(500).json({ fehler: "Fehler beim Abrufen der Reklamationen" });
    }
});

// Route zum Abrufen von Reklamationen basierend auf dem Namen des Kunden
router.get("/name/:name", async (req, res) => {
    const reklamationen = leseDatenbank(); // Liest die Reklamationen aus der lokalen JSON-Datenbank
    let reklamationenNachNamen = reklamationen.filter((r) => r.kunde.name.toLowerCase() === req.params.name.toLowerCase()); // Filtert Reklamationen nach Kundennamen

    if (reklamationenNachNamen.length === 0) {
        return res.status(404).json({ fehler: "Reklamationen mit dem angegebenen Namen nicht gefunden" });
    }

    // Holt die Reklamationen aus der MySQL-Datenbank basierend auf dem Kundennamen
    try {
        const [rows] = await pool.query("SELECT * FROM reklamationen WHERE kunde_name = ?", [req.params.name]);
        if (rows.length === 0) {
            return res.status(404).json({ fehler: "Keine Reklamationen mit diesem Namen gefunden" });
        }
        res.json(rows); // Gibt die gefundenen Reklamationen zurück
    } catch (error) {
        res.status(500).json({ fehler: "Fehler beim Abrufen der Reklamationen" });
    }
});

// Route zum Abrufen von Reklamationen basierend auf dem Status
router.get("/status/:status", async (req, res) => {
    const reklamationen = leseDatenbank(); // Liest die Reklamationen aus der lokalen JSON-Datenbank
    const erlaubteStatus = ["Open", "InProgress", "Rejected", "Accepted", "Canceled"]; // Erlaubte Statuswerte

    const status = req.params.status;

    if (!erlaubteStatus.includes(status)) {
        return res.status(400).json({ fehler: "Ungültiger Status. Erlaubte Status sind: Open, InProgress, Rejected, Accepted, Canceled." });
    }

    const reklamationenNachStatus = reklamationen.filter((r) => r.status === status);

    if (reklamationenNachStatus.length === 0) {
        return res.status(404).json({ fehler: `Keine Reklamationen mit dem Status '${status}' gefunden.` });
    }

    // Holt die Reklamationen aus der MySQL-Datenbank basierend auf dem Status
    try {
        const [rows] = await pool.query("SELECT * FROM reklamationen WHERE status = ?", [status]);
        if (rows.length === 0) {
            return res.status(404).json({ fehler: `Keine Reklamationen mit dem Status '${status}' gefunden` });
        }
        res.json(rows); // Gibt die gefundenen Reklamationen zurück
    } catch (error) {
        res.status(500).json({ fehler: "Fehler beim Abrufen der Reklamationen" });
    }
});



// Route zum Aktualisieren einer einzelnen Reklamation basierend auf ihrer ID
router.put("/:id", async (req, res) => {
    const reklamationen = leseDatenbank(); // Liest die Reklamationen aus der lokalen JSON-Datenbank
    const { produktId, kunde, datum, beschreibung, status } = req.body; // Extrahiert die benötigten Felder aus dem Anfragekörper
    var index = reklamationen.findIndex((r) => r.id === req.params.id); // Sucht die Reklamation in der lokalen Datenbank basierend auf der ID

    if (index === -1) {
        // Gibt eine Fehlermeldung zurück, wenn die Reklamation nicht gefunden wurde
        return res.status(404).json({ fehler: "Reklamation nicht gefunden" });
    }

    if (!(reklamationen[index].status != "Open") && !(reklamationen[index].status != "InProgress")) {
        // Verhindert die Aktualisierung, wenn der Status nicht zulässig ist
        return res.status(400).json({ fehler: "Reklamation kann nicht mehr geändert werden" });
    }

    let reklamation = req.body;
    istReklamationGueltig(reklamation, res, "put"); // Validiert die eingegebenen Daten

    // Aktualisiert die Reklamation in der lokalen JSON-Datenbank
    reklamationen[index] = { ...reklamationen[index], ...req.body };
    schreibeDatenbank(reklamationen);

    // Aktualisiert die Reklamation in der MySQL-Datenbank
    try {
        const [result] = await pool.query(
            "UPDATE reklamationen SET produkt_id = ?, kunde_name = ?, kunde_email = ?, datum = ?, beschreibung = ?, status = ? WHERE id = ?",
            [produktId, kunde.name, kunde.email, datum, beschreibung, status, req.params.id]
        );
        if (result.affectedRows === 0) {
            // Gibt eine Fehlermeldung zurück, wenn keine Zeilen aktualisiert wurden
            return res.status(404).json({ fehler: "Reklamation nicht gefunden" });
        }
        res.json({ nachricht: "Reklamation aktualisiert" }); // Erfolgreiche Aktualisierung
    } catch (error) {
        console.log(error);
        res.status(500).json({ fehler: "Fehler beim Aktualisieren der Reklamation" });
    }
});

// Route zum Aktualisieren des Status von Reklamationen basierend auf der Produkt-ID
router.put("/produkt/:produktId", async (req, res) => {
    const reklamationen = leseDatenbank(); // Liest die Reklamationen aus der lokalen JSON-Datenbank
    const { produktId } = req.params; // Holt die Produkt-ID aus den Anfrageparametern
    const { status } = req.body; // Holt den neuen Status aus dem Anfragekörper

    const erlaubteStatus = ["Open", "InProgress"]; // Zulässige aktuelle Statuswerte
    const gueltigeNeueStatus = ["Rejected", "Accepted", "Canceled", "InProgress"]; // Zulässige neue Statuswerte

    if (!gueltigeNeueStatus.includes(status)) {
        // Gibt eine Fehlermeldung zurück, wenn der neue Status nicht zulässig ist
        return res.status(400).json({ fehler: "Ungültiger neuer Status" });
    }

    // Filtert die Reklamationen in der lokalen Datenbank nach Produkt-ID
    const gefilterteReklamationen = reklamationen.filter(
        (r) => r.produktId === parseInt(produktId)
    );

    if (gefilterteReklamationen.length === 0) {
        // Gibt eine Fehlermeldung zurück, wenn keine Reklamationen für die Produkt-ID gefunden wurden
        return res.status(404).json({ fehler: "Keine Reklamationen für diese Produkt-ID gefunden" });
    }

    // Aktualisiert die Statuswerte in der lokalen JSON-Datenbank
    let aktualisierteReklamationen = [];
    gefilterteReklamationen.forEach((reklamation) => {
        if (erlaubteStatus.includes(reklamation.status)) {
            reklamation.status = status;
            aktualisierteReklamationen.push(reklamation);
        }
    });

    if (aktualisierteReklamationen.length === 0) {
        // Gibt eine Fehlermeldung zurück, wenn keine Statusänderungen vorgenommen wurden
        return res.status(400).json({
            fehler: "Keine Reklamationen konnten geändert werden, da sie nicht im Status 'Open' oder 'InProgress' sind."
        });
    }

    schreibeDatenbank(reklamationen); // Speichert die Änderungen in der lokalen JSON-Datenbank

    // Aktualisiert die Statuswerte in der MySQL-Datenbank
    try {
        const [rows] = await pool.query("SELECT * FROM reklamationen WHERE produkt_id = ?", [produktId]);

        if (rows.length === 0) {
            return res.status(404).json({ fehler: "Keine Reklamationen für diese Produkt-ID gefunden" });
        }

        const aktualisierteReklamationen = [];
        for (let reklamation of rows) {
            if (erlaubteStatus.includes(reklamation.status)) {
                await pool.query(
                    "UPDATE reklamationen SET status = ? WHERE id = ?",
                    [status, reklamation.id]
                );
                aktualisierteReklamationen.push(reklamation.id);
            }
        }

        if (aktualisierteReklamationen.length === 0) {
            return res.status(400).json({
                fehler: "Keine Reklamationen konnten geändert werden, da sie nicht im Status 'Open' oder 'InProgress' sind."
            });
        }

        res.json({
            nachricht: "Status erfolgreich aktualisiert",
            aktualisierteReklamationen
        }); // Erfolgreiche Aktualisierung
    } catch (error) {
        res.status(500).json({ fehler: "Fehler beim Aktualisieren der Reklamationen" });
    }
});

  
// Route zum Löschen einer Reklamation basierend auf ihrer ID
router.delete("/:id", async (req, res) => {
    const reklamationen = leseDatenbank(); // Liest die Reklamationen aus der lokalen JSON-Datenbank
    const index = reklamationen.findIndex((r) => r.id === req.params.id); // Sucht die Reklamation in der lokalen Datenbank

    if (index === -1) {
        // Gibt eine Fehlermeldung zurück, wenn die Reklamation nicht gefunden wurde
        return res.status(404).json({ fehler: "Reklamation nicht gefunden" });
    }
    if (reklamationen[index].status === "Canceled") {
        // Gibt eine Fehlermeldung zurück, wenn die Reklamation bereits gelöscht wurde
        return res.status(404).json({ fehler: "Reklamation wurde schon gelöscht" });
    }

    // Setzt den Status der Reklamation auf "Canceled" und speichert die Änderung in der lokalen JSON-Datenbank
    reklamationen[index].status = "Canceled";
    schreibeDatenbank(reklamationen);

    try {
        // Löscht die Reklamation aus der MySQL-Datenbank
        const [result] = await pool.query("DELETE FROM reklamationen WHERE id = ?", [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ fehler: "Reklamation nicht gefunden" });
        }
        res.json({ nachricht: "Reklamation gelöscht" }); // Erfolgreiches Löschen
    } catch (error) {
        res.status(500).json({ fehler: "Fehler beim Löschen der Reklamation" });
    }
});

// Route zum Löschen von Reklamationen basierend auf der Produkt-ID
router.delete("/produkt/:produktId", async (req, res) => {
    const reklamationen = leseDatenbank(); // Liest die Reklamationen aus der lokalen JSON-Datenbank
    const produktId = parseInt(req.params.produktId); // Holt die Produkt-ID aus den Anfrageparametern

    // Filtert die Reklamationen in der lokalen Datenbank nach Produkt-ID
    const gefilterteReklamationen = reklamationen.filter(
        (r) => r.produktId === produktId && r.status !== "Canceled"
    );

    if (gefilterteReklamationen.length === 0) {
        // Gibt eine Fehlermeldung zurück, wenn keine gültigen Reklamationen gefunden wurden
        return res.status(404).json({
            fehler: "Keine Reklamationen mit der angegebenen Produkt-ID gefunden oder bereits storniert."
        });
    }

    // Setzt den Status der betroffenen Reklamationen auf "Canceled" und speichert die Änderung
    gefilterteReklamationen.forEach((reklamation) => {
        reklamation.status = "Canceled";
    });
    schreibeDatenbank(reklamationen);

    try {
        // Löscht die betroffenen Reklamationen aus der MySQL-Datenbank
        const [rows] = await pool.query("SELECT * FROM reklamationen WHERE produkt_id = ?", [produktId]);
        if (rows.length === 0) {
            return res.status(404).json({ fehler: "Keine Reklamationen für diese Produkt-ID gefunden" });
        }

        const geloeschteReklamationen = [];
        for (let reklamation of rows) {
            await pool.query("DELETE FROM reklamationen WHERE id = ?", [reklamation.id]);
            geloeschteReklamationen.push(reklamation.id);
        }

        res.json({
            nachricht: "Reklamationen gelöscht",
            geloeschteReklamationen
        }); // Erfolgreiches Löschen
    } catch (error) {
        res.status(500).json({ fehler: "Fehler beim Löschen der Reklamationen" });
    }
});

// Route zum Löschen von Reklamationen basierend auf dem Datum
router.delete("/datum/:datum", async (req, res) => {
    const reklamationen = leseDatenbank(); // Liest die Reklamationen aus der lokalen JSON-Datenbank
    const datum = req.params.datum; // Holt das Datum aus den Anfrageparametern

    // Filtert die Reklamationen in der lokalen Datenbank nach Datum
    const gefilterteReklamationen = reklamationen.filter(
        (r) => r.datum === datum && r.status !== "Canceled"
    );

    if (gefilterteReklamationen.length === 0) {
        // Gibt eine Fehlermeldung zurück, wenn keine gültigen Reklamationen gefunden wurden
        return res.status(404).json({
            fehler: "Keine Reklamationen mit dem angegebenen Datum gefunden oder bereits storniert."
        });
    }

    // Setzt den Status der betroffenen Reklamationen auf "Canceled" und speichert die Änderung
    gefilterteReklamationen.forEach((reklamation) => {
        reklamation.status = "Canceled";
    });
    schreibeDatenbank(reklamationen);

    try {
        // Löscht die betroffenen Reklamationen aus der MySQL-Datenbank
        const [rows] = await pool.query("DELETE FROM reklamationen WHERE datum = ?", [datum]);
        if (rows.affectedRows === 0) {
            return res.status(404).json({ fehler: "Keine Reklamationen mit diesem Datum gefunden" });
        }
        res.json({ nachricht: "Reklamationen mit Datum gelöscht", rows }); // Erfolgreiches Löschen
    } catch (error) {
        res.status(500).json({ fehler: "Fehler beim Löschen der Reklamationen" });
    }
});

// Route zum Löschen von Reklamationen basierend auf dem Kundennamen
router.delete("/name/:name", async (req, res) => {
    const reklamationen = leseDatenbank(); // Liest die Reklamationen aus der lokalen JSON-Datenbank
    const name = req.params.name.toLowerCase(); // Holt den Namen aus den Anfrageparametern

    // Filtert die Reklamationen in der lokalen Datenbank nach Name
    const gefilterteReklamationen = reklamationen.filter(
        (r) => r.kunde.name.toLowerCase() === name && r.status !== "Canceled"
    );

    if (gefilterteReklamationen.length === 0) {
        // Gibt eine Fehlermeldung zurück, wenn keine gültigen Reklamationen gefunden wurden
        return res.status(404).json({
            fehler: "Keine Reklamationen mit dem angegebenen Namen gefunden oder bereits storniert."
        });
    }

    // Setzt den Status der betroffenen Reklamationen auf "Canceled" und speichert die Änderung
    gefilterteReklamationen.forEach((reklamation) => {
        reklamation.status = "Canceled";
    });
    schreibeDatenbank(reklamationen);

    try {
        // Löscht die betroffenen Reklamationen aus der MySQL-Datenbank
        const [rows] = await pool.query("DELETE FROM reklamationen WHERE kunde_name = ?", [name]);
        if (rows.affectedRows === 0) {
            return res.status(404).json({ fehler: "Keine Reklamationen mit diesem Namen gefunden" });
        }
        res.json({ nachricht: "Reklamationen mit Name gelöscht", rows }); // Erfolgreiches Löschen
    } catch (error) {
        res.status(500).json({ fehler: "Fehler beim Löschen der Reklamationen" });
    }
});


// Route zum Abrufen der Statistik für einen bestimmten Kunden basierend auf dem Namen
router.get("/statistik/name/:name", async (req, res) => {
    const reklamationen = leseDatenbank(); // Liest die Reklamationen aus der lokalen JSON-Datenbank
    const statistik = {};

    // Berechnet die Anzahl der Reklamationen für den angegebenen Kunden in der lokalen Datenbank
    reklamationen.forEach((r) => {
        if (r.kunde && r.kunde.name && r.kunde.name === req.params.name) {
            const kundeName = r.kunde.name;
            if (!statistik[kundeName]) {
                statistik[kundeName] = 0;
            }
            statistik[kundeName]++;
        }
    });

    // Alternative Berechnung mit MySQL-Datenbank
    try {
        const [rows] = await pool.query(
            "SELECT kunde_name, COUNT(*) as anzahl FROM reklamationen WHERE kunde_name = ? GROUP BY kunde_name",
            [req.params.name]
        );
        if (rows.length === 0) {
            // Gibt eine Fehlermeldung zurück, wenn keine Statistik gefunden wurde
            return res.status(404).json({ fehler: "Keine Statistiken für diesen Namen gefunden" });
        }
        res.json(rows); // Gibt die Statistik zurück
    } catch (error) {
        res.status(500).json({ fehler: "Fehler beim Abrufen der Statistik" });
    }
});

// Route zum Abrufen der Statistik für alle Kunden
router.get("/statistik/name/", async (req, res) => {
    const reklamationen = leseDatenbank(); // Liest die Reklamationen aus der lokalen JSON-Datenbank
    const statistik = {};

    // Berechnet die Anzahl der Reklamationen für alle Kunden in der lokalen Datenbank
    reklamationen.forEach((r) => {
        if (r.kunde && r.kunde.name) {
            const kundeName = r.kunde.name;
            if (!statistik[kundeName]) {
                statistik[kundeName] = 0;
            }
            statistik[kundeName]++;
        }
    });

    // Alternative Berechnung mit MySQL-Datenbank
    try {
        const [rows] = await pool.query(
            "SELECT kunde_name, COUNT(*) as anzahl FROM reklamationen GROUP BY kunde_name"
        );
        res.json(rows); // Gibt die Statistik zurück
    } catch (error) {
        res.status(500).json({ fehler: "Fehler beim Abrufen der Statistik" });
    }
});

// Route zum Abrufen der Anzahl der Reklamationen basierend auf ihrem Status
router.get("/statistik/anzahlStatus", async (req, res) => {
    const reklamationen = leseDatenbank(); // Liest die Reklamationen aus der lokalen JSON-Datenbank
    const statusAnzahl = { Open: 0, InProgress: 0, Accepted: 0, Rejected: 0, Canceled: 0 };

    // Berechnet die Anzahl der Reklamationen für jeden Status in der lokalen Datenbank
    reklamationen.forEach((r) => {
        if (r.status && statusAnzahl[r.status] !== undefined) {
            statusAnzahl[r.status]++;
        }
    });

    // Alternative Berechnung mit MySQL-Datenbank
    try {
        const [rows] = await pool.query(
            "SELECT status, COUNT(*) as anzahl FROM reklamationen GROUP BY status"
        );
        res.json(rows); // Gibt die Statistik zurück
    } catch (error) {
        res.status(500).json({ fehler: "Fehler beim Abrufen der Statistik" });
    }
});

module.exports = router;
