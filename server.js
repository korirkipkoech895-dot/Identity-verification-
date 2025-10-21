/**
 * server.js
 * Identity verification backend:
 * - Accepts POST /upload with fields: name, idNumber, phone AND files: selfie, frontID, backID
 * - Uploads images to Cloudinary (folder: swift_verifications)
 * - Saves immutable records to data.json (append, persistent)
 * - Provides admin login at /admin and dashboard at /dashboard (password: 3462)
 *
 * Note: For production, put Cloudinary secrets in env vars. After testing, regenerate your secret.
 */

import express from "express";
import multer from "multer";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import path from "path";

const app = express();
const upload = multer({ dest: "uploads/" });
const DATA_FILE = path.join(process.cwd(), "data.json");

// Allow only your frontend origin (change if needed) OR allow all during testing.
// Using your frontend origin:
app.use(
  cors({
    origin: "https://identity-verification-swift-loan.onrender.com",
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// CLOUDINARY configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dn3nftart",
  api_key: process.env.CLOUDINARY_API_KEY || "122762874192689",
  // For safety we prefer env var; falls back to the old secret if present.
  api_secret:
    process.env.CLOUDINARY_API_SECRET || "InDumjw2GvObWmUwqYJLKwSCzf0",
});

// Ensure data file exists
async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify([]), "utf8");
  }
}

// Read saved records
async function readRecords() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  return JSON.parse(raw || "[]");
}

// Append a new record (immutable - we do not provide delete/overwrite endpoints)
async function appendRecord(record) {
  const records = await readRecords();
  records.push(record);
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), "utf8");
}

// Basic root
app.get("/", (req, res) => {
  res.send("✅ Identity Verification Backend Running");
});

// Upload endpoint
app.post(
  "/upload",
  upload.fields([
    { name: "selfie", maxCount: 1 },
    { name: "frontID", maxCount: 1 },
    { name: "backID", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // Basic server-side validation for text fields
      const { name, idNumber, phone } = req.body || {};
      if (!name || !idNumber || !phone) {
        return res
          .status(400)
          .json({ success: false, message: "Missing required fields." });
      }

      // Validate name (non-empty)
      if (typeof name !== "string" || name.trim().length < 2) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid name provided." });
      }

      // Validate ID: 8 or 9 digits
      if (!/^\d{8,9}$/.test(idNumber)) {
        return res.status(400).json({
          success: false,
          message: "ID number must be 8 or 9 digits.",
        });
      }

      // Validate phone: expects 2547XXXXXXXX (254 + 9 digits) => total 12 digits
      if (!/^2547\d{8}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message:
            "Phone must be in 2547XXXXXXXX format (e.g. 2547XXXXXXXX).",
        });
      }

      // Validate files present
      if (
        !req.files ||
        !req.files.selfie ||
        !req.files.frontID ||
        !req.files.backID
      ) {
        return res
          .status(400)
          .json({ success: false, message: "All three image files are required." });
      }

      // Upload each file to Cloudinary under folder swift_verifications
      const uploaded = {};
      for (const key of ["selfie", "frontID", "backID"]) {
        const file = req.files[key][0];
        const uploadResult = await cloudinary.uploader.upload(file.path, {
          folder: "swift_verifications",
          use_filename: true,
          unique_filename: true,
        });
        uploaded[key] = {
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        };
      }

      // Create immutable record
      const record = {
        id: Date.now().toString(), // simple unique id
        name: name.trim(),
        idNumber: idNumber,
        phone: phone,
        selfie: uploaded.selfie.url,
        frontID: uploaded.frontID.url,
        backID: uploaded.backID.url,
        createdAt: new Date().toISOString(),
      };

      // Append to data.json
      await appendRecord(record);

      // Return success (do not include raw storage paths beyond urls if you want)
      return res.json({ success: true, message: "Uploaded", record });
    } catch (err) {
      console.error("Upload error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Server upload error." });
    }
  }
);

// ---------- ADMIN PAGES ----------

// Admin login page
app.get("/admin", (req, res) => {
  res.send(`
    <h2>🔒 Admin Login</h2>
    <form action="/dashboard" method="GET">
      <input type="password" name="key" placeholder="Enter Admin Password" required />
      <button type="submit">Login</button>
    </form>
  `);
});

// Dashboard - password protected. Password: 3462
app.get("/dashboard", async (req, res) => {
  const key = req.query.key || "";
  const ADMIN_KEY = "3462";

  if (key !== ADMIN_KEY) {
    return res.status(403).send("<h3>❌ Access Denied — wrong password</h3>");
  }

  // Read records from data.json
  const records = await readRecords();

  // Dashboard HTML with reload button
  const html = `
    <!doctype html>
    <html>
    <head>
      <title>Admin Dashboard - Verifications</title>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <style>
        body{font-family:Arial,Helvetica,sans-serif;padding:20px;background:#f5f7fb}
        h1{margin-bottom:10px}
        .top { display:flex; gap:10px; align-items:center; margin-bottom:15px; }
        button{padding:8px 12px;border-radius:6px;border:1px solid #ccc;background:#fff;cursor:pointer}
        table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden}
        th,td{padding:10px;border-bottom:1px solid #eee;text-align:left;vertical-align:middle}
        th{background:#fafafa}
        img{border-radius:6px;max-width:120px;height:auto;display:block}
        .small{font-size:12px;color:#666}
      </style>
    </head>
    <body>
      <div class="top">
        <h1>📋 Uploaded Verifications</h1>
        <div style="margin-left:auto">
          <button onclick="window.location.href='/dashboard?key=${ADMIN_KEY}'">Reload</button>
        </div>
      </div>

      <p class="small">Total records: ${records.length} (records are stored permanently on server/data.json and cannot be erased via this interface)</p>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>ID Number</th>
            <th>Phone</th>
            <th>Selfie</th>
            <th>ID Front</th>
            <th>ID Back</th>
            <th>Uploaded At</th>
          </tr>
        </thead>
        <tbody>
          ${records
            .map(
              (r, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(r.name)}</td>
              <td>${escapeHtml(r.idNumber)}</td>
              <td>${escapeHtml(r.phone)}</td>
              <td><a href="${r.selfie}" target="_blank"><img src="${r.selfie}" alt="selfie"/></a></td>
              <td><a href="${r.frontID}" target="_blank"><img src="${r.frontID}" alt="frontID"/></a></td>
              <td><a href="${r.backID}" target="_blank"><img src="${r.backID}" alt="backID"/></a></td>
              <td>${new Date(r.createdAt).toLocaleString()}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      <p class="small">Note: There is no delete endpoint. To remove records manually, edit the server file system directly (not recommended).</p>
    </body>
    </html>
  `;

  res.send(html);
});

// Utility to escape HTML
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
