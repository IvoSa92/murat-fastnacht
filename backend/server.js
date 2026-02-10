import express from "express";
import QRCode from "qrcode";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  getAllScores,
  getAllPersons,
  getPersonById,
  createPerson,
  deletePerson,
  incrementScore,
} from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- API Routes ---

// GET /api/scores - all persons sorted by score
app.get("/api/scores", (_req, res) => {
  res.json(getAllScores());
});

// POST /api/scan/:id - increment score for person
app.post("/api/scan/:id", (req, res) => {
  const person = getPersonById(Number(req.params.id));
  if (!person) {
    return res.status(404).json({ error: "Person nicht gefunden" });
  }
  const updated = incrementScore(Number(req.params.id));
  res.json(updated);
});

// GET /api/persons - list all persons
app.get("/api/persons", (_req, res) => {
  res.json(getAllPersons());
});

// POST /api/persons - create a new person
app.post("/api/persons", (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name ist erforderlich" });
  }
  const person = createPerson(name.trim());
  res.status(201).json(person);
});

// DELETE /api/persons/:id - delete a person
app.delete("/api/persons/:id", (req, res) => {
  const person = getPersonById(Number(req.params.id));
  if (!person) {
    return res.status(404).json({ error: "Person nicht gefunden" });
  }
  deletePerson(Number(req.params.id));
  res.json({ success: true });
});

// GET /api/persons/:id/qrcode - generate QR code as PNG
app.get("/api/persons/:id/qrcode", async (req, res) => {
  const person = getPersonById(Number(req.params.id));
  if (!person) {
    return res.status(404).json({ error: "Person nicht gefunden" });
  }
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const scanUrl = `${baseUrl}/scan/${person.id}`;
  const buffer = await QRCode.toBuffer(scanUrl, {
    type: "png",
    width: 400,
    margin: 2,
  });
  res.set("Content-Type", "image/png");
  res.set("Content-Disposition", `inline; filename="qr-${person.name}.png"`);
  res.send(buffer);
});

// --- Static Files (built Astro frontend) ---

const distPath = join(__dirname, "..", "frontend", "dist");
app.use(express.static(distPath));

// /scan/123 → serve the scan page (Astro built it as /scan/index.html)
app.get("/scan/:id", (_req, res) => {
  res.sendFile(join(distPath, "scan", "index.html"));
});

// Fallback: serve index.html for any unknown route
app.get("*", (_req, res) => {
  res.sendFile(join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
