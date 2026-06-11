const quotes = [
  "起来接一杯水吧，让身体也换一口新鲜空气。",
  "轻轻转转肩膀，刚刚那段专注已经很好了。",
  "把视线从屏幕上移开一会儿，看看远一点的地方。",
  "站起来伸个懒腰，给自己一点松开的空间。",
  "慢慢呼吸一下，身体会知道你在照顾它。",
  "走两步也很好，今天的节奏可以柔软一点。",
  "手腕和肩颈辛苦了，陪它们活动一小会儿。",
  "离开椅子 20 秒，回来时也许会更轻松。",
  "窗外、走廊、茶水间，都可以是一个小小的暂停。",
  "把脚踩稳，抬抬头，给自己一点回到身体里的时间。",
  "刚才辛苦啦，现在轮到身体被温柔照顾一下。",
  "轻轻活动一下，不急，慢慢来就很好。",
  "站起来晃一晃，让一天不要一直停在同一个姿势里。",
  "喝口水，松松肩，给接下来的自己留点余力。",
  "眼睛休息 20 秒，思绪也可以顺便透透气。",
  "把背舒展开一点，像给自己按下一个小小的刷新键。",
  "从椅子上离开一会儿，让身体重新流动起来。",
  "慢慢站起来，今天已经完成了不少事情。",
  "给肩颈一点空间，也给心情一点空间。",
  "活动一下手臂，回来继续也不迟。",
  "如果方便的话，去倒杯水，顺便走几步。",
  "小小的活动也算数，身体会喜欢这样的照顾。",
  "把下巴轻轻收回来，肩膀放松一点点。",
  "让眼睛看看远处，让身体换个姿势。",
  "起身不是打断，是给自己一点温柔的间隙。",
  "刚刚那段专注很棒，现在可以舒展一下。",
  "轻轻转转脖子，别着急，慢一点也很好。",
  "站起来的这 20 秒，是今天给自己的小礼物。",
  "走动一下，让僵硬慢慢散开。",
  "把手臂举起来伸一伸，像把疲惫轻轻抖掉。",
  "给身体一点回应，它一直在陪你工作。",
  "短短一会儿也够了，温柔地动一下吧。",
  "离开屏幕一点点，回来时可能会更清醒。",
  "肩膀放下来，呼吸慢一点，今天可以不用绷太紧。",
  "站一会儿，喝口水，照顾好此刻的自己。",
  "把身体从久坐里带出来一点点。",
  "这一次不用很标准，只要轻轻动起来。",
  "给自己 20 秒，像在忙碌里开一扇小窗。",
  "慢慢舒展，今天也在好好往前走。",
  "活动一下吧，身体会把这份温柔记下来。"
];

const completionMessages = [
  "今天的活动目标完成啦，辛苦的身体也被好好照顾到了。",
  "很棒，今天每一次小小起身都没有白费。",
  "今日目标达成，愿你下班时身体轻一点、心情也松一点。",
  "你把忙碌里的小暂停坚持下来了，这很不容易。",
  "今天照顾自己的份额完成了，给现在的你一个温柔的肯定。"
];

const dailyGoal = 5;
const storageKey = "move-hourly-state-v1";
const ringLength = 326.7;
const pushServerUrl = "https://donglema-push-worker.ouyangdalao450.workers.dev";

