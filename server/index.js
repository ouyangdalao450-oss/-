import cors from "cors";
import cron from "node-cron";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import webpush from "web-push";

const app = express();
const port = Number(process.env.PORT || 8787);
const dataDir = path.resolve("data");
const subscriptionsFile = path.join(dataDir, "subscriptions.json");
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const contactEmail = process.env.VAPID_CONTACT_EMAIL || "mailto:hello@example.com";
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

if (!publicVapidKey || !privateVapidKey) {
  console.warn("Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY. Run `npm run keys` and set env vars.");
} else {
  webpush.setVapidDetails(contactEmail, publicVapidKey, privateVapidKey);
}

app.use(cors({ origin: allowedOrigin === "*" ? true : allowedOrigin }));
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/vapid-public-key", (_request, response) => {
  if (!publicVapidKey) {
    response.status(503).json({ error: "VAPID public key is not configured." });
    return;
  }
  response.json({ publicKey: publicVapidKey });
});

app.post("/api/subscribe", async (request, response) => {
  const { subscription, settings, messages, timezone } = request.body || {};

  if (!subscription?.endpoint || !settings) {
    response.status(400).json({ error: "Missing subscription or settings." });
    return;
  }

  const subscriptions = await readSubscriptions();
  const saved = {
    endpoint: subscription.endpoint,
    subscription,
    settings,
    messages: Array.isArray(messages) ? messages.filter(Boolean).slice(0, 80) : [],
    timezone: timezone || "Asia/Shanghai",
    lastSentSlot: "",
    updatedAt: new Date().toISOString()
  };

  const next = subscriptions.filter((item) => item.endpoint !== subscription.endpoint);
  next.push(saved);
  await writeSubscriptions(next);
  response.json({ ok: true });
});

app.post("/api/unsubscribe", async (request, response) => {
  const { endpoint } = request.body || {};
  if (!endpoint) {
    response.status(400).json({ error: "Missing endpoint." });
    return;
  }

  const subscriptions = await readSubscriptions();
  await writeSubscriptions(subscriptions.filter((item) => item.endpoint !== endpoint));
  response.json({ ok: true });
});

app.post("/api/test", async (request, response) => {
  const { subscription, body } = request.body || {};
  if (!subscription?.endpoint) {
    response.status(400).json({ error: "Missing subscription." });
    return;
  }

  await sendPush(subscription, {
    title: "动了么",
    body: body || "乖乖，这是一条测试推送。"
  });
  response.json({ ok: true });
});

cron.schedule("* * * * *", () => {
  sendDueReminders().catch((error) => console.error("Reminder job failed:", error));
});

app.listen(port, () => {
  console.log(`动了么 push server listening on ${port}`);
});

async function sendDueReminders() {
  if (!publicVapidKey || !privateVapidKey) return;

  const subscriptions = await readSubscriptions();
  const now = new Date();
  let changed = false;
  const active = [];

  for (const item of subscriptions) {
    const dueSlot = dueReminderSlot(now, item.settings, item.timezone);
    if (!dueSlot || item.lastSentSlot === dueSlot) {
      active.push(item);
      continue;
    }

    const body = warmAddress(selectMessage(item.messages));

    try {
      await sendPush(item.subscription, { title: "动了么", body });
      active.push({ ...item, lastSentSlot: dueSlot });
      changed = true;
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        changed = true;
      } else {
        console.error("Push failed:", error);
        active.push(item);
      }
    }
  }

  if (changed) {
    await writeSubscriptions(active);
  }
}

function dueReminderSlot(date, settings, timezone) {
  const parts = dateParts(date, timezone);
  if (!isWorkingDay(parts.weekday, settings.workSchedule)) return "";

  const minuteOfDay = parts.hour * 60 + parts.minute;
  const start = minutesFromTime(settings.startTime);
  const end = minutesFromTime(settings.endTime);
  const breakStart = minutesFromTime(settings.breakStart);
  const breakEnd = minutesFromTime(settings.breakEnd);
  const interval = Number(settings.intervalMinutes || 60);

  if (end <= start || minuteOfDay < start || minuteOfDay > end) return "";
  if (breakEnd > breakStart && minuteOfDay >= breakStart && minuteOfDay < breakEnd) return "";
  if ((minuteOfDay - start) % interval !== 0 || minuteOfDay === start) return "";

  return `${parts.dateKey}-${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function dateParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false
  });
  const values = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
    weekday: weekdayMap[values.weekday]
  };
}

function isWorkingDay(weekday, schedule) {
  if (schedule === "none") return true;
  if (schedule === "single") return weekday !== 0;
  return weekday !== 0 && weekday !== 6;
}

function minutesFromTime(value = "00:00") {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function selectMessage(messages) {
  const defaults = [
    "起来接一杯水吧，让身体也换一口新鲜空气。",
    "轻轻转转肩膀，刚刚那段专注已经很好了。",
    "站起来伸个懒腰，给自己一点松开的空间。"
  ];
  const pool = messages.length ? messages : defaults;
  return pool[Math.floor(Math.random() * pool.length)];
}

function warmAddress(text) {
  return text.startsWith("乖乖") ? text : `乖乖，${text}`;
}

async function sendPush(subscription, payload) {
  await webpush.sendNotification(subscription, JSON.stringify(payload));
}

async function readSubscriptions() {
  try {
    const content = await fs.readFile(subscriptionsFile, "utf8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeSubscriptions(subscriptions) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(subscriptionsFile, JSON.stringify(subscriptions, null, 2));
}
