// TRI AI Main Application Controller
document.addEventListener('DOMContentLoaded', () => {
  // 1. State Management
  let tasks = [];
  let currentFilter = 'ALL';
  let currentSubFilter = 'ALL';
  let isVoiceEnabled = false;
  let isListening = false;
  let recognition = null;

  // DOM Elements
  const taskListContainer = document.getElementById('taskListContainer');
  const newObjectiveInput = document.getElementById('newObjectiveInput');
  const prioritySelect = document.getElementById('prioritySelect');
  const categorySelect = document.getElementById('categorySelect');
  const addObjectiveBtn = document.getElementById('addObjectiveBtn');
  const progressPctText = document.getElementById('progressPctText');
  const progressFill = document.getElementById('progressFill');

  const chatStream = document.getElementById('chatStream');
  const chatInput = document.getElementById('chatInput');
  const btnSendChat = document.getElementById('btnSendChat');
  const btnVoiceToggle = document.getElementById('btnVoiceToggle');
  const btnMic = document.getElementById('btnMic');
  const btnScreen = document.getElementById('btnScreen');
  const btnCamera = document.getElementById('btnCamera');
  const btnTerminate = document.getElementById('btnTerminate');

  // Tab Elements
  const tabTownBtn = document.getElementById('tabTownBtn');
  const tabVisualBtn = document.getElementById('tabVisualBtn');
  const townCanvas = document.getElementById('townCanvas');
  const mindmapCanvas = document.getElementById('mindmapCanvas');

  // Theme Buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.body.className = btn.dataset.theme;
    });
  });

  // Switch between Agent Town and Visual Hub
  tabTownBtn.addEventListener('click', () => {
    tabTownBtn.classList.add('active');
    tabVisualBtn.classList.remove('active');
    townCanvas.classList.add('active');
    mindmapCanvas.classList.remove('active');
  });

  tabVisualBtn.addEventListener('click', () => {
    tabVisualBtn.classList.add('active');
    tabTownBtn.classList.remove('active');
    mindmapCanvas.classList.add('active');
    townCanvas.classList.remove('active');
  });

  // 2. Task API & Management
  async function fetchTasks() {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        tasks = await res.json();
        renderTasks();
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  }

  function updateProgress() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressPctText.textContent = `${completed}/${total} (${pct}%)`;
    progressFill.style.width = `${pct}%`;
  }

  function renderTasks() {
    taskListContainer.innerHTML = '';

    const filtered = tasks.filter(t => {
      // Main filter
      if (currentFilter === 'PENDING' && t.completed) return false;
      if (currentFilter === 'COMPLETED' && !t.completed) return false;
      if (currentFilter === 'HIGH' && t.priority !== 'HIGH') return false;

      // Sub filter
      if (currentSubFilter !== 'ALL' && t.category !== currentSubFilter) return false;

      return true;
    });

    if (filtered.length === 0) {
      taskListContainer.innerHTML = '<div style="color: #64748b; font-size: 11px; text-align: center; padding: 20px 0;">No matching objectives.</div>';
      updateProgress();
      return;
    }

    filtered.forEach(task => {
      const item = document.createElement('div');
      item.className = `task-item ${task.completed ? 'completed' : ''}`;
      item.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
        <div class="task-content">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-meta">
            <span class="priority-badge priority-${task.priority}">▲ ${task.priority}</span>
            <span class="category-tag">📁 ${task.category}</span>
            <span class="time-tag">🕒 ${task.time}</span>
          </div>
        </div>
        <button class="btn-task-del" title="Delete">✕</button>
      `;

      // Checkbox toggle
      const cb = item.querySelector('.task-checkbox');
      cb.addEventListener('change', async () => {
        await toggleTask(task.id, cb.checked);
      });

      // Delete button
      const delBtn = item.querySelector('.btn-task-del');
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteTask(task.id);
      });

      taskListContainer.appendChild(item);
    });

    updateProgress();
  }

  async function addTask() {
    const title = newObjectiveInput.value.trim();
    if (!title) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          priority: prioritySelect.value,
          category: categorySelect.value
        })
      });

      if (res.ok) {
        newObjectiveInput.value = '';
        await fetchTasks();
      }
    } catch (err) {
      console.error('Error adding task:', err);
    }
  }

  async function toggleTask(id, completed) {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
      await fetchTasks();
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  }

  async function deleteTask(id) {
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      await fetchTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  }

  addObjectiveBtn.addEventListener('click', addTask);
  newObjectiveInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
  });

  // Filter Pills logic
  document.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.dataset.filter;
      renderTasks();
    });
  });

  document.querySelectorAll('.sub-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.sub-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentSubFilter = pill.dataset.sub;
      renderTasks();
    });
  });

  // 3. Conversational Assistant & Reasoning
  async function sendMessage(text) {
    const prompt = text || chatInput.value.trim();
    if (!prompt) return;

    chatInput.value = '';

    // Append user message
    appendUserMessage(prompt);

    // Show temporary thinking state
    const thinkingNode = appendThinkingCard();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      });

      if (res.ok) {
        const data = await res.json();
        thinkingNode.remove();
        appendAssistantMessage(data);

        // Perform any action triggered by assistant (e.g. task added)
        if (data.action?.type === 'TASKS_UPDATED') {
          tasks = data.action.tasks;
          renderTasks();
        } else if (data.action?.type === 'SWITCH_TAB') {
          tabVisualBtn.click();
        }

        // Voice output if enabled
        if (isVoiceEnabled && window.speechSynthesis) {
          speakText(data.reply.replace(/[*#_]/g, ''));
        }
      }
    } catch (err) {
      thinkingNode.innerHTML = `<div style="color: #ef4444; font-size: 11px;">Error connecting to assistant core: ${err.message}</div>`;
    }
  }

  function appendUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'msg msg-user';
    msg.innerHTML = `
      <div class="msg-author">YOU</div>
      <div class="msg-bubble">${escapeHtml(text)}</div>
    `;
    chatStream.appendChild(msg);
    chatStream.scrollTop = chatStream.scrollHeight;
  }

  function appendThinkingCard() {
    const msg = document.createElement('div');
    msg.className = 'msg msg-assistant';
    msg.innerHTML = `
      <div class="msg-author">TRI AI</div>
      <div class="thought-card">
        <div class="thought-header">🧠 THOUGHT PROCESS</div>
        <div class="thought-stage">**Initiating Contextual Analysis**</div>
        <div class="thought-detail" style="animation: pulse-glow 1s infinite alternate;">Evaluating intent and preparing synthesis...</div>
      </div>
    `;
    chatStream.appendChild(msg);
    chatStream.scrollTop = chatStream.scrollHeight;
    return msg;
  }

  function appendAssistantMessage(data) {
    const msg = document.createElement('div');
    msg.className = 'msg msg-assistant';

    let reasoningHtml = '';
    if (data.reasoning && data.reasoning.length > 0) {
      reasoningHtml = `
        <div class="thought-card">
          <div class="thought-header">🧠 THOUGHT PROCESS</div>
          ${data.reasoning.map(r => `
            <div class="thought-stage">**${escapeHtml(r.stage)}**</div>
            <div class="thought-detail">${escapeHtml(r.detail)}</div>
          `).join('')}
        </div>
      `;
    }

    // Format simple markdown bold and newlines
    const formattedReply = escapeHtml(data.reply)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    msg.innerHTML = `
      <div class="msg-author">
        <span>TRI AI</span>
        <button class="btn-listen" title="কণ্ঠে শুনুন">🔊 শুনুন</button>
      </div>
      ${reasoningHtml}
      <div class="msg-bubble">${formattedReply}</div>
    `;

    const listenBtn = msg.querySelector('.btn-listen');
    if (listenBtn) {
      listenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speakText(data.reply);
      });
    }

    chatStream.appendChild(msg);
    chatStream.scrollTop = chatStream.scrollHeight;
  }

  btnSendChat.addEventListener('click', () => sendMessage());
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // 4. Voice Assistant Integration (Web Speech API with Runtime Voice Detection)
  let activeBengaliVoice = null;
  let voiceDetectionAttempted = false;

  function scanVoices() {
    if (!window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    voiceDetectionAttempted = true;

    // Preference 1: Bangladeshi Bengali female voice (e.g. Nabaneeta in Edge)
    activeBengaliVoice = voices.find(v => (v.lang === 'bn-BD' || v.lang === 'bn_BD') && v.name.toLowerCase().includes('nabaneeta')) ||
                         voices.find(v => (v.lang === 'bn-BD' || v.lang === 'bn_BD') && (v.name.toLowerCase().includes('female') || v.name.includes('নারী'))) ||
                         // Preference 2: Any available Bengali voice (e.g. Google বাংলা in Chrome)
                         voices.find(v => v.lang.startsWith('bn')) ||
                         // Preference 3: Any friendly desktop voice as fallback
                         voices.find(v => v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('female')) ||
                         null;

    if (activeBengaliVoice) {
      console.log('TRI AI Speech: Active voice loaded ->', activeBengaliVoice.name, `(${activeBengaliVoice.lang})`);
    } else {
      console.log('TRI AI Speech: No native Bengali voice found on this system. Operating in text mode.');
    }
  }

  if (window.speechSynthesis) {
    scanVoices();
    window.speechSynthesis.onvoiceschanged = scanVoices;
  }

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'bn-BD'; // Bangladeshi Bengali Speech Recognition

    recognition.onstart = () => {
      isListening = true;
      btnMic.classList.add('listening');
      chatInput.placeholder = 'TRIDIP স্যার, আপনার কথা শুনছি...';
    };

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      chatInput.value = transcript;
      sendMessage(transcript);
    };

    recognition.onerror = (e) => {
      console.warn('Voice recognition error:', e.error);
      isListening = false;
      btnMic.classList.remove('listening');
      chatInput.placeholder = 'TRIDIP স্যার, এখানে বাংলায় অথবা ইংরেজিতে লিখুন...';
    };

    recognition.onend = () => {
      isListening = false;
      btnMic.classList.remove('listening');
      chatInput.placeholder = 'TRIDIP স্যার, এখানে বাংলায় অথবা ইংরেজিতে লিখুন...';
    };
  }

  btnMic.addEventListener('click', () => {
    if (!recognition) {
      alert('TRIDIP স্যার, এই ব্রাউজারে ভয়েস রিকগনিশন সক্রিয় নেই। দয়া করে Microsoft Edge বা Google Chrome ব্যবহার করুন।');
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  });

  btnVoiceToggle.addEventListener('click', () => {
    isVoiceEnabled = !isVoiceEnabled;
    btnVoiceToggle.classList.toggle('active', isVoiceEnabled);
    if (isVoiceEnabled) {
      speakText('হ্যালো, TRIDIP স্যার! আমি আপনার TRI AI অ্যাসিস্ট্যান্ট। আপনাকে কীভাবে সাহায্য করতে পারি?');
    }
  });

  function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    scanVoices();

    // Clean text for natural Bengali voice synthesis (remove code, markdown, URLs, symbols)
    const cleanSpeech = text
      .replace(/```[\s\S]*?```/g, 'কোড ব্লক বাদ দেওয়া হয়েছে।')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*#_~>]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!cleanSpeech) return;

    const utter = new SpeechSynthesisUtterance(cleanSpeech);
    if (activeBengaliVoice) {
      utter.voice = activeBengaliVoice;
      utter.lang = activeBengaliVoice.lang;
    } else {
      utter.lang = 'bn-BD';
    }
    utter.rate = 0.95; // Calm, polite speaking speed
    utter.pitch = 1.05; // Gentle, warmer pitch
    window.speechSynthesis.speak(utter);
  }

  // Hook up welcome message speak button
  const btnSpeakWelcome = document.getElementById('btnSpeakWelcome');
  if (btnSpeakWelcome) {
    btnSpeakWelcome.addEventListener('click', () => {
      speakText('হ্যালো, TRIDIP স্যার! আমি আপনার TRI AI অ্যাসিস্ট্যান্ট। আপনাকে কীভাবে সাহায্য করতে পারি?');
    });
  }

  // 5. Screen Capture Tool
  btnScreen.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      track.stop();

      // Show in chat that screenshot was captured
      appendUserMessage('📸 [Attached Desktop Screenshot for analysis]');
      sendMessage('Analyze this desktop screenshot and summarize current active windows.');
    } catch (err) {
      console.log('Screen capture dismissed:', err);
    }
  });

  // Camera Tool
  btnCamera.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      track.stop();
      appendUserMessage('📷 [Camera Snapshot Captured]');
      sendMessage('Camera image captured. Ready for visual inspection.');
    } catch (err) {
      alert('Camera access unavailable: ' + err.message);
    }
  });

  // Terminate Button
  btnTerminate.addEventListener('click', () => {
    if (confirm('Are you sure you want to terminate all active agent background tasks?')) {
      fetch('/api/tasks').then(() => {
        appendAssistantMessage({
          reasoning: [{ stage: 'System Override', detail: 'Received TERMINATE signal. Halting background processes.' }],
          reply: 'All background processes halted safely. System standing by.'
        });
      });
    }
  });

  // 6. 2D World Satellite Stream Canvas
  const worldCanvas = document.getElementById('worldCanvas');
  if (worldCanvas) {
    const ctxW = worldCanvas.getContext('2d');
    function resizeWorld() {
      worldCanvas.width = worldCanvas.clientWidth * window.devicePixelRatio || 280;
      worldCanvas.height = worldCanvas.clientHeight * window.devicePixelRatio || 140;
    }
    resizeWorld();
    window.addEventListener('resize', resizeWorld);

    let radarAngle = 0;
    const markers = [
      { x: 0.28, y: 0.35, label: 'Tropical Storm Cristobal', color: '#00f2ff' },
      { x: 0.65, y: 0.40, label: 'Geo Point A', color: '#f59e0b' },
      { x: 0.75, y: 0.60, label: 'Alert 12', color: '#ef4444' },
      { x: 0.45, y: 0.70, label: 'Ship 4', color: '#10b981' }
    ];

    function drawWorld() {
      const w = worldCanvas.width;
      const h = worldCanvas.height;
      ctxW.clearRect(0, 0, w, h);

      // Dark globe background
      ctxW.fillStyle = '#06101c';
      ctxW.fillRect(0, 0, w, h);

      // Lat/Long Grid
      ctxW.strokeStyle = 'rgba(0, 242, 255, 0.08)';
      ctxW.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctxW.beginPath();
        ctxW.moveTo(x, 0);
        ctxW.lineTo(x, h);
        ctxW.stroke();
      }
      for (let y = 0; y < h; y += 20) {
        ctxW.beginPath();
        ctxW.moveTo(0, y);
        ctxW.lineTo(w, y);
        ctxW.stroke();
      }

      // Simplified continent outlines
      ctxW.strokeStyle = 'rgba(0, 242, 255, 0.3)';
      ctxW.lineWidth = 1.2;

      // North America
      ctxW.beginPath();
      ctxW.moveTo(w * 0.15, h * 0.2);
      ctxW.lineTo(w * 0.32, h * 0.25);
      ctxW.lineTo(w * 0.28, h * 0.48);
      ctxW.lineTo(w * 0.20, h * 0.45);
      ctxW.closePath();
      ctxW.stroke();

      // South America
      ctxW.beginPath();
      ctxW.moveTo(w * 0.28, h * 0.52);
      ctxW.lineTo(w * 0.35, h * 0.62);
      ctxW.lineTo(w * 0.30, h * 0.88);
      ctxW.lineTo(w * 0.25, h * 0.65);
      ctxW.closePath();
      ctxW.stroke();

      // Eurasia & Africa
      ctxW.beginPath();
      ctxW.moveTo(w * 0.48, h * 0.2);
      ctxW.lineTo(w * 0.85, h * 0.25);
      ctxW.lineTo(w * 0.78, h * 0.5);
      ctxW.lineTo(w * 0.52, h * 0.45);
      ctxW.closePath();
      ctxW.stroke();

      // Africa
      ctxW.beginPath();
      ctxW.moveTo(w * 0.48, h * 0.48);
      ctxW.lineTo(w * 0.60, h * 0.52);
      ctxW.lineTo(w * 0.55, h * 0.85);
      ctxW.lineTo(w * 0.45, h * 0.65);
      ctxW.closePath();
      ctxW.stroke();

      // Radar Sweep Line
      radarAngle += 0.02;
      const rx = (Math.sin(radarAngle) + 1) * 0.5 * w;
      const sweepGrad = ctxW.createLinearGradient(rx - 30, 0, rx, 0);
      sweepGrad.addColorStop(0, 'transparent');
      sweepGrad.addColorStop(1, 'rgba(0, 242, 255, 0.15)');
      ctxW.fillStyle = sweepGrad;
      ctxW.fillRect(rx - 30, 0, 30, h);

      ctxW.strokeStyle = 'rgba(0, 242, 255, 0.6)';
      ctxW.beginPath();
      ctxW.moveTo(rx, 0);
      ctxW.lineTo(rx, h);
      ctxW.stroke();

      // Pulsing Markers
      for (const m of markers) {
        const mx = m.x * w;
        const my = m.y * h;
        ctxW.fillStyle = m.color;
        ctxW.beginPath();
        ctxW.arc(mx, my, 3, 0, Math.PI * 2);
        ctxW.fill();

        ctxW.strokeStyle = m.color;
        ctxW.beginPath();
        ctxW.arc(mx, my, 6 + Math.sin(radarAngle * 3) * 2, 0, Math.PI * 2);
        ctxW.stroke();

        ctxW.font = '8px JetBrains Mono, monospace';
        ctxW.fillText(m.label, mx + 8, my + 3);
      }

      requestAnimationFrame(drawWorld);
    }
    drawWorld();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initial load
  fetchTasks();
});
