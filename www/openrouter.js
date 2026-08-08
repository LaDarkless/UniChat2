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
/* getSystemPromptText определена в proxymodel.js и доступна в рантайме.
   Она добавляет инструкции imageGen / webSearch / artifacts к пользовательскому промпту. */
const systemPrompt = (typeof getSystemPromptText === 'function')
  ? getSystemPromptText(model)
  : (settings.systemPrompt || '');
const messages = buildOpenRouterMessages(history, systemPrompt);
  const reasoning = mapReasoningToOpenRouter(settings.reasoning, model.id);

  // Используем native ID если он задан (для совместимости с ProxyAPI-алиасами)
  // или стандартный model.id. OpenRouter чувствителен к точному совпадению строк.
  const actualModelId = model.native || model.id;

  const payload = {
    model: actualModelId,
    messages,
    stream: true,
    temperature: 1.0
  };
  
  // Добавляем reasoning только если он явно поддерживается и настроен
  // Некорректный блок reasoning для моделей без поддержки также может вызывать 400/404
  if (reasoning && model.reasoning) {
    payload.reasoning = reasoning;
  }

  // Убрали жесткий payload.provider.order, так как он блокирует 
  // использование специфичных моделей и вызывает 404 на шлюзе OpenRouter.
  // OpenRouter сам выбирает оптимального провайдера по умолчанию.

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
  
  // Расширенная диагностика для 404: выводим фактический ID модели
  if (!resp.ok) {
    const errMsg = await parseOpenRouterError(resp);
    if (resp.status === 404) {
      console.error(`[MoonSSS] OpenRouter 404 for model: "${actualModelId}" (original: "${model.id}")`);
      throw new Error(`Модель «${actualModelId}» не найдена в реестре OpenRouter. Проверьте правильность ID в настройках MODELS.`);
    }
    throw new Error(errMsg);
  }
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

/* ============================================================
   RAG WEB SEARCH (SEARCH + EMBEDDINGS + RERANK) VIA OPENROUTER
   Используется когда выбран прямой ключ OpenRouter.
   Модели: perplexity/sonar (live-поиск), pplx-embed (дедуп), voyage-rerank (sort)
   ============================================================ */

async function fetchOpenRouterEmbeddings(texts, apiKey, signal) {
  const resp = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    signal,
    headers: buildOpenRouterHeaders(apiKey),
    body: JSON.stringify({
      model: 'perplexity/pplx-embed-v1-0.6b',
      input: texts,
      encoding_format: 'float'
    })
  });
  if (!resp.ok) throw new Error(await parseOpenRouterError(resp));
  const data = await resp.json();
  return (data.data || [])
    .slice()
    .sort((a, b) => (a.index || 0) - (b.index || 0))
    .map(d => d.embedding);
}

async function fetchOpenRouterRerank(query, documents, apiKey, signal, topN = 5) {
  if (!documents.length) return [];
  const resp = await fetch('https://openrouter.ai/api/v1/rerank', {
    method: 'POST',
    signal,
    headers: buildOpenRouterHeaders(apiKey),
    body: JSON.stringify({
      model: 'voyageai/rerank-2.5',
      query: query,
      documents: documents.map(d => (d.title ? d.title + '\n' : '') + (d.text || d.snippet || d.uri || '')),
      top_n: Math.max(1, Math.min(topN || documents.length, documents.length))
    })
  });
  if (!resp.ok) throw new Error(await parseOpenRouterError(resp));
  const data = await resp.json();
  // Возвращаем документы в порядке убывания релевантности
  return (data.results || [])
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .map(r => documents[r.index]);
}

/* Поисковые модели OpenRouter: sonar — быстрый, sonar-pro — глубже и больше цитат.
   Если основная модель недоступна (400/404), автоматически уходим на следующую. */
const OR_SEARCH_MODELS = ['perplexity/sonar', 'perplexity/sonar-pro'];

/* Извлечение текста и источников из ответа Sonar.
   Читаем ВСЕ каналы: Perplexity-пасc-through (search_results/citations),
   Chat Completions (choices + annotations), Responses API (output[])
   и markdown/голые ссылки в тексте — чтобы поиск не падал в «источники не найдены». */
