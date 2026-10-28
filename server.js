const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Load environment variables from .env if present (Zero external dependencies)
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val.replace(/^["']|["']$/g, '');
        }
      }
    }
  }
}
loadEnv();

const PORT = process.env.PORT || 3456;
const DATA_FILE = path.join(__dirname, 'data', 'store.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Initial state
const defaultState = {
  tasks: [
    { id: '1', title: 'Explore TRI AI features and customize persona', priority: 'HIGH', category: 'WORK', completed: false, time: '09:00 AM' },
    { id: '2', title: 'Verify local Ollama / offline AI reasoning engine', priority: 'MEDIUM', category: 'WORK', completed: true, time: '09:15 AM' },
    { id: '3', title: 'Test Mindmap Visual Hub generation', priority: 'MEDIUM', category: 'PERSONAL', completed: false, time: '10:30 AM' }
  ],
  notes: [
    { id: '1', title: 'Welcome to TRI AI', content: 'Clean-room independent desktop AI assistant built on Windows.', time: '08:00 AM' }
  ],
  agents: [
    { id: 'alice', name: 'Alice', status: 'Online', role: 'Context & Research', busy: false, thought: 'Monitoring system context and queries...' },
    { id: 'bob', name: 'Bob', status: 'Online', role: 'Task & Automation', busy: false, thought: 'Task queue synchronized.' },
    { id: 'carol', name: 'Carol', status: 'Online', role: 'Visual Hub & Mindmaps', busy: false, thought: 'Ready to map concepts.' },
    { id: 'dave', name: 'Dave', status: 'Online', role: 'System & Code Sentinel', busy: false, thought: 'All security bounds normal.' }
  ]
};

function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to read store.json, using defaults:', err.message);
  }
  saveState(defaultState);
  return JSON.parse(JSON.stringify(defaultState));
}

function saveState(state) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save store.json:', err.message);
  }
}

let appState = loadState();

// Content type mapper
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Check if Ollama is running locally
async function checkOllama() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 11434,
      path: '/api/tags',
      method: 'GET',
      timeout: 1000
    }, (res) => {
      if (res.statusCode === 200) {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve({ available: true, models: data.models || [] });
          } catch {
            resolve({ available: false });
          }
        });
      } else {
        resolve({ available: false });
      }
    });
    req.on('error', () => resolve({ available: false }));
    req.on('timeout', () => { req.destroy(); resolve({ available: false }); });
    req.end();
  });
}

