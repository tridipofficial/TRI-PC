// ============================================================
// TRI AI - IRON MAN / JARVIS 3D HOLOGRAPHIC COCKPIT (Three.js WebGL)
// High-Fidelity 3D Iron Man Suit (GLTF + Sculpted Procedural Fallback)
// Central Arc Reactor (JARVIS MARK II) + Real-Time Audio Reactivity
// ============================================================

(function() {
  const canvas = document.getElementById('orbCanvas');
  const orbViewport = document.querySelector('.orb-viewport');
  if (!canvas || !window.THREE) return;

  // 1. SCENE, CAMERA, RENDERER
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / (canvas.clientHeight || 1), 0.1, 1000);
  camera.position.set(0, 10, 140);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  function resize() {
    const width = canvas.clientWidth || 360;
    const height = canvas.clientHeight || 420;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  window.addEventListener('resize', resize);
  setTimeout(resize, 100);

  // 2. CINEMATIC LIGHTING FOR REALISTIC METALLIC PBR SHADING
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
  scene.add(ambientLight);

  // Key Light (Electric Cyan from top-front-right)
  const dirLightCyan = new THREE.DirectionalLight(0x00f2ff, 1.5);
  dirLightCyan.position.set(35, 55, 60);
  scene.add(dirLightCyan);

  // Fill Light (Warm Titanium-Gold from front-left)
  const dirLightWarm = new THREE.DirectionalLight(0xf59e0b, 1.1);
  dirLightWarm.position.set(-35, 45, 50);
  scene.add(dirLightWarm);

  // Rim Light (Ice Blue from behind for cinematic edge sheen)
  const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
  rimLight.position.set(0, 50, -60);
  scene.add(rimLight);

  // Chest Unibeam Point Light (Casts dynamic glow onto chin and armor)
  const unibeamLight = new THREE.PointLight(0x00f2ff, 2.8, 65);
  unibeamLight.position.set(0, -6, 16);
  scene.add(unibeamLight);

  // Helmet Visor Point Light
  const visorLight = new THREE.PointLight(0x00f2ff, 1.8, 35);
  visorLight.position.set(0, 7, 14);
  scene.add(visorLight);

  // 3. MASTER STAGE GROUP
  const stageGroup = new THREE.Group();
  scene.add(stageGroup);

  // ============================================================
  // 4. CENTRAL ARC REACTOR (JARVIS MARK II) - UPPER BACKGROUND
  // ============================================================
  const reactorGroup = new THREE.Group();
  reactorGroup.position.set(0, 36, -10);
  stageGroup.add(reactorGroup);

  // Glowing Diamond Arc Core
  const coreGeo = new THREE.OctahedronGeometry(8.5, 2);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0x00f2ff,
    wireframe: true,
    transparent: true,
    opacity: 0.85
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  reactorGroup.add(coreMesh);

  // Solid Core Glow Sphere
  const glowGeo = new THREE.SphereGeometry(5, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.9
  });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  reactorGroup.add(glowMesh);

  // Concentric Holographic Gauge Rings
  const ring1Geo = new THREE.RingGeometry(13, 14.5, 48);
  const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
  const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
  reactorGroup.add(ring1);

  // Radial Spokes
  const spokesGroup = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const spokeGeo = new THREE.BufferGeometry();
    const a = (i / 8) * Math.PI * 2;
    spokeGeo.setFromPoints([
      new THREE.Vector3(Math.cos(a) * 6, Math.sin(a) * 6, 0),
      new THREE.Vector3(Math.cos(a) * 13, Math.sin(a) * 13, 0)
    ]);
    spokesGroup.add(new THREE.Line(spokeGeo, new THREE.LineBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.8 })));
  }
  reactorGroup.add(spokesGroup);

  // Counter-Rotating Middle Gear Ring
  const ring2Geo = new THREE.RingGeometry(18, 20.5, 36);
  const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });
  const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
  reactorGroup.add(ring2);

  // Outer Tactical Tick Ring
  const ring3Geo = new THREE.RingGeometry(25, 26.5, 64);
  const ring3Mat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
  const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
  reactorGroup.add(ring3);

  const ticksGroup = new THREE.Group();
  for (let i = 0; i < 36; i++) {
    const tickGeo = new THREE.BufferGeometry();
    const a = (i / 36) * Math.PI * 2;
    const len = i % 9 === 0 ? 3.5 : 1.8;
    tickGeo.setFromPoints([
      new THREE.Vector3(Math.cos(a) * 26.5, Math.sin(a) * 26.5, 0),
      new THREE.Vector3(Math.cos(a) * (26.5 + len), Math.sin(a) * (26.5 + len), 0)
    ]);
    ticksGroup.add(new THREE.Line(tickGeo, new THREE.LineBasicMaterial({
      color: i % 9 === 0 ? 0xf59e0b : 0x00f2ff,
      transparent: true,
      opacity: 0.75
    })));
  }
  reactorGroup.add(ticksGroup);

  // Gyroscopic Gimbal Rings
  const gimbal1Geo = new THREE.RingGeometry(31, 32, 64);
  const gimbal1Mat = new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide, transparent: true, opacity: 0.45 });
  const gimbal1 = new THREE.Mesh(gimbal1Geo, gimbal1Mat);
  reactorGroup.add(gimbal1);

  const gimbal2Geo = new THREE.RingGeometry(36, 37, 64);
  const gimbal2Mat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
  const gimbal2 = new THREE.Mesh(gimbal2Geo, gimbal2Mat);
  reactorGroup.add(gimbal2);

  // Ambient Core Energy Particles
  const pCount = 140;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const r = 9 + Math.random() * 25;
    pPos[i * 3] = Math.cos(theta) * r;
    pPos[i * 3 + 1] = Math.sin(theta) * r;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const coreParticles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: 0x00f2ff,
    size: 1.6,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  }));
  reactorGroup.add(coreParticles);

  // ============================================================
  // 5. 3D AVATAR STAGE (CYBER-PEDESTAL + IRON MAN MECH SUIT)
  // ============================================================
  const avatarGroup = new THREE.Group();
  avatarGroup.position.set(0, -22, 0);
  stageGroup.add(avatarGroup);

  // Cyber-Pedestal Base Platform
  const pedestalGeo = new THREE.CylinderGeometry(28, 32, 4, 36);
  const pedestalMat = new THREE.MeshStandardMaterial({
    color: 0x0b1728,
    roughness: 0.35,
    metalness: 0.8,
    wireframe: false
  });
  const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestal.position.y = -22;
  avatarGroup.add(pedestal);

  // Pedestal Wireframe Highlight
  const pWireGeo = new THREE.CylinderGeometry(28.2, 32.2, 4.1, 36);
  const pWireMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, wireframe: true, transparent: true, opacity: 0.3 });
  const pWire = new THREE.Mesh(pWireGeo, pWireMat);
  pWire.position.y = -22;
  avatarGroup.add(pWire);

  // Glowing Pedestal Energy Rim
  const rimGeo = new THREE.RingGeometry(28.5, 31.5, 36);
  const rimMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.y = -19.9;
  avatarGroup.add(rimMesh);

  // Holographic Grid Ring on Pedestal
  const pGridGeo = new THREE.RingGeometry(16, 26, 28);
  const pGridMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
  const pGridMesh = new THREE.Mesh(pGridGeo, pGridMat);
  pGridMesh.rotation.x = Math.PI / 2;
  pGridMesh.position.y = -19.7;
  avatarGroup.add(pGridMesh);

  // Floating Cyber Sparks / Data Dust
  const dustCount = 80;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 60;
    dustPos[i * 3 + 1] = Math.random() * 50 - 15;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 45;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const holoDust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 1.5,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  }));
  avatarGroup.add(holoDust);

  // Reference variables for live animation
  let activeMechModel = null;
  let proceduralMech = null;
  let headReference = null;
  let chestReactorRef = null;

  // ============================================================
  // 6. BUILD SCULPTED PROCEDURAL IRON MAN BUST (HIGH-REALISM)
  // (Instant visual while GLB prepares, or as resilient standalone)
  // ============================================================
  function buildSculptedProceduralMech() {
    const group = new THREE.Group();

    // High-tech PBR Materials
    const crimsonArmorMat = new THREE.MeshStandardMaterial({
      color: 0x881337, // Iron Man Hot-Rod Red / Deep Crimson Titanium
      roughness: 0.22,
      metalness: 0.9,
      envMapIntensity: 1.2
    });

    const goldAlloyMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Titanium-Gold Alloy
      roughness: 0.18,
      metalness: 0.92,
      envMapIntensity: 1.5
    });

    const darkTitaniumMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Dark Carbon / Titanium Undersuit
      roughness: 0.35,
      metalness: 0.85
    });

    const glowingEyeMat = new THREE.MeshBasicMaterial({
      color: 0x00f2ff,
      transparent: true,
      opacity: 0.95
    });

    const unibeamMat = new THREE.MeshBasicMaterial({
      color: 0x00f2ff,
      transparent: true,
      opacity: 0.95
    });

    // --- CHEST & TORSO ---
    const torsoGroup = new THREE.Group();
    group.add(torsoGroup);

    // Main Chest Chassis
    const chestGeo = new THREE.CylinderGeometry(11, 8.5, 16, 8, 1);
    const chestMesh = new THREE.Mesh(chestGeo, crimsonArmorMat);
    chestMesh.position.set(0, -4, 0);
    torsoGroup.add(chestMesh);

    // Sculpted Left & Right Pectoral Armor Plates
    const pecGeo = new THREE.BoxGeometry(7.2, 7.5, 3.5);
    const leftPec = new THREE.Mesh(pecGeo, crimsonArmorMat);
    leftPec.position.set(-4.5, -1.2, 5.2);
    leftPec.rotation.y = 0.2;
    leftPec.rotation.z = -0.08;
    torsoGroup.add(leftPec);

    const rightPec = new THREE.Mesh(pecGeo, crimsonArmorMat);
    rightPec.position.set(4.5, -1.2, 5.2);
    rightPec.rotation.y = -0.2;
    rightPec.rotation.z = 0.08;
    torsoGroup.add(rightPec);

    // Collarbone / Clavicle Gold Accents
    const collarGeo = new THREE.BoxGeometry(6.5, 2.2, 2.5);
    const leftCollar = new THREE.Mesh(collarGeo, goldAlloyMat);
    leftCollar.position.set(-4.8, 3.2, 4.2);
    leftCollar.rotation.z = -0.22;
    torsoGroup.add(leftCollar);

    const rightCollar = new THREE.Mesh(collarGeo, goldAlloyMat);
    rightCollar.position.set(4.8, 3.2, 4.2);
    rightCollar.rotation.z = 0.22;
    torsoGroup.add(rightCollar);

    // Central Unibeam Housing & Arc Core
    const unibeamRingGeo = new THREE.TorusGeometry(3.6, 0.7, 16, 32);
    const unibeamRing = new THREE.Mesh(unibeamRingGeo, goldAlloyMat);
    unibeamRing.position.set(0, -1.5, 6.4);
    torsoGroup.add(unibeamRing);

    const unibeamCoreGeo = new THREE.CylinderGeometry(2.8, 2.8, 0.8, 24);
    unibeamCoreGeo.rotateX(Math.PI / 2);
    const unibeamCore = new THREE.Mesh(unibeamCoreGeo, unibeamMat);
    unibeamCore.position.set(0, -1.5, 6.2);
    torsoGroup.add(unibeamCore);
    chestReactorRef = unibeamCore;

    // Segmented Abdominal Rib Plates
    for (let i = 0; i < 3; i++) {
      const abGeo = new THREE.BoxGeometry(8 - i * 0.9, 1.8, 3.2);
      const abPlate = new THREE.Mesh(abGeo, darkTitaniumMat);
      abPlate.position.set(0, -7.5 - i * 2.1, 4.4 - i * 0.4);
      torsoGroup.add(abPlate);
    }

    // --- SHOULDERS & ARMS ---
    // Curved Aerodynamic Pauldrons (Left & Right)
    const pauldronGeo = new THREE.SphereGeometry(5.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    pauldronGeo.rotateX(Math.PI / 2);

    const leftPauldron = new THREE.Mesh(pauldronGeo, crimsonArmorMat);
    leftPauldron.position.set(-13.5, 2.5, 0);
    leftPauldron.rotation.z = -0.4;
    leftPauldron.scale.set(1.2, 1.4, 1.1);
    torsoGroup.add(leftPauldron);

    const rightPauldron = new THREE.Mesh(pauldronGeo, crimsonArmorMat);
    rightPauldron.position.set(13.5, 2.5, 0);
    rightPauldron.rotation.z = 0.4;
    rightPauldron.scale.set(1.2, 1.4, 1.1);
    torsoGroup.add(rightPauldron);

    // Gold Shoulder Trim Insets
    const trimGeo = new THREE.CylinderGeometry(4.2, 4.8, 1.2, 16);
    const leftTrim = new THREE.Mesh(trimGeo, goldAlloyMat);
    leftTrim.position.set(-13.2, 3.8, 0);
    leftTrim.rotation.z = -0.4;
    torsoGroup.add(leftTrim);

    const rightTrim = new THREE.Mesh(trimGeo, goldAlloyMat);
    rightTrim.position.set(13.2, 3.8, 0);
    rightTrim.rotation.z = 0.4;
    torsoGroup.add(rightTrim);

    // Bicep Hydraulic Arms (Tactical Alert Stance)
    const armGeo = new THREE.CylinderGeometry(2.4, 2.1, 14, 12);
    const leftArm = new THREE.Mesh(armGeo, darkTitaniumMat);
    leftArm.position.set(-13.8, -6, 0);
    leftArm.rotation.z = 0.12;
    torsoGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, darkTitaniumMat);
    rightArm.position.set(13.8, -6, 0);
    rightArm.rotation.z = -0.12;
    torsoGroup.add(rightArm);

    // Forearm Gauntlets
    const gauntletGeo = new THREE.CylinderGeometry(2.7, 2.2, 10, 12);
    const leftGauntlet = new THREE.Mesh(gauntletGeo, crimsonArmorMat);
    leftGauntlet.position.set(-14.8, -15, 1);
    torsoGroup.add(leftGauntlet);

    const rightGauntlet = new THREE.Mesh(gauntletGeo, crimsonArmorMat);
    rightGauntlet.position.set(14.8, -15, 1);
    torsoGroup.add(rightGauntlet);

    // --- CYBERNETIC NECK & HYDRAULICS ---
    const neckGeo = new THREE.CylinderGeometry(3.8, 4.4, 5, 16);
    const neck = new THREE.Mesh(neckGeo, darkTitaniumMat);
    neck.position.set(0, 5.5, 0);
    torsoGroup.add(neck);

    // --- IRON MAN HELMET (SCULPTED MULTI-PIECE HEAD) ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 9.5, 0.5);
    torsoGroup.add(headGroup);
    headReference = headGroup;

    // Helmet Crown & Skull Shell (Crimson)
    const skullGeo = new THREE.SphereGeometry(5.2, 24, 20);
    skullGeo.scale(1.0, 1.15, 1.05);
    const skull = new THREE.Mesh(skullGeo, crimsonArmorMat);
    skull.position.set(0, 1.2, -0.6);
    headGroup.add(skull);

    // Iconic Gold Faceplate (Sculpted Contours)
    const faceplateGeo = new THREE.BoxGeometry(5.6, 6.8, 3.2);
    const faceplate = new THREE.Mesh(faceplateGeo, goldAlloyMat);
    faceplate.position.set(0, 0.4, 3.2);
    faceplate.scale.set(0.95, 1.0, 0.85);
    headGroup.add(faceplate);

    // Angular Tapering Jaw / Chin Plate
    const jawGeo = new THREE.ConeGeometry(2.8, 4.5, 4);
    jawGeo.rotateY(Math.PI / 4);
    const jaw = new THREE.Mesh(jawGeo, goldAlloyMat);
    jaw.position.set(0, -2.6, 3.2);
    jaw.rotation.x = Math.PI;
    jaw.scale.set(1.2, 0.85, 0.7);
    headGroup.add(jaw);

    // Dual Angular Glowing Cyan Eyes (Iconic Iron Man Slit Eyes)
    const eyeGeo = new THREE.BoxGeometry(1.6, 0.42, 0.5);

    const leftEye = new THREE.Mesh(eyeGeo, glowingEyeMat);
    leftEye.position.set(-1.6, 1.2, 4.8);
    leftEye.rotation.z = -0.18; // Inward aggressive tilt
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, glowingEyeMat);
    rightEye.position.set(1.6, 1.2, 4.8);
    rightEye.rotation.z = 0.18; // Inward aggressive tilt
    headGroup.add(rightEye);

    // Side Temporal Ear Audio Discs
    const earGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.8, 16);
    earGeo.rotateZ(Math.PI / 2);
    const leftEar = new THREE.Mesh(earGeo, goldAlloyMat);
    leftEar.position.set(-5.1, 0.5, 0);
    headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, goldAlloyMat);
    rightEar.position.set(5.1, 0.5, 0);
    headGroup.add(rightEar);

    // Floating Target Reticle HUD around Helmet
    const reticleGeo = new THREE.RingGeometry(6.5, 6.9, 32);
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const reticle = new THREE.Mesh(reticleGeo, reticleMat);
    reticle.position.set(0, 0.8, 7.5);
    headGroup.add(reticle);

    return group;
  }

  // Mount sculpted procedural model immediately
  proceduralMech = buildSculptedProceduralMech();
  avatarGroup.add(proceduralMech);
  activeMechModel = proceduralMech;

  // ============================================================
  // 7. ASYNCHRONOUS GLTF 3D SUIT LOADER (/ironman.glb)
  // ============================================================
  if (window.THREE && window.THREE.GLTFLoader) {
    const loader = new THREE.GLTFLoader();
    loader.load('/ironman.glb', (gltf) => {
      const gltfSuit = gltf.scene;

      // Compute bounding box to scale and center model
      const box = new THREE.Box3().setFromObject(gltfSuit);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const targetHeight = 56;
      const scale = targetHeight / Math.max(size.y, 0.01);
      gltfSuit.scale.set(scale, scale, scale);

      // Align feet with cyber-pedestal
      gltfSuit.position.x = -center.x * scale;
      gltfSuit.position.z = -center.z * scale;
      gltfSuit.position.y = -center.y * scale + (size.y * scale) * 0.44 - 20;

      // Enhance materials with PBR reflectivity & emissive eyes
      gltfSuit.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.metalness = 0.88;
            child.material.roughness = 0.24;
            child.material.envMapIntensity = 1.3;

            const n = (child.name || '').toLowerCase();
            if (n.includes('eye') || n.includes('arc') || n.includes('reactor') || n.includes('glow') || n.includes('light')) {
              child.material.emissive = new THREE.Color(0x00f2ff);
              child.material.emissiveIntensity = 2.8;
            }
          }
        }
      });

      // Seamlessly replace the procedural placeholder
      if (proceduralMech && proceduralMech.parent) {
        avatarGroup.remove(proceduralMech);
      }

      avatarGroup.add(gltfSuit);
      activeMechModel = gltfSuit;
      headReference = gltfSuit;

      const cap = document.querySelector('.orb-status-text');
      if (cap) cap.textContent = '• JARVIS MARK 85 • 3D SUIT ONLINE •';
      console.log('TRI AI: Authentic 3D Iron Man Suit loaded successfully!');
    }, (xhr) => {
      if (xhr.total > 0) {
        const pct = Math.round((xhr.loaded / xhr.total) * 100);
        const cap = document.querySelector('.orb-status-text');
        if (cap && pct < 100) cap.textContent = `• LOADING 3D IRON MAN SUIT (${pct}%) •`;
      }
    }, (err) => {
      console.warn('GLTF load fallback: Active on sculpted procedural armor.', err);
    });
  }

  // ============================================================
  // 8. AUDIO-REACTIVE & MOUSE PARALLAX TRACKING
  // ============================================================
  let audioPulse = 0;
  let targetPulse = 0;
  let mouseX = 0;
  let mouseY = 0;
  let targetLookX = 0;
  let targetLookY = 0;

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    mouseX = (e.clientX - cx) / (window.innerWidth / 2);
    mouseY = (e.clientY - cy) / (window.innerHeight / 2);
    targetLookX = mouseX * 0.35;
    targetLookY = -mouseY * 0.22;
  });

  // Global pulse trigger callable from audio player
  window.triggerCorePulse = function(intensity = 1.0) {
    targetPulse = Math.max(targetPulse, intensity);
  };

  if (orbViewport) {
    orbViewport.addEventListener('click', () => {
      targetPulse = 1.2;
    });
  }

  // ============================================================
  // 9. RENDER & ANIMATION LOOP
  // ============================================================
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // Voice modulation check
    const isSpeaking = window.triAIIsSpeaking || false;
    if (isSpeaking) {
      targetPulse = 0.55 + Math.sin(time * 15) * 0.35 + Math.cos(time * 24) * 0.15;
    } else {
      targetPulse *= 0.92;
    }
    audioPulse += (targetPulse - audioPulse) * 0.16;

    // Head / Suit Parallax Tracking
    if (headReference) {
      headReference.rotation.y += (targetLookX - headReference.rotation.y) * 0.08;
      headReference.rotation.x += (targetLookY - headReference.rotation.x) * 0.08;
    }

    // Gentle Whole-Stage Parallax
    stageGroup.rotation.y += (targetLookX * 0.25 - stageGroup.rotation.y) * 0.05;
    stageGroup.rotation.x += (targetLookY * 0.18 - stageGroup.rotation.x) * 0.05;

    // Organic Idle Breathing Motion
    const breath = Math.sin(time * 1.6) * 0.7;
    if (activeMechModel) {
      activeMechModel.position.y += (breath * 0.05);
    }

    // Dynamic Light Intensity based on Voice
    unibeamLight.intensity = 2.5 + audioPulse * 3.5;
    visorLight.intensity = 1.6 + audioPulse * 2.2;

    // Upper Arc Reactor Rotations & Flares
    coreMesh.rotation.y += 0.016;
    coreMesh.rotation.x -= 0.009;
    ring1.rotation.z += 0.016;
    spokesGroup.rotation.z += 0.016;
    ring2.rotation.z -= 0.022; // Counter-rotating gear
    ring3.rotation.z += 0.006;
    ticksGroup.rotation.z += 0.006;

    // Gyroscope 3D Tilts
    gimbal1.rotation.x = Math.PI / 3 + Math.sin(time * 0.8) * 0.18;
    gimbal1.rotation.y += 0.01;
    gimbal2.rotation.y = Math.PI / 4 + Math.cos(time * 0.7) * 0.18;
    gimbal2.rotation.x += 0.008;

    // Audio-reactive scale on Arc Core
    const coreScale = 1.0 + audioPulse * 0.32;
    coreMesh.scale.set(coreScale, coreScale, coreScale);
    glowMesh.scale.set(coreScale * 1.1, coreScale * 1.1, coreScale * 1.1);
    glowMat.opacity = 0.65 + audioPulse * 0.35;

    // Audio-reactive Unibeam Flare on Procedural Model
    if (chestReactorRef) {
      chestReactorRef.scale.set(1.0 + audioPulse * 0.35, 1.0 + audioPulse * 0.35, 1.0 + audioPulse * 0.35);
    }

    // Pedestal Energy Rim Rotation
    rimMesh.rotation.z += 0.008;
    pGridMesh.rotation.z -= 0.012;

    // Holographic Particles Float
    holoDust.rotation.y += 0.002;
    coreParticles.rotation.z += 0.004;

    renderer.render(scene, camera);
  }

  animate();
})();
