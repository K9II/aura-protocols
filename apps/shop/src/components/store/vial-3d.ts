// The product page's turning vial (mock 2026-10-17, https://claude.ai/artifact/2HjHKbSXJqPHiS2DQSin4a).
// Built in the store vial's own units (Vial.tsx viewBox, 120 x 200) and shaded with its
// exact gradients, so it reads as the same vial as every other on the site; only the label
// goes on round the back (lib/vial-label.ts). Loaded on the client only, after the static
// <Vial> has painted.
import {
  CanvasTexture, CylinderGeometry, Group, LatheGeometry, Mesh, OrthographicCamera, Scene,
  ShaderMaterial, Vector2, Vector4, WebGLRenderer, type IUniform,
} from "three";
import { EXAMPLE_UPC_BARS, EXAMPLE_UPC_DIGITS, LABEL, MAX_DPR, VIAL_LABEL_HEIGHT, VIAL_LABEL_RADIUS } from "@/lib/vial-label";

export type VialLabelInput = {
  label: string; label2?: string; strength: string; parts: string[];
  rule: string; cap: "red" | "black" | "white";
  lot: string | null; qr: string[];
  qrLit?: boolean; // the code in the store's red while the turning vial pauses on it (2026-10-18)
};

const PULSE = "M44,110 L56,86 L68,86 L74,68 L80,108 L86,86 L100,86";
const CAPS = {
  red: ["#6d1b13", "#c4473a", "#8a241a", "#7e2017"],
  black: ["#0c0b09", "#4a4640", "#1c1a15", "#121110"],
  white: ["#b9bcbd", "#ffffff", "#c9cccd", "#d9dbdc"],
} as const;

type Fonts = { serif: string; mono: string; sans: string };
function pageFonts(el: Element): Fonts {
  const css = getComputedStyle(el);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return { serif: v("--font-newsreader", "Georgia, serif"), mono: v("--font-jetbrains", "monospace"), sans: v("--font-sans", "sans-serif") };
}

