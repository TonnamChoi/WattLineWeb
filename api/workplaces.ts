import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listWorkplacesForUser } from "../providers/handleAdminRequest.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "허용되지 않은 요청 방식입니다." });
  }

  const { status, body } = await listWorkplacesForUser(req.headers.authorization, req.query.companyId);
  return res.status(status).json(body);
}
