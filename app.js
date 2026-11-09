// app.js — Calories PRO & SaaS Admin Center 2.0 (Gemini 3.8 / 3.5 / 3.1 Only)

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const DEFAULT_ADMIN_HASH = '1752604b17d00efbebacc10984f5c764adc539e0395ecc0ef65f23ee7cfe1075';

const I18N = {
  uk: {
    btn_lang: '🇺🇦 UA',
    today: 'Сьогодні',
    eaten: 'Спожито',
    remaining: 'ккал залишилось',
    over: 'перебір на',
    target: 'Ціль: ',
    burned: 'Спалено',
    add_activity: '+ Активність',
    carbs: '🌾 Вугл.',
    protein: '🥩 Білки',
    fat: '🥑 Жири',
    water: 'Вода',
    nav_home: 'Головна',
    nav_diary: 'Щоденник',
    nav_weight: 'Вага',
    nav_plan: 'План',
    nav_more: 'Ще',
    tip_title: 'Порада дня',
    other_tip: '🎲 Інша порада',
    toast_water_add: 'Додано води',
    toast_water_undo: 'Скасовано воду',
    toast_water_empty: 'Записів води за сьогодні немає'
  },
  en: {
    btn_lang: '🇬🇧 EN',
    today: 'Today',
    eaten: 'Eaten',
    remaining: 'kcal left',
    over: 'over by',
    target: 'Target: ',
    burned: 'Burned',
    add_activity: '+ Activity',
    carbs: '🌾 Carbs',
    protein: '🥩 Protein',
    fat: '🥑 Fats',
    water: 'Water',
    nav_home: 'Home',
    nav_diary: 'Diary',
    nav_weight: 'Weight',
    nav_plan: 'Plan',
    nav_more: 'More',
    tip_title: 'Daily Tip',
    other_tip: '🎲 New Tip',
    toast_water_add: 'Water added',
    toast_water_undo: 'Water canceled',
    toast_water_empty: 'No water logs for today'
  },
  fr: {
    btn_lang: '🇫🇷 FR',
    today: 'Aujourd\'hui',
    eaten: 'Consommé',
    remaining: 'kcal restantes',
    over: 'dépassement de',
    target: 'Cible: ',
    burned: 'Brûlé',
    add_activity: '+ Activité',
    carbs: '🌾 Glucides',
    protein: '🥩 Protéines',
    fat: '🥑 Lipides',
    water: 'Eau',
    nav_home: 'Accueil',
    nav_diary: 'Journal',
    nav_weight: 'Poids',
    nav_plan: 'Plan',
    nav_more: 'Plus',
    tip_title: 'Conseil du jour',
    other_tip: '🎲 Autre conseil',
    toast_water_add: 'Eau ajoutée',
    toast_water_undo: 'Eau annulée',
    toast_water_empty: 'Aucune consommation d\'eau aujourd\'hui'
  }
};

function t(key) {
  const curLang = app.lang || 'uk';
  return (I18N[curLang] && I18N[curLang][key]) || I18N['uk'][key] || key;
}

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

let selectedDateKey = getLocalDateString();
let targetCatalogMeal = 'breakfast';
let activeCatalogCat = 'Усі';
let activeModalItem = null;
let curTipIdx = 0;
let editingProfileId = null;
let lastScannedResult = null;

const DEFAULT_MEAL_SPLIT = { breakfast: 0.25, lunch: 0.33, dinner: 0.27, snack: 0.15 };

const DEFAULT_VISION_PROMPT = [
  "You are an elite clinical nutritionist and visual food-recognition specialist.",
  "Analyze the meal, plate, bowl, or beverage in the image with forensic precision.",
  "1. Identify every distinct food component, estimate weight in grams using plate/cutlery scale.",
  "2. Account for cooking method and hidden fats (frying oil, butter, sour cream, mayo, sauces).",
  "3. For Ukrainian/Eastern European dishes (borscht, varenyky, syrnyky, holubtsi, deruny, kotlety) use authentic homemade recipes.",
  "4. Check consistency: kcal must be roughly equal to 4*p + 4*c + 9*f.",
  "5. Return ONLY valid raw JSON (no markdown, no backticks) with keys: {\"name\": \"Назва українською\", \"grams\": 300, \"kcal\": 450, \"p\": 28.0, \"f\": 16.0, \"c\": 42.0}."
].join(" ");

let app = {
  lang: 'uk',
  seedVersion: 1,
  adminPassHash: DEFAULT_ADMIN_HASH,
  geminiApiKey: '',
  geminiTested: false,
  activeModel: 'gemini-3.8-flash',
  isAdminUnlocked: false,
  activeProfileId: 'u_olena',
  streak: 0,
  aiPromptConfig: DEFAULT_VISION_PROMPT,
  aiScanCount: 0,
  activityLog: [],
  foods: [],
  categories: [],
  tips: [],
  profiles: {
    'u_olena': { id: 'u_olena', name: 'Олена', emoji: '👩', height: 168, startWeight: 65, targetWeight: 58, target: 1965, carbs: 196, protein: 147, fat: 66, waterTarget: 2000, pin: '', mealSplit: { breakfast: 0.25, lunch: 0.33, dinner: 0.27, snack: 0.15 } },
    'u_yakiv': { id: 'u_yakiv', name: 'Яків', emoji: '👨', height: 180, startWeight: 84, targetWeight: 78, target: 2350, carbs: 250, protein: 175, fat: 75, waterTarget: 2500, pin: '', mealSplit: { breakfast: 0.25, lunch: 0.33, dinner: 0.27, snack: 0.15 } }
  },
  shoppingList: [
    { id: 's_1', text: 'Куряче філе (800 г)', checked: false },
    { id: 's_2', text: 'Грецький йогурт (3 шт)', checked: true }
  ],
  days: {}
};

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  const icon = document.getElementById('toastIcon');
  const text = document.getElementById('toastMsg');
  icon.innerText = type === 'success' ? '✓' : (type === 'warning' ? '⚠️' : '❌');
  text.innerText = msg;
  toast.classList.remove('-translate-y-12', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');
  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('-translate-y-12', 'opacity-0');
  }, 2500);
}

function logAudit(action, details) {
  if (!app.activityLog) app.activityLog = [];
  app.activityLog.unshift({
    id: 'act_' + Date.now(),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: getLocalDateString(),
    action,
    details
  });
  if (app.activityLog.length > 60) app.activityLog.pop();
}

function save() {
  try {
    localStorage.setItem('cal_calc_pro_v8', JSON.stringify(app));
  } catch (e) {
    console.error('Помилка збереження у localStorage:', e);
    showToast('Переповнено сховище браузера', 'error');
  }
}

function mergeSeedData() {
  if (typeof SEED_FOODS === 'undefined') return;
  const currentVersion = app.seedVersion || 1;
  const targetVersion = (typeof SEED_VERSION !== 'undefined') ? SEED_VERSION : 2;

  if (!app.foods || app.foods.length < 100 || currentVersion < targetVersion) {
    const existingMap = new Map((app.foods || []).map(f => [f.id, f]));
    SEED_FOODS.forEach(sf => {
      if (!existingMap.has(sf.id)) {
        existingMap.set(sf.id, JSON.parse(JSON.stringify(sf)));
      }
    });
    app.foods = Array.from(existingMap.values());

    if (typeof SEED_CATEGORIES !== 'undefined') {
      const catSet = new Set([...SEED_CATEGORIES, ...(app.categories || [])]);
      app.categories = Array.from(catSet);
    }
    app.seedVersion = targetVersion;
    save();
  }
}

function init() {
  const keys = ['cal_calc_pro_v8', 'cal_pro_assistant_v1', 'cal_calc_pro_v7'];
  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        app = Object.assign(app, parsed);
        break;
      } catch(e){}
    }
  }

  app.isAdminUnlocked = false;
  if (!app.adminPassHash) app.adminPassHash = DEFAULT_ADMIN_HASH;

  // Примусове скидання будь-яких старих моделей (1.5, 2.0, 2.5) на актуальну 3.8 Flash
  const validModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-pro-preview'];
  if (!app.activeModel || !validModels.includes(app.activeModel)) {
    app.activeModel = 'gemini-3.8-flash';
  }

  if (!app.aiPromptConfig || app.aiPromptConfig.length < 30) {
    app.aiPromptConfig = DEFAULT_VISION_PROMPT;
  }

  mergeSeedData();

  if (!app.categories || app.categories.length === 0) {
    app.categories = (typeof SEED_CATEGORIES !== 'undefined') ? [...SEED_CATEGORIES] : ['Звичайне'];
  }
  if (!app.tips || app.tips.length === 0) {
    app.tips = (typeof SEED_TIPS !== 'undefined') ? [...SEED_TIPS] : ['Пийте воду та слідкуйте за раціоном.'];
  }
  if (!app.activityLog) app.activityLog = [];

  if (app.profiles) {
    Object.keys(app.profiles).forEach(id => {
      const p = app.profiles[id];
      if (!p.mealSplit) p.mealSplit = Object.assign({}, DEFAULT_MEAL_SPLIT);
      if (!p.waterTarget) p.waterTarget = 2000;
      if (p.pin === undefined) p.pin = '';
      if (!p.height) p.height = 170;
      if (!p.startWeight) p.startWeight = 65;
      if (!p.targetWeight) p.targetWeight = 58;
    });
  }

  const pKeys = Object.keys(app.profiles || {});
  if (!app.activeProfileId || !app.profiles[app.activeProfileId]) {
    app.activeProfileId = pKeys.length > 0 ? pKeys[0] : null;
  }

  selectedDateKey = getLocalDateString();
  if (app.activeProfileId) {
    ensureDayStructure(app.activeProfileId, selectedDateKey);
  }

  renderCalendarRow();
  applyTranslations();
  renderAll();
  displayCurrentTip();
}

function curProfile() {
  return (app.profiles && app.activeProfileId) ? app.profiles[app.activeProfileId] : null;
}

function ensureDayStructure(profId, dKey) {
  if (!profId) return;
  if (!app.days[profId]) app.days[profId] = {};
  if (!app.days[profId][dKey]) {
    app.days[profId][dKey] = {
      meals: { breakfast: [], lunch: [], dinner: [], snack: [] },
      waterHistory: [],
      weight: null,
      waist: null,
      burned: 0
    };
  }
}

function curDayData() {
  if (!app.activeProfileId) return { meals: { breakfast: [], lunch: [], dinner: [], snack: [] }, waterHistory: [], burned: 0 };
  ensureDayStructure(app.activeProfileId, selectedDateKey);
  return app.days[app.activeProfileId][selectedDateKey];
}