// The label, unrolled: the store label's front panel (Vial.tsx, line for line, scaled into
// the first inch), then the barcode, then the QR panel.
function drawLabel(ctx: CanvasRenderingContext2D, k: number, p: VialLabelInput, f: Fonts) {
  const nameSize = p.label.length > 9 ? 10.5 : p.label.length > 7 ? 12.5 : 14;
  ctx.save(); ctx.scale(k, k);
  ctx.fillStyle = "#FBFAF7"; ctx.fillRect(0, 0, LABEL.width, LABEL.height);

  ctx.save(); ctx.translate(6, 0); ctx.scale(0.851, 0.851); ctx.translate(-20, -66);
  ctx.save(); ctx.translate(23, 66); ctx.scale(0.175, 0.175); ctx.translate(6, 4); ctx.transform(1, 0, Math.tan((-7 * Math.PI) / 180), 1, 0, 0);
  ctx.lineCap = "round"; ctx.strokeStyle = "#1C1A15"; ctx.lineWidth = 8;
  ctx.stroke(new Path2D("M30,128 L63,23")); ctx.stroke(new Path2D("M77,23 L124,128"));
  ctx.strokeStyle = "#A32B1F"; ctx.lineWidth = 5.5; ctx.stroke(new Path2D(PULSE));
  ctx.restore();
  ctx.fillStyle = "#A32B1F"; ctx.font = `500 22px ${f.serif}`; ctx.fillText("ura", 43, 89.5);
  ctx.fillStyle = "#4A4438"; ctx.font = `500 6.6px ${f.serif}`; ctx.textAlign = "center"; ctx.fillText("Protocols", 58, 98); ctx.textAlign = "left";
  ctx.fillStyle = "#C9C2AE"; ctx.fillRect(26, 102.6, 68, 0.8); ctx.fillRect(26, 132.6, 68, 0.8);
  if (p.label2) {
    ctx.fillStyle = "#1C1A15"; ctx.font = `600 9.6px ${f.serif}`; ctx.fillText(p.label, 26, 113); ctx.fillText(p.label2, 26, 122.4);
    ctx.fillStyle = "#A32B1F"; ctx.font = `7.4px ${f.sans}`; ctx.fillText(p.strength, 26, 130.6);
  } else {
    ctx.fillStyle = "#1C1A15"; ctx.font = `600 ${nameSize}px ${f.serif}`; ctx.fillText(p.label, 26, 117);
    ctx.fillStyle = "#A32B1F"; ctx.font = `8.5px ${f.sans}`; ctx.fillText(p.strength, 26, 127);
  }
  if (p.parts.length > 1) {
    ctx.fillStyle = "#1C1A15"; ctx.font = `4.8px ${f.mono}`; p.parts.slice(0, 2).forEach((t, i) => ctx.fillText(t, 26, 140 + i * 5.6));
    ctx.fillStyle = "#4A4438"; ctx.font = `5px ${f.mono}`; ctx.fillText("RESEARCH USE ONLY", 26, 151.6); ctx.fillText("NOT FOR HUMAN USE", 26, 157.4);
  } else {
    ctx.fillStyle = p.parts.length ? "#1C1A15" : "#4A4438"; ctx.font = `5.4px ${f.mono}`; ctx.fillText(p.parts[0] ?? "LYOPHILIZED", 26, 141.5);
    ctx.fillStyle = "#4A4438"; ctx.fillText("RESEARCH USE ONLY", 26, 148.5); ctx.fillText("NOT FOR HUMAN USE", 26, 155.5);
  }
  ctx.restore();

  // the label's edge rules in the class colour, as on the store vial
  const rw = p.rule === "#A32B1F" ? 0.7 : 1.4;
  ctx.fillStyle = p.rule;
  ctx.fillRect(0, 0, LABEL.frontEnd, rw); ctx.fillRect(0, LABEL.height - rw, LABEL.frontEnd, rw);
  ctx.fillRect(LABEL.rightStart, 0, LABEL.width - LABEL.rightStart, rw); ctx.fillRect(LABEL.rightStart, LABEL.height - rw, LABEL.width - LABEL.rightStart, rw);

  ctx.fillStyle = "#1C1A15";
  for (const [y, h, guard] of EXAMPLE_UPC_BARS) ctx.fillRect(LABEL.upcX, y, guard ? 24.4 : 22, h);
  ctx.font = `4.2px ${f.mono}`; ctx.textAlign = "center";
  for (const [t, y] of EXAMPLE_UPC_DIGITS) { ctx.save(); ctx.translate(LABEL.upcDigitsX, y); ctx.rotate(Math.PI / 2); ctx.fillText(t, 0, 0); ctx.restore(); }
  ctx.textAlign = "left";

  ctx.fillStyle = "#4A4438"; ctx.font = `3.4px ${f.mono}`; ctx.fillText("LOT", LABEL.qrX, 48.5);
  ctx.fillStyle = "#1C1A15"; ctx.font = `4.4px ${f.mono}`; ctx.fillText(p.lot ?? "——————", LABEL.qrX, 54.5);
  {
    const m = LABEL.qrSize / p.qr.length;
    ctx.fillStyle = p.qrLit ? "#A32B1F" : "#1C1A15";
    p.qr.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === "1") ctx.fillRect(LABEL.qrX + x * m, LABEL.qrY + y * m, m + 0.01, m + 0.01); });
    ctx.fillStyle = "#4A4438"; ctx.font = `2.3px ${f.mono}`;
    ctx.fillText("SCAN FOR LOT'S", LABEL.qrX, 71.8); ctx.fillText("CERTIFICATE OF ANALYSIS", LABEL.qrX, 75.3);
  }
  ctx.restore();
}

