/* ============================================================
ProxyModel — API-слой MoonSSS (ProxyAPI.ru)
Только сетевые запросы, стриминг, системный промпт.
UI-логика находится в ai.html.

ЗАВИСИМОСТИ (должны быть определены в ai.html ДО подключения этого файла):
- window.state — объект состояния приложения
- toast(msg, type, dur) — функция уведомлений
- getImgCfg() — получить настройки генерации изображений
- window.domainHost(uri) — извлечь домен из URL
- fetchOpenverseImages(query, signal) — поиск в Openverse

ПОРЯДОК ПОДКЛЮЧЕНИЯ:
1. CDN-библиотеки (marked, DOMPurify, highlight.js)
2. proxymodel.js (этот файл)
3. Основной скрипт ai.html
============================================================ */

/* ---------- Каталог моделей ----------
   Место для новых моделей: добавляйте объекты в массив MODELS.
   api: 'openrouter' | 'anthropic' | 'gemini'
   Для anthropic/gemini укажите нативный id в поле native.   */
const MODELS = [
  {
    id: "qwen/qwen3.8-max",
    name: "Qwen 3.8 Max",
    provider: "OpenRouter",
    api: "openrouter",
    reasoning: true,
    vision: true,
    tagline: "Максимальная мощь Alibaba",
    icon: "qwen-color.svg",
    reasoningLevels: ["off", "low", "medium", "high"],
  },
  {
    id: "qwen/qwen3.7-flash",
    name: "Qwen 3.7 Flash",
    provider: "OpenRouter",
    api: "openrouter",
    reasoning: true,
    vision: true,
    tagline: "Скорость и эффективность",
    icon: "qwen-color.svg",
    reasoningLevels: ["off", "low", "medium", "high"],
  },
  {
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    name: "NemoTron 3 nano",
    temperature: 0.6,
    provider: "OpenRouter",
    api: "openrouter",
    reasoning: true,
    vision: true,
    tagline: "Ультра-мощная модель NVIDIA",
    icon: "nvidia-color.svg",
    reasoningLevels: ["off", "low", "medium", "high"],
  },
  {
    id: "poolside/laguna-s-2.1:free",
    name: "Laguna S 2.1 Free",
    provider: "OpenRouter",
    api: "openrouter",
    reasoning: true,
    vision: false,
    tagline: "Бесплатная версия Laguna S 2.1",
    icon: "poolside-color.svg",
    reasoningLevels: ["off", "Auto"],
  },
  {
    id: "deepseek/deepseek-v4-flash-0731",
    name: "DeepSeek v4 Flash",
    provider: "OpenRouter",
    api: "openrouter",
    reasoning: true,
    vision: true,
    tagline: "Скорость и эффективность",
    icon: "deepseek-color.svg",
    reasoningLevels: ["off", "low", "medium", "high", "xhigh", "max", "auto"],
  },
  {
    id: "openai/gpt-5.6-luna",
    name: "GPT-5.6 Luna",
    provider: "OpenRouter",
    api: "openrouter",
    reasoning: true,
    vision: true,
    tagline: "Передовой интеллект OpenAI",
    icon: "chat-gpt.png",
    reasoningLevels: ["off", "low", "medium", "high", "xhigh", "max"],
  },
  {
    id: "openai/gpt-5.6-terra",
    name: "GPT-5.6 Terra",
    provider: "OpenRouter",
    api: "openrouter",
    reasoning: true,
    vision: true,
    tagline: "Глубокий анализ и стабильность OpenAI",
    icon: "chat-gpt.png",
    reasoningLevels: ["off", "low", "medium", "high", "xhigh", "max"],
  },
  {
    id: "openai/gpt-5.6-sol",
    name: "GPT-5.6 Sol",
    provider: "OpenRouter",
    api: "openrouter",
    reasoning: true,
    vision: true,
    tagline: "Солнечная скорость и интеллект OpenAI",
    icon: "chat-gpt.png",
    reasoningLevels: ["off", "low", "medium", "high", "xhigh", "max"],
  },
  {
    id: "openai/gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "OpenRouter",
    api: "openrouter",
    reasoning: true,
    vision: true,
    tagline: "Сверхлёгкая модель OpenAI",
    icon: "chat-gpt.png",
    reasoningLevels: ["minimal", "medium", "high"],
  },
  {
    id: "anthropic/claude-opus-5",
    name: "Claude 5 Opus",
    provider: "Anthropic",
    api: "anthropic",
    native: "claude-opus-5",
    reasoning: true,
    vision: true,
    tagline: "Флагманская глубина Anthropic",
    icon: "claude-color.svg",
    reasoningLevels: ["off", "low", "medium", "high"],
  },
  {
    id: "anthropic/claude-sonnet-5",
    name: "Claude 5 Sonnet",
    provider: "Anthropic",
    api: "anthropic",
    native: "claude-sonnet-5",
    reasoning: true,
    vision: true,
    tagline: "Баланс ума и скорости",
    icon: "claude-color.svg",
    reasoningLevels: ["off", "low", "medium", "high"],
  },
  {
    id: "google/gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    provider: "Google",
    api: "gemini",
    native: "gemini-3.6-flash",
    reasoning: true,
    vision: true,
    tagline: "Мультимодальность Google",
    icon: "gemini-color.svg",
    reasoningLevels: ["off", "low", "medium", "high"],
  },
  {
    id: "moonshotai/kimi-k3",
    name: "Kimi k3",
    provider: "OpenRouter",
    api: "openrouter",
    reasoning: true,
    vision: true,
    tagline: "Рассуждающая модель Moonshot AI",
    icon: "kimi-ai.svg",
    reasoningLevels: ["off", "low", "medium", "high"],
  },
  {
    id: "tencent/hy3",
    name: "Tencent Hunyuan 3",
    provider: "OpenRouter",
    api: "openrouter",
    reasoning: true,
    vision: true,
    tagline: "Флагманский разум Tencent",
    icon: "hunyuan-color.svg",
    reasoningLevels: ["off", "low", "medium", "high"],
  },
  {
    id: "minimax/minimax-m3",
    name: "MiniMax M3",
    provider: "OpenRouter",
    api: "openrouter",
    reasoning: true,
    vision: true,
    tagline: "Инновации от MiniMax",
    icon: "minimax-color.svg",
    reasoningLevels: ["off", "low", "medium", "high"],
  },
  {
    id: "openrouter/auto-beta",
    name: "AutoRouter",
    provider: "OpenRouter",
    api: "openrouter",
    reasoning: false,
    vision: true,
    tagline: "Лучшая модель под каждый запрос",
    icon: "openrouter-color.svg",
    reasoningLevels: ["off"],
  },
  {
    id: "openrouter/fusion",
    name: "Auto Fusion",
    provider: "OpenRouter",
    api: "openrouter",
    reasoning: false,
    vision: true,
    tagline: "Максимум возможностей авто-выбора",
    icon: "openrouter-color.svg",
    reasoningLevels: ["off"],
  },
];
const modelThinkingConfigs = {
  "openrouter/fusion": [
    {
      value: "off",
      label: "Автоматически",
      desc: "Встроенный консилиум моделей и веб-поиск",
    },
  ],
  "openrouter/auto-beta": [
    {
      value: "off",
      label: "Автоматически",
      desc: "Автоматический выбор модели маршрутизатором",
    },
  ],

  "poolside/laguna-s-2.1:free": [
    {
      value: "off",
      label: "Отключено",
      desc: "Прямой быстрый ответ"
    },
    {
      value: "always",
      label: "Автоматически",
      desc: "Встроенный консилиум моделей и веб-поиск",
    },
  ],

  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free": [
    {
      value: "off",
      label: "Отключено",
      desc: "Прямой быстрый ответ"
    },
    {
      value: "low",
      label: "Низкий (Low)",
      desc: "Поверхностные рассуждения",
    },
    {
      value: "medium",
      label: "Средний (Medium)",
      desc: "Сбалансированное обдумывание",
    },
    {
      value: "high",
      label: "Высокий (High)",
      desc: "Глубокая логика",
    },
    {
      value: "always",
      label: "Автоматически",
      desc: "Встроенный консилиум моделей и веб-поиск",
    },
  ],

  "deepseek/deepseek-v4-flash-0731": [
    {
      value: "off",
      label: "Отключено",
      desc: "Прямой быстрый ответ"
    },
    {
      value: "low",
      label: "Низкий (Low)",
      desc: "Поверхностные рассуждения",
    },
    {
      value: "medium",
      label: "Средний (Medium)",
      desc: "Сбалансированное обдумывание",
    },
    {
      value: "high",
      label: "Высокий (High)",
      desc: "Глубокая логика",
    },
    {
      value: "xhigh",
      label: "Очень высокий (xHigh)",
      desc: "Сложное проектирование",
    },
    {
      value: "max",
      label: "Максимум (Max)",
      desc: "Предельная глубина анализа",
    },
    {
      value: "always",
      label: "Автоматически",
      desc: "Встроенный консилиум моделей и веб-поиск",
    },
  ],

  "openai/gpt-5.6-luna": [
    {
      value: "off",
      label: "Без размышлений",
      desc: "Прямой быстрый ответ (Non-reasoning)",
    },
    { value: "low", label: "Низкий (Low)", desc: "Поверхностные рассуждения" },
    {
      value: "medium",
      label: "Средний (Medium)",
      desc: "Сбалансированное обдумывание",
    },
    { value: "high", label: "Высокий (High)", desc: "Глубокая логика" },
    {
      value: "xhigh",
      label: "Очень высокий (xHigh)",
      desc: "Сложное проектирование",
    },
    {
      value: "max",
      label: "Максимум (Max)",
      desc: "Предельная глубина анализа",
    },
  ],
  "openai/gpt-5.6-terra": [
    {
      value: "off",
      label: "Без размышлений",
      desc: "Прямой быстрый ответ (Non-reasoning)",
    },
    { value: "low", label: "Низкий (Low)", desc: "Поверхностные рассуждения" },
    {
      value: "medium",
      label: "Средний (Medium)",
      desc: "Сбалансированное обдумывание",
    },
    { value: "high", label: "Высокий (High)", desc: "Глубокая логика" },
    {
      value: "xhigh",
      label: "Очень высокий (xHigh)",
      desc: "Сложное проектирование",
    },
    {
      value: "max",
      label: "Максимум (Max)",
      desc: "Предельная глубина анализа",
    },
  ],
  "openai/gpt-5.6-sol": [
    {
      value: "off",
      label: "Без размышлений",
      desc: "Прямой быстрый ответ (Non-reasoning)",
    },
    { value: "low", label: "Низкий (Low)", desc: "Поверхностные рассуждения" },
    {
      value: "medium",
      label: "Средний (Medium)",
      desc: "Сбалансированное обдумывание",
    },
    { value: "high", label: "Высокий (High)", desc: "Глубокая логика" },
    {
      value: "xhigh",
      label: "Очень высокий (xHigh)",
      desc: "Сложное проектирование",
    },
    {
      value: "max",
      label: "Максимум (Max)",
      desc: "Предельная глубина анализа",
    },
  ],
  "openai/gpt-5-nano": [
    {
      value: "minimal",
      label: "Минимальный (Minimal)",
      desc: "Сверхбыстрый ответ с базовой логикой",
    },
    {
      value: "medium",
      label: "Средний (Medium)",
      desc: "Сбалансированное обдумывание",
    },
    { value: "high", label: "Высокий (High)", desc: "Глубокая логика" },
  ],

  "anthropic/claude-opus-5": [
    {
      value: "low",
      label: "Adaptive (Low)",
      desc: "Низкий уровень усилий (Low Effort)",
    },
    {
      value: "medium",
      label: "Adaptive (Medium)",
      desc: "Средний уровень усилий (Medium Effort)",
    },
    {
      value: "high",
      label: "Adaptive (High)",
      desc: "Высокий уровень усилий (High Effort)",
    },
    {
      value: "xhigh",
      label: "Adaptive (XHigh)",
      desc: "Очень высокий уровень (XHigh Effort)",
    },
    {
      value: "max",
      label: "Adaptive (Max)",
      desc: "Максимальный уровень (Max Effort)",
    },
  ],
  "anthropic/claude-sonnet-5": [
    {
      value: "off",
      label: "Non-reasoning",
      desc: "Прямой быстрый ответ без размышлений",
    },
    {
      value: "low",
      label: "Adaptive (Low)",
      desc: "Низкий уровень усилий (Low Effort)",
    },
    {
      value: "medium",
      label: "Adaptive (Medium)",
      desc: "Средний уровень усилий (Medium Effort)",
    },
    {
      value: "high",
      label: "Adaptive (High)",
      desc: "Высокий уровень усилий (High Effort)",
    },
    {
      value: "xhigh",
      label: "Adaptive (XHigh)",
      desc: "Очень высокий уровень (XHigh Effort)",
    },
    {
      value: "max",
      label: "Adaptive (Max)",
      desc: "Максимальный уровень (Max Effort)",
    },
  ],
  "google/gemini-3.6-flash": [
    {
      value: "off",
      label: "Отключено",
      desc: "Прямой быстрый ответ"
    },
    {
      value: "always",
      label: "Включено",
      desc: "Показывать пошаговые размышления",
    },
  ],
  "moonshotai/kimi-k3": [
    {
      value: "always",
      label: "Включено",
      desc: "Показывать пошаговые размышления Kimi",
    },
    { value: "off", label: "Отключено", desc: "Прямой быстрый ответ" },
  ],
  "tencent/hy3": [
    {
      value: "always",
      label: "Включено",
      desc: "Показывать пошаговые размышления",
    },
    { value: "off", label: "Отключено", desc: "Прямой быстрый ответ" },
  ],
  "minimax/minimax-m3": [
    {
      value: "always",
      label: "Включено",
      desc: "Показывать пошаговые размышления",
    },
    { value: "off", label: "Отключено", desc: "Прямой быстрый ответ" },
  ],
  "qwen/qwen3.8-max": [
    { value: "off", label: "Отключено", desc: "Быстрый ответ" },
    { value: "low", label: "Низкий (Low)", desc: "Краткое планирование" },
    {
      value: "medium",
      label: "Средний (Medium)",
      desc: "Сбалансированное обдумывание",
    },
    { value: "high", label: "Высокий (High)", desc: "Полное рассуждение" },
  ],
  "qwen/qwen3.7-flash": [
    { value: "off", label: "Отключено", desc: "Быстрый ответ" },
    { value: "low", label: "Низкий (Low)", desc: "Краткое планирование" },
    {
      value: "medium",
      label: "Средний (Medium)",
      desc: "Сбалансированное обдумывание",
    },
    { value: "high", label: "Высокий (High)", desc: "Полное рассуждение" },
  ],
};

