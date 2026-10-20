// Simulación de interacción con la maqueta demo
function probarSensor(elemento, nombreSensor) {
  const statusSpan = elemento.querySelector('.sensor-status');

  if (statusSpan.classList.contains('status-ok')) {
    statusSpan.textContent = 'PROBANDO...';
    statusSpan.className = 'sensor-status status-testing';

    setTimeout(() => {
      statusSpan.textContent = 'DETECTADO';
      statusSpan.style.backgroundColor = '#dbeafe';
      statusSpan.style.color = '#1e40af';

      // Reiniciar estado después de 2.5 segundos
      setTimeout(() => {
        statusSpan.textContent = 'OK';
        statusSpan.className = 'sensor-status status-ok';
        statusSpan.removeAttribute('style');
      }, 2500);

    }, 1000);
  }
}

// Envío del formulario de cotizaciones
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('cotizacionForm');
  const responseDiv = document.getElementById('formResponse');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value;

    responseDiv.textContent = `¡Gracias ${nombre}! Hemos recibido tu solicitud de cotización. Nos pondremos en contacto pronto.`;

    form.reset();

    setTimeout(() => {
      responseDiv.textContent = '';
    }, 6000);
  });

  // Ventana de contacto (WhatsApp / Instagram)
  const modal = document.getElementById('contactModal');
  const abrir = () => { modal.hidden = false; };
  const cerrar = () => { modal.hidden = true; };

  document.querySelectorAll('.js-contactar').forEach(btn => btn.addEventListener('click', abrir));
  document.getElementById('contactClose').addEventListener('click', cerrar);
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
});

