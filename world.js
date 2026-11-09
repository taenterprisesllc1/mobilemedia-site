/* ============================================================
   WORLD — the live 3D drone flying over the background footage
   ------------------------------------------------------------
   The landscape is real video (see BACKGROUNDS in script.js). This file
   draws only the drone, on a transparent layer on top, and lights it to
   match each page's footage so it sits naturally in the shot.

   • Edit PAGES below to change the drone's position and the lighting per page.
   • Drop a licensed model at assets/models/drone.glb to replace the
     built-in drone automatically.
   • Reads window.FLIGHT (set by script.js) to know where you are.
   ============================================================ */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/* drone: [x, y, z, rotX, rotY, rotZ, scale] — x>0 = right side of screen; rotY<0 noses toward the left.
   sky/ground: colors reflected on the drone. sun: light color, strength and direction [x, y, z] (z<0 = sun behind the shot).
   sparkle: amount of gold light specks in the air. */
const PAGES = [
  /* Austin golden  */ { drone: [1.95, 0.1, 0.2, 0.14, -0.55, 0.02, 1.05], sky: "#c9b8a0", ground: "#5e5040", sun: "#ffc078", sunInt: 2.8, sunDir: [0.75, 0.25, -0.6], exposure: 0.78, sparkle: 0.3 },
  /* LA coastline   */ { drone: [-1.7, 0.2, -0.4, 0.12, 0.7, -0.1, 0.9], sky: "#b0c8d8", ground: "#8a8270", sun: "#fff0e0", sunInt: 2.6, sunDir: [0.5, 0.5, -0.6], exposure: 0.8, sparkle: 0.2 },
  /* Miami          */ { drone: [2.2, 0.15, 0, 0.12, -0.62, 0.02, 1.0], sky: "#8cc0f0", ground: "#b0b8b8", sun: "#ffffff", sunInt: 2.8, sunDir: [0.5, 0.8, -0.2], exposure: 0.8, sparkle: 1.0 },
  /* Scottsdale     */ { drone: [-1.85, 0.55, -0.5, 0.2, 0.9, 0, 0.9], sky: "#8fc0ea", ground: "#a08060", sun: "#ffd9a0", sunInt: 2.6, sunDir: [-0.7, 0.35, -0.5], exposure: 0.8, sparkle: 0.4 },
  /* Breckenridge   */ { drone: [2.3, 0.5, 0.2, 0.4, -0.3, 0, 0.92], sky: "#a8c0dc", ground: "#d8dee6", sun: "#ffffff", sunInt: 2.6, sunDir: [0.4, 0.6, -0.5], exposure: 0.8, sparkle: 0.6 },
  /* New Mexico     */ { drone: [-1.55, 0.3, -0.3, 0.1, 0.85, 0.08, 0.92], sky: "#8fb8ea", ground: "#8a7a60", sun: "#fffaf0", sunInt: 2.6, sunDir: [0.5, 0.7, -0.4], exposure: 0.8, sparkle: 0.1 },
  /* Hill Country   */ { drone: [2.45, 0.15, 0.3, 0.18, -0.5, 0, 0.98], sky: "#9cc8ee", ground: "#3e7a6a", sun: "#fffaf0", sunInt: 2.8, sunDir: [0.4, 0.8, -0.4], exposure: 0.8, sparkle: 0.9 },
];