// ================= GEMINI API (ВИКЛЮЧНО 3.8 FLASH, 3.5 FLASH, 3.1 PRO) =================
async function requestGeminiAPI(payload) {
  if (!app.geminiApiKey) {
    throw new Error("Ключ Gemini API відсутній. Введіть його в Admin Center 2.0 -> AI Center");
  }

  const modelsToTry = [
    app.activeModel,
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.1-pro-preview'
  ].filter(m => m && !m.includes('1.5') && !m.includes('2.5') && !m.includes('2.0'));

  const uniqueModels = [...new Set(modelsToTry)];
  let lastErrMsg = '';

  payload.generationConfig = Object.assign({
    temperature: 0.4,
    maxOutputTokens: 700
  }, payload.generationConfig || {});

  for (const model of uniqueModels) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': app.geminiApiKey
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        app.activeModel = model;
        app.geminiTested = true;
        save();
        return await res.json();
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastErrMsg = errJson.error?.message || `HTTP ${res.status}`;
        if (res.status === 400 || res.status === 403) break;
      }
    } catch (e) {
      lastErrMsg = e.message;
    }
  }

  throw new Error(lastErrMsg || "Не вдалося отримати відповідь від Gemini API");
}

async function testGeminiConnection() {
  const statusEl = document.getElementById('admAiTestStatus');
  statusEl.classList.remove('hidden');
  if (!app.geminiApiKey) {
    statusEl.innerText = "❌ Ключ відсутній. Введіть і збережіть ключ!";
    statusEl.className = "text-xs font-bold text-rose-500";
    return;
  }
  statusEl.innerText = "⏳ Тестування з'єднання з Gemini (3.8 / 3.5 Flash)...";
  statusEl.className = "text-xs font-bold text-indigo-600";

  try {
    await requestGeminiAPI({ contents: [{ parts: [{ text: "ping" }] }] });
    statusEl.innerText = `✓ Успішне підключення! Активна модель: ${app.activeModel}`;
    statusEl.className = "text-xs font-bold text-emerald-600";
    logAudit('AI', `Успішний тест з’єднання (${app.activeModel})`);
    showToast(`✓ Gemini API активний (${app.activeModel})!`);
    refreshAdminData();
  } catch (err) {
    app.geminiTested = false;
    save();
    statusEl.innerText = `❌ Помилка Google: ${err.message}`;
    statusEl.className = "text-xs font-bold text-rose-500";
    refreshAdminData();
  }
}

async function callGeminiChat(userQuery) {
  if (!app.geminiApiKey) {
    return "⚠️ Ключ Gemini API не налаштовано. Будь ласка, вкажіть його у розділі 'ADMIN 2.0' -> 'AI Center'.";
  }

  const prof = curProfile() || { name: 'Користувач', target: 2000, protein: 150, fat: 67, carbs: 200 };
  const day = curDayData();
  let eaten = 0;
  ['breakfast', 'lunch', 'dinner', 'snack'].forEach(m => {
    (day.meals[m] || []).forEach(it => eaten += it.kcal);
  });

  const langNames = { uk: 'українською', en: 'англійською', fr: 'французькою' };
  const curLang = app.lang || 'uk';
  const systemPrompt = `Ти персональний нутриціолог додатку Calories PRO. Відповідай ${langNames[curLang] || 'українською'} мовою, конкретно, лаконічно, доброзичливо. Користувач: ${prof.name}, Денна ціль: ${prof.target} ккал (Б: ${prof.protein}г, Ж: ${prof.fat}г, В: ${prof.carbs}г). Сьогодні спожито: ${eaten} ккал. Залишок: ${Math.max(0, prof.target - eaten)} ккал. Питання: "${userQuery}".`;

  try {
    const data = await requestGeminiAPI({
      contents: [{ parts: [{ text: systemPrompt }] }]
    });
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (replyText) {
      logAudit('AI Чат', `Запит: "${userQuery.slice(0, 30)}..."`);
      return replyText;
    }
    return "⚠️ Модель повернула порожню відповідь. Спробуйте переформулювати питання.";
  } catch (err) {
    console.warn("Помилка Gemini API:", err.message);
    return `⚠️ Помилка виклику ШІ (${err.message}). Перевірте ключ в Admin Center 2.0 -> AI Center.`;
  }
}

function normalizeScan(raw) {
  if (Array.isArray(raw)) {
    if (raw.length === 0) return { name: "Не розпізнано їжу", grams: 0, kcal: 0, p: 0, f: 0, c: 0, fiber: 0 };
    return raw.reduce((acc, cur) => ({
      name: acc.name ? `${acc.name}, ${cur.name || 'Страва'}` : (cur.name || 'Страва'),
      grams: acc.grams + (Number(cur.grams) || 0),
      kcal: acc.kcal + (Number(cur.kcal) || 0),
      p: Math.round((acc.p + (Number(cur.p) || 0)) * 10) / 10,
      f: Math.round((acc.f + (Number(cur.f) || 0)) * 10) / 10,
      c: Math.round((acc.c + (Number(cur.c) || 0)) * 10) / 10,
      fiber: Math.round((acc.fiber + (Number(cur.fiber) || 0)) * 10) / 10
    }), { name: "", grams: 0, kcal: 0, p: 0, f: 0, c: 0, fiber: 0 });
  }
  return {
    name: raw.name || "Страва",
    grams: Number(raw.grams) || 0,
    kcal: Number(raw.kcal) || 0,
    p: Math.round((Number(raw.p) || 0) * 10) / 10,
    f: Math.round((Number(raw.f) || 0) * 10) / 10,
    c: Math.round((Number(raw.c) || 0) * 10) / 10,
    fiber: Math.round((Number(raw.fiber) || 0) * 10) / 10
  };
}

async function analyzePhotoWithGemini(base64Uri) {
  if (!app.geminiApiKey) {
    document.getElementById('aiLoadingZone').classList.add('hidden');
    document.getElementById('uploadZone').classList.remove('hidden');
    alert("Введіть ключ Gemini API у розділі 'ADMIN 2.0' -> 'AI Center'");
    return;
  }

  const rawBase64 = base64Uri.split(',')[1];
  const promptText = app.aiPromptConfig || DEFAULT_VISION_PROMPT;

  try {
    const data = await requestGeminiAPI({
      contents: [{
        parts: [
          { text: promptText },
          { inline_data: { mime_type: 'image/jpeg', data: rawBase64 } }
        ]
      }]
    });

    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    const parsed = normalizeScan(JSON.parse(rawText));
    app.aiScanCount = (app.aiScanCount || 0) + 1;
    save();
    logAudit('AI Сканер', `Розпізнано "${parsed.name}" (${parsed.kcal} ккал)`);
    showScanResult(parsed);
  } catch (err) {
    document.getElementById('aiLoadingZone').classList.add('hidden');
    document.getElementById('uploadZone').classList.remove('hidden');
    alert("Помилка розпізнавання Gemini: " + err.message);
  }
}

function showScanResult(parsed) {
  lastScannedResult = parsed;
  document.getElementById('aiDishName').innerText = `${parsed.name} (~${parsed.grams}г)`;
  document.getElementById('aiDishKcal').innerText = `${parsed.kcal} ккал`;
  document.getElementById('aiDishMacros').innerText = `Б: ${parsed.p}г • Ж: ${parsed.f}г • В: ${parsed.c}г`;

  document.getElementById('aiLoadingZone').classList.add('hidden');
  document.getElementById('previewZone').classList.remove('hidden');
  if (parsed.kcal > 0 || parsed.grams > 0) {
    document.getElementById('aiConfirmBtn').classList.remove('hidden');
  } else {
    document.getElementById('aiConfirmBtn').classList.add('hidden');
  }
}

function commitAIScannedFood() {
  if (!lastScannedResult) return;
  curDayData().meals[targetCatalogMeal].push({
    id: 'food_ai_' + Date.now(),
    name: lastScannedResult.name || 'Страва',
    grams: Number(lastScannedResult.grams) || 100,
    kcal: Number(lastScannedResult.kcal) || 0,
    p: Number(lastScannedResult.p) || 0,
    f: Number(lastScannedResult.f) || 0,
    c: Number(lastScannedResult.c) || 0,
    fiber: Number(lastScannedResult.fiber) || 0
  });

  save();
  renderAll();
  closePhotoModal();
  showToast(`✓ Додано: ${lastScannedResult.name}`);
}

function openPhotoFlow(mealType = 'lunch') {
  targetCatalogMeal = mealType;
  document.getElementById('photoModal').classList.remove('hidden');
  document.getElementById('uploadZone').classList.remove('hidden');
  document.getElementById('previewZone').classList.add('hidden');
  document.getElementById('aiConfirmBtn').classList.add('hidden');
  document.getElementById('aiLoadingZone').classList.add('hidden');
}

function closePhotoModal() {
  document.getElementById('photoModal').classList.add('hidden');
}

function processPhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById('uploadZone').classList.add('hidden');
  document.getElementById('previewZone').classList.add('hidden');
  document.getElementById('aiLoadingZone').classList.remove('hidden');

  const img = new Image();
  const reader = new FileReader();

  reader.onerror = function() {
    document.getElementById('aiLoadingZone').classList.add('hidden');
    document.getElementById('uploadZone').classList.remove('hidden');
    alert("Помилка читання файлу зображення.");
  };

  reader.onload = function(evt) {
    img.onerror = function() {
      document.getElementById('aiLoadingZone').classList.add('hidden');
      document.getElementById('uploadZone').classList.remove('hidden');
      alert("Формат фото (наприклад, HEIC) не підтримується браузером напряму. Зробіть скріншот або оберіть JPEG/PNG.");
    };

    img.onload = async function() {
      const canvas = document.getElementById('compressCanvas');
      const maxDim = 640;
      let w = img.width;
      let h = img.height;

      if (w > h && w > maxDim) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else if (h > maxDim) {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
      document.getElementById('photoPreviewImg').src = compressedBase64;

      await analyzePhotoWithGemini(compressedBase64);
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function openAiChatModal() {
  document.getElementById('aiChatModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('aiChatInput').focus(), 150);
}

function closeAiChatModal() {
  document.getElementById('aiChatModal').classList.add('hidden');
}

function sendQuickPrompt(text) {
  document.getElementById('aiChatInput').value = text;
  handleSendAiMessage(new Event('submit'));
}

async function handleSendAiMessage(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('aiChatInput');
  const text = input.value.trim();
  if (!text) return;

  appendChatMessage('user', escapeHTML(text));
  input.value = '';

  const typingId = 'typing_' + Date.now();
  appendChatMessage('ai', '<span class="italic text-slate-500">ШІ Нутриціолог думає...</span>', typingId);

  const reply = await callGeminiChat(text);
  const typingEl = document.getElementById(typingId);
  if (typingEl) {
    const bubble = typingEl.querySelector('div:last-child');
    if (bubble) {
      bubble.innerHTML = escapeHTML(reply).replace(/\n/g, '<br>');
    }
  }
}

function appendChatMessage(sender, html, id = null) {
  const container = document.getElementById('aiChatMessagesContainer');
  const row = document.createElement('div');
  row.className = sender === 'user' ? "flex items-start justify-end gap-2" : "flex items-start gap-2.5";
  if (id) row.id = id;

  if (sender === 'user') {
    row.innerHTML = `
      <div class="bg-indigo-600 text-white rounded-2xl rounded-tr-sm p-3 text-xs leading-relaxed max-w-[85%] font-medium">
        ${html}
      </div>
    `;
  } else {
    row.innerHTML = `
      <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-xs flex-shrink-0 shadow-sm">✨</div>
      <div class="bg-slate-100 rounded-2xl rounded-tl-sm p-3 text-xs text-slate-800 leading-relaxed max-w-[85%] font-medium">
        ${html}
      </div>
    `;
  }
  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

// ================= ВОДА: ДОДАВАННЯ ТА СКАСУВАННЯ (UNDO) =================
function addWater(ml) {
  curDayData().waterHistory.push({ id: 'w_' + Date.now(), amount: ml });
  save();
  renderAll();
  showToast(t('toast_water_add') + ` +${ml} мл`);
}

function undoWater() {
  const day = curDayData();
  if (!day.waterHistory || day.waterHistory.length === 0) {
    showToast(t('toast_water_empty'), 'warning');
    return;
  }
  const removed = day.waterHistory.pop();
  save();
  renderAll();
  showToast(t('toast_water_undo') + ` -${removed.amount} мл`);
}

// ================= МОВИ ТА ПЕРЕКЛАД =================
function applyTranslations() {
  const lang = app.lang || 'uk';
  const dict = I18N[lang] || I18N.uk;

  const langBtn = document.getElementById('langSwitchBtn');
  if (langBtn) langBtn.innerText = dict.btn_lang;

  const navHome = document.querySelector('#nav-btn-home span:last-child');
  if (navHome) navHome.innerText = dict.nav_home;
  const navDiary = document.querySelector('#nav-btn-diary span:last-child');
  if (navDiary) navDiary.innerText = dict.nav_diary;
  const navWeight = document.querySelector('#nav-btn-weight span:last-child');
  if (navWeight) navWeight.innerText = dict.nav_weight;
  const navPlan = document.querySelector('#nav-btn-plan span:last-child');
  if (navPlan) navPlan.innerText = dict.nav_plan;
  const navMore = document.querySelector('#nav-btn-more span:last-child');
  if (navMore) navMore.innerText = dict.nav_more;
}

function toggleLanguage() {
  const order = ['uk', 'en', 'fr'];
  const curIdx = order.indexOf(app.lang || 'uk');
  app.lang = order[(curIdx + 1) % order.length];
  save();
  applyTranslations();
  renderAll();
  showToast(`Мова: ${I18N[app.lang].btn_lang}`);
}

// ================= ГОЛОВНИЙ РЕНДЕР КЛІЄНТА =================
function renderAll() {
  const prof = curProfile();
  if (!prof) {
    renderProfilesTab();
    return;
  }

  const day = curDayData();

  document.getElementById('headerAvatar').innerText = prof.emoji || '🙂';
  document.getElementById('headerUserName').innerText = prof.name;

  const realStreak = calculateRealStreak(app.activeProfileId);
  document.getElementById('realStreakDisplay').innerText = realStreak;

  let eatenKcal = 0;
  let totalC = 0, totalP = 0, totalF = 0;

  ['breakfast', 'lunch', 'dinner', 'snack'].forEach(m => {
    let mealKcal = 0;
    (day.meals[m] || []).forEach(item => {
      mealKcal += Number(item.kcal) || 0;
      totalC += Number(item.c) || 0;
      totalP += Number(item.p) || 0;
      totalF += Number(item.f) || 0;
    });
    eatenKcal += mealKcal;
    renderMealSection(m, mealKcal, day.meals[m] || []);
  });

  const diff = prof.target - eatenKcal;
  const ring = document.getElementById('ringCircle');
  const remVal = document.getElementById('dispRemaining');
  const remLbl = document.getElementById('dispRemainingLabel');

  document.getElementById('dispEaten').innerText = Math.round(eatenKcal);
  document.getElementById('dispDailyTarget').innerText = `${t('target')}${prof.target}`;
  document.getElementById('dispBurned').innerText = day.burned || 0;

  if (diff >= 0) {
    remVal.innerText = Math.round(diff);
    remVal.className = "text-3xl font-black text-slate-900 tracking-tight";
    remLbl.innerText = t('remaining');
    remLbl.className = "text-[11px] font-bold text-slate-500 mt-0.5";
    ring.setAttribute('stroke', '#FF4D4D');
    const pct = Math.min(1, eatenKcal / (prof.target || 2000));
    ring.style.strokeDashoffset = 264 - (264 * pct);
  } else {
    const over = Math.round(Math.abs(diff));
    remVal.innerText = `+${over}`;
    remVal.className = "text-3xl font-black text-rose-600 tracking-tight";
    remLbl.innerText = `${t('over')} ${over} ккал`;
    remLbl.className = "text-[11px] font-black text-rose-500 mt-0.5";
    ring.setAttribute('stroke', '#E11D48');
    ring.style.strokeDashoffset = 0;
  }

  document.getElementById('dispCarbs').innerText = `${Math.round(totalC)} / ${prof.carbs} г`;
  document.getElementById('dispProtein').innerText = `${Math.round(totalP)} / ${prof.protein} г`;
  document.getElementById('dispFat').innerText = `${Math.round(totalF)} / ${prof.fat} г`;

  const cPct = Math.min(100, Math.round((totalC / (prof.carbs || 1)) * 100)) || 0;
  const pPct = Math.min(100, Math.round((totalP / (prof.protein || 1)) * 100)) || 0;
  const fPct = Math.min(100, Math.round((totalF / (prof.fat || 1)) * 100)) || 0;

  document.getElementById('carbPct').innerText = `${cPct}%`;
  document.getElementById('proteinPct').innerText = `${pPct}%`;
  document.getElementById('fatPct').innerText = `${fPct}%`;

  document.getElementById('carbBar').style.width = `${cPct}%`;
  document.getElementById('proteinBar').style.width = `${pPct}%`;
  document.getElementById('fatBar').style.width = `${fPct}%`;

  const waterTotal = (day.waterHistory || []).reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
  document.getElementById('dispWaterAmount').innerText = `${waterTotal} / ${prof.waterTarget || 2000} мл`;
  const wPct = Math.min(100, Math.round((waterTotal / (prof.waterTarget || 2000)) * 100));
  document.getElementById('waterProgressBar').style.width = `${wPct}%`;

  renderWeightSection();
  renderWeeklyPlan();
  renderShoppingChecklist();
  renderProfilesTab();
}

function calculateRealStreak(profId) {
  const pDays = app.days[profId] || {};
  let streak = 0;
  let checkDate = new Date();

  const todayStr = getLocalDateString(checkDate);
  if (getDayCalories(pDays[todayStr]) > 0) streak++;

  while (true) {
    checkDate.setDate(checkDate.getDate() - 1);
    const dStr = getLocalDateString(checkDate);
    if (getDayCalories(pDays[dStr]) > 0) streak++;
    else break;
  }
  return streak;
}

function getDayCalories(dayObj) {
  if (!dayObj || !dayObj.meals) return 0;
  let sum = 0;
  ['breakfast', 'lunch', 'dinner', 'snack'].forEach(m => {
    (dayObj.meals[m] || []).forEach(it => sum += (Number(it.kcal) || 0));
  });
  return Math.round(sum);
}

function renderMealSection(mealType, mealKcal, items) {
  const prof = curProfile() || { target: 2000, mealSplit: DEFAULT_MEAL_SPLIT };
  const ms = prof.mealSplit || DEFAULT_MEAL_SPLIT;
  const targetKcal = Math.round(prof.target * (ms[mealType] || 0.25));

  const diaryStatsEl = document.getElementById(`diary${mealType.charAt(0).toUpperCase() + mealType.slice(1)}Stats`);
  if (diaryStatsEl) diaryStatsEl.innerText = `~${targetKcal} ккал • ${Math.round(mealKcal)} ккал`;

  const listContainer = document.getElementById(`diary${mealType.charAt(0).toUpperCase() + mealType.slice(1)}List`);
  if (!listContainer) return;

  listContainer.innerHTML = '';
  if (items.length === 0) {
    listContainer.innerHTML = `<p class="text-xs text-slate-500 py-1 italic">Поки немає продуктів</p>`;
    return;
  }

  items.forEach((it, idx) => {
    const itemRow = document.createElement('div');
    itemRow.className = "flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0";
    itemRow.innerHTML = `
      <div class="flex-1 pr-2">
        <span class="text-xs font-bold text-slate-800 block">${escapeHTML(it.name)}</span>
        <span class="text-[11px] text-slate-500 font-semibold">${escapeHTML(it.grams)}г • <b class="text-slate-700">${escapeHTML(it.kcal)} ккал</b> (Б:${escapeHTML(it.p)} Ж:${escapeHTML(it.f)} В:${escapeHTML(it.c)})</span>
      </div>
      <div class="flex items-center gap-1.5">
        <button onclick="editMealItemGramsPrompt('${mealType}', ${idx})" aria-label="Редагувати вагу" class="touch-target text-slate-500 hover:text-slate-800 text-xs px-1.5">✏️</button>
        <button onclick="deleteMealItem('${mealType}', ${idx})" aria-label="Видалити" class="touch-target text-slate-500 hover:text-rose-600 text-xs px-1.5">🗑️</button>
      </div>
    `;
    listContainer.appendChild(itemRow);
  });
}

function copyMealFromYesterday(mealType) {
  const parts = selectedDateKey.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() - 1);
  const yKey = getLocalDateString(d);

  const yDay = app.days[app.activeProfileId]?.[yKey];
  if (!yDay || !yDay.meals[mealType] || yDay.meals[mealType].length === 0) {
    showToast("Вчора не було записів для цього прийому", "error");
    return;
  }

  const cloned = JSON.parse(JSON.stringify(yDay.meals[mealType]));
  cloned.forEach(x => x.id = 'food_' + Date.now() + Math.random());
  curDayData().meals[mealType].push(...cloned);
  save();
  renderAll();
  showToast(`✓ Скопійовано ${cloned.length} продуктів із вчора!`);
}

function editMealItemGramsPrompt(mealType, idx) {
  const item = curDayData().meals[mealType][idx];
  if (!item) return;
  const gStr = prompt(`Введіть нову вагу для "${item.name}" (грами):`, item.grams);
  if (!gStr) return;
  const newG = parseFloat(gStr);
  if (newG > 0 && item.grams > 0) {
    const factor = newG / item.grams;
    item.grams = Math.round(newG);
    item.kcal = Math.round(item.kcal * factor);
    item.p = Math.round(item.p * factor * 10) / 10;
    item.f = Math.round(item.f * factor * 10) / 10;
    item.c = Math.round(item.c * factor * 10) / 10;
    if (item.fiber) item.fiber = Math.round(item.fiber * factor * 10) / 10;
    save();
    renderAll();
    showToast("Вагу оновлено");
  }
}

function deleteMealItem(mealType, idx) {
  curDayData().meals[mealType].splice(idx, 1);
  save();
  renderAll();
}

function confirmClearCurrentDay() {
  if (confirm("Очистити всі страви за цей день?")) {
    curDayData().meals = { breakfast: [], lunch: [], dinner: [], snack: [] };
    save();
    renderAll();
    showToast("День очищено");
  }
}

// ================= ВАГА, ТАЛІЯ, ІМТ ТА ДЕЛЬТИ =================
function setWeightDeltas(entries) {
  const fmt = v => (v === null || isNaN(v)) ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)} кг`;
  const delta = days => {
    if (!entries || entries.length < 2) return null;
    const [y, m, d] = entries[0].date.split('-').map(Number);
    const cut = getLocalDateString(new Date(y, m - 1, d - days));
    const ref = entries.find(e => e.date <= cut);
    return ref ? (entries[0].weight - ref.weight) : null;
  };
  const d7 = document.getElementById('deltaWeekVal');
  const d30 = document.getElementById('deltaMonthVal');
  if (d7) d7.innerText = fmt(delta(7));
  if (d30) d30.innerText = fmt(delta(30));
}

function renderWeightSection() {
  const prof = curProfile();
  if (!prof) return;

  document.getElementById('weightStartVal').innerText = `${prof.startWeight || 65} кг`;
  document.getElementById('weightGoalVal').innerText = `${prof.targetWeight || 58} кг`;

  const pDays = app.days[app.activeProfileId] || {};
  const dates = Object.keys(pDays).sort().reverse();
  let entries = [];

  dates.forEach(dk => {
    if (pDays[dk].weight) {
      entries.push({ date: dk, weight: Number(pDays[dk].weight), waist: pDays[dk].waist });
    }
  });

  const latestWeight = entries.length > 0 ? entries[0].weight : (prof.startWeight || 65);
  document.getElementById('weightCurrentVal').innerText = `${latestWeight} кг`;

  const heightM = (prof.height || 168) / 100;
  const bmi = (latestWeight / (heightM * heightM)).toFixed(1);
  document.getElementById('bmiNumber').innerText = bmi;

  const bmiBar = document.getElementById('bmiBar');
  const bmiText = document.getElementById('bmiStatusText');
  if (bmi < 18.5) {
    bmiText.innerText = "Дефіцит ваги"; bmiText.className = "text-[11px] font-bold text-amber-500";
    bmiBar.className = "bg-amber-400 h-full rounded-full"; bmiBar.style.width = "25%";
  } else if (bmi <= 24.9) {
    bmiText.innerText = "Нормальна вага"; bmiText.className = "text-[11px] font-bold text-emerald-600";
    bmiBar.className = "bg-emerald-500 h-full rounded-full"; bmiBar.style.width = "50%";
  } else if (bmi <= 29.9) {
    bmiText.innerText = "Надлишкова вага"; bmiText.className = "text-[11px] font-bold text-amber-600";
    bmiBar.className = "bg-amber-500 h-full rounded-full"; bmiBar.style.width = "75%";
  } else {
    bmiText.innerText = "Ожиріння"; bmiText.className = "text-[11px] font-bold text-rose-600";
    bmiBar.className = "bg-rose-500 h-full rounded-full"; bmiBar.style.width = "100%";
  }

  const list = document.getElementById('weightHistoryList');
  list.innerHTML = '';
  if (entries.length === 0) {
    list.innerHTML = '<p class="text-xs text-slate-500 italic text-center py-4">Немає записів ваги</p>';
  } else {
    entries.slice(0, 10).forEach(e => {
      const row = document.createElement('div');
      row.className = "flex justify-between items-center py-1.5 border-b border-slate-50 text-xs";
      row.innerHTML = `
        <span class="font-bold text-slate-600">${escapeHTML(e.date)}</span>
        <span class="font-black text-slate-900">${escapeHTML(e.weight)} кг ${e.waist ? `• талія ${escapeHTML(e.waist)} см` : ''}</span>
      `;
      list.appendChild(row);
    });
  }

  setWeightDeltas(entries);
}

function openLogWeightModal() {
  document.getElementById('inputWeightKg').value = curDayData().weight || '';
  document.getElementById('inputWaistCm').value = curDayData().waist || '';
  document.getElementById('logWeightModal').classList.remove('hidden');
}

function closeLogWeightModal() {
  document.getElementById('logWeightModal').classList.add('hidden');
}

function saveWeightEntry() {
  const w = parseFloat(document.getElementById('inputWeightKg').value);
  const waist = parseFloat(document.getElementById('inputWaistCm').value) || null;
  if (w > 20 && w < 300) {
    curDayData().weight = w;
    curDayData().waist = waist;
    save();
    renderAll();
    closeLogWeightModal();
    showToast("✓ Вагу збережено!");
  } else {
    alert("Введіть коректну вагу (20–300 кг)");
  }
}

// ================= ПЛАН МЕНЮ ТА СПИСОК ПОКУПОК =================
function switchPlanSubTab(tab) {
  if (tab === 'plan') {
    document.getElementById('subTabPlanContent').classList.remove('hidden');
    document.getElementById('subTabShopContent').classList.add('hidden');
    document.getElementById('btnSubPlan').className = "px-3 py-1.5 rounded-xl text-xs font-black bg-white shadow-sm text-slate-900";
    document.getElementById('btnSubShop').className = "px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500";
  } else {
    document.getElementById('subTabPlanContent').classList.add('hidden');
    document.getElementById('subTabShopContent').classList.remove('hidden');
    document.getElementById('btnSubShop').className = "px-3 py-1.5 rounded-xl text-xs font-black bg-white shadow-sm text-slate-900";
    document.getElementById('btnSubPlan').className = "px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500";
  }
}

function renderWeeklyPlan() {
  const container = document.getElementById('weeklyPlanContainer');
  if (!container) return;
  container.innerHTML = '';
  const daysNames = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const curr = new Date();
  const todayStr = getLocalDateString(curr);

  for (let i = 0; i < 7; i++) {
    const d = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() + i);
    const dKey = getLocalDateString(d);
    ensureDayStructure(app.activeProfileId, dKey);
    const dData = app.days[app.activeProfileId]?.[dKey];
    const cals = getDayCalories(dData);

    const card = document.createElement('div');
    card.className = "bg-white p-3.5 rounded-2xl border border-slate-100 card-shadow flex items-center justify-between";
    card.innerHTML = `
      <div>
        <div class="flex items-center gap-1.5">
          <span class="text-xs font-black text-slate-900">${daysNames[d.getDay()]} (${dKey})</span>
          ${dKey === todayStr ? '<span class="text-[9px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-black">Сьогодні</span>' : ''}
        </div>
        <span class="text-[11px] font-bold text-slate-500">Меню дня: <b class="text-slate-700">${cals} ккал</b></span>
      </div>
      <button onclick="selectedDateKey='${dKey}'; renderCalendarRow(); renderAll(); goToTab('diary');" class="touch-target text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl">
        Скласти →
      </button>
    `;
    container.appendChild(card);
  }
}

function renderShoppingChecklist() {
  const list = document.getElementById('shoppingChecklist');
  if (!list) return;
  list.innerHTML = '';
  const items = app.shoppingList || [];

  if (items.length === 0) {
    list.innerHTML = '<p class="text-xs text-slate-500 italic text-center py-4">Список покупок порожній</p>';
    return;
  }

  items.forEach((it, idx) => {
    const row = document.createElement('div');
    row.className = `flex items-center justify-between p-2.5 rounded-xl border transition ${it.checked ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-100 shadow-sm'}`;
    row.innerHTML = `
      <label class="flex items-center gap-2.5 flex-1 cursor-pointer">
        <input type="checkbox" ${it.checked ? 'checked' : ''} onchange="toggleShopItem(${idx})" class="w-4 h-4 rounded text-rose-500">
        <span class="text-xs font-bold ${it.checked ? 'line-through text-slate-400' : 'text-slate-800'}">${escapeHTML(it.text)}</span>
      </label>
      <button onclick="deleteShopItem(${idx})" aria-label="Видалити зі списку" class="text-slate-400 hover:text-rose-500 text-sm px-1">✕</button>
    `;
    list.appendChild(row);
  });
}

function addManualShopItem() {
  const input = document.getElementById('manualShopItemInput');
  const val = input.value.trim();
  if (!val) return;
  if (!app.shoppingList) app.shoppingList = [];
  app.shoppingList.push({ id: 's_' + Date.now(), text: val, checked: false });
  input.value = '';
  save();
  renderShoppingChecklist();
}

function toggleShopItem(idx) {
  app.shoppingList[idx].checked = !app.shoppingList[idx].checked;
  save();
  renderShoppingChecklist();
}

function deleteShopItem(idx) {
  app.shoppingList.splice(idx, 1);
  save();
  renderShoppingChecklist();
}

function clearCheckedShopItems() {
  app.shoppingList = (app.shoppingList || []).filter(x => !x.checked);
  save();
  renderShoppingChecklist();
}

function generateShoppingListFromPlan() {
  const pDays = app.days[app.activeProfileId] || {};
  const generated = {};
  const curr = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() + i);
    const dKey = getLocalDateString(d);
    const day = pDays[dKey];
    if (day && day.meals) {
      ['breakfast', 'lunch', 'dinner', 'snack'].forEach(m => {
        (day.meals[m] || []).forEach(it => {
          generated[it.name] = (generated[it.name] || 0) + (Number(it.grams) || 0);
        });
      });
    }
  }

  if (Object.keys(generated).length === 0) {
    alert("У плані на 7 днів ще немає страв.");
    return;
  }

  if (!app.shoppingList) app.shoppingList = [];
  const existingTexts = new Set(app.shoppingList.map(x => x.text));
  let added = 0;

  Object.keys(generated).forEach(name => {
    const itemText = `${name} (~${generated[name]} г)`;
    if (!existingTexts.has(itemText)) {
      app.shoppingList.push({
        id: 's_' + Date.now() + Math.random(),
        text: itemText,
        checked: false
      });
      added++;
    }
  });
  save();
  renderShoppingChecklist();
  showToast(`✓ Додано ${added} нових позицій у список!`);
}

