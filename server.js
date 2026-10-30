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
                     "When TRIDIP Sir asks any question (general knowledge, science, geography, history, technology, coding, everyday advice, or conversation), answer like a real intelligent human: thoroughly, clearly, accurately, and politely in natural Bengali. For example, if he asks 'বাংলাদেশের রাজধানীর নাম কী? এটা কী জন্য বিখ্যাত?', answer directly and informatively: 'TRIDIP স্যার, বাংলাদেশের রাজধানীর নাম ঢাকা। ঢাকা তার চারশত বছরের সমৃদ্ধ ইতিহাস, ঐতিহাসিক মোগল স্থাপত্য (যেমন লালবাগ কেল্লা, আহসান মঞ্জিল), মসজিদ ও উৎসবমুখর ঐতিহ্য এবং ঐতিহ্যবাহী মসলিন ও জামদানির জন্য বিশ্ববিখ্যাত।' " +
                     "When TRIDIP Sir asks you to do something on his computer (like playing or searching songs/videos on YouTube, searching Google, opening apps like calculator/notepad/camera/cmd/paint/explorer, saving a note to his desktop 'TRI_AI_Notes.txt', checking weather, or adjusting volume), understand his exact intent as his AI brain and append an action directive at the very end of your response on a new line in this exact JSON format:\n" +
                     "[[ACTION: {\"type\": \"OPEN_URL\"|\"OPEN_APP\"|\"SAVE_NOTE\"|\"WEATHER\"|\"VOLUME_UP\"|\"VOLUME_DOWN\"|\"VOLUME_MUTE\", \"appName\": \"...\", \"appCmd\": \"...\", \"query\": \"...\", \"url\": \"...\", \"text\": \"...\"}]]\n" +
                     "For YouTube searches, use: {\"type\": \"YOUTUBE_SEARCH\", \"appName\": \"youtube\", \"query\": \"<search terms>\", \"url\": \"https://www.youtube.com/results?search_query=<encoded terms>\"}.\n" +
                     "If no PC action or explicit command was requested by TRIDIP Sir, answer conversationally and do NOT output the [[ACTION: ...]] directive.\n" +
                     "Keep your Bengali spoken reply natural, polite, engaging, and directly responsive to what TRIDIP Sir asked."
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
        res.setEncoding('utf8');
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
        res.setEncoding('utf8');
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