const dom = {
  reminderState: document.querySelector("#reminderState"),
  nextReminder: document.querySelector("#nextReminder"),
  activeWindow: document.querySelector("#activeWindow"),
  timerValue: document.querySelector("#timerValue"),
  timerRing: document.querySelector("#timerRing"),
  startMoveBtn: document.querySelector("#startMoveBtn"),
  testReminderBtn: document.querySelector("#testReminderBtn"),
  openSettingsBtn: document.querySelector("#openSettingsBtn"),
  quoteText: document.querySelector("#quoteText"),
  newQuoteBtn: document.querySelector("#newQuoteBtn"),
  startTime: document.querySelector("#startTime"),
  breakStart: document.querySelector("#breakStart"),
  breakEnd: document.querySelector("#breakEnd"),
  endTime: document.querySelector("#endTime"),
  workSchedule: document.querySelector("#workSchedule"),
  intervalMinutes: document.querySelector("#intervalMinutes"),
  autoStartToggle: document.querySelector("#autoStartToggle"),
  notificationToggle: document.querySelector("#notificationToggle"),
  notificationStatus: document.querySelector("#notificationStatus"),
  holidayToggle: document.querySelector("#holidayToggle"),
  customMessages: document.querySelector("#customMessages"),
  progressTitle: document.querySelector("#progressTitle"),
  completionMessage: document.querySelector("#completionMessage"),
  progressBar: document.querySelector("#progressBar"),
  slotGrid: document.querySelector("#slotGrid"),
  achievementGrid: document.querySelector("#achievementGrid"),
  dayOverrideBtn: document.querySelector("#dayOverrideBtn"),
  settingsDialog: document.querySelector("#settingsDialog"),
  settingsForm: document.querySelector("#settingsForm"),
  closeSettingsBtn: document.querySelector("#closeSettingsBtn"),
  reminderDialog: document.querySelector("#reminderDialog"),
  dialogQuote: document.querySelector("#dialogQuote"),
  dialogTimerValue: document.querySelector("#dialogTimerValue"),
  dialogStartBtn: document.querySelector("#dialogStartBtn"),
  laterBtn: document.querySelector("#laterBtn")
};

let reminderTimer = null;
let countdownTimer = null;
let completedByTimer = false;
let state = loadState();

function loadState() {
  const fallback = {
    startTime: "09:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    endTime: "18:00",
    workSchedule: "double",
    intervalMinutes: 60,
    setupComplete: false,
    autoStart: true,
    holidayRest: true,
    notificationWanted: false,
    notifications: false,
    notificationPermission: "default",
    customMessages: "",
    dayOverrides: {},
    checkInDates: [],
    bestStreakDays: 0,
    totalMoves: 0,
    lastMoveDate: "",
    streakDays: 0,
    days: {}
  };

  try {
    return normalizeState({ ...fallback, ...JSON.parse(localStorage.getItem(storageKey)) });
  } catch {
    return normalizeState(fallback);
  }
}

