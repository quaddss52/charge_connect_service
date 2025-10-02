// api/_lib/cors.js
export function applyCors(req, res) {
  const origin = req.headers.origin || "*";
  const allowed = (process.env.ALLOWED_ORIGINS || "*")
    .split(",")
    .map((s) => s.trim());

  const allowOrigin =
    allowed.includes("*") || allowed.includes(origin)
      ? origin
      : allowed[0] || "*";

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true; // handled preflight
  }
  return false;
}