const THINK_BUDGET = {
  minimal: 512,
  low: 1024,
  mid: 2048,
  medium: 2048,
  high: 4096,
  xhigh: 8192,
  max: 16384,
  always: 4096,
};
/* SUGGESTIONS — UI, находится в ai.html */

/* ── Генерация изображений: модели (логика из UniMG) ── */
const IMG_MODELS = [
  {
    id: "sourceful/riverflow-v2.5-pro",
    name: "Riverflow 2.5 Pro",
    vendor: "Sourceful",
    aliases: [
      "riverflow 2.5 pro",
      "riverflow pro",
      "riverflow",
      "sourceful",
      "sourceful/riverflow-v2.5-pro",
    ],
    resolutions: ["1K", "2K", "4K"],
    supportsResolution: true,
    ratios: ["1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16", "21:9", "auto"],
    backgrounds: ["auto", "transparent", "opaque"],
    desc: "Pro-уровень: до 4K, художественность и детали",
  },
  {
    id: "black-forest-labs/flux.2-klein-4b",
    name: "FLUX 2 Klein",
    vendor: "Black Forest Labs",
    aliases: [
      "flux 2 klein",
      "flux 2",
      "flux klein",
      "flux.2 klein 4b",
      "flux.2 klein",
      "flux.2",
      "flux",
      "black forest labs",
      "black-forest-labs/flux.2-klein-4b",
    ],
    resolutions: ["1K"],
    supportsResolution: false,
    ratios: ["1:1", "4:5", "3:4", "4:3", "16:9", "9:16"],
    backgrounds: [],
    desc: "Скоростная модель для быстрых набросков",
  },
];

/* Инструкция собирается динамически: ИИ знает ТОЛЬКО выбранную пользователем модель */
function buildImageGenInstructions() {
  const cfg = getImgCfg();
  const m = IMG_MODELS.find((x) => x.id === cfg.model) || IMG_MODELS[0];
  const quality = m.supportsResolution ? cfg.resolution || "2K" : "1K";
  return [
    "=== ИНСТРУМЕНТ: ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЙ (image_generation) ===",
    'У тебя есть встроенный генератор изображений. Тебе доступна РОВНО ОДНА модель генерации: "' +
      m.name +
      '". Других моделей генерации не существует — не упоминай и не предлагай их.',
    "Ты МОЖЕШЬ предложить генерацию изображения, но ТОЛЬКО когда пользователь явно и однозначно просит нарисовать / сгенерировать / создать изображение, картинку, арт, обои, логотип, иллюстрацию, фото и т.п. Если прямой просьбы нет — НЕ используй команду по собственной инициативе, даже если картинка могла бы дополнить ответ.",
    "Когда пользователь просит изображение, строй ответ СТРОГО по схеме: 1) короткое вступление ДО команды — что именно ты сейчас сгенерируешь и как понял задачу; 2) команда с новой строки; 3) ОБЯЗАТЕЛЬНОЕ продолжение ПОСЛЕ команды. Команда — НЕ стоп-сигнал и НЕ конец ответа: не завершай сообщение командой и не останавливайся на ней, система сама вырежет её, вставит на её место карточку генерации, и генерация пойдёт параллельно, пока ты дописываешь текст.",
    "Если пользователь попросил помимо генерации ещё что-то (предложить идеи улучшения, объяснить, доработать, продолжить) — эта часть ответа пишется ПОСЛЕ команды.",
    "{image_generation[" + m.name + ":" + quality + "]:{промпт}}",
    "Правила формата:",
    '- МОДЕЛЬ: всегда и только "' + m.name + '".',
    "- КАЧЕСТВО: всегда " +
      quality +
      " (выбрано пользователем в настройках, не изменяй).",
    "- Внутри вторых фигурных скобок — подробный промпт НА АНГЛИЙСКОМ языке: сюжет, композиция, стиль, освещение, детали.",
    "- Пример: {image_generation[" +
      m.name +
      ":" +
      quality +
      "]:{a snow leopard resting on a cliff at sunset, cinematic lighting, ultra detailed, 8k}}",
    "- Пример правильной структуры ответа: «Сейчас сгенерирую… (перенос строки) {image_generation[…]:{…}} (перенос строки) Готово! Вот идеи, как можно улучшить изображение: …».",
    "- Команду пиши ВСЕГДА с новой строки, отдельной строкой, без markdown-оформления, кавычек и кодовых блоков вокруг неё. До и после команды может быть обычный текст ответа.",
    "- НИКОГДА не заканчивай сообщение командой: после неё обязательно должен идти текст (кроме случая, когда пользователь прямо попросил ответить только командой).",
    "- За один ответ — не более двух команд. Не дублируй одну и ту же команду.",
    "- После команды система покажет пользователю запрос на подтверждение генерации: он сможет разрешить её, изменить промпт или отклонить. Не переспрашивай подтверждение текстом и не уговаривай. Если пользователь отклонил запрос — просто продолжи диалог без повторной команды.",
    "- Если пользователь просит изменить уже созданное изображение — сгенерируй новую команду с уточнённым промптом.",
    "=== КОНЕЦ ИНСТРУМЕНТА ===",
  ].join("\n");
}

