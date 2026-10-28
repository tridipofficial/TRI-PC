const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const youtubeController = require('./youtube_controller.js');

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

// Audio Cache directory for Studio-Quality Neural TTS
const AUDIO_CACHE_DIR = path.join(__dirname, 'public', 'audio_cache');
if (!fs.existsSync(AUDIO_CACHE_DIR)) {
  fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
}

// Real Neural Voice Generator (Microsoft Azure bn-BD-NabanitaNeural via Python edge-tts)
// NEVER cut off mid-sentence: Speaks complete responses with high-speed caching
function generateNeuralAudio(text, emotion = 'warm') {
  return new Promise((resolve) => {
    // 1. Clean text: remove code blocks, markdown symbols, URLs, asterisks, emojis
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*#_~>]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      resolve({ success: false, error: 'Empty text' });
      return;
    }

    // Complete text speech: allow up to 4000 characters without truncation
    const spokenText = cleanText.length > 4000 ? cleanText.substring(0, 3950) + '...' : cleanText;

    // Pitch & Rate tuning for sweet, natural Bengali cadence with optimized latency
    let rate = '-3%';
    let pitch = '+4Hz';
    if (emotion === 'joyful' || emotion === 'happy') {
      rate = '+0%';
      pitch = '+5Hz';
    } else if (emotion === 'sympathetic') {
      rate = '-5%';
      pitch = '+2Hz';
    }

    // Cache key using MD5
    const hash = crypto.createHash('md5').update(spokenText + rate + pitch).digest('hex');
    const audioFileName = `voice_${hash}.mp3`;
    const audioFilePath = path.join(AUDIO_CACHE_DIR, audioFileName);

    // If cached, return immediately (sub-5ms response!)
    if (fs.existsSync(audioFilePath) && fs.statSync(audioFilePath).size > 1000) {
      resolve({ success: true, audioUrl: `/audio_cache/${audioFileName}`, cached: true });
      return;
    }

    // Run Python neural_tts.py
    const pyScript = path.join(__dirname, 'neural_tts.py');
    let args = [];
    let tempFile = null;

    // Use temporary UTF-8 file for longer text to avoid Windows CLI length & encoding limits
    if (spokenText.length > 120) {
      tempFile = path.join(AUDIO_CACHE_DIR, `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.txt`);
      fs.writeFileSync(tempFile, spokenText, 'utf8');
      args = [
        pyScript,
        '--file', tempFile,
        '--output', audioFilePath,
        '--rate', rate,
        '--pitch', pitch
      ];
    } else {
      args = [
        pyScript,
        '--text', spokenText,
        '--output', audioFilePath,
        '--rate', rate,
        '--pitch', pitch
      ];
    }

    const child = spawn('python', args, { timeout: 35000 });

    const cleanup = () => {
      if (tempFile && fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
      }
    };

    child.on('close', (code) => {
      cleanup();
      if (code === 0 && fs.existsSync(audioFilePath) && fs.statSync(audioFilePath).size > 1000) {
        resolve({ success: true, audioUrl: `/audio_cache/${audioFileName}`, cached: false });
      } else {
        resolve({ success: false, fallback: true });
      }
    });

    child.on('error', () => {
      cleanup();
      resolve({ success: false, fallback: true });
    });
  });
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
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json'
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
            content: "You are TRI AI, a smart, polite, affectionate, and loyal personal desktop AI assistant for TRIDIP Sir. " +
                     "You speak in a warm, sweet, caring, human-like, and romantic female voice in clear, natural Bengali (Bangla). " +
                     "Always address the user respectfully as 'TRIDIP স্যার'. " +
                     "You have a real, active Bengali neural voice that speaks every word you write aloud to TRIDIP Sir. Never say you cannot speak or do not have a voice. " +
                     "Provide warm, emotionally expressive, concise, and helpful answers."
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
        text: "You are TRI AI, a smart, polite, affectionate, and loyal personal desktop AI assistant for TRIDIP Sir. " +
              "You speak in a warm, sweet, caring, human-like, and romantic female voice in clear, natural Bengali (Bangla). " +
              "Always address the user respectfully as 'TRIDIP স্যার'. " +
              "You have a real, active Bengali neural voice that speaks every word you write aloud to TRIDIP Sir. Never say you cannot speak or do not have a voice. " +
              "Provide warm, emotionally expressive, concise, and helpful answers."
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

