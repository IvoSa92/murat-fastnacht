import express from "express";
import QRCode from "qrcode";
import { createCanvas, loadImage, registerFont } from "canvas";
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
registerFont(join(__dirname, "fonts", "Inter.ttf"), { family: "Inter" });
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "fastnacht2025";

app.use(express.json());

// Middleware: check admin password
function requireAdmin(req, res, next) {
  if (req.headers["x-admin-password"] !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Falsches Passwort" });
  }
  next();
}

// --- API Routes ---

// POST /api/admin/login - verify admin password
app.post("/api/admin/login", requireAdmin, (_req, res) => {
  res.json({ ok: true });
});

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

// POST /api/persons - create a new person (admin)
app.post("/api/persons", requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name ist erforderlich" });
  }
  const person = createPerson(name.trim());
  res.status(201).json(person);
});

// DELETE /api/persons/:id - delete a person (admin)
app.delete("/api/persons/:id", requireAdmin, (req, res) => {
  const person = getPersonById(Number(req.params.id));
  if (!person) {
    return res.status(404).json({ error: "Person nicht gefunden" });
  }
  deletePerson(Number(req.params.id));
  res.json({ success: true });
});

// GET /api/persons/:id/qrcode - generate QR code as PNG with name
app.get("/api/persons/:id/qrcode", async (req, res) => {
  const person = getPersonById(Number(req.params.id));
  if (!person) {
    return res.status(404).json({ error: "Person nicht gefunden" });
  }
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const scanUrl = `${baseUrl}/scan/${person.id}`;

  const qrSize = 400;
  const padding = 20;
  const nameHeight = 60;
  const totalHeight = qrSize + nameHeight + padding;

  const canvas = createCanvas(qrSize, totalHeight);
  const ctx = canvas.getContext("2d");

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, qrSize, totalHeight);

  // Draw QR code
  const qrBuffer = await QRCode.toBuffer(scanUrl, {
    type: "png",
    width: qrSize,
    margin: 2,
  });
  const qrImage = await loadImage(qrBuffer);
  ctx.drawImage(qrImage, 0, 0, qrSize, qrSize);

  // Draw name below QR code
  ctx.fillStyle = "#000000";
  ctx.font = "bold 32px Inter";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(person.name, qrSize / 2, qrSize + nameHeight / 2 + padding / 2);

  const buffer = canvas.toBuffer("image/png");
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