/* ---------- Отправка ---------- */
function textWithFiles(m) {
  let t = m.content || "";
  (m.attachments || []).forEach((f) => {
    if (f.kind === "file" || f.kind === "text") {
      t += `
[Вложение: ${f.name}]
\`\`\`
${f.text}
\`\`\``;
    } else if (f.kind === "artifact") {
      t += `
[АРТЕФАКТ ДЛЯ РЕДАКТИРОВАНИЯ: «${f.name}», id: ${f.artId}, версия ${f.version}]
Текущий полный код артефакта:
\`\`\`html
${f.code}
\`\`\`
Создай обновлённую версию этого артефакта: выведи тег <artifact> с ТЕМ ЖЕ id="${f.artId}" и полным изменённым кодом.`;
    }
  });
  return t;
}

async function parseError(resp) {
  let msg = `HTTP ${resp.status}`;
  try {
    const j = await resp.json();
    msg =
      (j.error && (j.error.message || j.error)) || j.message || j.detail || msg;
    if (typeof msg !== "string") msg = JSON.stringify(msg);
  } catch (e) {}
  if (resp.status === 403) {
    const origin =
      window.location &&
      window.location.origin &&
      !window.location.origin.startsWith("file:")
        ? window.location.origin
        : "moonsss.app";
    msg = `Доступ запрещен (403). Проверьте настройки ключа ProxyAPI: 1) Включен ли доступ к OpenRouter; 2) Добавлен ли домен "${origin}" в белый список HTTP-Referer.`;
  }
  if (resp.status === 402)
    msg = "Недостаточно средств на балансе ProxyAPI (402). Пополните баланс.";
  if (resp.status === 401)
    msg = "Неверный API-ключ ProxyAPI (401). Проверьте правильность токена.";
  if (resp.status === 400) msg = "Неверный формат запроса (400): " + msg;
  throw new Error(msg);
}
async function readSSE(resp, onData) {
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).replace(/\r$/, "");
      buf = buf.slice(i + 1);
      // Игнорируем служебные строки SSE (event:, id:, retry:) и пустые строки-разделители
      if (
        !line ||
        line.startsWith("event:") ||
        line.startsWith("id:") ||
        line.startsWith("retry:")
      )
        continue;
      if (line.startsWith("data:")) {
        const payload = line.slice(5).trim();
        if (payload && payload !== "[DONE]") onData(payload);
      }
    }
  }
}

/* ============================================================
   ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЙ: Riverflow 2.5 Pro + FLUX 2 Klein
   Логика портирована из UniMG (ProxyAPI → OpenRouter, chat route)
   ============================================================ */
const IMG_CMD_RE =
  /\{image_generation\[([^\[\]]+?):([^\[\]]*?)\]:\{([\s\S]+?)\}\}/g;

/* ============================================================
АРТЕФАКТЫ: инструкция для модели
============================================================ */
function buildArtifactInstructions() {
  return [
    "=== АРТЕФАКТЫ ===",
    "Артефакт — это цельный самодостаточный HTML-документ (HTML + <style> + <script> в одном файле), который пользователь запускает в изолированной песочнице, редактирует и сохраняет.",
    "",
    "Создавай артефакт, когда задача имеет визуальную или интерактивную природу: приложение, интерфейс, визуализация, игра, калькулятор, генератор, форма, анимация, дашборд, прототип. Для чисто текстовых ответов, пояснений и сниппетов кода артефакт не нужен.",
    "",
    "Технический стандарт:",
    "• Единый HTML-файл без внешних зависимостей (кроме шрифтов Google Fonts).",
    "• Полный, рабочий код без сокращений, плейсхолдеров и «добавьте сюда…». Никаких TODO.",
    "• Адаптивный дизайн: корректно работает от 320px до десктопа. Тёмная тема по умолчанию.",
    "• Современные API: ES2022+, CSS Grid/Flexbox, Custom Properties, requestAnimationFrame.",
    "• Продуманная UX-архитектура: состояния загрузки, пустые состояния, ошибки, доступность с клавиатуры.",
    "• Надёжное хранение: IndexedDB для пользовательских данных, никогда не используй localStorage/sessionStorage.",
    "",
    "Визуальный стандарт (премиальная эстетика):",
    "• Палитра: тёмно-серая база (#1a1a1a, #222, #2a2a2a) + серебристые акценты (hsla(0,0%,87%,1) для светлого серебра).",
    "• Используй hsla() вместо rgba() для полного контроля прозрачности и оттенков. Пример: hsla(203,76%,72%,1) для акцента.",
    "• Никаких радужных градиентов, ярких неоновых фонов, кислотных цветов. Только приглушённые, холодные тона.",
    "• Эффекты: Glassmorphism (backdrop-filter: blur(16px) + полупрозрачный фон), зернистость (SVG noise overlay), лёгкий глитч на текстах.",
    "• Размытие и глубина: используй box-shadow для теней, blur для глубины резкости, градиенты для объёма.",
    "• Типографика: чёткие sans-serif (Inter, Manrope, Space Grotesk), крупные заголовки, щедрые отступы.",
    "• Анимации: cubic-bezier(0.16, 1, 0.3, 1) для плавности, микро-трансформации на hover, stagger-анимации списков.",
    "• Запрещено: слабые пастельные фоны, мультяшные цвета, Comic Sans и подобные шрифты, перегруженный UI.",
    "",
    "Структура ответа:",
    "1. Краткое описание решения (1–2 предложения).",
    "2. Блок артефакта на отдельной строке:",
    '   <artifact id="snake_case_id" title="Человекочитаемое название">',
    "   <!DOCTYPE html><html>…</html>",
    "   </artifact>",
    "3. Короткое послесловие: как пользоваться, на что обратить внимание, что можно улучшить.",
    "",
    "При редактировании существующего артефакта (во вложении «АРТЕФАКТ ДЛЯ РЕДАКТИРОВАНИЯ»): сохраняй исходный id — это связывает версии. Выводи полную обновлённую версию, а не дифф и не описание изменений.",
    "=== КОНЕЦ ===",
  ].join("\n");
}
function getSystemPromptText(model) {
  const s = state.settings;
  let text = (s.systemPrompt || "").trim();
  if (s.imageGen)
    text = (text ? text + "\n\n" : "") + buildImageGenInstructions();
  if (s.webSearch)
    text = (text ? text + "\n" : "") + buildWebSearchInstructions(model);
  if (s.artifacts)
    text = (text ? text + "\n" : "") + buildArtifactInstructions();
  return text;
}

function stripImgCommands(text) {
  return String(text || "")
    .replace(IMG_CMD_RE, "")
    .trim();
}

