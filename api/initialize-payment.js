// /api/verify.js

module.exports = async (req, res) => {
  // CORS
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.ALLOWED_ORIGINS || "*"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res
        .status(500)
        .json({ success: false, message: "Server not configured" });
    }

    const reference =
      req.query?.reference ||
      new URL(req.url, `https://${req.headers.host}`).searchParams.get(
        "reference"
      );
    if (!reference)
      return res
        .status(400)
        .json({ success: false, message: "Missing reference" });

    const vRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      }
    );

    const text = await vRes.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!vRes.ok || !json?.status) {
      console.error("Paystack verify failed:", vRes.status, json);
      return res.status(400).json({
        success: false,
        message: json?.message || "Verification failed",
        data: json?.data,
      });
    }

    const ok = json.data?.status === "success";
    return res.status(ok ? 200 : 400).json({
      success: ok,
      message: ok ? "Payment verified" : "Payment not successful",
      data: json.data,
    });
  } catch (err) {
    console.error("Verify error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
