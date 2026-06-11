const defaultMessages = [
  "起来接一杯水吧，让身体也换一口新鲜空气。",
  "轻轻转转肩膀，刚刚那段专注已经很好了。",
  "站起来伸个懒腰，给自己一点松开的空间。"
];

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return emptyResponse(env);
    }

    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/api/health") {
        return jsonResponse({ ok: true }, env);
      }

      if (request.method === "GET" && url.pathname === "/api/vapid-public-key") {
        if (!env.VAPID_PUBLIC_KEY) {
          return jsonResponse({ error: "VAPID public key is not configured." }, env, 503);
        }
        return jsonResponse({ publicKey: env.VAPID_PUBLIC_KEY }, env);
      }

      if (request.method === "POST" && url.pathname === "/api/subscribe") {
        return subscribe(request, env);
      }

      if (request.method === "POST" && url.pathname === "/api/unsubscribe") {
        return unsubscribe(request, env);
      }

      if (request.method === "POST" && url.pathname === "/api/test") {
        return sendTestPush(request, env);
      }

      return jsonResponse({ error: "Not found." }, env, 404);
    } catch (error) {
      return jsonResponse({ error: error.message || "Unexpected worker error." }, env, 500);
    }
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sendDueReminders(env));
  }
};

async function subscribe(request, env) {
  const { subscription, settings, messages, timezone } = await request.json();

  if (!subscription?.endpoint || !settings) {
    return jsonResponse({ error: "Missing subscription or settings." }, env, 400);
  }

  const key = await subscriptionKey(subscription.endpoint);
  await env.SUBSCRIPTIONS.put(key, JSON.stringify({
    endpoint: subscription.endpoint,
    subscription,
    settings,
    messages: Array.isArray(messages) ? messages.filter(Boolean).slice(0, 80) : [],
    timezone: timezone || "Asia/Shanghai",
    lastSentSlot: "",
    updatedAt: new Date().toISOString()
  }));

  return jsonResponse({ ok: true }, env);
}

async function unsubscribe(request, env) {
  const { endpoint } = await request.json();
  if (!endpoint) {
    return jsonResponse({ error: "Missing endpoint." }, env, 400);
  }

  await env.SUBSCRIPTIONS.delete(await subscriptionKey(endpoint));
  return jsonResponse({ ok: true }, env);
}

async function sendTestPush(request, env) {
  const { subscription, body } = await request.json();
  if (!subscription?.endpoint) {
    return jsonResponse({ error: "Missing subscription." }, env, 400);
  }

  await sendPush(env, subscription, {
    title: "动了么",
    body: body || "乖乖，这是一条测试推送。"
  });
  return jsonResponse({ ok: true }, env);
}

async function sendDueReminders(env) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.SUBSCRIPTIONS) return;

  let cursor;
  do {
    const page = await env.SUBSCRIPTIONS.list({ cursor, limit: 100 });
    cursor = page.cursor;

    await Promise.all(page.keys.map(async ({ name }) => {
      const item = await env.SUBSCRIPTIONS.get(name, "json");
      if (!item) return;

      const dueSlot = dueReminderSlot(new Date(), item.settings, item.timezone);
      if (!dueSlot || item.lastSentSlot === dueSlot) return;

      try {
        await sendPush(env, item.subscription, {
          title: "动了么",
          body: warmAddress(selectMessage(item.messages || []))
        });
        await env.SUBSCRIPTIONS.put(name, JSON.stringify({
          ...item,
          lastSentSlot: dueSlot,
          updatedAt: new Date().toISOString()
        }));
      } catch (error) {
        if (error.status === 404 || error.status === 410) {
          await env.SUBSCRIPTIONS.delete(name);
        } else {
          console.error("Push failed", error);
        }
      }
    }));
  } while (cursor);
}

function dueReminderSlot(date, settings, timezone) {
  const parts = dateParts(date, timezone || "Asia/Shanghai");
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
  const pool = messages.length ? messages : defaultMessages;
  return pool[Math.floor(Math.random() * pool.length)];
}

function warmAddress(text) {
  return text.startsWith("乖乖") ? text : `乖乖，${text}`;
}

async function sendPush(env, subscription, payload) {
  const endpoint = new URL(subscription.endpoint);
  const audience = `${endpoint.protocol}//${endpoint.host}`;
  const jwt = await createVapidJwt(env, audience);
  const encrypted = await encryptPushPayload(subscription, JSON.stringify(payload));

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "2419200",
      Urgency: "normal"
    },
    body: encrypted
  });

  if (!response.ok) {
    const error = new Error(`Push service returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
}

async function createVapidJwt(env, audience) {
  const publicKey = base64UrlToBytes(env.VAPID_PUBLIC_KEY);
  const privateKey = base64UrlToBytes(env.VAPID_PRIVATE_KEY);
  const jwk = {
    kty: "EC",
    crv: "P-256",
    ext: true,
    key_ops: ["sign"],
    x: bytesToBase64Url(publicKey.slice(1, 33)),
    y: bytesToBase64Url(publicKey.slice(33, 65)),
    d: bytesToBase64Url(privateKey)
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const header = bytesToBase64Url(utf8(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = bytesToBase64Url(utf8(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: env.VAPID_CONTACT_EMAIL || "mailto:hello@example.com"
  })));
  const unsigned = `${header}.${body}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    utf8(unsigned)
  );

  return `${unsigned}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

async function encryptPushPayload(subscription, payload) {
  const receiverPublicKey = base64UrlToBytes(subscription.keys.p256dh);
  const authSecret = base64UrlToBytes(subscription.keys.auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const serverKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const serverPublicKey = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeys.publicKey));
  const receiverKey = await crypto.subtle.importKey(
    "raw",
    receiverPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "ECDH", public: receiverKey },
    serverKeys.privateKey,
    256
  ));

  const keyInfo = concatBytes(
    utf8("WebPush: info\0"),
    receiverPublicKey,
    serverPublicKey
  );
  const inputKeyMaterial = await hkdf(authSecret, sharedSecret, keyInfo, 32);
  const contentEncryptionKey = await hkdf(salt, inputKeyMaterial, utf8("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, inputKeyMaterial, utf8("Content-Encoding: nonce\0"), 12);
  const plainText = concatBytes(utf8(payload), new Uint8Array([2]));
  const cryptoKey = await crypto.subtle.importKey("raw", contentEncryptionKey, "AES-GCM", false, ["encrypt"]);
  const cipherText = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cryptoKey, plainText));
  const recordSize = new Uint8Array([0, 0, 16, 0]);

  return concatBytes(salt, recordSize, new Uint8Array([serverPublicKey.length]), serverPublicKey, cipherText);
}

async function hkdf(salt, inputKeyMaterial, info, length) {
  const key = await crypto.subtle.importKey("raw", inputKeyMaterial, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

async function subscriptionKey(endpoint) {
  const digest = await crypto.subtle.digest("SHA-256", utf8(endpoint));
  return `subscription:${bytesToBase64Url(new Uint8Array(digest))}`;
}

function jsonResponse(data, env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders(env)
  });
}

function emptyResponse(env) {
  return new Response(null, { headers: responseHeaders(env) });
}

function responseHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8"
  };
}

function utf8(value) {
  return new TextEncoder().encode(value);
}

function concatBytes(...arrays) {
  const length = arrays.reduce((total, item) => total + item.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  arrays.forEach((item) => {
    output.set(item, offset);
    offset += item.length;
  });
  return output;
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesToBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