// ================= КАТАЛОГ ТА ПОРЦІЇ =================
function openCatalogModal(mealType) {
  targetCatalogMeal = mealType;
  const names = { breakfast: 'Сніданок', lunch: 'Обід', dinner: 'Вечеря', snack: 'Перекус' };
  document.getElementById('catalogTargetMealText').innerText = `Додати в: ${names[mealType] || mealType}`;
  document.getElementById('catalogSearchInput').value = '';
  activeCatalogCat = 'Усі';
  renderCatalogCategories();
  renderCatalogItems();
  document.getElementById('catalogModal').classList.remove('hidden');
}

function closeCatalogModal() {
  document.getElementById('catalogModal').classList.add('hidden');
}

function renderCatalogCategories() {
  const container = document.getElementById('catalogCategoryChips');
  container.innerHTML = '';
  const cats = ['Усі', ...app.categories];
  cats.forEach(c => {
    const btn = document.createElement('button');
    const isActive = activeCatalogCat === c;
    btn.className = `touch-target text-xs font-bold px-3 py-1 rounded-xl whitespace-nowrap transition ${isActive ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`;
    btn.innerText = c;
    btn.onclick = () => { activeCatalogCat = c; renderCatalogCategories(); renderCatalogItems(); };
    container.appendChild(btn);
  });
}

