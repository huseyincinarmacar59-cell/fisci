// Fişçi — cihaz içi OCR (Tesseract.js, Türkçe)
// Fotoğraf hiçbir sunucuya gönderilmez. OCR motoru ve Türkçe dil verisi uygulamanın içinde (vendor/).

let workerPromise = null;
let progressCb = () => {};

function loadScript(src) {
  return new Promise((res, rej) => {
    if (window.Tesseract) return res();
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = () => rej(new Error("OCR motoru yüklenemedi"));
    document.head.appendChild(s);
  });
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const base = new URL("vendor/tesseract/", location.href).href;
      await loadScript(base + "tesseract.min.js");
      const w = await window.Tesseract.createWorker("tur", 1, {
        workerPath: base + "worker-shim.js",
        workerBlobURL: false,
        corePath: base,
        langPath: base.replace(/\/$/, ""),
        gzip: true,
        cacheMethod: "none",
        logger: m => {
          if (m.status === "recognizing text") progressCb(0.3 + m.progress * 0.7, "Fiş okunuyor");
          else if (/load|initializ/.test(m.status)) progressCb(Math.min(0.3, (m.progress || 0) * 0.3), "Türkçe dil paketi hazırlanıyor");
        },
      });
      await w.setParameters({ preserve_interword_spaces: "1", tessedit_pageseg_mode: "6" });
      return w;
    })().catch(e => { workerPromise = null; throw e; });
  }
  return workerPromise;
}

// OCR'ı arka planda ısıt (uygulama açılınca)
export function warmup() { getWorker().catch(() => {}); }

// Fişi gri tonlama + kontrast germe ile OCR'a hazırla
export async function preprocess(file) {
  const bmp = await createImageBitmap(file).catch(() => null);
  const img = bmp || await new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file);
  });
  const W = img.width, H = img.height;
  const target = 1800;
  const s = Math.min(2, target / Math.max(W, H));
  const c = document.createElement("canvas");
  c.width = Math.round(W * s); c.height = Math.round(H * s);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  const px = d.data;
  // histogram ile %2 – %98 aralığını ger
  const hist = new Uint32Array(256);
  for (let i = 0; i < px.length; i += 4) {
    const g = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0;
    px[i] = g; hist[g]++;
  }
  const total = px.length / 4;
  let lo = 0, hi = 255, acc = 0;
  for (; lo < 255; lo++) { acc += hist[lo]; if (acc > total * 0.02) break; }
  acc = 0;
  for (; hi > 0; hi--) { acc += hist[hi]; if (acc > total * 0.02) break; }
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < px.length; i += 4) {
    let v = ((px[i] - lo) * 255) / range;
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  ctx.putImageData(d, 0, 0);

  // küçük önizleme (kayda eklenir)
  const t = document.createElement("canvas");
  const ts = 260 / Math.max(W, H);
  t.width = Math.round(W * ts); t.height = Math.round(H * ts);
  t.getContext("2d").drawImage(img, 0, 0, t.width, t.height);
  return { canvas: c, thumb: t.toDataURL("image/jpeg", 0.6) };
}

export async function recognize(canvas, onProgress) {
  progressCb = onProgress || (() => {});
  progressCb(0.02, "Hazırlanıyor");
  const w = await getWorker();
  const { data } = await w.recognize(canvas);
  progressCb(1, "Tamam");
  return { text: data.text, confidence: data.confidence };
}