// ===== Maqueta 3D: reconstrucción a partir de las fotos de la maqueta real =====
(function () {
  const wrap = document.getElementById('maqueta3d-canvas');
  if (!wrap || !window.THREE) return;

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const P = (px, py, h) => V((px - 325) / 100, h || 0, (py - 197) / 100); // plano (px) -> 3D
  const WH = 1.1, T = 0.06;           // alto y grosor de paredes
  const XW = -2.72;                   // cara exterior de la pared oeste (placa y módulos)
  const FOTO = [-Math.PI / 2, 1.25];  // cámara para ver la pared de la placa
  const INT = [0, 0.75];              // cámara para sensores interiores
  const NORTE = [Math.PI, 0.8];       // cámara para ver la puerta del garage (lado norte)

  const SENSORES = [
    { nombre: 'Humo / Gas', icono: '🔥', color: 0xef4444, w: P(200, 295, 0.98), cam: INT, off: V(0, 0.3, 0),
      comp: 'Sensor de gas MQ-2 (módulo Flying Fish)',
      desc: 'Cuelga del borde de la pared entre el garage y la cocina, mirando hacia la cocina. Detecta humo y gases combustibles.',
      logica: 'Si la lectura supera el umbral se activa la alerta.', pin: 'Entrada analógica (ej. A1)' },
    { nombre: 'Flama', icono: '🚨', color: 0xf97316, w: P(200, 262, 0.98), cam: INT, off: V(0, 0.3, 0),
      comp: 'Módulo sensor de flama (infrarrojo)',
      desc: 'Es el módulo rojo con potenciómetro azul, junto al MQ-2. Detecta la luz infrarroja de una llama.',
      logica: 'Si detecta fuego, se activa la alarma. El potenciómetro ajusta la sensibilidad.', pin: 'Salida digital (ej. 3)' },
    { nombre: 'Luminosidad', icono: '💡', color: 0xf59e0b, w: P(235, 356, 0.95), cam: INT, off: V(0, 0.3, 0),
      comp: 'Módulo con fotorresistencia (LDR)',
      desc: 'El módulo negro está en la pared sur de la cocina y mide la luz ambiental.',
      logica: 'Si la luz baja del umbral, se enciende la iluminación (tira LED por relé).', pin: 'Entrada analógica (ej. A0)' },
    { nombre: 'Temp. / Humedad', icono: '🌡️', color: 0x0ea5e9, w: P(325, 222, 0.92), cam: INT, off: V(0, 0.3, 0),
      comp: 'Sensor digital DHT11 (módulo celeste)',
      desc: 'Está pegado en la pared de la sala de estar, junto a la pantalla. Mide temperatura y humedad relativa.',
      logica: 'Envía los datos a la pantalla LCD y puede disparar alertas fuera de rango.', pin: 'Entrada digital (ej. 2)' },
    { nombre: 'Pantalla LCD I2C', icono: '🖥️', color: 0x22c55e, w: P(385, 222, 0.93), cam: INT, off: V(0, 0.3, 0),
      comp: 'LCD 16x2 con módulo I2C',
      desc: 'Está en la pared de la sala, sobre la puerta del dormitorio 1. Muestra temperatura y humedad (aquí, valores simulados).',
      logica: 'Se actualiza cada pocos segundos. Con I2C solo usa dos cables de datos.', pin: 'SDA y SCL (A4 y A5 en Arduino UNO)' },
    { nombre: 'Ultrasonido', icono: '📏', color: 0x8b5cf6, w: P(177, 27, 0.55), cam: NORTE, off: V(0, 0.35, -0.1),
      comp: 'Sensor ultrasónico HC-SR04',
      desc: 'Está junto a la puerta del garage, mirando hacia afuera. Emite un pulso de sonido y mide cuánto tarda en volver para calcular la distancia.',
      logica: 'Cuando algo llega a cierta distancia, abre la puerta del garage. Al tocarlo aquí, la puerta se abre unos segundos.',
      pin: 'Trig y Echo (ej. 9 y 10)' },
    { nombre: 'Relé + tira LED', icono: '🔌', color: 0xeab308, w: V(XW, 0.4, -0.5), cam: FOTO, off: V(-0.25, 0.25, 0),
      comp: 'Módulo relé de 1 canal + tira LED blanca cálida',
      desc: 'El relé azul está en la pared exterior. La tira LED va pegada en el borde superior de esa pared.',
      logica: 'El Arduino activa el relé para encender y apagar la tira LED.', pin: 'Salida digital hacia el relé (a confirmar)' },
    { nombre: 'Bluetooth', icono: '📶', color: 0x3b82f6, w: V(XW, 0.74, -0.5), cam: FOTO, off: V(-0.25, 0.2, 0),
      comp: 'Módulo Bluetooth (tipo HC-05 / HC-06)',
      desc: 'Es la placa verde, sobre el relé. Permite comunicar la maqueta con un celular.',
      logica: 'Recibe órdenes y puede enviar el estado de los sensores.', pin: 'TX y RX (a confirmar)' },
    { nombre: 'Arduino UNO', icono: '🧠', color: 0x14b8a6, w: V(XW, 0.62, 1.0), cam: FOTO, off: V(-0.25, 0.4, 0),
      comp: 'Placa Arduino UNO + protoboard',
      desc: 'Es el cerebro de la maqueta. Lee los sensores y controla la pantalla, el relé y las alertas.',
      logica: 'Ejecuta la lógica de respuesta de todos los sensores.', pin: 'Conectado por USB al computador' }
  ];

  // ---------- Escena ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  wrap.insertBefore(renderer.domElement, wrap.firstChild);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a6a3a, 0.9));
  const sol = new THREE.DirectionalLight(0xffffff, 0.55);
  sol.position.set(3, 8, 4);
  scene.add(sol);
  const casa = new THREE.Group();
  scene.add(casa);

  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const M = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o));
  function add(geo, mat, x, y, z, rot) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    casa.add(m);
    return m;
  }
  const B = (w, h, d, mat, x, y, z, rot) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, rot);
  const C = (r, h, mat, x, y, z, rot) => add(new THREE.CylinderGeometry(r, r, h, 14), mat, x, y, z, rot);

  function mdfTex() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#cfa872'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = 'rgba(90,60,30,' + (0.05 + rnd() * 0.12) + ')';
      g.fillRect(rnd() * 128, rnd() * 128, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  const mdf = M(0xffffff, { map: mdfTex() });
  const negro = M(0x15171a);

  // Mesa de trabajo y piso de MDF
  add(new THREE.PlaneGeometry(16, 10), M(0x6b5a52), 0, -0.01, 0, [-Math.PI / 2, 0, 0]);
  const pisoG = add(new THREE.PlaneGeometry(5.3, 3.3), mdf, 0, 0.01, 0, [-Math.PI / 2, 0, 0]);
  pisoG.position.copy(P(325, 197, 0.01));

  // ---------- Paredes, dinteles, perfiles negros ----------
  // (la pared norte del garage, de x=60 a 190, se hace aparte con la puerta)
  const PARED = [
    [190, 32, 362, 32], [408, 32, 590, 32], [60, 32, 60, 362], [60, 362, 590, 362], [590, 32, 590, 362],
    [190, 32, 190, 103], [190, 148, 190, 362],
    [190, 228, 227, 228], [272, 228, 362, 228], [408, 228, 465, 228], [510, 228, 590, 228],
    [312, 228, 312, 362], [462, 228, 462, 362],
    [512, 123, 590, 123], [512, 123, 512, 170], [512, 198, 512, 228]
  ];
  const PUERTAS = [[362, 32, 408, 32], [190, 103, 190, 148], [227, 228, 272, 228], [362, 228, 408, 228], [465, 228, 510, 228], [512, 170, 512, 198]];
  function muro(x1, y1, x2, y2, h, y0, mat, grosor) {
    const horiz = y1 === y2, len = (horiz ? x2 - x1 : y2 - y1) / 100 + (grosor ? 0 : T);
    const c = P((x1 + x2) / 2, (y1 + y2) / 2, y0 + h / 2);
    B(horiz ? len : (grosor || T), h, horiz ? (grosor || T) : len, mat, c.x, c.y, c.z);
  }
  PARED.forEach(([x1, y1, x2, y2]) => {
    muro(x1, y1, x2, y2, WH, 0, mdf);
    if (!(y1 === 32 && y2 === 32)) muro(x1, y1, x2, y2, 0.05, WH, negro, 0.1); // perfil negro superior
  });
  PUERTAS.forEach(([x1, y1, x2, y2]) => muro(x1, y1, x2, y2, WH - 0.78, 0.78, mdf)); // dintel

  // ---------- Puerta del garage (pared norte): lados rectos y arriba redondeada (U invertida) ----------
  const gp = P(125, 32), gx = gp.x, gz = gp.z;
  const frente = new THREE.Shape();                       // pared del garage con el hueco de la puerta
  frente.moveTo(-0.65, 0); frente.lineTo(-0.4, 0); frente.lineTo(-0.4, 0.55);
  frente.absarc(0, 0.55, 0.4, Math.PI, 0, true);
  frente.lineTo(0.4, 0); frente.lineTo(0.65, 0); frente.lineTo(0.65, WH); frente.lineTo(-0.65, WH); frente.closePath();
  const paredG = new THREE.Mesh(new THREE.ExtrudeGeometry(frente, { depth: T, bevelEnabled: false }), mdf);
  paredG.rotation.y = Math.PI;                            // la cara exterior mira al norte (-z)
  paredG.position.set(gx, 0, gz + T / 2); casa.add(paredG);
  muro(60, 32, 190, 32, 0.05, WH, negro, 0.1);            // perfil negro superior

  const PIV = 0.93;                                       // altura de la bisagra
  const hojaShape = new THREE.Shape();
  hojaShape.moveTo(-0.37, 0); hojaShape.lineTo(-0.37, 0.55);
  hojaShape.absarc(0, 0.55, 0.37, Math.PI, 0, true); hojaShape.lineTo(0.37, 0); hojaShape.closePath();
  const hojaGeo = new THREE.ExtrudeGeometry(hojaShape, { depth: 0.03, bevelEnabled: false });
  hojaGeo.translate(0, -PIV, 0);
  const baseP = new THREE.Group();                        // orienta la puerta hacia el norte
  baseP.position.set(gx, PIV, gz - T / 2 - 0.005);
  baseP.rotation.y = Math.PI;
  casa.add(baseP);
  const pivote = new THREE.Group();                       // este grupo gira para abrir
  baseP.add(pivote);
  pivote.add(new THREE.Mesh(hojaGeo, M(0xb98a50)));
  [0.2, 0.45, 0.7].forEach(y => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.012, 0.01), M(0x6b4a28)); l.position.set(0, y - PIV, 0.032); pivote.add(l); });
  const tirador = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.03), M(0x374151));
  tirador.position.set(0, 0.12 - PIV, 0.045); pivote.add(tirador);

  let puertaAbierta = false, tPuerta, btnPuerta, puertaA = 0;
  function abrirPuerta(v) {
    puertaAbierta = v;
    if (btnPuerta) btnPuerta.textContent = 'Puerta: ' + (v ? 'abierta' : 'cerrada');
  }

  // Ventanas arqueadas con ladrillitos
  function ventTex() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 80;
    const g = c.getContext('2d');
    g.fillStyle = '#5a4230'; g.beginPath(); g.moveTo(4, 80); g.lineTo(4, 30); g.arc(32, 30, 28, Math.PI, 0); g.lineTo(60, 80); g.fill();
    g.fillStyle = '#d9b98a';
    for (let r = 0; r < 4; r++) for (let k = 0; k < 2; k++) g.fillRect(9 + k * 25, 26 + r * 12, 21, 9);
    return new THREE.CanvasTexture(c);
  }
  const vMat = new THREE.MeshBasicMaterial({ map: ventTex(), transparent: true });
  function ventana(px, py, horiz) {
    [1, -1].forEach(s => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.38), vMat);
      m.position.copy(P(px, py, 0.66));
      if (horiz) { m.position.z += s * 0.034; m.rotation.y = s > 0 ? 0 : Math.PI; }
      else { m.position.x += s * 0.034; m.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; }
      casa.add(m);
    });
  }
  [[500, 32], [267, 32], [514, 362], [395, 362], [275, 362], [155, 362]].forEach(a => ventana(a[0], a[1], true));
  ventana(590, 175, false);

  // Rótulos suaves en el piso
  function rotulo(txt, px, py, w) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.font = '600 30px Poppins, sans-serif'; g.fillStyle = 'rgba(70,40,15,.55)';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 128, 32);
    add(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true }),
      0, 0, 0, [-Math.PI / 2, 0, 0]).position.copy(P(px, py, 0.02));
  }
  rotulo('Garage', 125, 120, 0.9); rotulo('Sala de estar', 360, 135, 1.5); rotulo('Cocina', 250, 262, 0.8);
  rotulo('Dormitorio 1', 387, 255, 1.1); rotulo('Dormitorio 2', 527, 255, 1.1); rotulo('Baño', 552, 150, 0.6);

  // Objetos sueltos: bloque blanco del garage y tornillos en el piso
  let c = P(172, 215, 0.35); B(0.35, 0.7, 0.6, M(0xf4f4f0), c.x, c.y, c.z);
  [[330, 215], [420, 215], [360, 170], [395, 150], [300, 180]].forEach(p => {
    const q = P(p[0], p[1], 0.04); C(0.03, 0.1, M(0x9ca3af), q.x, q.y, q.z, [0, rnd() * 3, Math.PI / 2]);
  });

  // ---------- Componentes en las paredes interiores ----------
  const verde = M(0x2f7d32), azul = M(0x1d4ed8), plata = M(0xb8bcc2);
  // LCD I2C (mira a la sala = hacia el norte = -z)
  const lcdC = document.createElement('canvas'); lcdC.width = 256; lcdC.height = 80;
  const lcdT = new THREE.CanvasTexture(lcdC);
  function lcd(t, h) {
    const g = lcdC.getContext('2d');
    g.fillStyle = '#1e40af'; g.fillRect(0, 0, 256, 80);
    g.fillStyle = '#e0f2fe'; g.font = '600 28px monospace';
    g.fillText('Temp: ' + t.toFixed(1) + ' C', 12, 32);
    g.fillText('Hum:  ' + Math.round(h) + ' %', 12, 68);
    lcdT.needsUpdate = true;
  }
  lcd(24, 52);
  c = SENSORES[4].w; B(0.72, 0.3, 0.04, verde, c.x, c.y, c.z - 0.02);
  add(new THREE.PlaneGeometry(0.56, 0.17), new THREE.MeshBasicMaterial({ map: lcdT }), c.x, c.y, c.z - 0.045, [0, Math.PI, 0]);
  B(0.12, 0.1, 0.03, M(0x111827), c.x + 0.3, c.y - 0.1, c.z - 0.04);
  // DHT11
  c = SENSORES[3].w; B(0.16, 0.22, 0.08, M(0x38b6e6), c.x, c.y, c.z - 0.04);
  [-0.05, 0, 0.05].forEach(x => B(0.012, 0.1, 0.012, plata, c.x + x, c.y - 0.15, c.z - 0.04));
  // MQ-2 y flama colgados del borde de la pared garage/cocina
  c = SENSORES[0].w; B(0.26, 0.04, 0.24, azul, c.x + 0.1, c.y, c.z); C(0.1, 0.14, M(0xa8a8a8), c.x + 0.1, c.y - 0.09, c.z);
  c = SENSORES[1].w; B(0.1, 0.24, 0.04, M(0xdc2626), c.x + 0.05, c.y, c.z); C(0.025, 0.14, M(0x111827), c.x + 0.05, c.y - 0.18, c.z + 0.02);
  B(0.06, 0.06, 0.06, M(0x2563eb), c.x + 0.05, c.y + 0.02, c.z + 0.05);
  // Módulo LDR negro en la pared sur de la cocina
  c = SENSORES[2].w; B(0.17, 0.17, 0.03, negro, c.x, c.y, c.z); C(0.035, 0.05, M(0xb45309), c.x, c.y, c.z - 0.04, [Math.PI / 2, 0, 0]);
  // Ultrasonido HC-SR04 junto a la puerta del garage (mira hacia afuera, al norte)
  c = SENSORES[5].w; B(0.2, 0.1, 0.02, azul, c.x, c.y, c.z);
  [-0.055, 0.055].forEach(x => C(0.045, 0.05, plata, c.x + x, c.y, c.z - 0.03, [Math.PI / 2, 0, 0]));
  [-0.03, -0.01, 0.01, 0.03].forEach(x => B(0.006, 0.02, 0.006, M(0xd4a017), c.x + x, c.y - 0.06, c.z));

  // ---------- Pared oeste (exterior): Arduino, protoboard, relé, Bluetooth, LED ----------
  const cinta = M(0xf1ecd8);
  B(0.04, 0.3, 1.25, M(0xf2f2ee), XW, 0.2, 1.0);                                  // protoboard
  B(0.05, 0.62, 0.95, M(0x1c4f9c), XW - 0.01, 0.62, 1.0);                         // Arduino UNO
  B(0.07, 0.05, 0.8, M(0x111827), XW - 0.02, 0.9, 1.0); B(0.07, 0.05, 0.8, M(0x111827), XW - 0.02, 0.34, 1.0);
  B(0.06, 0.1, 0.3, M(0x111827), XW - 0.02, 0.62, 1.2);
  B(0.12, 0.22, 0.2, plata, XW - 0.03, 0.75, 0.5);                                // USB
  B(0.05, 0.3, 0.4, M(0x1d63c9), XW - 0.01, 0.4, -0.5); B(0.1, 0.2, 0.2, M(0x111827), XW - 0.05, 0.4, -0.5); // relé
  B(0.04, 0.2, 0.52, M(0x2f7d46), XW - 0.01, 0.74, -0.5); B(0.06, 0.1, 0.25, plata, XW - 0.03, 0.74, -0.45); // Bluetooth
  B(0.04, 0.28, 0.16, M(0x2563eb), XW - 0.01, 0.85, 0.15); B(0.06, 0.07, 0.07, M(0x1e3a8a), XW - 0.04, 0.9, 0.15); // módulo azul
  B(0.025, 0.05, 2.0, M(0xfff1b8, { emissive: 0xffd36b }), XW + 0.005, 1.03, -0.6);   // tira LED
  [[-0.1, 0.6], [0.3, 0.55], [0.75, 0.9], [-0.4, 0.35]].forEach(a =>
    B(0.02, 0.12, 0.2, cinta, XW - 0.045, a[1], a[0] + 1.0, [rnd(), 0, rnd() * 0.6]));

  // ---------- Cables sueltos (a la vista, intentando esconderse) ----------
  const cables = new THREE.Group(); casa.add(cables);
  function tubo(v, col, r) {
    cables.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v), 50, r || 0.017, 5), M(col)));
  }
  const jit = (v, a) => v.clone().add(V((rnd() - .5) * a, (rnd() - .5) * a * .6, (rnd() - .5) * a));
  const PAL = [[0xdc2626, 0x111827, 0xfacc15], [0xf97316, 0xf8fafc, 0x16a34a], [0x3b82f6, 0xa855f7, 0xe5e7eb]];
  [0, 1, 2, 3, 4, 5].forEach(n => {
    const T3 = SENSORES[n].w.clone().add(V(0, 0.05, 0)), pal = PAL[n % 3];
    pal.forEach((col, k) => {
      const A = V(XW - 0.04, 0.92, 0.65 + n * 0.07 + k * 0.025);
      const top = V(-2.62, 1.3, A.z - 0.1);
      const m1 = jit(top.clone().lerp(T3, 0.35).add(V(0, 0.12, 0)), 0.3), m2 = jit(top.clone().lerp(T3, 0.7).add(V(0, 0.1, 0)), 0.3);
      const e = jit(T3.clone().add(V(0, 0.18, 0)), 0.06);
      tubo([A, V(A.x - 0.06, A.y + 0.2, A.z), top, m1, m2, e, T3], col);
    });
  });
  // Cables colgando hacia la mesa y USB azul
  [0xdc2626, 0x111827, 0xfacc15, 0x16a34a, 0xf97316, 0xf8fafc, 0x3b82f6, 0xa855f7, 0xf8fafc].forEach((col, k) => {
    const A = V(XW - 0.05, 0.9, 1.3 + k * 0.03);
    tubo([A, V(A.x - 0.15, 0.7, A.z + 0.15), V(A.x - 0.35 - rnd() * 0.3, 0.25, A.z + 0.3 + rnd() * 0.3),
      V(A.x - 0.7 - rnd() * 0.5, 0.03, A.z + 0.5 + rnd() * 0.5), V(A.x - 1.0 - rnd() * 0.5, 0.02, A.z + 0.2 + rnd() * 0.6)], col);
  });
  tubo([V(XW - 0.1, 0.75, 0.5), V(-3.05, 0.85, 0.15), V(-3.35, 0.4, -0.4), V(-3.0, 0.03, -0.95), V(-2.3, 0.02, -1.8), V(-1.6, 0.02, -2.3)], 0x2d5bd1, 0.03);
  for (let n = 0; n < 6; n++) { // cables sueltos en la mesa, lado este
    const o = V(3.1 + rnd() * 0.8, 0.02, -1.4 + rnd() * 2.4);
    tubo([o, jit(o.clone().add(V(0.4, 0.04, 0.3)), 0.3), jit(o.clone().add(V(0.8, 0.02, -0.2)), 0.3), jit(o.clone().add(V(1.2, 0.02, 0.4)), 0.3)],
      [0x3b82f6, 0xdc2626, 0xf8fafc, 0x16a34a, 0xf97316, 0x111827][n], 0.014);
  }
  [[3.2, -0.2], [3.6, 0.9]].forEach(p => B(0.25, 0.01, 0.12, M(0x3b82f6), p[0], 0.01, p[1], [0, rnd() * 3, 0])); // cintas azules

  // ---------- Puntos interactivos y panel ----------
  const chips = document.getElementById('sensor-chips'), info = document.getElementById('sensor-info');
  let sel = -1;
  SENSORES.forEach((s, i) => {
    const h = add(new THREE.SphereGeometry(0.13, 16, 12),
      new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.7, depthTest: false }), 0, 0, 0);
    h.position.copy(s.w).add(s.off); h.renderOrder = 10; h.userData.i = i; s.mesh = h;
    const b = document.createElement('button');
    b.textContent = s.icono + ' ' + s.nombre; b.onclick = () => elegir(i);
    chips.appendChild(b); s.chip = b;
  });
  function elegir(i) {
    sel = i;
    SENSORES.forEach((s, k) => s.chip.classList.toggle('active', k === i));
    const s = SENSORES[i];
    info.innerHTML = '<h3>' + s.icono + ' ' + s.nombre + '</h3><div class="si-comp">' + s.comp + '</div><p>' + s.desc +
      '</p><dl><dt>Cómo reacciona</dt><dd>' + s.logica + '</dd><dt>Conexión (ejemplo)</dt><dd>' + s.pin + '</dd></dl>';
    vista(s.cam[0], s.cam[1], 3.6, s.w);
    if (i === 5) { // el ultrasonido "detecta" y abre el garage unos segundos
      abrirPuerta(true); clearTimeout(tPuerta);
      tPuerta = setTimeout(() => abrirPuerta(false), 5000);
    }
  }
  info.innerHTML = '<p class="si-empty">Toca un punto brillante sobre la maqueta o elige un componente de la lista para ver su información.</p>';

  // ---------- Cámara orbital con movimiento suave ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cam = { th: 0, ph: 0.01, r: 9, t: V(0, 0, 0) };
  const goal = { th: 0, ph: 0.01, r: 9, t: V(0, 0, 0) };
  const rBase = () => Math.max(6.4, 6.8 / (0.6887 * (wrap.clientWidth / wrap.clientHeight)));
  function vista(th, ph, r, t) {
    goal.th = th + Math.round((cam.th - th) / (2 * Math.PI)) * 2 * Math.PI;
    goal.ph = ph; goal.r = r || rBase(); goal.t.copy(t || V(0, 0, 0));
  }
  function aplicar() {
    const k = 0.16;
    cam.th += (goal.th - cam.th) * k; cam.ph += (goal.ph - cam.ph) * k; cam.r += (goal.r - cam.r) * k; cam.t.lerp(goal.t, k);
    const s = Math.sin(cam.ph);
    camera.position.set(cam.t.x + cam.r * s * Math.sin(cam.th), cam.t.y + cam.r * Math.cos(cam.ph), cam.t.z + cam.r * s * Math.cos(cam.th));
    camera.lookAt(cam.t);
  }
  function mover(dx, dy) {
    camera.updateMatrixWorld();
    const m = camera.matrixWorld.elements, k = goal.r * 0.0017;
    goal.t.x += (-dx * m[0] + dy * m[4]) * k; goal.t.y += (-dx * m[1] + dy * m[5]) * k; goal.t.z += (-dx * m[2] + dy * m[6]) * k;
    goal.t.clamp(V(-6, 0, -4), V(6, 1.5, 4));
  }

  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), el = renderer.domElement, pts = new Map();
  let moved = 0;
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; });
  el.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (pts.size === 1) {
      moved += Math.abs(dx) + Math.abs(dy);
      if (e.buttons & 2 || e.shiftKey || e.ctrlKey) mover(dx, dy);
      else { goal.th -= dx * 0.008; goal.ph = clamp(goal.ph - dy * 0.006, 0.01, 1.5); }
    } else if (pts.size === 2) {
      const o = [...pts].find(a => a[0] !== e.pointerId)[1];
      const d0 = Math.hypot(p.x - o.x, p.y - o.y), d1 = Math.hypot(e.clientX - o.x, e.clientY - o.y);
      goal.r = clamp(goal.r * d0 / Math.max(d1, 1), 2, 18); mover(dx / 2, dy / 2); moved = 99;
    }
    p.x = e.clientX; p.y = e.clientY;
  });
  const fin = e => {
    if (pts.size === 1 && moved < 6 && e.type === 'pointerup') {
      const r = el.getBoundingClientRect();
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObjects(SENSORES.map(s => s.mesh))[0];
      if (hit) elegir(hit.object.userData.i);
    }
    pts.delete(e.pointerId);
  };
  el.addEventListener('pointerup', fin); el.addEventListener('pointercancel', fin);
  el.addEventListener('wheel', e => { e.preventDefault(); goal.r = clamp(goal.r * Math.exp(e.deltaY * 0.0012), 2, 18); }, { passive: false });
  el.addEventListener('dblclick', () => vista(0, 0.01));

  // Botones sobre el visor
  const tools = document.createElement('div'); tools.className = 'viewer-tools';
  [['Desde arriba', () => vista(0, 0.01)],
   ['Vista foto', () => vista(Math.PI, 0.95, 9, V(0, 0.3, 0))],
   ['Lado de la placa', () => vista(FOTO[0], FOTO[1], 6, V(-2.5, 0.5, 0))],
   ['Cables: sí', function () { cables.visible = !cables.visible; this.textContent = 'Cables: ' + (cables.visible ? 'sí' : 'no'); }],
   ['Puerta: cerrada', () => { clearTimeout(tPuerta); abrirPuerta(!puertaAbierta); }]
  ].forEach(([t, f]) => { const b = document.createElement('button'); b.textContent = t; b.onclick = f; tools.appendChild(b); });
  btnPuerta = tools.lastChild;
  wrap.appendChild(tools);

  function ajustar() {
    renderer.setSize(wrap.clientWidth, wrap.clientHeight);
    camera.aspect = wrap.clientWidth / wrap.clientHeight; camera.updateProjectionMatrix();
    if (sel < 0 && goal.ph < 0.05) goal.r = rBase();
  }
  new ResizeObserver(ajustar).observe(wrap); ajustar();
  cam.r = goal.r = rBase();

  // LCD con valores simulados
  setInterval(() => { const t = Date.now() / 1000; lcd(24 + Math.sin(t / 7) * 1.5 + rnd() * 0.3, 52 + Math.sin(t / 11) * 4); }, 2000);

  // ---------- Animación ----------
  const reloj = new THREE.Clock();
  (function loop() {
    const t = reloj.getElapsedTime();
    SENSORES.forEach((s, i) => {
      s.mesh.scale.setScalar(1 + 0.2 * Math.sin(t * 4 + i) + (i === sel ? 0.4 : 0));
      s.mesh.material.opacity = i === sel ? 1 : 0.7;
    });
    puertaA += ((puertaAbierta ? 1 : 0) - puertaA) * 0.08;
    pivote.rotation.x = -puertaA * 1.4;
    aplicar();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();
})();