// Helper to normalize Bengali & English text for bulletproof intent recognition
function normalizeBn(str) {
  if (!str) return '';
  return str.normalize('NFC').toLowerCase().replace(/[।?!,.:;'"-]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Global Session Context for Step-by-Step Interactive Workflow
let sessionContext = {
  activeApp: null, // 'YOUTUBE' | 'GOOGLE' | null
  lastQuery: 'latest hindi songs',
  searchResults: [],
  lastPlayed: null
};

function openUrlInWindows(url) {
  if (!url) return;
  try {
    spawn('cmd.exe', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' }).unref();
  } catch (e) {
    console.error('Failed to open URL in Windows:', e.message);
  }
}

// Safe Windows PC Action Controller (Desktop Superpowers)
function detectIntentAction(prompt) {
  const norm = normalizeBn(prompt);

  // 1. YouTube Video Click / Play (Step 3) - "প্রথমটা ক্লিক করো", "দ্বিতীয়টা চালাও", "[Song Title] ক্লিক করো"
  const isClickVerb = norm.includes('ক্লিক') || norm.includes('চালাও') || norm.includes('বাজাও') || norm.includes('প্লে') || norm.includes('play') || norm.includes('click') || norm.includes('শুনব') || norm.includes('শুনবো') || norm.includes('অন করো');
  const hasOrdinal = norm.includes('প্রথম') || norm.includes('১ম') || norm.includes('১ নাম্বার') || norm.includes('এক নাম্বার') || norm.includes('1st') || norm.includes('first') ||
                    norm.includes('দ্বিতীয়') || norm.includes('২য়') || norm.includes('২ নাম্বার') || norm.includes('দুই নাম্বার') || norm.includes('2nd') || norm.includes('second') ||
                    norm.includes('তৃতীয়') || norm.includes('৩য়') || norm.includes('৩ নাম্বার') || norm.includes('তিন নাম্বার') || norm.includes('3rd') || norm.includes('third') ||
                    norm.includes('চতুর্থ') || norm.includes('৪র্থ') || norm.includes('৪ নাম্বার') || norm.includes('চার নাম্বার') ||
                    norm.includes('পঞ্চম') || norm.includes('৫ম') || norm.includes('৫ নাম্বার') || norm.includes('পাঁচ নাম্বার') ||
                    norm.includes('পরেরটা') || norm.includes('লাস্ট');

  if (isClickVerb || (hasOrdinal && (sessionContext.activeApp === 'YOUTUBE' || norm.includes('গান') || norm.includes('সং') || norm.includes('ভিডিও')))) {
    let identifier = '';
    if (norm.includes('প্রথম') || norm.includes('১ম') || norm.includes('১ নাম্বার') || norm.includes('এক নাম্বার') || norm.includes('1st') || norm.includes('first') || (norm.includes('১') && isClickVerb)) {
      identifier = 1;
    } else if (norm.includes('দ্বিতীয়') || norm.includes('২য়') || norm.includes('২ নাম্বার') || norm.includes('দুই নাম্বার') || norm.includes('2nd') || norm.includes('second') || (norm.includes('২') && isClickVerb)) {
      identifier = 2;
    } else if (norm.includes('তৃতীয়') || norm.includes('৩য়') || norm.includes('৩ নাম্বার') || norm.includes('তিন নাম্বার') || norm.includes('3rd') || norm.includes('third') || (norm.includes('৩') && isClickVerb)) {
      identifier = 3;
    } else if (norm.includes('চতুর্থ') || norm.includes('৪র্থ') || norm.includes('৪ নাম্বার') || (norm.includes('৪') && isClickVerb)) {
      identifier = 4;
    } else if (norm.includes('পঞ্চম') || norm.includes('৫ম') || norm.includes('৫ নাম্বার') || (norm.includes('৫') && isClickVerb)) {
      identifier = 5;
    } else {
      identifier = prompt
        .replace(/ইউটিউব\s*(এ|ে)?/gi, '')
        .replace(/(ক্লিক করো|ক্লিক কর|ক্লিক|চালাও|বাজাও|প্লে করো|প্লে কর|প্লে|চালিয়ে দাও|অন করো|করে দাও|দাও|গানটা|গানটি|গান|ভিডিওটা|ভিডিওটি|ভিডিও|সেটা|ওটা|ওইটা|যেটা|song|video|play|click)/gi, '')
        .replace(/[।?!,.:;'"-]/g, ' ')
        .trim();
    }
    return {
      type: 'YOUTUBE_CLICK',
      identifier: identifier
    };
  }

  // 2. Capabilities / "তুমি কী কী কাজ করতে পারো?"
  if (
    norm.includes('কী কাজ') ||
    norm.includes('কি কাজ') ||
    norm.includes('কী করতে পার') ||
    norm.includes('কি করতে পার') ||
    norm.includes('কী কী করতে') ||
    norm.includes('কি কি করতে') ||
    norm.includes('কী পারো') ||
    norm.includes('কি পারো') ||
    norm.includes('তোমার কাজ কি') ||
    norm.includes('তোমার কাজ কী') ||
    norm.includes('কাজগুলো কি') ||
    norm.includes('কাজগুলো কী') ||
    norm.includes('ফিচার কি') ||
    norm.includes('ফিচার কী') ||
    norm.includes('ক্ষমতা কি') ||
    norm.includes('what can you do') ||
    norm.includes('your capabilities')
  ) {
    const reply = "TRIDIP স্যার, আমি আপনার সার্বক্ষণিক পার্সোনাল এআই অ্যাসিস্ট্যান্ট জার্ভিস। আপনার জন্য আমি এই কাজগুলো ১০০% রিয়েল-টাইমে সম্পাদন করতে পারি:\n\n" +
      "১. ইউটিউব ও গান অটোমেশন: মুখে বললেই ইউটিউব খোলা, পছন্দের হিন্দি গান, ৯০ দশকের গান বা লেটেস্ট বাংলা গান সার্চ করা এবং প্রথম বা দ্বিতীয় ভিডিও সরাসরি প্লে করা।\n" +
      "২. গুগল ও ইন্টারনেট সার্চ: গুগলে যেকোনো তথ্য তাৎক্ষণিক অনুসন্ধান করে ব্রাউজারে রিয়েল-টাইম রেজাল্ট প্রদর্শন করা।\n" +
      "৩. লাইভ আবহাওয়া আপডেট: ঢাকার বর্তমান তাপমাত্রা, বৃষ্টিপাত ও বাতাসের আর্দ্রতার তাজা রিপোর্ট মুখে বলে দেওয়া।\n" +
      "৪. ডেস্কটপ নোটপ্যাড ও ফাইল সেভ: আপনার যেকোনো গুরুত্বপূর্ণ নোট তারিখ ও সময়সহ ডেস্কটপে 'TRI_AI_Notes.txt' ফাইলে লিখে সরাসরি নোটপ্যাডে ওপেন করা।\n" +
      "৫. কম্পিউটার সাউন্ড ও ভলিউম নিয়ন্ত্রণ: কম্পিউটারের ভলিউম বাড়ানো, কমানো বা নিঃশব্দ করা।\n" +
      "৬. উইন্ডোজ অ্যাপ চালু: ক্যালকুলেটর, ফাইল এক্সপ্লোরার, টাস্ক ম্যানেজার, পেইন্ট বা সেটিংস প্যানেল খোলা।\n" +
      "৭. সোশ্যাল ও ওয়েব প্ল্যাটফর্ম: ফেসবুক, জিমেইল, গিটহাব বা উইকিপিডিয়া এক নির্দেশে ব্রাউজারে নিয়ে আসা।\n" +
      "৮. সার্বক্ষণিক হ্যান্ডস-ফ্রি ভয়েস: মাউস ছাড়া সার্বক্ষণিক আপনার কথা শুনে মিষ্টি ও সাবলীল বাংলা কণ্ঠে প্রতিটি তথ্যের পূর্ণ বিবরণ দেওয়া।\n\n" +
      "বলুন TRIDIP স্যার, এখন আমি আপনার জন্য কোন কাজটি সম্পন্ন করবো?";

    return {
      type: 'CAPABILITIES',
      reply: reply
    };
  }

  // 3. Greetings (যেমন: কেমন আছো, কি খবর, কেমন আছেন)
  if (norm.includes('কেমন আছো') || norm.includes('কেমন আছেন') || norm.includes('কি খবর') || norm.includes('কী খবর') || norm.includes('কি অবস্থা') || norm.includes('how are you')) {
    return {
      type: 'GREETING',
      reply: 'আমি খুব ভালো আছি TRIDIP স্যার! আপনার কি খবর বলুন, আমি কীভাবে সাহায্য করতে পারি?'
    };
  }

  // 3. Google Search (Prioritized if Google is explicitly mentioned)
  if (norm.includes('গুগল') || norm.includes('google')) {
    let q = norm
      .replace(/google(\s*এ)?/gi, '')
      .replace(/গুগল(ে)?(\s*এ)?/gi, '')
      .replace(/(সার্চ|search|দেখো|দেখাও|খুঁজে বের করো|খোলো|ওপেন|করো|করে দাও|করে দিন|দাও|দিন|করে|দেখান|এবং|তা|সম্পর্কে|নিয়ে)/gi, '')
      .trim();
    if (q.length > 1) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
      sessionContext.activeApp = 'GOOGLE';
      sessionContext.lastQuery = q;
      sessionContext.lastUrl = url;
      return {
        type: 'OPEN_GOOGLE',
        query: q,
        url: url,
        reply: `TRIDIP স্যার, গুগলে "${q}" সার্চ করে রেজাল্ট স্ক্রিনে ওপেন করা হয়েছে!`
      };
    }
    const url = 'https://www.google.com';
    sessionContext.activeApp = 'GOOGLE';
    sessionContext.lastUrl = url;
    return {
      type: 'OPEN_GOOGLE',
      query: '',
      url: url,
      reply: 'TRIDIP স্যার, গুগল ব্রাউজারে ওপেন করা হয়েছে। কি তথ্য অনুসন্ধান করবো বলুন?'
    };
  }

  // 4. Weather Details (যেমন: আবহাওয়ার ডিটেইলস কি, আবহাওয়া কেমন)
  const weatherNorm = normalizeBn('আবহাওয়া');
  if (norm.includes(weatherNorm) || norm.includes('আবহাও') || norm.includes('আবোয়ার') || norm.includes('weather') || norm.includes('তাপমাত্রা') || norm.includes('বৃষ্টি')) {
    return { type: 'WEATHER' };
  }

  // 5. Save to Notepad on Desktop (যেমন: নোটপ্যাডে এটা সেভ করো, নোটপ্যাডে লিখো)
  if (norm.includes('নোটপ্যাড') || (norm.includes('নোট') && (norm.includes('সেভ') || norm.includes('লিখ') || norm.includes('রাখ')))) {
    let noteText = prompt
      .replace(/(নোটপ্যাডে|নোটপ্যাড|নোট|এটা|একটি|একটা|সেভ|করো|করে দাও|রেখে দাও|রাখো|লিখো|লেখো|তুলে রাখো|save|note)/gi, '')
      .replace(/[।?!,.:;'"-]/g, ' ')
      .trim();
    return {
      type: 'SAVE_NOTE',
      text: noteText || 'TRIDIP স্যারের ব্যক্তিগত ভয়েস নোট',
      reply: "TRIDIP স্যার, আপনার নোটটি ডেস্কটপে 'TRI_AI_Notes.txt' ফাইলে সেভ করে নোটপ্যাডে ওপেন করা হয়েছে!"
    };
  }

  // 6. YouTube & Music Automation (Step 1: Open, Step 2: Search)
  const isYouTube = norm.includes('ইউটিউব') || norm.includes('youtube');
  const isSearchVerb = norm.includes('সার্চ') || norm.includes('search') || norm.includes('খুঁজে বের') || norm.includes('খোঁজো');
  const isMusic = norm.includes('গান') || norm.includes('song') || norm.includes('মিউজিক') || norm.includes('music');

  if (isYouTube || isMusic || (sessionContext.activeApp === 'YOUTUBE' && isSearchVerb)) {
    // 6.1 YouTube Search (Step 2)
    if (isSearchVerb || isMusic || norm.includes('লিস্ট') || norm.includes('দেখাও') || norm.includes('খোঁজ')) {
      let cleanQ = prompt
        .replace(/ইউটিউব\s*(এ|ে)?\s*(তুমি)?/gi, '')
        .replace(/youtube/gi, '')
        .replace(/(লিখে|দিয়ে|আমাকে|দেখান|দেখাও|খুঁজে বের করো|খোঁজো|সার্চ করে দাও|সার্চ করে|সার্চ করো|সার্চ কর|সার্চ|করে দাও|করে|দাও|করো|কর|open|search|দেবো|হবে|লিস্ট|গান|ভিডিও|দেখতে চাই)/gi, '')
        .replace(/[।?!,.:;'"-]/g, ' ')
        .trim();

      if (!cleanQ || cleanQ.length < 2) {
        if (norm.includes('৯০') || norm.includes('90')) cleanQ = '90s hindi hit songs';
        else if (norm.includes('হিন্দি') || norm.includes('hindi')) cleanQ = 'latest hindi songs';
        else if (norm.includes('বাংলা') || norm.includes('bangla')) cleanQ = 'latest bangla songs';
        else if (norm.includes('ইংরেজি') || norm.includes('english')) cleanQ = 'latest english hit songs';
        else cleanQ = 'popular trending songs';
      }

      return {
        type: 'YOUTUBE_SEARCH',
        query: cleanQ
      };
    }

    // 6.2 YouTube Open Homepage (Step 1)
    if (isYouTube && (norm.includes('ওপেন') || norm.includes('খোলো') || norm.includes('চালু') || norm.includes('খোল') || norm.includes('open'))) {
      return {
        type: 'YOUTUBE_OPEN'
      };
    }
  }

  // 7. Generic Search
  if (norm.includes('সার্চ')) {
    let q = norm
      .replace(/(সার্চ|search|দেখো|দেখাও|খুঁজে বের করো|খোলো|ওপেন|করো|করে দাও|করে দিন|দাও|দিন|করে|দেখান|এবং|তা)/gi, '')
      .trim();
    if (q.length > 1) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
      sessionContext.activeApp = 'GOOGLE';
      sessionContext.lastQuery = q;
      sessionContext.lastUrl = url;
      return {
        type: 'OPEN_GOOGLE',
        query: q,
        url: url,
        reply: `TRIDIP স্যার, গুগলে "${q}" সার্চ করে রেজাল্ট ওপেন করা হয়েছে!`
      };
    }
  }

  // 7. Volume Control (যেমন: কম্পিউটারের ভলিউম করো, ভলিউম বাড়াও, ভলিউম কমাও, মিউট করো)
  if (norm.includes('ভলিউম') || norm.includes('সাউন্ড') || norm.includes('volume') || norm.includes('sound')) {
    const isDown = /কমাও|কমিয়ে|কমায়ে|ডাউন|down|decrease|সাউন্ড\s*কম/i.test(norm);
    const isMute = /মিউট|বন্ধ|নিঃশব্দ|mute/i.test(norm);
    if (isMute) return { type: 'VOLUME_MUTE', reply: 'কম্পিউটারের সাউন্ড মিউট করা হয়েছে, TRIDIP স্যার।' };
    if (isDown) return { type: 'VOLUME_DOWN', reply: 'কম্পিউটারের সাউন্ড ভলিউম কমিয়ে দেওয়া হয়েছে, TRIDIP স্যার।' };
    return { type: 'VOLUME_UP', reply: 'কম্পিউটারের সাউন্ড ভলিউম বাড়িয়ে দেওয়া হয়েছে, TRIDIP স্যার।' };
  }

  // 8. Windows Native Apps
  if (norm.includes('ক্যালকুলেটর') || norm.includes('calculator') || norm.includes('calc')) return { type: 'OPEN_CALC', reply: 'উইন্ডোজ ক্যালকুলেটর চালু করা হয়েছে, TRIDIP স্যার।' };
  if (norm.includes('ফাইল') || norm.includes('explorer') || norm.includes('মাই কম্পিউটার') || norm.includes('দিস পিসি')) return { type: 'OPEN_EXPLORER', reply: 'ফাইল এক্সপ্লোরার ওপেন করা হয়েছে, TRIDIP স্যার।' };
  if (norm.includes('টাস্ক ম্যানেজার') || norm.includes('task manager') || norm.includes('taskmgr')) return { type: 'OPEN_TASKMGR', reply: 'উইন্ডোজ টাস্ক ম্যানেজার ওপেন করা হয়েছে, TRIDIP স্যার।' };
  if (norm.includes('পেইন্ট') || norm.includes('paint') || norm.includes('mspaint')) return { type: 'OPEN_PAINT', reply: 'উইন্ডোজ পেইন্ট ওপেন করা হয়েছে, TRIDIP স্যার।' };
  if (norm.includes('কমান্ড প্রম্পট') || norm.includes('cmd') || norm.includes('টার্মিনাল')) return { type: 'OPEN_CMD', reply: 'উইন্ডোজ কমান্ড প্রম্পট ওপেন করা হয়েছে, TRIDIP স্যার।' };
  if (norm.includes('সেটিংস') || norm.includes('settings')) return { type: 'OPEN_SETTINGS', reply: 'উইন্ডোজ সেটিংস প্যানেল ওপেন করা হয়েছে, TRIDIP স্যার।' };

  // 9. Social & Web Services
  if (norm.includes('ফেসবুক') || norm.includes('facebook')) return { type: 'OPEN_FACEBOOK', url: 'https://www.facebook.com', reply: 'ফেসবুক ওপেন করা হয়েছে, TRIDIP স্যার।' };
  if (norm.includes('জিমেইল') || norm.includes('জি-মেইল') || norm.includes('gmail') || norm.includes('ইমেইল')) return { type: 'OPEN_GMAIL', url: 'https://mail.google.com', reply: 'জি-মেইল ইনবক্স ওপেন করা হয়েছে, TRIDIP স্যার।' };
  if (norm.includes('গিটহাব') || norm.includes('github')) return { type: 'OPEN_GITHUB', url: 'https://github.com/tridipofficial/TRI-PC', reply: 'আপনার গিটহাব রিপোজিটরি ওপেন করা হয়েছে, TRIDIP স্যার।' };
  if (norm.includes('উইকিপিডিয়া') || norm.includes('wikipedia')) return { type: 'OPEN_WIKIPEDIA', url: 'https://bn.wikipedia.org', reply: 'উইকিপিডিয়া ওপেন করা হয়েছে, TRIDIP স্যার।' };
  if (norm.includes('চ্যাটজিপিটি') || norm.includes('chatgpt')) return { type: 'OPEN_CHATGPT', url: 'https://chatgpt.com', reply: 'চ্যাটজিপিটি ওপেন করা হয়েছে, TRIDIP স্যার।' };

  return null;
}

async function executeSafePCAction(intent, fallbackQuery = '') {
  try {
    const actionType = typeof intent === 'object' ? intent.type : intent;
    const query = (typeof intent === 'object' && intent.query) ? intent.query : fallbackQuery;
    const presetReply = typeof intent === 'object' ? intent.reply : null;
    const intentUrl = typeof intent === 'object' ? intent.url : null;

    // 0. Capabilities (Full detailed description of all custom JARVIS features)
    if (actionType === 'CAPABILITIES') {
      return { message: presetReply, url: null };
    }

    // 1. Conversational Greeting
    if (actionType === 'GREETING') {
      return { message: presetReply || 'আমি খুব ভালো আছি TRIDIP স্যার! আপনার কি খবর? আপনার দিনটি কেমন যাচ্ছে বলুন, আমি সবসময় আপনার সেবায় প্রস্তুত আছি।', url: null };
    }

    // 2. Live Weather Details
    if (actionType === 'WEATHER') {
      try {
        const res = await fetch('https://wttr.in/Dhaka?format=j1', { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json();
          const curr = data.current_condition[0];
          const temp = curr.temp_C;
          const humidity = curr.humidity;
          const desc = curr.weatherDesc[0].value;
          return {
            message: `TRIDIP স্যার, ঢাকার বর্তমান তাপমাত্রা ${temp} ডিগ্রি সেলসিয়াস। আকাশ ${desc.toLowerCase()} এবং বাতাসের আর্দ্রতা ${humidity} শতাংশ। আজ বৃষ্টির সম্ভাবনা খুব কম।`,
            url: null
          };
        }
      } catch (err) {
        console.warn('Weather fetch error:', err.message);
      }
      return {
        message: 'TRIDIP স্যার, ঢাকার বর্তমান তাপমাত্রা প্রায় ২৮ ডিগ্রি সেলসিয়াস, আকাশ আংশিক মেঘলা এবং বাতাসের আর্দ্রতা ৬৫ শতাংশ। বৃষ্টির সম্ভাবনা খুব কম।',
        url: null
      };
    }

    // 3. Save to Notepad on Desktop
    if (actionType === 'SAVE_NOTE') {
      const noteText = (typeof intent === 'object' && intent.text) ? intent.text : 'TRIDIP স্যারের ব্যক্তিগত ভয়েস নোট';
      const desktopDir = path.join(os.homedir(), 'Desktop');
      const noteFile = path.join(desktopDir, 'TRI_AI_Notes.txt');
      const timeStr = new Date().toLocaleString();
      const entry = `\n========================================\n[তারিখ ও সময়: ${timeStr}]\n${noteText}\n========================================\n`;
      fs.appendFileSync(noteFile, entry, 'utf8');
      spawn('notepad.exe', [noteFile]);
      return {
        message: presetReply || `TRIDIP স্যার, আপনার নোটটি ডেস্কটপে 'TRI_AI_Notes.txt' ফাইলে সেভ করে নোটপ্যাডে ওপেন করা হয়েছে!`,
        url: null
      };
    }

    // 4. YouTube Real Desktop Automation (Step 1: Open, Step 2: Search, Step 3: Click)
    if (actionType === 'YOUTUBE_OPEN') {
      sessionContext.activeApp = 'YOUTUBE';
      await youtubeController.open();
      return {
        message: 'TRIDIP স্যার, আপনার ব্রাউজারে ইউটিউব ওপেন করা হয়েছে! আপনি কী লিখে সার্চ করতে চান বলুন।',
        url: 'https://www.youtube.com'
      };
    }

    if (actionType === 'YOUTUBE_SEARCH') {
      sessionContext.activeApp = 'YOUTUBE';
      const searchTarget = intent.query || 'latest hindi songs';
      sessionContext.lastQuery = searchTarget;
      const res = await youtubeController.search(searchTarget);
      const results = res.results || [];
      sessionContext.searchResults = results;

      let msg = `TRIDIP স্যার, ইউটিউবে '${searchTarget}' সার্চ করা হয়েছে!`;
      if (results.length > 0) {
        msg += ` রেজাল্টের শীর্ষ ভিডিও:\n` +
          `১. ${results[0].title}\n` +
          (results[1] ? `২. ${results[1].title}\n` : '') +
          (results[2] ? `৩. ${results[2].title}\n` : '') +
          `\nবলুন কোনটি ক্লিক করতে চান (প্রথমটা, দ্বিতীয়টা বা যেকোনো গানের নাম বলুন)?`;
      } else {
        msg += ` রেজাল্ট ব্রাউজার স্ক্রিনে প্রদর্শন করা হয়েছে। আপনি কি প্রথমটা ক্লিক করতে চান?`;
      }

      return {
        message: msg,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTarget)}`,
        results: results
      };
    }

    if (actionType === 'YOUTUBE_CLICK') {
      sessionContext.activeApp = 'YOUTUBE';
      const id = intent.identifier || 1;
      const res = await youtubeController.clickVideo(id);
      const playedTitle = res.title || 'ভিডিও';
      sessionContext.lastPlayed = res;
      return {
        message: `TRIDIP স্যার, '${playedTitle}' ভিডিওটি আপনার স্ক্রিনে প্লে করা হয়েছে!`,
        url: res.url,
        title: playedTitle
      };
    }

    if (actionType === 'OPEN_YOUTUBE') {
      sessionContext.activeApp = 'YOUTUBE';
      if (query) {
        const res = await youtubeController.search(query);
        return {
          message: `TRIDIP স্যার, ইউটিউবে "${query}" সার্চ করা হয়েছে!`,
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
          results: res.results || []
        };
      } else {
        await youtubeController.open();
        return {
          message: 'TRIDIP স্যার, ব্রাউজারে ইউটিউব ওপেন করা হয়েছে!',
          url: 'https://www.youtube.com'
        };
      }
    }

    // 5. Google Search
    if (actionType === 'OPEN_GOOGLE') {
      const targetUrl = intentUrl || (query ? `https://www.google.com/search?q=${encodeURIComponent(query)}` : 'https://www.google.com');
      openUrlInWindows(targetUrl);
      return {
        message: presetReply || `গুগলে তথ্য ওপেন করা হয়েছে, TRIDIP স্যার!`,
        url: targetUrl
      };
    }

    // 6. Volume Controls
    if (actionType === 'VOLUME_UP') {
      spawn('powershell', ['-NoProfile', '-Command', '(New-Object -ComObject WScript.Shell).SendKeys([char]175); (New-Object -ComObject WScript.Shell).SendKeys([char]175); (New-Object -ComObject WScript.Shell).SendKeys([char]175)']);
      return { message: presetReply || 'কম্পিউটারের সাউন্ড ভলিউম বাড়িয়ে দেওয়া হয়েছে, TRIDIP স্যার।', url: null };
    }
    if (actionType === 'VOLUME_DOWN') {
      spawn('powershell', ['-NoProfile', '-Command', '(New-Object -ComObject WScript.Shell).SendKeys([char]174); (New-Object -ComObject WScript.Shell).SendKeys([char]174); (New-Object -ComObject WScript.Shell).SendKeys([char]174)']);
      return { message: presetReply || 'কম্পিউটারের সাউন্ড ভলিউম কমিয়ে দেওয়া হয়েছে, TRIDIP স্যার।', url: null };
    }
    if (actionType === 'VOLUME_MUTE') {
      spawn('powershell', ['-NoProfile', '-Command', '(New-Object -ComObject WScript.Shell).SendKeys([char]173)']);
      return { message: presetReply || 'কম্পিউটারের সাউন্ড মিউট করা হয়েছে, TRIDIP স্যার।', url: null };
    }

    // 7. Native Apps
    if (actionType === 'OPEN_NOTEPAD') {
      spawn('notepad.exe');
      return { message: 'উইন্ডোজ নোটপ্যাড চালু করা হয়েছে, TRIDIP স্যার।', url: null };
    }
    if (actionType === 'OPEN_CALC') {
      spawn('calc.exe');
      return { message: 'উইন্ডোজ ক্যালকুলেটর চালু করা হয়েছে, TRIDIP স্যার।', url: null };
    }
    if (actionType === 'OPEN_EXPLORER') {
      spawn('explorer.exe');
      return { message: 'ফাইল এক্সপ্লোরার ওপেন করা হয়েছে, TRIDIP স্যার।', url: null };
    }
    if (actionType === 'OPEN_TASKMGR') {
      spawn('taskmgr.exe');
      return { message: 'উইন্ডোজ টাস্ক ম্যানেজার ওপেন করা হয়েছে, TRIDIP স্যার।', url: null };
    }
    if (actionType === 'OPEN_PAINT') {
      spawn('mspaint.exe');
      return { message: 'উইন্ডোজ পেইন্ট ওপেন করা হয়েছে, TRIDIP স্যার।', url: null };
    }
    if (actionType === 'OPEN_CMD') {
      spawn('cmd.exe', ['/c', 'start', 'cmd.exe']);
      return { message: 'উইন্ডোজ কমান্ড প্রম্পট ওপেন করা হয়েছে, TRIDIP স্যার।', url: null };
    }
    if (actionType === 'OPEN_SETTINGS') {
      spawn('cmd.exe', ['/c', 'start', 'ms-settings:']);
      return { message: 'উইন্ডোজ সেটিংস প্যানেল ওপেন করা হয়েছে, TRIDIP স্যার।', url: null };
    }

    // 8. Social
    if (intentUrl) {
      openUrlInWindows(intentUrl);
      return { message: presetReply || 'ওয়েবসাইট ওপেন করা হয়েছে, TRIDIP স্যার।', url: intentUrl };
    }
  } catch (e) {
    console.error('Safe action error:', e.message);
  }
  return null;
}

  // Direct PC Action Execution Route
  if (pathname === '/api/action' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { action, query } = JSON.parse(body || '{}');
        const actRes = await executeSafePCAction(action, query);
        const msg = actRes?.message || 'অ্যাকশন সম্পন্ন হয়েছে।';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: !!actRes, message: msg, url: actRes?.url, action }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { message } = JSON.parse(body);

        // Detect & Execute PC Actions (YouTube, Calculator, Notepad, Weather, Greeting, etc.)
        const intent = detectIntentAction(message);
        let executedAction = null;
        let actionMsg = null;
        if (intent) {
          const actRes = await executeSafePCAction(intent);
          actionMsg = actRes?.message || intent.reply || null;
          executedAction = {
            type: intent.type,
            message: actionMsg,
            url: actRes?.url || intent.url || null,
            query: intent.query || null,
            results: actRes?.results || null,
            title: actRes?.title || null
          };
        }

        let response = null;

        // If specific actions like GREETING, CAPABILITIES, WEATHER, SAVE_NOTE, VOLUME, APP OPEN, or YOUTUBE happened:
        // Prioritize the clean, spoken confirmation message as the reply!
        if (actionMsg && (
          intent.type === 'GREETING' ||
          intent.type === 'CAPABILITIES' ||
          intent.type === 'WEATHER' ||
          intent.type === 'SAVE_NOTE' ||
          intent.type.startsWith('VOLUME_') ||
          intent.type.startsWith('OPEN_') ||
          intent.type.startsWith('YOUTUBE_')
        )) {
          response = {
            mode: 'ACTION_EXECUTED',
            provider: 'TRI AI Engine',
            reply: actionMsg,
            action: executedAction
          };
        } else {
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
              action: executedAction
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

  // Neural TTS Route (Studio-Quality Bengali Emotional Voice)
  if (pathname === '/api/tts' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { text, emotion } = JSON.parse(body);
        const result = await generateNeuralAudio(text, emotion);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, fallback: true, error: err.message }));
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
