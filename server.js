/**
 * server.js (Fixed Original Version)
 * ✅ Uploads all three ID images reliably
 * ✅ Verifies all uploads before saving
 * ✅ Prevents broken image records
 * ✅ Improved CORS handling
 * ✅ Same dashboard and structure preserved
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
const ADMIN_KEY = "3462"; // your admin password

// ✅ CORS: safer + flexible
app.use(
  cors({
    origin: [
      "https://identity-verification-swift-loan.onrender.com",
      "https://verifyidentity-kyc.onrender.com",
      "http://localhost:3000", // for local testing
    ],
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ CLOUDINARY CONFIG
cloudinary.config({
  cloud_name: "dn3nftart",
  api_key: "122762874192689",
  api_secret: "InDumjw2GvObWmUwqYJLKwSCzf0",
});

// ✅ Utility functions
async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify([]), "utf8");
  }
}

async function readRecords() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  return JSON.parse(raw || "[]");
}

async function saveRecords(records) {
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), "utf8");
}

async function appendRecord(record) {
  const records = await readRecords();
  records.push(record);
  await saveRecords(records);
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ✅ Root route
app.get("/", (req, res) => {
  res.send("✅ Identity Verification Backend Running (Fixed Original)");
});

// ✅ Upload endpoint (improved error handling)
app.post(
  "/upload",
  upload.fields([
    { name: "selfie", maxCount: 1 },
    { name: "frontID", maxCount: 1 },
    { name: "backID", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const { name, idNumber, phone } = req.body || {};

      if (!name || !idNumber || !phone)
        return res
          .status(400)
          .json({ success: false, message: "Missing required fields." });

      if (!/^\d{8,9}$/.test(idNumber))
        return res
          .status(400)
          .json({ success: false, message: "ID number must be 8 or 9 digits." });

      if (!/^2547\d{8}$/.test(phone))
        return res
          .status(400)
          .json({ success: false, message: "Phone must be in 2547XXXXXXXX format." });

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

      // ✅ Upload all three images safely
      const uploaded = {};
      for (const key of ["selfie", "frontID", "backID"]) {
        const file = req.files[key][0];
        try {
          const uploadResult = await cloudinary.uploader.upload(file.path, {
            folder: "swift_verifications",
            use_filename: true,
            unique_filename: true,
          });
          uploaded[key] = {
            url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
          };
        } catch (err) {
          console.error(`❌ Cloudinary upload failed for ${key}:`, err.message);
          return res.status(500).json({
            success: false,
            message: `Failed to upload ${key} image.`,
          });
        } finally {
          await fs.unlink(file.path).catch(() => {});
        }
      }

      // ✅ Verify all uploads succeeded
      if (
        !uploaded.selfie?.url ||
        !uploaded.frontID?.url ||
        !uploaded.backID?.url
      ) {
        return res.status(500).json({
          success: false,
          message: "One or more image uploads failed. Please try again.",
        });
      }

      // ✅ Save record
      const record = {
        id: Date.now().toString(),
        name: name.trim(),
        idNumber,
        phone,
        selfie: uploaded.selfie.url,
        frontID: uploaded.frontID.url,
        backID: uploaded.backID.url,
        selfie_id: uploaded.selfie.public_id,
        frontID_id: uploaded.frontID.public_id,
        backID_id: uploaded.backID.public_id,
        createdAt: new Date().toISOString(),
      };

      await appendRecord(record);
      res.json({ success: true, message: "Uploaded successfully", record });
    } catch (err) {
      next(err);
    }
  }
);

// ✅ Admin login page
app.get("/admin", (req, res) => {
  res.send(`
    <h2>🔒 Admin Login</h2>
    <form action="/dashboard" method="GET">
      <input type="password" name="key" placeholder="Enter Admin Password" required />
      <button type="submit">Login</button>
    </form>
  `);
});

// ✅ Dashboard page
app.get("/dashboard", async (req, res) => {
  const key = req.query.key || "";
  if (key !== ADMIN_KEY)
    return res.status(403).send("<h3>❌ Access Denied — wrong password</h3>");

  const records = await readRecords();
  records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const html = `
  <!doctype html>
  <html>
  <head>
    <title>Admin Dashboard - Verifications</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      body{font-family:Arial,sans-serif;background:#f0f4ff;padding:20px;margin:0;color:#333;}
      h1{margin:0 0 15px;}
      .top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
      .btn{padding:8px 12px;border:none;border-radius:6px;cursor:pointer;font-weight:bold;}
      .reload{background:#007bff;color:white;}
      .delete{background:#e74c3c;color:white;}
      .record{background:white;border-radius:12px;padding:15px;margin:10px 0;box-shadow:0 2px 5px rgba(0,0,0,0.1);}
      .imgs{display:flex;gap:10px;flex-wrap:wrap;}
      img{border-radius:8px;max-width:100px;}
      .info{margin-bottom:8px;}
      #search{padding:8px;width:100%;max-width:300px;border:1px solid #ccc;border-radius:6px;margin-bottom:15px;}
      @media(max-width:768px){img{max-width:80px;}}
    </style>
  </head>
  <body>
    <div class="top">
      <h1>📋 Uploaded Verifications</h1>
      <button class="btn reload" onclick="window.location.href='/dashboard?key=${key}'">🔄 Reload</button>
    </div>

    <input type="text" id="search" placeholder="🔍 Search by name, ID, or phone..." onkeyup="filterRecords()" />
    <p>Total records: ${records.length}</p>

    <div id="records">
      ${records
        .map(
          (r, i) => `
        <div class="record" data-name="${r.name.toLowerCase()}" data-id="${r.idNumber}" data-phone="${r.phone}">
          <div class="info"><strong>${i + 1}. ${escapeHtml(r.name)}</strong> — ID: ${escapeHtml(r.idNumber)}</div>
          <div class="info">📞 ${escapeHtml(r.phone)} | <small>${new Date(
            r.createdAt
          ).toLocaleString()}</small></div>
          <div class="imgs">
            <a href="${r.selfie}" target="_blank"><img src="${r.selfie}" alt="selfie"/></a>
            <a href="${r.frontID}" target="_blank"><img src="${r.frontID}" alt="frontID"/></a>
            <a href="${r.backID}" target="_blank"><img src="${r.backID}" alt="backID"/></a>
          </div>
          <form method="POST" action="/delete" style="margin-top:10px;">
            <input type="hidden" name="key" value="${key}">
            <input type="hidden" name="id" value="${r.id}">
            <button class="btn delete" onclick="return confirm('Delete this record permanently?')">🗑 Delete</button>
          </form>
        </div>`
        )
        .join("")}
    </div>

    <script>
      function filterRecords() {
        const query = document.getElementById("search").value.toLowerCase();
        const records = document.querySelectorAll(".record");
        records.forEach(r => {
          const name = r.getAttribute("data-name");
          const id = r.getAttribute("data-id");
          const phone = r.getAttribute("data-phone");
          r.style.display = name.includes(query) || id.includes(query) || phone.includes(query) ? "block" : "none";
        });
      }
    </script>
  </body>
  </html>`;
  res.send(html);
});

// ✅ Delete record + Cloudinary cleanup
app.post("/delete", express.urlencoded({ extended: true }), async (req, res) => {
  const { key, id } = req.body;
  if (key !== ADMIN_KEY)
    return res.status(403).send("<h3>❌ Unauthorized</h3>");

  const records = await readRecords();
  const record = records.find((r) => r.id === id);
  if (!record) return res.status(404).send("<h3>Record not found</h3>");

  try {
    await Promise.all([
      cloudinary.uploader.destroy(record.selfie_id),
      cloudinary.uploader.destroy(record.frontID_id),
      cloudinary.uploader.destroy(record.backID_id),
    ]);
  } catch (err) {
    console.warn("⚠️ Cloudinary deletion warning:", err.message);
  }

  const updated = records.filter((r) => r.id !== id);
  await saveRecords(updated);
  res.redirect(`/dashboard?key=${key}`);
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("💥 Global Error:", err);
  res
    .status(500)
    .json({ success: false, message: "Internal Server Error", error: err.message });
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
