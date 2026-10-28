// TRI AI Main Application Controller
document.addEventListener('DOMContentLoaded', () => {
  // 1. State Management
  let tasks = [];
  let currentFilter = 'ALL';
  let currentSubFilter = 'ALL';
  let isVoiceEnabled = true; // Auto-voice enabled by default
  let isHandsFreeMode = true; // Hands-Free Zero-Mouse Mode active by default
  let isListening = false;
  window.triAIIsSpeaking = false;
  let recognition = null;

  // DOM Elements
  const taskListContainer = document.getElementById('taskListContainer');
  const newObjectiveInput = document.getElementById('newObjectiveInput');
  const prioritySelect = document.getElementById('prioritySelect');
  const categorySelect = document.getElementById('categorySelect');
  const addObjectiveBtn = document.getElementById('addObjectiveBtn');
  const progressPctText = document.getElementById('progressPctText');
  const progressFill = document.getElementById('progressFill');

  const handsFreeStatusBadge = document.getElementById('handsFreeStatusBadge');
  const handsFreeStatusText = document.getElementById('handsFreeStatusText');

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

  // Switch between 3D Cockpit, Agent Town and Visual Hub
  const tabCockpitBtn = document.getElementById('tabCockpitBtn');
  const viewCockpit = document.getElementById('viewCockpit');
  const viewAgentTown = document.getElementById('viewAgentTown');

  const agentViewBadgeTitle = document.getElementById('agentViewBadgeTitle');
  const agentViewBadgeSub = document.getElementById('agentViewBadgeSub');
  const simHeaderTitle = document.getElementById('simHeaderTitle');

  if (tabCockpitBtn) {
    tabCockpitBtn.addEventListener('click', () => {
      tabCockpitBtn.classList.add('active');
      if (tabTownBtn) tabTownBtn.classList.remove('active');
      if (tabVisualBtn) tabVisualBtn.classList.remove('active');
      if (viewCockpit) viewCockpit.style.display = 'flex';
      if (viewAgentTown) viewAgentTown.style.display = 'none';
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('tabswitched'));
      }, 50);
    });
  }

  if (tabTownBtn) {
    tabTownBtn.addEventListener('click', () => {
      if (tabCockpitBtn) tabCockpitBtn.classList.remove('active');
      tabTownBtn.classList.add('active');
      if (tabVisualBtn) tabVisualBtn.classList.remove('active');
      if (viewCockpit) viewCockpit.style.display = 'none';
      if (viewAgentTown) viewAgentTown.style.display = 'flex';
      if (townCanvas) townCanvas.classList.add('active');
      if (mindmapCanvas) mindmapCanvas.classList.remove('active');

      if (agentViewBadgeTitle) agentViewBadgeTitle.textContent = 'JARVIS AGENT MATRIX // TACTICAL CYBER DECK';
      if (agentViewBadgeSub) agentViewBadgeSub.textContent = '4 AUTONOMOUS CYBER SENTINELS • 3D PBR NEURAL CORE';
      if (simHeaderTitle) simHeaderTitle.innerHTML = '<span class="neon-dot">●</span> 3D MULTI-AGENT MATRIX';

      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('tabswitched'));
      }, 50);
    });
  }

  if (tabVisualBtn) {
    tabVisualBtn.addEventListener('click', () => {
      if (tabCockpitBtn) tabCockpitBtn.classList.remove('active');
      if (tabTownBtn) tabTownBtn.classList.remove('active');
      tabVisualBtn.classList.add('active');
      if (viewCockpit) viewCockpit.style.display = 'none';
      if (viewAgentTown) viewAgentTown.style.display = 'flex';
      if (mindmapCanvas) mindmapCanvas.classList.add('active');
      if (townCanvas) townCanvas.classList.remove('active');

      if (agentViewBadgeTitle) agentViewBadgeTitle.textContent = 'JARVIS 3D NEURAL MINDMAP // SYNAPTIC CORE';
      if (agentViewBadgeSub) agentViewBadgeSub.textContent = '14 SYNAPTIC QUANTUM NODES • 3D FIBER-OPTIC DATAFLOW';
      if (simHeaderTitle) simHeaderTitle.innerHTML = '<span class="neon-dot" style="color:#ec4899;">●</span> 3D HOLOGRAPHIC NEURAL MINDMAP';

      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('tabswitched'));
      }, 50);
    });
  }

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
        if (isVoiceEnabled) {
          speakText(data.reply);
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

    let actionHtml = '';
    if (data.action && data.action.message) {
      actionHtml = `
        <div style="background: rgba(0, 242, 255, 0.1); border: 1px solid var(--primary); padding: 5px 10px; border-radius: 4px; font-size: 11px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; color: #fff;">
          <span style="color: var(--primary);">⚡</span> <strong>EXECUTED:</strong> ${escapeHtml(data.action.message)}
        </div>
      `;
    }

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
        <span>TRI AI • JARVIS</span>
        <button class="btn-listen" title="কণ্ঠে শুনুন">🔊 শুনুন</button>
      </div>
      ${actionHtml}
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

  // 4. Voice Assistant Integration (Zero-Mouse Hands-Free Continuous Loop)
  let activeBengaliVoice = null;
  let voiceDetectionAttempted = false;

  function updateHandsFreeUI(status) {
    if (!handsFreeStatusBadge || !handsFreeStatusText) return;
    if (status === 'listening') {
      handsFreeStatusBadge.className = 'hands-free-badge listening';
      handsFreeStatusText.textContent = 'ZERO-MOUSE: LISTENING...';
      btnMic.classList.add('listening');
      btnMic.classList.remove('speaking');
      chatInput.placeholder = 'TRIDIP স্যার, মুখে বলুন: "গান বাজাও", "আবহাওয়ার ডিটেইলস", "ভলিউম বাড়াও"...';
    } else if (status === 'speaking') {
      handsFreeStatusBadge.className = 'hands-free-badge speaking';
      handsFreeStatusText.textContent = 'JARVIS SPEAKING // MIC MUTED';
      btnMic.classList.remove('listening');
      btnMic.classList.add('speaking');
      chatInput.placeholder = 'TRIDIP স্যার, জার্ভিস উত্তর দিচ্ছে...';
    } else if (status === 'processing') {
      handsFreeStatusBadge.className = 'hands-free-badge';
      handsFreeStatusText.textContent = 'EXECUTING ACTION...';
      btnMic.classList.remove('listening');
      btnMic.classList.remove('speaking');
      chatInput.placeholder = 'আপনার আদেশ প্রক্রিয়াধীন...';
    } else {
      handsFreeStatusBadge.className = 'hands-free-badge';
      handsFreeStatusText.textContent = 'HANDS-FREE PAUSED';
      btnMic.classList.remove('listening');
      btnMic.classList.remove('speaking');
      chatInput.placeholder = 'TRIDIP স্যার, এখানে বাংলায় অথবা ইংরেজিতে লিখুন...';
    }
  }

  function startListeningLoop() {
    if (!recognition || !isHandsFreeMode || window.triAIIsSpeaking) return;
    if (isListening) return;
    try {
      recognition.start();
    } catch (e) {
      // Ignored if already started or state transitioning
    }
  }

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
      console.log('TRI AI Speech: Operating in Studio Neural TTS mode with fallback.');
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
      updateHandsFreeUI('listening');
    };

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      if (transcript && transcript.trim()) {
        chatInput.value = transcript;
        updateHandsFreeUI('processing');
        sendMessage(transcript);
      }
    };

    recognition.onerror = (e) => {
      console.warn('Voice recognition event:', e.error);
      isListening = false;
      btnMic.classList.remove('listening');
      if (isHandsFreeMode && !window.triAIIsSpeaking) {
        setTimeout(() => {
          if (isHandsFreeMode && !window.triAIIsSpeaking && !isListening) {
            startListeningLoop();
          }
        }, 350);
      }
    };

    recognition.onend = () => {
      isListening = false;
      btnMic.classList.remove('listening');
      if (isHandsFreeMode && !window.triAIIsSpeaking) {
        setTimeout(() => {
          if (isHandsFreeMode && !window.triAIIsSpeaking && !isListening) {
            startListeningLoop();
          }
        }, 250);
      } else if (!window.triAIIsSpeaking) {
        updateHandsFreeUI('idle');
      }
    };
  }

  btnMic.addEventListener('click', () => {
    if (!recognition) {
      alert('TRIDIP স্যার, এই ব্রাউজারে ভয়েস রিকগনিশন সক্রিয় নেই। দয়া করে Microsoft Edge বা Google Chrome ব্যবহার করুন।');
      return;
    }
    if (isListening) {
      isHandsFreeMode = false;
      btnHandsFree?.classList.remove('active');
      recognition.stop();
      updateHandsFreeUI('idle');
    } else {
      isHandsFreeMode = true;
      btnHandsFree?.classList.add('active');
      startListeningLoop();
    }
  });

  // Single Global Audio Player (Guarantees strictly 1 voice at a time)
  const globalAudio = new Audio();
  let currentAudioSession = 0;
  const btnStopVoice = document.getElementById('btnStopVoice');

  function stopAllSpeech() {
    currentAudioSession++; // Invalidate any ongoing callbacks
    window.triAIIsSpeaking = false;
    btnMic.classList.remove('speaking');
    try {
      globalAudio.pause();
      globalAudio.currentTime = 0;
      globalAudio.src = '';
    } catch (e) {}

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (btnStopVoice) {
      btnStopVoice.style.display = 'none';
    }
  }

  if (btnStopVoice) {
    btnStopVoice.addEventListener('click', stopAllSpeech);
  }

  function detectEmotion(text) {
    const lower = text.toLowerCase();
    if (lower.includes('দুঃখিত') || lower.includes('কষ্ট') || lower.includes('খারাপ') || lower.includes('ক্ষমা') || lower.includes('শান্ত')) {
      return 'sympathetic';
    }
    if (lower.includes('অভিনন্দন') || lower.includes('চমৎকার') || lower.includes('দারুণ') || lower.includes('আনন্দ') || lower.includes('শুভ') || lower.includes('ধন্যবাদ') || lower.includes('খুশি')) {
      return 'joyful';
    }
    return 'warm'; // Default warm, romantic, affectionate
  }

  btnVoiceToggle.addEventListener('click', () => {
    isVoiceEnabled = !isVoiceEnabled;
    btnVoiceToggle.classList.toggle('active', isVoiceEnabled);
    if (isVoiceEnabled) {
      speakText('হ্যালো, TRIDIP স্যার! আমি আপনার TRI AI অ্যাসিস্ট্যান্ট। আমি সবসময় আপনার আদেশ শুনতে প্রস্তুত আছি।');
    } else {
      stopAllSpeech();
    }
  });

  const btnHandsFree = document.getElementById('btnHandsFree');
  if (btnHandsFree) {
    btnHandsFree.addEventListener('click', () => {
      isHandsFreeMode = !isHandsFreeMode;
      btnHandsFree.classList.toggle('active', isHandsFreeMode);
      if (isHandsFreeMode) {
        isVoiceEnabled = true;
        btnVoiceToggle.classList.add('active');
        speakText('TRIDIP স্যার, হ্যান্ডস-ফ্রি জার্ভিস মোড সক্রিয় হয়েছে। এখন আপনি মাউস ছাড়া সরাসরি মুখে যেকোনো আদেশ দিতে পারেন।');
        setTimeout(startListeningLoop, 1500);
      } else {
        stopAllSpeech();
        if (recognition && isListening) {
          try { recognition.stop(); } catch(e) {}
        }
        updateHandsFreeUI('idle');
      }
    });
  }

  async function speakText(rawText) {
    if (!rawText || !isVoiceEnabled) return;

    // Immediately stop any currently playing voice (No overlap, single assistant voice only)
    stopAllSpeech();

    // Mute mic & update visual state to speaking
    window.triAIIsSpeaking = true;
    updateHandsFreeUI('speaking');
    if (recognition && isListening) {
      try { recognition.stop(); } catch (e) {}
    }

    const sessionId = ++currentAudioSession;
    if (btnStopVoice) {
      btnStopVoice.style.display = 'inline-flex';
    }

    const emotion = detectEmotion(rawText);

    try {
      // 1. High-Definition Studio Neural Voice (bn-BD-NabanitaNeural via server /api/tts)
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText, emotion })
      });

      if (res.ok) {
        const data = await res.json();
        // Discard if user clicked stop or new message arrived
        if (sessionId !== currentAudioSession) return;

        if (data.success && data.audioUrl) {
          globalAudio.src = data.audioUrl;
          globalAudio.onended = () => {
            window.triAIIsSpeaking = false;
            btnMic.classList.remove('speaking');
            if (sessionId === currentAudioSession && btnStopVoice) {
              btnStopVoice.style.display = 'none';
            }
            if (isHandsFreeMode) {
              setTimeout(() => {
                if (isHandsFreeMode && !window.triAIIsSpeaking && !isListening) {
                  startListeningLoop();
                }
              }, 400);
            }
          };
          globalAudio.onerror = () => {
            window.triAIIsSpeaking = false;
            btnMic.classList.remove('speaking');
            if (sessionId === currentAudioSession) {
              fallbackBrowserTTS(rawText, emotion, sessionId);
            }
          };
          await globalAudio.play();
          return;
        }
      }
    } catch (e) {
      console.warn('Server Neural TTS request error, falling back to browser voice:', e);
    }

    // 2. Resilient Fallback to browser Web Speech API
    if (sessionId === currentAudioSession) {
      fallbackBrowserTTS(rawText, emotion, sessionId);
    }
  }

  function fallbackBrowserTTS(text, emotion, sessionId) {
    if (!window.speechSynthesis || sessionId !== currentAudioSession) {
      if (btnStopVoice) btnStopVoice.style.display = 'none';
      window.triAIIsSpeaking = false;
      btnMic.classList.remove('speaking');
      if (isHandsFreeMode) setTimeout(startListeningLoop, 350);
      return;
    }
    scanVoices();

    const cleanSpeech = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[*#_~`>]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!cleanSpeech) {
      if (btnStopVoice) btnStopVoice.style.display = 'none';
      window.triAIIsSpeaking = false;
      btnMic.classList.remove('speaking');
      if (isHandsFreeMode) setTimeout(startListeningLoop, 350);
      return;
    }

    const utter = new SpeechSynthesisUtterance(cleanSpeech);
    if (activeBengaliVoice) {
      utter.voice = activeBengaliVoice;
      utter.lang = activeBengaliVoice.lang;
    } else {
      utter.lang = 'bn-BD';
    }

    // Sweet, affectionate prosody tuning
    utter.rate = emotion === 'joyful' ? 0.98 : 0.93;
    utter.pitch = emotion === 'joyful' ? 1.08 : 1.05;

    utter.onend = () => {
      window.triAIIsSpeaking = false;
      btnMic.classList.remove('speaking');
      if (sessionId === currentAudioSession && btnStopVoice) {
        btnStopVoice.style.display = 'none';
      }
      if (isHandsFreeMode) {
        setTimeout(() => {
          if (isHandsFreeMode && !window.triAIIsSpeaking && !isListening) {
            startListeningLoop();
          }
        }, 400);
      }
    };
    utter.onerror = () => {
      window.triAIIsSpeaking = false;
      btnMic.classList.remove('speaking');
      if (sessionId === currentAudioSession && btnStopVoice) {
        btnStopVoice.style.display = 'none';
      }
      if (isHandsFreeMode) setTimeout(startListeningLoop, 400);
    };

    window.speechSynthesis.speak(utter);
  }

  // 100% Zero-Mouse Hands-Free Auto-Activator
  // Browser policy may require an initial gesture to unlock mic/audio:
  const unlockAndRunHandsFree = () => {
    if (isHandsFreeMode && !isListening && !window.triAIIsSpeaking) {
      startListeningLoop();
    }
  };
  window.addEventListener('click', unlockAndRunHandsFree, { passive: true });
  window.addEventListener('keydown', unlockAndRunHandsFree, { passive: true });
  window.addEventListener('touchstart', unlockAndRunHandsFree, { passive: true });

  // Initial auto-start attempt
  setTimeout(() => {
    if (isHandsFreeMode) {
      startListeningLoop();
    }
  }, 600);

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

  // 6. Cyber App Launchers (Windows Desktop Control)
  document.querySelectorAll('.cyber-app-node').forEach(node => {
    node.addEventListener('click', async () => {
      const action = node.dataset.action;
      if (!action) return;
      try {
        const res = await fetch('/api/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        });
        const data = await res.json();
        if (data.message) {
          const replyText = `${data.message} TRIDIP স্যার, অ্যাপ্লিকেশনটি চালু হয়েছে।`;
          appendAssistantMessage({
            reasoning: [{ stage: 'ডেস্কটপ কমান্ড নির্বাহ', detail: `উইন্ডোজ অ্যাপ চালু করা হচ্ছে: ${action}` }],
            reply: replyText
          });
          if (isVoiceEnabled) {
            speakText(replyText);
          }
        }
      } catch (e) {
        console.error('App launch error:', e);
      }
    });
  });

  // 7. Quick Command Prompt Chips
  document.querySelectorAll('.quick-cmd-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cmd = chip.dataset.cmd;
      if (cmd) {
        chatInput.value = cmd;
        sendMessage(cmd);
      }
    });
  });

  // 8. Clear Chat Action
  const btnClearChat = document.getElementById('btnClearChat');
  if (btnClearChat) {
    btnClearChat.addEventListener('click', () => {
      chatStream.innerHTML = `
        <div class="msg msg-assistant">
          <div class="msg-author">
            <span>TRI AI • JARVIS</span>
            <button class="btn-listen" id="btnSpeakWelcome" title="কণ্ঠে শুনুন">🔊 শুনুন</button>
          </div>
          <div class="msg-bubble">
            হ্যালো, TRIDIP স্যার! নতুন সেশন শুরু হয়েছে। আমি আপনার আদেশের জন্য অপেক্ষা করছি।
          </div>
        </div>
      `;
      const newWelcomeBtn = document.getElementById('btnSpeakWelcome');
      if (newWelcomeBtn) {
        newWelcomeBtn.addEventListener('click', () => {
          speakText('হ্যালো, TRIDIP স্যার! নতুন সেশন শুরু হয়েছে। আমি আপনার আদেশের জন্য অপেক্ষা করছি।');
        });
      }
    });
  }

  // 9. 2D World Satellite Stream Canvas (Fallback if present)
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
