const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===============================
   CORS (frontend only)
================================ */
app.use(
  cors({
    origin: "https://verifyidentity-kyc.onrender.com",
    methods: ["POST"],
  })
);

/* ===============================
   Multer (memory storage)
================================ */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/* ===============================
   Cloudinary config (HARDCODED)
================================ */
cloudinary.config({
  cloud_name: "dn3nftart",
  api_key: "624515268766626",
  api_secret: "WSyQxRLYgAjYpQenFFMDIXqBaaU",
});

/* ===============================
   Upload endpoint
================================ */
app.post(
  "/upload",
  upload.fields([
    { name: "selfie", maxCount: 1 },
    { name: "id_front", maxCount: 1 },
    { name: "id_back", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (
        !req.files ||
        !req.files.selfie ||
        !req.files.id_front ||
        !req.files.id_back
      ) {
        return res.status(400).json({
          success: false,
          message: "All 3 images are required",
        });
      }

      const uploadToCloudinary = (file, label) => {
        return new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                folder: "kyc",
                resource_type: "image",
                public_id: `${label}-${Date.now()}`,
              },
              (error, result) => {
                if (error) return reject(error);
                resolve(result);
              }
            )
            .end(file.buffer);
        });
      };

      const selfieResult = await uploadToCloudinary(
        req.files.selfie[0],
        "selfie"
      );
      const idFrontResult = await uploadToCloudinary(
        req.files.id_front[0],
        "id_front"
      );
      const idBackResult = await uploadToCloudinary(
        req.files.id_back[0],
        "id_back"
      );

      return res.json({
        success: true,
        message: "Images uploaded successfully",
        data: {
          selfie: selfieResult.public_id,
          id_front: idFrontResult.public_id,
          id_back: idBackResult.public_id,
        },
      });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({
        success: false,
        message: "Upload failed",
      });
    }
  }
);

/* ===============================
   Health check
================================ */
app.get("/", (req, res) => {
  res.send("Identity verification backend running");
});

/* ===============================
   Start server
================================ */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
