// server/index.js
const express = require("express");
const cors = require("cors");
const fetch =
  global.fetch ||
  ((...args) => import("node-fetch").then(({ default: f }) => f(...args)));
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Prevent client-side amount tampering
const AMOUNT_BY_DURATION = {
  "15 min": 300, // NGN
  "30 min": 300,
  "45 min": 300,
  "1 hr": 300,
};

app.post("/api/initialize-payment", async (req, res) => {
  try {
    const { email, duration } = req.body;
    if (!email || !duration || !AMOUNT_BY_DURATION[duration]) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payload" });
    }

    const amountNaira = AMOUNT_BY_DURATION[duration];
    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amountNaira * 100, // kobo
          metadata: { duration },
        }),
      }
    );

    const data = await response.json();

    if (response.ok && data.status) {
      // return only what you need on the client
      return res.json({
        success: true,
        data: {
          access_code: data.data.access_code,
          reference: data.data.reference,
        },
        message: "Payment initialized",
      });
    }

    return res.status(400).json({
      success: false,
      message: data?.message || "Payment initialization failed",
    });
  } catch (error) {
    console.error("Init error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Verify payment by reference
app.get("/api/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );
    const verifyJson = await verifyRes.json();

    if (
      verifyRes.ok &&
      verifyJson.status &&
      verifyJson.data?.status === "success"
    ) {
      return res.json({ success: true, data: verifyJson.data });
    }

    return res.status(400).json({
      success: false,
      message: verifyJson?.message || "Verification failed",
      data: verifyJson?.data,
    });
  } catch (e) {
    console.error("Verify error:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.use("*", (_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
