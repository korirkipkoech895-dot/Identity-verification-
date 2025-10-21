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

// ⚠️ Hardcoded credentials (temporary — remember to remove later)
cloudinary.config({
  cloud_name: "dn3nftart",
  api_key: "122762874192689",
  api_secret: "InDumjw2GvObWmUwqYJLKwSCzf0",
});

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("✅ Identity Verification Backend Running");
});

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

    res.json({ success: true, urls: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Upload failed." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
