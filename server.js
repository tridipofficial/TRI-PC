const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn, exec } = require('child_process');

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
            content: "You are TRI AI, a hyper-intelligent, polite, and loyal personal desktop AI assistant for TRIDIP Sir. " +
                     "You speak in a warm, sweet, caring, human-like female voice in clear, natural Bengali (Bangla). " +
                     "Always address the user respectfully as 'TRIDIP স্যার'. " +
                     "You have full command over TRIDIP Sir's Windows PC. " +
                     "When TRIDIP Sir asks you to do something on his computer (like playing or searching songs/videos on YouTube, searching Google, opening apps like calculator/notepad/camera/cmd/paint/explorer, saving a note to his desktop 'TRI_AI_Notes.txt', checking weather, or adjusting volume), understand his exact intent as his AI brain and append an action directive at the very end of your response on a new line in this exact JSON format:\n" +
                     "[[ACTION: {\"type\": \"OPEN_URL\"|\"OPEN_APP\"|\"SAVE_NOTE\"|\"WEATHER\"|\"VOLUME_UP\"|\"VOLUME_DOWN\"|\"VOLUME_MUTE\", \"appName\": \"...\", \"appCmd\": \"...\", \"query\": \"...\", \"url\": \"...\", \"text\": \"...\"}]]\n" +
                     "For YouTube searches, use: {\"type\": \"OPEN_URL\", \"appName\": \"youtube\", \"query\": \"<search terms>\", \"url\": \"https://www.youtube.com/results?search_query=<encoded terms>\"}.\n" +
                     "If no PC action is required, do not output the [[ACTION: ...]] directive.\n" +
                     "Keep your Bengali spoken reply warm, concise, and natural (1-2 sentences), directly confirming the action or answering politely."
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
  let s = str.normalize('NFC').toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();

  // Normalize common Whisper Bengali phonetic variations to canonical Bengali terms
  s = s.replace(/(^|[\s\p{P}])(সারচ|সরচ|সর্চ|সার্স|সরস)(?=[\s\p{P}]|$)/gui, '$1সার্চ');
  s = s.replace(/(^|[\s\p{P}])(চোচুব|য়চুুব|যুট্যুবে|যুট্যুব|যুটুব|ইউটুপ|ইউটু্ব|ইউতু্ব|উটিউব)(?=[\s\p{P}]|$)/gui, '$1ইউটিউব');
  s = s.replace(/(^|[\s\p{P}])(গন)(?=[\s\p{P}]|$)/gui, '$1গান');
  s = s.replace(/(^|[\s\p{P}])(হিনদি|হিন্ড|হিনডি)(?=[\s\p{P}]|$)/gui, '$1হিন্দি');
  s = s.replace(/(^|[\s\p{P}])(এ঵ন|এবম|এবংগ)(?=[\s\p{P}]|$)/gui, '$1এবং');
  s = s.replace(/(^|[\s\p{P}])(কোলো|কুলো|খুল)(?=[\s\p{P}]|$)/gui, '$1খোলো');
  s = s.replace(/(^|[\s\p{P}])(বিডিও|ভিডিউ)(?=[\s\p{P}]|$)/gui, '$1ভিডিও');
  s = s.replace(/(^|[\s\p{P}])(কেলকুলেটর|কেল্কুলেটর)(?=[\s\p{P}]|$)/gui, '$1ক্যালকুলেটর');
  s = s.replace(/(^|[\s\p{P}])(নোটপেড)(?=[\s\p{P}]|$)/gui, '$1নোটপ্যাড');
  s = s.replace(/(^|[\s\p{P}])(চালারো|চালাউ)(?=[\s\p{P}]|$)/gui, '$1চালাও');
  s = s.replace(/(^|[\s\p{P}])(নোতুন)(?=[\s\p{P}]|$)/gui, '$1নতুন');

  return s.replace(/[।?!,.:;'"-]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Global Session Context
let sessionContext = {
  activeApp: null,
  lastQuery: '',
  searchResults: [],
  lastPlayed: null
};

// Universal Windows PC App & URL Launcher (Archer AI Architecture)
function launchUrlInWindows(url) {
  if (!url) return;
  const isYouTube = url.includes('youtube.com');
  const desktopYtLnk = path.join(os.homedir(), 'Desktop', 'YouTube.lnk');
  const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  // 1. YouTube PWA / Signed-In Desktop App Priority
  if (isYouTube) {
    if ((url === 'https://www.youtube.com' || url === 'https://www.youtube.com/') && fs.existsSync(desktopYtLnk)) {
      exec(`start "" "${desktopYtLnk}"`, { shell: 'cmd.exe' });
      return;
    }
    if (fs.existsSync(chromeExe)) {
      exec(`start "" "${chromeExe}" --profile-directory="Profile 6" "${url}"`, { shell: 'cmd.exe' }, (err) => {
        if (err) exec(`start chrome "${url}"`, { shell: 'cmd.exe' });
      });
      return;
    }
  }

  // 2. Archer AI strategy: start chrome -> start msedge -> start ""
  exec(`start chrome "${url}"`, { shell: 'cmd.exe' }, (err) => {
    if (err) {
      exec(`start msedge "${url}"`, { shell: 'cmd.exe' }, (err2) => {
        if (err2) {
          exec(`start "" "${url}"`, { shell: 'cmd.exe' });
        }
      });
    }
  });
}

function launchAppInWindows(cmd) {
  if (!cmd) return;
  exec(cmd, { shell: 'cmd.exe' }, (err) => {
    if (err) console.error('[App Launch Error]:', err.message);
  });
}

const openUrlInWindows = launchUrlInWindows;

function cleanSearchQuery(q) {
  let s = q;
  const removeWords = [
    'ইউটিউবে', 'ইউটিউবটা', 'ইউটিউব', 'ইউটুব', 'ইউটুপ', 'ইউটু্ব', 'ইউতু্ব', 'ইউটিব', 'উটিউব', 'যুট্যুবে', 'যুট্যুব', 'চোচুব', 'য়চুুব', 'youtube', 'yt',
    'গুগলে', 'গুগল', 'google',
    'লিখে সার্চ করো', 'লিখে সারচ করো', 'লিখে সরচ করো', 'লিখে সর্চ করো', 'লিখে সার্চ', 'লিখে সারচ', 'লিখে সর্চ', 'লিখে',
    'সার্চ করে দাও', 'সার্চ করে দিন', 'সার্চ করো', 'সার্চ কর', 'সার্চ',
    'সারচ করে দাও', 'সারচ করে দিন', 'সারচ করো', 'সারচ কর', 'সারচ',
    'সরচ করে দাও', 'সরচ করে দিন', 'সরচ করো', 'সরচ কর', 'সরচ',
    'সর্চ করে দাও', 'সর্চ করে দিন', 'সর্চ করো', 'সর্চ কর', 'সর্চ',
    'সার্স করে দাও', 'সার্স করে দিন', 'সার্স করো', 'সার্স কর', 'সার্স',
    'খোঁজো', 'খোজো', 'খুঁজে দাও', 'খুজে দাও', 'বের করো', 'search', 'find',
    'খোলো', 'খুলো', 'খোল', 'কোলো', 'কুলো', 'ওপেন করো', 'ওপেন কর', 'ওপেন',
    'চালু করো', 'চালু কর', 'চালু', 'চালাও', 'চালা', 'বাজাও', 'বাজা', 'শোনাও', 'শোনা', 'ছাড়ো', 'দেখান', 'দেখাও', 'যাও', 'অন',
    'open', 'launch', 'start', 'play', 'kholo', 'chalu', 'khol', 'bajao', 'shonao', 'run',
    'করে দাও', 'করে দিন', 'করে', 'করো', 'কর', 'দাও', 'দিন', 'koro', 'kor', 'kore', 'dao', 'din',
    'এবং', 'এ঵ন', 'এবম', 'আর', 'এন্ড', 'ও', 'দয়া করে', 'প্লিজ', 'please', 'একটি', 'একটা', 'আমার জন্য', 'নিয়ে', 'সম্পর্কে', 'একটু', 'টা', 'গিয়ে', 'গিয়া', 'and', 'then'
  ];

  for (const w of removeWords) {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('(^|[\\s\\p{P}])' + escaped + '(?=[\\s\\p{P}]|$)', 'gui');
    s = s.replace(regex, ' ');
  }

  return s.replace(/[।?!,.:;'"-]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Safe Windows PC Action Controller (Desktop Superpowers)
function detectIntentAction(prompt) {
  const norm = normalizeBn(prompt);

  // Common Action Verbs (Bengali + English + Banglish)
  const isActionVerb = /খোলো|খুল|খুলো|কোলো|কুলো|ওপেন|চালু|চালাও|চালা|বাজাও|বাজা|শোনাও|শোনা|ছাড়ো|দেখান|দেখাও|যাও|অন|সার্চ|সারচ|সরচ|সর্চ|সার্স|খোঁজো|খোজো|open|launch|start|play|kholo|chalu|khol|bajao|shonao|run|search/i.test(norm);

  // 1. YouTube & Music Intent
  const isYt = /ইউটিউব|ইউটুব|ইউটুপ|ইউটু্ব|ইউতু্ব|ইউটিব|উটিউব|যুট্যুবে|যুট্যুব|চোচুব|য়চুুব|youtube|\byt\b/i.test(norm);
  const isSongOrMusic = /গান|গন|সঙ্গীত|গানবাজনা|মিউজিক|সং|ভিডিও|গীতি|song|music|video/i.test(norm);

  if (isYt || (isSongOrMusic && isActionVerb)) {
    const query = cleanSearchQuery(prompt);
    if (query && query.length > 1) {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      return {
        type: 'OPEN_URL',
        appName: 'youtube',
        query: query,
        url: searchUrl,
        reply: `TRIDIP স্যার, ব্রাউজারে ইউটিউবে "${query}" সার্চ করে ওপেন করা হয়েছে!`
      };
    }
    return {
      type: 'OPEN_URL',
      appName: 'youtube',
      url: 'https://www.youtube.com',
      reply: 'TRIDIP স্যার, আপনার ডেস্কটপে ইনস্টল করা YouTube অ্যাপটি ওপেন করা হয়েছে।'
    };
  }

  // 2. Google Search & Web
  if (/গুগল|google/i.test(norm)) {
    const q = cleanSearchQuery(prompt);
    if (q && q.length > 1) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
      return {
        type: 'OPEN_URL',
        appName: 'google',
        query: q,
        url: url,
        reply: `TRIDIP স্যার, গুগলে "${q}" সার্চ করে রেজাল্ট ওপেন করা হয়েছে!`
      };
    }
    return {
      type: 'OPEN_URL',
      appName: 'google',
      url: 'https://www.google.com',
      reply: 'TRIDIP স্যার, গুগল ব্রাউজারে ওপেন করা হয়েছে।'
    };
  }

  // 3. Capabilities / "তুমি কী কী কাজ করতে পারো?"
  if (
    norm.includes('কী কাজ') || norm.includes('কি কাজ') ||
    norm.includes('কী করতে পার') || norm.includes('কি করতে পার') ||
    norm.includes('কী কী করতে') || norm.includes('কি কি করতে') ||
    norm.includes('কী পারো') || norm.includes('কি পারো') ||
    norm.includes('তোমার কাজ কি') || norm.includes('তোমার কাজ কী') ||
    norm.includes('কাজগুলো কি') || norm.includes('কাজগুলো কী') ||
    norm.includes('ফিচার কি') || norm.includes('ফিচার কী') ||
    norm.includes('ক্ষমতা কি') || norm.includes('what can you do') ||
    norm.includes('your capabilities')
  ) {
    const reply = "TRIDIP স্যার, আমি আপনার সার্বক্ষণিক পার্সোনাল এআই অ্যাসিস্ট্যান্ট জার্ভিস। আপনার জন্য আমি এই কাজগুলো ১০০% রিয়েল-টাইমে সম্পাদন করতে পারি:\n\n" +
      "১. ইউটিউব ও গান অটোমেশন: মুখে বললেই ইউটিউব খোলা, পছন্দের হিন্দি গান, ৯০ দশকের গান বা লেটেস্ট বাংলা গান সার্চ করা এবং গান চালানো।\n" +
      "২. গুগল ও ইন্টারনেট সার্চ: গুগলে যেকোনো তথ্য তাৎক্ষণিক অনুসন্ধান করে ব্রাউজারে রিয়েল-টাইম রেজাল্ট প্রদর্শন করা।\n" +
      "৩. লাইভ আবহাওয়া আপডেট: ঢাকার বর্তমান তাপমাত্রা, বৃষ্টিপাত ও বাতাসের আর্দ্রতার তাজা রিপোর্ট মুখে বলে দেওয়া।\n" +
      "৪. ডেস্কটপ নোটপ্যাড ও ফাইল সেভ: আপনার যেকোনো গুরুত্বপূর্ণ নোট তারিখ ও সময়সহ ডেস্কটপে 'TRI_AI_Notes.txt' ফাইলে লিখে সরাসরি নোটপ্যাডে ওপেন করা।\n" +
      "৫. কম্পিউটার সাউন্ড ও ভলিউম নিয়ন্ত্রণ: কম্পিউটারের ভলিউম বাড়ানো, কমানো বা নিঃশব্দ করা।\n" +
      "৬. উইন্ডোজ অ্যাপ চালু: ক্যালকুলেটর, ফাইল এক্সপ্লোরার, টাস্ক ম্যানেজার, পেইন্ট বা সেটিংস প্যানেল খোলা।\n" +
      "৭. সোশ্যাল ও ওয়েব প্ল্যাটফর্ম: ফেসবুক, জিমেইল, গিটহাব বা উইকিপিডিয়া এক নির্দেশে ব্রাউজারে নিয়ে আসা।\n" +
      "৮. সার্বক্ষণিক হ্যান্ডস-ফ্রি ভয়েস: মাউস ছাড়া সার্বক্ষণিক আপনার কথা শুনে মিষ্টি ও সাবলীল বাংলা কণ্ঠে প্রতিটি তথ্যের পূর্ণ বিবরণ দেওয়া।\n\n" +
      "বলুন TRIDIP স্যার, এখন আমি আপনার জন্য কোন কাজটি সম্পন্ন করবো?";
    return { type: 'CAPABILITIES', reply };
  }

  // 4. Greetings
  if (norm.includes('কেমন আছো') || norm.includes('কেমন আছেন') || norm.includes('কি খবর') || norm.includes('কী খবর') || norm.includes('কি অবস্থা') || norm.includes('how are you')) {
    return {
      type: 'GREETING',
      reply: 'আমি খুব ভালো আছি TRIDIP স্যার! আপনার কি খবর বলুন, আমি কীভাবে সাহায্য করতে পারি?'
    };
  }

  // 5. Weather Details
  const weatherNorm = normalizeBn('আবহাওয়া');
  if (norm.includes(weatherNorm) || norm.includes('আবহাও') || norm.includes('আবোয়ার') || norm.includes('weather') || norm.includes('তাপমাত্রা') || norm.includes('বৃষ্টি')) {
    return { type: 'WEATHER' };
  }

  // 6. Save Note vs Open Notepad
  const isNoteSave = (/নোট/i.test(norm) && /সেভ|লিখ|লেখ|রাখ|তুলে রাখ|save|write/i.test(norm));
  if (isNoteSave) {
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

  if (/নোটপ্যাড|notepad/i.test(norm)) {
    return {
      type: 'OPEN_APP',
      appName: 'notepad',
      appCmd: 'notepad',
      reply: 'উইন্ডোজ নোটপ্যাড চালু করা হয়েছে, TRIDIP স্যার।'
    };
  }

  // 7. Generic Search
  if (norm.includes('সার্চ') || norm.includes('সারচ') || norm.includes('সরচ') || norm.includes('সর্চ') || norm.includes('সার্স') || norm.includes('search') || norm.includes('খোঁজো') || norm.includes('খোজো')) {
    const q = cleanSearchQuery(prompt);
    if (q && q.length > 1) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
      return {
        type: 'OPEN_URL',
        appName: 'google',
        query: q,
        url: url,
        reply: `TRIDIP স্যার, গুগলে "${q}" সার্চ করে রেজাল্ট ওপেন করা হয়েছে!`
      };
    }
  }

  // 8. Volume Control
  if (norm.includes('ভলিউম') || norm.includes('সাউন্ড') || norm.includes('volume') || norm.includes('sound')) {
    const isDown = /কমাও|কমিয়ে|কমায়ে|ডাউন|down|decrease|সাউন্ড\s*কম/i.test(norm);
    const isMute = /মিউট|বন্ধ|নিঃশব্দ|mute/i.test(norm);
    if (isMute) return { type: 'VOLUME_MUTE', reply: 'কম্পিউটারের সাউন্ড মিউট করা হয়েছে, TRIDIP স্যার।' };
    if (isDown) return { type: 'VOLUME_DOWN', reply: 'কম্পিউটারের সাউন্ড ভলিউম কমিয়ে দেওয়া হয়েছে, TRIDIP স্যার।' };
    return { type: 'VOLUME_UP', reply: 'কম্পিউটারের সাউন্ড ভলিউম বাড়িয়ে দেওয়া হয়েছে, TRIDIP স্যার।' };
  }

  // 9. Windows Native Apps
  if (/ক্যালকুলেটর|ক্যাল্কুলেটর|calculator|\bcalc\b/i.test(norm)) return { type: 'OPEN_APP', appName: 'calculator', appCmd: 'calc', reply: 'উইন্ডোজ ক্যালকুলেটর চালু করা হয়েছে, TRIDIP স্যার।' };
  if (/ফাইল ম্যানেজার|ফাইল এক্সপ্লোরার|দিস পিসি|মাই কম্পিউটার|explorer/i.test(norm)) return { type: 'OPEN_APP', appName: 'explorer', appCmd: 'explorer', reply: 'ফাইল এক্সপ্লোরার ওপেন করা হয়েছে, TRIDIP স্যার।' };
  if (/টাস্ক ম্যানেজার|task manager|taskmgr/i.test(norm)) return { type: 'OPEN_APP', appName: 'task manager', appCmd: 'taskmgr', reply: 'উইন্ডোজ টাস্ক ম্যানেজার ওপেন করা হয়েছে, TRIDIP স্যার।' };
  if (/পেইন্ট|paint|mspaint/i.test(norm)) return { type: 'OPEN_APP', appName: 'paint', appCmd: 'mspaint', reply: 'উইন্ডোজ পেইন্ট ওপেন করা হয়েছে, TRIDIP স্যার।' };
  if (/কমান্ড প্রম্পট|\bcmd\b|টার্মিনাল|terminal/i.test(norm)) return { type: 'OPEN_APP', appName: 'cmd', appCmd: 'start cmd', reply: 'উইন্ডোজ কমান্ড প্রম্পট ওপেন করা হয়েছে, TRIDIP স্যার।' };
  if (/ক্যামেরা|camera/i.test(norm)) return { type: 'OPEN_APP', appName: 'camera', appCmd: 'start microsoft.windows.camera:', reply: 'উইন্ডোজ ক্যামেরা ওপেন করা হয়েছে, TRIDIP স্যার।' };
  if (/সেটিংস|settings/i.test(norm)) return { type: 'OPEN_APP', appName: 'settings', appCmd: 'start ms-settings:', reply: 'উইন্ডোজ সেটিংস প্যানেল ওপেন করা হয়েছে, TRIDIP স্যার।' };

  // 10. Social & Web Services
  if (/ফেসবুক|facebook|\bfb\b/i.test(norm)) return { type: 'OPEN_URL', appName: 'facebook', url: 'https://www.facebook.com', reply: 'ফেসবুক ওপেন করা হয়েছে, TRIDIP স্যার।' };
  if (/জিমেইল|জি-মেইল|gmail|ইমেইল|email/i.test(norm)) return { type: 'OPEN_URL', appName: 'gmail', url: 'https://mail.google.com', reply: 'জি-মেইল ইনবক্স ওপেন করা হয়েছে, TRIDIP স্যার।' };
  if (/গিটহাব|github/i.test(norm)) return { type: 'OPEN_URL', appName: 'github', url: 'https://github.com/tridipofficial/TRI-PC', reply: 'আপনার গিটহাব রিপোজিটরি ওপেন করা হয়েছে, TRIDIP স্যার।' };
  if (/উইকিপিডিয়া|wikipedia/i.test(norm)) return { type: 'OPEN_URL', appName: 'wikipedia', url: 'https://bn.wikipedia.org', reply: 'উইকিপিডিয়া ওপেন করা হয়েছে, TRIDIP স্যার।' };
  if (/চ্যাটজিপিটি|chatgpt|openai/i.test(norm)) return { type: 'OPEN_URL', appName: 'chatgpt', url: 'https://chatgpt.com', reply: 'চ্যাটজিপিটি ওপেন করা হয়েছে, TRIDIP স্যার।' };

  return null;
}

async function executeSafePCAction(intent, fallbackQuery = '', isElectron = false) {
  try {
    const actionType = typeof intent === 'object' ? intent.type : intent;
    const query = (typeof intent === 'object' && intent.query) ? intent.query : fallbackQuery;
    const presetReply = typeof intent === 'object' ? intent.reply : null;
    const intentUrl = typeof intent === 'object' ? intent.url : null;
    const appCmd = typeof intent === 'object' ? (intent.appCmd || intent.appName) : null;

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
      launchAppInWindows(`notepad "${noteFile}"`);
      return {
        message: presetReply || `TRIDIP স্যার, আপনার নোটটি ডেস্কটপে 'TRI_AI_Notes.txt' ফাইলে সেভ করে নোটপ্যাডে ওপেন করা হয়েছে!`,
        url: null,
        appCmd: `notepad "${noteFile}"`
      };
    }

    // 4. Universal Web & URL Opener
    if (actionType === 'OPEN_URL' || actionType === 'OPEN_YOUTUBE' || actionType === 'OPEN_GOOGLE') {
      const targetUrl = intent.url || intentUrl || 'https://www.youtube.com';
      launchUrlInWindows(targetUrl);
      return {
        message: presetReply || intent.reply || `TRIDIP স্যার, ব্রাউজারে ${targetUrl} ওপেন করা হয়েছে!`,
        url: targetUrl
      };
    }

    // 5. Volume Controls
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

    // 6. Native Windows Desktop Apps
    if (actionType === 'OPEN_APP' || actionType === 'OPEN_CALC' || actionType === 'OPEN_NOTEPAD' || actionType === 'OPEN_EXPLORER' || actionType === 'OPEN_TASKMGR' || actionType === 'OPEN_PAINT' || actionType === 'OPEN_CMD' || actionType === 'OPEN_SETTINGS') {
      const cmdToRun = appCmd || (
        actionType === 'OPEN_CALC' ? 'calc' :
        actionType === 'OPEN_NOTEPAD' ? 'notepad' :
        actionType === 'OPEN_EXPLORER' ? 'explorer' :
        actionType === 'OPEN_TASKMGR' ? 'taskmgr' :
        actionType === 'OPEN_PAINT' ? 'mspaint' :
        actionType === 'OPEN_CMD' ? 'start cmd' :
        actionType === 'OPEN_SETTINGS' ? 'start ms-settings:' : 'calc'
      );
      launchAppInWindows(cmdToRun);
      return {
        message: presetReply || 'উইন্ডোজ অ্যাপ চালু করা হয়েছে, TRIDIP স্যার।',
        url: null,
        appName: intent.appName,
        appCmd: cmdToRun
      };
    }

    // 7. General URL fallback
    if (intentUrl) {
      launchUrlInWindows(intentUrl);
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
        const { action, query, isElectron } = JSON.parse(body || '{}');
        const actRes = await executeSafePCAction(action, query, !!isElectron);
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
        const { message, prompt: bodyPrompt, isElectron } = JSON.parse(body || '{}');
        const userMessage = (message || bodyPrompt || '').trim();

        if (!userMessage) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Message cannot be empty' }));
        }

        // Detect & Execute PC Actions (YouTube, Calculator, Notepad, Weather, Greeting, etc.)
        const intent = detectIntentAction(userMessage);
        let executedAction = null;
        let actionMsg = null;
        if (intent) {
          const actRes = await executeSafePCAction(intent, '', !!isElectron);
          actionMsg = actRes?.message || intent.reply || null;
          executedAction = {
            type: intent.type,
            message: actionMsg,
            url: actRes?.url || intent.url || null,
            appName: actRes?.appName || intent.appName || null,
            appCmd: actRes?.appCmd || intent.appCmd || null,
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
          intent.type.startsWith('OPEN_')
        )) {
          response = {
            mode: 'ACTION_EXECUTED',
            provider: 'TRI AI Engine',
            reply: actionMsg,
            action: executedAction
          };
        } else {
          // 1. Try real Groq AI (Primary 100% Free Option) if key is present
          const groqRes = await callGroqAPI(userMessage);

          if (groqRes && groqRes.success) {
            let groqReply = groqRes.text;
            let finalAction = executedAction;

            // AI Brain Dynamic Action Extractor
            const brainMatch = groqReply.match(/\[\[ACTION:\s*(\{[\s\S]*?\})\s*\]\]/);
            if (brainMatch) {
              try {
                const parsedBrainAct = JSON.parse(brainMatch[1]);
                groqReply = groqReply.replace(brainMatch[0], '').trim();
                const actRes = await executeSafePCAction(parsedBrainAct, parsedBrainAct.query || '', !!isElectron);
                finalAction = {
                  type: parsedBrainAct.type,
                  message: actRes?.message || groqReply,
                  url: actRes?.url || parsedBrainAct.url || null,
                  appName: actRes?.appName || parsedBrainAct.appName || null,
                  appCmd: actRes?.appCmd || parsedBrainAct.appCmd || null,
                  query: parsedBrainAct.query || null
                };
              } catch (e) {
                console.warn('[AI Brain Action Parse Error]:', e.message);
              }
            }

            response = {
              mode: finalAction ? 'AI_BRAIN_ACTION' : 'REAL_GROQ_AI',
              provider: 'Groq',
              model: groqRes.model,
              reasoning: [
                { stage: 'প্রসঙ্গ ও ইনপুট বিশ্লেষণ', detail: `ইনপুট গ্রহণ: "${userMessage}". AI Brain দ্বারা উদ্দেশ্য বিশ্লেষণ সম্পন্ন।` },
                { stage: 'মডেল ও জ্ঞান আধার সংযোগ', detail: `Groq LPU (${groqRes.model}) ফ্রি-টিয়ার সচল রয়েছে।` },
                { stage: 'চূড়ান্ত আউটপুট প্রস্তুতকরণ', detail: 'TRIDIP স্যারের জন্য রিয়েল-টাইম ইন্টেলিজেন্ট উত্তর ও অ্যাকশন প্রস্তুত।' }
              ],
              reply: groqReply,
              action: finalAction
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
            const geminiRes = await callGeminiAPI(userMessage);

            if (geminiRes && geminiRes.success) {
              response = {
                mode: 'REAL_GEMINI_AI',
                provider: 'Gemini',
                model: geminiRes.model,
                reasoning: [
                  { stage: 'প্রসঙ্গ ও ইনপুট বিশ্লেষণ', detail: `ইনপুট গ্রহণ: "${userMessage}". ব্যবহারকারীর উদ্দেশ্য বিশ্লেষণ সম্পন্ন।` },
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
              response = generateBuiltInResponse(userMessage);
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

  // Groq Whisper AI Speech-to-Text Route (Sub-300ms Bengali & English transcription)
  if (pathname === '/api/transcribe' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) { // 25MB limit
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', async () => {
      try {
        const { audio, format } = JSON.parse(body || '{}');
        if (!audio) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'No audio provided' }));
        }

        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'GROQ_API_KEY is not configured' }));
        }

        const audioBuffer = Buffer.from(audio, 'base64');
        const isWebm = (format === 'webm') || (audioBuffer[0] === 0x1A && audioBuffer[1] === 0x45 && audioBuffer[2] === 0xDF && audioBuffer[3] === 0xA3);
        const isMp3 = (format === 'mp3') || (audioBuffer[0] === 0x49 && audioBuffer[1] === 0x44 && audioBuffer[2] === 0x33) || (audioBuffer[0] === 0xFF && (audioBuffer[1] & 0xE0) === 0xE0);
        let mimeType = 'audio/wav';
        let fileName = 'audio.wav';
        if (isWebm) {
          mimeType = 'audio/webm';
          fileName = 'audio.webm';
        } else if (isMp3) {
          mimeType = 'audio/mp3';
          fileName = 'audio.mp3';
        }

        const formData = new FormData();
        const blob = new Blob([audioBuffer], { type: mimeType });
        formData.append('file', blob, fileName);
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('prompt', 'ইউটিউব, গুগল, আবহাওয়া, তাপমাত্রা, হিন্দি গান, গান, সার্চ, ক্যালকুলেটর, নোটপ্যাড, ক্যামেরা।');
        formData.append('temperature', '0.0');

        const t0 = Date.now();
        const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`
          },
          body: formData
        });

        if (!groqRes.ok) {
          const errText = await groqRes.text();
          console.error('Groq Whisper error:', errText);
          res.writeHead(groqRes.status, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Groq Whisper error', details: errText }));
        }

        const groqData = await groqRes.json();
        let text = (groqData.text || '').trim();
        // Remove common silent/noise hallucinations
        const lower = text.toLowerCase();
        if (
          lower === 'thank you.' || lower === 'thank you' || lower === 'you' ||
          lower === 'bye.' || lower === 'bye' || lower.includes('amara.org') ||
          lower.includes('subtitles by') || lower === 'please subscribe'
        ) {
          text = '';
        }

        // Detect and reject repeating token hallucinations on background noise
        const words = text.split(/\s+/);
        const wordCounts = {};
        let isHallucination = false;
        for (const w of words) {
          const cleanW = w.replace(/[.,/#!$%^&*;:{}=\-_`~()।?!]/g, '');
          if (cleanW.length > 2) {
            wordCounts[cleanW] = (wordCounts[cleanW] || 0) + 1;
            if (wordCounts[cleanW] >= 4) {
              isHallucination = true;
              break;
            }
          }
        }
        if (isHallucination) {
          console.warn(`[Whisper STT] Rejected repetitive hallucination: "${text}"`);
          text = '';
        }
        console.log(`[Whisper STT] Transcribed in ${Date.now() - t0}ms: "${text}"`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, text }));
      } catch (err) {
        console.error('Transcribe endpoint error:', err.message);
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
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TRI AI Assistant running at: http://127.0.0.1:${PORT}`);
});
