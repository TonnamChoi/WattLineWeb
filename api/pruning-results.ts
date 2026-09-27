import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handlePruningResultsRequest } from "../providers/handlePruningResultsRequest.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { status, body } = await handlePruningResultsRequest(
    req.method || "GET",
    req.query.workplaceId,
    req.body,
    req.headers.authorization
  );
  return res.status(status).json(body);
}
