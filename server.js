import express from "express";
import multer from "multer";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";

const app = express();
const upload = multer({ dest: "uploads/" });

// 🌍 Allow any frontend (open CORS)
app.use(cors());

// ⚠️ HARDCODED Cloudinary credentials (TEST ONLY — regenerate after)
cloudinary.config({
  cloud_name: "dn3nftart",
  api_key: "122762874192689",
  api_secret: "InDumjw2GvObWmUwqYJLKwSCzf0",
});

app.use(express.urlencoded({ extended: true }));

// 🏠 Root route (test form)
app.get("/", (req, res) => {
  res.send(`
    <h2>📸 Upload 3 Photos (Selfie + ID Front + ID Back)</h2>
    <form action="/upload" method="POST" enctype="multipart/form-data">
      <label>Selfie:</label><br>
      <input type="file" name="selfie" accept="image/*" required><br><br>
      <label>ID Front:</label><br>
      <input type="file" name="frontID" accept="image/*" required><br><br>
      <label>ID Back:</label><br>
      <input type="file" name="backID" accept="image/*" required><br><br>
      <button type="submit">Upload</button>
    </form>
  `);
});

// 🚀 Upload route: handles all 3 photos
app.post("/upload", upload.fields([
  { name: "selfie", maxCount: 1 },
  { name: "frontID", maxCount: 1 },
  { name: "backID", maxCount: 1 }
]), async (req, res) => {
  try {
    const result = {};

    for (const key in req.files) {
      const file = req.files[key][0];
      const uploadResult = await cloudinary.uploader.upload(file.path);
      result[key] = uploadResult.secure_url;
    }

    res.json({
      success: true,
      urls: result
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Upload failed." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
