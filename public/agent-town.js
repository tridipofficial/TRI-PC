// 2D Canvas Agent Town Simulation (Clean-Room Independent Implementation)
(function() {
  const canvas = document.getElementById('townCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.clientWidth * window.devicePixelRatio || 600;
    canvas.height = canvas.clientHeight * window.devicePixelRatio || 280;
  }
  window.addEventListener('resize', resize);
  resize();

  // Agent State Definitions
  const agents = [
    { id: 'alice', name: 'Alice', x: 120, y: 150, deskX: 120, deskY: 140, color: '#f59e0b', hair: '#d97706', shirt: '#2563eb', state: 'working', thought: 'Parsing context...', busy: false },
    { id: 'bob',   name: 'Bob',   x: 210, y: 150, deskX: 210, deskY: 140, color: '#10b981', hair: '#475569', shirt: '#10b981', state: 'working', thought: 'Tasks aligned.', busy: false },
    { id: 'carol', name: 'Carol', x: 120, y: 220, deskX: 120, deskY: 210, color: '#ec4899', hair: '#831843', shirt: '#ec4899', state: 'working', thought: 'Mindmap ready.', busy: false },
    { id: 'dave',  name: 'Dave',  x: 210, y: 220, deskX: 210, deskY: 210, color: '#38bdf8', hair: '#1e293b', shirt: '#38bdf8', state: 'working', thought: 'Security verified.', busy: false }
  ];

  let hoveredAgent = null;
  let animTick = 0;

  // Track mouse hover and click
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    hoveredAgent = null;
    for (const a of agents) {
      const dist = Math.hypot(mx - a.x, my - a.y);
      if (dist < 30) {
        hoveredAgent = a;
        break;
      }
    }
  });

  canvas.addEventListener('click', () => {
    if (hoveredAgent) {
      hoveredAgent.busy = !hoveredAgent.busy;
      const input = document.getElementById('chatInput');
      if (input) {
        input.value = `Ask ${hoveredAgent.name}: `;
        input.focus();
      }
      updateBusyMetric();
    }
  });

  function updateBusyMetric() {
    const busyCount = agents.filter(a => a.busy).length;
    const el = document.getElementById('busyMetricText');
    if (el) el.textContent = `⚡ ${busyCount}/4 Busy`;
  }

  // Draw Office Environment
  function drawOffice(w, h) {
    // Floor tiles
    ctx.fillStyle = '#161e2b';
    ctx.fillRect(0, 0, w, h);

    // Floor grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const tileSize = 32;
    for (let x = 0; x < w; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Office divider walls
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, 12);
    ctx.fillRect(w - 12, 0, 12, h);
    ctx.fillRect(0, h - 12, w, 12);
    ctx.fillRect(0, 0, 12, h);

    // Conference room wall on right
    const wallX = w * 0.58;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(wallX, 0, 10, h * 0.65);
    ctx.fillRect(wallX, h * 0.82, 10, h * 0.18);

    // Conference Table in right room
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(wallX + 40, h * 0.25, w - wallX - 80, h * 0.45, 8);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.stroke();

    // Bookshelf
    ctx.fillStyle = '#475569';
    ctx.fillRect(wallX + 30, 20, 90, 14);

    // Plants in corners
    drawPlant(24, 24);
    drawPlant(wallX - 28, 24);
    drawPlant(w - 28, h - 28);
  }

  function drawPlant(x, y) {
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDesk(x, y) {
    // Desk table
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(x - 25, y - 16, 50, 32, 4);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Monitor screen with glowing display
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - 12, y - 12, 24, 5);
    ctx.fillStyle = '#00f2ff';
    ctx.fillRect(x - 10, y - 11, 20, 3);

    // Keyboard & Mouse
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x - 8, y - 4, 16, 5);
    ctx.fillRect(x + 12, y - 3, 3, 4);

    // Office Chair
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(x, y + 20, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawAgent(a) {
    const isHovered = hoveredAgent === a;
    const breathe = Math.sin(animTick * 0.05 + a.x) * 1.5;

    // Draw agent desk
    drawDesk(a.deskX, a.deskY);

    // Agent body
    const py = a.y + breathe;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(a.x, py + 12, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shirt
    ctx.fillStyle = a.shirt;
    ctx.beginPath();
    ctx.roundRect(a.x - 7, py, 14, 12, 3);
    ctx.fill();

    // Head
    ctx.fillStyle = '#fde047'; // Skin tone
    ctx.beginPath();
    ctx.arc(a.x, py - 4, 6, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = a.hair;
    ctx.beginPath();
    ctx.arc(a.x, py - 7, 6, Math.PI, Math.PI * 2);
    ctx.fill();

    // Status bubble above head
    ctx.fillStyle = a.busy ? '#ef4444' : '#10b981';
    ctx.beginPath();
    ctx.arc(a.x + 8, py - 10, 3, 0, Math.PI * 2);
    ctx.fill();

    // Name label
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(a.name, a.x, py + 26);

    // Interaction prompt on hover
    if (isHovered) {
      ctx.fillStyle = 'rgba(0, 242, 255, 0.95)';
      ctx.beginPath();
      ctx.roundRect(a.x - 30, py - 32, 60, 16, 4);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText('CLICK / [E]', a.x, py - 21);
    } else if (a.thought && animTick % 240 < 120 && a.id === 'alice') {
      // Periodic speech bubble
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#00f2ff';
      ctx.beginPath();
      ctx.roundRect(a.x - 45, py - 32, 90, 16, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.fillText(a.thought, a.x, py - 21);
    }
  }

  function loop() {
    animTick++;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    drawOffice(w, h);

    for (const a of agents) {
      drawAgent(a);
    }

    requestAnimationFrame(loop);
  }

  loop();
})();