// Universal Banglish, Transliteration & Phonetic Normalizer to Clean Bengali
function normalizeBanglishToBengali(raw) {
  if (!raw) return '';
  let s = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.normalize('NFC');
  s = s.replace(/ð/gi, 'd').replace(/Ð/g, 'D');
  s = s.replace(/þ/gi, 'th').replace(/Þ/g, 'Th');
  s = s.replace(/[-_]/g, ' ');
  s = s.replace(/[.,:;।?!]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();

  // 1. Compound Transliterated & Banglish Phrases
  s = s.replace(/\b(?:jutid|yutid)\s*(?:kolo|kholo|open|opin)\s*(?:evan|ebong|and|r|ar)\s*(?:salskora|sars|search)\s*(?:hindi|hindí)\s*(?:svanglyki|gaan|gan|song)\b/gi, 'YouTube খোলো এবং সার্চ করো হিন্দি গান');
  s = s.replace(/\byoutube\s*(?:opin|open|oppen|kolo|kholo|chalu)\s*(?:koro|kor)?\b/gi, 'YouTube ওপেন করো');
  s = s.replace(/\bgoogle\s*(?:opin|open|oppen|kolo|kholo|chalu)\s*(?:koro|kor)?\b/gi, 'Google ওপেন করো');
  s = s.replace(/\b(?:indigan|hindi\s*gaan|hindi\s*gan|hindi\s*song|hindi\s*songs|hindisongs|hindi\s*গানস)\b/gi, 'হিন্দি গান');
  s = s.replace(/\b(?:banglagan|bangla\s*gaan|bangla\s*gan|bangla\s*song|bangla\s*songs|bangla\s*গানস)\b/gi, 'বাংলা গান');
  s = s.replace(/\b(?:likja|likhe|likhi|lekho|likh)\b/gi, 'লিখে');
  s = s.replace(/\b(?:sars|salskora|search|sarce|sarch|sarc)\s*(?:koro|kor)?\b/gi, 'সার্চ করো');
  
  // 2. Action verbs
  s = s.replace(/\b(?:kholo|khol|kolo|kul|khul|khulo)\s*(?:koro|kor)?\b/gi, 'খোলো');
  s = s.replace(/\b(?:open|opin|oppen)\s*(?:koro|kor)?\b/gi, 'ওপেন করো');
  s = s.replace(/\b(?:chalu|start|launch)\s*(?:koro|kor)?\b/gi, 'চালু করো');
  s = s.replace(/\b(?:koro|kor|kora)\b/gi, 'করো');
  s = s.replace(/\b(?:ar|aar|r)\b/gi, 'আর');
  s = s.replace(/\b(?:ebong|evan|ebom|and)\b/gi, 'এবং');

  // 3. Brands
  s = s.replace(/\b(?:youtube|yt|jutid|yutid)\b/gi, 'YouTube');
  s = s.replace(/\b(?:google|gogol)\b/gi, 'Google');
  s = s.replace(/\b(?:facebook|fb)\b/gi, 'Facebook');
  s = s.replace(/\b(?:gmail|g-mail)\b/gi, 'Gmail');
  s = s.replace(/\b(?:github)\b/gi, 'GitHub');
  s = s.replace(/\b(?:wikipedia)\b/gi, 'Wikipedia');
  s = s.replace(/\b(?:chatgpt)\b/gi, 'ChatGPT');
  
  // 4. Media & Languages
  s = s.replace(/\b(?:bangla|bengali|bangali)\b/gi, 'বাংলা');
  s = s.replace(/\b(?:hindi|hindí)\b/gi, 'হিন্দি');
  s = s.replace(/\b(?:gaan|gan|song|songs|svanglyki)\b/gi, 'গান');
  s = s.replace(/\b(?:video|vedio|vidio)\b/gi, 'ভিডিও');
  
  // 5. Apps & Utilities & Cities
  s = s.replace(/\b(?:hunar\s*og|hunar|kolnar|kulnar|kholnar|khulnar|kólnar|kúlnar|húnar)\b/gi, 'খুলনার');
  s = s.replace(/\b(?:kolna|kulna|kholna|khulna|kólna|kúlna)\b/gi, 'খুলনা');
  s = s.replace(/\b(?:dhakar|dakar)\b/gi, 'ঢাকার');
  s = s.replace(/\b(?:dhaka|daka)\b/gi, 'ঢাকা');
  s = s.replace(/\b(?:ctg|chittagong|chattogram)\b/gi, 'চট্টগ্রাম');
  s = s.replace(/\b(?:kalkuletor|calculeter|calc|calculator)\b/gi, 'ক্যালকুলেটর');
  s = s.replace(/\b(?:nogbed|notbed|notepad|noteped)\b/gi, 'নোটপ্যাড');
  s = s.replace(/\b(?:camera|kamera)\b/gi, 'ক্যামেরা');
  s = s.replace(/\b(?:weather|abohawa|abawa|tapmatra|af\s*ovar|af\s*óvar|bad\s*er|thad\s*er|þad\s*er|það\s*er|fotti\s*a|fótti\s*á|vosta\s*bolu|vosta\s*bólu)\b/gi, 'আবহাওয়া');
  s = s.replace(/\b(?:afstakir|vottumannig|bottumannir|erdad|erðað|report|riport)\b/gi, 'রিপোর্ট');
  s = s.replace(/\b(?:details|detail)\b/gi, 'ডিটেইলস');
  s = s.replace(/\b(?:khobor|khobr|kki|ki\s*khobor)\b/gi, 'কি খবর');
  s = s.replace(/\b(?:dao|din)\b/gi, 'দাও');
  
  // 6. Conversational Banglish
  s = s.replace(/\b(?:sound|volume|shound)\b/gi, 'সাউন্ড');
  s = s.replace(/\b(?:barao|baraw|up|increase)\b/gi, 'বাড়িয়ে দাও');
  s = s.replace(/\b(?:komao|komaw|down|decrease)\b/gi, 'কমিয়ে দাও');
  s = s.replace(/\b(?:tomar|tumar)\b/gi, 'তোমার');
  s = s.replace(/\b(?:kaj|kaaj|kaach)\b/gi, 'কাজ');
  s = s.replace(/\b(?:ki|kee|kya)\b/gi, 'কি');
  s = s.replace(/\b(?:kemon|kemn)\s*(?:acho|aso)\b/gi, 'কেমন আছো');
  s = s.replace(/\b(?:kemon|kemn)\b/gi, 'কেমন');
  s = s.replace(/\b(?:koto|kto)\b/gi, 'কত');
  s = s.replace(/\b(?:boloto|bolo)\b/gi, 'বলো');

  // 7. Bengali Whisper & Speech Phonetic Cleanup
  // Action verbs (open, play, etc.)
  s = s.replace(/(^|[\s\p{P}])(ওপিন|উপিন|উপইন|ওপপেন|ওপেনিং|ওফন|ওফিন|ওফেন|অপেন|অপিন)(?=[\s\p{P}]|$)/gui, '$1ওপেন');
  s = s.replace(/(^|[\s\p{P}])(খুল|খুলো|কোলো|কুলো|খোল)(?=[\s\p{P}]|$)/gui, '$1খোলো');
  // YouTube phonetic variants
  s = s.replace(/(^|[\s\p{P}])(যোট্যোপ|যোট্যুপ|যোটুপ|যূটুপ|যুছুব|যুচুব|ঘোট্রপ|ঘোটোপ|ইয়ায়োটুপ|ইয়ায়োটুপ|ইয়াইউটুব|ইয়াইউটুব|ইয়ায়ুটিউব|ইয়ায়ুটিউব|যুতিউব|যুতুব|যুচ্যুব|চোচুব|য়চুুব|যুট্যুবে|যুট্যুব|যুটুব|ইউটুপ|ইউটুব|উটিউব|উতুব|উতিউব|ইউটিব)(?=[\s\p{P}]|$)/gui, '$1YouTube');
  // PDF mishearing when followed by song
  s = s.replace(/(^|[\s\p{P}])(পিডিএফ|পি\s*ডি\s*এফ)(?=\s*(?:বাংলা|হিন্দি)?\s*গান)/gui, '$1YouTube');
  // Song phonetic variants & Whisper mishearings (হিন্দি গাম -> হিন্দি গান)
  s = s.replace(/(^|[\s\p{P}])(ইন্দিগান|ইন্দি\s*গান|হিন্দি\s*গাম|হিন্দি\s*গম|হিন্দি\s*সংগ|হিন্দি\s*সাংগ|হিন্দি\s*সন্স|হিন্দি\s*সংশ|হিন্দি\s*সং|হিন্দিগান)(?=[\s\p{P}]|$)/gui, '$1হিন্দি গান');
  s = s.replace(/(^|[\s\p{P}])(বাংগলগান|বাংগলা\s*গান|বাঙলা\s*গান|বাংলাগান|বাংলা\s*গাম|বাংলা\s*গম|বাংলা\s*সংগ|বাংলা\s*সাংগ|বাংলা\s*সন্স|বাংলা\s*সং)(?=[\s\p{P}]|$)/gui, '$1বাংলা গান');
  s = s.replace(/(^|[\s\p{P}])(সংগ|সং|সাংগ|সাং|গানস|গান্স|সঙ্গিত|সংগীত)(?=[\s\p{P}]|$)/gui, '$1গান');
  s = s.replace(/(^|[\s\p{P}])(সারচ|সরচ|সর্চ|সার্স|সরস|সাচ)(?=[\s\p{P}]|$)/gui, '$1সার্চ');
  s = s.replace(/(^|[\s\p{P}])(লিকে|লেক|লেকে|লিকজা)(?=[\s\p{P}]|$)/gui, '$1লিখে');
  s = s.replace(/(^|[\s\p{P}])(এস্কোল|স্কোল|এস্কোর|এঙ্কোর)(?=[\s\p{P}]|$)/gui, '$1স্কোর');
  s = s.replace(/(^|[\s\p{P}])(গুগ্লে|গুগোল)(?=[\s\p{P}]|$)/gui, '$1গুগলে');
  s = s.replace(/(^|[\s\p{P}])(কালকুলেটর|কেলকুলেটর|কেল্কুলেটর|ক্যালকুলেটোর)(?=[\s\p{P}]|$)/gui, '$1ক্যালকুলেটর');
  s = s.replace(/(^|[\s\p{P}])(তমার|তোমর)(?=[\s\p{P}]|$)/gui, '$1তোমার');
  s = s.replace(/(^|[\s\p{P}])(কাচকি|কাজকি)(?=[\s\p{P}]|$)/gui, '$1কাজ কি');
  s = s.replace(/(^|[\s\p{P}])(কেকে)(?=[\s\p{P}]|$)/gui, '$1কি কি');
  s = s.replace(/(^|[\s\p{P}])(কাস)(?=[\s\p{P}]|$)/gui, '$1কাজ');
  s = s.replace(/(^|[\s\p{P}])(কোত্তে|কুত্তে)(?=[\s\p{P}]|$)/gui, '$1করতে');
  s = s.replace(/(^|[\s\p{P}])(হারো)(?=[\s\p{P}]|$)/gui, '$1পারো');
  s = s.replace(/(^|[\s\p{P}])(এসিস্টেন্ডিশেপে|এসিস্টেন্ট\s*হিসাবে|এসিস্টেন্ড)(?=[\s\p{P}]|$)/gui, '$1অ্যাসিস্ট্যান্ট হিসেবে');
  s = s.replace(/(^|[\s\p{P}])(ধাকা|ডাকা)(?=[\s\p{P}]|$)/gui, '$1ঢাকা');
  s = s.replace(/(^|[\s\p{P}])(কুলনার|কুলনা|খোলনার|খোলনা|হুনার)(?=[\s\p{P}]|$)/gui, '$1খুলনার');
  s = s.replace(/(^|[\s\p{P}])(আবাওয়া|আবাওয়ার|আবাওয়ায়|আবোয়ার|আব঵ার|আব঵া|আবহাওর|আবহাওয়ার|আবহাওয়ার|আবহাওন|আবহাওও|আবহাওয়)(?=[\s\p{P}]|$)/gui, '$1আবহাওয়া');
  s = s.replace(/(^|[\s\p{P}])(যোগস্তা|অবস্তা)(?=[\s\p{P}]|$)/gui, '$1অবস্থা');
  s = s.replace(/(^|[\s\p{P}])(খবোর)(?=[\s\p{P}]|$)/gui, '$1খবর');
  s = s.replace(/(^|[\s\p{P}])(এবংং+|এ঵ন|এবম)(?=[\s\p{P}]|$)/gui, '$1এবং');

  return s.replace(/\s+/g, ' ').trim();
}

const normalizeBn = normalizeBanglishToBengali;

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
  let safeUrl = url;
  try { safeUrl = new URL(url).toString(); } catch (e) { safeUrl = encodeURI(url); }

  const isYouTube = safeUrl.includes('youtube.com');
  const desktopYtLnk = path.join(os.homedir(), 'Desktop', 'YouTube.lnk');
  const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  // 1. YouTube PWA / Signed-In Desktop App Priority
  if (isYouTube) {
    if ((safeUrl === 'https://www.youtube.com' || safeUrl === 'https://www.youtube.com/') && fs.existsSync(desktopYtLnk)) {
      exec(`start "" "${desktopYtLnk}"`, { shell: 'cmd.exe' });
      return;
    }
    if (fs.existsSync(chromeExe)) {
      exec(`start "" "${chromeExe}" "${safeUrl}"`, { shell: 'cmd.exe' }, (err) => {
        if (err) exec(`start chrome "${safeUrl}"`, { shell: 'cmd.exe' });
      });
      return;
    }
  }

  // 2. Archer AI strategy: start chrome -> start msedge -> start ""
  exec(`start chrome "${safeUrl}"`, { shell: 'cmd.exe' }, (err) => {
    if (err) {
      exec(`start msedge "${safeUrl}"`, { shell: 'cmd.exe' }, (err2) => {
        if (err2) {
          exec(`start "" "${safeUrl}"`, { shell: 'cmd.exe' });
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

// Curated High-Fidelity Fallback Songs (Guarantees TRIDIP Sir always gets serial-by-serial results)
const fallbackBanglaSongs = [
  {
    title: 'Hemanta Mukherjee Best Songs | হারানো দিনের গান | Adhunik Bangla Songs 🎶হেমন্ত মুখোপাধ্যায় বাংলা গান',
    videoId: 'EpGxsT92ofg',
    url: 'https://www.youtube.com/watch?v=EpGxsT92ofg',
    duration: '28:35',
    channel: 'Evergreen Music Legend'
  },
  {
    title: 'প্রেমে পড়ার গান ❤️ Bengali Romantic Songs Jukebox | Evergreen Bengali Love Songs',
    videoId: 'XH3xFJZL7c4',
    url: 'https://www.youtube.com/watch?v=XH3xFJZL7c4',
    duration: '1:02:26',
    channel: 'Bangla Hit Gaan'
  },
  {
    title: 'Best of Sandhya Mukhopadhay | সেরা ১০ টি আধুনিক বাংলা গান | সন্ধ্যা মুখোপাধ্যায় এর জনপ্রিয় গান',
    videoId: 'TIXEkqx_PKI',
    url: 'https://www.youtube.com/watch?v=TIXEkqx_PKI',
    duration: '41:37',
    channel: 'Evergreen Music Legend'
  },
  {
    title: 'তোমরা আসবে তো | Tomra Asbe To Best Of Kumar Sanu Bengali Songs Top 10 Mp3',
    videoId: '5FcV-iRzwMc',
    url: 'https://www.youtube.com/watch?v=5FcV-iRzwMc',
    duration: '1:33:09',
    channel: 'geet sangeet'
  },
  {
    title: 'Je Deshe (যে দেশে) - 8K | Bengali Song | Dev, Subhashree | Zubeen Garg, Mahalakshmi Iyer',
    videoId: 'hSKgMrd1eLU',
    url: 'https://www.youtube.com/watch?v=hSKgMrd1eLU',
    duration: '4:23',
    channel: 'Eskay Music'
  }
];

const fallbackHindiSongs = [
  {
    title: 'Arijit Singh Best Songs 2026 | Non Stop Bollywood Romantic Songs Jukebox',
    videoId: 'cl0a3iCSxIE',
    url: 'https://www.youtube.com/watch?v=cl0a3iCSxIE',
    duration: '54:20',
    channel: 'Bollywood Classics'
  },
  {
    title: 'Top Hindi Songs 2026 | New Hindi Songs Video | Latest Bollywood Romantic Hits',
    videoId: '3fumBcKC6RE',
    url: 'https://www.youtube.com/watch?v=3fumBcKC6RE',
    duration: '45:10',
    channel: 'T-Series'
  },
  {
    title: '90s Romantic Hindi Songs | উদিত নারায়ণ ও কুমার শানুর সেরা রোমান্টিক হিন্দি গান',
    videoId: 'V1Pl8CzNzCw',
    url: 'https://www.youtube.com/watch?v=V1Pl8CzNzCw',
    duration: '1:15:30',
    channel: 'Evergreen 90s'
  },
  {
    title: 'Shreya Ghoshal Romantic Hits | Best Of Shreya Ghoshal Songs',
    videoId: 'Umqb9KENgmk',
    url: 'https://www.youtube.com/watch?v=Umqb9KENgmk',
    duration: '48:15',
    channel: 'Sony Music India'
  },
  {
    title: 'Atif Aslam Best Songs | Top Romantic Hindi Songs Collection',
    videoId: 'dZ0fwJojhrs',
    url: 'https://www.youtube.com/watch?v=dZ0fwJojhrs',
    duration: '42:50',
    channel: 'Tips Official'
  }
];

// Real-time YouTube Search Scraper with multi-section scanning and instant fallback
async function fetchYouTubeSearchResults(query) {
  if (!query) return [];
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'bn,en-US;q=0.9,en;q=0.8'
      },
      signal: AbortSignal.timeout(3500)
    });
    if (res.ok) {
      const html = await res.text();
      const match = html.match(/var ytInitialData = ({[\s\S]*?});<\/script>/);
      if (match) {
        const data = JSON.parse(match[1]);
        const items = [];
        const sectionContents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        for (const section of sectionContents) {
          const contents = section?.itemSectionRenderer?.contents || [];
          for (const c of contents) {
            const v = c.videoRenderer;
            if (v && v.videoId && v.title?.runs?.[0]?.text) {
              items.push({
                title: v.title.runs[0].text,
                videoId: v.videoId,
                url: `https://www.youtube.com/watch?v=${v.videoId}`,
                duration: v.lengthText?.simpleText || '',
                channel: v.ownerText?.runs?.[0]?.text || ''
              });
              if (items.length >= 5) break;
            }
          }
          if (items.length >= 5) break;
        }
        if (items.length > 0) return items;
      }
    }
  } catch (err) {
    console.warn('[YouTube Scrape Error]:', err.message);
  }

  // Graceful curated fallback: Never leave TRIDIP Sir with an empty list
  if (query.includes('বাংলা') || query.includes('bangla')) return fallbackBanglaSongs;
  if (query.includes('হিন্দি') || query.includes('hindi')) return fallbackHindiSongs;
  return fallbackBanglaSongs;
}

function cleanSearchQuery(q) {
  let s = normalizeBn(q);
  const removeWords = [
    // Conversational preambles & meta-phrases
    'যেমন আমি যদি বলি', 'যদি আমি বলি', 'আমি যদি বলি', 'যদি বলি', 'যেমন বলি', 'যেমন',
    'তোমাকে বলছি', 'আমি বলছি', 'আমি বলেছি', 'বলছি', 'বলেছি', 'তোমাকে বলছিলাম',
    'সার্চ আইকনে ক্লিক করো', 'সার্চ আইকনে ক্লিক কর', 'সার্চ আইকনে ক্লিক হবে', 'সার্চ আইকনে ক্লিক', 'সার্চ আইকন আছে', 'সার্চ আইকন',
    'সার্চ বক্সে', 'সার্চ বক্স', 'সার্চে', 'ক্লিক করো', 'ক্লিক কর', 'ক্লিক হবে', 'ক্লিক', 'আইকন আছে', 'আইকন',
    'রেজাল্ট দেখাবে', 'রেজাল্ট দেখান', 'রেজাল্ট দেখাও', 'রেজাল্টগুলো দেখাও', 'রেজাল্টগুলো', 'রেজাল্ট দেখানো হবে', 'রেজাল্ট দেখানো হোক', 'রেজাল্ট',
    'দেখানো হবে', 'দেখানো হোক', 'দেখানো', 'হবে', 'হোক', 'আছে',
    'তারপরে', 'তারপর',
    'আমাকে জাস্ট', 'আমাকে একটু', 'আমাকে দেখাও', 'আমাকে', 'জাস্ট', 'দয়া করে', 'প্লিজ', 'please',
    'নিচে এসে', 'নিচে দেখাও', 'নিচে',
    'নাকি কি', 'নাকি', 'কিনা',
    'অনলি', 'শুধুমাত্র', 'কেবলমাত্র', 'শুধু', 'কেবল',
    'সিরিয়াল বাই ওয়ান বাই ওয়ান', 'সিরিয়াল বাই', 'ওয়ান বাই ওয়ান', 'এক এক করে',
    'গিয়ে', 'গিয়ে', 'গিয়া', 'গিয়া', 'যেয়ে', 'যেয়ে', 'যাইয়া', 'যাইয়া', 'যাইয়ে', 'যাইয়ে',

    // Brands / Services
    'ইউটিউবে', 'ইউটিউবটা', 'ইউটিউব', 'ইউটুব', 'ইউটুপ', 'ইউটু্ব', 'ইউতু্ব', 'ইউটিব', 'উটিউব', 'যোট্যুপ', 'যোটুপ', 'ইয়ায়োটুপ', 'ইয়ায়োটুপ', 'যুট্যুবে', 'যুট্যুব', 'চোচুব', 'য়চুুব', 'youtube', 'yt',
    'গুগলে', 'গুগল', 'google', 'ফেসবুক', 'facebook', 'ক্যামেরা', 'camera', 'নোটপ্যাড', 'notepad',

    // Search verbs & variations
    'লিখে সার্চ করো', 'লিখে সারচ করো', 'লিখে সরচ করো', 'লিখে সর্চ করো', 'লিখে সার্চ কর', 'লিখে সার্চ', 'লিখে সারচ', 'লিখে সর্চ', 'লিখে',
    'সার্চ করে দাও', 'সার্চ করে দিন', 'সার্চ করো', 'সার্চ কর', 'সার্চ করে', 'সার্চ',
    'সারচ করে দাও', 'সারচ করে দিন', 'সারচ করো', 'সারচ কর', 'সারচ করে', 'সারচ',
    'সরচ করে দাও', 'সরচ করে দিন', 'সরচ করো', 'সরচ কর', 'সরচ করে', 'সরচ',
    'সর্চ করে দাও', 'সর্চ করে দিন', 'সর্চ করো', 'সর্চ কর', 'সর্চ করে', 'সর্চ',
    'সার্স করে দাও', 'সার্স করে দিন', 'সার্স করো', 'সার্স কর', 'সার্স করে', 'সার্স',
    'খোঁজো', 'খোজো', 'খুঁজে দাও', 'খুজে দাও', 'বের করো', 'search', 'find',

    // Launch & action verbs
    'ওপেন করবা', 'ওপেন করবেন', 'ওপেন করবে', 'ওপেন করো', 'ওপেন কর', 'ওপেন করে', 'ওপেন', 'ওপিন', 'উপিন',
    'খুলবা', 'খুলবেন', 'খুলবে', 'খোলো', 'খুলো', 'খোল', 'কোলো', 'কুলো',
    'চালু করবা', 'চালু করবেন', 'চালু করবে', 'চালু করো', 'চালু কর', 'চালু করে', 'চালু', 'চালাও', 'চালা', 'বাজাও', 'বাজা', 'শোনাও', 'শোনা', 'ছাড়ো', 'দেখান', 'দেখাও', 'যাও', 'অন',
    'করবা', 'করবেন', 'করবে', 'করে দাও', 'করে দিন', 'করে', 'করো', 'কর', 'দাও', 'দিন',
    'বলবা', 'বলবেন', 'বলবে', 'বলো', 'বল',
    'open', 'launch', 'start', 'play', 'kholo', 'chalu', 'khol', 'bajao', 'shonao', 'run',
    'koro', 'kor', 'kore', 'dao', 'din',

    // Connectors & articles
    'এবং', 'এবংং', 'এ঵ন', 'এবম', 'আর', 'এন্ড', 'ও', 'একটি', 'একটা', 'আমার জন্য', 'নিয়ে', 'সম্পর্কে', 'একটু', 'টা', 'গিয়ে', 'গিয়া', 'and', 'then'
  ];

  for (const w of removeWords) {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('(^|[\\s\\p{P}])' + escaped + '(?=[\\s\\p{P}]|$)', 'gui');
    s = s.replace(regex, ' ');
  }

  // Deduplicate repeated multi-word phrases and words
  s = s.replace(/(হিন্দি\s*গান)(?:\s+\1)+/gui, '$1');
  s = s.replace(/(বাংলা\s*গান)(?:\s+\1)+/gui, '$1');
  s = s.replace(/\b(\S+)(?:\s+\1\b)+/gui, '$1');

  // If query starts with "হিন্দি গান" or "বাংলা গান" and contains hallucinated noise or excess repetition, isolate cleanly
  if (/^হিন্দি\s*গান/i.test(s) && (s.includes('ক্যামেরা') || s.includes('Facebook') || s.length > 25)) {
    s = "হিন্দি গান";
  } else if (/^বাংলা\s*গান/i.test(s) && (s.includes('ক্যামেরা') || s.includes('Facebook') || s.length > 25)) {
    s = "বাংলা গান";
  }

  return s.replace(/[।?!,.:;'"-]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Safe Windows PC Action Controller (Desktop Superpowers)
function detectIntentAction(prompt) {
  const norm = normalizeBn(prompt);

  // Common Action Verbs (Bengali + English + Banglish)
  const isActionVerb = /(?:খোলো|খুল|খুলো|কোলো|কুলো|ওপেন|ওপিন|উপিন|চালু|চালাও|চালা|বাজাও|বাজা|শোনাও|শোনা|ছাড়ো|দেখান|দেখাও|যাও|অন|সার্চ|সারচ|সরচ|সর্চ|সার্স|খোঁজো|খোজো|খুঁজে\s*দাও|open|launch|start|play|kholo|chalu|khol|bajao|shonao|run|search)/ui.test(norm);

  // 1. YouTube & Music Intent (Excludes pure informational questions)
  const isYt = /(?:^|[\s\p{P}])(?:ইউটিউবে|ইউটিউবটা|ইউটিউব|ইউটুব|ইউটুপ|ইউটু্ব|ইউতু্ব|ইউটিব|উটিউব|যোট্যুপ|যোটুপ|ইয়ায়োটুপ|ইয়ায়োটুপ|যুট্যুবে|যুট্যুব|চোচুব|য়চুুব|youtube|\byt\b)(?=[\s\p{P}]|$)/ui.test(norm);
  const isSongOrMusic = /(?:^|[\s\p{P}])(?:গান|গানস|সঙ্গীত|সংগীত|ভিডিও|মিউজিক|গজল|সুর|নজরুলগীতি|রবীন্দ্রসঙ্গীত|রবীন্দ্রসংগীত|song|songs|music|video)(?=[\s\p{P}]|$)/ui.test(norm);
  const isQuestion = /(?:\?|কীভাবে|কিভাবে|কেন|কী\s*জন্য|কি\s*জন্য|কে|কারা|কাকে|কোথায়|কখন|রচিয়তা|রচিয়তা|ইতিহাস|ব্যাখ্যা\s*করো|who|why|where|when)/ui.test(norm);

  const isPureSongQuery = /^(?:একটি|একটা)?\s*(?:বাংলা|হিন্দি|ইংরেজি|জনপ্রিয়|নতুন|পুরাতন|রোমান্টিক)?\s*(?:গান|গজল|মিউজিক|গানস|ভিডিও)\b/ui.test(norm);
  if ((isYt || (isSongOrMusic && isActionVerb) || isPureSongQuery) && !isQuestion) {
    const query = cleanSearchQuery(prompt);
    if (query && query.length > 1) {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      return {
        type: 'YOUTUBE_SEARCH',
        appName: 'youtube',
        query: query,
        url: searchUrl,
        reply: `TRIDIP স্যার, ইউটিউবে '${query}' সার্চ করা হয়েছে এবং সেরা ভিডিওগুলো নিচে দেওয়া হয়েছে।`
      };
    }
    return {
      type: 'YOUTUBE_OPEN',
      appName: 'youtube',
      url: 'https://www.youtube.com',
      reply: 'TRIDIP স্যার, YouTube ওপেন করা হয়েছে।'
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
        reply: `TRIDIP স্যার, গুগলে '${q}' সার্চ করা হয়েছে।`
      };
    }
    return {
      type: 'OPEN_URL',
      appName: 'google',
      url: 'https://www.google.com',
      reply: 'TRIDIP স্যার, Google ওপেন করা হয়েছে।'
    };
  }

  // 3. Capabilities / "তুমি কী কী কাজ করতে পারো?"
  const isAboutAssistant = norm.includes('তুমি') || norm.includes('তোমার') || norm.includes('you') || norm.includes('your') || norm.includes('jarvis') || norm.includes('জার্ভিস');
  if (
    isAboutAssistant && (
      norm.includes('কী কাজ') || norm.includes('কি কাজ') ||
      norm.includes('কী করতে পার') || norm.includes('কি করতে পার') ||
      norm.includes('কী কী করতে') || norm.includes('কি কি করতে') ||
      norm.includes('কী পারো') || norm.includes('কি পারো') ||
      norm.includes('কাজ কি') || norm.includes('কাজ কী') ||
      norm.includes('কাজগুলো কি') || norm.includes('কাজগুলো কী') ||
      norm.includes('ফিচার কি') || norm.includes('ফিচার কী') ||
      norm.includes('ক্ষমতা কি') || norm.includes('ক্ষমতা কী') ||
      norm.includes('what can you do') || norm.includes('capabilities')
    )
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
  if (!norm.includes('আবহাও') && !norm.includes('weather') && !norm.includes('খুলনা') && !norm.includes('ঢাকা') && (norm.includes('কেমন আছো') || norm.includes('কেমন আছেন') || norm.includes('কি খবর') || norm.includes('কী খবর') || norm.includes('কি অবস্থা') || norm.includes('how are you'))) {
    return {
      type: 'GREETING',
      reply: 'আমি খুব ভালো আছি TRIDIP স্যার! আপনার কি খবর বলুন, আমি কীভাবে সাহায্য করতে পারি?'
    };
  }

  // 5. Weather Details
  const weatherNorm = normalizeBn('আবহাওয়া');
  if (
    norm.includes(weatherNorm) || norm.includes('আবহাওয়া') || norm.includes('আবহাওয়া') ||
    norm.includes('আবহাও') || norm.includes('weather') || norm.includes('তাপমাত্রা') ||
    norm.includes('বৃষ্টি') ||
    ((norm.includes('রিপোর্ট') || norm.includes('ডিটেইলস') || norm.includes('খবর') || norm.includes('অবস্থা')) && (norm.includes('খুলনা') || norm.includes('ঢাকা') || norm.includes('আবহাও')))
  ) {
    let cityEn = 'Khulna';
    let cityBn = 'খুলনা';
    if (/ঢাকা|dhaka|ঢাকার/i.test(norm)) { cityEn = 'Dhaka'; cityBn = 'ঢাকা'; }
    else if (/চট্টগ্রাম|chittagong|ctg|চিটাগাং/i.test(norm)) { cityEn = 'Chittagong'; cityBn = 'চট্টগ্রাম'; }
    else if (/সিলেট|sylhet/i.test(norm)) { cityEn = 'Sylhet'; cityBn = 'সিলেট'; }
    else if (/রাজশাহী|rajshahi/i.test(norm)) { cityEn = 'Rajshahi'; cityBn = 'রাজশাহী'; }
    else if (/বরিশাল|barisal/i.test(norm)) { cityEn = 'Barisal'; cityBn = 'বরিশাল'; }
    else if (/রংপুর|rangpur/i.test(norm)) { cityEn = 'Rangpur'; cityBn = 'রংপুর'; }
    else if (/ময়মনসিংহ|ময়মনসিংহ|mymensingh/i.test(norm)) { cityEn = 'Mymensingh'; cityBn = 'ময়মনসিংহ'; }
    else if (/কুমিল্লা|comilla/i.test(norm)) { cityEn = 'Comilla'; cityBn = 'কুমিল্লা'; }
    else if (/কক্সবাজার|coxs\s*bazar|cox/i.test(norm)) { cityEn = 'Cox\'s Bazar'; cityBn = 'কক্সবাজার'; }
    else if (/বগুড়া|বগুড়া|bogra/i.test(norm)) { cityEn = 'Bogra'; cityBn = 'বগুড়া'; }
    else if (/যশোর|jashore|jessore/i.test(norm)) { cityEn = 'Jashore'; cityBn = 'যশোর'; }
    else { cityEn = 'Khulna'; cityBn = 'খুলনা'; }

    return { type: 'WEATHER', cityEn, cityBn };
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
      reply: 'TRIDIP স্যার, নোটপ্যাড ওপেন করা হয়েছে।'
    };
  }

  // 7. Generic Search Action
  const isSearchCmd = /সার্চ\s*(?:করো|কর|করে|দাও)|সারচ\s*(?:করো|কর|করে|দাও)|সরচ\s*(?:করো|কর|করে|দাও)|সার্স\s*(?:করো|কর|করে|দাও)|খোঁজো|খোজো|খুঁজে\s*দাও|search\s*for/i.test(norm);
  if (isSearchCmd) {
    const q = cleanSearchQuery(prompt);
    if (q && q.length > 1) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
      return {
        type: 'OPEN_URL',
        appName: 'google',
        query: q,
        url: url,
        reply: `TRIDIP স্যার, গুগলে '${q}' সার্চ করা হয়েছে।`
      };
    }
  }

  // 8. Volume Control
  if (norm.includes('ভলিউম') || norm.includes('সাউন্ড') || norm.includes('volume') || norm.includes('sound')) {
    const isDown = /কমাও|কমিয়ে|কমায়ে|ডাউন|down|decrease|সাউন্ড\s*কম/i.test(norm);
    const isMute = /মিউট|বন্ধ|নিঃশব্দ|mute/i.test(norm);
    if (isMute) return { type: 'VOLUME_MUTE', reply: 'TRIDIP স্যার, কম্পিউটারের সাউন্ড মিউট করা হয়েছে।' };
    if (isDown) return { type: 'VOLUME_DOWN', reply: 'TRIDIP স্যার, কম্পিউটারের সাউন্ড কমিয়ে দেওয়া হয়েছে।' };
    return { type: 'VOLUME_UP', reply: 'TRIDIP স্যার, কম্পিউটারের সাউন্ড বাড়িয়ে দেওয়া হয়েছে।' };
  }

  // 9. Windows Native Apps
  if (/ক্যালকুলেটর|ক্যাল্কুলেটর|calculator|\bcalc\b/i.test(norm)) return { type: 'OPEN_APP', appName: 'calculator', appCmd: 'calc', reply: 'TRIDIP স্যার, ক্যালকুলেটর ওপেন করা হয়েছে।' };
  if (/ফাইল ম্যানেজার|ফাইল এক্সপ্লোরার|দিস পিসি|মাই কম্পিউটার|explorer/i.test(norm)) return { type: 'OPEN_APP', appName: 'explorer', appCmd: 'explorer', reply: 'TRIDIP স্যার, ফাইল এক্সপ্লোরার ওপেন করা হয়েছে।' };
  if (/টাস্ক ম্যানেজার|task manager|taskmgr/i.test(norm)) return { type: 'OPEN_APP', appName: 'task manager', appCmd: 'taskmgr', reply: 'TRIDIP স্যার, টাস্ক ম্যানেজার ওপেন করা হয়েছে।' };
  if (/পেইন্ট|paint|mspaint/i.test(norm)) return { type: 'OPEN_APP', appName: 'paint', appCmd: 'mspaint', reply: 'TRIDIP স্যার, পেইন্ট ওপেন করা হয়েছে।' };
  if (/কমান্ড প্রম্পট|\bcmd\b|টার্মিনাল|terminal/i.test(norm)) return { type: 'OPEN_APP', appName: 'cmd', appCmd: 'start cmd', reply: 'TRIDIP স্যার, কমান্ড প্রম্পট ওপেন করা হয়েছে।' };
  if (/ক্যামেরা|camera/i.test(norm)) return { type: 'OPEN_APP', appName: 'camera', appCmd: 'start microsoft.windows.camera:', reply: 'TRIDIP স্যার, ক্যামেরা ওপেন করা হয়েছে।' };
  if (/সেটিংস|settings/i.test(norm)) return { type: 'OPEN_APP', appName: 'settings', appCmd: 'start ms-settings:', reply: 'TRIDIP স্যার, সেটিংস প্যানেল ওপেন করা হয়েছে।' };

  // 10. Social & Web Services
  if (/ফেসবুক|facebook|\bfb\b/i.test(norm)) return { type: 'OPEN_URL', appName: 'facebook', url: 'https://www.facebook.com', reply: 'TRIDIP স্যার, ফেসবুক ওপেন করা হয়েছে।' };
  if (/জিমেইল|জি-মেইল|gmail|ইমেইল|email/i.test(norm)) return { type: 'OPEN_URL', appName: 'gmail', url: 'https://mail.google.com', reply: 'TRIDIP স্যার, জিমেইল ইনবক্স ওপেন করা হয়েছে।' };
  if (/গিটহাব|github/i.test(norm)) return { type: 'OPEN_URL', appName: 'github', url: 'https://github.com/tridipofficial/TRI-PC', reply: 'TRIDIP স্যার, আপনার গিটহাব রিপোজিটরি ওপেন করা হয়েছে।' };
  if (/উইকিপিডিয়া|wikipedia/i.test(norm)) return { type: 'OPEN_URL', appName: 'wikipedia', url: 'https://bn.wikipedia.org', reply: 'TRIDIP স্যার, উইকিপিডিয়া ওপেন করা হয়েছে।' };
  if (/চ্যাটজিপিটি|chatgpt|openai/i.test(norm)) return { type: 'OPEN_URL', appName: 'chatgpt', url: 'https://chatgpt.com', reply: 'TRIDIP স্যার, চ্যাটজিপিটি ওপেন করা হয়েছে।' };

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
      const cityEn = (typeof intent === 'object' && intent.cityEn) ? intent.cityEn : 'Khulna';
      const cityBn = (typeof intent === 'object' && intent.cityBn) ? intent.cityBn : 'খুলনা';
      try {
        const res = await fetch(`https://wttr.in/${encodeURIComponent(cityEn)}?format=j1`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json();
          const curr = data.current_condition[0];
          const temp = curr.temp_C;
          const humidity = curr.humidity;
          const rawDesc = (curr.weatherDesc?.[0]?.value || '').toLowerCase();
          let desc = 'পরিষ্কার';
          if (rawDesc.includes('sun') || rawDesc.includes('clear')) desc = 'পরিষ্কার ও রৌদ্রোজ্জ্বল';
          else if (rawDesc.includes('partly')) desc = 'আংশিক মেঘলা';
          else if (rawDesc.includes('cloud') || rawDesc.includes('overcast')) desc = 'মেঘলা';
          else if (rawDesc.includes('rain') || rawDesc.includes('drizzle') || rawDesc.includes('shower')) desc = 'বৃষ্টিবহুল';
          else if (rawDesc.includes('mist') || rawDesc.includes('fog')) desc = 'কুয়াশাচ্ছন্ন';
          else if (rawDesc.includes('thunder')) desc = 'বজ্রবৃষ্টির সম্ভাবনাযুক্ত';

          return {
            message: `TRIDIP স্যার, ${cityBn}-র বর্তমান তাপমাত্রা ${temp} ডিগ্রি সেলসিয়াস। আকাশ ${desc} এবং বাতাসের আর্দ্রতা ${humidity} শতাংশ।`,
            url: null
          };
        }
      } catch (err) {
        console.warn('Weather fetch error:', err.message);
      }
      return {
        message: `TRIDIP স্যার, ${cityBn}-র বর্তমান তাপমাত্রা প্রায় ২৫ ডিগ্রি সেলসিয়াস, আকাশ আংশিক মেঘলা এবং বাতাসের আর্দ্রতা ৬৫ শতাংশ।`,
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
      if (!isElectron) {
        launchAppInWindows(`notepad "${noteFile}"`);
      }
      return {
        message: presetReply || `TRIDIP স্যার, আপনার নোটটি ডেস্কটপে 'TRI_AI_Notes.txt' ফাইলে সেভ করে নোটপ্যাডে ওপেন করা হয়েছে!`,
        url: null,
        appCmd: `notepad "${noteFile}"`
      };
    }

    // 4. Universal Web & URL Opener & YouTube Search
    if (actionType === 'YOUTUBE_SEARCH' || actionType === 'OPEN_URL' || actionType === 'OPEN_YOUTUBE' || actionType === 'OPEN_GOOGLE') {
      const targetUrl = intent.url || intentUrl || 'https://www.youtube.com';
      if (!isElectron) {
        launchUrlInWindows(targetUrl);
      }
      let results = (typeof intent === 'object' && intent.results) ? intent.results : null;
      if (!results && query && (actionType === 'YOUTUBE_SEARCH' || (typeof intent === 'object' && intent.appName === 'youtube') || targetUrl.includes('youtube.com'))) {
        try {
          results = await fetchYouTubeSearchResults(query);
        } catch (err) {
          console.warn('[YouTube Search Scrape Failed]:', err.message);
        }
      }
      return {
        message: presetReply || intent.reply || `TRIDIP স্যার, ব্রাউজারে ${targetUrl} ওপেন করা হয়েছে!`,
        url: targetUrl,
        results: results || null,
        query: query
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
      if (!isElectron) {
        launchAppInWindows(cmdToRun);
      }
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
        const rawUserMessage = (message || bodyPrompt || '').trim();
        const userMessage = normalizeBanglishToBengali(rawUserMessage);

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
                  query: parsedBrainAct.query || null,
                  results: actRes?.results || null
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
        if (audioBuffer.length < 1600) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, text: '', message: 'Audio buffer too short' }));
        }

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
        } else if (audioBuffer.length > 44) {
          // Check WAV peak to reject faint background mic hiss (fan, room hum)
          let maxSample = 0;
          for (let i = 44; i < audioBuffer.length - 1; i += 2) {
            const val = Math.abs(audioBuffer.readInt16LE(i));
            if (val > maxSample) maxSample = val;
          }
          if (maxSample < 150) {
            console.log(`[Whisper STT] Rejected faint background noise (peak=${maxSample}/32767)`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, text: '', message: 'Faint background noise discarded' }));
          }
        }

        const formData = new FormData();
        const blob = new Blob([audioBuffer], { type: mimeType });
        formData.append('file', blob, fileName);
        formData.append('model', 'whisper-large-v3');
        formData.append('language', 'bn');
        formData.append('prompt', 'YouTube, Google, Facebook, বাংলা গান, হিন্দি গান, গান, সার্চ করো, ওপেন করো, খোলো, আবহাওয়া, ক্রিকেট স্কোর, ক্যালকুলেটর, নোটপ্যাড, ক্যামেরা, কি খবর। Bengali and English speech.');
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
        const cleanText = normalizeBanglishToBengali(text);
        console.log(`[Whisper STT] Transcribed in ${Date.now() - t0}ms: "${text}" -> Clean: "${cleanText}"`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, text: cleanText, rawText: text }));
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
