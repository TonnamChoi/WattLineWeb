import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  listPruningPhotos,
  uploadPruningPhoto,
  deletePruningPhoto,
} from "../providers/handlePruningRequest.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const { status, body } = await listPruningPhotos();
    return res.status(status).json(body);
  }

  if (req.method === "POST") {
    const { status, body } = await uploadPruningPhoto(req.body);
    return res.status(status).json(body);
  }

  if (req.method === "DELETE") {
    const { status, body } = await deletePruningPhoto(req.body);
    return res.status(status).json(body);
  }

  return res.status(405).json({ error: "허용되지 않은 요청 방식입니다." });
}