// Real Groq AI Client (100% Free Developer Tier, Ultra-Fast LPUs, OpenAI Compatible)
function callGroqAPI(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return Promise.resolve(null);
  }

  // Confirmed high-performance free models on Groq
  const modelCandidates = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant'
  ];

  return new Promise((resolve) => {
    function attempt(modelIdx) {
      if (modelIdx >= modelCandidates.length) {
        resolve({
          error: true,
          status: 500,
          message: "TRIDIP স্যার, Groq AI সার্ভার বর্তমানে সাড়া দিচ্ছে না। বিকল্প ব্যাকআপ সক্রিয় করা হয়েছে।"
        });
        return;
      }

      const model = modelCandidates[modelIdx];
      const payload = JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: "You are TRI AI, a smart, polite, and loyal personal desktop AI assistant for TRIDIP Sir. " +
                     "You always reply respectfully, warmly, and naturally in clear Bengali (Bangla), using English technical terms where helpful. " +
                     "Always address the user respectfully as 'TRIDIP স্যার'. " +
                     "Provide clear, concise, and helpful guidance."
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1024
      });

      const options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`, // Secure server-side header
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 12000
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              const text = json.choices?.[0]?.message?.content;
              if (text) {
                resolve({ success: true, text, model });
                return;
              }
            } catch (e) {}
          } else if (res.statusCode === 401 || res.statusCode === 403) {
            resolve({
              error: true,
              authError: true,
              status: res.statusCode,
              message: "TRIDIP স্যার, আপনার .env ফাইলে প্রদানকৃত Groq API Key-টি অবৈধ (Invalid) অথবা অনুমতিহীন (HTTP " + res.statusCode + ")। অনুগ্রহ করে console.groq.com/keys থেকে নতুন ফ্রি কী সংগ্রহ করে .env ফাইলে বসান।"
            });
            return;
          } else if (res.statusCode === 429) {
            resolve({
              error: true,
              quotaExhausted: true,
              status: 429,
              message: "TRIDIP স্যার, Groq ফ্রি API ব্যবহারের লিমিট (Rate Limit / Quota) সাময়িকভাবে শেষ হয়েছে। কোনো পেইড অ্যাকাউন্ট বা স্বয়ংক্রিয় বিলিং সক্রিয় নেই। আপনি কিছুক্ষণ পর আবার চেষ্টা করতে পারেন অথবা অফলাইন কমান্ড ব্যবহার করতে পারেন।"
            });
            return;
          }
          // Try next model candidate
          attempt(modelIdx + 1);
        });
      });

      req.on('error', () => attempt(modelIdx + 1));
      req.on('timeout', () => {
        req.destroy();
        attempt(modelIdx + 1);
      });

      req.write(payload);
      req.end();
    }

    attempt(0);
  });
}

// Real Gemini AI Client (Zero-Cost Free-Tier with Secure Header Authentication)
function callGeminiAPI(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return Promise.resolve(null);
  }

  // Confirmed Google AI Studio free-tier Flash models
  const modelCandidates = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];

  const payload = JSON.stringify({
    systemInstruction: {
      parts: [{
        text: "You are TRI AI, a smart, polite, and loyal personal desktop AI assistant for TRIDIP Sir. " +
              "You always reply respectfully, warmly, and naturally in clear Bengali (Bangla), using English technical terms where helpful. " +
              "Always address the user respectfully as 'TRIDIP স্যার'. " +
              "Provide clear, concise, and helpful guidance."
      }]
    },
    contents: [{
      role: 'user',
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024
    }
  });

  return new Promise((resolve) => {
    function attempt(modelIdx) {
      if (modelIdx >= modelCandidates.length) {
        resolve({
          error: true,
          status: 500,
          message: "TRIDIP স্যার, AI মডেল সার্ভিস বর্তমানে সাড়া দিচ্ছে না। অফলাইন ব্যাকআপ সক্রিয় করা হয়েছে।"
        });
        return;
      }

      const model = modelCandidates[modelIdx];
      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${model}:generateContent`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey, // SECURE HEADER - Never exposed in URL query parameters
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 12000
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                resolve({ success: true, text, model });
                return;
              }
            } catch (e) {}
          } else if (res.statusCode === 401 || res.statusCode === 403) {
            // Authentication Failure
            resolve({
              error: true,
              authError: true,
              status: res.statusCode,
              message: "TRIDIP স্যার, আপনার .env ফাইলে প্রদানকৃত Gemini API Key-টি অবৈধ (Invalid) অথবা অনুমতিহীন (HTTP " + res.statusCode + ")। অনুগ্রহ করে aistudio.google.com থেকে সঠিক কী যাচাই করে .env ফাইলে সংরক্ষণ করুন।"
            });
            return;
          } else if (res.statusCode === 429) {
            // Strict Zero-Cost Safeguard: Never switch to paid billing!
            resolve({
              error: true,
              quotaExhausted: true,
              status: 429,
              message: "TRIDIP স্যার, আজকের গুগল ফ্রি API ব্যবহারের সীমা (Quota Limit) শেষ হয়েছে। কোনো পেইড অ্যাকাউন্ট বা স্বয়ংক্রিয় বিলিং সক্রিয় নেই। আপনি কিছুক্ষণ পর আবার চেষ্টা করতে পারেন অথবা অফলাইন কমান্ড ব্যবহার করতে পারেন।"
            });
            return;
          }
          // Try next model candidate if first model is not available
          attempt(modelIdx + 1);
        });
      });

      req.on('error', () => attempt(modelIdx + 1));
      req.on('timeout', () => {
        req.destroy();
        attempt(modelIdx + 1);
      });

      req.write(payload);
      req.end();
    }

    attempt(0);
  });
}

