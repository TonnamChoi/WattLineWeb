import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleAdminRequest } from "../providers/handleAdminRequest.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { status, body } = await handleAdminRequest(req.method || "GET", req.query.entity, req.body, req.headers.authorization);
  return res.status(status).json(body);
}
