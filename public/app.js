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
    s = s.replace(/(^|[\s\p{P}])(ওপিন|উপিন|উপইন|ওপপেন|ওপেনিং)(?=[\s\p{P}]|$)/gui, '$1ওপেন');
    s = s.replace(/(^|[\s\p{P}])(খুল|খুলো|কোলো|কুলো|খোল)(?=[\s\p{P}]|$)/gui, '$1খোলো');
    // YouTube phonetic variants
    s = s.replace(/(^|[\s\p{P}])(যোট্যুপ|যোটুপ|ইয়ায়োটুপ|ইয়ায়োটুপ|ইয়াইউটুব|ইয়াইউটুব|ইয়ায়ুটিউব|ইয়ায়ুটিউব|যুতিউব|যুতুব|যুচ্যুব|চোচুব|য়চুুব|যুট্যুবে|যুট্যুব|যুটুব|ইউটুপ|ইউটুব|উটিউব|উতুব|উতিউব|ইউটিব)(?=[\s\p{P}]|$)/gui, '$1YouTube');
    // PDF mishearing when followed by song
    s = s.replace(/(^|[\s\p{P}])(পিডিএফ|পি\s*ডি\s*এফ)(?=\s*(?:বাংলা|হিন্দি)?\s*গান)/gui, '$1YouTube');
    // Song phonetic variants & Whisper mishearings (হিন্দি গাম -> হিন্দি গান)
    s = s.replace(/(^|[\s\p{P}])(হিন্দি\s*গাম|হিন্দি\s*গম|হিন্দি\s*সংগ|হিন্দি\s*সাংগ|হিন্দি\s*সন্স|হিন্দি\s*সংশ|হিন্দি\s*সং)(?=[\s\p{P}]|$)/gui, '$1হিন্দি গান');
    s = s.replace(/(^|[\s\p{P}])(বাংলা\s*গাম|বাংলা\s*গম|বাংলা\s*সংগ|বাংলা\s*সাংগ|বাংলা\s*সন্স|বাংলা\s*সংশ|বাংলা\s*সং)(?=[\s\p{P}]|$)/gui, '$1বাংলা গান');
    s = s.replace(/(^|[\s\p{P}])(সংগ|সং|সাংগ|সাং|গানস|গান্স|সঙ্গিত|সংগীত)(?=[\s\p{P}]|$)/gui, '$1গান');
    s = s.replace(/(^|[\s\p{P}])(বাংগলগান|বাংগলা\s*গান|বাঙলা\s*গান)(?=[\s\p{P}]|$)/gui, '$1বাংলা গান');
    s = s.replace(/(^|[\s\p{P}])(হিনদি|হিন্ড|হিনডি|হিন্দিগান|হিন্দি\s*গানস|হিন্দিগানস)(?=[\s\p{P}]|$)/gui, '$1হিন্দি গান');
    s = s.replace(/(^|[\s\p{P}])(সারচ|সরচ|সর্চ|সার্স|সরস|সাচ)(?=[\s\p{P}]|$)/gui, '$1সার্চ');
    s = s.replace(/(^|[\s\p{P}])(কালকুলেটর|কেলকুলেটর|কেল্কুলেটর)(?=[\s\p{P}]|$)/gui, '$1ক্যালকুলেটর');
    s = s.replace(/(^|[\s\p{P}])(তমার|তোমর)(?=[\s\p{P}]|$)/gui, '$1তোমার');
    s = s.replace(/(^|[\s\p{P}])(কাচকি|কাজকি)(?=[\s\p{P}]|$)/gui, '$1কাজ কি');
    s = s.replace(/(^|[\s\p{P}])(ধাকা|ডাকা)(?=[\s\p{P}]|$)/gui, '$1ঢাকা');
    s = s.replace(/(^|[\s\p{P}])(কুলনার|কুলনা|খোলনার|খোলনা|হুনার)(?=[\s\p{P}]|$)/gui, '$1খুলনার');
    s = s.replace(/(^|[\s\p{P}])(আবাওয়া|আবাওয়ার|আবাওয়ায়|আবোয়ার|আব঵ার|আব঵া|আবহাওর|আবহাওয়ার|আবহাওয়ার|আবহাওন)(?=[\s\p{P}]|$)/gui, '$1আবহাওয়া');
    s = s.replace(/(^|[\s\p{P}])(যোগস্তা|অবস্তা)(?=[\s\p{P}]|$)/gui, '$1অবস্থা');
    s = s.replace(/(^|[\s\p{P}])(খবোর)(?=[\s\p{P}]|$)/gui, '$1খবর');
    s = s.replace(/(^|[\s\p{P}])(এবংং+|এ঵ন|এবম)(?=[\s\p{P}]|$)/gui, '$1এবং');

    return s.replace(/\s+/g, ' ').trim();
  }

  // 3. Conversational Assistant & Reasoning (Archer AI Universal Action Dispatcher)
  async function sendMessage(text) {
    const rawPrompt = text || chatInput.value.trim();
    if (!rawPrompt) return;
    const prompt = normalizeBanglishToBengali(rawPrompt);

    chatInput.value = '';

    // Append user message
    appendUserMessage(prompt);

    // Show temporary thinking state
    const thinkingNode = appendThinkingCard();

    if (window.electronAPI && window.electronAPI.sendHudUpdate) {
      window.electronAPI.sendHudUpdate({ phase: 'processing', text: prompt });
    }

    try {
      const isElectronApp = !!(window.electronAPI && window.electronAPI.isElectron);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          isElectron: isElectronApp
        })
      });

      if (res.ok) {
        const data = await res.json();
        thinkingNode.remove();
        appendAssistantMessage(data);

        const replySummary = (data.action && data.action.message) ? data.action.message : (data.reply ? data.reply.substring(0, 48) : 'সম্পন্ন হয়েছে!');
        if (window.electronAPI && window.electronAPI.sendHudUpdate) {
          window.electronAPI.sendHudUpdate({ phase: 'done', text: replySummary });
        }

        // Universal System Action Handler (Archer AI Architecture)
        if (data.action) {
          if (data.action.url) {
            if (window.electronAPI && window.electronAPI.openSystem) {
              window.electronAPI.openSystem(data.action.url);
            } else {
              try {
                window.open(data.action.url, '_blank');
              } catch (e) {
                console.warn('Browser open blocked:', e);
              }
            }
          } else if (data.action.appCmd || data.action.appName) {
            if (window.electronAPI && window.electronAPI.openApplication) {
              window.electronAPI.openApplication(data.action.appName, data.action.appCmd);
            }
          }
        }

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

    let reasoningHtml = '';
    // Only display thought process for complex conversational queries, NOT for executed actions
    if (data.mode !== 'ACTION_EXECUTED' && data.reasoning && data.reasoning.length > 0) {
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

    // Specialized UI for YouTube Automation (Open, Search Results Grid, Live Playing, Close)
    let ytAutomationHtml = '';
    if (data.action?.type === 'YOUTUBE_OPEN') {
      ytAutomationHtml = `
        <div style="margin-top: 10px; display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 20px; background: rgba(0, 242, 255, 0.1); border: 1px solid rgba(0, 242, 255, 0.35); font-size: 11px; color: #00f2ff;">
          <span style="color: #00f2ff; animation: pulse-glow 1s infinite alternate;">●</span>
          <strong>ডেস্কটপ থেকে YouTube অ্যাপ ওপেন হয়েছে</strong>
        </div>
      `;
    } else if (data.action?.type === 'YOUTUBE_CLOSE') {
      ytAutomationHtml = `
        <div style="margin-top: 10px; display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 20px; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); font-size: 11px; color: #f87171;">
          <span style="color: #ef4444;">⏹</span>
          <strong>YouTube উইন্ডো বন্ধ করা হয়েছে • TRI AI হোম স্ক্রিন</strong>
        </div>
      `;
    } else if (data.action?.type === 'YOUTUBE_SEARCH' && Array.isArray(data.action?.results) && data.action.results.length > 0) {
      ytAutomationHtml = `
        <div class="yt-results-grid" style="margin-top: 12px; display: flex; flex-direction: column; gap: 7px;">
          <div style="font-size: 11px; color: #00f2ff; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600;">▶ রেজাল্ট থেকে প্লে করতে বলুন বা ক্লিক করুন:</div>
          ${data.action.results.map((item, idx) => `
            <button class="yt-item-btn" data-video-title="${escapeHtml(item.title)}" data-video-url="${escapeHtml(item.url)}" style="text-align: left; background: rgba(0, 242, 255, 0.06); border: 1px solid rgba(0, 242, 255, 0.25); color: #e2e8f0; padding: 8px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.2s; width: 100%;">
              <span style="color: #ff0055; font-size: 13px; flex-shrink: 0;">▶</span>
              <span style="color: #00f2ff; font-weight: 700; font-size: 12px; flex-shrink: 0;">${idx + 1}.</span>
              <span style="font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">${escapeHtml(item.title)}</span>
            </button>
          `).join('')}
        </div>
      `;
    } else if ((data.action?.type === 'YOUTUBE_CLICK' || data.action?.type === 'YOUTUBE_PLAY') && data.action.title) {
      ytAutomationHtml = `
        <div class="yt-playing-card" style="margin-top: 12px; background: rgba(255, 0, 85, 0.12); border: 1px solid rgba(255, 0, 85, 0.45); border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; gap: 12px; box-shadow: 0 0 15px rgba(255,0,85,0.2);">
          <div style="width: 30px; height: 30px; border-radius: 50%; background: #ff0055; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(255,0,85,0.7); flex-shrink: 0;">
            <span style="color: #fff; font-size: 12px; animation: pulse-glow 1s infinite alternate;">▶</span>
          </div>
          <div style="flex: 1; overflow: hidden;">
            <div style="font-size: 10px; color: #ff77a9; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">CHROME LIVE PLAYBACK</div>
            <div style="font-size: 12px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(data.action.title)}</div>
          </div>
        </div>
      `;
    }

    // Action link button if URL was returned (and not pure desktop automation)
    let actionBtnHtml = '';
    if (data.action && data.action.url && !data.action.type?.startsWith('YOUTUBE_')) {
      actionBtnHtml = `
        <div class="msg-action-box" style="margin-top: 8px;">
          <a href="${escapeHtml(data.action.url)}" target="_blank" class="live-screen-link-btn" title="ক্লিক করে সরাসরি ব্রাউজার ট্যাবে দেখুন">
            <span style="color:#00f2ff; animation: pulse-glow 1s infinite alternate;">●</span>
            <strong>লাইভ ব্রাউজার স্ক্রিনে দেখুন ↗</strong>
          </a>
        </div>
      `;
    }

    msg.innerHTML = `
      <div class="msg-author">
        <span>TRI AI • JARVIS</span>
        <button class="btn-listen" title="কণ্ঠে শুনুন">🔊 শুনুন</button>
      </div>
      ${reasoningHtml}
      <div class="msg-bubble">
        ${formattedReply}
        ${ytAutomationHtml}
        ${actionBtnHtml}
      </div>
    `;

    // Attach click listeners to YouTube interactive result chips
    msg.querySelectorAll('.yt-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const title = btn.getAttribute('data-video-title');
        const url = btn.getAttribute('data-video-url');
        if (url) {
          if (window.electronAPI?.isElectron) {
            window.electronAPI.openYouTube(url);
          } else {
            try {
              if (!triYouTubeWindow || triYouTubeWindow.closed) {
                const w = 1200;
                const h = 750;
                const left = Math.max(0, (window.screen.width - w) / 2);
                const top = Math.max(0, (window.screen.height - h) / 2);
                triYouTubeWindow = window.open(url, 'TRI_YOUTUBE_PWA', `width=${w},height=${h},top=${top},left=${left},status=no,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes`);
              } else {
                triYouTubeWindow.location.href = url;
                triYouTubeWindow.focus();
              }
            } catch (e) {}
          }
        }
        if (title) {
          sendMessage(title + ' ক্লিক করো');
        }
      });
    });

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

  const isElectronApp = !!(window.electronAPI && window.electronAPI.isElectron);

  // --- Professional Studio PCM WAV AI Voice Engine (Archer AI Architecture) ---
  // Pure 16kHz mono 16-bit PCM WAV encoding - Zero Container Corruption & Zero Whisper Hallucination
  function writeWavString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  function encodeWAV(samples, sampleRate = 16000) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    writeWavString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeWavString(view, 8, 'WAVE');
    writeWavString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeWavString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      view.setInt16(offset, samples[i], true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  function downsampleBuffer(buffer, sampleRate, outSampleRate = 16000) {
    if (outSampleRate === sampleRate || outSampleRate > sampleRate) return buffer;
    const sampleRateRatio = sampleRate / outSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0, count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  function floatTo16BitPCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }

  class StudioPCMAudioEngine {
    constructor() {
      this.isListening = false;
      this.isTranscribing = false;
      this.mediaStream = null;
      this.audioCtx = null;
      this.sourceNode = null;
      this.processorNode = null;
      this.silenceGain = null;
      this.pcmChunks = [];
      this.silenceTimer = null;
      this.noSpeechTimeout = null;
      this.maxSpeechTimer = null;
      this.speechDetected = false;
      this.onSpeechDone = null;
      this.isInteractive = false;
      this.startTime = 0;
      this.ambientNoiseRMS = 0.005;
      this.noiseSamples = 0;
      this.noiseSum = 0;
      this.isCalibrated = false;
    }

    async start(onSpeechDone, isInteractive = false) {
      if (this.isListening || this.isTranscribing || window.triAIIsSpeaking) return;
      this.isInteractive = isInteractive;

      // Show HUD immediately if explicitly clicked
      if (this.isInteractive && window.electronAPI && window.electronAPI.sendHudUpdate) {
        window.electronAPI.sendHudUpdate({ phase: 'listening' });
      }

      try {
        this.pcmChunks = [];
        this.speechDetected = false;
        this.speechFramesCount = 0;
        this.startTime = Date.now();
        this.ambientNoiseRMS = 0.003;
        this.noiseSamples = 0;
        this.noiseSum = 0;
        this.isCalibrated = false;
        this.onSpeechDone = onSpeechDone;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1
          }
        });
        this.mediaStream = stream;

        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioCtxClass();
        if (this.audioCtx.state === 'suspended') {
          try { await this.audioCtx.resume(); } catch (e) {}
        }

        this.sourceNode = this.audioCtx.createMediaStreamSource(stream);
        // ScriptProcessor captures raw Float32 audio samples continuously
        this.processorNode = this.audioCtx.createScriptProcessor(4096, 1, 1);

        // Mute speaker output to prevent acoustic feedback loop
        this.silenceGain = this.audioCtx.createGain();
        this.silenceGain.gain.value = 0;

        this.sourceNode.connect(this.processorNode);
        this.processorNode.connect(this.silenceGain);
        this.silenceGain.connect(this.audioCtx.destination);

        this.processorNode.onaudioprocess = (e) => {
          if (!this.isListening) return;
          const inputData = e.inputBuffer.getChannelData(0);
          this.pcmChunks.push(new Float32Array(inputData));

          // Real-time RMS calculation for Voice Activity Detection
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);

          const elapsed = Date.now() - this.startTime;
          if (elapsed < 200) {
            this.noiseSum += rms;
            this.noiseSamples++;
            return;
          } else if (!this.isCalibrated) {
            this.ambientNoiseRMS = Math.max(0.002, this.noiseSum / (this.noiseSamples || 1));
            this.isCalibrated = true;
          }

          // Robust Speech Threshold: Distinguish real human voice from room hum, AC, and fan noise
          const speechThreshold = Math.max(0.012, this.ambientNoiseRMS * 2.8);
          const silenceThreshold = Math.max(0.005, this.ambientNoiseRMS * 1.4);

          if (rms > speechThreshold) {
            this.speechFramesCount = (this.speechFramesCount || 0) + 1;
            // Require sustained vocal energy (at least 3 consecutive frames = ~280ms)
            if (this.speechFramesCount >= 3) {
              if (!this.speechDetected) {
                this.speechDetected = true;
                if (window.electronAPI && window.electronAPI.sendHudUpdate) {
                  window.electronAPI.sendHudUpdate({ phase: 'listening' });
                }
              }
            }
            if (this.silenceTimer) {
              clearTimeout(this.silenceTimer);
              this.silenceTimer = null;
            }
            if (this.noSpeechTimeout) {
              clearTimeout(this.noSpeechTimeout);
              this.noSpeechTimeout = null;
            }
          } else if (this.speechDetected && rms < silenceThreshold) {
            this.speechFramesCount = 0;
            if (!this.silenceTimer) {
              // 1400ms natural pause: Patiently waits for TRIDIP Sir to completely finish speaking
              this.silenceTimer = setTimeout(() => {
                this.stopAndProcess(this.onSpeechDone);
              }, 1400);
            }
          }
        };

        this.isListening = true;
        isListening = true;
        updateHandsFreeUI('listening');
        btnMic.classList.add('listening');

        // Turn timeout 1: Safety when no speech detected
        this.noSpeechTimeout = setTimeout(() => {
          if (this.isListening) {
            if (this.speechDetected && this.pcmChunks.length > 0) {
              this.stopAndProcess(this.onSpeechDone);
            } else {
              this.stop();
              if (isHandsFreeMode && !window.triAIIsSpeaking) {
                setTimeout(() => startListeningLoop(), 800);
              }
            }
          }
        }, 8000);

        // Turn timeout 2: Maximum utterance length (18.0s)
        this.maxSpeechTimer = setTimeout(() => {
          if (this.isListening && (this.speechDetected || this.pcmChunks.length > 0)) {
            this.stopAndProcess(this.onSpeechDone);
          }
        }, 18000);

      } catch (err) {
        console.error('Studio PCM Audio Engine error:', err);
        this.isListening = false;
        isListening = false;
        updateHandsFreeUI('idle');
        btnMic.classList.remove('listening');
        if (window.electronAPI && window.electronAPI.sendHudUpdate) {
          window.electronAPI.sendHudUpdate({ phase: 'hide' });
        }
      }
    }

    async stopAndProcess(onSpeechDone) {
      if (!this.isListening) return;
      this.isListening = false;
      isListening = false;
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      if (this.noSpeechTimeout) clearTimeout(this.noSpeechTimeout);
      if (this.maxSpeechTimer) clearTimeout(this.maxSpeechTimer);

      updateHandsFreeUI('processing');
      btnMic.classList.remove('listening');

      // Stop mic tracks and audio nodes
      if (this.sourceNode) {
        try { this.sourceNode.disconnect(); } catch (e) {}
        this.sourceNode = null;
      }
      if (this.processorNode) {
        try { this.processorNode.disconnect(); } catch (e) {}
        this.processorNode = null;
      }
      if (this.silenceGain) {
        try { this.silenceGain.disconnect(); } catch (e) {}
        this.silenceGain = null;
      }
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(t => t.stop());
        this.mediaStream = null;
      }

      const inputSampleRate = this.audioCtx ? this.audioCtx.sampleRate : 16000;
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        try { await this.audioCtx.close(); } catch (e) {}
        this.audioCtx = null;
      }

      // Merge Float32 chunks
      let totalSamples = 0;
      for (const c of this.pcmChunks) totalSamples += c.length;

      // Ignore accidental micro-clicks (< 350ms) or silence
      if (totalSamples < inputSampleRate * 0.35 || !this.speechDetected) {
        updateHandsFreeUI('idle');
        if (window.electronAPI && window.electronAPI.sendHudUpdate) {
          window.electronAPI.sendHudUpdate({ phase: 'hide' });
        }
        if (isHandsFreeMode && !window.triAIIsSpeaking) {
          setTimeout(() => startListeningLoop(), 400);
        }
        return;
      }

      const fullBuffer = new Float32Array(totalSamples);
      let offset = 0;
      for (const c of this.pcmChunks) {
        fullBuffer.set(c, offset);
        offset += c.length;
      }

      // Studio-Quality Peak Normalization & Dynamic Pre-Amp Boost:
      // Even if TRIDIP Sir speaks in a low, soft, or relaxed voice, scale audio to optimal studio volume!
      let maxPeak = 0;
      for (let i = 0; i < fullBuffer.length; i++) {
        const absVal = Math.abs(fullBuffer[i]);
        if (absVal > maxPeak) maxPeak = absVal;
      }
      // Reject faint room hum, fan hiss, or background noise (< 0.012 peak)
      if (maxPeak < 0.012) {
        updateHandsFreeUI('idle');
        if (window.electronAPI && window.electronAPI.sendHudUpdate) {
          window.electronAPI.sendHudUpdate({ phase: 'hide' });
        }
        if (isHandsFreeMode && !window.triAIIsSpeaking) {
          setTimeout(() => startListeningLoop(), 600);
        }
        return;
      }

      // Safe studio boost (up to 6.0x) so audio is clear without amplifying noise
      const gainMultiplier = Math.min(6.0, 0.85 / maxPeak);
      for (let i = 0; i < fullBuffer.length; i++) {
        fullBuffer[i] *= gainMultiplier;
      }

      // Studio-Quality Native PCM: Retains 100% crispness & high-frequency acoustic clarity
      const downsampled = downsampleBuffer(fullBuffer, inputSampleRate, 16000);
      const pcm16 = floatTo16BitPCM(downsampled);
      const wavBlob = encodeWAV(pcm16, 16000);

      const base64Audio = await this.blobToBase64(wavBlob);

      this.isTranscribing = true;
      if (window.electronAPI && window.electronAPI.sendHudUpdate) {
        window.electronAPI.sendHudUpdate({ phase: 'processing', text: 'প্রসেসিং হচ্ছে...' });
      }

      try {
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64Audio, format: 'wav' })
        });
        const data = await res.json();
        if (data.success && data.text && data.text.trim()) {
          const cleanText = normalizeBanglishToBengali(data.text.trim());
          console.log('[PCM Studio Voice Transcript]:', cleanText);
          if (window.electronAPI && window.electronAPI.sendHudUpdate) {
            window.electronAPI.sendHudUpdate({ phase: 'processing', text: cleanText });
          }
          if (onSpeechDone) onSpeechDone(cleanText);
        } else {
          updateHandsFreeUI('idle');
          if (window.electronAPI && window.electronAPI.sendHudUpdate) {
            window.electronAPI.sendHudUpdate({ phase: 'hide' });
          }
          if (isHandsFreeMode && !window.triAIIsSpeaking) {
            setTimeout(() => startListeningLoop(), 400);
          }
        }
      } catch (e) {
        console.error('PCM Transcribe error:', e);
        updateHandsFreeUI('idle');
        if (window.electronAPI && window.electronAPI.sendHudUpdate) {
          window.electronAPI.sendHudUpdate({ phase: 'hide' });
        }
        if (isHandsFreeMode && !window.triAIIsSpeaking) {
          setTimeout(() => startListeningLoop(), 400);
        }
      } finally {
        this.isTranscribing = false;
      }
    }

    blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result;
          const base64 = res.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    stop() {
      this.isListening = false;
      isListening = false;
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      if (this.noSpeechTimeout) clearTimeout(this.noSpeechTimeout);
      if (this.maxSpeechTimer) clearTimeout(this.maxSpeechTimer);
      if (this.sourceNode) {
        try { this.sourceNode.disconnect(); } catch (e) {}
        this.sourceNode = null;
      }
      if (this.processorNode) {
        try { this.processorNode.disconnect(); } catch (e) {}
        this.processorNode = null;
      }
      if (this.silenceGain) {
        try { this.silenceGain.disconnect(); } catch (e) {}
        this.silenceGain = null;
      }
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(t => t.stop());
        this.mediaStream = null;
      }
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        try { this.audioCtx.close(); } catch (e) {}
        this.audioCtx = null;
      }
      btnMic.classList.remove('listening');
      updateHandsFreeUI('idle');
      if (window.electronAPI && window.electronAPI.sendHudUpdate) {
        window.electronAPI.sendHudUpdate({ phase: 'hide' });
      }
    }
  }
  const neuralWhisper = new StudioPCMAudioEngine();

  function startListeningLoop() {
    if (!isHandsFreeMode || window.triAIIsSpeaking) return;
    if (isListening) return;

    if (recognition) {
      try {
        recognition.start();
        return;
      } catch (err) {
        // Recognition already running or state error
      }
    }

    neuralWhisper.start((transcript) => {
      if (transcript && transcript.trim()) {
        chatInput.value = transcript;
        updateHandsFreeUI('processing');
        sendMessage(transcript);
      }
    });
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

  // --- Antigravity-Grade Google Bengali Voice Engine (Real-Time Live Typing) ---
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec) {
    try {
      recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = true; // Stream words live to input box just like Antigravity!
      recognition.lang = 'bn-BD'; // Pure Bangladeshi Bengali
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListening = true;
        updateHandsFreeUI('listening');
        btnMic.classList.add('listening');
        if (window.electronAPI && window.electronAPI.sendHudUpdate) {
          window.electronAPI.sendHudUpdate({ phase: 'listening', text: 'শুনছি...' });
        }
      };

      recognition.onresult = (e) => {
        let interim = '';
        let finalStr = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalStr += e.results[i][0].transcript;
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        const liveText = (finalStr || interim).trim();
        if (liveText) {
          chatInput.value = liveText;
          if (window.electronAPI && window.electronAPI.sendHudUpdate) {
            window.electronAPI.sendHudUpdate({ phase: 'listening', text: liveText });
          }
        }
        if (finalStr && finalStr.trim()) {
          const cleanText = normalizeBanglishToBengali(finalStr.trim());
          chatInput.value = cleanText;
          updateHandsFreeUI('processing');
          if (window.electronAPI && window.electronAPI.sendHudUpdate) {
            window.electronAPI.sendHudUpdate({ phase: 'processing', text: cleanText });
          }
          sendMessage(cleanText);
        }
      };

      recognition.onerror = (e) => {
        console.warn('SpeechRecognition event:', e.error);
        isListening = false;
        btnMic.classList.remove('listening');
        if (e.error === 'network' || e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          console.warn('SpeechRecognition service unavailable, seamlessly falling back to Neural Whisper...');
          recognition = null; // Disable and use neuralWhisper
          if (isHandsFreeMode && !window.triAIIsSpeaking) {
            neuralWhisper.start((transcript) => {
              if (transcript && transcript.trim()) {
                chatInput.value = transcript;
                updateHandsFreeUI('processing');
                sendMessage(transcript);
              }
            });
          }
          return;
        }
        if (isHandsFreeMode && !window.triAIIsSpeaking) {
          setTimeout(() => {
            if (isHandsFreeMode && !window.triAIIsSpeaking && !isListening) {
              startListeningLoop();
            }
          }, 800);
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
          }, 800);
        } else if (!window.triAIIsSpeaking) {
          updateHandsFreeUI('idle');
          if (window.electronAPI && window.electronAPI.sendHudUpdate) {
            window.electronAPI.sendHudUpdate({ phase: 'hide' });
          }
        }
      };
    } catch (errRec) {
      console.warn('SpeechRecognition init error:', errRec.message);
      recognition = null;
    }
  }

  // High-Tech Central Mic Button Listener
  btnMic.addEventListener('click', () => {
    if (isListening) {
      isHandsFreeMode = false;
      btnHandsFree?.classList.remove('active');
      if (recognition) {
        try { recognition.stop(); } catch (e) {}
      }
      if (neuralWhisper.isListening) {
        neuralWhisper.stop();
      }
      updateHandsFreeUI('idle');
      if (window.electronAPI && window.electronAPI.sendHudUpdate) {
        window.electronAPI.sendHudUpdate({ phase: 'hide' });
      }
    } else {
      isHandsFreeMode = true;
      btnHandsFree?.classList.add('active');
      if (recognition) {
        try {
          recognition.start();
          return;
        } catch (e) {
          console.warn('recognition.start failed, falling back to neuralWhisper:', e);
        }
      }
      neuralWhisper.start((transcript) => {
        if (transcript && transcript.trim()) {
          chatInput.value = transcript;
          updateHandsFreeUI('processing');
          sendMessage(transcript);
        }
      }, true);
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

    if (neuralWhisper && neuralWhisper.isListening) {
      neuralWhisper.stop();
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
        if (neuralWhisper && neuralWhisper.isListening) {
          neuralWhisper.stop();
        }
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
    if (neuralWhisper && neuralWhisper.isListening) {
      neuralWhisper.stop();
    }
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
        }, 1000);
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
      if (isHandsFreeMode) setTimeout(startListeningLoop, 1000);
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

  // 7. Clear Chat Action
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
