// ============================================================
// TRI AI - IRON MAN / JARVIS TACTICAL HUD MODULE
// Rotating Globe, DNA Double-Helix, Tactical Radar & Speedometers
// ============================================================

(function() {
  // 1. TACTICAL RADAR CANVAS
  const radarCanvas = document.getElementById('radarCanvas');
  if (radarCanvas) {
    const ctx = radarCanvas.getContext('2d');
    let angle = 0;
    const blips = [
      { r: 0.35, theta: 0.8, life: 1, label: 'SAT-01' },
      { r: 0.65, theta: 2.2, life: 0.8, label: 'TARGET' },
      { r: 0.82, theta: 4.1, life: 0.9, label: 'RELAY' }
    ];

    function drawRadar() {
      const w = radarCanvas.width = radarCanvas.clientWidth * (window.devicePixelRatio || 1);
      const h = radarCanvas.height = radarCanvas.clientHeight * (window.devicePixelRatio || 1);
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(cx, cy) - 10;

      ctx.clearRect(0, 0, w, h);

      // Background concentric circles
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.2)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        const r = (maxR / 4) * i;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Crosshair lines
      ctx.beginPath();
      ctx.moveTo(cx - maxR, cy);
      ctx.lineTo(cx + maxR, cy);
      ctx.moveTo(cx, cy - maxR);
      ctx.lineTo(cx, cy + maxR);
      ctx.stroke();

      // Degree markings (0°, 90°, 180°, 270°)
      ctx.font = `${Math.max(9, w * 0.045)}px 'Orbitron', monospace`;
      ctx.fillStyle = 'rgba(0, 242, 255, 0.6)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('000°', cx, cy - maxR + 8);
      ctx.fillText('090°', cx + maxR - 14, cy);
      ctx.fillText('180°', cx, cy + maxR - 8);
      ctx.fillText('270°', cx - maxR + 14, cy);

      // Rotating gear outer ticks
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.4)';
      ctx.lineWidth = 1.5;
      const tickCount = 48;
      for (let i = 0; i < tickCount; i++) {
        const a = (i / tickCount) * Math.PI * 2 + angle * 0.2;
        const len = i % 4 === 0 ? 8 : 4;
        const x1 = cx + Math.cos(a) * (maxR - 2);
        const y1 = cy + Math.sin(a) * (maxR - 2);
        const x2 = cx + Math.cos(a) * (maxR - 2 - len);
        const y2 = cy + Math.sin(a) * (maxR - 2 - len);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Radar Sweep Beam
      angle += 0.035;
      const sweepGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      sweepGradient.addColorStop(0, 'rgba(0, 242, 255, 0.4)');
      sweepGradient.addColorStop(1, 'rgba(0, 242, 255, 0.0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, angle - 0.45, angle);
      ctx.closePath();
      ctx.fillStyle = sweepGradient;
      ctx.fill();

      // Lead sweep line
      ctx.strokeStyle = '#00f2ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
      ctx.stroke();
      ctx.restore();

      // Blips
      blips.forEach(b => {
        const bx = cx + Math.cos(b.theta) * (b.r * maxR);
        const by = cy + Math.sin(b.theta) * (b.r * maxR);
        
        // Calculate diff with sweep line for fading echo
        const diff = (angle - b.theta) % (Math.PI * 2);
        const intensity = diff > 0 && diff < 1.2 ? 1 - diff / 1.2 : 0.2;

        ctx.fillStyle = `rgba(0, 242, 255, ${intensity})`;
        ctx.shadowColor = '#00f2ff';
        ctx.shadowBlur = intensity > 0.5 ? 8 : 0;
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();

        if (intensity > 0.4) {
          ctx.strokeStyle = `rgba(0, 242, 255, ${intensity * 0.8})`;
          ctx.beginPath();
          ctx.arc(bx, by, 7 + Math.sin(angle * 4) * 2, 0, Math.PI * 2);
          ctx.stroke();

          ctx.font = `${Math.max(8, w * 0.04)}px 'JetBrains Mono', monospace`;
          ctx.fillText(b.label, bx + 12, by);
        }
        ctx.shadowBlur = 0;
      });

      requestAnimationFrame(drawRadar);
    }
    drawRadar();
  }

  // 2. 3D WIREFRAME ROTATING GLOBE (Holographic Tactical Satellite View)
  const globeCanvas = document.getElementById('globeCanvas');
  if (globeCanvas && window.THREE) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 70;

    const renderer = new THREE.WebGLRenderer({
      canvas: globeCanvas,
      alpha: true,
      antialias: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    function resizeGlobe() {
      const w = globeCanvas.clientWidth || 160;
      const h = globeCanvas.clientHeight || 160;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    resizeGlobe();
    window.addEventListener('resize', resizeGlobe);

    // Globe Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Wireframe Sphere
    const sphereGeo = new THREE.SphereGeometry(22, 24, 24);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x00f2ff,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(sphereMesh);

    // Inner glowing core
    const innerGeo = new THREE.SphereGeometry(18, 16, 16);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.2
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    globeGroup.add(innerMesh);

    // Orbit Ring 1 (Tilted Equator)
    const ringGeo1 = new THREE.RingGeometry(27, 28, 48);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    const orbitRing1 = new THREE.Mesh(ringGeo1, ringMat1);
    orbitRing1.rotation.x = Math.PI / 3;
    globeGroup.add(orbitRing1);

    // Orbit Ring 2 (Polar Orbit)
    const ringGeo2 = new THREE.RingGeometry(31, 31.8, 48);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4
    });
    const orbitRing2 = new THREE.Mesh(ringGeo2, ringMat2);
    orbitRing2.rotation.y = Math.PI / 4;
    orbitRing2.rotation.x = Math.PI / 6;
    globeGroup.add(orbitRing2);

    // Satellite Dots on Orbit
    const satGeo = new THREE.SphereGeometry(1.2, 8, 8);
    const satMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });
    const satMesh = new THREE.Mesh(satGeo, satMat);
    globeGroup.add(satMesh);

    // Dhaka / Location Marker (lat 23.8, lon 90.4)
    const markerGeo = new THREE.SphereGeometry(1.4, 8, 8);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const markerMesh = new THREE.Mesh(markerGeo, markerMat);
    // Position on sphere surface
    markerMesh.position.set(12, 10, 16);
    globeGroup.add(markerMesh);

    // Pulse ring around marker
    const pRingGeo = new THREE.RingGeometry(2, 2.6, 24);
    const pRingMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const pRing = new THREE.Mesh(pRingGeo, pRingMat);
    pRing.position.set(12, 10, 16);
    pRing.lookAt(0, 0, 0);
    globeGroup.add(pRing);

    let satAngle = 0;
    function animateGlobe() {
      requestAnimationFrame(animateGlobe);

      globeGroup.rotation.y += 0.008;
      globeGroup.rotation.x = 0.2;

      // Satellite movement along orbit 1
      satAngle += 0.03;
      const rSat = 27.5;
      satMesh.position.x = Math.cos(satAngle) * rSat;
      satMesh.position.y = Math.sin(satAngle) * rSat * Math.cos(Math.PI / 3);
      satMesh.position.z = Math.sin(satAngle) * rSat * Math.sin(Math.PI / 3);

      // Marker pulse
      const pScale = 1.0 + Math.sin(Date.now() * 0.008) * 0.35;
      pRing.scale.set(pScale, pScale, pScale);

      renderer.render(scene, camera);
    }
    animateGlobe();
  }

  // 3. 3D HOLOGRAPHIC DNA DOUBLE-HELIX SCANNER
  const dnaCanvas = document.getElementById('dnaCanvas');
  if (dnaCanvas) {
    const ctx = dnaCanvas.getContext('2d');
    let t = 0;

    function drawDNA() {
      const w = dnaCanvas.width = dnaCanvas.clientWidth * (window.devicePixelRatio || 1);
      const h = dnaCanvas.height = dnaCanvas.clientHeight * (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);

      t += 0.04;
      const numPairs = 24;
      const stepY = h / (numPairs + 2);
      const amplitude = Math.min(w * 0.35, 45);

      for (let i = 0; i < numPairs; i++) {
        const y = (i + 1) * stepY;
        const phase = t + i * 0.32;
        
        // 3D projection on X axis
        const x1 = w / 2 + Math.sin(phase) * amplitude;
        const z1 = Math.cos(phase); // depth (-1 to 1)

        const x2 = w / 2 - Math.sin(phase) * amplitude;
        const z2 = -z1;

        // Perspective scale & opacity
        const scale1 = 0.7 + (z1 + 1) * 0.25;
        const alpha1 = 0.3 + (z1 + 1) * 0.35;

        const scale2 = 0.7 + (z2 + 1) * 0.25;
        const alpha2 = 0.3 + (z2 + 1) * 0.35;

        // Connecting Base-Pair Hydrogen Bond Bar
        ctx.strokeStyle = `rgba(0, 242, 255, ${0.15 + Math.abs(z1) * 0.25})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();

        // Strand 1 Nucleotide (Cyan)
        ctx.fillStyle = `rgba(0, 242, 255, ${alpha1})`;
        ctx.shadowColor = '#00f2ff';
        ctx.shadowBlur = z1 > 0 ? 8 : 0;
        ctx.beginPath();
        ctx.arc(x1, y, 3.5 * scale1, 0, Math.PI * 2);
        ctx.fill();

        // Strand 2 Nucleotide (Amber / Magenta)
        ctx.fillStyle = `rgba(245, 158, 11, ${alpha2})`;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = z2 > 0 ? 8 : 0;
        ctx.beginPath();
        ctx.arc(x2, y, 3.5 * scale2, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
      }

      requestAnimationFrame(drawDNA);
    }
    drawDNA();
  }

  // 4. CIRCULAR SPEEDOMETER GAUGES (CPU & RAM)
  function setupGauge(canvasId, valueTextId, basePercent, label) {
    const canvas = document.getElementById(canvasId);
    const textEl = document.getElementById(valueTextId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let currentPct = basePercent;
    let targetPct = basePercent;

    // Periodically fluctuate slightly for realism
    setInterval(() => {
      targetPct = Math.min(95, Math.max(15, basePercent + (Math.random() - 0.5) * 16));
    }, 2500);

    function renderGauge() {
      const w = canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
      const h = canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);

      currentPct += (targetPct - currentPct) * 0.05;
      if (textEl) {
        textEl.textContent = `${Math.round(currentPct)}%`;
      }

      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(cx, cy) - 8;

      const startAngle = Math.PI * 0.75;
      const totalAngle = Math.PI * 1.5;

      // Background Track
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.15)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, startAngle + totalAngle);
      ctx.stroke();

      // Active Arc
      const activeAngle = startAngle + (totalAngle * (currentPct / 100));
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#00f2ff');
      grad.addColorStop(0.7, '#38bdf8');
      grad.addColorStop(1, currentPct > 80 ? '#ef4444' : '#f59e0b');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 6;
      ctx.shadowColor = '#00f2ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, activeAngle);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Tick marks along outer rim
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.35)';
      ctx.lineWidth = 1;
      const ticks = 16;
      for (let i = 0; i <= ticks; i++) {
        const a = startAngle + (totalAngle * (i / ticks));
        const x1 = cx + Math.cos(a) * (r - 8);
        const y1 = cy + Math.sin(a) * (r - 8);
        const x2 = cx + Math.cos(a) * (r - 12);
        const y2 = cy + Math.sin(a) * (r - 12);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      requestAnimationFrame(renderGauge);
    }
    renderGauge();
  }

  setupGauge('cpuGaugeCanvas', 'cpuGaugeVal', 42, 'CPU');
  setupGauge('ramGaugeCanvas', 'ramGaugeVal', 68, 'RAM');

  // 5. LIVE CLOCK & SYSTEM UPTIME
  const clockEl = document.getElementById('tacticalClock');
  const dateEl = document.getElementById('tacticalDate');
  function updateClock() {
    const now = new Date();
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    }
    if (dateEl) {
      const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
      dateEl.textContent = now.toLocaleDateString('en-US', options).toUpperCase();
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

})();
