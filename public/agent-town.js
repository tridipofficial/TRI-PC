// ============================================================
// TRI AI - 3D HOLOGRAPHIC AGENT MATRIX (Three.js WebGL)
// Interactive 3D Cyber-Deck with Autonomous Multi-Agent Avatars
// ============================================================
(function() {
  const canvas = document.getElementById('townCanvas');
  if (!canvas) return;

  // 1. Scene, Camera, Renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, canvas.clientWidth / (canvas.clientHeight || 1), 0.1, 1000);
  camera.position.set(0, 75, 155);
  camera.lookAt(0, -5, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  function resize() {
    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 280;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  window.addEventListener('resize', resize);
  setTimeout(resize, 120);

  // 2. 3D Cybernetic Grid Platform
  const gridHelper = new THREE.GridHelper(160, 20, 0x00f2ff, 0x1e293b);
  gridHelper.position.y = -18;
  scene.add(gridHelper);

  // Floating Ambient Data Dust Particles
  const dustCount = 180;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount * 3; i += 3) {
    dustPos[i] = (Math.random() - 0.5) * 160;
    dustPos[i + 1] = Math.random() * 60 - 15;
    dustPos[i + 2] = (Math.random() - 0.5) * 120;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 1.8,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending
  });
  const dustField = new THREE.Points(dustGeo, dustMat);
  scene.add(dustField);

  // 3. Four 3D Holographic Agent Pods (Alice, Bob, Carol, Dave)
  const agentDefs = [
    {
      id: 'alice',
      name: 'Alice',
      role: 'Research & Context',
      color: 0xa855f7, // Neon Violet
      posX: -52,
      posZ: -18,
      geo: new THREE.OctahedronGeometry(9, 1),
      thought: 'Monitoring system context and queries...'
    },
    {
      id: 'bob',
      name: 'Bob',
      role: 'Task & Automation',
      color: 0x10b981, // Emerald Green
      posX: -18,
      posZ: 18,
      geo: new THREE.BoxGeometry(11, 11, 11),
      thought: 'Task queue synchronized.'
    },
    {
      id: 'carol',
      name: 'Carol',
      role: 'Visual Hub & Mindmap',
      color: 0xf59e0b, // Amber Gold
      posX: 18,
      posZ: -18,
      geo: new THREE.DodecahedronGeometry(9, 0),
      thought: 'Ready to map concepts.'
    },
    {
      id: 'dave',
      name: 'Dave',
      role: 'Security & Sentinel',
      color: 0x00f2ff, // Neon Cyan
      posX: 52,
      posZ: 18,
      geo: new THREE.TetrahedronGeometry(11, 1),
      thought: 'All security bounds normal.'
    }
  ];

  const agentMeshes = [];

  agentDefs.forEach((def) => {
    const group = new THREE.Group();
    group.position.set(def.posX, -10, def.posZ);
    group.userData = { ...def, busy: false, targetY: -10 };

    // A. Holographic Pedestal (Concentric glowing base rings)
    const baseGeo = new THREE.CylinderGeometry(14, 15, 2, 24);
    const baseMat = new THREE.MeshBasicMaterial({
      color: def.color,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -7;
    group.add(baseMesh);

    // Glowing Pedestal Core Light
    const lightGeo = new THREE.RingGeometry(1, 12, 24);
    const lightMat = new THREE.MeshBasicMaterial({
      color: def.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25
    });
    const lightMesh = new THREE.Mesh(lightGeo, lightMat);
    lightMesh.rotation.x = Math.PI / 2;
    lightMesh.position.y = -6.8;
    group.add(lightMesh);

    // B. Vertical Holographic Light Beam (Containment Field)
    const beamGeo = new THREE.CylinderGeometry(11, 11, 32, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: def.color,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.y = 8;
    group.add(beamMesh);

    // C. 3D Holographic Avatar Crystal / Matrix
    const avatarMat = new THREE.MeshBasicMaterial({
      color: def.color,
      wireframe: true,
      transparent: true,
      opacity: 0.85
    });
    const avatarMesh = new THREE.Mesh(def.geo, avatarMat);
    avatarMesh.position.y = 10;
    group.add(avatarMesh);

    // D. Orbiting Cyber Ring around Avatar
    const ringGeo = new THREE.RingGeometry(13, 14, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: def.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    const ringMesh = new THREE.Line(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3;
    ringMesh.position.y = 10;
    group.add(ringMesh);

    scene.add(group);
    agentMeshes.push({
      group,
      avatar: avatarMesh,
      ring: ringMesh,
      beam: beamMesh,
      data: group.userData
    });
  });

  // 4. Interactive Mouse Raycasting & Selection
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-999, -999);
  let hoveredMesh = null;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  });

  canvas.addEventListener('mouseleave', () => {
    mouse.set(-999, -999);
    hoveredMesh = null;
    canvas.style.cursor = 'default';
  });

  canvas.addEventListener('click', () => {
    if (hoveredMesh) {
      const data = hoveredMesh.data;
      data.busy = !data.busy;

      // Update Chat input for interactive task assignment
      const input = document.getElementById('chatInput');
      if (input) {
        input.value = `Ask ${data.name}: `;
        input.focus();
      }

      // Highlight corresponding badge in Top Bar
      document.querySelectorAll('.agent-badge').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-agent') === data.id);
      });

      // Update Busy Metrics
      updateBusyMetric();

      // Audio-visual pulse feedback
      if (window.triggerCorePulse) {
        window.triggerCorePulse(0.9);
      }
    }
  });

  function updateBusyMetric() {
    const busyCount = agentMeshes.filter(m => m.data.busy).length;
    const el = document.getElementById('busyMetricText');
    if (el) el.textContent = `⚡ ${busyCount}/4 Busy`;
  }

  // 5. Animation Loop
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    // Only render when tab is active
    if (!canvas.classList.contains('active')) return;

    const time = clock.getElapsedTime();

    // Raycast check
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(agentMeshes.map(m => m.avatar));

    if (intersects.length > 0) {
      const hitAvatar = intersects[0].object;
      hoveredMesh = agentMeshes.find(m => m.avatar === hitAvatar) || null;
      canvas.style.cursor = 'pointer';
    } else {
      hoveredMesh = null;
      canvas.style.cursor = 'default';
    }

    // Animate Each 3D Agent Pod
    agentMeshes.forEach((item, idx) => {
      const isHovered = (item === hoveredMesh);
      const isBusy = item.data.busy;

      // Vertical float levitation
      const baseLevitation = Math.sin(time * 2.5 + idx * 1.5) * 2.2;
      const targetY = isHovered ? -5 : (isBusy ? -7 : -10);
      item.group.position.y += (targetY - item.group.position.y) * 0.1;

      // Avatar rotations
      const rotSpeed = isBusy ? 0.04 : (isHovered ? 0.025 : 0.012);
      item.avatar.rotation.y += rotSpeed;
      item.avatar.rotation.x += rotSpeed * 0.6;
      item.avatar.position.y = 10 + baseLevitation;

      // Orbiting Cyber Ring
      item.ring.rotation.z += rotSpeed * 1.4;
      item.ring.position.y = 10 + baseLevitation;

      // Beam glow pulse
      item.beam.material.opacity = isHovered ? 0.35 : (isBusy ? 0.25 : 0.12 + Math.sin(time * 3 + idx) * 0.04);
    });

    // Swirling Ambient Data Dust
    dustField.rotation.y = time * 0.02;

    renderer.render(scene, camera);
  }

  animate();
})();