function fmtDur(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

function resolveImgModel(name) {
  const n = String(name || "")
    .trim()
    .toLowerCase();
  if (!n) return null;
  return (
    IMG_MODELS.find(
      (m) => m.id === n || m.name.toLowerCase() === n || m.aliases.includes(n),
    ) || IMG_MODELS.find((m) => m.aliases.some((a) => n.includes(a)))
  );
}

async function requestImageGeneration(imgModel, opts, prompt, signal) {
  const s = state.settings;
  const key = s.proxyKey.trim();
  if (!key) throw new Error("Не указан ключ ProxyAPI");
  const o = opts || {};
  const body = {
    model: imgModel.id,
    modalities: ["image"],
    messages: [{ role: "user", content: prompt }],
  };
  if (imgModel.id.indexOf("riverflow") !== -1) {
    body.aspect_ratio = o.ratio || "auto";
    body.output_format = "png";
    body.background = o.background || "auto";
    if (o.resolution && imgModel.supportsResolution)
      body.resolution = o.resolution;
  } else if (o.ratio) {
    // FLUX и другие chat-модели тоже принимают aspect_ratio
    body.aspect_ratio = o.ratio;
  }
  const referer =
    location && location.origin && !location.origin.startsWith("file")
      ? location.origin
      : "https://moonsss.app";
  let resp;
  try {
    resp = await fetch(
      "https://api.proxyapi.ru/openrouter/v1/chat/completions",
      {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + key,
          "HTTP-Referer": referer,
          "X-Title": "MoonSSS",
        },
        body: JSON.stringify(body),
      },
    );
  } catch (e) {
    if (signal && signal.aborted) throw e;
    throw new Error(
      "Не удалось связаться с ProxyAPI (" +
        ((e && e.message) || "network") +
        ")",
    );
  }
  if (!resp.ok) await parseError(resp);
  let data = null;
  try {
    data = await resp.json();
  } catch (e) {}
  if (!data) throw new Error("Пустой ответ от API генерации");
  const msg = data.choices && data.choices[0] && data.choices[0].message;
  let url = null;
  if (
    msg &&
    msg.images &&
    msg.images[0] &&
    msg.images[0].image_url &&
    msg.images[0].image_url.url
  ) {
    url = msg.images[0].image_url.url;
  } else {
    const alt = (data.data || data.images || [])[0];
    if (alt && alt.b64_json)
      url = "data:" + (alt.mime || "image/png") + ";base64," + alt.b64_json;
    else if (alt && alt.url) url = alt.url;
  }
  if (!url) {
    const c = msg && msg.content;
    if (typeof c === "string" && c.trim())
      throw new Error(
        "Модель вернула текст вместо изображения: " + c.trim().slice(0, 140),
      );
    throw new Error("Модель не вернула изображение");
  }
  if (url.indexOf("data:") === 0) return url;
  const rr = await fetch(url, { signal });
  if (!rr.ok)
    throw new Error("Не удалось загрузить изображение (" + rr.status + ")");
  const blob = await rr.blob();
  return await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("FileReader"));
    r.readAsDataURL(blob);
  });
}

function downloadDataUrl(dataUrl, label) {
  const a = document.createElement("a");
  a.href = dataUrl;
  const ext =
    dataUrl.indexOf("image/jpeg") !== -1
      ? "jpg"
      : dataUrl.indexOf("image/webp") !== -1
        ? "webp"
        : "png";
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  a.download =
    "MoonSSS_" +
    String(label || "image").replace(/[^\w\d-]+/gi, "-") +
    "_" +
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds()) +
    "." +
    ext;
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast("Скачивание началось", "ok");
}

function copyImageDataUrl(dataUrl) {
  try {
    if (
      !window.ClipboardItem ||
      !navigator.clipboard ||
      !navigator.clipboard.write
    )
      throw new Error("no-clipboard");
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas");
      c.width = im.naturalWidth;
      c.height = im.naturalHeight;
      c.getContext("2d").drawImage(im, 0, 0);
      c.toBlob(async (b) => {
        if (!b) {
          toast("Не удалось скопировать изображение", "err");
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": b }),
          ]);
          toast("Изображение скопировано в буфер", "ok");
        } catch (err) {
          toast("Не удалось скопировать изображение", "err");
        }
      }, "image/png");
    };
    im.onerror = () => toast("Не удалось скопировать изображение", "err");
    im.src = dataUrl;
  } catch (e) {
    toast("Буфер обмена для изображений недоступен", "err");
  }
}

/* ============================================================
АГЕНТНЫЙ ВЕБ-ПОИСК В ПРОЦЕССЕ ОТВЕТА
Модель сама запрашивает поиск командой {web-search: [...]}
============================================================ */
function getWsLimit() {
  const v = parseInt(
    state.settings.webSearchCfg?.openrouter?.limit || state.settings.wsLimit,
    10,
  );
  if (isNaN(v)) return 4;
  return Math.max(4, Math.min(12, v));
}
function buildWebSearchInstructions(model) {
  // Единая агентная инструкция для всех провайдеров: нативные инструменты
  // (Anthropic/Gemini/OpenAI) остаются дополнением, команда {web-search: [...]} — основной контур
  const limit = getWsLimit();
  return [
    "=== ИНСТРУМЕНТ: ВЕБ-ПОИСК В ПРОЦЕССЕ ОТВЕТА (web-search) ===",
    "Если для точного, актуального или проверяемого ответа тебе нужны свежие данные из интернета (факты, статистика, новости, цены, документация, актуальные версии библиотек, популярные тренды и т.п.), ты ОБЯЗАН выполнить поиск прямо во время ответа, даже если у тебя уже есть какие-то предварительные данные.",
    "",
    "Твоя ЕДИНСТВЕННАЯ команда для поиска:",
    '{web-search: ["запрос 1", "запрос 2"]}',
    "",
    "Как это работает:",
    "- Как только ты напишешь команду, генерация приостановится, система выполнит поиск по всем запросам в скобках и вернёт тебе реальные результаты со ссылками на источники.",
    "- После этого продолжай ответ ровно с того места, где остановился, опираясь на полученные данные и делая выводы.",
    "- Если нужно уточнить ещё что-то, выполни ещё один поиск. За один ответ доступно до " +
      limit +
      " поисков.",
    "- Когда информации достаточно для полного ответа, заверши ответ без команды.",
    "",
    "Важные правила:",
    "- Формулируй запросы конкретно; для технических тем обычно лучше английский.",
    "- В одном поиске можно передать сразу несколько запросов в квадратных скобках.",
    "- Не упоминай саму команду и механизм поиска в ответе — пользователь видит результаты поиска отдельно. Сосредоточься на задаче.",
    "- Используй поиск когда он реально повышает качество ответа; не ищи то, что достоверно знаешь.",
    "- КРИТИЧНО: НИКОГДА не используй маркеры вроде [[WS:0]], [[WS:1]] и т.д. — это служебные метки системы, а не команды для тебя. Если ты выведешь такой маркер, поиск НЕ сработает. Твоя единственная команда — {web-search: [...]}.",
    '- НЕ выдумывай результаты поиска и не имитируй их. Если ты не вызвал команду {web-search: [...]}, значит поиска не было — не пиши, что "я поискал в интернете".',
    "=== КОНЕЦ ИНСТРУМЕНТА ===",
  ].join("\n");
}
const WS_CMD_RE = /\{web-search\s*:\s*\[([\s\S]*?)\]\s*\}/i;
function detectWebSearchCommand(text) {
  const m = String(text || "").match(WS_CMD_RE);
  if (!m) return null;
  const inner = m[1];
  let queries = [];
  try {
    const arr = JSON.parse("[" + inner + "]");
    queries = arr.filter((x) => typeof x === "string" && x.trim());
  } catch (e) {
    const qre = /"([^"]*)"|'([^']*)'/g;
    let qm;
    while ((qm = qre.exec(inner)) !== null) {
      const q = (qm[1] !== undefined ? qm[1] : qm[2]).trim();
      if (q) queries.push(q);
    }
  }
  if (!queries.length) return null;
  return { raw: m[0], queries };
}
function stripWsCommands(text) {
  return String(text || "").replace(
    /\{web-search\s*:\s*\[[\s\S]*?\]\s*\}/gi,
    "",
  );
}
/* IMG_STOP_WORDS, cleanImageQuery, shouldAttachImages,
   fetchOpenverseImages, fetchCommonsImages, fetchWebImages —
   НЕ ProxyAPI (Openverse, Wikimedia Commons). В ai.html. */

/* Перевод запроса на английский (gpt-5.4-nano, ~копейки) —
кратно повышает попадание и в Openverse, и в Commons.
Эта функция использует ProxyAPI, поэтому остаётся здесь. */
async function translateImageQuery(q, signal) {
  const key = state.settings.proxyKey.trim();
  if (!key) return null;
  try {
    const resp = await fetch(
      "https://api.proxyapi.ru/openai/v1/chat/completions",
      {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + key,
        },
        body: JSON.stringify({
          model: "gpt-5.4-nano",
          max_completion_tokens: 120,
          reasoning_effort: "low",
          messages: [
            {
              role: "user",
              content:
                "Translate the search query into 2-6 English keywords for image search. Reply with keywords only, no punctuation, no explanations.\nQuery: " +
                String(q || "").slice(0, 120),
            },
          ],
        }),
      },
    );
    if (!resp.ok) return null;
    const j = await resp.json();
    const t = (
      (j.choices &&
        j.choices[0] &&
        j.choices[0].message &&
        j.choices[0].message.content) ||
      ""
    ).trim();
    return t && t.length < 140 ? t : null;
  } catch (e) {
    return null;
  }
}

