// 3D Neural Orb & Fiber Optic Circuit Animation
(function() {
  const orbCanvas = document.getElementById('orbCanvas');
  const circuitCanvas = document.getElementById('circuitCanvas');
  
  if (!orbCanvas || !circuitCanvas) return;
  
  const ctxOrb = orbCanvas.getContext('2d');
  const ctxCircuit = circuitCanvas.getContext('2d');

  function resize() {
    orbCanvas.width = orbCanvas.clientWidth * window.devicePixelRatio || 170;
    orbCanvas.height = orbCanvas.clientHeight * window.devicePixelRatio || 170;

    circuitCanvas.width = circuitCanvas.clientWidth * window.devicePixelRatio || 400;
    circuitCanvas.height = circuitCanvas.clientHeight * window.devicePixelRatio || 260;
  }
  window.addEventListener('resize', resize);
  resize();

  // Generate 3D sphere particles
  const numParticles = 260;
  const particles = [];
  const radius = 55;

  for (let i = 0; i < numParticles; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    particles.push({
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta),
      z: radius * Math.cos(phi),
      color: Math.random() > 0.4 ? '#00f2ff' : '#f59e0b',
      size: Math.random() * 1.5 + 0.8
    });
  }

  // 3D Rings
  const numRingParticles = 80;
  const rings = [
    { tiltX: 0.8, tiltY: 0.3, speed: 0.015, color: 'rgba(0, 242, 255, 0.4)' },
    { tiltX: -0.6, tiltY: 0.6, speed: -0.012, color: 'rgba(245, 158, 11, 0.4)' }
  ];

  let angleX = 0;
  let angleY = 0;

  function renderOrb() {
    const w = orbCanvas.width;
    const h = orbCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctxOrb.clearRect(0, 0, w, h);

    // Subtle background glow
    const grad = ctxOrb.createRadialGradient(cx, cy, 10, cx, cy, radius * 1.3);
    grad.addColorStop(0, 'rgba(0, 242, 255, 0.08)');
    grad.addColorStop(1, 'transparent');
    ctxOrb.fillStyle = grad;
    ctxOrb.beginPath();
    ctxOrb.arc(cx, cy, radius * 1.3, 0, Math.PI * 2);
    ctxOrb.fill();

    angleX += 0.008;
    angleY += 0.012;

    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);

    // Sort particles by Z depth for realistic rendering
    const projected = particles.map(p => {
      // Rotate around Y
      let x1 = p.x * cosY - p.z * sinY;
      let z1 = p.z * cosY + p.x * sinY;

      // Rotate around X
      let y2 = p.y * cosX - z1 * sinX;
      let z2 = z1 * cosX + p.y * sinX;

      const fov = 160;
      const scale = fov / (fov + z2);

      return {
        x2d: cx + x1 * scale,
        y2d: cy + y2 * scale,
        z: z2,
        color: p.color,
        size: p.size * scale,
        alpha: Math.max(0.15, (z2 + radius) / (radius * 2))
      };
    });

    projected.sort((a, b) => a.z - b.z);

    for (const p of projected) {
      ctxOrb.fillStyle = p.color;
      ctxOrb.globalAlpha = p.alpha;
      ctxOrb.beginPath();
      ctxOrb.arc(p.x2d, p.y2d, p.size, 0, Math.PI * 2);
      ctxOrb.fill();
    }
    ctxOrb.globalAlpha = 1.0;

    // Draw orbital ring ellipses
    for (const r of rings) {
      ctxOrb.strokeStyle = r.color;
      ctxOrb.lineWidth = 1;
      ctxOrb.beginPath();
      ctxOrb.ellipse(cx, cy, radius * 1.15, radius * 0.45, r.tiltX + angleX * 0.5, 0, Math.PI * 2);
      ctxOrb.stroke();
    }

    requestAnimationFrame(renderOrb);
  }

  // Draw fiber optic circuit connectors from left tree nodes to the orb
  let circuitOffset = 0;
  function renderCircuit() {
    const w = circuitCanvas.width;
    const h = circuitCanvas.height;
    ctxCircuit.clearRect(0, 0, w, h);

    circuitOffset += 0.03;

    // Node starting positions
    const startX = 150 * (w / circuitCanvas.clientWidth);
    const junctionX = 220 * (w / circuitCanvas.clientWidth);
    const junctionY = h / 2;
    const orbEntryX = (circuitCanvas.clientWidth - 90) * (w / circuitCanvas.clientWidth);

    const nodes = [
      { y: h * 0.18, color: '#10b981' },
      { y: h * 0.38, color: '#e2e8f0' },
      { y: h * 0.62, color: '#00f2ff' },
      { y: h * 0.82, color: '#ef4444' }
    ];

    // Draw bezier curves to central junction
    for (const n of nodes) {
      ctxCircuit.beginPath();
      ctxCircuit.moveTo(startX, n.y);
      ctxCircuit.bezierCurveTo(
        startX + (junctionX - startX) * 0.5, n.y,
        startX + (junctionX - startX) * 0.5, junctionY,
        junctionX, junctionY
      );
      ctxCircuit.strokeStyle = n.color;
      ctxCircuit.lineWidth = 1.5;
      ctxCircuit.globalAlpha = 0.6;
      ctxCircuit.stroke();
    }

    // Draw central trunk to Orb
    ctxCircuit.beginPath();
    ctxCircuit.moveTo(junctionX, junctionY);
    ctxCircuit.lineTo(orbEntryX, junctionY);
    ctxCircuit.strokeStyle = '#00f2ff';
    ctxCircuit.lineWidth = 2;
    ctxCircuit.globalAlpha = 0.8;
    ctxCircuit.stroke();

    // Pulse node dots at junction
    ctxCircuit.fillStyle = '#00f2ff';
    ctxCircuit.beginPath();
    ctxCircuit.arc(junctionX, junctionY, 3, 0, Math.PI * 2);
    ctxCircuit.fill();

    // Animated photon pulses along the trunk
    const pulsePos = (Math.sin(circuitOffset) + 1) / 2;
    const px = junctionX + (orbEntryX - junctionX) * pulsePos;
    ctxCircuit.fillStyle = '#fff';
    ctxCircuit.beginPath();
    ctxCircuit.arc(px, junctionY, 2.5, 0, Math.PI * 2);
    ctxCircuit.fill();

    ctxCircuit.globalAlpha = 1.0;
    requestAnimationFrame(renderCircuit);
  }

  renderOrb();
  renderCircuit();
})();
