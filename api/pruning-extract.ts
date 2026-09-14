import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handlePruningExtractRequest } from "../providers/handlePruningExtractRequest.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "허용되지 않은 요청 방식입니다." });
  }

  const { status, body } = await handlePruningExtractRequest(req.body);
  res.status(status).json(body);
}
