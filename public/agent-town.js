// ============================================================
// TRI AI - JARVIS 3D HOLOGRAPHIC AGENT MATRIX (Three.js WebGL)
// High-Fidelity Tactical Command Deck with 4 Realistic 3D Cyber Androids
// Dynamic PBR Shading, Central Neural Core, and Interactive HUDs
// ============================================================

(function() {
  const canvas = document.getElementById('townCanvas');
  if (!canvas || !window.THREE) return;

  // 1. SCENE, CAMERA, RENDERER
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, canvas.clientWidth / (canvas.clientHeight || 1), 0.1, 1000);
  camera.position.set(0, 52, 125);
  camera.lookAt(0, 2, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  function resize() {
    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 340;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  window.addEventListener('resize', resize);
  setTimeout(resize, 100);

  // 2. CINEMATIC 3-POINT STUDIO LIGHTING FOR REALISTIC PBR METALS
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambientLight);

  // Key Light (Cyan)
  const dirLightCyan = new THREE.DirectionalLight(0x00f2ff, 1.4);
  dirLightCyan.position.set(40, 70, 50);
  scene.add(dirLightCyan);

  // Fill Light (Warm Amber)
  const dirLightWarm = new THREE.DirectionalLight(0xf59e0b, 1.0);
  dirLightWarm.position.set(-40, 50, 40);
  scene.add(dirLightWarm);

  // Rim Light (Neon Violet)
  const rimLight = new THREE.DirectionalLight(0xa855f7, 1.2);
  rimLight.position.set(0, 60, -50);
  scene.add(rimLight);

  // Master Deck Group
  const deckGroup = new THREE.Group();
  scene.add(deckGroup);

  // ============================================================
  // 3. HIGH-TECH 3D CYBER-DECK PLATFORM (OCTAGONAL TITANIUM BASE)
  // ============================================================
  const floorGeo = new THREE.CylinderGeometry(68, 72, 3, 8);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x07111e,
    roughness: 0.32,
    metalness: 0.85
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.y = -18;
  deckGroup.add(floorMesh);

  // Floor Edge Wireframe Accent
  const floorWireGeo = new THREE.CylinderGeometry(68.2, 72.2, 3.1, 8);
  const floorWireMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, wireframe: true, transparent: true, opacity: 0.35 });
  const floorWire = new THREE.Mesh(floorWireGeo, floorWireMat);
  floorWire.position.y = -18;
  deckGroup.add(floorWire);

  // Concentric Holographic Cyber Rings on Deck
  const deckRing1Geo = new THREE.RingGeometry(38, 39, 48);
  const deckRing1Mat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
  const deckRing1 = new THREE.Mesh(deckRing1Geo, deckRing1Mat);
  deckRing1.rotation.x = Math.PI / 2;
  deckRing1.position.y = -16.4;
  deckGroup.add(deckRing1);

  const deckRing2Geo = new THREE.RingGeometry(56, 57.5, 48);
  const deckRing2Mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
  const deckRing2 = new THREE.Mesh(deckRing2Geo, deckRing2Mat);
  deckRing2.rotation.x = Math.PI / 2;
  deckRing2.position.y = -16.4;
  deckGroup.add(deckRing2);

  // Subtle Holographic Grid
  const gridHelper = new THREE.GridHelper(110, 16, 0x00f2ff, 0x1e293b);
  gridHelper.position.y = -16.3;
  deckGroup.add(gridHelper);

  // ============================================================
  // 4. CENTRAL 3D NEURAL DATA CORE (JARVIS AGENT HUB)
  // ============================================================
  const coreHubGroup = new THREE.Group();
  coreHubGroup.position.set(0, -6, 0);
  deckGroup.add(coreHubGroup);

  // Inner Geometric Floating Nucleus
  const hubNucleusGeo = new THREE.OctahedronGeometry(6.5, 2);
  const hubNucleusMat = new THREE.MeshBasicMaterial({
    color: 0x00f2ff,
    wireframe: true,
    transparent: true,
    opacity: 0.8
  });
  const hubNucleus = new THREE.Mesh(hubNucleusGeo, hubNucleusMat);
  coreHubGroup.add(hubNucleus);

  // Inner Solid Glow Sphere
  const hubGlowGeo = new THREE.SphereGeometry(3.8, 16, 16);
  const hubGlowMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.9
  });
  const hubGlow = new THREE.Mesh(hubGlowGeo, hubGlowMat);
  coreHubGroup.add(hubGlow);

  // Concentric Rotating Hub Rings
  const hubRing1Geo = new THREE.RingGeometry(9, 10, 36);
  const hubRing1Mat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
  const hubRing1 = new THREE.Mesh(hubRing1Geo, hubRing1Mat);
  hubRing1.rotation.x = Math.PI / 3;
  coreHubGroup.add(hubRing1);

  const hubRing2Geo = new THREE.RingGeometry(12, 12.8, 36);
  const hubRing2Mat = new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
  const hubRing2 = new THREE.Mesh(hubRing2Geo, hubRing2Mat);
  hubRing2.rotation.y = Math.PI / 4;
  coreHubGroup.add(hubRing2);

  // Floating Neural Data Dust
  const dustCount = 100;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 110;
    dustPos[i * 3 + 1] = Math.random() * 45 - 12;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 110;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0x00f2ff,
    size: 1.4,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  const dataDust = new THREE.Points(dustGeo, dustMat);
  deckGroup.add(dataDust);

  // ============================================================
  // 5. FOUR REALISTIC 3D CYBERNETIC ANDROID AGENTS
  // ============================================================
  const agentDefs = [
    {
      id: 'alice',
      name: 'Alice',
      title: 'Context & Intelligence',
      color: 0xa855f7, // Neon Violet
      hexStr: '#a855f7',
      posX: -36,
      posZ: -16,
      thought: 'Monitoring system context and knowledge synthesis...'
    },
    {
      id: 'bob',
      name: 'Bob',
      title: 'Task & Automation',
      color: 0x10b981, // Emerald Green
      hexStr: '#10b981',
      posX: -14,
      posZ: 26,
      thought: 'Task queue and Windows automation synced.'
    },
    {
      id: 'carol',
      name: 'Carol',
      title: 'Visual Hub & Mindmap',
      color: 0xf59e0b, // Amber Gold
      hexStr: '#f59e0b',
      posX: 14,
      posZ: -16,
      thought: 'Holographic mindmap nodes active.'
    },
    {
      id: 'dave',
      name: 'Dave',
      title: 'Security & Sentinel',
      color: 0x00f2ff, // Neon Cyan
      hexStr: '#00f2ff',
      posX: 36,
      posZ: 26,
      thought: 'All security bounds normal. Zero external leaks.'
    }
  ];

  const agentObjects = [];

  // Factory function to build a sculpted 3D Android bust for an agent
  function createAgentBust(def) {
    const agentGroup = new THREE.Group();
    agentGroup.position.set(def.posX, -16, def.posZ);
    agentGroup.userData = { ...def, basePosY: -16, targetY: -16 };

    // A. Tactical Hexagonal Pedestal
    const pedGeo = new THREE.CylinderGeometry(9.5, 11, 2.8, 6);
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x0b1728,
      roughness: 0.28,
      metalness: 0.88
    });
    const pedMesh = new THREE.Mesh(pedGeo, pedMat);
    pedMesh.position.y = 1.4;
    agentGroup.add(pedMesh);

    // Pedestal Glowing Rim Ring
    const pedRimGeo = new THREE.RingGeometry(9.6, 11, 6);
    const pedRimMat = new THREE.MeshBasicMaterial({ color: def.color, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const pedRim = new THREE.Mesh(pedRimGeo, pedRimMat);
    pedRim.rotation.x = Math.PI / 2;
    pedRim.position.y = 2.82;
    agentGroup.add(pedRim);

    // Glowing Point Light on Pedestal
    const pedLight = new THREE.PointLight(def.color, 1.8, 28);
    pedLight.position.set(0, 6, 0);
    agentGroup.add(pedLight);

    // B. Shared High-Tech Materials for Android
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Dark titanium/carbon casing
      roughness: 0.24,
      metalness: 0.88,
      envMapIntensity: 1.2
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.2,
      metalness: 0.9,
      envMapIntensity: 1.4
    });

    const glowOpticMat = new THREE.MeshBasicMaterial({
      color: def.color,
      transparent: true,
      opacity: 0.95
    });

    // C. Sculpted Android Torso
    const torso = new THREE.Group();
    torso.position.y = 9;
    agentGroup.add(torso);

    // Chest Core Chassis
    const chestGeo = new THREE.CylinderGeometry(4.8, 3.8, 8, 8, 1);
    const chest = new THREE.Mesh(chestGeo, armorMat);
    torso.add(chest);

    // Left & Right Pectoral Armor Plates
    const pecGeo = new THREE.BoxGeometry(3.2, 3.5, 1.8);
    const leftPec = new THREE.Mesh(pecGeo, armorMat);
    leftPec.position.set(-2, 1.2, 2.4);
    leftPec.rotation.y = 0.18;
    torso.add(leftPec);

    const rightPec = new THREE.Mesh(pecGeo, armorMat);
    rightPec.position.set(2, 1.2, 2.4);
    rightPec.rotation.y = -0.18;
    torso.add(rightPec);

    // Central Unibeam Energy Core (Audio/Thinking Reactive)
    const coreBezelGeo = new THREE.TorusGeometry(1.6, 0.35, 12, 24);
    const coreBezel = new THREE.Mesh(coreBezelGeo, accentMat);
    coreBezel.position.set(0, 1.2, 2.9);
    torso.add(coreBezel);

    const coreLensGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.4, 16);
    coreLensGeo.rotateX(Math.PI / 2);
    const coreLens = new THREE.Mesh(coreLensGeo, glowOpticMat);
    coreLens.position.set(0, 1.2, 2.8);
    torso.add(coreLens);

    // Segmented Cyber Abdominal Plates
    for (let i = 0; i < 2; i++) {
      const abGeo = new THREE.BoxGeometry(3.6 - i * 0.5, 1.1, 1.6);
      const abPlate = new THREE.Mesh(abGeo, armorMat);
      abPlate.position.set(0, -1.8 - i * 1.3, 2.0 - i * 0.2);
      torso.add(abPlate);
    }

    // Shoulders (Pauldrons)
    const shoulderGeo = new THREE.SphereGeometry(2.4, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
    shoulderGeo.rotateX(Math.PI / 2);

    const leftShoulder = new THREE.Mesh(shoulderGeo, accentMat);
    leftShoulder.position.set(-6, 2.8, 0);
    leftShoulder.rotation.z = -0.35;
    torso.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(shoulderGeo, accentMat);
    rightShoulder.position.set(6, 2.8, 0);
    rightShoulder.rotation.z = 0.35;
    torso.add(rightShoulder);

    // Cyber Arms
    const armGeo = new THREE.CylinderGeometry(1.1, 0.95, 7.5, 8);
    const leftArm = new THREE.Mesh(armGeo, armorMat);
    leftArm.position.set(-6.2, -1.6, 0);
    leftArm.rotation.z = 0.1;
    torso.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, armorMat);
    rightArm.position.set(6.2, -1.6, 0);
    rightArm.rotation.z = -0.1;
    torso.add(rightArm);

    // Hydraulic Neck
    const neckGeo = new THREE.CylinderGeometry(1.8, 2.1, 2.5, 12);
    const neck = new THREE.Mesh(neckGeo, armorMat);
    neck.position.set(0, 4.8, 0);
    torso.add(neck);

    // D. Sculpted Helmet & Face
    const head = new THREE.Group();
    head.position.set(0, 7.5, 0);
    torso.add(head);

    // Skull Shell
    const skullGeo = new THREE.SphereGeometry(2.6, 16, 16);
    skullGeo.scale(1.0, 1.15, 1.05);
    const skull = new THREE.Mesh(skullGeo, armorMat);
    head.add(skull);

    // Faceplate
    const faceGeo = new THREE.BoxGeometry(2.6, 3.2, 1.6);
    const face = new THREE.Mesh(faceGeo, accentMat);
    face.position.set(0, 0.1, 1.5);
    head.add(face);

    // Glowing Eyes / Visor
    const eyeGeo = new THREE.BoxGeometry(1.8, 0.32, 0.4);
    const eye = new THREE.Mesh(eyeGeo, glowOpticMat);
    eye.position.set(0, 0.5, 2.3);
    head.add(eye);

    // E. Floating Holographic Data Halo / Ring above Head
    const haloGeo = new THREE.RingGeometry(3.6, 4.1, 24);
    const haloMat = new THREE.MeshBasicMaterial({ color: def.color, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 4.8, 0);
    head.add(halo);

    // F. Laser Beam Conduit connecting from Central Core to this Pedestal
    const lineGeo = new THREE.BufferGeometry();
    const pts = [
      new THREE.Vector3(0, -6, 0),
      new THREE.Vector3(def.posX, -14, def.posZ)
    ];
    lineGeo.setFromPoints(pts);
    const conduit = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
      color: def.color,
      transparent: true,
      opacity: 0.45,
      linewidth: 2
    }));
    deckGroup.add(conduit);

    deckGroup.add(agentGroup);

    return {
      group: agentGroup,
      head,
      torso,
      coreLens,
      pedLight,
      halo,
      data: def
    };
  }

  // Build all 4 agents
  agentDefs.forEach(def => {
    const obj = createAgentBust(def);
    agentObjects.push(obj);
  });

  // ============================================================
  // 6. INTERACTIVE 3D SELECTION & HOVER
  // ============================================================
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-999, -999);
  let hoveredAgent = null;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  });

  canvas.addEventListener('mouseleave', () => {
    mouse.set(-999, -999);
    hoveredAgent = null;
    canvas.style.cursor = 'default';
  });

  canvas.addEventListener('click', () => {
    if (hoveredAgent) {
      const def = hoveredAgent.data;
      // Trigger voice response or chat notification
      if (window.appendAssistantMessage) {
        window.appendAssistantMessage({
          reasoning: [{ stage: 'এজেন্ট মেট্রিক্স বিশ্লেষণ', detail: `${def.name} (${def.title}) সংযোগ প্রতিষ্ঠিত।` }],
          reply: `TRIDIP স্যার, আমি ${def.name} (${def.title})। ${def.thought}`
        });
      }
      if (window.speakText) {
        window.speakText(`TRIDIP স্যার, আমি ${def.name}। ${def.thought}`);
      }
    }
  });

  // ============================================================
  // 7. ANIMATION & PARALLAX LOOP
  // ============================================================
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // Central Neural Core Rotations
    hubNucleus.rotation.y += 0.018;
    hubNucleus.rotation.x -= 0.01;
    hubRing1.rotation.z += 0.02;
    hubRing2.rotation.z -= 0.016;

    const corePulse = 1.0 + Math.sin(time * 3) * 0.12;
    hubNucleus.scale.set(corePulse, corePulse, corePulse);
    hubGlow.scale.set(corePulse * 1.1, corePulse * 1.1, corePulse * 1.1);

    // Deck rings slow spin
    deckRing1.rotation.z += 0.005;
    deckRing2.rotation.z -= 0.003;
    dataDust.rotation.y += 0.002;

    // Raycasting for interactive hover
    raycaster.setFromCamera(mouse, camera);
    const interactMeshes = [];
    agentObjects.forEach(a => {
      a.group.traverse(child => {
        if (child.isMesh) {
          child.userData.agentRef = a;
          interactMeshes.push(child);
        }
      });
    });

    const intersects = raycaster.intersectObjects(interactMeshes);
    if (intersects.length > 0) {
      hoveredAgent = intersects[0].object.userData.agentRef;
      canvas.style.cursor = 'pointer';
    } else {
      hoveredAgent = null;
      canvas.style.cursor = 'default';
    }

    // Animate each agent
    agentObjects.forEach((agent, idx) => {
      const isHovered = hoveredAgent === agent;
      const breath = Math.sin(time * 2 + idx * 1.2) * 0.4;

      // Pedestal elevation when hovered
      const targetY = isHovered ? -13.5 : -16;
      agent.group.position.y += (targetY - agent.group.position.y) * 0.1;

      // Head tracking & idle sway
      agent.head.rotation.y = Math.sin(time * 0.8 + idx) * 0.15;
      agent.head.rotation.x = Math.cos(time * 0.6 + idx) * 0.06;

      // Halo spin
      agent.halo.rotation.z += 0.025;
      agent.halo.scale.set(1.0 + breath * 0.1, 1.0 + breath * 0.1, 1.0);

      // Light glow intensity
      agent.pedLight.intensity = isHovered ? 3.5 : 1.8 + breath * 0.4;
      agent.coreLens.scale.set(1.0 + breath * 0.2, 1.0 + breath * 0.2, 1.0);
    });

    // Gentle camera parallax based on mouse
    const targetCamX = mouse.x * 14;
    const targetCamY = 52 + mouse.y * 8;
    camera.position.x += (targetCamX - camera.position.x) * 0.05;
    camera.position.y += (targetCamY - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  animate();
})();
