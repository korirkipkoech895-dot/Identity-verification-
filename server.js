import express from "express";
import multer from "multer";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";

const app = express();
const upload = multer({ dest: "uploads/" });

// ✅ Allow your frontend only
app.use(cors({
  origin: "https://identity-verification-swift-loan.onrender.com"
}));

// ⚠️ Hardcoded credentials (TEMPORARY — regenerate later)
cloudinary.config({
  cloud_name: "dn3nftart",
  api_key: "122762874192689",
  api_secret: "InDumjw2GvObWmUwqYJLKwSCzf0",
});

// 🧠 Simple in-memory store for uploads (you can replace with a DB later)
const uploads = [];

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("✅ Identity Verification Backend Running");
});

// 📸 Upload 3 photos
app.post("/upload", upload.fields([
  { name: "selfie", maxCount: 1 },
  { name: "frontID", maxCount: 1 },
  { name: "backID", maxCount: 1 }
]), async (req, res) => {
  try {
    const result = {};
    for (const key in req.files) {
      const file = req.files[key][0];
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: "swift_verifications"
      });
      result[key] = uploadResult.secure_url;
    }

    // Store record in memory (you can later move this to MongoDB or Firebase)
    uploads.push({
      selfie: result.selfie,
      frontID: result.frontID,
      backID: result.backID,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, urls: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Upload failed." });
  }
});

// 🧑‍💼 Admin login (simple password check)
app.get("/admin", (req, res) => {
  res.send(`
    <h2>🔒 Admin Login</h2>
    <form action="/dashboard" method="GET">
      <input type="password" name="key" placeholder="Enter Admin Password" required>
      <button type="submit">Login</button>
    </form>
  `);
});

// 🧾 Dashboard — password protected
app.get("/dashboard", (req, res) => {
  const key = req.query.key;
  const ADMIN_KEY = "swiftadmin123"; // change this password

  if (key !== ADMIN_KEY) {
    return res.status(403).send("<h3>❌ Access Denied</h3>");
  }

  const html = `
    <h1>📋 Uploaded Verifications</h1>
    <p>Total uploads: ${uploads.length}</p>
    <table border="1" cellpadding="10" cellspacing="0">
      <tr>
        <th>#</th>
        <th>Selfie</th>
        <th>Front ID</th>
        <th>Back ID</th>
        <th>Uploaded</th>
      </tr>
      ${uploads.map((u, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><a href="${u.selfie}" target="_blank"><img src="${u.selfie}" width="100"></a></td>
          <td><a href="${u.frontID}" target="_blank"><img src="${u.frontID}" width="100"></a></td>
          <td><a href="${u.backID}" target="_blank"><img src="${u.backID}" width="100"></a></td>
          <td>${new Date(u.timestamp).toLocaleString()}</td>
        </tr>
      `).join("")}
    </table>
  `;
  res.send(html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