function extractSonarPayload(data){
  const sources = [];
  const seen = new Set();
  const texts = [];
  const push = (uri, title, snippet) => {
    if (!uri || typeof uri !== 'string' || seen.has(uri)) return;
    if (!/^https?:\/\//i.test(uri)) return;
    seen.add(uri);
    sources.push({ uri, title: title || uri, snippet: snippet || '' });
  };
  (data.search_results || []).forEach(r => push(r.url, r.title, r.snippet || r.content || ''));
  (data.citations || []).forEach(u => {
    if (typeof u === 'string') push(u, '', '');
    else if (u && u.url) push(u.url, u.title, u.snippet || '');
  });
  const msg = data.choices && data.choices[0] && data.choices[0].message;
  if (msg){
    if (typeof msg.content === 'string' && msg.content) texts.push(msg.content);
    (msg.annotations || []).forEach(a => {
      const uc = a.url_citation || a;
      push(uc.url, uc.title, uc.snippet || uc.text || '');
    });
  }
  if (Array.isArray(data.output)){
    for (const item of data.output){
      if (!item || !Array.isArray(item.content)) continue;
      for (const part of item.content){
        if (part.type === 'output_text' && part.text) texts.push(part.text);
        (part.annotations || []).forEach(a => {
          const uc = a.url_citation || a;
          push(uc.url, uc.title, uc.snippet || '');
        });
      }
    }
  }
  let content = texts.join('\n');
  const mdRe = /\[([^\]\n]{2,140})\]\((https?:\/\/[^\s()]+)\)/g;
  let m;
  while ((m = mdRe.exec(content)) !== null) push(m[2], m[1].trim(), '');
  const bareRe = /(https?:\/\/[^\s"'<>)]+)/g;
  while ((m = bareRe.exec(content)) !== null) push(m[1], '', '');
  return { content, sources };
}

/* Один запрос → Sonar. Инструкция вшита в user-сообщение (без system-роли),
   чтобы избежать проблем пасc-through у провайдеров. */
async function searchViaSonar(query, apiKey, signal){
  let lastErr = null;
  for (const modelId of OR_SEARCH_MODELS){
    if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const resp = await fetch(OPENROUTER_URL, {
        method: 'POST',
        signal,
        headers: buildOpenRouterHeaders(apiKey),
        body: JSON.stringify({
          model: modelId,
          stream: false,
          messages: [{
            role: 'user',
            content:
              'Perform a live web search for the query below. Write a concise factual summary ' +
              '(3-6 sentences) strictly based on retrieved pages. Then on a new line list the most ' +
              'relevant sources as markdown links [title](url). No opinions, no filler.\n\nQuery: ' + query
          }]
        })
      });
      if (resp.status === 400 || resp.status === 404){
        lastErr = new Error(await parseOpenRouterError(resp));
        continue; // модель недоступна — пробуем следующую в цепочке
      }
      if (!resp.ok) throw new Error(await parseOpenRouterError(resp));
      return extractSonarPayload(await resp.json());
    } catch (e){
      if (e && e.name === 'AbortError') throw e;
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return { content: '', sources: [] };
}

/* Косинусное сходство для семантической дедупликации */
function cosineSim(a, b){
  const n = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++){ dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/* Дедупликация: отбрасываем источники с близостью эмбеддингов выше порога */
async function dedupeByEmbeddings(docs, apiKey, signal, threshold){
  if (docs.length < 2) return docs;
  const texts = docs.map(d => ((d.title || '') + ' ' + (d.snippet || '')).trim().slice(0, 1800) || ' ');
  const vecs = await fetchOpenRouterEmbeddings(texts, apiKey, signal);
  if (!Array.isArray(vecs) || vecs.length !== docs.length) return docs;
  const keep = [];
  for (let i = 0; i < docs.length; i++){
    let dup = false;
    for (const k of keep){
      if (cosineSim(vecs[i], vecs[k]) > (threshold || 0.92)){ dup = true; break; }
    }
    if (!dup) keep.push(i);
  }
  return keep.map(i => docs[i]);
}

/* Основной метод поиска для OpenRouter Direct:
   Sonar (live-поиск) → pplx-embed (дедуп) → voyage-rerank (ранжирование) */
async function performOpenRouterWebSearch(queries, signal) {
  const settings = window.state?.settings || {};
  const apiKey = (settings.orKey || '').trim();
  if (!apiKey) throw new Error('Не указан ключ OpenRouter для веб-поиска');

  const qs = (queries || []).filter(q => typeof q === 'string' && q.trim()).slice(0, 4);
  if (!qs.length) return { sources: [] };

  /* Этап 1: параллельный живой поиск Perplexity Sonar */
  const perQuery = await Promise.all(qs.map(q =>
    searchViaSonar(q, apiKey, signal).catch(e => {
      if (e && e.name === 'AbortError') throw e;
      console.warn('[OR Search] Query failed:', q, e);
      return { content: '', sources: [] };
    })
  ));

  const seen = new Set();
  let docs = [];
  perQuery.forEach((r, i) => {
    r.sources.forEach(s => {
      if (!seen.has(s.uri)){ seen.add(s.uri); docs.push(s); }
    });
    /* Саммари Sonar без цитат тоже ценно: сохраняем его источником
       со ссылкой на поисковую сессию Perplexity (валидный https-URL) */
    if (r.content && r.content.trim()){
      const uri = 'https://www.perplexity.ai/search?q=' + encodeURIComponent(qs[i]);
      if (!seen.has(uri)){
        seen.add(uri);
        docs.push({
          uri,
          title: 'Perplexity AI — сводка по запросу: ' + qs[i],
          snippet: r.content.trim().slice(0, 1500)
        });
      }
    }
  });
  if (!docs.length) return { sources: [] };

  /* Этап 2: семантический дедуп через pplx-embed (некритично) */
  try {
    docs = await dedupeByEmbeddings(docs, apiKey, signal, 0.92);
  } catch (e){
    console.warn('[OR Search] Embedding dedupe skipped:', e);
  }

  /* Этап 3: финальное ранжирование voyageai/rerank-2.5 (некритично) */
  try {
    const ranked = await fetchOpenRouterRerank(qs.join(' '), docs, apiKey, signal, Math.min(8, docs.length));
    if (ranked && ranked.length) docs = ranked;
  } catch (e){
    console.warn('[OR Search] Rerank failed, using raw order:', e);
  }

  return {
    sources: docs.map(r => ({ uri: r.uri, title: r.title, snippet: r.snippet }))
  };
}

/* Быстрый перевод запроса через OpenRouter (gpt-4o-mini, ~0.0002$ за вызов).
   Используется translateImageQuery для поиска картинок — устраняет таймаут
   на proxyapi.ru при отсутствии ProxyAPI-ключа или нестабильной сети. */
async function translateQueryViaOpenRouter(query, signal){
  const settings = window.state?.settings || {};
  const apiKey = (settings.orKey || '').trim();
  if (!apiKey) return null;

  const timeoutCtrl = new AbortController();
  const timeoutId = setTimeout(() => timeoutCtrl.abort(), 15000);
  const combinedSignal = signal || timeoutCtrl.signal;

  try {
    const resp = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: combinedSignal,
      headers: buildOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        stream: false,
        max_tokens: 120,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content:
            'Translate the following search query into 2-6 English keywords for image search. ' +
            'Reply with keywords only, separated by spaces, no punctuation, no explanations.\n\nQuery: ' +
            String(query || '').slice(0, 120)
        }]
      })
    });
    clearTimeout(timeoutId);
    if (!resp.ok) return null;
    const data = await resp.json();
    const t = (data.choices?.[0]?.message?.content || '').trim();
    return t && t.length < 140 ? t : null;
  } catch (e) {
    clearTimeout(timeoutId);
    if (e && e.name === 'AbortError') return null;
    return null;
  }
}

/* Экспорт в глобальную область для ai.html */
window.streamOpenRouterDirect = streamOpenRouterDirect;
window.parseOpenRouterError = parseOpenRouterError;
window.performOpenRouterWebSearch = performOpenRouterWebSearch;
window.translateQueryViaOpenRouter = translateQueryViaOpenRouter;