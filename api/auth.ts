import type { VercelRequest, VercelResponse } from "@vercel/node";
import { login, getMe } from "../providers/handleAuthRequest.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "POST") {
    const { status, body } = await login(req.body);
    return res.status(status).json(body);
  }

  if (req.method === "GET") {
    const { status, body } = await getMe(req.headers.authorization);
    return res.status(status).json(body);
  }

  return res.status(405).json({ error: "허용되지 않은 요청 방식입니다." });
}
