// ============================================================
// TRI AI - JARVIS 3D HOLOGRAPHIC NEURAL MINDMAP (Three.js WebGL)
// True 3D Synaptic Constellation, Fiber-Optic Data Flow,
// Audio-Reactive Quantum Core & Full 360° Interactive Orbit
// ============================================================

(function() {
  const canvas = document.getElementById('mindmapCanvas');
  if (!canvas || !window.THREE) return;

  // 1. SCENE, CAMERA, RENDERER
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / (canvas.clientHeight || 1), 0.1, 1000);
  camera.position.set(0, 15, 145);
  camera.lookAt(0, 0, 0);

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
  window.addEventListener('tabswitched', () => setTimeout(resize, 60));
  setTimeout(resize, 100);

  // 2. CINEMATIC 3D LIGHTING
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0x00f2ff, 1.4);
  keyLight.position.set(40, 60, 50);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xa855f7, 1.1);
  fillLight.position.set(-40, -40, 40);
  scene.add(fillLight);

  // Master Graph Group (Can be rotated 360° by user drag)
  const graphGroup = new THREE.Group();
  scene.add(graphGroup);

  // 3. BACKGROUND 3D HOLOGRAPHIC NEBULA & AMBIENT DATA PARTICLES
  const bgCount = 200;
  const bgGeo = new THREE.BufferGeometry();
  const bgPos = new Float32Array(bgCount * 3);
  for (let i = 0; i < bgCount; i++) {
    bgPos[i * 3] = (Math.random() - 0.5) * 220;
    bgPos[i * 3 + 1] = (Math.random() - 0.5) * 160;
    bgPos[i * 3 + 2] = (Math.random() - 0.5) * 180;
  }
  bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
  const bgMat = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 1.5,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending
  });
  const bgField = new THREE.Points(bgGeo, bgMat);
  scene.add(bgField);

  // Concentric Holographic Floor Orbit Rings
  const floorRing1 = new THREE.Mesh(
    new THREE.RingGeometry(65, 66.5, 64),
    new THREE.MeshBasicMaterial({ color: 0x00f2ff, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
  );
  floorRing1.rotation.x = Math.PI / 2;
  floorRing1.position.y = -35;
  graphGroup.add(floorRing1);

  const floorRing2 = new THREE.Mesh(
    new THREE.RingGeometry(85, 86, 64),
    new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide, transparent: true, opacity: 0.25 })
  );
  floorRing2.rotation.x = Math.PI / 2;
  floorRing2.position.y = -35;
  graphGroup.add(floorRing2);

  // ============================================================
  // 4. NEURAL GRAPH DEFINITION (TRUE 3D COORDINATES)
  // ============================================================
  const nodeDefs = [
    // Central Root
    {
      id: 'root',
      label: 'TRI AI QUANTUM CORE',
      desc: 'সেন্ট্রাল ৩ডি নিউরাল হাব ও সমন্বয়কারী',
      color: 0x00f2ff,
      pos: [0, 0, 0],
      radius: 6.5,
      isRoot: true
    },

    // Cluster 1: Neural Cognition (Upper Left, Cyan/Blue)
    {
      id: 'c1',
      parent: 'root',
      label: 'NEURAL COGNITION',
      desc: 'জ্ঞান ও প্রজ্ঞার নিউরাল ক্লাস্টার',
      color: 0x38bdf8,
      pos: [-38, 24, -14],
      radius: 4.8
    },
    {
      id: 'c1_1',
      parent: 'c1',
      label: 'Memory Buffer',
      desc: 'সিস্টেম দীর্ঘমেয়াদী স্মৃতি ও কনটেক্সট স্টোর',
      color: 0x10b981,
      pos: [-64, 38, -22],
      radius: 3.2
    },
    {
      id: 'c1_2',
      parent: 'c1',
      label: 'Soul & Persona',
      desc: 'TRIDIP স্যারের অনুগত স্নেহশীল ও মার্জিত স্বভাব',
      color: 0xe2e8f0,
      pos: [-62, 14, 8],
      radius: 3.2
    },
    {
      id: 'c1_3',
      parent: 'c1',
      label: 'Context Engine',
      desc: 'রিয়েল-টাইম কথোপকথন প্রসঙ্গ ট্র্যাকার',
      color: 0x818cf8,
      pos: [-48, 44, 12],
      radius: 3.2
    },

    // Cluster 2: Autonomous Agents (Upper Right, Gold/Amber)
    {
      id: 'c2',
      parent: 'root',
      label: 'AGENT DECK',
      desc: '৪টি স্বায়ত্তশাসিত এআই এজেন্ট স্কোয়াড',
      color: 0xf59e0b,
      pos: [38, 24, -14],
      radius: 4.8
    },
    {
      id: 'c2_1',
      parent: 'c2',
      label: 'Alice (Context)',
      desc: 'রিসার্চ ও গভীর কনটেক্সট বিশেষজ্ঞ',
      color: 0xa855f7,
      pos: [64, 38, -22],
      radius: 3.2
    },
    {
      id: 'c2_2',
      parent: 'c2',
      label: 'Bob (Tasks)',
      desc: 'উইন্ডোজ অ্যাপ ও টাস্ক অটোমেশন স্পেশালিস্ট',
      color: 0x10b981,
      pos: [62, 14, 8],
      radius: 3.2
    },
    {
      id: 'c2_3',
      parent: 'c2',
      label: 'Carol (Vision)',
      desc: 'ভিজ্যুয়াল মাইন্ডম্যাপ ও কনসেপ্ট মডেলিং',
      color: 0xfbbf24,
      pos: [48, 44, 12],
      radius: 3.2
    },
    {
      id: 'c2_4',
      parent: 'c2',
      label: 'Dave (Security)',
      desc: 'সিস্টেম সেন্টিনেল ও প্রাইভেসি সিকিউরিটি গার্ড',
      color: 0x00f2ff,
      pos: [58, -4, -12],
      radius: 3.2
    },

    // Cluster 3: Local Intelligence (Lower Left, Neon Violet)
    {
      id: 'c3',
      parent: 'root',
      label: 'LOCAL INTELLIGENCE',
      desc: 'হাই-স্পিড অফলাইন ও ক্লাউড এলপিইউ ইঞ্জিন',
      color: 0xa855f7,
      pos: [-36, -22, 16],
      radius: 4.8
    },
    {
      id: 'c3_1',
      parent: 'c3',
      label: 'Groq 120B LPU',
      desc: 'আল্ট্রা-ফাস্ট ৫০০ms রেসপন্সযুক্ত এলপিইউ ইঞ্জিন',
      color: 0xc084fc,
      pos: [-58, -36, 24],
      radius: 3.2
    },
    {
      id: 'c3_2',
      parent: 'c3',
      label: 'Ollama Offline AI',
      desc: 'ইন্টারনেট ছাড়া ১০০% লোকাল অফলাইন মোড',
      color: 0x818cf8,
      pos: [-56, -14, 36],
      radius: 3.2
    },
    {
      id: 'c3_3',
      parent: 'c3',
      label: 'Local Store JSON',
      desc: 'সম্পূর্ণ এনক্রিপ্টেড লোকাল টাস্ক ও স্টেট ডাটাবেস',
      color: 0x38bdf8,
      pos: [-40, -42, 6],
      radius: 3.2
    },

    // Cluster 4: Multimodal Perception (Lower Right, Rose / Crimson)
    {
      id: 'c4',
      parent: 'root',
      label: 'MULTIMODAL SENSORS',
      desc: 'ভয়েস, ভিশন ও ডেস্কটপ ইন্টারঅ্যাকশন হাব',
      color: 0xec4899,
      pos: [36, -22, 16],
      radius: 4.8
    },
    {
      id: 'c4_1',
      parent: 'c4',
      label: '24kHz Neural TTS',
      desc: 'নবানিতার মিষ্টি ভালোবাসাপূর্ণ মানবসদৃশ বাংলা কণ্ঠ',
      color: 0xf43f5e,
      pos: [58, -36, 24],
      radius: 3.2
    },
    {
      id: 'c4_2',
      parent: 'c4',
      label: 'Bangla STT Input',
      desc: 'বাংলা ও ইংরেজি স্বর শনাক্তকরণ ও রিকগনিশন',
      color: 0xfb7185,
      pos: [56, -14, 36],
      radius: 3.2
    },
    {
      id: 'c4_3',
      parent: 'c4',
      label: 'Screen & Camera',
      desc: 'ডেস্কটপ উইন্ডো ও ওয়েবক্যাম ভিজ্যুয়াল স্ক্যানার',
      color: 0x38bdf8,
      pos: [40, -42, 6],
      radius: 3.2
    }
  ];

  // Helper to create crisp, glowing 3D Holographic Text Sprite
  function makeTextSprite(text, colorHex) {
    const c = document.createElement('canvas');
    c.width = 384;
    c.height = 80;
    const ctx = c.getContext('2d');

    // Holographic Translucent Glass Badge
    ctx.fillStyle = 'rgba(4, 12, 26, 0.75)';
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(10, 10, 364, 60, 12);
    ctx.fill();
    ctx.stroke();

    // Text with Neon Glow
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 24px 'Orbitron', 'Hind Siliguri', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 192, 40);

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.95 });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(16, 3.3, 1);
    return sprite;
  }

  // Build 3D Node Meshes
  const nodesMap = {};
  const interactiveNodes = [];

  nodeDefs.forEach(def => {
    const nodeGroup = new THREE.Group();
    nodeGroup.position.set(...def.pos);
    nodeGroup.userData = def;

    // 1. Central Crystalline Sphere
    const geo = def.isRoot
      ? new THREE.OctahedronGeometry(def.radius, 2)
      : new THREE.IcosahedronGeometry(def.radius, 1);

    const mat = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.18,
      metalness: 0.92,
      envMapIntensity: 1.5,
      wireframe: false
    });
    const coreMesh = new THREE.Mesh(geo, mat);
    nodeGroup.add(coreMesh);

    // 2. Outer Wireframe Halo
    const haloGeo = def.isRoot
      ? new THREE.OctahedronGeometry(def.radius * 1.35, 1)
      : new THREE.IcosahedronGeometry(def.radius * 1.3, 1);
    const haloMat = new THREE.MeshBasicMaterial({
      color: def.color,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    nodeGroup.add(haloMesh);

    // 3. Inner Glowing Core Light
    const nodeLight = new THREE.PointLight(def.color, def.isRoot ? 2.8 : 1.4, def.radius * 8);
    nodeGroup.add(nodeLight);

    // 4. Floating Holographic Billboard Label
    const hexColorStr = '#' + new THREE.Color(def.color).getHexString();
    const labelSprite = makeTextSprite(def.label, hexColorStr);
    labelSprite.position.set(0, def.radius + 3.8, 0);
    nodeGroup.add(labelSprite);

    graphGroup.add(nodeGroup);

    nodesMap[def.id] = {
      group: nodeGroup,
      core: coreMesh,
      halo: haloMesh,
      light: nodeLight,
      data: def
    };
    interactiveNodes.push(coreMesh);
  });

  // ============================================================
  // 5. FIBER-OPTIC SYNAPTIC CONDUITS & TRAVELING DATA PHOTONS
  // ============================================================
  const synapticLines = [];
  const photons = [];

  nodeDefs.forEach(def => {
    if (def.parent && nodesMap[def.parent]) {
      const parentNode = nodesMap[def.parent];
      const p1 = new THREE.Vector3(...parentNode.data.pos);
      const p2 = new THREE.Vector3(...def.pos);

      // Synapse Laser Line
      const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const lineMat = new THREE.LineBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.45,
        linewidth: 1.5
      });
      const line = new THREE.Line(lineGeo, lineMat);
      graphGroup.add(line);
      synapticLines.push(line);

      // Traveling Data Photon Particle
      const photonGeo = new THREE.SphereGeometry(0.85, 8, 8);
      const photonMat = new THREE.MeshBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.95
      });
      const photon = new THREE.Mesh(photonGeo, photonMat);
      graphGroup.add(photon);

      photons.push({
        mesh: photon,
        start: p1,
        end: p2,
        progress: Math.random(),
        speed: 0.35 + Math.random() * 0.25
      });
    }
  });

  // ============================================================
  // 6. INTERACTIVE 3D ORBIT, ROTATION, ZOOM & SELECTION
  // ============================================================
  let isDragging = false;
  let prevMouseX = 0;
  let prevMouseY = 0;
  let rotSpeedX = 0;
  let rotSpeedY = 0;
  let targetRotX = 0;
  let targetRotY = 0;
  let currentZoom = 145;
  let targetZoom = 145;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-999, -999);
  let hoveredNodeObj = null;

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (isDragging) {
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      targetRotY += deltaX * 0.008;
      targetRotX += deltaY * 0.008;
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    targetZoom += e.deltaY * 0.08;
    targetZoom = Math.max(70, Math.min(220, targetZoom));
  });

  // Click on Node to Inspect & Speak
  canvas.addEventListener('click', () => {
    if (hoveredNodeObj) {
      const data = hoveredNodeObj.data;
      if (window.appendAssistantMessage) {
        window.appendAssistantMessage({
          reasoning: [{ stage: 'নিউরাল মাইন্ডম্যাপ নোড বিশ্লেষণ', detail: `${data.label} নোড সক্রিয় করা হয়েছে।` }],
          reply: `TRIDIP স্যার, আপনি ৩ডি নিউরাল মাইন্ডম্যাপের "${data.label}" নোডটি নির্বাচন করেছেন। এর দায়িত্ব: ${data.desc}।`
        });
      }
      if (window.speakText) {
        window.speakText(`TRIDIP স্যার, এটি ${data.label} নোড। ${data.desc}।`);
      }
    }
  });

  // ============================================================
  // 7. ANIMATION LOOP & AUDIO-REACTIVITY
  // ============================================================
  const clock = new THREE.Clock();
  let audioPulse = 0;

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // Check if TRI AI assistant is speaking
    const isSpeaking = window.triAIIsSpeaking || false;
    const targetPulse = isSpeaking ? (0.5 + Math.sin(time * 16) * 0.4) : 0;
    audioPulse += (targetPulse - audioPulse) * 0.15;

    // Smooth Orbit Rotation
    if (!isDragging) {
      targetRotY += 0.0025; // Gentle constant cinematic spin
    }
    graphGroup.rotation.y += (targetRotY - graphGroup.rotation.y) * 0.08;
    graphGroup.rotation.x += (targetRotX - graphGroup.rotation.x) * 0.08;

    // Smooth Zoom
    currentZoom += (targetZoom - currentZoom) * 0.08;
    camera.position.z = currentZoom;

    // Rotate Central Quantum Core
    const rootNode = nodesMap['root'];
    if (rootNode) {
      rootNode.core.rotation.y += 0.015;
      rootNode.core.rotation.x -= 0.008;
      rootNode.halo.rotation.z += 0.02;

      // Audio-reactive scale
      const rootScale = 1.0 + audioPulse * 0.35 + Math.sin(time * 2.5) * 0.06;
      rootNode.core.scale.set(rootScale, rootScale, rootScale);
      rootNode.light.intensity = 2.5 + audioPulse * 4.0;
    }

    // Floor Orbit Rings Spin
    floorRing1.rotation.z += 0.004;
    floorRing2.rotation.z -= 0.002;
    bgField.rotation.y += 0.001;

    // Raycast hover detection
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveNodes);

    if (intersects.length > 0) {
      const parent = intersects[0].object.parent;
      hoveredNodeObj = parent ? nodesMap[parent.userData.id] : null;
      canvas.style.cursor = 'pointer';
    } else {
      hoveredNodeObj = null;
      canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
    }

    // Animate Nodes & Halos
    interactiveNodes.forEach(mesh => {
      const parent = mesh.parent;
      if (!parent) return;
      const id = parent.userData.id;
      const nObj = nodesMap[id];
      if (!nObj) return;

      const isHovered = hoveredNodeObj === nObj;
      const targetScale = isHovered ? 1.35 : 1.0;
      mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);

      // Halo spin
      nObj.halo.rotation.y += 0.012;
      nObj.halo.rotation.z += 0.015;
      nObj.light.intensity = isHovered ? 3.0 : 1.2;
    });

    // Animate Traveling Data Photons along Synapses
    photons.forEach(p => {
      p.progress = (p.progress + delta * p.speed) % 1.0;
      p.mesh.position.lerpVectors(p.start, p.end, p.progress);

      // Pulse photon size
      const pPulse = 0.8 + Math.sin(time * 8 + p.progress * 4) * 0.3;
      p.mesh.scale.set(pPulse, pPulse, pPulse);
    });

    renderer.render(scene, camera);
  }

  animate();
})();
