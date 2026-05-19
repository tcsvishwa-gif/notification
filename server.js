// 🔥 Telegram Notification Server — Guaranteed Delivery Version

import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import https from "https";

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 Telegram Config
const TELEGRAM_BOT_TOKEN = "YOUR_NEW_BOT_TOKEN";
const TELEGRAM_CHAT_ID = "1449074180";

// 🔥 Queue to hold failed notifications
let retryQueue = [];

// 🔥 Function to send Telegram Message
async function sendToTelegram(text) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
        }),

        // ✅ Force IPv4 (fixes AWS EC2 Telegram issue)
        agent: new https.Agent({
          family: 4,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.log("❌ Telegram Error:", data);

      retryQueue.push(text);
      return false;
    }

    console.log("✅ Telegram sent:", text);

    return true;
  } catch (err) {
    console.log("⚠️ Network/Server Error:", err.message);

    retryQueue.push(text);

    return false;
  }
}

// 🔄 Retry failed notifications every 5 seconds
setInterval(async () => {
  if (retryQueue.length === 0) return;

  console.log("🔁 Retrying queued notifications...");

  const failedMessages = [...retryQueue];

  retryQueue = [];

  for (const msg of failedMessages) {
    const success = await sendToTelegram(msg);

    if (!success) {
      retryQueue.push(msg);
    }
  }
}, 5000);

// 🔥 Main API
app.post("/send", async (req, res) => {
  const { message } = req.body;

  if (!message || message.trim() === "") {
    return res.status(400).json({
      error: "Message text is required",
    });
  }

  const success = await sendToTelegram(message);

  if (success) {
    res.json({
      success: true,
    });
  } else {
    res.json({
      success: false,
      queued: true,
    });
  }
});

// 🔥 Health Check Route
app.get("/", (req, res) => {
  res.send("🚀 Telegram Notification Server Running");
});

// 🔥 Start Server
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on ${PORT}`);
});
