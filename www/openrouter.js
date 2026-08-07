/* ============================================================
openrouter.js — прямое подключение к OpenRouter API
Работает только когда пользователь выбрал OpenRouter как
источник API и указал свой sk-or-… ключ.
SSE-стриминг, reasoning, tool_calls, image-generation.
============================================================ */
'use strict';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/* Парсер HTTP-ошибок OpenRouter — возвращает человекочитаемое сообщение */
async function parseOpenRouterError(resp){
  let msg = 'HTTP ' + resp.status;
  try {
    const j = await resp.json();
    msg = j.error?.message || j.message || j.error || msg;
  } catch(e){}
  if (resp.status === 401) return 'Неверный ключ OpenRouter (401). Проверьте sk-or-… в настройках.';
  if (resp.status === 402) return 'Недостаточно средств или кредитов на аккаунте OpenRouter.';
  if (resp.status === 403) return 'Модель недоступна для вашего ключа/региона (403).';
  if (resp.status === 404) return 'Модель не найдена на OpenRouter (404).';
  if (resp.status === 429) return 'Превышен rate-limit OpenRouter. Подождите или увеличьте лимиты.';
  if (resp.status >= 500) return 'Внутренняя ошибка OpenRouter (' + resp.status + '). Попробуйте позже.';
  return msg;
}

/* Формирование заголовков OpenRouter. Referer обязателен для ранжирования
   в публичных лидербордах и защиты от злоупотреблений ключом. */
function buildOpenRouterHeaders(apiKey){
  const referer = (location && location.origin && !location.origin.startsWith('file'))
    ? location.origin : 'https://moonsss.app';
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + apiKey,
    'HTTP-Referer': referer,
    'X-Title': 'MoonSSS'
  };
}

/* Преобразование настроек reasoning в формат OpenRouter.
   Разные вендоры называют уровни по-разному, приводим к общему виду:
   "effort" (low/medium/high) для Anthropic-подобных и "reasoning" для DeepSeek. */
function mapReasoningToOpenRouter(reasoningLevel, modelId){
  if (!reasoningLevel || reasoningLevel === 'off') return null;
  const isDeepSeek = /deepseek-r1|deepseek-r1-0528/i.test(modelId);
  const effortMap = {
    'minimal': 'low', 'low': 'low',
    'medium': 'medium', 'mid': 'medium',
    'high': 'high', 'xhigh': 'high', 'max': 'high', 'always': 'high'
  };
  const effort = effortMap[reasoningLevel] || 'medium';
  if (isDeepSeek){
    /* DeepSeek-R1 не принимает reasoning.effort, включается флагом include_reasoning */
    return { include_reasoning: true };
  }
  return { effort };
}

/* Построение списка сообщений с поддержкой вложений (изображения, файлы, артефакты).
   Формат совместим с OpenAI Vision API, который использует OpenRouter. */
function buildOpenRouterMessages(history, systemPrompt){
  const messages = [];
  if (systemPrompt && systemPrompt.trim()){
    messages.push({ role:'system', content: systemPrompt.trim() });
  }
  for (const m of history){
    const parts = [];
    if (m.content) parts.push({ type:'text', text: m.content });
    if (Array.isArray(m.attachments)){
      for (const a of m.attachments){
        if (a.kind === 'image' && a.dataUrl){
          parts.push({ type:'image_url', image_url:{ url: a.dataUrl } });
        } else if ((a.kind === 'file' || a.kind === 'text') && a.text){
          parts.push({
            type:'text',
            text: '── Вложение: ' + (a.name || 'файл') + ' ──\n' + a.text
          });
        } else if (a.kind === 'artifact' && a.code){
          parts.push({
            type:'text',
            text: '── Артефакт: ' + a.name + ' (v' + a.version + ') ──\n```html\n' + a.code + '\n```'
          });
        }
      }
    }
    if (parts.length === 0) parts.push({ type:'text', text: '' });
    messages.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: parts.length === 1 && parts[0].type === 'text' ? parts[0].text : parts
    });
  }
  return messages;
}

