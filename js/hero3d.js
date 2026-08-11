/* ==========================================================================
   ОКТАН — 3D hero: тормозной диск с суппортом.
   Three.js (ESM, CDN). Реагирует на курсор, разбирается по скроллу.
   Отключается на мобильных / без WebGL / при prefers-reduced-motion.
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const mount = document.querySelector('.hero__canvas');
const fallback = document.querySelector('.hero__fallback');

/* ------------------------------------------------------- Guard clauses */
function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const LOW_CPU = (navigator.hardwareConcurrency || 8) <= 4;
const smallMQ = window.matchMedia('(max-width: 768px)');

// Ширина — единственное условие, которое меняется во время жизни страницы,
// поэтому решение пересматриваем на ресайзе. Контейнер не удаляем: иначе
// окно, открытое узким, навсегда лишало бы hero 3D-объекта.
let started = false;

function decide() {
  const ok = mount && webglOK() && !smallMQ.matches && !REDUCED && !LOW_CPU;

  if (ok && !started) {
    started = true;
    if (fallback) fallback.style.display = 'none';
    mount.style.display = '';
    init();
    return;
  }
  // Сцену, которая уже крутится, при сужении окна не сносим — renderer сам
  // подстроится под размер, а повторная инициализация дороже, чем ресайз.
  if (!started) {
    if (mount) mount.style.display = 'none';
    if (fallback) fallback.style.display = 'grid';
  }
}

decide();

if (mount && !started) {
  let t = null;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(decide, 250);
  });
}