function normalizeState(savedState) {
  savedState.days = savedState.days || {};
  savedState.dayOverrides = savedState.dayOverrides || {};
  savedState.checkInDates = savedState.checkInDates || [];
  savedState.notificationWanted = Boolean(savedState.notificationWanted || savedState.notifications);
  savedState.notificationPermission = savedState.notificationPermission || notificationPermission();

  Object.entries(savedState.days).forEach(([dateKey, record]) => {
    if ((record.moves || 0) >= dailyGoal && !savedState.checkInDates.includes(dateKey)) {
      savedState.checkInDates.push(dateKey);
    }
  });

  savedState.checkInDates = uniqueSortedDates(savedState.checkInDates);
  savedState.bestStreakDays = Math.max(savedState.bestStreakDays || 0, calculateBestStreak(savedState.checkInDates));
  savedState.streakDays = calculateCurrentStreak(savedState.checkInDates);
  return savedState;
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function notificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function isStandaloneApp() {
  return Boolean(window.navigator.standalone || window.matchMedia("(display-mode: standalone)").matches);
}

function notificationStatusText() {
  if (!pushServerUrl) {
    return "锁屏后台推送需要先部署推送后端。部署后把服务地址填进 app.js 的 pushServerUrl。";
  }

  if (!state.notificationWanted) {
    return "手机推送未开启。";
  }

  if (!("Notification" in window)) {
    return "已保存推送偏好。iPhone 需要先用 Safari 添加到主屏幕，再从主屏幕图标打开后授权通知。";
  }

  if (!isStandaloneApp()) {
    return "已保存推送偏好。iPhone 上建议添加到主屏幕后再授权通知。";
  }

  if (Notification.permission === "granted") {
    return "手机通知已授权，后端会按工作时间推送提醒语。";
  }

  if (Notification.permission === "denied") {
    return "已保存推送偏好，但系统通知权限被拒绝了，需要到系统设置里重新允许。";
  }

  return "已保存推送偏好，保存时会向系统请求通知权限。";
}

function minutesFromTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSlots() {
  if (!isWorkingDay()) return [];

  const start = minutesFromTime(state.startTime);
  const breakStart = minutesFromTime(state.breakStart);
  const breakEnd = minutesFromTime(state.breakEnd);
  const end = minutesFromTime(state.endTime);
  const interval = Number(state.intervalMinutes);
  if (end <= start) return [];

  const slots = [];
  for (let minute = start + interval; minute <= end; minute += interval) {
    const isBreak = breakEnd > breakStart && minute >= breakStart && minute < breakEnd;
    if (!isBreak) slots.push(timeFromMinutes(minute));
  }
  return slots;
}

function baseWorkingDay(date = new Date()) {
  const day = date.getDay();
  if (state.workSchedule === "none") return true;
  if (state.workSchedule === "single") return day !== 0;
  return day !== 0 && day !== 6;
}

function isKnownHoliday(date = new Date()) {
  const knownHolidayKeys = new Set([]);
  return knownHolidayKeys.has(localDateKey(date));
}

function isWorkingDay(date = new Date()) {
  const todayOverride = state.dayOverrides[localDateKey(date)];
  if (todayOverride === "work") return true;
  if (todayOverride === "rest") return false;
  if (state.holidayRest && isKnownHoliday(date)) return false;
  return baseWorkingDay(date);
}

function scheduleLabel() {
  const labels = {
    double: "双休",
    single: "单休",
    none: "无固定休息"
  };
  return labels[state.workSchedule] || labels.double;
}

function todayRecord() {
  const todayKey = localDateKey();
  if (!state.days[todayKey]) {
    state.days[todayKey] = { completedSlots: [], moves: 0 };
  }
  return state.days[todayKey];
}

function uniqueSortedDates(dates) {
  return [...new Set(dates)].sort();
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(previousKey, nextKey) {
  const previous = dateFromKey(previousKey);
  const next = dateFromKey(nextKey);
  return Math.round((next - previous) / 86400000);
}

function calculateCurrentStreak(dates) {
  const sorted = uniqueSortedDates(dates);
  if (!sorted.length) return 0;

  let streak = 0;
  let cursor = new Date();

  while (sorted.includes(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function calculateBestStreak(dates) {
  const sorted = uniqueSortedDates(dates);
  if (!sorted.length) return 0;

  let best = 1;
  let streak = 1;

  for (let index = 1; index < sorted.length; index += 1) {
    if (daysBetween(sorted[index - 1], sorted[index]) === 1) {
      streak += 1;
    } else {
      streak = 1;
    }
    best = Math.max(best, streak);
  }

  return best;
}

function refreshCheckInStats() {
  state.checkInDates = uniqueSortedDates(state.checkInDates || []);
  state.streakDays = calculateCurrentStreak(state.checkInDates);
  state.bestStreakDays = Math.max(state.bestStreakDays || 0, calculateBestStreak(state.checkInDates));
}

function markCheckInIfReady(record = todayRecord()) {
  if (record.moves < dailyGoal) return;

  const todayKey = localDateKey();
  if (!state.checkInDates.includes(todayKey)) {
    state.checkInDates.push(todayKey);
  }
  refreshCheckInStats();
}

function currentSlot() {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const slots = getSlots();
  const slot = slots.find((item) => minutesFromTime(item) >= nowMinutes);
  return slot || slots.at(-1) || "活动";
}

function randomQuote() {
  const custom = state.customMessages
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const pool = [...quotes, ...custom];
  return pool[Math.floor(Math.random() * pool.length)];
}

function warmAddress(text) {
  return text.startsWith("乖乖") ? text : `乖乖，${text}`;
}

function setQuote() {
  const quote = warmAddress(randomQuote());
  dom.quoteText.textContent = quote;
  dom.dialogQuote.textContent = quote;
}

function completionMessage() {
  const index = Math.min(completionMessages.length - 1, localDateKey().split("-").join("") % completionMessages.length);
  return completionMessages[index];
}

function scheduleReminder() {
  window.clearTimeout(reminderTimer);

  if (!state.setupComplete) {
    dom.nextReminder.textContent = "先完成设置";
    dom.reminderState.textContent = "待设置";
    dom.reminderState.classList.remove("on");
    return;
  }

  if (!isWorkingDay()) {
    dom.nextReminder.textContent = "今天休息";
    dom.reminderState.textContent = "已暂停";
    dom.reminderState.classList.remove("on");
    return;
  }

  const next = nextReminderDate();

  if (!next) {
    dom.nextReminder.textContent = "不在工作时段";
    dom.reminderState.textContent = "待明天";
    dom.reminderState.classList.remove("on");
    return;
  }

  const delay = Math.max(1000, next.getTime() - Date.now());
  dom.nextReminder.textContent = next.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  dom.reminderState.textContent = "已开启";
  dom.reminderState.classList.add("on");
  reminderTimer = window.setTimeout(showReminder, delay);
}

function nextReminderDate() {
  const now = new Date();
  const start = minutesFromTime(state.startTime);
  const breakStart = minutesFromTime(state.breakStart);
  const breakEnd = minutesFromTime(state.breakEnd);
  const end = minutesFromTime(state.endTime);
  const interval = Number(state.intervalMinutes);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (end <= start) return null;

  let nextMinutes = start + interval;
  while (nextMinutes <= end && nextMinutes <= nowMinutes) {
    nextMinutes += interval;
  }

  while (breakEnd > breakStart && nextMinutes >= breakStart && nextMinutes < breakEnd) {
    nextMinutes += interval;
  }

  if (nextMinutes > end) return null;

  const next = new Date(now);
  next.setHours(Math.floor(nextMinutes / 60), nextMinutes % 60, 0, 0);
  return next;
}

async function showReminder() {
  setQuote();
  await showAppNotification("动了么", dom.dialogQuote.textContent, "move-reminder");

  if (!dom.reminderDialog.open) {
    dom.reminderDialog.showModal();
  }

  if (state.autoStart) {
    startMove();
  }
  scheduleReminder();
}

function startMove() {
  if (countdownTimer) return;

  completedByTimer = false;
  const endAt = Date.now() + 20000;
  dom.startMoveBtn.disabled = true;
  dom.startMoveBtn.textContent = "活动中";
  renderCountdown(20);

  countdownTimer = window.setInterval(() => {
    const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    renderCountdown(remaining);

    if (remaining <= 0) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
      completeMove();
    }
  }, 1000);
}

function renderCountdown(remaining) {
  dom.timerValue.textContent = remaining;
  dom.dialogTimerValue.textContent = remaining;
  updateRing(remaining);
}

function updateRing(remaining) {
  const progress = remaining / 20;
  dom.timerRing.style.strokeDashoffset = String(ringLength * (1 - progress));
}

function completeMove() {
  completedByTimer = true;
  const record = todayRecord();
  const slot = currentSlot();

  if (!record.completedSlots.includes(slot)) {
    record.completedSlots.push(slot);
  }

  record.moves += 1;
  state.totalMoves += 1;
  markCheckInIfReady(record);
  saveState();
  dom.startMoveBtn.disabled = false;
  dom.startMoveBtn.textContent = "手动活动 20 秒";
  dom.timerValue.textContent = "20";
  dom.dialogTimerValue.textContent = "20";
  updateRing(20);
  dom.reminderDialog.close();
  render();
}

function cancelMove() {
  if (!countdownTimer) return;
  window.clearInterval(countdownTimer);
  countdownTimer = null;
  dom.startMoveBtn.disabled = false;
  dom.startMoveBtn.textContent = "手动活动 20 秒";
  dom.timerValue.textContent = "20";
  dom.dialogTimerValue.textContent = "20";
  updateRing(20);
}

function updateStreak() {
  const todayKey = localDateKey();
  if (state.lastMoveDate === todayKey) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDateKey(yesterday);
  state.streakDays = state.lastMoveDate === yesterdayKey ? state.streakDays + 1 : 1;
  state.lastMoveDate = todayKey;
}

function render() {
  refreshCheckInStats();
  dom.startTime.value = state.startTime;
  dom.breakStart.value = state.breakStart;
  dom.breakEnd.value = state.breakEnd;
  dom.endTime.value = state.endTime;
  dom.workSchedule.value = state.workSchedule;
  dom.intervalMinutes.value = String(state.intervalMinutes);
  dom.autoStartToggle.checked = state.autoStart;
  state.notificationPermission = notificationPermission();
  dom.notificationToggle.checked = state.notificationWanted;
  dom.notificationStatus.textContent = notificationStatusText();
  dom.holidayToggle.checked = state.holidayRest;
  dom.customMessages.value = state.customMessages;
  dom.activeWindow.textContent = `${scheduleLabel()} ${state.startTime}-${state.endTime}，午休 ${state.breakStart}-${state.breakEnd}`;
  dom.dayOverrideBtn.textContent = isWorkingDay() ? "今天休息" : "今天工作";

  const record = todayRecord();
  const done = Math.min(record.moves, dailyGoal);
  const completedToday = state.setupComplete && isWorkingDay() && record.moves >= dailyGoal;
  dom.progressTitle.textContent = !state.setupComplete ? "待设置" : (isWorkingDay() ? `${done} / ${dailyGoal} 次` : "今天休息");
  dom.completionMessage.textContent = completedToday ? completionMessage() : "";
  dom.completionMessage.hidden = !completedToday;
  dom.progressBar.style.width = state.setupComplete && isWorkingDay() ? `${Math.min(100, (done / dailyGoal) * 100)}%` : "0%";

  dom.slotGrid.innerHTML = Array.from({ length: dailyGoal }, (_, index) => {
    const count = index + 1;
    const isDone = record.moves >= count;
    return `<div class="slot check-slot ${isDone ? "done" : ""}"><strong>${count}</strong><span>${isDone ? "已完成" : "待活动"}</span></div>`;
  }).join("");

  const totalCheckIns = state.checkInDates.length;
  const checkedInToday = state.checkInDates.includes(localDateKey());
  const checkInCards = [
    { title: "已坚持", value: `${totalCheckIns} 天`, detail: checkedInToday ? "今天已签到" : "满 5 次自动签到" },
    { title: "连续坚持", value: `${state.streakDays} 天`, detail: state.streakDays > 0 ? "保持得很稳" : "今天完成后开始计算" },
    { title: "最长连续", value: `${state.bestStreakDays || 0} 天`, detail: "慢慢攒起来的记录" },
    { title: "累计活动", value: `${state.totalMoves} 次`, detail: "每一次都算数" }
  ];

  dom.achievementGrid.innerHTML = checkInCards.map((card) => {
    return `
      <div class="achievement unlocked">
        <b>${card.value}</b>
        <strong>${card.title}</strong>
        <span>${card.detail}</span>
      </div>
    `;
  }).join("");

  scheduleReminder();

  if (!state.setupComplete && !dom.settingsDialog.open) {
    dom.settingsDialog.showModal();
  }
}

async function requestNotifications() {
  if (!pushServerUrl) {
    state.notificationWanted = true;
    state.notifications = false;
    state.notificationPermission = notificationPermission();
    saveState();
    render();
    return false;
  }

  if (!state.notificationWanted) {
    await unsubscribeFromPushServer();
    state.notifications = false;
    state.notificationPermission = notificationPermission();
    saveState();
    render();
    return false;
  }

  if (!("Notification" in window)) {
    state.notificationWanted = true;
    state.notifications = false;
    state.notificationPermission = "unsupported";
    saveState();
    render();
    return false;
  }

  const permission = await Notification.requestPermission();
  state.notificationWanted = true;
  state.notificationPermission = permission;
  state.notifications = permission === "granted";
  if (state.notifications) {
    try {
      await subscribeToPushServer();
      await showAppNotification(
        "动了么已开启",
        warmAddress("这是一条测试通知。之后会按工作时间把提醒语推送给你。"),
        "move-reminder-enabled"
      );
    } catch (error) {
      console.error("Push setup failed", error);
      state.notifications = false;
    }
  }
  saveState();
  render();
  return state.notifications;
}

async function subscribeToPushServer() {
  if (!pushServerUrl || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  const publicKeyResponse = await fetch(`${pushServerUrl}/api/vapid-public-key`);
  if (!publicKeyResponse.ok) return false;

  const { publicKey } = await publicKeyResponse.json();
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
  }

  const response = await fetch(`${pushServerUrl}/api/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription,
      settings: {
        startTime: state.startTime,
        breakStart: state.breakStart,
        breakEnd: state.breakEnd,
        endTime: state.endTime,
        workSchedule: state.workSchedule,
        intervalMinutes: state.intervalMinutes
      },
      messages: [...quotes, ...state.customMessages.split("\n").map((item) => item.trim()).filter(Boolean)],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai"
    })
  });

  if (response.ok) {
    await fetch(`${pushServerUrl}/api/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription,
        body: warmAddress("这是一条测试推送。之后锁屏时也会按工作时间提醒你。")
      })
    });
  }

  return response.ok;
}

