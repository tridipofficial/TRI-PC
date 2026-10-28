// Interactive Visual Hub (Mindmap & Concept Graph Engine)
(function() {
  const canvas = document.getElementById('mindmapCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.clientWidth * window.devicePixelRatio || 600;
    canvas.height = canvas.clientHeight * window.devicePixelRatio || 280;
  }
  window.addEventListener('resize', resize);
  resize();

  // Mindmap Node Graph Data (Default Topic: "TRI AI Architecture")
  const defaultGraph = {
    title: 'TRI AI',
    nodes: [
      { id: 'root', label: 'TRI AI Core', x: 0, y: 0, radius: 28, color: '#00f2ff', textColor: '#000', root: true },
      
      // Branch 1: Neural Core
      { id: 'b1', parent: 'root', label: 'Neural Core', x: -140, y: -60, radius: 20, color: '#38bdf8' },
      { id: 'b1_1', parent: 'b1', label: 'Memory', x: -220, y: -90, radius: 14, color: '#10b981' },
      { id: 'b1_2', parent: 'b1', label: 'Soul / Persona', x: -230, y: -40, radius: 14, color: '#e2e8f0' },
      
      // Branch 2: Agent Town
      { id: 'b2', parent: 'root', label: 'Agent Town', x: 140, y: -60, radius: 20, color: '#f59e0b' },
      { id: 'b2_1', parent: 'b2', label: 'Alice (Research)', x: 230, y: -90, radius: 14, color: '#fbbf24' },
      { id: 'b2_2', parent: 'b2', label: 'Bob (Tasks)', x: 230, y: -40, radius: 14, color: '#34d399' },
      
      // Branch 3: Local Offline AI
      { id: 'b3', parent: 'root', label: 'Local Intelligence', x: -140, y: 60, radius: 20, color: '#a855f7' },
      { id: 'b3_1', parent: 'b3', label: 'Ollama Bridge', x: -230, y: 50, radius: 14, color: '#c084fc' },
      { id: 'b3_2', parent: 'b3', label: 'Context Engine', x: -220, y: 100, radius: 14, color: '#818cf8' },

      // Branch 4: Multimodal Inputs
      { id: 'b4', parent: 'root', label: 'Multimodal Inputs', x: 140, y: 60, radius: 20, color: '#ec4899' },
      { id: 'b4_1', parent: 'b4', label: 'Screen Capture', x: 220, y: 50, radius: 14, color: '#f472b6' },
      { id: 'b4_2', parent: 'b4', label: 'Voice Assistant', x: 230, y: 100, radius: 14, color: '#fb7185' }
    ]
  };

  let panX = 0;
  let panY = 0;
  let zoom = 1.0;
  let isDragging = false;
  let startX = 0, startY = 0;
  let hoveredNode = null;

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
  });

  window.addEventListener('mouseup', () => { isDragging = false; });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      panX = e.clientX - startX;
      panY = e.clientY - startY;
    }

    const rect = canvas.getBoundingClientRect();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width) - cx - panX;
    const my = (e.clientY - rect.top) * (canvas.height / rect.height) - cy - panY;

    hoveredNode = null;
    for (const n of defaultGraph.nodes) {
      if (Math.hypot(mx - n.x, my - n.y) < n.radius) {
        hoveredNode = n;
        break;
      }
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    zoom = Math.min(Math.max(zoom * zoomFactor, 0.4), 2.2);
  });

  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Dark grid background
    ctx.fillStyle = '#0a0f16';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2 + panX, h / 2 + panY);
    ctx.scale(zoom, zoom);

    // Draw branch connecting lines
    const nodeMap = {};
    for (const n of defaultGraph.nodes) nodeMap[n.id] = n;

    for (const n of defaultGraph.nodes) {
      if (n.parent && nodeMap[n.parent]) {
        const p = nodeMap[n.parent];
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(n.x, n.y);
        ctx.strokeStyle = n.color || 'rgba(0, 242, 255, 0.4)';
        ctx.lineWidth = n.root ? 3 : 2;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1.0;

    // Draw Nodes
    for (const n of defaultGraph.nodes) {
      const isHov = hoveredNode === n;

      // Outer glow on hover
      if (isHov) {
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 6, 0, Math.PI * 2);
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Main Node Circle
      ctx.fillStyle = n.root ? '#00f2ff' : '#162232';
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = n.color;
      ctx.lineWidth = n.root ? 3 : 1.5;
      ctx.stroke();

      // Node label
      ctx.fillStyle = n.root ? '#000' : '#e2e8f0';
      ctx.font = `${n.root ? 'bold 11px' : '9px'} JetBrains Mono, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.label, n.x, n.y);
    }

    ctx.restore();

    // Zoom Indicator overlay
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`ZOOM: ${Math.round(zoom * 100)}% | DRAG TO PAN`, 12, h - 12);

    requestAnimationFrame(draw);
  }

  draw();
})();
