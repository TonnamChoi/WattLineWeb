import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listWattlineDbPhotos, deleteWattlineDbPhoto } from "../providers/handleWattlineDbRequest.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "DELETE") {
    const { status, body } = await deleteWattlineDbPhoto(req.body, req.headers.authorization);
    return res.status(status).json(body);
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "허용되지 않은 요청 방식입니다." });
  }

  const { status, body } = await listWattlineDbPhotos(req.query.workplaceId);
  return res.status(status).json(body);
}