// Shading: every part takes the store vial's left-to-right SVG gradient by where it faces,
// so the cylinder reads exactly like the flat drawing at every turn.
const VERT = "varying vec3 vN; varying float vY; varying vec2 vUv; void main(){ vN=normalize(normalMatrix*normal); vY=position.y; vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }";
const HEAD = "varying vec3 vN; varying float vY; varying vec2 vUv; uniform vec4 uC[6]; uniform float uO[6]; vec4 grad(float t){ vec4 c=uC[0]; for(int i=1;i<6;i++){ if(uO[i]<0.0) break; float k=clamp((t-uO[i-1])/max(uO[i]-uO[i-1],1e-4),0.0,1.0); if(t>=uO[i-1]) c=mix(uC[i-1],uC[i],k); } return c; }";
const body = (b: string, pre = "") => `${pre}void main(){ vec2 h=normalize(vN.xz+vec2(0.0,1e-5)); float t=clamp(h.x*0.5+0.5,0.0,1.0); ${b} }`;
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
function stops(list: Array<[number, string, number?]>): Record<string, IUniform> {
  const C: Vector4[] = [], O: number[] = [];
  for (let i = 0; i < 6; i++) {
    const s = list[i];
    if (s) { const [r, g, b] = hex(s[1]); C.push(new Vector4(r, g, b, s[2] ?? 1)); O.push(s[0]); } else { C.push(new Vector4()); O.push(-1); }
  }
  return { uC: { value: C }, uO: { value: O } };
}
const mat = (frag: string, uniforms: Record<string, IUniform> = stops([]), transparent = false) =>
  new ShaderMaterial({ vertexShader: VERT, fragmentShader: HEAD + frag, uniforms, transparent, depthWrite: !transparent });
const Y = (y: number) => 200 - y; // SVG y (down) to height (up)
const f1 = (n: number) => n.toFixed(1);

// resize(w, h): the canvas's exact size in device pixels when the browser reports it.
export type Vial3D = { setAngle(a: number): void; setLabel(p: VialLabelInput): void; render(): void; resize(w?: number, h?: number): void; dispose(): void };

