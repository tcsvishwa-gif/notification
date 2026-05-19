// 🔥 Telegram Notification Server — Guaranteed Delivery Version

import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Telegram Config
const TELEGRAM_BOT_TOKEN = "8250275700:AAEEb_jHPtRtykuvrlwxgYJjjGFogKSW8hk";
const TELEGRAM_CHAT_ID = "1449074180";

// 🔥 Queue to hold failed notifications and retry later
let retryQueue = [];

// 🔥 Function to send Telegram Message (with retry)
async function sendToTelegram(text) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.log("❌ Telegram Error:", error);

      // 🔄 Add message to retry queue
      retryQueue.push(text);
      return false;
    }

    console.log("✅ Telegram sent:", text);
    return true;
  } catch (err) {
    console.log("⚠️ Network/Server Error:", err.message);

    // 🔄 Add message to retry queue
    retryQueue.push(text);
    return false;
  }
}

// 🔄 Retry failed messages every 5 seconds
setInterval(async () => {
  if (retryQueue.length === 0) return;

  console.log("🔁 Retrying queued notifications…");

  const failed = [...retryQueue];
  retryQueue = [];

  for (const msg of failed) {
    const success = await sendToTelegram(msg);
    if (!success) retryQueue.push(msg); // retry again next cycle
  }
}, 5000);

// Main API
app.post("/send", async (req, res) => {
  const { message } = req.body;

  if (!message || message.trim() === "") {
    return res.status(400).json({ error: "Message text is required" });
  }

  const success = await sendToTelegram(message);

  if (success) res.json({ success: true });
  else res.json({ success: false, queued: true });
});

app.get("/", (req, res) => {
  res.send("Telegram Notification Server (Retry Enabled)");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("🚀 Server running on", PORT));