function init() {
  const canvas = document.getElementById("world");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = () => innerWidth <= 900;
  const portrait = () => innerWidth / innerHeight < 0.9;
  const n = PAGES.length;
  // Add ?drone-preview to the address to see the drone up close (front three-quarter view)
  const PREVIEW = new URLSearchParams(location.search).has("drone-preview") ? [0.4, 0.55, 3.4, -0.1, -0.5, 0, 1] : null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    console.warn("3D drone unavailable.", e);
    return;
  }
  let dpr = Math.min(devicePixelRatio, mobile() ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 200);
  const K = PAGES.map((p) => ({ ...p, sky: new THREE.Color(p.sky), ground: new THREE.Color(p.ground), sun: new THREE.Color(p.sun), sunDir: new THREE.Vector3(...p.sunDir).normalize() }));

  /* ---------- Reflections that match the footage ---------- */
  const envU = { top: { value: new THREE.Color() }, ground: { value: new THREE.Color() }, sun: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() } };
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
    uniforms: envU, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 ground; uniform vec3 sun; uniform vec3 sunDir; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir);
        vec3 horizon = mix(top, vec3(1.0), 0.45);
        vec3 col = d.y > 0.0 ? mix(horizon, top, smoothstep(0.0, 0.6, d.y)) : mix(horizon, ground, smoothstep(0.0, 0.25, -d.y));
        col += sun * pow(max(dot(d, normalize(sunDir)), 0.0), 60.0) * 6.0;
        gl_FragColor = vec4(col, 1.0); }`,
  })));
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null, envAt = -99;
  const refreshEnv = (sp) => {
    if (Math.abs(sp - envAt) < 0.1) return;
    const next = pmrem.fromScene(envScene, 0, 0.1, 200);
    scene.environment = next.texture;
    if (envRT) envRT.dispose();
    envRT = next; envAt = sp;
  };

  /* ---------- Lights ---------- */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  const key = new THREE.DirectionalLight(0xffffff, 1.0);     // soft front fill so the drone reads clearly
  const rim = new THREE.DirectionalLight(0xd4a849, 1.4);     // Mobile Media gold edge light
  scene.add(hemi, sun, key, rim);

  /* ---------- Gold light specks drifting in the air ---------- */
  const dotTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.3, "rgba(255,255,255,.7)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const SPECKS = mobile() ? 160 : 320;
  const sPos = new Float32Array(SPECKS * 3), sSeed = new Float32Array(SPECKS);
  for (let i = 0; i < SPECKS; i++) {
    sPos.set([(Math.random() * 2 - 1) * 9, (Math.random() * 2 - 1) * 5, -12 + Math.random() * 15], i * 3);
    sSeed[i] = Math.random() * 100;
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
  const sMat = new THREE.PointsMaterial({ size: 0.06, map: dotTex, color: 0xf3cf7a, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending });
  const specks = new THREE.Points(sGeo, sMat);
  specks.frustumCulled = false;
  scene.add(specks);

  /* ---------- Drone: DJI Air 3S look-alike ---------- */
  const mesh = (geo, mat, pos, rot) => { const m = new THREE.Mesh(geo, mat); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); return m; };
  const between = (a, b, r1, r2, mat) => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, dir.length(), 24), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return m;
  };
  /* Modeled after the DJI Air 3S: cool-gray body, black forward-vision visor across the
     nose, dual-camera gimbal (tele lens above wide lens) hanging under the nose, front arms
     angled forward with long landing legs and green nav lights, dark props with orange tips.
     (No logos or lettering are included.) */
  function buildDrone() {
    const g = new THREE.Group();
    const gray = new THREE.MeshPhysicalMaterial({ color: 0x737880, roughness: 0.5, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.6, sheen: 0.3, sheenColor: new THREE.Color(0xc9d0da) });
    const grayLight = new THREE.MeshPhysicalMaterial({ color: 0x7d828a, roughness: 0.5, metalness: 0, clearcoat: 0.25 });
    const grayDark = new THREE.MeshStandardMaterial({ color: 0x5c6168, roughness: 0.6, metalness: 0.05 });
    const visor = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0e, roughness: 0.12, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide });
    const gimbalMat = new THREE.MeshStandardMaterial({ color: 0x232529, roughness: 0.5, metalness: 0.25 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x3b3e43, roughness: 0.35, metalness: 0.6 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x1a1d16, roughness: 0.03, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0.8, iridescenceIOR: 1.6, iridescenceThicknessRange: [250, 700] });
    const lensGlass = new THREE.MeshPhysicalMaterial({ color: 0x0c1012, roughness: 0.02, metalness: 0.3, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.7 });
    const motorMat = new THREE.MeshStandardMaterial({ color: 0x2c2e32, roughness: 0.35, metalness: 0.7 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.4, metalness: 0.1, side: THREE.DoubleSide });
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xe8743a, roughness: 0.45, side: THREE.DoubleSide });
    const navGreen = new THREE.MeshStandardMaterial({ color: 0x4dff8a, emissive: 0x34ff78, emissiveIntensity: 2.2 });

    // Fuselage: long rounded body, swollen nose, battery hump on top
    const body = mesh(new THREE.CapsuleGeometry(0.36, 0.72, 16, 40), gray, [0, 0, -0.05], [Math.PI / 2, 0, 0]);
    body.scale.set(1.12, 1, 0.6);
    const nose = mesh(new THREE.SphereGeometry(0.4, 48, 32), gray, [0, 0.07, 0.48]);
    nose.scale.set(1.04, 0.66, 0.78);
    const hump = mesh(new THREE.CapsuleGeometry(0.27, 0.62, 12, 32), grayLight, [0, 0.17, -0.28], [Math.PI / 2, 0, 0]);
    hump.scale.set(1.08, 1, 0.5);
    const belly = mesh(new THREE.CapsuleGeometry(0.3, 0.7, 10, 28), grayDark, [0, -0.1, -0.2], [Math.PI / 2, 0, 0]);
    belly.scale.set(1.05, 1, 0.42);
    g.add(body, nose, hump, belly);

    // Black forward-vision visor wrapping the nose, with sensors at each end and on top
    const band = mesh(new THREE.CylinderGeometry(0.405, 0.405, 0.11, 48, 1, true, -1.15, 2.3), visor, [0, 0.15, 0.48], [-0.12, 0, 0]);
    band.scale.set(1.04, 1, 0.8);
    g.add(band);
    for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.045, 20, 14), glass, [s * 0.375, 0.15, 0.62]));
    g.add(mesh(new THREE.SphereGeometry(0.06, 24, 16), glass, [0.2, 0.25, 0.66]));
    g.add(mesh(new THREE.TorusGeometry(0.062, 0.012, 10, 32), grayDark, [0.2, 0.25, 0.665], [-0.5, 0, 0]));

    // Gimbal: pan stem, camera block, roll motor on the right, tele lens over wide lens
    const gimbal = new THREE.Group();
    gimbal.position.set(0, -0.08, 0.66);
    gimbal.add(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 24), gimbalMat, [0, 0.0, -0.04]));
    const block = new THREE.Group();
    block.position.set(0, -0.17, 0.1);
    block.add(mesh(new RoundedBoxGeometry(0.34, 0.42, 0.3, 5, 0.07), gimbalMat));
    block.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 32), gimbalMat, [0.2, 0.0, -0.04], [0, 0, Math.PI / 2]));
    block.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.11, 28), frameMat, [0.2, 0.0, -0.04], [0, 0, Math.PI / 2]));
    for (const [y, w, h, r] of [[0.1, 0.2, 0.13, 0.045], [-0.07, 0.24, 0.19, 0.068]]) {
      block.add(mesh(new RoundedBoxGeometry(w, h, 0.03, 3, 0.012), frameMat, [-0.01, y, 0.16]));
      block.add(mesh(new RoundedBoxGeometry(w - 0.03, h - 0.03, 0.01, 2, 0.006), glass, [-0.01, y, 0.176]));
      block.add(mesh(new THREE.CylinderGeometry(r, r, 0.02, 40), lensGlass, [-0.01, y, 0.182], [Math.PI / 2, 0, 0]));
      block.add(mesh(new THREE.TorusGeometry(r, 0.006, 8, 40), frameMat, [-0.01, y, 0.19]));
    }
    gimbal.add(block);
    g.add(gimbal);
    // dark recess under the nose that the gimbal sits in
    const recess = mesh(new THREE.SphereGeometry(0.26, 32, 20), gimbalMat, [0, -0.08, 0.55]);
    recess.scale.set(1.1, 0.45, 0.9);
    g.add(recess);

    // Propeller blade outline (plan view), with orange tip
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, -0.03);
    bladeShape.bezierCurveTo(0.18, -0.06, 0.42, -0.05, 0.62, -0.015);
    bladeShape.lineTo(0.63, 0.012);
    bladeShape.bezierCurveTo(0.42, 0.035, 0.18, 0.05, 0, 0.03);
    bladeShape.closePath();
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.008, bevelEnabled: false });
    bladeGeo.rotateX(Math.PI / 2);
    const tipShape = new THREE.Shape();
    tipShape.moveTo(0.56, -0.026); tipShape.lineTo(0.62, -0.015); tipShape.lineTo(0.63, 0.012); tipShape.lineTo(0.56, 0.022); tipShape.closePath();
    const tipGeo = new THREE.ExtrudeGeometry(tipShape, { depth: 0.01, bevelEnabled: false });
    tipGeo.rotateX(Math.PI / 2);

    const props = [];
    const arms = [
      { from: [0.34, 0.02, 0.32], to: [1.22, 0.14, 0.78], front: true },
      { from: [-0.34, 0.02, 0.32], to: [-1.22, 0.14, 0.78], front: true },
      { from: [0.3, -0.1, -0.5], to: [1.12, -0.04, -1.02], front: false },
      { from: [-0.3, -0.1, -0.5], to: [-1.12, -0.04, -1.02], front: false },
    ];
    arms.forEach((a, k) => {
      const B = new THREE.Vector3(...a.to);
      const arm = between(new THREE.Vector3(...a.from), B, 0.05, 0.07, gray);
      arm.scale.z = 0.8;
      g.add(arm);
      const motor = new THREE.Group();
      motor.position.copy(B);
      motor.add(mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.1, 36), grayLight, [0, -0.05, 0]));          // mount
      motor.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.11, 40), motorMat, [0, 0.05, 0]));            // bell
      motor.add(mesh(new THREE.TorusGeometry(0.12, 0.008, 8, 40), frameMat, [0, 0.105, 0], [Math.PI / 2, 0, 0]));
      const sx = Math.sign(a.to[0]);
      if (a.front) {
        // Long tapered landing leg + green nav light on its outer face
        motor.add(between(new THREE.Vector3(0, -0.08, 0), new THREE.Vector3(sx * 0.03, -0.8, -0.06), 0.055, 0.03, gray));
        const led = mesh(new RoundedBoxGeometry(0.05, 0.1, 0.03, 2, 0.012), navGreen, [sx * 0.05, -0.2, 0.035], [0, sx * 0.6, 0]);
        motor.add(led);
      } else {
        motor.add(between(new THREE.Vector3(0, -0.08, 0), new THREE.Vector3(0, -0.36, 0.05), 0.045, 0.03, gray));
      }
      const prop = new THREE.Group();
      prop.position.y = 0.13;
      for (const b of [0, Math.PI]) {
        const blade = new THREE.Group();
        blade.rotation.y = b;
        const bl = mesh(bladeGeo, propMat, [0.04, 0, 0], [0.1, 0, 0]);
        const tp = mesh(tipGeo, tipMat, [0.04, 0.001, 0], [0.1, 0, 0]);
        blade.add(bl, tp);
        prop.add(blade);
      }
      prop.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.04, 20), motorMat));
      const blur = new THREE.Mesh(new THREE.CircleGeometry(0.67, 48), new THREE.MeshBasicMaterial({ color: 0x8a9099, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide }));
      blur.rotation.x = -Math.PI / 2;
      prop.add(blur);
      prop.userData.dir = k % 3 === 0 ? 1 : -1;
      props.push(prop);
      motor.add(prop);
      g.add(motor);
    });
    g.position.y = 0.15;
    g.userData = { props, gimbal };
    return g;
  }
  const droneRig = new THREE.Group();
  const drone = buildDrone();
  droneRig.add(drone);
  scene.add(droneRig);
  key.target = droneRig; rim.target = droneRig; sun.target = droneRig;

  fetch("assets/models/drone.glb", { method: "HEAD" }).then((r) => {
    if (!r.ok) return;
    new GLTFLoader().load("assets/models/drone.glb", (gltf) => {
      const m = gltf.scene;
      const box = new THREE.Box3().setFromObject(m);
      const d = box.getSize(new THREE.Vector3());
      m.scale.setScalar(2.6 / Math.max(d.x, d.y, d.z));
      box.setFromObject(m);
      m.position.sub(box.getCenter(new THREE.Vector3()));
      droneRig.remove(drone);
      droneRig.add(m);
    });
  }).catch(() => {});

  /* ---------- Interaction ---------- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", (e) => { pointer.tx = (e.clientX / innerWidth) * 2 - 1; pointer.ty = -((e.clientY / innerHeight) * 2 - 1); }, { passive: true });
  addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); });

  /* ---------- Per-frame ---------- */
  const lerp = THREE.MathUtils.lerp;
  const adapt = (p) => (!mobile() ? p : [p[0] * 0.3, p[1] * 0.4 + (portrait() ? 1.9 : 1.1), p[2] - 1.4, p[3], p[4] * 0.7, p[5], p[6] * 0.85]);
  const sky = new THREE.Color(), ground = new THREE.Color(), sunC = new THREE.Color(), sunDir = new THREE.Vector3();
  const clock = new THREE.Clock();
  let sp = 0, dolly = 0, bank = 0, prevX = 0, frames = 0, slow = 0;

  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const F = window.FLIGHT || { pos: 0, transition: 0 };

    sp += (F.pos - sp) * (1 - Math.exp(-dt * 5));
    const i0 = Math.min(n - 1, Math.max(0, Math.floor(sp)));
    const i1 = Math.min(n - 1, i0 + 1);
    const f = THREE.MathUtils.clamp(sp - i0, 0, 1);
    const a = K[i0], b = K[i1];

    // Match the footage's light
    sky.lerpColors(a.sky, b.sky, f); ground.lerpColors(a.ground, b.ground, f); sunC.lerpColors(a.sun, b.sun, f);
    sunDir.copy(a.sunDir).lerp(b.sunDir, f).normalize();
    envU.top.value.copy(sky); envU.ground.value.copy(ground); envU.sun.value.copy(sunC); envU.sunDir.value.copy(sunDir);
    refreshEnv(sp);
    hemi.color.copy(sky); hemi.groundColor.copy(ground);
    sun.color.copy(sunC); sun.intensity = lerp(a.sunInt, b.sunInt, f);
    renderer.toneMappingExposure = lerp(a.exposure, b.exposure, f);
    sMat.opacity = lerp(a.sparkle, b.sparkle, f) * 0.75;

    // The drone surges forward into the shot during each page change
    const targetDolly = reduce ? 0 : Math.sin(Math.PI * (F.transition || 0));
    dolly += (targetDolly - dolly) * (1 - Math.exp(-dt * 8));
    pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 3));
    pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 3));
    camera.position.set(pointer.x * 0.35, 0.5 + pointer.y * 0.2, portrait() ? 10.5 : 8);
    camera.lookAt(0, 0, 0);
    camera.fov = portrait() ? 42 : 35;
    camera.updateProjectionMatrix();

    const A = adapt(a.drone), B = adapt(b.drone);
    const v = PREVIEW ? PREVIEW : A.map((x, i) => lerp(x, B[i], f));
    droneRig.position.set(v[0], v[1] - dolly * 0.3, v[2] - dolly * 3.2);
    droneRig.rotation.set(v[3], v[4], v[5]);
    droneRig.scale.setScalar(v[6]);
    const vx = (droneRig.position.x - prevX) / Math.max(dt, 0.001);
    prevX = droneRig.position.x;
    bank += (THREE.MathUtils.clamp(-vx * 0.12, -0.5, 0.5) - bank) * (1 - Math.exp(-dt * 4));
    if (!reduce) {
      droneRig.position.y += Math.sin(t * 1.4) * 0.06;
      droneRig.rotation.z += Math.sin(t * 1.1) * 0.025 + bank;
      droneRig.rotation.x += Math.sin(t * 0.8) * 0.02 + dolly * 0.3 + Math.abs(bank) * 0.2;
    }
    droneRig.rotation.y += pointer.x * 0.18;
    droneRig.rotation.x -= pointer.y * 0.08;
    drone.userData.props.forEach((p) => (p.rotation.y += dt * 26 * p.userData.dir));
    drone.userData.gimbal.rotation.x = 0.12 + Math.sin(t * 0.5) * 0.06 - pointer.y * 0.15;
    drone.userData.gimbal.rotation.y = pointer.x * 0.25;

    sun.position.copy(droneRig.position).addScaledVector(sunDir, 20);
    key.position.copy(camera.position).add(new THREE.Vector3(2.5, 3, 2));
    rim.position.copy(droneRig.position).add(new THREE.Vector3(-4, 2.5, -5));

    // Gold specks drift and stream past during page changes
    if (!reduce) {
      for (let i = 0; i < SPECKS; i++) {
        const j = i * 3;
        sPos[j] += Math.sin(t * 0.3 + sSeed[i]) * 0.003;
        sPos[j + 1] += Math.cos(t * 0.25 + sSeed[i]) * 0.002 + 0.002;
        sPos[j + 2] += dt * (0.15 + dolly * 9);
        if (sPos[j + 2] > 4) sPos[j + 2] = -12;
        if (sPos[j + 1] > 5) sPos[j + 1] = -5;
      }
      sGeo.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);

    frames++;
    if (dt > 0.034) slow++;
    if (frames === 90) {
      if (slow > 45 && dpr > 1) { dpr = 1; renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false); }
      frames = slow = 0;
    }
    if (!canvas.classList.contains("is-ready")) canvas.classList.add("is-ready");
  }
  frame();
}

init();