export async function mountVial3D(canvas: HTMLCanvasElement, p: VialLabelInput): Promise<Vial3D> {
  const fonts = pageFonts(canvas);
  if (document.fonts) await Promise.all([`500 22px ${fonts.serif}`, `600 14px ${fonts.serif}`, `10px ${fonts.mono}`, `10px ${fonts.sans}`].map((s) => document.fonts.load(s).catch(() => [])));

  // default premultiplied alpha: the see-through glass then composites over the page exactly like the SVG
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(1); // sized in device pixels by resize(), so the browser never rescales it
  const scene = new Scene();
  const cam = new OrthographicCamera(-60, 60, 200, 0, -500, 500);
  cam.position.set(0, 0, 200); cam.lookAt(0, 0, 0);
  const vial = new Group(); scene.add(vial);
  const lathe = (pts: Array<[number, number]>, m: ShaderMaterial) =>
    new Mesh(new LatheGeometry(pts.map(([r, y]) => new Vector2(r, Y(y))).reverse(), 160), m);

  // powder cake, as drawn on the store vial
  vial.add(lathe([[0, 177], [14, 175.8], [26, 176.5], [38, 177.4], [38.6, 190], [0, 190]],
    mat(body("float k=clamp((vY-10.0)/14.0,0.0,1.0); vec3 col=mix(vec3(.902,.882,.831),vec3(.984,.980,.965),k); float d = t<.2 ? mix(.14,0.0,t/.2) : t>.75 ? mix(0.0,.18,(t-.75)/.25) : 0.0; gl_FragColor=vec4(col*(1.0-d),1.0);"))));

  // the label: the store label's height (y 66-160), wrapped round with the front panel facing out
  const H = VIAL_LABEL_HEIGHT, R = VIAL_LABEL_RADIUS, span = ((LABEL.width / 80) * H) / R;
  const art = document.createElement("canvas"); art.width = LABEL.width * 16; art.height = LABEL.height * 16;
  const paint = (q: VialLabelInput) => { const ctx = art.getContext("2d")!; ctx.clearRect(0, 0, art.width, art.height); drawLabel(ctx, 16, q, fonts); };
  paint(p);
  const tex = new CanvasTexture(art); tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const label = new Mesh(new CylinderGeometry(R, R, H, 256, 1, true, -span * (40 / LABEL.width), span),
    mat(body("vec4 c=texture2D(uMap,vUv,-0.75); float d = t<.12 ? mix(.16,0.0,t/.12) : t>.8 ? mix(0.0,.2,(t-.8)/.2) : 0.0; vec3 col=c.rgb*(1.0-d); if(t>.02&&t<.0375) col=mix(col,vec3(1.0),.5); if(t>.944&&t<.959) col=mix(col,vec3(1.0),.3); gl_FragColor=vec4(col,1.0);", "uniform sampler2D uMap; "),
      { ...stops([]), uMap: { value: tex } }));
  label.position.y = (Y(66) + Y(160)) / 2; vial.add(label);

  // aluminium crimp and flip-off cap
  vial.add(lathe([[0, 18], [28, 18], [30, 20], [30, 41], [0, 41]],
    mat(body(`vec4 c=grad(t); vec3 col=c.rgb; if(vY<${f1(Y(37))}) col=mix(col,vec3(.545,.569,.588),.45); if(abs(vY-${f1(Y(22))})<.3) col=mix(col,vec3(1.0),.6); gl_FragColor=vec4(col,1.0);`),
      stops([[0, "#8b9196"], [0.18, "#d7dbde"], [0.35, "#f6f7f8"], [0.6, "#a9afb4"], [0.85, "#c8cdd0"], [1, "#7d8388"]]))));
  vial.add(lathe([[0, 8], [29, 8], [32, 11], [32, 20], [0, 20]],
    mat(body(`vec4 c=grad(t); vec3 col=c.rgb; if(vY<${f1(Y(17.5))}) col*=0.92; gl_FragColor=vec4(col,1.0);`),
      stops(CAPS[p.cap].map((h, i) => [[0, 0.3, 0.7, 1][i], h] as [number, string])))));

  // glass: the store gradient, edge line, highlight streaks and thick base
  const glass = lathe([[0, 195], [29, 195], [36, 193.4], [40, 186], [40, 64], [38.8, 57], [34, 52.5], [22, 50], [22, 38], [0, 38]],
    mat(body(`vec4 c=grad(t); vec3 col=c.rgb; float a=c.a;
      if(vY>${f1(Y(186))}&&vY<${f1(Y(56))}){
        if(t>.069&&t<.101){ col=mix(col,vec3(1.0),.45/(a+.45)); a=a+.45*(1.0-a); }
        if(t>.119&&t<.13){ col=mix(col,vec3(1.0),.25/(a+.25)); a=a+.25*(1.0-a); }
        if(t>.8875&&t<.9075){ col=mix(col,vec3(1.0),.25/(a+.25)); a=a+.25*(1.0-a); } }
      if(vY<${f1(Y(189))}){ col=mix(col,vec3(.604,.651,.678),.16/(a+.16)); a=a+.16*(1.0-a); }
      if(h.y<.06){ col=vec3(.604,.651,.678); a=max(a,.45); }
      gl_FragColor=vec4(col,a);`),
      stops([[0, "#7f8b92", 0.22], [0.08, "#ffffff", 0.6], [0.16, "#eef3f5", 0.04], [0.6, "#ffffff", 0], [0.88, "#dde4e8", 0.1], [1, "#6f7b82", 0.26]]), true));
  glass.renderOrder = 5; vial.add(glass);

  // The drawing buffer matches the canvas pixel for pixel (a buffer the browser has to stretch
  // blurs the type); the label art is sampled a little sharper than the GPU's default (-0.75
  // above) so the text stays crisp as it turns away and back.
  const resize = (w?: number, h?: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const W = w ?? Math.round(canvas.clientWidth * dpr), H = h ?? Math.round(canvas.clientHeight * dpr);
    if (W && H) renderer.setSize(W, H, false);
  };
  resize();
  return {
    setAngle: (a) => { vial.rotation.y = a; },
    setLabel: (q) => { paint(q); tex.needsUpdate = true; },
    render: () => renderer.render(scene, cam),
    resize,
    dispose: () => {
      scene.traverse((o) => { if (o instanceof Mesh) { o.geometry.dispose(); (o.material as ShaderMaterial).dispose(); } });
      tex.dispose(); renderer.dispose();
    },
  };
}