async function unsubscribeFromPushServer() {
  if (!pushServerUrl || !("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await fetch(`${pushServerUrl}/api/unsubscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint })
  }).catch(() => {});
  await subscription.unsubscribe();
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function showAppNotification(title, body, tag) {
  if (!state.notificationWanted || !("Notification" in window) || Notification.permission !== "granted") {
    return false;
  }

  const options = {
    body,
    tag,
    icon: "icon.svg",
    badge: "icon.svg"
  };

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return true;
    } catch {}
  }

  new Notification(title, options);
  return true;
}

dom.startMoveBtn.addEventListener("click", startMove);
dom.dialogStartBtn.addEventListener("click", startMove);
dom.testReminderBtn.addEventListener("click", showReminder);
dom.newQuoteBtn.addEventListener("click", setQuote);
dom.openSettingsBtn.addEventListener("click", () => {
  dom.settingsDialog.showModal();
});
dom.laterBtn.addEventListener("click", cancelMove);
dom.reminderDialog.addEventListener("close", () => {
  if (!completedByTimer) cancelMove();
  completedByTimer = false;
});

dom.settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  state.startTime = dom.startTime.value;
  state.breakStart = dom.breakStart.value;
  state.breakEnd = dom.breakEnd.value;
  state.endTime = dom.endTime.value;
  state.workSchedule = dom.workSchedule.value;
  state.intervalMinutes = Number(dom.intervalMinutes.value);
  state.autoStart = dom.autoStartToggle.checked;
  state.holidayRest = dom.holidayToggle.checked;
  state.customMessages = dom.customMessages.value;
  state.notificationWanted = dom.notificationToggle.checked;
  state.setupComplete = true;
  state.notificationPermission = notificationPermission();
  state.notifications = state.notificationWanted && state.notificationPermission === "granted";
  saveState();
  dom.settingsDialog.close();
  setQuote();
  render();

  try {
    if (state.notificationWanted && state.notificationPermission !== "granted") {
      await requestNotifications();
    } else if (state.notifications) {
      await subscribeToPushServer();
    } else if (!state.notificationWanted) {
      await unsubscribeFromPushServer();
    }
  } catch (error) {
    console.error("Notification sync failed", error);
    state.notifications = false;
    saveState();
    render();
  }
});

dom.closeSettingsBtn.addEventListener("click", () => {
  if (state.setupComplete) {
    dom.settingsDialog.close();
  }
});

dom.dayOverrideBtn.addEventListener("click", () => {
  const todayKey = localDateKey();
  state.dayOverrides[todayKey] = isWorkingDay() ? "rest" : "work";
  saveState();
  render();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

setQuote();
render();