/* Wikimedia Commons — запасной источник */
async function fetchCommonsImages(query, signal) {
  try {
    const p = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrsearch: String(query || "").slice(0, 120) + " filetype:bitmap",
      gsrnamespace: "6",
      gsrlimit: "8",
      prop: "imageinfo",
      iiprop: "url|mime",
      iiurlwidth: "480",
    });
    const resp = await fetch(
      "https://commons.wikimedia.org/w/api.php?" + p.toString(),
      { signal },
    );
    if (!resp.ok) return [];
    const j = await resp.json();
    const pages = j && j.query && j.query.pages;
    if (!pages) return [];
    return Object.values(pages)
      .sort((a, b) => (a.index || 0) - (b.index || 0))
      .map((pg) => {
        const ii = pg.imageinfo && pg.imageinfo[0];
        if (!ii || (ii.mime && ii.mime.indexOf("image/") !== 0)) return null;
        return {
          thumb: ii.thumburl || ii.url,
          full: ii.url,
          title: String(pg.title || "").replace(/^File:/, ""),
        };
      })
      .filter(Boolean)
      .slice(0, 4);
  } catch (e) {
    return [];
  }
}

/* Оркестратор: Openverse (EN + оригинал) → Commons; дедупликация, до 6 штук.
Эта функция вызывает fetchOpenverseImages, который должен быть определен в ai.html */
async function fetchWebImages(query, signal) {
  const out = [];
  const seen = new Set();
  const push = (arr) =>
    (arr || []).forEach((it) => {
      const k = it.full || it.thumb;
      if (k && !seen.has(k)) {
        seen.add(k);
        out.push(it);
      }
    });
  const ovOrigP = fetchOpenverseImages(query, signal);
  const en = await translateImageQuery(query, signal).catch(() => null);
  const hasEn = !!en && en.toLowerCase() !== String(query || "").toLowerCase();
  const [ovOrig, ovEn, cmEn] = await Promise.all([
    ovOrigP,
    hasEn
      ? fetchOpenverseImages(en, signal).catch(() => [])
      : Promise.resolve([]),
    hasEn
      ? fetchCommonsImages(en, signal).catch(() => [])
      : Promise.resolve([]),
  ]);
  push(ovEn);
  push(ovOrig);
  push(cmEn);
  if (out.length < 2)
    push(await fetchCommonsImages(query, signal).catch(() => []));
  return out.slice(0, 6);
}
async function performWebSearches(queries, signal) {
  const seen = new Set();
  const all = [];
  const qs = (queries || []).slice(0, 5);
  const results = await Promise.all(
    qs.map((q) => performWebSearch(q, signal).catch(() => null)),
  );
  for (const r of results) {
    if (r && Array.isArray(r.sources)) {
      for (const s of r.sources) {
        if (!s || !s.uri || seen.has(s.uri)) continue;
        try {
          const p = new URL(s.uri);
          if (p.protocol !== "http:" && p.protocol !== "https:") continue;
        } catch (e) {
          continue;
        }
        seen.add(s.uri);
        all.push(s);
      }
    }
  }
  return { sources: all };
}
function formatSearchResults(results, queries, used, max) {
  const srcs = (results.sources || [])
    .map(
      (s, i) =>
        i +
        1 +
        ". " +
        (s.title || s.uri) +
        "\n   Источник: " +
        (domainHost(s.uri) || s.uri) +
        "\n   " +
        (s.snippet || ""),
    )
    .join("\n");
  const remaining = max - used;
  const tail =
    remaining > 0
      ? "Если этих данных недостаточно, ты можешь выполнить ещё " +
        remaining +
        " поиск(ов) командой {web-search: [...]}. Когда информации хватит — заверши ответ без команды."
      : "Лимит поисков исчерпан. Заверши ответ, опираясь на имеющиеся данные, без новых команд поиска.";
  return (
    "РЕЗУЛЬТАТЫ ВЕБ-ПОИСКА по запросам: " +
    queries.join("; ") +
    "\n\n" +
    (srcs || "(источники не найдены)") +
    "\n\n" +
    tail +
    "\n\nПродолжи свой ответ с того места, где остановился."
  );
}

/* --- Предварительный веб-поиск (Grounding) --- */
let searchWorkerBroken = false; // запоминаем до перезагрузки страницы
async function performWebSearch(query, signal) {
  const s = state.settings;
  const key = s.proxyKey.trim();
  if (!key || searchWorkerBroken) return null;
  const referer =
    location && location.origin && !location.origin.startsWith("file")
      ? location.origin
      : "https://moonsss.app";
  try {
    // Используем современный Responses API с инструментом web_search
    const resp = await fetch("https://api.proxyapi.ru/openai/v1/responses", {
      method: "POST",
      signal: signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key,
        "HTTP-Referer": referer,
        "X-Title": "MoonSSS",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: query,
        tools: [
          {
            type: "web_search",
            search_context_size: "low",
            user_location: {
              type: "approximate",
              country: "RU",
              city: "Moscow",
              region: "Moscow",
            },
          },
        ],
      }),
    });
    if (!resp.ok) {
      if (resp.status === 400 || resp.status === 403 || resp.status === 404)
        searchWorkerBroken = true;
      return null;
    }
    const data = await resp.json();
    // Извлекаем текст ответа из output
    let result = "";
    const sources = [];
    const seenUris = new Set();
    if (data.output && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.type === "message" && item.content) {
          for (const part of item.content) {
            if (part.type === "output_text") result += part.text;
            if (part.type === "output_text" && part.annotations) {
              for (const ann of part.annotations) {
                if (ann.type === "url_citation") {
                  const uri = ann.url || "";
                  if (uri && !seenUris.has(uri)) {
                    seenUris.add(uri);
                    sources.push({
                      uri,
                      title: ann.title || uri,
                      snippet: ann.snippet || "",
                    });
                  }
                }
              }
            }
          }
        }
        // Web search results могут быть отдельными items
        if (item.type === "web_search_call" && item.action?.query) {
          // Логируем поисковые запросы
        }
      }
    }
    return { result: result.trim(), sources };
  } catch (e) {
    // AbortError — ожидаемая ситуация (пользователь нажал «Стоп» или
    // цикл прервал поток ради агентного поиска). Не логируем как ошибку.
    if (e && (e.name === "AbortError" || e.code === 20)) return null;
    console.warn("Web search preprocessing failed:", e);
    return null;
  }
}

