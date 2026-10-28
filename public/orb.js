// ============================================================
// TRI AI - IRON MAN / JARVIS 3D HOLOGRAPHIC COCKPIT (Three.js WebGL)
// Central Arc Reactor (JARVIS MARK II) + 3D Robotic Mech Avatar
// Real-Time Bengali Audio-Reactivity & Mouse Parallax Tracking
// ============================================================

(function() {
  const canvas = document.getElementById('orbCanvas');
  const orbViewport = document.querySelector('.orb-viewport');
  if (!canvas || !window.THREE) return;

  // 1. SCENE, CAMERA, RENDERER
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / (canvas.clientHeight || 1), 0.1, 1000);
  camera.position.set(0, 12, 150);

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
  setTimeout(resize, 120);

  // 2. MASTER HOLOGRAPHIC STAGE GROUP
  const stageGroup = new THREE.Group();
  scene.add(stageGroup);

  // ============================================================
  // 3. CENTRAL ARC REACTOR (JARVIS MARK II) - UPPER CENTER
  // ============================================================
  const reactorGroup = new THREE.Group();
  reactorGroup.position.set(0, 32, 0);
  stageGroup.add(reactorGroup);

  // Glowing Arc Core Nucleus (Inner Diamond)
  const coreGeo = new THREE.OctahedronGeometry(9, 2);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0x00f2ff,
    wireframe: true,
    transparent: true,
    opacity: 0.85
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  reactorGroup.add(coreMesh);

  // Solid Core Glow Sphere
  const glowGeo = new THREE.SphereGeometry(5.5, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.95
  });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  reactorGroup.add(glowMesh);

  // Concentric Holographic Arc Rings
  // Ring 1: Inner segmented ring with spokes
  const ring1Geo = new THREE.RingGeometry(14, 15.5, 48);
  const ring1Mat = new THREE.MeshBasicMaterial({
    color: 0x00f2ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75
  });
  const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
  reactorGroup.add(ring1);

  // Ring 1 Radial Spokes
  const spokesGroup = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const spokeGeo = new THREE.BufferGeometry();
    const angle = (i / 8) * Math.PI * 2;
    const pts = [
      new THREE.Vector3(Math.cos(angle) * 7, Math.sin(angle) * 7, 0),
      new THREE.Vector3(Math.cos(angle) * 14, Math.sin(angle) * 14, 0)
    ];
    spokeGeo.setFromPoints(pts);
    const spokeLine = new THREE.Line(spokeGeo, new THREE.LineBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.8 }));
    spokesGroup.add(spokeLine);
  }
  reactorGroup.add(spokesGroup);

  // Ring 2: Middle Gear Ring (Rotating Counter-Clockwise)
  const ring2Geo = new THREE.RingGeometry(19, 21.5, 36);
  const ring2Mat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.65
  });
  const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
  reactorGroup.add(ring2);

  // Ring 3: Outer Tactical HUD Ring with Tick Marks
  const ring3Geo = new THREE.RingGeometry(26, 27.5, 64);
  const ring3Mat = new THREE.MeshBasicMaterial({
    color: 0x00f2ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7
  });
  const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
  reactorGroup.add(ring3);

  // Outer Tick Marks Group
  const ticksGroup = new THREE.Group();
  for (let i = 0; i < 36; i++) {
    const tickGeo = new THREE.BufferGeometry();
    const angle = (i / 36) * Math.PI * 2;
    const len = i % 9 === 0 ? 3.5 : 1.8;
    const pts = [
      new THREE.Vector3(Math.cos(angle) * 27.5, Math.sin(angle) * 27.5, 0),
      new THREE.Vector3(Math.cos(angle) * (27.5 + len), Math.sin(angle) * (27.5 + len), 0)
    ];
    tickGeo.setFromPoints(pts);
    const tickLine = new THREE.Line(tickGeo, new THREE.LineBasicMaterial({
      color: i % 9 === 0 ? 0xf59e0b : 0x00f2ff,
      transparent: true,
      opacity: 0.75
    }));
    ticksGroup.add(tickLine);
  }
  reactorGroup.add(ticksGroup);

  // Gyroscopic 3D Gimbal Rings (Rotating around X and Y)
  const gimbal1Geo = new THREE.RingGeometry(33, 34, 64);
  const gimbal1Mat = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5
  });
  const gimbal1 = new THREE.Mesh(gimbal1Geo, gimbal1Mat);
  reactorGroup.add(gimbal1);

  const gimbal2Geo = new THREE.RingGeometry(38, 39, 64);
  const gimbal2Mat = new THREE.MeshBasicMaterial({
    color: 0x00f2ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.45
  });
  const gimbal2 = new THREE.Mesh(gimbal2Geo, gimbal2Mat);
  reactorGroup.add(gimbal2);

  // Ambient Core Energy Particles
  const pCount = 160;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const r = 10 + Math.random() * 26;
    pPos[i * 3] = Math.cos(theta) * r;
    pPos[i * 3 + 1] = Math.sin(theta) * r;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0x00f2ff,
    size: 1.8,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });
  const coreParticles = new THREE.Points(pGeo, pMat);
  reactorGroup.add(coreParticles);

  // ============================================================
  // 4. 3D ROBOTIC MECH AVATAR (LOWER STAGE ON CYBER-PEDESTAL)
  // ============================================================
  const avatarGroup = new THREE.Group();
  avatarGroup.position.set(0, -22, 0);
  stageGroup.add(avatarGroup);

  // Cyber-Pedestal Base
  const pedestalGeo = new THREE.CylinderGeometry(26, 30, 4, 32);
  const pedestalMat = new THREE.MeshBasicMaterial({
    color: 0x0a192f,
    wireframe: true,
    transparent: true,
    opacity: 0.6
  });
  const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestal.position.y = -22;
  avatarGroup.add(pedestal);

  // Glowing Pedestal Energy Rim
  const rimGeo = new THREE.RingGeometry(26.5, 29.5, 32);
  const rimMat = new THREE.MeshBasicMaterial({
    color: 0x00f2ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.y = -20;
  avatarGroup.add(rimMesh);

  // Pedestal Holographic Grid Ring
  const pGridGeo = new THREE.RingGeometry(16, 24, 24);
  const pGridMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5
  });
  const pGridMesh = new THREE.Mesh(pGridGeo, pGridMat);
  pGridMesh.rotation.x = Math.PI / 2;
  pGridMesh.position.y = -19.8;
  avatarGroup.add(pGridMesh);

  // Mech Robot Body Assembly
  const mechGroup = new THREE.Group();
  avatarGroup.add(mechGroup);

  // Shared Cyber Armor Materials
  const armorMat = new THREE.MeshBasicMaterial({
    color: 0x0f2338,
    wireframe: false,
    transparent: true,
    opacity: 0.85
  });
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x00f2ff,
    wireframe: true,
    transparent: true,
    opacity: 0.6
  });
  const neonCyanMat = new THREE.MeshBasicMaterial({
    color: 0x00f2ff,
    transparent: true,
    opacity: 0.95
  });
  const goldAccentMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.85
  });

  // Torso / Chest Plate
  const torsoGeo = new THREE.BoxGeometry(16, 18, 10);
  const torsoMesh = new THREE.Mesh(torsoGeo, armorMat);
  torsoMesh.position.y = -4;
  mechGroup.add(torsoMesh);

  const torsoWire = new THREE.Mesh(torsoGeo, wireMat);
  torsoWire.position.y = -4;
  mechGroup.add(torsoWire);

  // Chest Mini Arc Reactor
  const chestCoreGeo = new THREE.CylinderGeometry(3.2, 3.2, 1.5, 16);
  chestCoreGeo.rotateX(Math.PI / 2);
  const chestCore = new THREE.Mesh(chestCoreGeo, neonCyanMat);
  chestCore.position.set(0, -1.5, 5);
  mechGroup.add(chestCore);

  // Chest Reactor Outer Ring
  const chestRingGeo = new THREE.RingGeometry(3.6, 4.4, 16);
  const chestRing = new THREE.Mesh(chestRingGeo, goldAccentMat);
  chestRing.position.set(0, -1.5, 5.8);
  mechGroup.add(chestRing);

  // Shoulder Armor (Left & Right)
  const shoulderGeo = new THREE.BoxGeometry(7, 6, 8);

  const leftShoulder = new THREE.Mesh(shoulderGeo, armorMat);
  leftShoulder.position.set(-12, 3, 0);
  mechGroup.add(leftShoulder);
  const leftShoulderWire = new THREE.Mesh(shoulderGeo, wireMat);
  leftShoulderWire.position.set(-12, 3, 0);
  mechGroup.add(leftShoulderWire);

  const rightShoulder = new THREE.Mesh(shoulderGeo, armorMat);
  rightShoulder.position.set(12, 3, 0);
  mechGroup.add(rightShoulder);
  const rightShoulderWire = new THREE.Mesh(shoulderGeo, wireMat);
  rightShoulderWire.position.set(12, 3, 0);
  mechGroup.add(rightShoulderWire);

  // Bicep / Arms (Tactical Guardian Stance)
  const armGeo = new THREE.CylinderGeometry(2, 1.8, 14, 8);
  const leftArm = new THREE.Mesh(armGeo, armorMat);
  leftArm.position.set(-13, -7, 0);
  leftArm.rotation.z = 0.15;
  mechGroup.add(leftArm);
  const leftArmWire = new THREE.Mesh(armGeo, wireMat);
  leftArmWire.position.set(-13, -7, 0);
  leftArmWire.rotation.z = 0.15;
  mechGroup.add(leftArmWire);

  const rightArm = new THREE.Mesh(armGeo, armorMat);
  rightArm.position.set(13, -7, 0);
  rightArm.rotation.z = -0.15;
  mechGroup.add(rightArm);
  const rightArmWire = new THREE.Mesh(armGeo, wireMat);
  rightArmWire.position.set(13, -7, 0);
  rightArmWire.rotation.z = -0.15;
  mechGroup.add(rightArmWire);

  // Mech Head / Helmet Group (Tracks Cursor)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 9.5, 0);
  mechGroup.add(headGroup);

  // Helmet Core
  const helmetGeo = new THREE.BoxGeometry(9, 9.5, 8.5);
  const helmetMesh = new THREE.Mesh(helmetGeo, armorMat);
  headGroup.add(helmetMesh);
  const helmetWire = new THREE.Mesh(helmetGeo, wireMat);
  headGroup.add(helmetWire);

  // Helmet Cheek Guards (Angular V-Shape)
  const cheekGeo = new THREE.ConeGeometry(2, 6, 4);
  const leftCheek = new THREE.Mesh(cheekGeo, goldAccentMat);
  leftCheek.position.set(-4.5, -2, 3);
  leftCheek.rotation.z = -0.4;
  headGroup.add(leftCheek);

  const rightCheek = new THREE.Mesh(cheekGeo, goldAccentMat);
  rightCheek.position.set(4.5, -2, 3);
  rightCheek.rotation.z = 0.4;
  headGroup.add(rightCheek);

  // Visor (Glowing Cyan Optical Slit)
  const visorGeo = new THREE.BoxGeometry(7.2, 1.8, 2.2);
  const visorMesh = new THREE.Mesh(visorGeo, neonCyanMat);
  visorMesh.position.set(0, 0.8, 4.2);
  headGroup.add(visorMesh);

  // Floating Data Sparks / Holographic Dust
  const dustCount = 80;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 60;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 80;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 1.5,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  const holoDust = new THREE.Points(dustGeo, dustMat);
  stageGroup.add(holoDust);

  // ============================================================
  // 5. AUDIO-REACTIVE & CURSOR TRACKING STATE
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
    targetLookX = mouseX * 0.4;
    targetLookY = -mouseY * 0.25;
  });

  // Global pulse trigger callable from audio player
  window.triggerCorePulse = function(intensity = 0.9) {
    targetPulse = Math.max(targetPulse, intensity);
  };

  // Click to emit shockwave
  if (orbViewport) {
    orbViewport.addEventListener('click', () => {
      targetPulse = 1.0;
    });
  }

  // ============================================================
  // 6. MAIN ANIMATION LOOP
  // ============================================================
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // Check if TRI AI assistant is currently speaking
    const isSpeaking = window.triAIIsSpeaking || false;
    if (isSpeaking) {
      // Modulate speech frequency
      targetPulse = 0.5 + Math.sin(time * 14) * 0.35 + Math.cos(time * 22) * 0.15;
    } else {
      targetPulse *= 0.92; // Decay
    }

    audioPulse += (targetPulse - audioPulse) * 0.18;

    // Head Visor Tracking
    headGroup.rotation.y += (targetLookX - headGroup.rotation.y) * 0.08;
    headGroup.rotation.x += (targetLookY - headGroup.rotation.x) * 0.08;

    // Stage Parallax
    stageGroup.rotation.y += (targetLookX * 0.3 - stageGroup.rotation.y) * 0.05;
    stageGroup.rotation.x += (targetLookY * 0.2 - stageGroup.rotation.x) * 0.05;

    // Mech Breathing Idle Motion
    const breath = Math.sin(time * 1.8) * 0.8;
    mechGroup.position.y = breath;
    shoulderGeo.parameters.height = 6 + breath * 0.2;

    // Arc Reactor Core Rotations
    coreMesh.rotation.y += 0.015;
    coreMesh.rotation.x -= 0.01;
    ring1.rotation.z += 0.018;
    spokesGroup.rotation.z += 0.018;
    ring2.rotation.z -= 0.024; // Counter-rotating gear
    ring3.rotation.z += 0.006;
    ticksGroup.rotation.z += 0.006;

    // Gimbal 3D rotations
    gimbal1.rotation.x = Math.PI / 3 + Math.sin(time * 0.8) * 0.2;
    gimbal1.rotation.y += 0.01;
    gimbal2.rotation.y = Math.PI / 4 + Math.cos(time * 0.7) * 0.2;
    gimbal2.rotation.x += 0.008;

    // Audio-Reactive Scale & Glow Expansion
    const coreScale = 1.0 + audioPulse * 0.35;
    coreMesh.scale.set(coreScale, coreScale, coreScale);
    glowMesh.scale.set(coreScale * 1.1, coreScale * 1.1, coreScale * 1.1);
    chestCore.scale.set(1.0 + audioPulse * 0.4, 1.0 + audioPulse * 0.4, 1.0 + audioPulse * 0.4);

    // Dynamic Opacity / Flare
    glowMat.opacity = 0.7 + audioPulse * 0.3;
    visorMesh.material.opacity = 0.85 + audioPulse * 0.15;

    // Pedestal Rim Rotation
    rimMesh.rotation.z += 0.008;
    pGridMesh.rotation.z -= 0.012;

    // Holographic Dust Float
    holoDust.rotation.y += 0.002;
    coreParticles.rotation.z += 0.005;

    renderer.render(scene, camera);
  }

  animate();
})();