// Built-in intelligent reasoning engine (100% free, offline, no API key required)
function generateBuiltInResponse(prompt) {
  const lower = prompt.toLowerCase();
  const reasoning = [
    {
      stage: 'প্রসঙ্গ ও ইনপুট বিশ্লেষণ',
      detail: `ইনপুট গ্রহণ: "${prompt}". উদ্দেশ্য ও অফলাইন কার্যপ্রণালী মূল্যায়ন করা হচ্ছে।`
    },
    {
      stage: 'সিস্টেম স্থিতি যাচাই',
      detail: `সক্রিয় টাস্ক: ${appState.tasks.length}টি। এজেন্ট Alice, Bob, Carol, Dave প্রস্তুত।`
    },
    {
      stage: 'চূড়ান্ত লক্ষ্য নির্ধারণ',
      detail: 'TRIDIP স্যারের জন্য সরাসরি সহায়ক পদক্ষেপ সংকলন সম্পন্ন।'
    }
  ];

  let reply = '';
  let action = null;

  if (lower.includes('task') || lower.includes('todo') || lower.includes('objective') || lower.includes('টাস্ক') || lower.includes('কাজ')) {
    if (lower.includes('add') || lower.includes('create') || lower.includes('new') || lower.includes('যোগ') || lower.includes('নতুন')) {
      const cleanTitle = prompt.replace(/^(please\s+)?(add|create|new)\s+(a\s+)?(task|todo|objective)\s*(to|:|about)?/i, '')
                               .replace(/^(দয়া করে\s+)?(একটি\s+)?(নতুন\s+)?(টাস্ক|কাজ)\s*(যোগ করো|করো)?/i, '')
                               .trim() || 'নতুন অবজেক্টিভ';
      const newTask = {
        id: String(Date.now()),
        title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
        priority: lower.includes('high') || lower.includes('জরুরি') ? 'HIGH' : (lower.includes('low') || lower.includes('কম') ? 'LOW' : 'MEDIUM'),
        category: lower.includes('personal') || lower.includes('ব্যক্তিগত') ? 'PERSONAL' : 'WORK',
        completed: false,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      appState.tasks.unshift(newTask);
      saveState(appState);
      reply = `TRIDIP স্যার, আমি নতুন টাস্ক যোগ করেছি: **"${newTask.title}"** (অগ্রাধিকার: **${newTask.priority}**, বিভাগ: **${newTask.category}**)। প্রগ্রেস বার আপডেট করা হয়েছে।`;
      action = { type: 'TASKS_UPDATED', tasks: appState.tasks };
    } else {
      const pending = appState.tasks.filter(t => !t.completed);
      reply = `TRIDIP স্যার, আপনার বর্তমানে **${pending.length}টি পেন্ডিং টাস্ক** রয়েছে (মোট ${appState.tasks.length}টি)। সর্বোচ্চ অগ্রাধিকার: "${pending[0]?.title || 'কোনোটি নয়'}"।`;
    }
  } else if (lower.includes('agent') || lower.includes('alice') || lower.includes('bob') || lower.includes('carol') || lower.includes('dave') || lower.includes('এজেন্ট')) {
    reply = `TRIDIP স্যার, Agent Town-এর ৪ জন এজেন্টই সক্রিয় রয়েছে:\n- **Alice**: রিসার্চ ও কনটেক্সট ট্র্যাকিং\n- **Bob**: টাস্ক অটোমেশন\n- **Carol**: মাইন্ডম্যাপ ও নলেজ গ্রাফ\n- **Dave**: সিস্টেম সিকিউরিটি\n\nআপনি নিচের Agent Town ডেস্কে ক্লিক করে কাজ অ্যাসাইন করতে পারেন!`;
  } else if (lower.includes('mindmap') || lower.includes('visual hub') || lower.includes('map') || lower.includes('মাইন্ডম্যাপ')) {
    reply = `TRIDIP স্যার, **Visual Hub** সক্রিয় করা হচ্ছে! আপনি কনসেপ্ট ম্যাপে ড্র্যাগ ও জুম করে নলেজ গ্রাফ এক্সপ্লোর করতে পারবেন।`;
    action = { type: 'SWITCH_TAB', tab: 'visual' };
  } else if (lower.includes('status') || lower.includes('system') || lower.includes('health') || lower.includes('অবস্থা')) {
    const memUsage = Math.round((1 - os.freemem() / os.totalmem()) * 100);
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
    reply = `**TRI AI সিস্টেম স্ট্যাটাস:**\n- ব্যবহারকারী: TRIDIP স্যার\n- ওএস: Windows (${os.release()})\n- মেমোরি ব্যবহার: ${memUsage}%\n- Gemini রিয়েল AI: ${hasKey ? 'সক্রিয় (ক্লাউড ফ্রি-টিয়ার)' : 'অফলাইন লোকাল মোড (.env কনফিগারেশন প্রয়োজন)'}\n- নিউরাল কোর: Active & Synced`;
  } else {
    reply = `হ্যালো, TRIDIP স্যার! আমি আপনার **TRI AI** পার্সোনাল অ্যাসিস্ট্যান্ট। আমি কোনো পেইড সাবস্ক্রিপশন ছাড়াই আপনার ডেস্কটপে নিরাপদে কাজ করতে পারি। আপনাকে কীভাবে সাহায্য করতে পারি?`;
  }

  return { reasoning, reply, action };
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Routes
  if (pathname === '/api/tasks' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(appState.tasks));
    return;
  }

  if (pathname === '/api/tasks' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const item = JSON.parse(body);
        const newTask = {
          id: String(Date.now()),
          title: item.title || 'Untitled Objective',
          priority: item.priority || 'MEDIUM',
          category: item.category || 'WORK',
          completed: false,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        appState.tasks.unshift(newTask);
        saveState(appState);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newTask));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname.startsWith('/api/tasks/') && req.method === 'PUT') {
    const id = pathname.split('/')[3];
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const update = JSON.parse(body);
        const idx = appState.tasks.findIndex(t => t.id === id);
        if (idx !== -1) {
          appState.tasks[idx] = { ...appState.tasks[idx], ...update };
          saveState(appState);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(appState.tasks[idx]));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Task not found' }));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname.startsWith('/api/tasks/') && req.method === 'DELETE') {
    const id = pathname.split('/')[3];
    appState.tasks = appState.tasks.filter(t => t.id !== id);
    saveState(appState);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (pathname === '/api/agents' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(appState.agents));
    return;
  }

  if (pathname === '/api/system' && req.method === 'GET') {
    const ollama = await checkOllama();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024),
      freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024),
      ollama
    }));
    return;
  }

  if (pathname === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { message } = JSON.parse(body);

        let response = null;

        // 1. Try real Groq AI (Primary 100% Free Option) if key is present
        const groqRes = await callGroqAPI(message);

        if (groqRes && groqRes.success) {
          response = {
            mode: 'REAL_GROQ_AI',
            provider: 'Groq',
            model: groqRes.model,
            reasoning: [
              { stage: 'প্রসঙ্গ ও ইনপুট বিশ্লেষণ', detail: `ইনপুট গ্রহণ: "${message}". ব্যবহারকারীর উদ্দেশ্য বিশ্লেষণ সম্পন্ন।` },
              { stage: 'মডেল ও জ্ঞান আধার সংযোগ', detail: `Groq LPU (${groqRes.model}) ফ্রি-টিয়ার সচল রয়েছে।` },
              { stage: 'চূড়ান্ত আউটপুট প্রস্তুতকরণ', detail: 'TRIDIP স্যারের জন্য সাবলীল ও দ্রুতগতির বাংলা উত্তর সংকলন সম্পন্ন।' }
            ],
            reply: groqRes.text,
            action: null
          };
        } else if (groqRes && groqRes.quotaExhausted) {
          response = {
            mode: 'QUOTA_EXHAUSTED',
            provider: 'Groq',
            reasoning: [
              { stage: 'কোটেশন পর্যবেক্ষণ', detail: 'Groq ফ্রি-টিয়ার রিকোয়েস্ট লিমিট (HTTP 429) শনাক্ত হয়েছে।' }
            ],
            reply: groqRes.message,
            action: null
          };
        } else if (groqRes && groqRes.authError) {
          response = {
            mode: 'AUTH_ERROR',
            provider: 'Groq',
            reasoning: [
              { stage: 'নিরাপত্তা যাচাই', detail: `Groq API কী যাচাইকরণে ব্যর্থতা (HTTP ${groqRes.status})।` }
            ],
            reply: groqRes.message,
            action: null
          };
        } else {
          // 2. Try real Gemini AI (Secondary Option) if key is present
          const geminiRes = await callGeminiAPI(message);

          if (geminiRes && geminiRes.success) {
            response = {
              mode: 'REAL_GEMINI_AI',
              provider: 'Gemini',
              model: geminiRes.model,
              reasoning: [
                { stage: 'প্রসঙ্গ ও ইনপুট বিশ্লেষণ', detail: `ইনপুট গ্রহণ: "${message}". ব্যবহারকারীর উদ্দেশ্য বিশ্লেষণ সম্পন্ন।` },
                { stage: 'মডেল ও জ্ঞান আধার সংযোগ', detail: `Google Gemini (${geminiRes.model}) ফ্রি-টিয়ার সচল রয়েছে।` },
                { stage: 'চূড়ান্ত আউটপুট প্রস্তুতকরণ', detail: 'TRIDIP স্যারের জন্য মার্জিত ও সাবলীল বাংলা উত্তর সংকলন সম্পন্ন।' }
              ],
              reply: geminiRes.text,
              action: null
            };
          } else if (geminiRes && geminiRes.quotaExhausted) {
            response = {
              mode: 'QUOTA_EXHAUSTED',
              provider: 'Gemini',
              reasoning: [
                { stage: 'কোটেশন পর্যবেক্ষণ', detail: 'গুগল ফ্রি-টিয়ার রিকোয়েস্ট লিমিট (HTTP 429) শনাক্ত হয়েছে।' }
              ],
              reply: geminiRes.message,
              action: null
            };
          } else if (geminiRes && geminiRes.authError) {
            response = {
              mode: 'AUTH_ERROR',
              provider: 'Gemini',
              reasoning: [
                { stage: 'নিরাপত্তা যাচাই', detail: `Gemini API কী যাচাইকরণে ব্যর্থতা (HTTP ${geminiRes.status})।` }
              ],
              reply: geminiRes.message,
              action: null
            };
          } else {
            // 3. Safe Local Offline Fallback
            response = generateBuiltInResponse(message);
            response.mode = 'OFFLINE_FALLBACK';
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Static File Serving
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TRI AI Assistant running at: http://127.0.0.1:${PORT}`);
});
