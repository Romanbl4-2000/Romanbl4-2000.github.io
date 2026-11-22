/* 3D для портфолио: ноутбук с записью лендинга и метка на карте со звёздами рейтинга.
   Модели собраны кодом, без загружаемых файлов. Крутятся от прокрутки, мыши и пальца. */
import * as THREE from "./three.module.min.js";

const ACC = 0x5a8ff0, GRAPHITE = 0x262c38, INK = 0xf6f8fd, GOLD = 0xdfe6ff;   // GOLD: звёзды рейтинга, светлый серебристо-голубой

function webglOk() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
  catch (e) { return false; }
}

export function mount(el, opt) {
  if (!webglOk()) return;
  const kind = el.dataset.scene;
  const mobile = opt.mobile, reduce = opt.reduce;
  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1.6, .1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, .55));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xaab3dc, 2.2); rim.position.set(-5, 2, -4); scene.add(rim);

  const model = kind === "pin" ? buildPin(mobile) : buildLaptop(el, mobile, reduce);
  scene.add(model.root);
  camera.position.set(0, model.camY, model.camZ);
  camera.lookAt(0, model.lookY, 0);

  // размер холста: следим за шириной блока, высота задана в CSS
  let w = 0, h = 0;
  function resize() {
    const r = el.getBoundingClientRect();
    if (Math.round(r.width) === w && Math.round(r.height) === h) return;
    w = Math.round(r.width); h = Math.round(r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();
  if ("ResizeObserver" in window) new ResizeObserver(() => { resize(); if (reduce) render(); }).observe(el);

  // управление: прокрутка + мышь + перетаскивание пальцем по горизонтали
  let px = 0, py = 0, dragX = 0, dragging = false, lastX = 0;
  const target = { y: 0, x: 0 }, cur = { y: 0, x: 0 };
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    if (e.pointerType === "mouse") { px = (e.clientX - r.left) / r.width - .5; py = (e.clientY - r.top) / r.height - .5; }
    if (dragging) { dragX += (e.clientX - lastX) / r.width * 3; lastX = e.clientX; }
  });
  el.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; el.style.cursor = "grabbing"; });
  const up = () => { dragging = false; el.style.cursor = ""; };
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  el.addEventListener("pointerleave", () => { px = 0; py = 0; up(); });

  function scrollProgress() {
    const r = el.getBoundingClientRect(), vh = window.innerHeight;
    return Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)));
  }
  function render() { renderer.render(scene, camera); }

  // статичный кадр, если просили меньше движения
  if (reduce) {
    model.root.rotation.y = model.restY;
    model.tick(0, true);
    render();
    el.classList.add("scene--3d");
    return;
  }

  let visible = false, raf = 0;
  const t0 = performance.now();
  function frame(t) {
    raf = 0;
    if (!visible) return;
    const s = scrollProgress();
    target.y = model.restY + (s - .5) * 1.4 + px * .6 + dragX;
    target.x = py * .25;
    cur.y += (target.y - cur.y) * .08; cur.x += (target.x - cur.x) * .08;
    model.root.rotation.y = cur.y; model.root.rotation.x = cur.x;
    model.tick((t - t0) / 1000, false);
    render();
    raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    model.onVisible && model.onVisible(visible);
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }, { rootMargin: "80px 0px" }).observe(el);
  el.classList.add("scene--3d");
}

