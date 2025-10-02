// Plain Vercel Serverless Function (CommonJS). Lives at /api/initialize-payment.js

const AMOUNT_BY_DURATION = {
  "15 min": 300,
  "30 min": 300,
  "45 min": 300,
  "1 hr": 300,
};

module.exports = async (req, res) => {
  // CORS for browser calls
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.ALLOWED_ORIGINS || "*"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
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

    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const { email, duration } = body || {};
    if (!email || !duration || !AMOUNT_BY_DURATION[duration]) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payload" });
    }

    const amount = AMOUNT_BY_DURATION[duration] * 100; // kobo

    const psRes = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, amount, metadata: { duration } }),
      }
    );

    const text = await psRes.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!psRes.ok || !json?.status) {
      console.error("Paystack init failed:", psRes.status, json);
      return res
        .status(400)
        .json({
          success: false,
          message: json?.message || "Payment initialization failed",
        });
    }

    const { access_code, reference } = json.data || {};
    return res.status(200).json({
      success: true,
      data: { access_code, reference },
      message: "Payment initialized",
    });
  } catch (err) {
    console.error("Initialize error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