/* --- OpenRouter через ProxyAPI (оплата ключом ProxyAPI) --- */
async function streamOpenRouter(model, history, cb, aiMsg) {
  const s = state.settings;
  const direct = cb.direct;
  const isOpenAIModel = model.id.startsWith("openai/");
  let url, key, actualModel;
  if (direct) {
    url = "https://openrouter.ai/api/v1/chat/completions";
    key = s.orKey.trim();
    actualModel = model.id;
  } else if (isOpenAIModel) {
    // ProxyAPI ведёт модели OpenAI отдельно: через OpenRouter они недоступны.
    // Используем прямой эндпоинт OpenAI и "чистый" id без префикса
    url = "https://api.proxyapi.ru/openai/v1/chat/completions";
    key = s.proxyKey.trim();
    actualModel = model.id.replace(/^openai\//, "");
    // Chat Completions у OpenAI НЕ возвращает текст размышлений (только счётчик в usage).
    // Видимые размышления + encrypted_content для многоходовости даёт только Responses API.
    // Исключение — gpt-4o search-preview: у него свой контур веб-поиска без reasoning.
    // Для всех reasoning-моделей OpenAI (gpt-5.6-*, gpt-5-nano, o-серия) ВСЕГДА используем Responses API.
    const isSearchPreview =
      /^gpt-4o/.test(actualModel) && cb.wsEnabled && !cb.webSearchContext;
    if (!isSearchPreview) {
      return streamOpenAIResponses(model, history, cb, aiMsg);
    }
  } else {
    url = "https://api.proxyapi.ru/openrouter/v1/chat/completions";
    key = s.proxyKey.trim();
    actualModel = model.id;
  }

  // Build messages with web search context if available
  let msgs = [];
  {
    // Standard OpenRouter mode with full history
    const rawMsgs = [];
    const sysText = getSystemPromptText(model);
    if (sysText) rawMsgs.push({ role: "system", content: sysText });
    for (const m of history) {
      if (m.role === "user") {
        const imgs = (m.attachments || []).filter((a) => a.kind === "image");
        const txt = textWithFiles(m) || " ";
        if (imgs.length) {
          rawMsgs.push({
            role: "user",
            content: [
              { type: "text", text: txt },
              ...imgs.map((im) => ({
                type: "image_url",
                image_url: { url: im.dataUrl },
              })),
            ],
          });
        } else {
          rawMsgs.push({ role: "user", content: txt });
        }
      } else {
        // Standard assistant message
        // ВАЖНО: передаём reasoning_details обратно в API (pass back unmodified),
        // чтобы модель могла продолжить цепочку размышлений с того же места
        const assistantMsg = { role: "assistant", content: m.content || " " };
        if (
          Array.isArray(m.reasoning_details) &&
          m.reasoning_details.length > 0
        ) {
          assistantMsg.reasoning_details = m.reasoning_details;
        }
        // Передача encrypted_content для reasoning-моделей OpenAI (для Chat Completions fallback)
        if (m.encrypted_content) {
          assistantMsg.encrypted_content = m.encrypted_content;
        }
        // Передача openai_reasoning для OpenRouter-проксирования OpenAI моделей
        if (Array.isArray(m.openai_reasoning)) {
          assistantMsg.openai_reasoning = m.openai_reasoning;
        }
        rawMsgs.push(assistantMsg);
      }
    }

    // Merge consecutive same-role messages
    for (const msg of rawMsgs) {
      if (msgs.length > 0 && msgs[msgs.length - 1].role === msg.role) {
        const last = msgs[msgs.length - 1];
        if (
          typeof last.content === "string" &&
          typeof msg.content === "string"
        ) {
          last.content = (last.content + "\n\n" + msg.content).trim();
        } else if (Array.isArray(last.content) && Array.isArray(msg.content)) {
          last.content = [...last.content, ...msg.content];
        } else {
          msgs.push(msg);
        }
      } else {
        msgs.push(msg);
      }
    }
  }

  let isSearchPreviewModel = actualModel.includes("search-preview");
  // Build request body: основной поток всегда стримит,
  // веб-поиск выполняется отдельно в performWebSearch (Grounding)
  // Исключение: search-preview модели OpenAI не поддерживают SSE-стриминг
  const body = {
    model: actualModel,
    messages: msgs,
    stream: !isSearchPreviewModel,
  };
  if (isSearchPreviewModel) {
    delete body.max_completion_tokens;
    delete body.temperature;
    delete body.reasoning_effort;
    // Search-preview модели имеют ограниченный набор параметров
    body.web_search_options = {
      search_context_size: "low",
      user_location: {
        type: "approximate",
        approximate: { country: "RU", city: "Moscow", region: "Moscow" },
      },
    };
  } else if (isOpenAIModel && !direct) {
    // Нативный протокол OpenAI: gpt-5 принимает max_completion_tokens,
    // уровень размышлений задаётся через reasoning_effort (low/medium/high/xhigh/max)
    const supportsSearchPreview = /^gpt-4o/.test(actualModel);
    if (cb.wsEnabled && !cb.webSearchContext && supportsSearchPreview) {
      const wsCfg = s.webSearchCfg?.openai || {};
      // Search-preview: нет SSE-стриминга и reasoning-параметров
      actualModel += "-search-preview";
      isSearchPreviewModel = true;
      body.model = actualModel;
      body.stream = false;
      delete body.max_completion_tokens;
      delete body.temperature;
      delete body.reasoning_effort;
      body.web_search_options = {
        search_context_size: wsCfg.context_size || "medium",
        user_location: {
          type: "approximate",
          approximate: {
            country: wsCfg.country || "RU",
            city: wsCfg.city || "Moscow",
            region: wsCfg.region || "Moscow",
          },
        },
      };
    } else {
      body.max_completion_tokens = 4096;
      body.temperature = 1;
      if (s.reasoning !== "off" && s.reasoning !== "not-supported") {
        const effortMap = { mid: "medium", xhigh: "high", max: "high" };
        body.reasoning_effort = effortMap[s.reasoning] || s.reasoning;
      }
    }
  } else {
    // Протокол OpenRouter (прямой ключ или не-OpenAI модели через ProxyAPI)
    body.max_tokens = 4096;
    body.temperature = 1;
    const isOpenRouterModel =
      direct ||
      model.id.startsWith("openrouter/") ||
      model.id.startsWith("qwen/") ||
      model.provider === "OpenRouter";
    if (isOpenRouterModel || model.reasoning) {
      if (s.reasoning === "off" || s.reasoning === "not-supported") {
        body.reasoning = { enabled: false };
      } else {
        const effort = s.reasoning === "mid" ? "medium" : s.reasoning;
        // Явно включаем reasoning и передаём уровень effort для OpenRouter
        body.reasoning = { enabled: true, effort };
      }
    }
  }

  const fetchPromise = fetch(url, {
    method: "POST",
    signal: cb.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + key,
      "HTTP-Referer":
        window.location &&
        window.location.origin &&
        !window.location.origin.startsWith("file:") &&
        !window.location.origin.includes("localhost")
          ? window.location.origin
          : "https://moonsss.app",
      "X-Title": "MoonSSS",
    },
    body: JSON.stringify(body),
  });

  let timedOut = false,
    timeoutId = null;
  const timeoutError = () =>
    new Error(
      "Превышено время ожидания ответа от сервера (Timeout). Проверьте интернет-соединение или ключ.",
    );
  const armTimeout = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timedOut = true;
      try {
        cb.signal && cb.signal.abort();
      } catch (e) {}
    }, 120000);
  };
  armTimeout();
  let resp;
  try {
    resp = await fetchPromise;
  } catch (err) {
    clearTimeout(timeoutId);
    if (timedOut) throw timeoutError();
    throw err;
  }
  armTimeout(); // заголовки получены: перезапуск таймера до первого чанка
  if (!resp.ok) {
    clearTimeout(timeoutId);
    await parseError(resp);
  }

  // Обработка non-streaming ответа для search-preview моделей
  if (isSearchPreviewModel) {
    let j;
    try {
      j = await resp.json();
    } catch (err) {
      clearTimeout(timeoutId);
      if (timedOut) throw timeoutError();
      throw err;
    }
    clearTimeout(timeoutId);
    if (j.error) {
      const errStr =
        typeof j.error === "string"
          ? j.error
          : j.error.message || JSON.stringify(j.error);
      throw new Error(errStr);
    }
    const ch = j.choices && j.choices[0];
    if (ch) {
      const msg = ch.message || {};
      if (typeof msg.content === "string" && msg.content)
        cb.onText(msg.content);
      const annotations = msg.annotations;
      if (Array.isArray(annotations) && annotations.length) {
        const sources = [];
        const seenUris = new Set();
        annotations.forEach((a) => {
          const uc = a.url_citation || {};
          const uri = uc.url || a.url || a.url_encoded || "";
          if (uri && !seenUris.has(uri)) {
            seenUris.add(uri);
            sources.push({
              uri,
              title: uc.title || a.title || uri,
              snippet: uc.snippet || a.snippet || "",
            });
          }
        });
        if (sources.length) cb.onWebSearch({ queries: [], sources });
      }
    }
    return;
  }

  // Track collected web search sources to emit once (for standard streaming)
  const collectedSources = [];
  const seenUris = new Set();
  try {
    await readSSE(resp, (payload) => {
      armTimeout(); // каждый полученный чанк сбрасывает таймер 120 сек
      if (payload === "[DONE]") return;
      let j;
      try {
        j = JSON.parse(payload);
      } catch (e) {
        return;
      }
      if (j.error) {
        const errStr =
          typeof j.error === "string"
            ? j.error
            : j.error.message || JSON.stringify(j.error);
        throw new Error(errStr);
      }
      const ch = j.choices && j.choices[0];
      if (!ch) return;
      const d = ch.delta || {};

      // Standard text
      if (typeof d.content === "string" && d.content) cb.onText(d.content);

      // Reasoning tokens (OpenRouter style)
      const r = d.reasoning ?? d.reasoning_content;
      if (typeof r === "string" && r) cb.onThink(r);
      if (d.reasoning_details && cb.onReasoningDetails)
        cb.onReasoningDetails(d.reasoning_details);
      // Images (OpenRouter)
      const im = (ch.message && ch.message.images) || d.images;
      if (Array.isArray(im))
        im.forEach((x) => {
          const u = x?.image_url?.url || x?.url;
          if (u) cb.onImage(u);
        });
      // Сохранение encrypted_content для reasoning-моделей OpenAI (GPT-5, o3, o4-mini)
      // Это поле содержит зашифрованный reasoning-контекст для передачи между ходами
      if (ch.finish_reason && ch.message && ch.message.encrypted_content) {
        if (aiMsg) aiMsg.encrypted_content = ch.message.encrypted_content;
      }

      // Web search annotations (OpenAI search-preview)
      // Can appear in delta or in final message
      const msgAnnotations = ch.message && ch.message.annotations;
      const deltaAnnotations = d.annotations;
      const annotations = deltaAnnotations || msgAnnotations;
      if (Array.isArray(annotations)) {
        annotations.forEach((a) => {
          const uc = a.url_citation || {};
          const uri = uc.url || a.url || a.url_encoded || "";
          if (uri && !seenUris.has(uri)) {
            seenUris.add(uri);
            collectedSources.push({
              uri,
              title: uc.title || a.title || uri,
              snippet: uc.snippet || a.snippet || "",
            });
          }
        });
      }

      // Emit web search results on final chunk (finish_reason present)
      if (ch.finish_reason && collectedSources.length) {
        cb.onWebSearch({ queries: [], sources: collectedSources });
      }
    });

    // Final emit if stream ended without finish_reason but we have sources
    if (collectedSources.length) {
      cb.onWebSearch({ queries: [], sources: collectedSources });
    }
  } catch (err) {
    if (timedOut) throw timeoutError();
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/* --- OpenAI Responses API (нативный ProxyAPI) ---
Chat Completions не возвращает reasoning-текст вообще. Responses API с
reasoning.summary стримит видимые размышления (событие
response.reasoning_summary_text.delta), а reasoning-элементы с
encrypted_content сохраняются и возвращаются в input следующего хода —
модель продолжает цепочку и попадает в кэш (40–80% экономии по документации). */
async function streamOpenAIResponses(model, history, cb, aiMsg) {
  const s = state.settings;
  const key = s.proxyKey.trim();
  const actualModel = model.id.replace(/^openai\//, "");
  const input = [];
  const sysText = getSystemPromptText(model);
  if (sysText) input.push({ role: "system", content: sysText });
  for (const m of history) {
    if (m.role === "user") {
      const imgs = (m.attachments || []).filter((a) => a.kind === "image");
      const txt = textWithFiles(m) || " ";
      if (imgs.length) {
        input.push({
          role: "user",
          content: [
            { type: "input_text", text: txt },
            ...imgs.map((im) => ({
              type: "input_image",
              image_url: im.dataUrl,
              detail: "auto",
            })),
          ],
        });
      } else {
        input.push({ role: "user", content: txt });
      }
    } else {
      // ВАЖНО: Возвращаем reasoning-элементы ДО assistant-сообщения — цепочка продолжается
      // Это позволяет модели продолжать рассуждения с того же места и попадать в кэш (40-80% экономии)
      if (Array.isArray(m.openai_reasoning)) {
        m.openai_reasoning.forEach((it) => {
          if (it && it.encrypted_content) {
            input.push({
              type: "reasoning",
              encrypted_content: it.encrypted_content,
            });
          }
        });
      }
      input.push({ role: "assistant", content: m.content || " " });
    }
  }
  const effortMap = {
    minimal: "minimal",
    low: "low",
    medium: "medium",
    mid: "medium",
    high: "high",
    xhigh: "high",
    max: "high",
  };
  const body = {
    model: actualModel,
    input,
    stream: true,
    max_output_tokens: 8192,
    temperature: 1,
  };
  if (s.reasoning !== "off" && s.reasoning !== "not-supported") {
    body.reasoning = {
      effort: effortMap[s.reasoning] || "medium",
      summary: "auto",
    };
  }
  const fetchPromise = fetch("https://api.proxyapi.ru/openai/v1/responses", {
    method: "POST",
    signal: cb.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + key,
      "HTTP-Referer":
        window.location &&
        window.location.origin &&
        !window.location.origin.startsWith("file:") &&
        !window.location.origin.includes("localhost")
          ? window.location.origin
          : "https://moonsss.app",
      "X-Title": "MoonSSS",
    },
    body: JSON.stringify(body),
  });
  let timedOut = false,
    timeoutId = null;
  const timeoutError = () =>
    new Error(
      "Превышено время ожидания ответа от OpenAI (Timeout). Проверьте интернет-соединение или ключ.",
    );
  const armTimeout = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timedOut = true;
      try {
        cb.signal && cb.signal.abort();
      } catch (e) {}
    }, 120000);
  };
  armTimeout();
  let resp;
  try {
    resp = await fetchPromise;
  } catch (err) {
    clearTimeout(timeoutId);
    if (timedOut) throw timeoutError();
    throw err;
  }
  armTimeout();
  if (!resp.ok) {
    clearTimeout(timeoutId);
    await parseError(resp);
  }
  const collectedSources = [];
  const seenUris = new Set();
  try {
    await readSSE(resp, (payload) => {
      armTimeout();
      let j;
      try {
        j = JSON.parse(payload);
      } catch (e) {
        return;
      }
      const t = j.type || "";
      if (t === "error")
        throw new Error(
          j.message ||
            (j.error && j.error.message) ||
            "Ошибка OpenAI Responses",
        );
      if (
        t === "response.output_text.delta" &&
        typeof j.delta === "string" &&
        j.delta
      )
        cb.onText(j.delta);
      if (
        t === "response.reasoning_summary_text.delta" &&
        typeof j.delta === "string" &&
        j.delta
      )
        cb.onThink(j.delta);
      // Сохраняем reasoning-блоки по мере их завершения (для многоходовости)
      if (t === "response.output_item.done" && j.item) {
        if (j.item.type === "message" && Array.isArray(j.item.content)) {
          j.item.content.forEach((c) =>
            (c.annotations || []).forEach((a) => {
              const uc = a.url_citation || {};
              const uri = uc.url || a.url || "";
              if (uri && !seenUris.has(uri)) {
                seenUris.add(uri);
                collectedSources.push({
                  uri,
                  title: uc.title || a.title || uri,
                  snippet: uc.snippet || a.snippet || "",
                });
              }
            }),
          );
        }
        // Сохраняем encrypted_content из reasoning-элементов для продолжения цепочки
        if (j.item.type === "reasoning" && j.item.encrypted_content && aiMsg) {
          if (!aiMsg.openai_reasoning) aiMsg.openai_reasoning = [];
          aiMsg.openai_reasoning.push({
            type: "reasoning",
            encrypted_content: j.item.encrypted_content,
          });
        }
      }
      if (t === "response.completed" && j.response) {
        if (j.response.id && aiMsg) aiMsg.openai_response_id = j.response.id;
        // Финальное сохранение всех reasoning-элементов (страховка)
        if (aiMsg && Array.isArray(j.response.output)) {
          const rItems = j.response.output.filter(
            (it) => it && it.type === "reasoning" && it.encrypted_content,
          );
          if (rItems.length) {
            aiMsg.openai_reasoning = rItems.map((it) => ({
              type: "reasoning",
              encrypted_content: it.encrypted_content,
            }));
          }
        }
      }
    });
    if (collectedSources.length)
      cb.onWebSearch({ queries: [], sources: collectedSources });
  } catch (err) {
    if (timedOut) throw timeoutError();
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
/* --- Anthropic (нативный ProxyAPI) --- */
async function streamAnthropic(model, history, cb, aiMsg) {
  const s = state.settings;
  const msgs = [];
  for (const m of history) {
    if (m.role === "user") {
      const parts = [];
      (m.attachments || [])
        .filter((a) => a.kind === "image")
        .forEach((im) => {
          const b64 = im.dataUrl.split(",")[1] || "";
          parts.push({
            type: "image",
            source: {
              type: "base64",
              media_type: im.mime || "image/jpeg",
              data: b64,
            },
          });
        });
      parts.push({ type: "text", text: textWithFiles(m) || " " });
      msgs.push({ role: "user", content: parts });
    } else {
      // ВАЖНО: Anthropic требует thinking-блоки ВНУТРИ content (байт-в-байт с signature),
      // а не в отдельном поле сообщения — иначе верификация цепочки и продолжение
      // размышлений в многоходовом диалоге отваливаются (Invalid signature in thinking block)
      const contentBlocks = [];
      (m.thinking_blocks || []).forEach((tb) => {
        if (tb && typeof tb.thinking === "string" && tb.thinking.length) {
          contentBlocks.push({
            type: "thinking",
            thinking: tb.thinking,
            signature: tb.signature || "",
          });
        }
      });
      contentBlocks.push({ type: "text", text: m.content || "" });
      msgs.push({ role: "assistant", content: contentBlocks });
    }
  }
  const body = {
    model: model.native || model.id,
    stream: true,
    messages: msgs,
  };
  const isClaude5 =
    model.native &&
    (model.native.includes("opus-5") ||
      model.native.includes("sonnet-5") ||
      model.native.includes("claude-5"));
  if (
    model.reasoning &&
    s.reasoning !== "off" &&
    s.reasoning !== "not-supported"
  ) {
    if (isClaude5) {
      // Claude 5 (Opus 5 / Sonnet 5): Anthropic требует новый adaptive-протокол.
      // Поддерживаемые значения effort: 'low' | 'medium' | 'high'.
      // xhigh/max/maximal маппим в 'high' — это максимум, что принимает API.
      const effortMap = {
        minimal: "low",
        low: "low",
        medium: "medium",
        mid: "medium",
        high: "high",
        xhigh: "high",
        max: "high",
      };
      body.thinking = { type: "adaptive" };
      body.output_config = { effort: effortMap[s.reasoning] || "medium" };
      body.temperature = 1;
      body.max_tokens = 16384;
    } else {
      // Claude 3.7 / 4: классический extended thinking с явным бюджетом токенов.
      // Это необходимо для передачи thinking-блоков с подписью (signature)
      // обратно в следующем ходе — без этого Anthropic возвращает
      // "Invalid signature in thinking block" и качество reasoning падает.
      const budget = THINK_BUDGET[s.reasoning] || 4096;
      body.thinking = { type: "enabled", budget_tokens: budget };
      body.temperature = 1;
      body.max_tokens = budget + 8192;
    }
  } else {
    body.temperature = 1;
    body.max_tokens = 8192;
  }
  if (cb.wsEnabled && !cb.webSearchContext) {
    // Нативный веб-поиск Anthropic с полной конфигурацией из настроек
    const wsCfg = s.webSearchCfg?.anthropic || {};
    const webSearchTool = {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: wsCfg.max_uses || 5,
    };

    // Добавляем фильтрацию доменов если указана
    if (wsCfg.allowed_domains && wsCfg.allowed_domains.trim()) {
      webSearchTool.allowed_domains = wsCfg.allowed_domains
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d);
    }
    if (wsCfg.blocked_domains && wsCfg.blocked_domains.trim()) {
      webSearchTool.blocked_domains = wsCfg.blocked_domains
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d);
    }

    // Добавляем локализацию если указана
    if (wsCfg.city || wsCfg.country || wsCfg.region || wsCfg.timezone) {
      webSearchTool.user_location = {
        type: "approximate",
        country: wsCfg.country || "RU",
        city: wsCfg.city || "Moscow",
        region: wsCfg.region || "Moscow",
        timezone: wsCfg.timezone || "Europe/Moscow",
      };
    }

    body.tools = [webSearchTool];
  }
  // Формируем system prompt с учётом webSearchContext + инструмента генерации изображений
  let systemContent = getSystemPromptText(model);
  if (cb.webSearchContext && cb.webSearchContext.result) {
    const searchBlock = `
=== АКТУАЛЬНЫЕ РЕЗУЛЬТАТЫ ПОИСКА ИЗ ИНТЕРНЕТА (GROUNDING) ===
${cb.webSearchContext.result}
========================================================
Используй эти результаты для ответа. Ссылайся на источники, если это уместно.`;
    systemContent = systemContent
      ? systemContent + searchBlock
      : searchBlock.trim();
  }
  // Явное кэширование system prompt: Anthropic даёт 90% скидку на cache hit
  // Без cache_control провайдер кеширует по эвристикам — hit rate ниже
  if (systemContent) {
    body.system = [
      {
        type: "text",
        text: systemContent,
        cache_control: { type: "ephemeral" },
      },
    ];
  }
  const fetchPromise = fetch("https://api.proxyapi.ru/anthropic/v1/messages", {
    method: "POST",
    signal: cb.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + s.proxyKey.trim(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  let timedOut = false,
    timeoutId = null;
  const timeoutError = () =>
    new Error(
      "Превышено время ожидания ответа от Anthropic (Timeout). Проверьте интернет-соединение или ключ.",
    );
  const armTimeout = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timedOut = true;
      try {
        cb.signal && cb.signal.abort();
      } catch (e) {}
    }, 120000);
  };
  armTimeout();
  let resp;
  try {
    resp = await fetchPromise;
  } catch (err) {
    clearTimeout(timeoutId);
    if (timedOut) throw timeoutError();
    throw err;
  }
  armTimeout(); // заголовки получены: перезапуск таймера до первого чанка
  if (!resp.ok) {
    clearTimeout(timeoutId);
    await parseError(resp);
  }
  try {
    await readSSE(resp, (payload) => {
      armTimeout(); // каждый полученный чанк сбрасывает таймер 120 сек
      let j;
      try {
        j = JSON.parse(payload);
      } catch (e) {
        return;
      }
      if (j.type === "error")
        throw new Error(j.error?.message || "Ошибка Anthropic");
      if (j.type === "content_block_start") {
        const cb2 = j.content_block || {};
        if (cb2.type === "thinking") {
          if (!aiMsg.thinking_blocks) aiMsg.thinking_blocks = [];
          aiMsg.thinking_blocks.push({
            type: "thinking",
            thinking: "",
            signature: "",
          });
        }
        if (
          cb2.type === "web_search_tool_result" &&
          Array.isArray(cb2.content)
        ) {
          const sources = cb2.content
            .filter((r) => r && (r.type === "web_search_result" || r.url))
            .map((r) => ({
              uri: r.url || "",
              title: r.title || r.url || "Источник",
              page_age: r.page_age || "",
            }))
            .filter((s) => s.uri && s.uri.startsWith("http"));
          if (sources.length) cb.onWebSearch({ queries: [], sources });
        }
      }
      if (j.type === "content_block_delta") {
        const d = j.delta || {};
        if (d.type === "text_delta" && d.text) cb.onText(d.text);
        if (d.type === "thinking_delta" && d.thinking) {
          cb.onThink(d.thinking);
          if (aiMsg.thinking_blocks && aiMsg.thinking_blocks.length > 0) {
            aiMsg.thinking_blocks[aiMsg.thinking_blocks.length - 1].thinking +=
              d.thinking;
          }
        }
        if (d.type === "signature_delta" && d.signature) {
          if (aiMsg.thinking_blocks && aiMsg.thinking_blocks.length > 0) {
            aiMsg.thinking_blocks[aiMsg.thinking_blocks.length - 1].signature =
              d.signature;
          }
        }
      }
      if (j.type === "content_block_stop") {
        // Завершение блока — ничего дополнительного не делаем,
        // thinking_blocks уже накоплены через content_block_delta
      }
    });
  } catch (err) {
    if (timedOut) throw timeoutError();
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/* --- Gemini (нативный ProxyAPI) --- */
async function streamGemini(model, history, cb, aiMsg) {
  const s = state.settings;
  const contents = [];
  for (const m of history) {
    const parts = [];
    if (m.role === "user") {
      (m.attachments || [])
        .filter((a) => a.kind === "image")
        .forEach((im) => {
          parts.push({
            inlineData: {
              mimeType: im.mime || "image/jpeg",
              data: im.dataUrl.split(",")[1] || "",
            },
          });
        });
      parts.push({ text: textWithFiles(m) || " " });
      contents.push({ role: "user", parts });
    } else {
      const modelParts = [{ text: m.content || "" }];
      // ВАЖНО: передаём thought_signature обратно для сохранения контекста рассуждений
      if (
        Array.isArray(m.thought_signatures) &&
        m.thought_signatures.length > 0
      ) {
        modelParts.forEach((part, idx) => {
          if (m.thought_signatures[idx]) {
            part.thoughtSignature = m.thought_signatures[idx];
          }
        });
      }
      contents.push({ role: "model", parts: modelParts });
    }
  }
  const genCfg = { temperature: 1 };
  if (model.reasoning && s.reasoning !== "off") {
    genCfg.thinkingConfig = {
      thinkingBudget: THINK_BUDGET[s.reasoning] || 4096,
      includeThoughts: true,
    };
  }
  const body = { contents, generationConfig: genCfg };
  if (cb.wsEnabled && !cb.webSearchContext) body.tools = [{ googleSearch: {} }];
  // Формируем systemInstruction с учётом webSearchContext + инструмента генерации изображений
  let systemContent = getSystemPromptText(model);
  if (cb.webSearchContext && cb.webSearchContext.result) {
    const searchBlock = `\n\n=== АКТУАЛЬНЫЕ РЕЗУЛЬТАТЫ ПОИСКА ИЗ ИНТЕРНЕТА (GROUNDING) ===\n${cb.webSearchContext.result}\n========================================================\n\nИспользуй эти результаты для ответа. Ссылайся на источники, если это уместно.`;
    systemContent = systemContent
      ? systemContent + searchBlock
      : searchBlock.trim();
  }
  if (systemContent)
    body.systemInstruction = { parts: [{ text: systemContent }] };
  const url = `https://api.proxyapi.ru/google/v1beta/models/${model.native || model.id}:streamGenerateContent?alt=sse`;
  const fetchPromise = fetch(url, {
    method: "POST",
    signal: cb.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + s.proxyKey.trim(),
    },
    body: JSON.stringify(body),
  });

  let timedOut = false,
    timeoutId = null;
  const timeoutError = () =>
    new Error(
      "Превышено время ожидания ответа от Gemini (Timeout). Проверьте интернет-соединение или ключ.",
    );
  const armTimeout = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timedOut = true;
      try {
        cb.signal && cb.signal.abort();
      } catch (e) {}
    }, 120000);
  };
  armTimeout();
  let resp;
  try {
    resp = await fetchPromise;
  } catch (err) {
    clearTimeout(timeoutId);
    if (timedOut) throw timeoutError();
    throw err;
  }
  armTimeout(); // заголовки получены: перезапуск таймера до первого чанка
  if (!resp.ok) {
    clearTimeout(timeoutId);
    await parseError(resp);
  }
  try {
    await readSSE(resp, (payload) => {
      armTimeout(); // каждый полученный чанк сбрасывает таймер 120 сек
      let j;
      try {
        j = JSON.parse(payload);
      } catch (e) {
        return;
      }
      if (j.promptFeedback && j.promptFeedback.blockReason)
        throw new Error("Запрос заблокирован: " + j.promptFeedback.blockReason);
      const cand = j.candidates && j.candidates[0];
      if (!cand) return;
      if (cand.finishReason === "SAFETY")
        throw new Error("Ответ остановлен фильтрами безопасности");
      (cand.content?.parts || []).forEach((p) => {
        if (typeof p.text === "string") {
          if (p.thought) {
            cb.onThink(p.text);
            // Сохраняем thought_signature для многоходовых диалогов
            if (p.thoughtSignature && aiMsg) {
              if (!aiMsg.thought_signatures) aiMsg.thought_signatures = [];
              aiMsg.thought_signatures.push(p.thoughtSignature);
            }
          } else {
            cb.onText(p.text);
          }
        }
      });
      if (cand.groundingMetadata) {
        const gm = cand.groundingMetadata;
        const queries = gm.webSearchQueries || [];
        const sources = (gm.groundingChunks || [])
          .map((c) => ({
            uri: c.web?.uri || "",
            title: c.web?.title || c.web?.uri || "Источник",
          }))
          .filter((s) => s.uri);
        if (queries.length || sources.length)
          cb.onWebSearch({ queries, sources });
      }
    });
  } catch (err) {
    if (timedOut) throw timeoutError();
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
