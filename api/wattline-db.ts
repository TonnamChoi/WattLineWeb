import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listWattlineDbPhotos } from "../providers/handleWattlineDbRequest.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "허용되지 않은 요청 방식입니다." });
  }

  const { status, body } = await listWattlineDbPhotos();
  return res.status(status).json(body);
}