function renderCatalogItems() {
  const container = document.getElementById('catalogListContainer');
  container.innerHTML = '';
  const q = (document.getElementById('catalogSearchInput').value || '').trim().toLowerCase();

  let items = app.foods;
  if (activeCatalogCat !== 'Усі') items = items.filter(x => x.cat === activeCatalogCat);
  if (q) items = items.filter(x => x.name.toLowerCase().includes(q));

  if (items.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-500 italic text-center py-6">Нічого не знайдено</p>';
    return;
  }

  items.forEach(it => {
    const card = document.createElement('div');
    card.className = "p-3 rounded-2xl bg-white border border-slate-100 card-shadow flex items-center justify-between cursor-pointer active:scale-95 transition";
    card.onclick = () => openPortionModal(it);
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-2xl">${it.emoji || '🍽️'}</span>
        <div>
          <h4 class="text-xs font-black text-slate-800">${escapeHTML(it.name)}</h4>
          <span class="text-[10px] text-slate-500 font-bold">${it.kcal} ккал/100г • Б:${it.p} Ж:${it.f} В:${it.c}</span>
        </div>
      </div>
      <button class="text-xs font-black bg-rose-50 text-rose-600 px-3 py-1 rounded-xl border border-rose-100">+</button>
    `;
    container.appendChild(card);
  });
}

function openPortionModal(item) {
  activeModalItem = item;
  document.getElementById('portItemEmoji').innerText = item.emoji || '🍽️';
  document.getElementById('portItemName').innerText = item.name;
  document.getElementById('portItemSource').innerText = item.src || 'База продуктів';
  document.getElementById('baseKcal100').innerText = item.kcal;
  document.getElementById('baseC100').innerText = `${item.c}г`;
  document.getElementById('baseP100').innerText = `${item.p}г`;
  document.getElementById('baseF100').innerText = `${item.f}г`;
  setPortionGrams(item.serv || 100);
  document.getElementById('portionModal').classList.remove('hidden');
}

function closePortionModal() {
  document.getElementById('portionModal').classList.add('hidden');
}

function setPortionGrams(g) {
  document.getElementById('customPortionGrams').value = g;
  updatePortionCalculations();
}

function updatePortionCalculations() {
  if (!activeModalItem) return;
  const g = parseFloat(document.getElementById('customPortionGrams').value) || 0;
  const f = g / 100;
  document.getElementById('calcPortionKcal').innerText = `${Math.round(activeModalItem.kcal * f)} ккал`;
  document.getElementById('calcPortionMacros').innerText = `Б: ${(activeModalItem.p * f).toFixed(1)}г • Ж: ${(activeModalItem.f * f).toFixed(1)}г • В: ${(activeModalItem.c * f).toFixed(1)}г`;
}

function commitSelectedFoodToMeal() {
  if (!activeModalItem) return;
  const g = parseFloat(document.getElementById('customPortionGrams').value) || 100;
  const f = g / 100;

  curDayData().meals[targetCatalogMeal].push({
    id: 'food_' + Date.now(),
    name: activeModalItem.name,
    grams: Math.round(g),
    kcal: Math.round(activeModalItem.kcal * f),
    p: Math.round(activeModalItem.p * f * 10) / 10,
    f: Math.round(activeModalItem.f * f * 10) / 10,
    c: Math.round(activeModalItem.c * f * 10) / 10,
    fiber: activeModalItem.fiber ? Math.round(activeModalItem.fiber * f * 10) / 10 : 0
  });

  save();
  closePortionModal();
  closeCatalogModal();
  renderAll();
  showToast(`✓ Додано: ${activeModalItem.name}`);
}

// ================= ADMIN CENTER 2.0 (ХЕШУВАННЯ ПАРОЛЯ) =================
function openAdminPasswordModal() {
  document.getElementById('adminPasswordInputVal').value = '';
  const err = document.getElementById('adminLoginError');
  if (err) err.classList.add('hidden');
  document.getElementById('adminPasswordModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('adminPasswordInputVal').focus(), 100);
}

function closeAdminPasswordModal() {
  document.getElementById('adminPasswordModal').classList.add('hidden');
}

async function verifyAdminPassword() {
  const entered = document.getElementById('adminPasswordInputVal').value;
  const err = document.getElementById('adminLoginError');

  const enteredHash = await sha256(entered);
  const targetHash = app.adminPassHash || DEFAULT_ADMIN_HASH;

  if (enteredHash === targetHash) {
    app.isAdminUnlocked = true;
    closeAdminPasswordModal();
    logAudit('Вхід', 'Успішний вхід в Admin Control Center 2.0');
    showToast("✓ Вхід в Admin Center виконано!");
    enterAdminDashboard();
  } else {
    if (err) {
      err.innerText = "❌ Невірний пароль адміністратора!";
      err.classList.remove('hidden');
    }
  }
}

function enterAdminDashboard() {
  document.getElementById('client-app-root').classList.add('hidden');
  document.getElementById('admin-root').classList.remove('hidden');
  switchAdminSection('overview');
  refreshAdminData();
}

function exitAdminToClientApp() {
  app.isAdminUnlocked = false;
  document.getElementById('admin-root').classList.add('hidden');
  document.getElementById('client-app-root').classList.remove('hidden');
  renderAll();
}

function switchAdminSection(secId) {
  const sections = ['overview', 'users', 'products', 'categories', 'recipes', 'ai', 'content', 'security', 'backup'];
  sections.forEach(s => {
    const el = document.getElementById(`admin-sec-${s}`);
    const btn = document.getElementById(`asb-${s}`);
    if (s === secId) {
      if (el) el.classList.remove('hidden');
      if (btn) btn.className = "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-indigo-600 text-white transition text-left whitespace-nowrap shadow-sm";
    } else {
      if (el) el.classList.add('hidden');
      if (btn) btn.className = "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition text-left whitespace-nowrap";
    }
  });

  const titleMap = {
    overview: 'Огляд системи (Dashboard)',
    users: 'Керування користувачами та профілями',
    products: 'Менеджер бази продуктів',
    categories: 'Керування категоріями їжі',
    recipes: 'Керування стравами та супами',
    ai: 'AI Center (Gemini 3.8 / 3.5 Flash)',
    content: 'Керування контентом & Поради дня',
    security: 'Безпека та журнал операцій',
    backup: 'Резервне копіювання & База даних'
  };
  document.getElementById('adminTopHeaderTitle').innerText = titleMap[secId] || 'Admin Center';
}

function refreshAdminData() {
  const uCount = Object.keys(app.profiles || {}).length;
  document.getElementById('admStatUsersCount').innerText = uCount;
  document.getElementById('admStatProductsCount').innerText = app.foods.length;

  let daysLoggedTotal = 0;
  Object.keys(app.days || {}).forEach(u => {
    daysLoggedTotal += Object.keys(app.days[u] || {}).length;
  });
  document.getElementById('admStatLogsCount').innerText = daysLoggedTotal;
  document.getElementById('admStatAiScansCount').innerText = app.aiScanCount || 0;

  const aiStatusEl = document.getElementById('admStatAiStatusText');
  if (app.geminiApiKey) {
    if (app.geminiTested) {
      aiStatusEl.innerText = `Gemini (${app.activeModel}) ✓`;
      aiStatusEl.className = "text-[10px] font-semibold text-emerald-600";
    } else {
      aiStatusEl.innerText = "Ключ збережено (не перевірено)";
      aiStatusEl.className = "text-[10px] font-semibold text-indigo-600";
    }
  } else {
    aiStatusEl.innerText = "Ключ відсутній";
    aiStatusEl.className = "text-[10px] font-semibold text-amber-600";
  }

  renderAdminRealChart();
  renderAdminRecentActivity();
  renderAdmUsersTable();
  renderAdmProductsTable();
  renderAdmCategories();
  renderAdmRecipes();
  renderAdmTips();
  renderAdmAuditLog();

  document.getElementById('admGeminiKeyInput').value = app.geminiApiKey || '';
  document.getElementById('admAiSystemPrompt').value = app.aiPromptConfig || '';
}

function renderAdminRealChart() {
  const container = document.getElementById('admRealChartBars');
  if (!container) return;
  container.innerHTML = '';
  const prof = curProfile();
  const pDays = app.days[app.activeProfileId] || {};
  const curr = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() - i);
    const dKey = getLocalDateString(d);
    const dData = pDays[dKey];
    const eaten = getDayCalories(dData);
    const target = prof?.target || 2000;
    const pct = Math.min(100, Math.round((eaten / target) * 100));

    const barCol = document.createElement('div');
    barCol.className = "flex-1 flex flex-col items-center h-full justify-end";
    barCol.innerHTML = `
      <span class="text-[9px] font-black text-slate-700 mb-1">${eaten > 0 ? eaten : ''}</span>
      <div class="w-full max-w-[28px] bg-slate-100 rounded-t-lg h-32 flex items-end overflow-hidden">
        <div class="${eaten > target ? 'bg-rose-500' : 'bg-indigo-600'} w-full rounded-t-lg transition-all duration-500" style="height: ${Math.max(5, pct)}%"></div>
      </div>
      <span class="text-[10px] text-slate-500 font-bold mt-1.5">${d.toLocaleDateString('uk-UA', { weekday: 'short' })}</span>
    `;
    container.appendChild(barCol);
  }
}

function renderAdminRecentActivity() {
  const list = document.getElementById('admRecentActivityList');
  if (!list) return;
  list.innerHTML = '';
  const logs = app.activityLog || [];
  if (logs.length === 0) {
    list.innerHTML = '<p class="text-xs text-slate-500 italic">Подій ще не зафіксовано</p>';
    return;
  }
  logs.slice(0, 5).forEach(l => {
    const item = document.createElement('div');
    item.className = "flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0";
    item.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
        <span class="font-black text-slate-800">${escapeHTML(l.action)}:</span>
        <span class="text-slate-600">${escapeHTML(l.details)}</span>
      </div>
      <span class="text-[10px] text-slate-500 font-mono">${escapeHTML(l.time)}</span>
    `;
    list.appendChild(item);
  });
}

// ================= РЕДАКТОР ПРОФІЛІВ =================
function setPeEmoji(char) {
  document.getElementById('peEmoji').value = char;
}

