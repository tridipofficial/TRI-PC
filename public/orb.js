// ============================================================
// TRI AI - 3D CINEMATIC HOLOGRAPHIC NEURAL CORE (Three.js WebGL)
// Audio-Reactive, Gyroscopic Particle Core with Fiber-Optic HUD
// ============================================================
(function() {
  const orbCanvas = document.getElementById('orbCanvas');
  const circuitCanvas = document.getElementById('circuitCanvas');
  const orbViewport = document.querySelector('.orb-viewport');
  
  if (!orbCanvas) return;

  // 1. Scene, Camera, Renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.z = 180;

  const renderer = new THREE.WebGLRenderer({
    canvas: orbCanvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  function resize() {
    const width = orbCanvas.clientWidth || 180;
    const height = orbCanvas.clientHeight || 180;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);

    if (circuitCanvas) {
      circuitCanvas.width = circuitCanvas.clientWidth * (window.devicePixelRatio || 1);
      circuitCanvas.height = circuitCanvas.clientHeight * (window.devicePixelRatio || 1);
    }
  }
  window.addEventListener('resize', resize);
  setTimeout(resize, 100);

  // 2. Holographic Volumetric Core (Icosahedron Inner Core)
  const coreGroup = new THREE.Group();
  scene.add(coreGroup);

  // Inner Geometric Nucleus
  const nucleusGeo = new THREE.IcosahedronGeometry(28, 2);
  const nucleusMat = new THREE.MeshBasicMaterial({
    color: 0x00f2ff,
    wireframe: true,
    transparent: true,
    opacity: 0.45
  });
  const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
  coreGroup.add(nucleus);

  // Inner Solid Glow Sphere
  const solidGeo = new THREE.SphereGeometry(14, 16, 16);
  const solidMat = new THREE.MeshBasicMaterial({
    color: 0x00f2ff,
    transparent: true,
    opacity: 0.8
  });
  const solidCore = new THREE.Mesh(solidGeo, solidMat);
  coreGroup.add(solidCore);

  // 3. Floating 3D Holographic Gyroscope Cyber-Rings
  const ringMaterials = [
    new THREE.LineBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.75, linewidth: 2 }),
    new THREE.LineBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.65, linewidth: 2 }),
    new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55, linewidth: 2 })
  ];

  const rings = [];
  const ringRadii = [42, 50, 58];

  ringRadii.forEach((r, idx) => {
    const ringGeo = new THREE.BufferGeometry();
    const points = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * r, Math.sin(theta) * r, 0));
    }
    ringGeo.setFromPoints(points);
    const ringMesh = new THREE.Line(ringGeo, ringMaterials[idx]);
    ringMesh.rotation.x = (idx * Math.PI) / 3;
    ringMesh.rotation.y = (idx * Math.PI) / 4;
    coreGroup.add(ringMesh);
    rings.push({
      mesh: ringMesh,
      rotSpeedX: 0.008 * (idx % 2 === 0 ? 1 : -1),
      rotSpeedY: 0.012 * (idx % 2 === 0 ? -1 : 1),
      rotSpeedZ: 0.006 * (idx + 1)
    });
  });

  // 4. Swirling 3D Cyber Particle Cloud (Starfield Sphere)
  const particleCount = 450;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);
  const baseRadius = 52;

  const cyan = new THREE.Color(0x00f2ff);
  const purple = new THREE.Color(0xa855f7);
  const gold = new THREE.Color(0xf59e0b);

  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const dist = baseRadius + (Math.random() - 0.5) * 16;

    const x = dist * Math.sin(phi) * Math.cos(theta);
    const y = dist * Math.sin(phi) * Math.sin(theta);
    const z = dist * Math.cos(phi);

    particlePositions[i * 3] = x;
    particlePositions[i * 3 + 1] = y;
    particlePositions[i * 3 + 2] = z;

    const colorChoice = Math.random();
    const c = colorChoice > 0.6 ? cyan : (colorChoice > 0.3 ? purple : gold);
    particleColors[i * 3] = c.r;
    particleColors[i * 3 + 1] = c.g;
    particleColors[i * 3 + 2] = c.b;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 2.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });

  const particleField = new THREE.Points(particleGeo, particleMat);
  coreGroup.add(particleField);

  // 5. Real-Time Audio-Reactive Pulse System
  let audioPulseIntensity = 0;
  let targetPulseIntensity = 0;
  let shockwaveScale = 1.0;

  // Global trigger callable from voice synthesizer or assistant
  window.triggerCorePulse = function(intensity = 0.8) {
    targetPulseIntensity = Math.max(targetPulseIntensity, intensity);
  };

  // Shockwave trigger on click
  if (orbViewport) {
    orbViewport.addEventListener('click', () => {
      shockwaveScale = 1.35;
      targetPulseIntensity = 1.0;
    });
  }

  // Mouse Parallax Tilt
  let mouseX = 0;
  let mouseY = 0;
  let targetRotX = 0;
  let targetRotY = 0;

  window.addEventListener('mousemove', (e) => {
    const rect = orbCanvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    mouseX = (e.clientX - cx) / (window.innerWidth / 2);
    mouseY = (e.clientY - cy) / (window.innerHeight / 2);
    targetRotY = mouseX * 0.45;
    targetRotX = -mouseY * 0.45;
  });

  // 6. Animation Loop
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // Check if assistant is currently speaking via global voice controller
    const isSpeaking = window.triAIIsSpeaking || false;
    if (isSpeaking) {
      // Natural voice speech waveform modulation
      targetPulseIntensity = 0.45 + Math.sin(time * 12) * 0.35 + Math.cos(time * 19) * 0.2;
    } else {
      targetPulseIntensity *= 0.94; // Decay back to calm breathing
    }

    audioPulseIntensity += (targetPulseIntensity - audioPulseIntensity) * 0.15;
    shockwaveScale += (1.0 - shockwaveScale) * 0.08;

    // Smooth Parallax
    coreGroup.rotation.y += (targetRotY - coreGroup.rotation.y) * 0.06;
    coreGroup.rotation.x += (targetRotX - coreGroup.rotation.x) * 0.06;

    // Constant Gyroscope Rotation
    coreGroup.rotation.y += 0.008;

    nucleus.rotation.y -= 0.012;
    nucleus.rotation.x += 0.006;
    particleField.rotation.y += 0.004;

    // Pulse Scale based on Audio Waveform & Shockwave
    const currentScale = (1.0 + audioPulseIntensity * 0.28) * shockwaveScale;
    solidCore.scale.set(currentScale, currentScale, currentScale);
    nucleus.scale.set(currentScale, currentScale, currentScale);

    // Dynamic Ring Rotations
    rings.forEach((r) => {
      r.mesh.rotation.x += r.rotSpeedX;
      r.mesh.rotation.y += r.rotSpeedY;
      r.mesh.rotation.z += r.rotSpeedZ;
      r.mesh.scale.set(currentScale, currentScale, currentScale);
    });

    // Render Scene
    renderer.render(scene, camera);

    // Render Fiber-Optic HUD Circuits
    renderCircuits(time);
  }

  // 7. Fiber Optic Circuit Animation
  function renderCircuits(time) {
    if (!circuitCanvas) return;
    const ctx = circuitCanvas.getContext('2d');
    const w = circuitCanvas.width;
    const h = circuitCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const nodes = [
      document.getElementById('nodeMemory'),
      document.getElementById('nodeSoul'),
      document.getElementById('nodeSkills'),
      document.getElementById('nodeSettings')
    ];

    const canvasRect = circuitCanvas.getBoundingClientRect();
    const orbRect = orbCanvas.getBoundingClientRect();

    const targetX = (orbRect.left + orbRect.width / 2 - canvasRect.left) * (circuitCanvas.width / canvasRect.width);
    const targetY = (orbRect.top + orbRect.height / 2 - canvasRect.top) * (circuitCanvas.height / canvasRect.height);

    ctx.lineWidth = 1.5;

    nodes.forEach((node, idx) => {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const startX = (rect.left + rect.width / 2 - canvasRect.left) * (circuitCanvas.width / canvasRect.width);
      const startY = (rect.top + rect.height / 2 - canvasRect.top) * (circuitCanvas.height / canvasRect.height);

      // Gradient wire
      const grad = ctx.createLinearGradient(startX, startY, targetX, targetY);
      grad.addColorStop(0, 'rgba(0, 242, 255, 0.45)');
      grad.addColorStop(1, 'rgba(168, 85, 247, 0.2)');

      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      // Cyber curve
      const midX = (startX + targetX) / 2;
      ctx.quadraticCurveTo(midX, startY, targetX, targetY);
      ctx.stroke();

      // Laser energy pulse travelling along the wire
      const pulseT = ((time * 0.8 + idx * 0.25) % 1);
      const px = (1 - pulseT) * (1 - pulseT) * startX + 2 * (1 - pulseT) * pulseT * midX + pulseT * pulseT * targetX;
      const py = (1 - pulseT) * (1 - pulseT) * startY + 2 * (1 - pulseT) * pulseT * startY + pulseT * pulseT * targetY;

      ctx.fillStyle = '#00f2ff';
      ctx.shadowColor = '#00f2ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  // Start Animation
  animate();
})();
