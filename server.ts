import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { handleExtractRequest } from "./providers/handleExtractRequest";
import {
  listPruningPhotos,
  uploadPruningPhoto,
  deletePruningPhoto,
} from "./providers/handlePruningRequest";
import { handlePruningExtractRequest } from "./providers/handlePruningExtractRequest";

const app = express();
const PORT = 3000;

// Increase payload size limit since we will send base64 images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// API Routes (mirrors api/extract.ts, which Vercel uses in production)
app.post("/api/extract", async (req, res) => {
  const { status, body } = await handleExtractRequest(req.body);
  res.status(status).json(body);
});

// API Routes (mirrors api/pruning.ts, which Vercel uses in production)
app.get("/api/pruning", async (req, res) => {
  const { status, body } = await listPruningPhotos();
  res.status(status).json(body);
});
app.post("/api/pruning", async (req, res) => {
  const { status, body } = await uploadPruningPhoto(req.body);
  res.status(status).json(body);
});
app.delete("/api/pruning", async (req, res) => {
  const { status, body } = await deletePruningPhoto(req.body);
  res.status(status).json(body);
});

// API Routes (mirrors api/pruning-extract.ts, which Vercel uses in production)
app.post("/api/pruning-extract", async (req, res) => {
  const { status, body } = await handlePruningExtractRequest(req.body);
  res.status(status).json(body);
});

// Serve frontend
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