function openProfileEditor(id) {
  editingProfileId = id;
  const err = document.getElementById('peError');
  if (err) err.classList.add('hidden');

  const cur = curProfile() || { target: 2000, protein: 150, fat: 67, carbs: 200, waterTarget: 2000, height: 170, startWeight: 65, targetWeight: 58 };

  if (id === null) {
    document.getElementById('peModalTitle').innerText = "Новий профіль";
    document.getElementById('peName').value = '';
    document.getElementById('peEmoji').value = '🙂';
    document.getElementById('peHeight').value = cur.height || 170;
    document.getElementById('peStartWeight').value = cur.startWeight || 65;
    document.getElementById('peTargetWeight').value = cur.targetWeight || 58;
    document.getElementById('peTarget').value = cur.target || 2000;
    document.getElementById('peProtein').value = cur.protein || 150;
    document.getElementById('peFat').value = cur.fat || 67;
    document.getElementById('peCarbs').value = cur.carbs || 200;
    document.getElementById('peWater').value = cur.waterTarget || 2000;
    document.getElementById('pePin').value = '';

    const ms = cur.mealSplit || DEFAULT_MEAL_SPLIT;
    document.getElementById('peSplitB').value = Math.round(ms.breakfast * 100);
    document.getElementById('peSplitL').value = Math.round(ms.lunch * 100);
    document.getElementById('peSplitD').value = Math.round(ms.dinner * 100);
    document.getElementById('peSplitS').value = Math.round(ms.snack * 100);
  } else {
    const p = app.profiles[id];
    document.getElementById('peModalTitle').innerText = `Редагування: ${p.name}`;
    document.getElementById('peName').value = p.name;
    document.getElementById('peEmoji').value = p.emoji || '🙂';
    document.getElementById('peHeight').value = p.height || 170;
    document.getElementById('peStartWeight').value = p.startWeight || 65;
    document.getElementById('peTargetWeight').value = p.targetWeight || 58;
    document.getElementById('peTarget').value = p.target;
    document.getElementById('peProtein').value = p.protein;
    document.getElementById('peFat').value = p.fat;
    document.getElementById('peCarbs').value = p.carbs;
    document.getElementById('peWater').value = p.waterTarget || 2000;
    document.getElementById('pePin').value = p.pin || '';

    const ms = p.mealSplit || DEFAULT_MEAL_SPLIT;
    document.getElementById('peSplitB').value = Math.round(ms.breakfast * 100);
    document.getElementById('peSplitL').value = Math.round(ms.lunch * 100);
    document.getElementById('peSplitD').value = Math.round(ms.dinner * 100);
    document.getElementById('peSplitS').value = Math.round(ms.snack * 100);
  }

  updatePeMacroCheck();
  document.getElementById('profileEditorModal').classList.remove('hidden');
}

function closeProfileEditorModal() {
  document.getElementById('profileEditorModal').classList.add('hidden');
}

function updatePeMacroCheck() {
  const target = parseInt(document.getElementById('peTarget').value) || 0;
  const p = parseInt(document.getElementById('peProtein').value) || 0;
  const f = parseInt(document.getElementById('peFat').value) || 0;
  const c = parseInt(document.getElementById('peCarbs').value) || 0;

  const macroKcal = (p * 4) + (f * 9) + (c * 4);
  const checkEl = document.getElementById('peMacroCheck');

  if (target > 0) {
    const diff = Math.abs(macroKcal - target);
    if ((diff / target) > 0.15) {
      checkEl.className = "text-[10px] mt-1.5 font-bold leading-tight text-rose-500";
      checkEl.innerText = `⚠️ Макроси дають ${macroKcal} ккал, ціль ${target} ккал (розбіжність >15%)`;
    } else {
      checkEl.className = "text-[10px] mt-1.5 font-bold leading-tight text-emerald-600";
      checkEl.innerText = `✓ Макроси збалансовані: сумарно ${macroKcal} ккал`;
    }
  } else {
    checkEl.innerText = '';
  }

  const sb = parseInt(document.getElementById('peSplitB').value) || 0;
  const sl = parseInt(document.getElementById('peSplitL').value) || 0;
  const sd = parseInt(document.getElementById('peSplitD').value) || 0;
  const ss = parseInt(document.getElementById('peSplitS').value) || 0;
  const sum = sb + sl + sd + ss;

  const sumEl = document.getElementById('peSplitSum');
  sumEl.innerText = `Разом: ${sum}%`;
  sumEl.className = (sum < 98 || sum > 102) ? "text-[10px] font-black text-rose-500" : "text-[10px] font-black text-emerald-600";
}

function commitProfileEditor() {
  const errEl = document.getElementById('peError');
  errEl.classList.add('hidden');

  const name = document.getElementById('peName').value.trim();
  const emoji = document.getElementById('peEmoji').value.trim() || '🙂';
  const height = parseInt(document.getElementById('peHeight').value) || 170;
  const startWeight = parseFloat(document.getElementById('peStartWeight').value) || 65;
  const targetWeight = parseFloat(document.getElementById('peTargetWeight').value) || 58;
  const target = parseInt(document.getElementById('peTarget').value);
  const protein = parseInt(document.getElementById('peProtein').value);
  const fat = parseInt(document.getElementById('peFat').value);
  const carbs = parseInt(document.getElementById('peCarbs').value);
  const waterTarget = parseInt(document.getElementById('peWater').value);
  const pin = document.getElementById('pePin').value.trim();

  const sb = parseInt(document.getElementById('peSplitB').value) || 0;
  const sl = parseInt(document.getElementById('peSplitL').value) || 0;
  const sd = parseInt(document.getElementById('peSplitD').value) || 0;
  const ss = parseInt(document.getElementById('peSplitS').value) || 0;
  const splitSum = sb + sl + sd + ss;

  if (!name || name.length > 24) {
    errEl.innerText = "Ім'я має містити від 1 до 24 символів";
    errEl.classList.remove('hidden');
    return;
  }
  if (isNaN(target) || target < 500 || target > 6000) {
    errEl.innerText = "Ціль калорій має бути від 500 до 6000 ккал";
    errEl.classList.remove('hidden');
    return;
  }
  if (isNaN(protein) || protein < 10 || protein > 400) {
    errEl.innerText = "Білки мають бути в межах 10–400 г";
    errEl.classList.remove('hidden');
    return;
  }
  if (isNaN(fat) || fat < 10 || fat > 300) {
    errEl.innerText = "Жири мають бути в межах 10–300 г";
    errEl.classList.remove('hidden');
    return;
  }
  if (isNaN(carbs) || carbs < 10 || carbs > 800) {
    errEl.innerText = "Вуглеводи мають бути в межах 10–800 г";
    errEl.classList.remove('hidden');
    return;
  }
  if (isNaN(waterTarget) || waterTarget < 500 || waterTarget > 6000) {
    errEl.innerText = "Вода має бути в межах 500–6000 мл";
    errEl.classList.remove('hidden');
    return;
  }
  if (splitSum < 98 || splitSum > 102) {
    errEl.innerText = `Сума прийомів їжі має становити 100% (зараз: ${splitSum}%)`;
    errEl.classList.remove('hidden');
    return;
  }
  if (pin && !/^\d{4}$/.test(pin)) {
    errEl.innerText = "PIN повинен складатись рівно з 4 цифр або бути порожнім";
    errEl.classList.remove('hidden');
    return;
  }

  const mealSplit = {
    breakfast: sb / 100,
    lunch: sl / 100,
    dinner: sd / 100,
    snack: ss / 100
  };

  if (!app.profiles) app.profiles = {};

  if (editingProfileId === null) {
    const newId = 'u_' + Date.now();
    app.profiles[newId] = {
      id: newId,
      name, emoji, height, startWeight, targetWeight,
      target, protein, fat, carbs, waterTarget, pin, mealSplit
    };
    app.activeProfileId = newId;
    ensureDayStructure(newId, selectedDateKey);
    logAudit('Профіль', `Створено новий профіль "${name}"`);
  } else {
    Object.assign(app.profiles[editingProfileId], {
      name, emoji, height, startWeight, targetWeight,
      target, protein, fat, carbs, waterTarget, pin, mealSplit
    });
    logAudit('Профіль', `Оновлено параметри профілю "${name}"`);
  }

  save();
  closeProfileEditorModal();
  renderProfilesTab();
  renderAdmUsersTable();
  renderAll();
  renderCalendarRow();
  showToast("✓ Профіль збережено!");
}