/* -------------------------------------------------------------- Scene */
function init() {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 100);
  camera.position.set(0, 0.4, 9.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  mount.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  // HDRI-подобное окружение без внешних файлов — отражения «как в цеху»
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  /* ------------------------------------------------------- Materials */
  const matRotor = new THREE.MeshStandardMaterial({
    color: 0x8d949c, metalness: 1.0, roughness: 0.34
  });
  const matDark = new THREE.MeshStandardMaterial({
    color: 0x2b3037, metalness: 0.9, roughness: 0.55
  });
  const matHub = new THREE.MeshStandardMaterial({
    color: 0xc9ced4, metalness: 1.0, roughness: 0.16
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: 0xff4d0f, metalness: 0.55, roughness: 0.32,
    emissive: 0xff4d0f, emissiveIntensity: 0.22
  });
  const matBolt = new THREE.MeshStandardMaterial({ color: 0xe4e8ec, metalness: 1.0, roughness: 0.22 });

  /* ------------------------------------------------------ Build parts */
  const root = new THREE.Group();
  scene.add(root);

  // Слои-«детали»: у каждой свой вектор разлёта при разборке
  const parts = [];
  const addPart = (mesh, explode) => { mesh.userData.explode = explode; parts.push(mesh); return mesh; };

  // 1. Основной ротор
  const rotor = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.16, 96, 1, false), matRotor);
  rotor.rotation.x = Math.PI / 2;
  const rotorGroup = new THREE.Group();
  rotorGroup.add(rotor);

  // Перфорация: кольца сквозных отверстий (тёмные цилиндры «в толще» диска)
  const holeGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.22, 14);
  [{ r: 1.45, n: 16, o: 0 }, { r: 1.85, n: 20, o: 0.16 }, { r: 2.25, n: 24, o: 0.32 }].forEach(ring => {
    const inst = new THREE.InstancedMesh(holeGeo, new THREE.MeshBasicMaterial({ color: 0x05060a }), ring.n);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < ring.n; i++) {
      const a = (i / ring.n) * Math.PI * 2 + ring.o;
      dummy.position.set(Math.cos(a) * ring.r, 0, Math.sin(a) * ring.r);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    rotor.add(inst);
  });

  // Насечки-канавки на поверхности диска
  const slotGeo = new THREE.BoxGeometry(0.055, 0.2, 0.95);
  for (let i = 0; i < 8; i++) {
    const slot = new THREE.Mesh(slotGeo, new THREE.MeshBasicMaterial({ color: 0x0a0c10 }));
    const a = (i / 8) * Math.PI * 2;
    slot.position.set(Math.cos(a) * 2.0, 0, Math.sin(a) * 2.0);
    slot.rotation.y = -a + Math.PI / 2;
    rotor.add(slot);
  }
  addPart(rotorGroup, new THREE.Vector3(0, 0, -0.55));
  root.add(rotorGroup);

  // 2. Ступица («шляпа» диска)
  const hat = new THREE.Group();
  const hatBody = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.62, 64), matHub);
  hatBody.rotation.x = Math.PI / 2;
  hatBody.position.z = 0.34;
  hat.add(hatBody);

  const centerBore = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 16, 48), matDark);
  centerBore.position.z = 0.64;
  hat.add(centerBore);

  // 5 болтов
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.34, 6), matBolt);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0.72);
    hat.add(bolt);
  }
  addPart(hat, new THREE.Vector3(0, 0, 1.5));
  root.add(hat);

  // 3. Суппорт — акцентный элемент
  const caliper = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.5, 0.95), matAccent);
  const jawGeo = new THREE.BoxGeometry(0.85, 1.5, 0.22);
  const jawA = new THREE.Mesh(jawGeo, matAccent); jawA.position.z = 0.55;
  const jawB = new THREE.Mesh(jawGeo, matAccent); jawB.position.z = -0.55;
  caliper.add(body, jawA, jawB);
  caliper.position.set(2.35, 0.35, 0);
  caliper.rotation.z = -0.28;
  addPart(caliper, new THREE.Vector3(1.9, 0.9, 0));
  root.add(caliper);

  // 4. Внешнее кольцо-обод — тонкая графика вокруг диска
  const halo = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.012, 8, 160), matAccent);
  addPart(halo, new THREE.Vector3(0, 0, -2.2));
  root.add(halo);

  // Второе кольцо под углом — «техническая схема»
  const halo2 = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.008, 8, 160),
    new THREE.MeshBasicMaterial({ color: 0x6c757f }));
  halo2.rotation.x = 0.9;
  addPart(halo2, new THREE.Vector3(0, 0, -3));
  root.add(halo2);

  // Запоминаем исходные позиции для разборки
  parts.forEach(p => { p.userData.home = p.position.clone(); });

  /* ------------------------------------------------------------ Lights */
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(4, 5, 6);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xff4d0f, 3.4);
  rim.position.set(-5, -3, -4);
  scene.add(rim);

  const fill = new THREE.PointLight(0x89a7ff, 12, 22);
  fill.position.set(-4, 3, 3);
  scene.add(fill);

  /* ------------------------------------------------------- Interaction */
  const pointer = { x: 0, y: 0 };
  const eased   = { x: 0, y: 0 };

  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // Прогресс скролла по секции hero → разборка и смена ракурса
  let progress = 0;
  const hero = document.querySelector('.hero');
  const onScroll = () => {
    const r = hero.getBoundingClientRect();
    progress = Math.min(Math.max(-r.top / (r.height || 1), 0), 1);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------- Resize */
  const resize = () => {
    const w = mount.clientWidth, h = mount.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', resize);

  /* --------------------------------------------------- Render loop */
  let running = true;
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();

  // Не жжём GPU, когда вкладка/секция не видны
  const io = new IntersectionObserver(([entry]) => { running = entry.isIntersecting; },
    { threshold: 0 });
  io.observe(hero);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  function tick() {
    requestAnimationFrame(tick);
    if (!running) return;

    const dt = Math.min(clock.getDelta(), 0.05);

    eased.x += (pointer.x - eased.x) * 0.055;
    eased.y += (pointer.y - eased.y) * 0.055;

    // Постоянное вращение + доворот по скроллу
    rotorGroup.rotation.z -= dt * (0.32 + progress * 2.6);
    hat.rotation.z = rotorGroup.rotation.z;
    halo.rotation.z += dt * 0.12;
    halo2.rotation.z -= dt * 0.2;

    // Наклон сцены под курсор
    root.rotation.y = eased.x * 0.42 + progress * 0.55;
    root.rotation.x = eased.y * 0.3 - progress * 0.32;

    // Разборка: детали расходятся по своим векторам
    parts.forEach(p => {
      tmp.copy(p.userData.home).addScaledVector(p.userData.explode, progress);
      p.position.lerp(tmp, 0.12);
    });

    // Камера отъезжает, композиция «дышит»
    camera.position.z = 9.2 + progress * 2.6;
    camera.position.y = 0.4 - eased.y * 0.35;
    camera.position.x = eased.x * 0.5;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  tick();
  resize();
}
