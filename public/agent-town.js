// ============================================================
// TRI AI - REALISTIC 3D MULTI-AGENT STUDIO OFFICE (Three.js WebGL)
// High-Fidelity 3D Humanoid Avatars & Workstations (Clean-Room Architecture)
// Inspired by Archer AI Multi-Agent Office Concept (Alice, Bob, Carol, Dave)
// ============================================================
(function() {
  const canvas = document.getElementById('townCanvas');
  if (!canvas) return;

  // 1. Scene, Camera, Renderer Setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c1017);
  scene.fog = new THREE.FogExp2(0x0c1017, 0.0055);

  const camera = new THREE.PerspectiveCamera(40, canvas.clientWidth / (canvas.clientHeight || 1), 0.1, 1000);
  
  // Default Studio Overview Camera
  const defaultCamPos = new THREE.Vector3(0, 35, 78);
  const defaultLookAt = new THREE.Vector3(0, 9, -5);
  camera.position.copy(defaultCamPos);
  camera.lookAt(defaultLookAt);

  let targetCamPos = defaultCamPos.clone();
  let baseCamPos = defaultCamPos.clone();
  let targetLookAt = defaultLookAt.clone();
  let currentLookAt = defaultLookAt.clone();

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  function resize() {
    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 320;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  window.addEventListener('resize', resize);
  setTimeout(resize, 100);

  const tabTownBtn = document.getElementById('tabTownBtn');
  if (tabTownBtn) {
    tabTownBtn.addEventListener('click', () => {
      setTimeout(resize, 80);
    });
  }

  // 2. Studio Lighting
  const ambientLight = new THREE.AmbientLight(0xd9e2ec, 0.75);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff5ea, 0.85);
  dirLight.position.set(25, 60, 40);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 160;
  dirLight.shadow.camera.left = -60;
  dirLight.shadow.camera.right = 60;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  // Backlight LED Cove Strip (Golden / Warm Amber)
  const coveLight = new THREE.PointLight(0xffa040, 0.9, 120);
  coveLight.position.set(0, 32, -40);
  scene.add(coveLight);

  // 3. Procedural Office Room Architecture
  // A. Procedural Executive Hardwood Parquet Floor Texture
  function createFloorTexture() {
    const fc = document.createElement('canvas');
    fc.width = 512;
    fc.height = 512;
    const fctx = fc.getContext('2d');
    fctx.fillStyle = '#161922';
    fctx.fillRect(0, 0, 512, 512);

    // Parquet chevron pattern
    fctx.strokeStyle = '#1e2430';
    fctx.lineWidth = 2;
    for (let x = 0; x < 512; x += 32) {
      fctx.beginPath();
      fctx.moveTo(x, 0);
      fctx.lineTo(x, 512);
      fctx.stroke();
    }
    for (let y = 0; y < 512; y += 32) {
      fctx.beginPath();
      fctx.moveTo(0, y);
      fctx.lineTo(512, y);
      fctx.stroke();
    }
    // Subtle wood grain noise
    for (let i = 0; i < 1800; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      fctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.04)';
      fctx.fillRect(rx, ry, Math.random() * 8 + 2, 1);
    }
    const tex = new THREE.CanvasTexture(fc);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 3);
    return tex;
  }

  const floorMat = new THREE.MeshStandardMaterial({
    map: createFloorTexture(),
    roughness: 0.35,
    metalness: 0.1
  });
  const floorGeo = new THREE.BoxGeometry(130, 2, 90);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.set(0, -1, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  // B. Back Accent Wall with Acoustic Vertical Wood Slats
  const backWallMat = new THREE.MeshStandardMaterial({ color: 0x121720, roughness: 0.8 });
  const backWallGeo = new THREE.BoxGeometry(130, 50, 2);
  const backWall = new THREE.Mesh(backWallGeo, backWallMat);
  backWall.position.set(0, 24, -44);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // 36 Vertical Wood Slats on Back Wall
  const slatMat = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.45, metalness: 0.1 });
  const slatGeo = new THREE.BoxGeometry(0.8, 44, 0.6);
  for (let sx = -42; sx <= 42; sx += 2.4) {
    const slat = new THREE.Mesh(slatGeo, slatMat);
    slat.position.set(sx, 22, -42.6);
    slat.castShadow = true;
    scene.add(slat);
  }

  // Backlit Modern Glass Studio Sign: "TRI AI • AUTONOMOUS STUDIO"
  function createStudioSign() {
    const sc = document.createElement('canvas');
    sc.width = 512;
    sc.height = 128;
    const sctx = sc.getContext('2d');
    sctx.fillStyle = '#0f172a';
    sctx.fillRect(0, 0, 512, 128);
    sctx.strokeStyle = '#00f2ff';
    sctx.lineWidth = 4;
    sctx.strokeRect(6, 6, 500, 116);

    sctx.fillStyle = '#00f2ff';
    sctx.font = 'bold 32px "Segoe UI", Roboto, sans-serif';
    sctx.textAlign = 'center';
    sctx.fillText('TRI AI • AUTONOMOUS STUDIO', 256, 52);

    sctx.fillStyle = '#94a3b8';
    sctx.font = '18px "Segoe UI", Roboto, sans-serif';
    sctx.fillText('MULTI-AGENT EXECUTIVE INTELLIGENCE PODS', 256, 88);

    const tex = new THREE.CanvasTexture(sc);
    const signMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0x00f2ff,
      emissiveMap: tex,
      emissiveIntensity: 0.45,
      roughness: 0.2
    });
    const signGeo = new THREE.BoxGeometry(36, 9, 0.4);
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 36, -41.8);
    return sign;
  }
  scene.add(createStudioSign());

  // C. Modern Studio Potted Plants
  function createPlant(x, z, potColor, plantType) {
    const plantGroup = new THREE.Group();
    plantGroup.position.set(x, 0, z);

    // Ceramic pot
    const potMat = new THREE.MeshStandardMaterial({ color: potColor, roughness: 0.3 });
    const potGeo = new THREE.CylinderGeometry(3.2, 2.5, 7, 24);
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.y = 3.5;
    pot.castShadow = true;
    plantGroup.add(pot);

    // Soil
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x271e16, roughness: 0.9 });
    const soilGeo = new THREE.CylinderGeometry(3.0, 3.0, 0.4, 24);
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 6.9;
    plantGroup.add(soil);

    // Leaves
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.5 });
    if (plantType === 'monstera') {
      for (let i = 0; i < 9; i++) {
        const ang = (i * Math.PI * 2) / 9;
        const stemGeo = new THREE.CylinderGeometry(0.12, 0.15, 7, 8);
        const stem = new THREE.Mesh(stemGeo, leafMat);
        stem.position.set(Math.sin(ang) * 1.5, 9.5, Math.cos(ang) * 1.5);
        stem.rotation.y = ang;
        stem.rotation.z = 0.45 + Math.random() * 0.2;
        plantGroup.add(stem);

        const leafGeo = new THREE.SphereGeometry(2.4, 8, 8);
        leafGeo.scale(1.2, 0.1, 0.7);
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(Math.sin(ang) * 3.8, 12.0, Math.cos(ang) * 3.8);
        leaf.rotation.y = ang;
        leaf.rotation.x = 0.3;
        leaf.castShadow = true;
        plantGroup.add(leaf);
      }
    } else {
      // Bamboo / Snake Plant
      for (let j = 0; j < 14; j++) {
        const sx = (Math.random() - 0.5) * 4;
        const sz = (Math.random() - 0.5) * 4;
        const stalkH = 14 + Math.random() * 6;
        const stalkGeo = new THREE.CylinderGeometry(0.18, 0.35, stalkH, 8);
        const stalk = new THREE.Mesh(stalkGeo, leafMat);
        stalk.position.set(sx, 7 + stalkH / 2, sz);
        stalk.rotation.z = (Math.random() - 0.5) * 0.15;
        stalk.castShadow = true;
        plantGroup.add(stalk);
      }
    }
    return plantGroup;
  }
  scene.add(createPlant(-54, -30, 0xf8fafc, 'monstera'));
  scene.add(createPlant(54, -30, 0xd97706, 'bamboo'));

  // D. Right Wall Executive Server Credenza
  const credenzaGroup = new THREE.Group();
  credenzaGroup.position.set(56, 0, 5);
  credenzaGroup.rotation.y = -Math.PI / 2;

  const credenzaMat = new THREE.MeshStandardMaterial({ color: 0x181e29, roughness: 0.5 });
  const credenzaBody = new THREE.Mesh(new THREE.BoxGeometry(28, 9, 7), credenzaMat);
  credenzaBody.position.y = 4.5;
  credenzaBody.castShadow = true;
  credenzaGroup.add(credenzaBody);

  // Blinking Server Unit LEDs
  const ledMats = [
    new THREE.MeshBasicMaterial({ color: 0x10b981 }),
    new THREE.MeshBasicMaterial({ color: 0x00f2ff }),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b })
  ];
  const leds = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), ledMats[(r + c) % 3]);
      led.position.set(-10 + c * 4, 3 + r * 2.2, 3.6);
      credenzaGroup.add(led);
      leds.push(led);
    }
  }
  scene.add(credenzaGroup);

  // 4. Procedural Monitor Screen Textures
  function createMonitorTexture(agent, type) {
    const mc = document.createElement('canvas');
    mc.width = type === 'main' ? 512 : 256;
    mc.height = 256;
    const mctx = mc.getContext('2d');

    // Background
    mctx.fillStyle = '#0a0e17';
    mctx.fillRect(0, 0, mc.width, mc.height);

    // Top status header bar
    mctx.fillStyle = agent.themeHex;
    mctx.fillRect(0, 0, mc.width, 26);
    mctx.fillStyle = '#050811';
    mctx.font = 'bold 12px "Segoe UI", monospace';
    mctx.fillText(`${agent.name.toUpperCase()} // ${agent.role.toUpperCase()}`, 10, 18);

    if (agent.id === 'alice') {
      // Alice: Research Citation Graph & Papers
      mctx.fillStyle = '#c084fc';
      mctx.font = '12px monospace';
      mctx.fillText('> Semantic Query: "Groq 120B Knowledge"', 12, 54);
      mctx.fillText('> Cosine Similarity: 0.9842 [HIGH]', 12, 74);
      mctx.fillText('> Citation [1]: Windows Automation API', 12, 94);
      mctx.fillText('> Citation [2]: Edge TTS Neural Synthesizer', 12, 114);

      // Mini semantic graph nodes
      mctx.strokeStyle = '#a855f7';
      mctx.lineWidth = 2;
      mctx.strokeRect(14, 134, 180, 100);
      mctx.fillStyle = '#9333ea';
      mctx.beginPath();
      mctx.arc(60, 184, 12, 0, Math.PI * 2);
      mctx.arc(120, 160, 10, 0, Math.PI * 2);
      mctx.arc(150, 204, 14, 0, Math.PI * 2);
      mctx.fill();
    } else if (agent.id === 'bob') {
      // Bob: Code & Terminal Pipeline
      mctx.fillStyle = '#34d399';
      mctx.font = '12px monospace';
      mctx.fillText('tri-ai@node-core:~/engine$ node server.js', 12, 52);
      mctx.fillText('[PASS] Port 3456 Listening: HTTP 200 OK', 12, 72);
      mctx.fillText('[PASS] Model Active: openai/gpt-oss-120b', 12, 92);
      mctx.fillText('[EXEC] Automation trigger: Ready', 12, 112);

      // Progress bar
      mctx.fillStyle = '#065f46';
      mctx.fillRect(12, 134, mc.width - 24, 18);
      mctx.fillStyle = '#10b981';
      mctx.fillRect(12, 134, (mc.width - 24) * 0.88, 18);
      mctx.fillStyle = '#ffffff';
      mctx.font = 'bold 11px monospace';
      mctx.fillText('BUILD PIPELINE: 88% SYNCHRONIZED', 20, 148);
    } else if (agent.id === 'carol') {
      // Carol: Visual Mindmap & Concept Nodes
      mctx.fillStyle = '#fbbf24';
      mctx.font = '12px monospace';
      mctx.fillText('VISUAL GRAPH: "TRI AI Knowledge Matrix"', 12, 52);
      mctx.fillText('Nodes: 14 Active | Layout: Force-Directed', 12, 72);

      // Draw Mindmap curves
      mctx.strokeStyle = '#f59e0b';
      mctx.lineWidth = 2.5;
      mctx.beginPath();
      mctx.moveTo(40, 180);
      mctx.bezierCurveTo(90, 120, 140, 220, 200, 160);
      mctx.bezierCurveTo(240, 120, 280, 190, 340, 140);
      mctx.stroke();

      mctx.fillStyle = '#fbbf24';
      [40, 200, 340].forEach((px, i) => {
        mctx.beginPath();
        mctx.arc(px, 180 - i * 20, 14, 0, Math.PI * 2);
        mctx.fill();
      });
    } else if (agent.id === 'dave') {
      // Dave: Security Radar & Port Telemetry
      mctx.fillStyle = '#38bdf8';
      mctx.font = '12px monospace';
      mctx.fillText('SENTINEL SYSTEM MONITOR v2.4', 12, 52);
      mctx.fillText('Boundaries: Localhost Only | Leak: 0.00%', 12, 72);
      mctx.fillText('Process Integrity: VERIFIED ENCRYPTED', 12, 92);

      // Draw Radar
      mctx.strokeStyle = '#00f2ff';
      mctx.lineWidth = 1.5;
      mctx.beginPath();
      mctx.arc(mc.width / 2, 175, 55, 0, Math.PI * 2);
      mctx.arc(mc.width / 2, 175, 35, 0, Math.PI * 2);
      mctx.arc(mc.width / 2, 175, 18, 0, Math.PI * 2);
      mctx.stroke();
      mctx.beginPath();
      mctx.moveTo(mc.width / 2 - 60, 175);
      mctx.lineTo(mc.width / 2 + 60, 175);
      mctx.moveTo(mc.width / 2, 115);
      mctx.lineTo(mc.width / 2, 235);
      mctx.stroke();
    }

    const tex = new THREE.CanvasTexture(mc);
    return tex;
  }

  // 5. 3D Floating Name & Thought Hologram
  function drawRoundedRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
    }
  }

  function createThoughtBadge(agent) {
    const tc = document.createElement('canvas');
    tc.width = 512;
    tc.height = 160;
    const tctx = tc.getContext('2d');

    // Rounded Card Background
    tctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    tctx.beginPath();
    drawRoundedRect(tctx, 8, 8, 496, 144, 24);
    tctx.fill();

    tctx.strokeStyle = agent.themeHex;
    tctx.lineWidth = 4;
    tctx.beginPath();
    drawRoundedRect(tctx, 8, 8, 496, 144, 24);
    tctx.stroke();

    // Agent Avatar Icon & Name
    tctx.fillStyle = '#ffffff';
    tctx.font = 'bold 36px "Segoe UI", sans-serif';
    tctx.fillText(`${agent.avatarIcon} ${agent.name}`, 32, 60);

    // Role Pill
    tctx.fillStyle = agent.themeHex;
    tctx.font = 'bold 22px monospace';
    tctx.fillText(`[ ${agent.role.toUpperCase()} ]`, 32, 96);

    // Live Thought Status
    tctx.fillStyle = '#94a3b8';
    tctx.font = 'italic 20px "Segoe UI", sans-serif';
    tctx.fillText(`"${agent.thought}"`, 32, 130);

    const tex = new THREE.CanvasTexture(tc);
    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0.95
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(16, 5, 1);
    return sprite;
  }

  // 6. Realistic 3D Humanoid Character Modeling
  function createCharacter(agent) {
    const charGroup = new THREE.Group();

    // Natural Skin Material
    const skinMat = new THREE.MeshStandardMaterial({
      color: agent.skinColor,
      roughness: 0.65,
      metalness: 0.05
    });

    // Clothing Material
    const outfitMat = new THREE.MeshStandardMaterial({
      color: agent.outfitColor,
      roughness: 0.7,
      metalness: 0.1
    });

    // Pants Material
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x18202f,
      roughness: 0.8
    });

    // Shoes
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x0b101b,
      roughness: 0.4
    });

    // A. Pelvis & Legs (Sitting Position)
    const hips = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.0, 4.6), pantsMat);
    hips.position.set(0, 9.8, -0.6);
    charGroup.add(hips);

    // Thighs (Forward horizontally)
    [-1.6, 1.6].forEach(tx => {
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 5.0), pantsMat);
      thigh.position.set(tx, 9.5, 1.8);
      charGroup.add(thigh);

      // Shins (Down vertically to floor)
      const shin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 8.2, 1.9), pantsMat);
      shin.position.set(tx, 4.5, 4.2);
      charGroup.add(shin);

      // Shoes
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.5, 4.0), shoeMat);
      shoe.position.set(tx, 0.75, 4.9);
      charGroup.add(shoe);
    });

    // B. Torso Group (Breathing Animation Anchor)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 11.2, -0.6);

    // Lower Torso
    const lowerTorso = new THREE.Mesh(new THREE.BoxGeometry(5.2, 4.2, 3.8), outfitMat);
    lowerTorso.position.y = 2.0;
    torsoGroup.add(lowerTorso);

    // Upper Chest & Shoulders
    const chest = new THREE.Mesh(new THREE.BoxGeometry(6.6, 5.2, 4.4), outfitMat);
    chest.position.y = 5.6;
    torsoGroup.add(chest);

    // Collar / Inner Blouse Accent
    if (agent.collarColor) {
      const collarMat = new THREE.MeshStandardMaterial({ color: agent.collarColor, roughness: 0.5 });
      const collar = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.2, 4.5), collarMat);
      collar.position.set(0, 7.0, 0.1);
      torsoGroup.add(collar);
    }

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 2.0, 16), skinMat);
    neck.position.set(0, 8.5, 0.2);
    torsoGroup.add(neck);

    // C. Head Group (Independent Look / Gaze / Tracking)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 11.0, 0.2);

    // Sculpted Head Cranium
    const headGeo = new THREE.SphereGeometry(2.4, 24, 24);
    headGeo.scale(1.0, 1.18, 1.05);
    const head = new THREE.Mesh(headGeo, skinMat);
    headGroup.add(head);

    // Nose
    const noseGeo = new THREE.ConeGeometry(0.32, 1.0, 4);
    noseGeo.rotateX(-Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, 0, 2.5);
    headGroup.add(nose);

    // Eyes
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const eyePupilMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1 });
    const hairMat = new THREE.MeshStandardMaterial({ color: agent.hairColor, roughness: 0.8 });

    [-0.8, 0.8].forEach(ex => {
      // Sclera
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), eyeWhiteMat);
      eyeWhite.scale.set(1.1, 0.7, 0.7);
      eyeWhite.position.set(ex, 0.35, 2.25);
      headGroup.add(eyeWhite);

      // Pupil
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), eyePupilMat);
      pupil.position.set(ex, 0.35, 2.52);
      headGroup.add(pupil);

      // Eyebrow
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.16, 0.3), hairMat);
      brow.position.set(ex, 0.8, 2.3);
      brow.rotation.z = ex < 0 ? -0.1 : 0.1;
      headGroup.add(brow);
    });

    // Dave's Rectangular Glasses
    if (agent.hasGlasses) {
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x00f2ff, metalness: 0.9, roughness: 0.1 });
      [-0.8, 0.8].forEach(gx => {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 16), frameMat);
        rim.position.set(gx, 0.35, 2.6);
        headGroup.add(rim);
      });
      const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), frameMat);
      bridge.rotation.z = Math.PI / 2;
      bridge.position.set(0, 0.42, 2.65);
      headGroup.add(bridge);
    }

    // Custom Sculpted Hairstyle per Agent
    if (agent.id === 'alice') {
      // Alice: Espresso Ponytail + Chic Bangs
      const hairCap = new THREE.Mesh(new THREE.SphereGeometry(2.55, 20, 20), hairMat);
      hairCap.position.set(0, 0.4, -0.2);
      headGroup.add(hairCap);

      const bangs = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 1.2), hairMat);
      bangs.position.set(0, 1.7, 1.8);
      bangs.rotation.x = 0.2;
      headGroup.add(bangs);

      // Ponytail gathered at back
      const ponyTie = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.18, 8, 16), outfitMat);
      ponyTie.position.set(0, 0.6, -2.5);
      headGroup.add(ponyTie);

      const ponytail = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.3, 5.0, 12), hairMat);
      ponytail.position.set(0, -1.8, -3.2);
      ponytail.rotation.x = -0.3;
      headGroup.add(ponytail);
    } else if (agent.id === 'bob') {
      // Bob: Modern Styled Dark Hair with Textured Volume
      const hairCap = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 20), hairMat);
      hairCap.position.set(0, 0.5, 0);
      headGroup.add(hairCap);

      const quiff = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.4, 2.8), hairMat);
      quiff.position.set(0, 2.2, 0.4);
      headGroup.add(quiff);
    } else if (agent.id === 'carol') {
      // Carol: Auburn Wavy Bob framing face
      const hairCap = new THREE.Mesh(new THREE.SphereGeometry(2.65, 20, 20), hairMat);
      hairCap.position.set(0, 0.4, -0.1);
      headGroup.add(hairCap);

      [-1.8, 1.8].forEach(sx => {
        const sideCurl = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.65, 4.2, 12), hairMat);
        sideCurl.position.set(sx, -0.5, 0.8);
        sideCurl.rotation.z = sx < 0 ? -0.15 : 0.15;
        headGroup.add(sideCurl);
      });
    } else if (agent.id === 'dave') {
      // Dave: Clean Professional Fade
      const hairCap = new THREE.Mesh(new THREE.SphereGeometry(2.55, 20, 20), hairMat);
      hairCap.position.set(0, 0.45, 0);
      headGroup.add(hairCap);

      const topPart = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 3.2), hairMat);
      topPart.position.set(0, 2.1, 0.1);
      headGroup.add(topPart);
    }

    torsoGroup.add(headGroup);

    // D. Arms & Hands (Rigged for realistic desk typing posture)
    // Left Arm
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-3.6, 6.8, 0.2);

    const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.75, 4.2, 12), outfitMat);
    leftUpperArm.position.set(-0.5, -1.6, 1.0);
    leftUpperArm.rotation.x = Math.PI / 4.5;
    leftUpperArm.rotation.z = -Math.PI / 16;
    leftArmGroup.add(leftUpperArm);

    const leftForearmGroup = new THREE.Group();
    leftForearmGroup.position.set(-0.7, -3.0, 2.2);

    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.62, 4.0, 12), skinMat);
    leftForearm.position.set(0.5, 0.2, 1.6);
    leftForearm.rotation.x = -Math.PI / 2.3;
    leftForearm.rotation.y = -Math.PI / 10;
    leftForearmGroup.add(leftForearm);

    // Left Hand tapping keyboard
    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.4), skinMat);
    leftHand.position.set(0.7, 0.1, 3.4);
    leftForearmGroup.add(leftHand);

    leftArmGroup.add(leftForearmGroup);
    torsoGroup.add(leftArmGroup);

    // Right Arm
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(3.6, 6.8, 0.2);

    const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.75, 4.2, 12), outfitMat);
    rightUpperArm.position.set(0.5, -1.6, 1.0);
    rightUpperArm.rotation.x = Math.PI / 4.5;
    rightUpperArm.rotation.z = Math.PI / 16;
    rightArmGroup.add(rightUpperArm);

    const rightForearmGroup = new THREE.Group();
    rightForearmGroup.position.set(0.7, -3.0, 2.2);

    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.62, 4.0, 12), skinMat);
    rightForearm.position.set(-0.4, 0.2, 1.6);
    rightForearm.rotation.x = -Math.PI / 2.3;
    rightForearm.rotation.y = Math.PI / 12;
    rightForearmGroup.add(rightForearm);

    // Right Hand on Mouse / Keyboard
    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.4), skinMat);
    rightHand.position.set(-0.5, 0.1, 3.4);
    rightForearmGroup.add(rightHand);

    rightArmGroup.add(rightForearmGroup);
    torsoGroup.add(rightArmGroup);

    charGroup.add(torsoGroup);

    return {
      charGroup,
      torsoGroup,
      headGroup,
      leftForearmGroup,
      rightForearmGroup,
      leftHand,
      rightHand
    };
  }

  // 7. Workstation Setup (Desks, Dual Monitors, Chairs, Lamps)
  function createWorkstation(agent) {
    const stationGroup = new THREE.Group();
    stationGroup.position.set(agent.posX, 0, agent.posZ);
    stationGroup.rotation.y = agent.rotY;

    // A. Executive Dark Walnut Desk Top
    const deskMat = new THREE.MeshStandardMaterial({
      color: 0x1a212d,
      roughness: 0.35,
      metalness: 0.15
    });
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(22, 1.0, 11), deskMat);
    deskTop.position.set(0, 10.0, 4.0);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    stationGroup.add(deskTop);

    // Edge Accent Glow Trim
    const trimMat = new THREE.MeshStandardMaterial({
      color: agent.color,
      emissive: agent.color,
      emissiveIntensity: 0.55
    });
    const trim = new THREE.Mesh(new THREE.BoxGeometry(22.1, 0.16, 0.2), trimMat);
    trim.position.set(0, 10.0, 9.5);
    stationGroup.add(trim);

    // Matte Black Sled Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.6 });
    [-10, 10].forEach(lx => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9.5, 8.5), legMat);
      leg.position.set(lx, 4.75, 4.0);
      leg.castShadow = true;
      stationGroup.add(leg);
    });

    // Textured Charcoal Desk Mat
    const matMesh = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.06, 7.8),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 })
    );
    matMesh.position.set(0, 10.53, 4.4);
    stationGroup.add(matMesh);

    // Compact Mechanical Keyboard
    const kb = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.35, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45 })
    );
    kb.position.set(-0.5, 10.7, 5.8);
    stationGroup.add(kb);

    // Ergonomic Mouse
    const mouse = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.45, 1.7),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
    );
    mouse.position.set(5.2, 10.7, 5.8);
    stationGroup.add(mouse);

    // Ceramic Coffee Mug
    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.65, 1.5, 16),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 })
    );
    mug.position.set(-7.5, 11.25, 4.5);
    stationGroup.add(mug);

    // B. Dual Curved High-Res Monitors
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
    const monitorStand = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 6.5, 12), metalMat);
    monitorStand.position.set(0, 13.0, 1.2);
    stationGroup.add(monitorStand);

    // Primary Center Monitor
    const bezelMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.5 });
    const mainBezel = new THREE.Mesh(new THREE.BoxGeometry(11.2, 6.8, 0.4), bezelMat);
    mainBezel.position.set(-1.8, 15.0, 1.6);
    mainBezel.rotation.y = 0.05;
    stationGroup.add(mainBezel);

    const mainScreenTex = createMonitorTexture(agent, 'main');
    const mainScreenMat = new THREE.MeshBasicMaterial({ map: mainScreenTex });
    const mainScreen = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 6.2), mainScreenMat);
    mainScreen.position.set(-1.8, 15.0, 1.82);
    mainScreen.rotation.y = 0.05;
    stationGroup.add(mainScreen);

    // Secondary Angled Monitor
    const subBezel = new THREE.Mesh(new THREE.BoxGeometry(6.6, 6.8, 0.4), bezelMat);
    subBezel.position.set(6.6, 15.0, 2.5);
    subBezel.rotation.y = -0.38;
    stationGroup.add(subBezel);

    const subScreenTex = createMonitorTexture(agent, 'sub');
    const subScreenMat = new THREE.MeshBasicMaterial({ map: subScreenTex });
    const subScreen = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 6.2), subScreenMat);
    subScreen.position.set(6.6, 15.0, 2.72);
    subScreen.rotation.y = -0.38;
    stationGroup.add(subScreen);

    // Soft Screen Face-Glow Light
    const screenGlow = new THREE.PointLight(agent.color, 0.65, 16);
    screenGlow.position.set(0, 15.0, 4.0);
    stationGroup.add(screenGlow);

    // Dedicated Ceiling Spotlight over this workstation
    const spot = new THREE.SpotLight(0xfff7ea, 1.1, 60, Math.PI / 4, 0.4, 1.2);
    spot.position.set(agent.posX, 42, agent.posZ);
    spot.target = stationGroup;
    spot.castShadow = true;
    scene.add(spot);

    // C. Ergonomic 5-Star Office Mesh Chair
    const chairGroup = new THREE.Group();
    chairGroup.position.set(0, 0, -1.0);

    // 5-Spoke Wheel Base
    for (let s = 0; s < 5; s++) {
      const ang = (s * Math.PI * 2) / 5;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 3.6), metalMat);
      spoke.position.set(Math.sin(ang) * 1.8, 1.0, Math.cos(ang) * 1.8);
      spoke.rotation.y = ang;
      chairGroup.add(spoke);

      const caster = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), bezelMat);
      caster.position.set(Math.sin(ang) * 3.4, 0.3, Math.cos(ang) * 3.4);
      chairGroup.add(caster);
    }

    // Hydraulic Cylinder
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 6.0, 12), metalMat);
    cyl.position.y = 4.0;
    chairGroup.add(cyl);

    // Mesh Seat Cushion
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x141b26, roughness: 0.75 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(7.0, 1.2, 6.5), seatMat);
    seat.position.y = 7.0;
    chairGroup.add(seat);

    // Ergonomic Curved Mesh Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(6.4, 9.0, 0.8), seatMat);
    back.position.set(0, 12.0, -3.0);
    back.rotation.x = -0.1;
    chairGroup.add(back);

    // Armrests
    [-3.6, 3.6].forEach(ax => {
      const armPad = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 4.4), seatMat);
      armPad.position.set(ax, 10.4, -0.4);
      chairGroup.add(armPad);

      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.0, 0.45), metalMat);
      strut.position.set(ax, 8.8, -0.4);
      chairGroup.add(strut);
    });

    stationGroup.add(chairGroup);

    // D. 3D Humanoid Character in Chair
    const character = createCharacter(agent);
    character.charGroup.position.set(0, -1.0, -1.0);
    stationGroup.add(character.charGroup);

    // E. 3D Floating Name & Thought Hologram Badge
    const thoughtBadge = createThoughtBadge(agent);
    thoughtBadge.position.set(0, 24.0, 0);
    stationGroup.add(thoughtBadge);

    // Desk Status Beacon LED
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.3, 12),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    beacon.position.set(9.0, 10.7, 8.5);
    stationGroup.add(beacon);

    // F. Invisible Raycast Hit Box for generous, responsive hover & click
    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(24, 26, 18),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.set(0, 13.0, 3.0);
    stationGroup.add(hitBox);

    scene.add(stationGroup);

    return {
      stationGroup,
      character,
      chairGroup,
      thoughtBadge,
      spotLight: spot,
      beacon,
      screenGlow,
      hitBox,
      agent
    };
  }

  // 8. Define the 4 Autonomous Agents (Alice, Bob, Carol, Dave)
  const agentConfigs = [
    {
      id: 'alice',
      name: 'Alice',
      role: 'Research & Context Lead',
      avatarIcon: '👩‍💼',
      themeHex: '#a855f7',
      color: 0xa855f7,
      posX: -38,
      posZ: 4,
      rotY: 0.62,
      skinColor: 0xf6d0b3,
      hairColor: 0x1c130d,
      outfitColor: 0x312456,
      collarColor: 0xf8fafc,
      hasGlasses: false,
      thought: 'Semantic context analyzed. Ready with citations.'
    },
    {
      id: 'bob',
      name: 'Bob',
      role: 'Task & Automation Lead',
      avatarIcon: '👨‍💻',
      themeHex: '#10b981',
      color: 0x10b981,
      posX: -13,
      posZ: -12,
      rotY: 0.22,
      skinColor: 0xebba97,
      hairColor: 0x191919,
      outfitColor: 0x0f5132,
      collarColor: null,
      hasGlasses: false,
      thought: 'Task pipeline synced. Windows triggers active.'
    },
    {
      id: 'carol',
      name: 'Carol',
      role: 'Visual Hub & Mindmap Lead',
      avatarIcon: '👩‍🎨',
      themeHex: '#f59e0b',
      color: 0xf59e0b,
      posX: 13,
      posZ: -12,
      rotY: -0.22,
      skinColor: 0xfce0cf,
      hairColor: 0x5a2816,
      outfitColor: 0xd97706,
      collarColor: null,
      hasGlasses: false,
      thought: 'Knowledge graph rendered. Synthesis complete.'
    },
    {
      id: 'dave',
      name: 'Dave',
      role: 'Security & Sentinel Lead',
      avatarIcon: '👨‍🔧',
      themeHex: '#00f2ff',
      color: 0x00f2ff,
      posX: 38,
      posZ: 4,
      rotY: -0.62,
      skinColor: 0xdfb08c,
      hairColor: 0x151515,
      outfitColor: 0x1e293b,
      collarColor: 0xf8fafc,
      hasGlasses: true,
      thought: 'Sentinel boundary secure. Port 3456 active.'
    }
  ];

  const workstations = agentConfigs.map(cfg => createWorkstation(cfg));

  // 9. Interactive Raycasting, Selection & Camera Focus
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-999, -999);
  let hoveredStation = null;
  let activeStation = null;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  });

  canvas.addEventListener('mouseleave', () => {
    mouse.set(-999, -999);
    hoveredStation = null;
    canvas.style.cursor = 'default';
  });

  // Focus on Agent Workstation
  function selectAgent(station) {
    activeStation = station;
    const ag = station.agent;

    // Focus Camera Smoothly on this Agent's desk
    targetCamPos.set(
      ag.posX * 0.65,
      20.0,
      ag.posZ + 36.0
    );
    targetLookAt.set(
      ag.posX,
      12.0,
      ag.posZ
    );

    // Sync Chat Input
    const input = document.getElementById('chatInput');
    if (input) {
      input.value = `Ask ${ag.name}: `;
      input.focus();
    }

    // Sync Top Roster Badge
    document.querySelectorAll('.agent-badge').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-agent') === ag.id);
    });

    // Audio-visual feedback
    if (window.triggerCorePulse) {
      window.triggerCorePulse(0.9);
    }

    updateBusyMetric();
  }

  // Reset to Full Office Studio Overview
  function resetCamera() {
    activeStation = null;
    targetCamPos.copy(defaultCamPos);
    targetLookAt.copy(defaultLookAt);
  }

  canvas.addEventListener('click', () => {
    if (hoveredStation) {
      selectAgent(hoveredStation);
    } else {
      resetCamera();
    }
  });

  // Connect Top Roster Badges
  document.querySelectorAll('.agent-badge').forEach(badge => {
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      const agentId = badge.getAttribute('data-agent');
      const st = workstations.find(w => w.agent.id === agentId);
      if (st) selectAgent(st);
    });
  });

  // Connect Reset Sim Button in Header
  const btnResetSim = document.getElementById('btnResetSim');
  if (btnResetSim) {
    btnResetSim.addEventListener('click', resetCamera);
  }

  function updateBusyMetric() {
    const busyCount = activeStation ? 1 : 0;
    const el = document.getElementById('busyMetricText');
    if (el) el.textContent = `⚡ ${busyCount}/4 Focused`;
  }

  // 10. Mouse Orbit Dragging (Rotate view slightly)
  let isDragging = false;
  let prevMouseX = 0;
  let orbitAngle = 0;

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && !hoveredStation) {
      isDragging = true;
      prevMouseX = e.clientX;
    }
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const deltaX = e.clientX - prevMouseX;
      prevMouseX = e.clientX;
      orbitAngle += deltaX * 0.005;
      orbitAngle = Math.max(-0.4, Math.min(0.4, orbitAngle));
    }
  });

  // 11. Main 60 FPS Animation Engine
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    // Only render when tab is active
    if (!canvas.classList.contains('active')) return;

    const time = clock.getElapsedTime();

    // Raycast against all workstation hit boxes
    raycaster.setFromCamera(mouse, camera);
    const hitBoxes = workstations.map(w => w.hitBox);
    const intersects = raycaster.intersectObjects(hitBoxes, false);

    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      hoveredStation = workstations.find(w => w.hitBox === hitObj) || null;
      canvas.style.cursor = 'pointer';
    } else {
      hoveredStation = null;
      canvas.style.cursor = isDragging ? 'grabbing' : 'default';
    }

    // Camera Smooth Lerp Transition
    baseCamPos.lerp(targetCamPos, 0.05);
    currentLookAt.lerp(targetLookAt, 0.05);
    
    // Apply subtle orbit offset cleanly without vector accumulation
    camera.position.set(
      baseCamPos.x + Math.sin(orbitAngle) * 16,
      baseCamPos.y,
      baseCamPos.z
    );
    camera.lookAt(currentLookAt);

    // Animate Each 3D Humanoid Agent & Workstation
    workstations.forEach((st, idx) => {
      const ch = st.character;
      const isHovered = (st === hoveredStation);
      const isFocused = (st === activeStation);

      // A. Natural Breathing (Chest Rises & Falls)
      ch.torsoGroup.position.y = 11.2 + Math.sin(time * 2.2 + idx * 1.5) * 0.12;

      // B. Realistic Typing Hand Movements
      const typeSpeed = isFocused ? 14 : 9;
      ch.leftForearmGroup.rotation.x = -Math.PI / 2.3 + Math.sin(time * typeSpeed + idx * 2.1) * 0.04;
      ch.rightForearmGroup.rotation.x = -Math.PI / 2.3 + Math.cos(time * (typeSpeed - 1) + idx * 1.9) * 0.04;

      // C. Head Movement (Idle Screen Glance vs User Gaze)
      if (isHovered || isFocused) {
        // Look directly towards camera / user
        ch.headGroup.rotation.y += (0 - ch.headGroup.rotation.y) * 0.1;
        ch.headGroup.rotation.x += (-0.15 - ch.headGroup.rotation.x) * 0.1;
      } else {
        // Natural glance between dual screens
        ch.headGroup.rotation.y = Math.sin(time * 0.8 + idx * 1.3) * 0.22;
        ch.headGroup.rotation.x = Math.sin(time * 1.2 + idx * 0.7) * 0.05;
      }

      // D. SpotLight & Screen Glow Warmth
      const targetIntensity = (isHovered || isFocused) ? 1.6 : 1.0;
      st.spotLight.intensity += (targetIntensity - st.spotLight.intensity) * 0.1;
      st.screenGlow.intensity = (isHovered || isFocused) ? 1.0 : 0.65;

      // E. Floating Thought Badge Motion & Scale
      const floatY = 24.0 + Math.sin(time * 2.0 + idx) * 0.4;
      st.thoughtBadge.position.y = floatY;
      const targetScale = (isHovered || isFocused) ? 1.15 : 1.0;
      st.thoughtBadge.scale.lerp(new THREE.Vector3(16 * targetScale, 5 * targetScale, 1), 0.1);

      // F. Status Beacon Blink
      st.beacon.material.color.setHex((Math.sin(time * 3 + idx) > 0) ? 0x10b981 : 0x059669);
    });

    // Server LED Random Blinking
    leds.forEach((led, i) => {
      led.visible = Math.sin(time * 6 + i * 2) > -0.6;
    });

    renderer.render(scene, camera);
  }

  animate();
})();