function renderProfilesTab() {
  const container = document.getElementById('profileContainer');
  if (!container) return;
  container.innerHTML = '';

  const ids = Object.keys(app.profiles || {});
  if (ids.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center bg-white rounded-3xl border border-slate-100 card-shadow">
        <span class="text-3xl block mb-2">👤</span>
        <h4 class="text-sm font-black text-slate-800">Немає профілів</h4>
        <p class="text-xs text-slate-500 mt-1 mb-4">Створіть свій перший профіль</p>
        <button onclick="openProfileEditor(null)" class="touch-target bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md active:scale-95 transition">
          + Створити профіль
        </button>
      </div>
    `;
    return;
  }

  ids.forEach(id => {
    const p = app.profiles[id];
    const isActive = id === app.activeProfileId;
    const card = document.createElement('div');
    card.className = `p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${isActive ? 'bg-rose-50/70 border-rose-300' : 'bg-white border-slate-100 card-shadow'}`;
    card.onclick = () => switchProfile(id);

    card.innerHTML = `
      <div class="flex items-center gap-3 flex-1 min-w-0 pr-2">
        <span class="text-2xl">${p.emoji || '🙂'}</span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h4 class="text-sm font-black text-slate-800 truncate">${escapeHTML(p.name)}</h4>
            ${isActive ? '<span class="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-black">Активний</span>' : ''}
          </div>
          <p class="text-xs text-slate-500 mt-0.5">Ціль: ${p.target} ккал (Б:${p.protein}г, Ж:${p.fat}г, В:${p.carbs}г)</p>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function switchProfile(id) {
  const p = app.profiles[id];
  if (p && p.pin) {
    const entered = prompt(`Введіть 4-значний PIN для ${p.name}:`);
    if (entered !== p.pin) {
      alert("Невірний PIN-код!");
      return;
    }
  }
  app.activeProfileId = id;
  save();
  renderCalendarRow();
  renderAll();
  goToTab('home');
  showToast(`Профіль: ${app.profiles[id]?.name}`);
}

function adminDeleteProfile(id) {
  const ids = Object.keys(app.profiles || {});
  if (ids.length <= 1) {
    alert("Заборонено видаляти єдиний профіль.");
    return;
  }

  const pName = app.profiles[id]?.name || "користувача";
  if (confirm(`Видалити профіль "${pName}"? Разом із ним будуть безповоротно видалені всі його дні та записи харчування.`)) {
    if (app.days && app.days[id]) {
      delete app.days[id];
    }
    delete app.profiles[id];

    if (app.activeProfileId === id) {
      app.activeProfileId = Object.keys(app.profiles)[0];
    }

    logAudit('Профіль', `Видалено профіль "${pName}"`);
    save();
    renderProfilesTab();
    renderAdmUsersTable();
    renderAll();
    renderCalendarRow();
    showToast("Профіль видалено");
  }
}

function renderAdmUsersTable() {
  const tbody = document.getElementById('admUsersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const ids = Object.keys(app.profiles || {});

  ids.forEach(id => {
    const p = app.profiles[id];
    const isActive = id === app.activeProfileId;
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50/80 transition";
    tr.innerHTML = `
      <td class="p-3.5">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">${p.emoji || '🙂'}</span>
          <div>
            <span class="font-black text-slate-900 block">${escapeHTML(p.name)} ${isActive ? '<span class="text-[9px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-black">Active</span>' : ''}</span>
            <span class="text-[10px] text-slate-500">ID: ${escapeHTML(p.id)}</span>
          </div>
        </div>
      </td>
      <td class="p-3.5 font-black text-slate-800">${p.target} ккал</td>
      <td class="p-3.5 text-slate-500">Б:${p.protein} · Ж:${p.fat} · В:${p.carbs}</td>
      <td class="p-3.5 text-slate-500">${p.waterTarget || 2000} мл</td>
      <td class="p-3.5">${p.pin ? '<span class="text-emerald-600 font-bold">🔒 PIN</span>' : '<span class="text-slate-400">Відкрито</span>'}</td>
      <td class="p-3.5 text-right space-x-1.5">
        <button onclick="openProfileEditor('${p.id}')" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition">
          Редагувати
        </button>
        ${ids.length > 1 ? `
          <button onclick="adminDeleteProfile('${p.id}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg text-xs transition">
            Видалити
          </button>
        ` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ================= МЕНЕДЖЕР ПРОДУКТІВ =================
function renderAdmProductsTable() {
  const tbody = document.getElementById('admProductsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const query = (document.getElementById('admProductSearch')?.value || '').toLowerCase();
  const catFilter = document.getElementById('admProductCatFilter')?.value || 'Усі';

  let items = app.foods;
  if (catFilter !== 'Усі') items = items.filter(x => x.cat === catFilter);
  if (query) items = items.filter(x => x.name.toLowerCase().includes(query));

  items.forEach(it => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50/80 transition";
    tr.innerHTML = `
      <td class="p-3 font-bold text-slate-900 flex items-center gap-2">
        <span>${it.emoji || '🍽️'}</span>
        <span>${escapeHTML(it.name)}</span>
      </td>
      <td class="p-3 text-slate-500">${escapeHTML(it.cat)}</td>
      <td class="p-3 font-black text-rose-600">${it.kcal}</td>
      <td class="p-3 text-slate-600">${it.p} г</td>
      <td class="p-3 text-slate-600">${it.f} г</td>
      <td class="p-3 text-slate-600">${it.c} г</td>
      <td class="p-3 text-slate-600">${it.fiber || 0} г</td>
      <td class="p-3 text-right space-x-1">
        <button onclick="openAdmEditProductModal('${it.id}')" aria-label="Редагувати продукт" class="text-slate-500 hover:text-slate-800 font-bold px-1.5">✏️</button>
        <button onclick="admDeleteProduct('${it.id}')" aria-label="Видалити продукт" class="text-rose-500 hover:text-rose-700 font-bold px-1.5">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const catSelect = document.getElementById('admProductCatFilter');
  if (catSelect) {
    const currentVal = catSelect.value;
    catSelect.innerHTML = '<option value="Усі">Усі категорії</option>';
    app.categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.innerText = c;
      if (c === currentVal) opt.selected = true;
      catSelect.appendChild(opt);
    });
  }
}

function openAdmCreateProductModal() {
  document.getElementById('admProductModalTitle').innerText = 'Додати новий продукт';
  document.getElementById('admProdEditId').value = '';
  document.getElementById('admProdName').value = '';
  document.getElementById('admProdCat').value = app.categories[0] || 'Звичайне';
  document.getElementById('admProdKcal').value = '';
  document.getElementById('admProdEmoji').value = '🍽️';
  document.getElementById('admProdP').value = '';
  document.getElementById('admProdF').value = '';
  document.getElementById('admProdC').value = '';
  document.getElementById('admProdFiber').value = '';
  document.getElementById('admProductModal').classList.remove('hidden');
}

function openAdmEditProductModal(id) {
  const it = app.foods.find(x => x.id === id);
  if (!it) return;
  document.getElementById('admProductModalTitle').innerText = 'Редагувати продукт';
  document.getElementById('admProdEditId').value = it.id;
  document.getElementById('admProdName').value = it.name;
  document.getElementById('admProdCat').value = it.cat;
  document.getElementById('admProdKcal').value = it.kcal;
  document.getElementById('admProdEmoji').value = it.emoji;
  document.getElementById('admProdP').value = it.p;
  document.getElementById('admProdF').value = it.f;
  document.getElementById('admProdC').value = it.c;
  document.getElementById('admProdFiber').value = it.fiber || 0;
  document.getElementById('admProductModal').classList.remove('hidden');
}

function commitAdmProductSave() {
  const name = document.getElementById('admProdName').value.trim();
  const kcalVal = parseFloat(document.getElementById('admProdKcal').value);
  if (!name || isNaN(kcalVal) || kcalVal < 0) {
    alert("Вкажіть назву та коректну калорійність (від 0 ккал)");
    return;
  }
  const editId = document.getElementById('admProdEditId').value;
  const cat = document.getElementById('admProdCat').value.trim() || 'Різне';

  if (!app.categories.includes(cat)) {
    app.categories.push(cat);
  }

  const existing = editId ? app.foods.find(x => x.id === editId) : null;

  const productObj = {
    id: editId !== '' ? editId : 'f_c_' + Date.now(),
    name,
    cat,
    kcal: Math.round(kcalVal),
    emoji: document.getElementById('admProdEmoji').value.trim() || '🍽️',
    p: parseFloat(document.getElementById('admProdP').value) || 0,
    f: parseFloat(document.getElementById('admProdF').value) || 0,
    c: parseFloat(document.getElementById('admProdC').value) || 0,
    fiber: parseFloat(document.getElementById('admProdFiber').value) || 0,
    serv: existing?.serv || 100,
    src: existing?.src || 'Адміністратор'
  };

  if (editId !== '') {
    const idx = app.foods.findIndex(x => x.id === editId);
    if (idx !== -1) app.foods[idx] = productObj;
    logAudit('Продукт', `Оновлено "${name}"`);
  } else {
    app.foods.unshift(productObj);
    logAudit('Продукт', `Створено "${name}"`);
  }

  save();
  document.getElementById('admProductModal').classList.add('hidden');
  renderAdmProductsTable();
  renderAdmCategories();
  showToast("✓ Продукт збережено у базі!");
}

function admDeleteProduct(id) {
  const idx = app.foods.findIndex(x => x.id === id);
  if (idx === -1) return;
  const name = app.foods[idx].name;
  if (confirm(`Видалити "${name}" із каталогу?`)) {
    app.foods.splice(idx, 1);
    save();
    logAudit('Продукт', `Видалено "${name}"`);
    renderAdmProductsTable();
    showToast("Продукт видалено");
  }
}

function exportProductsCSV() {
  let csv = "\uFEFFID,Name,Category,Calories,Protein,Fat,Carbs,Fiber\n";
  app.foods.forEach(p => {
    const escapedName = `"${String(p.name).replace(/"/g, '""')}"`;
    const escapedCat = `"${String(p.cat).replace(/"/g, '""')}"`;
    csv += `${p.id},${escapedName},${escapedCat},${p.kcal},${p.p},${p.f},${p.c},${p.fiber || 0}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `calories_products_${getLocalDateString()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  logAudit('Експорт', 'Вивантажено базу продуктів у CSV');
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i+1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function importProductsCSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    const lines = evt.target.result.split(/\r?\n/).filter(x => x.trim().length > 0);
    let imported = 0;
    const existingNames = new Set(app.foods.map(f => f.name.toLowerCase()));

    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      if (row.length >= 7) {
        const name = row[1].trim();
        const kcal = parseInt(row[3]);
        if (name && !isNaN(kcal) && !existingNames.has(name.toLowerCase())) {
          const cat = row[2].trim() || 'Різне';
          if (!app.categories.includes(cat)) app.categories.push(cat);
          app.foods.unshift({
            id: 'f_imp_' + Date.now() + '_' + i,
            name,
            cat,
            kcal,
            p: parseFloat(row[4]) || 0,
            f: parseFloat(row[5]) || 0,
            c: parseFloat(row[6]) || 0,
            fiber: parseFloat(row[7]) || 0,
            serv: 100,
            emoji: '🍽️',
            src: 'CSV Import'
          });
          existingNames.add(name.toLowerCase());
          imported++;
        }
      }
    }
    save();
    renderAdmProductsTable();
    renderAdmCategories();
    logAudit('Імпорт', `Імпортовано ${imported} нових продуктів із CSV`);
    showToast(`✓ Успішно імпортовано ${imported} продуктів!`);
  };
  reader.readAsText(file);
}

// ================= КАТЕГОРІЇ (ЗАХИЩЕНО ВІД АПОСТРОФА) ТА РЕЦЕПТИ =================
function renderAdmCategories() {
  const container = document.getElementById('admCategoriesGrid');
  if (!container) return;
  container.innerHTML = '';

  app.categories.forEach(c => {
    const count = app.foods.filter(x => x.cat === c).length;
    const card = document.createElement('div');
    card.className = "bg-white p-3.5 rounded-2xl border border-slate-100 admin-card-shadow flex justify-between items-center";

    const info = document.createElement('div');
    info.innerHTML = `
      <h5 class="text-xs font-black text-slate-800">${escapeHTML(c)}</h5>
      <span class="text-[10px] text-slate-500 font-bold">${count} продуктів</span>
    `;

    const actions = document.createElement('div');
    actions.className = "space-x-1";

    const editBtn = document.createElement('button');
    editBtn.className = "text-xs text-indigo-600 hover:text-indigo-800 font-bold px-1";
    editBtn.title = "Перейменувати";
    editBtn.innerText = "✏️";
    editBtn.onclick = () => renameCategoryPrompt(c);

    const delBtn = document.createElement('button');
    delBtn.className = "text-xs text-rose-500 hover:text-rose-700 font-bold px-1";
    delBtn.title = "Видалити";
    delBtn.innerText = "🗑️";
    delBtn.onclick = () => deleteCategoryPrompt(c);

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    card.appendChild(info);
    card.appendChild(actions);
    container.appendChild(card);
  });
}

function openAdmAddCategoryPrompt() {
  const name = prompt("Назва нової категорії:");
  if (name && name.trim()) {
    const cleanName = name.trim();
    if (!app.categories.includes(cleanName)) {
      app.categories.push(cleanName);
      save();
      renderAdmCategories();
      renderAdmProductsTable();
      logAudit('Категорія', `Створено категорію "${cleanName}"`);
      showToast(`✓ Категорію "${cleanName}" створено!`);
    }
  }
}

function renameCategoryPrompt(oldName) {
  const next = prompt(`Нова назва для категорії "${oldName}":`, oldName);
  if (next && next.trim() && next.trim() !== oldName) {
    const newName = next.trim();
    const cIdx = app.categories.indexOf(oldName);
    if (cIdx !== -1) app.categories[cIdx] = newName;
    app.foods.forEach(f => {
      if (f.cat === oldName) f.cat = newName;
    });
    save();
    renderAdmCategories();
    renderAdmProductsTable();
    logAudit('Категорія', `Перейменовано категорію "${oldName}" на "${newName}"`);
    showToast("Категорію перейменовано");
  }
}

function deleteCategoryPrompt(name) {
  if (confirm(`Видалити категорію "${name}"? Продукти цієї категорії будуть переведені у "Звичайне".`)) {
    app.categories = app.categories.filter(x => x !== name);
    app.foods.forEach(f => {
      if (f.cat === name) f.cat = 'Звичайне';
    });
    if (!app.categories.includes('Звичайне')) app.categories.push('Звичайне');
    save();
    renderAdmCategories();
    renderAdmProductsTable();
    logAudit('Категорія', `Видалено категорію "${name}"`);
    showToast("Категорію видалено");
  }
}

function renderAdmRecipes() {
  const container = document.getElementById('admRecipesGrid');
  if (!container) return;
  container.innerHTML = '';
  const dishes = app.foods.filter(x => x.cat === 'Страви' || x.cat === 'Супи');

  dishes.forEach(d => {
    const card = document.createElement('div');
    card.className = "bg-white p-4 rounded-2xl border border-slate-100 admin-card-shadow space-y-2";
    card.innerHTML = `
      <div class="flex items-center gap-2.5">
        <span class="text-2xl">${d.emoji || '🍲'}</span>
        <div>
          <h4 class="text-xs font-black text-slate-900">${escapeHTML(d.name)}</h4>
          <span class="text-[10px] text-slate-500 font-semibold">${escapeHTML(d.cat)} • ${escapeHTML(d.src || 'Рецепт')}</span>
        </div>
      </div>
      <div class="text-xs font-bold text-slate-600 flex justify-between border-t border-slate-50 pt-2">
        <span>Ккал: <b class="text-rose-600">${d.kcal}</b></span>
        <span>Б:${d.p} · Ж:${d.f} · В:${d.c}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// ================= ПОРАДИ ДНЯ =================
function renderAdmTips() {
  const container = document.getElementById('admTipsListContainer');
  if (!container) return;
  container.innerHTML = '';
  app.tips.forEach((t, idx) => {
    const card = document.createElement('div');
    card.className = "bg-white p-3 rounded-2xl border border-slate-100 admin-card-shadow flex justify-between items-center text-xs";
    card.innerHTML = `
      <div class="flex items-center gap-2 flex-1 pr-3">
        <span class="text-indigo-600 font-black">#${idx + 1}</span>
        <span class="font-bold text-slate-700">${escapeHTML(t)}</span>
      </div>
      <button onclick="admDeleteTip(${idx})" class="text-rose-500 hover:text-rose-700 font-bold px-2 py-1">Видалити</button>
    `;
    container.appendChild(card);
  });
}

function openAddTipModal() {
  const tip = prompt("Введіть текст нової поради дня:");
  if (tip && tip.trim()) {
    app.tips.push(tip.trim());
    save();
    renderAdmTips();
    displayCurrentTip();
    logAudit('Контент', 'Додано пораду дня');
    showToast("✓ Пораду збережено у базі!");
  }
}

function admDeleteTip(idx) {
  if (confirm("Видалити цю пораду?")) {
    app.tips.splice(idx, 1);
    save();
    renderAdmTips();
    displayCurrentTip();
    showToast("Пораду видалено");
  }
}

function displayCurrentTip() {
  const tipEl = document.getElementById('homeSmartTip');
  if (tipEl && app.tips && app.tips.length > 0) {
    tipEl.innerText = app.tips[curTipIdx % app.tips.length];
  }
}

function nextRandomTip() {
  if (!app.tips || app.tips.length === 0) return;
  curTipIdx = (curTipIdx + 1 + Math.floor(Math.random() * Math.max(1, app.tips.length - 1))) % app.tips.length;
  displayCurrentTip();
}

// ================= БЕЗПЕКА & ЖУРНАЛ АУДИТУ =================
async function commitAdminSecurityPassword() {
  const p1 = document.getElementById('admSecPass1').value;
  const p2 = document.getElementById('admSecPass2').value;
  if (!p1 || p1.length < 4) {
    alert("Пароль має містити щонайменше 4 символи");
    return;
  }
  if (p1 !== p2) {
    alert("Паролі не збігаються");
    return;
  }
  app.adminPassHash = await sha256(p1);
  save();
  document.getElementById('admSecPass1').value = '';
  document.getElementById('admSecPass2').value = '';
  logAudit('Безпека', 'Змінено хеш пароля адміністратора');
  showToast("✓ Пароль адміністратора оновлено!");
}

function renderAdmAuditLog() {
  const container = document.getElementById('admFullAuditLogList');
  if (!container) return;
  container.innerHTML = '';
  const list = app.activityLog || [];
  list.forEach(l => {
    const r = document.createElement('div');
    r.className = "flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0";
    r.innerHTML = `
      <div><b class="text-slate-800">${escapeHTML(l.action)}:</b> <span class="text-slate-600">${escapeHTML(l.details)}</span></div>
      <span class="text-[10px] text-slate-500 font-mono">${escapeHTML(l.date)} ${escapeHTML(l.time)}</span>
    `;
    container.appendChild(r);
  });
}

function clearActivityLog() {
  if (confirm("Очистити всю історію операцій?")) {
    app.activityLog = [];
    save();
    renderAdmAuditLog();
    renderAdminRecentActivity();
    showToast("Журнал очищено");
  }
}

function saveAdmGeminiKey() {
  const k = document.getElementById('admGeminiKeyInput').value.trim();
  app.geminiApiKey = k;
  app.geminiTested = false;
  save();
  logAudit('Безпека', 'Оновлено ключ Gemini API');
  showToast("✓ Ключ Gemini API збережено!");
  refreshAdminData();
}

function saveAiPromptConfig() {
  app.aiPromptConfig = document.getElementById('admAiSystemPrompt').value;
  save();
  showToast("✓ Промпт оновлено!");
  logAudit('AI', 'Оновлено системний промпт сканера');
}

// ================= КАЛЕНДАР, АКТИВНІСТЬ, НАВІГАЦІЯ =================
function renderCalendarRow() {
  const container = document.getElementById('calendarWeekRow');
  if (!container) return;
  container.innerHTML = '';
  const daysShort = ['П', 'В', 'С', 'Ч', 'П', 'С', 'Н'];
  const curr = new Date();
  const todayStr = getLocalDateString(curr);
  const dayOfWeek = (curr.getDay() + 6) % 7;
  const monday = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() - dayOfWeek);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dKey = getLocalDateString(d);
    const isSelected = dKey === selectedDateKey;

    ensureDayStructure(app.activeProfileId, dKey);
    const dayRec = app.days[app.activeProfileId]?.[dKey];
    const dayEaten = getDayCalories(dayRec);

    let dotColor = 'bg-slate-200';
    if (dayEaten > 0) {
      const target = curProfile()?.target || 2000;
      if (dayEaten > target * 1.05) dotColor = 'bg-rose-500';
      else if (dayEaten < target * 0.85) dotColor = 'bg-amber-400';
      else dotColor = 'bg-emerald-500';
    }

    const col = document.createElement('div');
    col.className = "flex flex-col items-center gap-1 cursor-pointer";
    col.onclick = () => { selectedDateKey = dKey; renderCalendarRow(); renderAll(); };
    col.innerHTML = `
      <span class="text-[11px] text-slate-500 font-bold">${daysShort[i]}</span>
      <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition ${isSelected ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}">
        ${d.getDate()}
      </div>
      <span class="w-1.5 h-1.5 rounded-full ${dotColor} mt-0.5"></span>
    `;
    container.appendChild(col);
  }
  document.getElementById('homeDateLabel').innerText = (selectedDateKey === todayStr) ? t('today') : selectedDateKey;
  document.getElementById('diaryCurrentDateLabel').innerText = (selectedDateKey === todayStr) ? t('today') : selectedDateKey;
}

function openActivityModal() { document.getElementById('activityModal').classList.remove('hidden'); }
function closeActivityModal() { document.getElementById('activityModal').classList.add('hidden'); }
function applyStepsCalories() {
  const steps = parseInt(document.getElementById('inputStepsSync').value) || 0;
  if (steps > 0) {
    curDayData().burned = Math.round(steps * 0.038);
    save();
    renderAll();
    closeActivityModal();
    showToast(`✓ Додано ${curDayData().burned} ккал за кроки!`);
  }
}
function addQuickBurn(k) {
  curDayData().burned = (curDayData().burned || 0) + k;
  save();
  renderAll();
  closeActivityModal();
  showToast(`+${k} спалених ккал`);
}

function exportDataJSON() {
  const jsonStr = JSON.stringify(app, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `calories_pro_full_backup_${getLocalDateString()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  logAudit('Бекап', 'Експортовано повний JSON бекап');
  showToast("✓ Резервну копію збережено!");
}

function importDataJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (parsed.profiles) {
        app = Object.assign(app, parsed);
        const validModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-pro-preview'];
        if (!app.activeModel || !validModels.includes(app.activeModel)) {
          app.activeModel = 'gemini-3.8-flash';
        }
        mergeSeedData();
        if (!app.tips || app.tips.length === 0) app.tips = (typeof SEED_TIPS !== 'undefined') ? [...SEED_TIPS] : [];
        if (!app.activityLog) app.activityLog = [];
        if (!app.shoppingList) app.shoppingList = [];

        Object.keys(app.profiles).forEach(id => {
          const p = app.profiles[id];
          if (!p.mealSplit) p.mealSplit = Object.assign({}, DEFAULT_MEAL_SPLIT);
          if (!p.waterTarget) p.waterTarget = 2000;
          if (p.pin === undefined) p.pin = '';
        });

        save();
        renderCalendarRow();
        applyTranslations();
        renderAll();
        logAudit('Бекап', 'Відновлено дані з JSON файлу');
        showToast("✓ Дані успішно відновлено!");
      }
    } catch(err) { alert("Помилка читання JSON файлу: " + err.message); }
  };
  reader.readAsText(file);
}

function goToTab(tabName) {
  ['home', 'diary', 'weight', 'plan', 'more'].forEach(t => {
    const page = document.getElementById('tab-' + t);
    const btn = document.getElementById('nav-btn-' + t);
    if (t === tabName) {
      page.classList.remove('hidden');
      if (btn) { btn.classList.add('text-rose-500'); btn.classList.remove('text-slate-400'); }
    } else {
      page.classList.add('hidden');
      if (btn) { btn.classList.remove('text-rose-500'); btn.classList.add('text-slate-400'); }
    }
  });
  window.scrollTo(0,0);
}

window.onload = init;