/* ---------- ноутбук: экран показывает запись лендинга ---------- */
function buildLaptop(el, mobile, reduce) {
  const root = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: GRAPHITE, metalness: .65, roughness: .38 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x141417, metalness: .2, roughness: .7 });
  const accent = new THREE.MeshBasicMaterial({ color: ACC });

  const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, .1, 2.2), metal);
  root.add(base);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.0, .012, 1.0), dark); deck.position.set(0, .056, -.35); root.add(deck);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(1.0, .012, .6), dark); pad.position.set(0, .056, .62); root.add(pad);
  const glowLine = new THREE.Mesh(new THREE.BoxGeometry(3.4, .014, .02), accent); glowLine.position.set(0, -.02, 1.1); root.add(glowLine);

  const lid = new THREE.Group(); lid.position.set(0, .05, -1.1); root.add(lid);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.16, .07), metal); shell.position.set(0, 1.08, -.035); lid.add(shell);

  // экран: запись лендинга, при «меньше движения» постер
  let tex, video = null;
  if (reduce) {
    tex = new THREE.TextureLoader().load(el.dataset.poster);
  } else {
    video = document.createElement("video");
    video.muted = true; video.loop = true; video.playsInline = true; video.setAttribute("playsinline", "");
    video.crossOrigin = "anonymous"; video.preload = "auto"; video.src = el.dataset.video;
    tex = new THREE.VideoTexture(video);
  }
  tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.0), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.set(0, 1.08, .002); lid.add(screen);
  lid.rotation.x = -.22;

  // мягкое свечение под ноутбуком
  const halo = new THREE.Mesh(new THREE.CircleGeometry(2.4, mobile ? 24 : 48), new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: .1 }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = -.06; root.add(halo);

  return {
    root, camY: 2.1, camZ: 6.1, lookY: .8, restY: -.35,
    tick(t) { root.position.y = Math.sin(t * 1.1) * .05; },
    onVisible(v) { if (!video) return; if (v) video.play().catch(() => {}); else video.pause(); }
  };
}

/* ---------- метка на карте со звёздами рейтинга ---------- */
function buildPin(mobile) {
  const root = new THREE.Group();
  const seg = mobile ? 32 : 64;

  // профиль капли: круглая голова, острый низ
  const pts = [];
  pts.push(new THREE.Vector2(0, -1.35));
  for (let i = 0; i <= 24; i++) {
    const a = -Math.PI * .28 + (Math.PI * .78) * (i / 24);   // от касательной к острию до макушки
    pts.push(new THREE.Vector2(Math.cos(a) * 1.0, 1.0 + Math.sin(a) * 1.0));
  }
  pts.push(new THREE.Vector2(0, 2.0));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, seg),
    new THREE.MeshStandardMaterial({ color: ACC, metalness: .25, roughness: .32, emissive: 0x0e1c3c, emissiveIntensity: .6 }));
  const pin = new THREE.Group(); pin.add(body);
  // белое «окошко» насквозь, видно с обеих сторон
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, 2.04, seg), new THREE.MeshStandardMaterial({ color: INK, roughness: .5 }));
  hole.rotation.x = Math.PI / 2; hole.position.y = 1.0; pin.add(hole);
  root.add(pin);

  // пульсирующие круги на «карте»
  const ringMat = new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: .5, side: THREE.DoubleSide });
  const rings = [0, 1].map(() => {
    const r = new THREE.Mesh(new THREE.RingGeometry(.55, .62, seg), ringMat.clone());
    r.rotation.x = -Math.PI / 2; r.position.y = -1.36; root.add(r); return r;
  });

  // пять звёзд рейтинга по кругу
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .13 : .3;
    i ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const starGeo = new THREE.ExtrudeGeometry(shape, { depth: .08, bevelEnabled: !mobile, bevelSize: .02, bevelThickness: .02, bevelSegments: 1 });
  starGeo.center();
  const starMat = new THREE.MeshStandardMaterial({ color: GOLD, metalness: .5, roughness: .3, emissive: 0x1a2440, emissiveIntensity: .5 });
  const orbit = new THREE.Group(); orbit.position.y = .9; root.add(orbit);
  const stars = [];
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(starGeo, starMat);
    const a = i / 5 * Math.PI * 2;
    s.position.set(Math.cos(a) * 1.75, 0, Math.sin(a) * 1.75);
    orbit.add(s); stars.push(s);
  }

  return {
    root, camY: 1.6, camZ: 8.2, lookY: .45, restY: .3,
    tick(t, still) {
      pin.position.y = still ? 0 : Math.sin(t * 1.6) * .12;
      orbit.rotation.y = still ? .3 : t * .55;
      stars.forEach((s, i) => { s.rotation.y = -orbit.rotation.y; s.position.y = still ? 0 : Math.sin(t * 2 + i) * .08; });
      rings.forEach((r, i) => {
        const p = still ? .4 : ((t * .6 + i * .5) % 1);
        r.scale.setScalar(1 + p * 2.2); r.material.opacity = .55 * (1 - p);
      });
    }
  };
}