/* ═══════════════════════════════════════════════════════════════
   Главный стриминг-метод для OpenRouter (прямой, без ProxyAPI)
   ═══════════════════════════════════════════════════════════════
   handlers:
     onText(t)             — фрагмент финального ответа
     onThink(t)            — фрагмент размышления (reasoning)
     onImage(url)          — готовый URL сгенерированного изображения
     onReasoningDetails(o) — структурированные шаги reasoning_details
     onWebSearch({queries, sources}) — результаты встроенного поиска
     signal                — AbortController.signal для отмены
*/
async function streamOpenRouterDirect(model, history, handlers, aiMsg){
  const settings = window.state?.settings || {};
  const apiKey = (settings.orKey || '').trim();
  if (!apiKey) throw new Error('Не указан ключ OpenRouter (sk-or-…)');

  const systemPrompt = settings.systemPrompt || '';
  const messages = buildOpenRouterMessages(history, systemPrompt);
  const reasoning = mapReasoningToOpenRouter(settings.reasoning, model.id);

  const payload = {
    model: model.id,
    messages,
    stream: true,
    temperature: 1.0
  };
  if (reasoning) payload.reasoning = reasoning;

  /* Включаем провайдер-роутинг для отказоустойчивости */
  payload.provider = {
    order: ['Anthropic', 'Google', 'DeepSeek', 'OpenAI'],
    allow_fallbacks: true,
    only: [] /* пустой = любые доступные */
  };

  let resp;
  try {
    resp = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: buildOpenRouterHeaders(apiKey),
      body: JSON.stringify(payload),
      signal: handlers.signal
    });
  } catch(e){
    if (e && e.name === 'AbortError') throw e;
    throw new Error('Сеть недоступна: ' + (e.message || e));
  }
  if (!resp.ok) throw new Error(await parseOpenRouterError(resp));
  if (!resp.body) throw new Error('Пустое тело ответа OpenRouter');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let sawDone = false;

  while (true){
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const raw of lines){
      const line = raw.trim();
      if (!line || !line.startsWith('data:')) continue;
      const chunk = line.slice(5).trim();
      if (chunk === '[DONE]'){ sawDone = true; break; }
      let obj;
      try { obj = JSON.parse(chunk); } catch(e){ continue; }
      handleOpenRouterChunk(obj, handlers, aiMsg);
    }
    if (sawDone) break;
  }
}

/* Обработка одного SSE-чанка OpenRouter. По структуре идентичен OpenAI,
   но имеет расширения: delta.reasoning, delta.images, delta.tool_calls. */
function handleOpenRouterChunk(obj, h, aiMsg){
  const choice = obj?.choices?.[0];
  if (!choice) return;
  const delta = choice.delta || {};

  /* 1. Размышления (reasoning / reasoning_content) */
  const think = delta.reasoning || delta.reasoning_content;
  if (typeof think === 'string' && think.length){
    if (typeof h.onThink === 'function') h.onThink(think);
  }

  /* 2. Структурированные шаги reasoning_details (DeepSeek, Qwen) */
  if (Array.isArray(delta.reasoning_details) && delta.reasoning_details.length){
    if (typeof h.onReasoningDetails === 'function') h.onReasoningDetails(delta.reasoning_details);
  }

  /* 3. Основной текст ответа */
  if (typeof delta.content === 'string' && delta.content.length){
    if (typeof h.onText === 'function') h.onText(delta.content);
  }

  /* 4. Сгенерированные изображения (некоторые vision-модели возвращают URL) */
  if (Array.isArray(delta.images)){
    for (const im of delta.images){
      const url = im?.url || im?.image_url?.url || im?.b64_json
        ? (im.b64_json ? 'data:image/png;base64,' + im.b64_json : (im.url || im.image_url?.url))
        : null;
      if (url && typeof h.onImage === 'function') h.onImage(url);
    }
  }

  /* 5. Tool calls (встроенный веб-поиск OpenRouter / Anthropic tool use) */
  if (Array.isArray(delta.tool_calls)){
    for (const tc of delta.tool_calls){
      const fn = tc.function;
      if (!fn || !fn.name) continue;
      if (fn.name === 'web_search' || fn.name === 'search_web' || fn.name === 'tavily_search'){
        try {
          const args = JSON.parse(fn.arguments || '{}');
          const queries = Array.isArray(args.queries) ? args.queries
                       : Array.isArray(args.query)   ? args.query
                       : args.query ? [args.query] : [];
          if (queries.length && typeof h.onWebSearch === 'function'){
            h.onWebSearch({ queries, sources: [] });
          }
        } catch(e){}
      }
    }
  }

  /* 6. Сообщение об ошибке внутри потока */
  if (choice.error || obj.error){
    const msg = choice.error?.message || obj.error?.message || 'Ошибка стриминга';
    throw new Error(msg);
  }
}

/* Экспорт в глобальную область для ai.html */
window.streamOpenRouterDirect = streamOpenRouterDirect;
window.parseOpenRouterError = parseOpenRouterError;