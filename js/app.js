import { CATEGORIES, parseReceipt } from "./parser.js";
import { store } from "./store.js";
import { preprocess, recognize, warmup } from "./ocr.js";

const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const GUNLER = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
const $ = s => document.querySelector(s);
const tl = n => "₺" + Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const cat = k => CATEGORIES[k] || CATEGORIES.diger;

const now = new Date();
let Y = now.getFullYear(), M = now.getMonth();
let view = "ozet", filterCat = "hepsi", query = "";

// ---------- ÇİZİM ----------
function sums(list) {
  const gelir = list.filter(t => t.tip === "gelir").reduce((s, t) => s + t.tutar, 0);
  const gider = list.filter(t => t.tip === "gider").reduce((s, t) => s + t.tutar, 0);
  const byCat = {};
  list.filter(t => t.tip === "gider").forEach(t => byCat[t.kat] = (byCat[t.kat] || 0) + t.tutar);
  return { gelir, gider, byCat };
}

function render() {
  $("#mLabel").textContent = `${AYLAR[M]} ${Y}`;
  const list = store.month(Y, M);
  const { gelir, gider, byCat } = sums(list);

  // hero
  $("#gelir").textContent = tl(gelir);
  $("#gider").textContent = tl(gider);
  const k = $("#kalan");
  k.textContent = tl(gelir - gider);
  k.style.color = gelir - gider < 0 ? "var(--red)" : "";
  const pY = M === 0 ? Y - 1 : Y, pM = M === 0 ? 11 : M - 1;
  const prev = sums(store.month(pY, pM)).gider;
  $("#comp").innerHTML = prev && gider
    ? `${AYLAR[pM]} ayına göre gider <b class="${gider > prev ? "out" : "in"}">${gider > prev ? "▲" : "▼"} %${Math.abs(Math.round((gider - prev) / prev * 100))}</b>`
    : "";

  // bütçe uyarıları
  const alerts = [];
  for (const [kk, lim] of Object.entries(store.budgets)) {
    const v = byCat[kk] || 0, r = v / lim;
    if (r >= 1) alerts.push(`<div class="alert over"><span>🚨</span><div><b>${cat(kk).ad}</b> bütçesini aştın: ${tl(v)} / ${tl(lim)}</div></div>`);
    else if (r >= 0.8) alerts.push(`<div class="alert warn"><span>⚠️</span><div><b>${cat(kk).ad}</b> bütçesinin %${Math.round(r*100)}'i bitti, ${tl(lim - v)} kaldı</div></div>`);
  }
  $("#alerts").innerHTML = alerts.join("");

  // donut + kategoriler
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  $("#donutTotal").textContent = tl(gider);
  $("#catTotal").textContent = entries.length ? `${entries.length} kategori` : "";
  const C = 2 * Math.PI * 48;
  let off = 0;
  $("#donut").innerHTML = `<circle cx="60" cy="60" r="48" fill="none" stroke="var(--card2)" stroke-width="14"/>` +
    entries.map(([kk, v]) => {
      const len = gider ? v / gider * C : 0;
      const gap = entries.length > 1 ? Math.min(2, len) : 0;
      const s = `<circle cx="60" cy="60" r="48" fill="none" stroke="${cat(kk).renk}" stroke-width="14" stroke-dasharray="${Math.max(0, len - gap)} ${C}" stroke-dashoffset="${-off}"/>`;
      off += len; return s;
    }).join("");
  $("#cats").innerHTML = entries.length ? entries.map(([kk, v]) => {
    const c = cat(kk), lim = store.budgets[kk];
    const w = lim ? Math.min(100, v / lim * 100) : v / entries[0][1] * 100;
    const color = lim && v > lim ? "var(--red)" : c.renk;
    return `<div class="cat"><div class="top2"><span>${c.ic} ${c.ad}</span><span><b>${tl(v)}</b> <small>${lim ? "/ " + tl(lim) : "%" + Math.round(v / gider * 100)}</small></span></div>
      <div class="bar"><i style="width:${w}%;background:${color}"></i></div></div>`;
  }).join("") : `<div class="empty">Bu ay henüz harcama yok.<br>Aşağıdaki 📷 ile ilk fişini tarat.</div>`;
  $(".donut-wrap").hidden = !entries.length;

  // son hareketler
  $("#recent").innerHTML = list.length ? list.slice(0, 5).map(txRow).join("")
    : store.all.length ? `<div class="empty">Bu ayda kayıt yok</div>`
    : `<div class="empty">Henüz hiç kayıt yok.<br><button class="btn sec" id="demoData" style="margin-top:12px">🧪 Örnek verilerle dene</button></div>`;
  const dd = $("#demoData"); if (dd) dd.onclick = loadDemo;

  // hareketler sayfası
  renderList(list);
  renderBudgets(byCat);
}

function txRow(t) {
  const isG = t.tip === "gelir", c = cat(t.kat), d = new Date(t.tarih + "T12:00");
  const ic = t.thumb
    ? `<div class="ic" style="background-image:url(${t.thumb})"></div>`
    : `<div class="ic" style="background:${isG ? "rgba(124,242,156,.12)" : c.renk + "22"}">${isG ? "💰" : c.ic}</div>`;
  return `<div class="tx" data-id="${t.id}">${ic}
    <div class="mid"><b>${esc(t.baslik)}</b><small>${d.getDate()} ${AYLAR[d.getMonth()]} · ${isG ? "Gelir" : c.ad}${t.fis ? '<span class="badge">FİŞ</span>' : ""}</small></div>
    <div class="amt ${isG ? "in" : ""}">${isG ? "+" : "−"}${tl(t.tutar)}</div></div>`;
}

function renderList(list) {
  const kats = ["hepsi", "gelir", ...Object.keys(CATEGORIES).filter(k => list.some(t => t.kat === k))];
  $("#filter").innerHTML = kats.map(k => {
    const label = k === "hepsi" ? "Hepsi" : k === "gelir" ? "💰 Gelir" : `${cat(k).ic} ${cat(k).ad}`;
    return `<button class="chip ${filterCat === k ? "on" : ""}" data-f="${k}">${label}</button>`;
  }).join("");
  const q = query.toLocaleLowerCase("tr-TR");
  const f = list.filter(t => (filterCat === "hepsi" || t.kat === filterCat) &&
    (!q || t.baslik.toLocaleLowerCase("tr-TR").includes(q) || cat(t.kat).ad.toLocaleLowerCase("tr-TR").includes(q)));
  if (!f.length) { $("#txs").innerHTML = `<div class="empty">Kayıt bulunamadı</div>`; return; }
  let html = "", last = "";
  for (const t of f) {
    if (t.tarih !== last) {
      const d = new Date(t.tarih + "T12:00");
      const dayTotal = f.filter(x => x.tarih === t.tarih && x.tip === "gider").reduce((s, x) => s + x.tutar, 0);
      html += `<div class="day">${d.getDate()} ${AYLAR[d.getMonth()]} ${GUNLER[d.getDay()]}${dayTotal ? " · " + tl(dayTotal) : ""}</div>`;
      last = t.tarih;
    }
    html += txRow(t);
  }
  $("#txs").innerHTML = html;
}

function renderBudgets(byCat) {
  $("#budgets").innerHTML = Object.entries(CATEGORIES).map(([k, c]) => `
    <div class="bud"><div class="l">${c.ic} ${c.ad}<small>Bu ay: ${tl(byCat[k] || 0)}</small></div>
    <input type="number" inputmode="numeric" min="0" step="100" placeholder="Limit yok" data-b="${k}" value="${store.budgets[k] || ""}"></div>`).join("");
}

// ---------- GEZİNME ----------
function go(v) {
  view = v;
  document.querySelectorAll(".view").forEach(s => s.hidden = s.id !== "v-" + v);
  document.querySelectorAll(".tab[data-go]").forEach(b => b.classList.toggle("on", b.dataset.go === v));
  window.scrollTo({ top: 0 });
}
document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]"); if (g) go(g.dataset.go);
  const tx = e.target.closest(".tx"); if (tx) editTx(tx.dataset.id);
  const f = e.target.closest("[data-f]"); if (f) { filterCat = f.dataset.f; render(); }
});
$("#q").addEventListener("input", e => { query = e.target.value; renderList(store.month(Y, M)); });
$("#prevM").onclick = () => { M--; if (M < 0) { M = 11; Y--; } render(); };
$("#nextM").onclick = () => { M++; if (M > 11) { M = 0; Y++; } render(); };
$("#budgets").addEventListener("change", e => {
  const k = e.target.dataset.b; if (!k) return;
  store.setBudget(k, parseFloat(e.target.value) || 0); render(); toast("Bütçe kaydedildi");
});

// ---------- SHEET / TOAST ----------
const bg = $("#sheetBg"), sheet = $("#sheet");
function openSheet(html) { sheet.innerHTML = html; bg.classList.add("show"); sheet.scrollTop = 0; }
function closeSheet() { bg.classList.remove("show"); }
bg.addEventListener("click", e => { if (e.target === bg && !sheet.dataset.lock) closeSheet(); });

let toastT;
function toast(msg, action) {
  const t = $("#toast");
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action.label)}</button>` : ""}`;
  if (action) t.querySelector("button").onclick = () => { action.fn(); t.classList.remove("show"); };
  t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), action ? 4000 : 1800);
}

function confirmSheet(title, text, okLabel, fn) {
  openSheet(`<h2>${title}</h2><p class="sub">${text}</p>
    <div class="actions"><button class="btn sec" id="cN">Vazgeç</button><button class="btn primary" id="cY" style="background:var(--red);color:#fff">${okLabel}</button></div>`);
  $("#cN").onclick = closeSheet;
  $("#cY").onclick = () => { closeSheet(); fn(); };
}

// ---------- FORM ----------
function formSheet(o, { title, sub, editId } = {}) {
  let tip = o.tip || "gider", kat = o.kat && o.kat !== "gelir" ? o.kat : (o.kategori || "market");
  const conf = o.guven != null
    ? (o.guven >= 3 ? `<span class="conf ok">✓ Fiş okundu</span>` : `<span class="conf mid">⚠ Bazı alanları kontrol et</span>`) : "";
  openSheet(`
    <h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ""}
    ${conf}
    ${o.thumb ? `<img class="preview" src="${o.thumb}" alt="">` : ""}
    <div class="seg"><button data-t="gider" class="${tip === "gider" ? "on" : ""}">Gider</button><button data-t="gelir" class="${tip === "gelir" ? "on" : ""}">Gelir</button></div>
    <div class="field"><label>Tutar (₺)</label><input id="fT" class="big ${o.guven != null && !o.tutar ? "warn" : ""}" type="text" inputmode="decimal" value="${o.tutar ? Number(o.tutar).toFixed(2).replace(".", ",") : ""}" placeholder="0,00"></div>
    <div class="field"><label>Mağaza / Açıklama</label><input id="fB" class="${o.guven != null && !o.baslik ? "warn" : ""}" value="${esc(o.baslik || "")}" placeholder="örn. Migros" autocomplete="off"></div>
    <div class="field"><label>Tarih</label><input id="fD" type="date" value="${o.tarih || today()}"></div>
    <div id="catWrap" ${tip === "gelir" ? "hidden" : ""}>
      <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:8px">Kategori</label>
      <div class="chips">${Object.entries(CATEGORIES).map(([k, c]) => `<button class="chip ${k === kat ? "on" : ""}" data-k="${k}">${c.ic} ${c.ad}</button>`).join("")}</div>
    </div>
    ${o.kalemler?.length ? `<details class="items"><summary>🧾 Fişteki ürünler (${o.kalemler.length}) ›</summary>${o.kalemler.map(i => `<div class="it"><span>${esc(i.ad)}</span><span>${tl(i.fiyat)}</span></div>`).join("")}</details>` : ""}
    ${o.ham ? `<details class="items"><summary>🔍 Okunan ham metin ›</summary><div class="raw">${esc(o.ham)}</div></details>` : ""}
    <div class="actions">
      ${editId ? `<button class="btn sec danger" id="fX">Sil</button>` : `<button class="btn sec" id="fC">Vazgeç</button>`}
      <button class="btn primary" id="fS">${editId ? "Güncelle" : "Kaydet"}</button>
    </div>`);
  sheet.querySelectorAll(".seg button").forEach(b => b.onclick = () => {
    tip = b.dataset.t;
    sheet.querySelectorAll(".seg button").forEach(x => x.classList.toggle("on", x === b));
    $("#catWrap").hidden = tip === "gelir";
  });
  sheet.querySelectorAll("[data-k]").forEach(b => b.onclick = () => {
    kat = b.dataset.k; sheet.querySelectorAll("[data-k]").forEach(x => x.classList.toggle("on", x === b));
  });
  $("#fC") && ($("#fC").onclick = closeSheet);
  $("#fX") && ($("#fX").onclick = () => {
    const t = store.remove(editId); closeSheet(); render();
    toast("Silindi", { label: "Geri al", fn: () => { store.restore(t); render(); } });
  });
  $("#fS").onclick = () => {
    const raw = $("#fT").value.trim().replace(/\s/g, "");
    const tutar = parseFloat(/,\d{1,2}$/.test(raw) ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, ""));
    if (!tutar || tutar <= 0) { toast("Tutarı gir abi"); $("#fT").focus(); return; }
    const rec = {
      tip, tutar: Math.round(tutar * 100) / 100,
      baslik: $("#fB").value.trim() || (tip === "gelir" ? "Gelir" : cat(kat).ad),
      tarih: $("#fD").value || today(),
      kat: tip === "gelir" ? "gelir" : kat,
    };
    if (editId) store.update(editId, rec);
    else store.add({ ...rec, fis: !!o.fis, thumb: o.thumb || null, kalemler: o.kalemler || [] });
    const d = new Date(rec.tarih + "T12:00"); Y = d.getFullYear(); M = d.getMonth();
    closeSheet(); render();
    toast(editId ? "Güncellendi" : tip === "gelir" ? "Gelir eklendi 💰" : `${cat(kat).ic} ${tl(rec.tutar)} eklendi`);
  };
  if (!o.tutar) setTimeout(() => $("#fT")?.focus(), 300);
}

function editTx(id) {
  const t = store.all.find(x => x.id === id); if (!t) return;
  formSheet(t, { title: "Kaydı düzenle", editId: id });
}
$("#addBtn").onclick = () => formSheet({}, { title: "Elle ekle", sub: "Fişi olmayan harcama ya da maaş gibi gelirler" });

// ---------- FİŞ TARAMA ----------
$("#scanBtn").onclick = () => {
  openSheet(`<h2>Fiş tara</h2><p class="sub">Fişin fotoğrafını çek; tutar, tarih, mağaza ve kategori otomatik dolsun.</p>
    <div class="tips">💡 Fişi düz bir zemine koy<br>💡 Işık iyi olsun, gölge düşmesin<br>💡 Fişin tamamı kadrajda olsun</div>
    <div class="actions col">
      <button class="btn primary" id="pCam">📷 Kamerayla çek</button>
      <button class="btn sec" id="pGal">🖼️ Galeriden seç</button>
    </div>`);
  $("#pCam").onclick = () => $("#camera").click();
  $("#pGal").onclick = () => $("#gallery").click();
  warmup();
};
["#camera", "#gallery"].forEach(s => $(s).addEventListener("change", e => {
  const f = e.target.files[0]; e.target.value = ""; if (f) scanFile(f);
}));

async function scanFile(file) {
  sheet.dataset.lock = "1";
  openSheet(`<div class="scan"><div class="scanbox noimg" id="sbox"></div>
    <h2 id="sTitle">Hazırlanıyor…</h2><div class="prog"><i id="sBar"></i></div>
    <p class="sub" id="sSub">İlk taramada Türkçe dil paketi indirilir (~5 MB), sonra çok daha hızlı.</p></div>`);
  try {
    const { canvas, thumb } = await preprocess(file);
    const box = $("#sbox"); box.classList.remove("noimg"); box.style.backgroundImage = `url(${thumb})`;
    const { text } = await recognize(canvas, (p, label) => {
      const bar = $("#sBar"), ti = $("#sTitle");
      if (bar) bar.style.width = Math.round(p * 100) + "%";
      if (ti) ti.textContent = label + "…";
    });
    const r = parseReceipt(text);
    delete sheet.dataset.lock;
    formSheet({ fis: true, thumb, baslik: r.magaza, tutar: r.tutar, tarih: r.tarih, kategori: r.kategori, kalemler: r.kalemler, guven: r.guven, ham: text },
      { title: r.guven >= 2 ? "Fiş okundu ✨" : "Fişi kontrol et", sub: r.guven >= 3 ? "Doğruysa kaydet abi." : "Okuyamadığım yerleri tamamla." });
  } catch (err) {
    console.error(err);
    delete sheet.dataset.lock;
    toast(err.message || "Okuyamadım");
    formSheet({ fis: true }, { title: "Elle tamamla", sub: "Fişi okuyamadım; bilgileri elle gir. (" + esc(err.message || "hata") + ")" });
  }
}

// ---------- VERİ ----------
function download(name, content, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
$("#expCSV").onclick = () => download(`fisci-${today()}.csv`, store.exportCSV(), "text/csv;charset=utf-8");
$("#expJSON").onclick = () => download(`fisci-yedek-${today()}.json`, store.exportJSON(), "application/json");
$("#impJSON").onclick = () => $("#impFile").click();
$("#impFile").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try { store.importJSON(await f.text()); render(); toast("Yedek yüklendi ✅"); }
  catch (err) { toast(err.message); }
});
$("#reset").onclick = () => confirmSheet("Her şey silinsin mi?", "Tüm gelir, gider ve bütçe kayıtların bu cihazdan silinir. Geri alınamaz.", "Evet, sil", () => { store.reset(); render(); toast("Silindi"); });

function loadDemo() {
  const ym = `${Y}-${String(M + 1).padStart(2, "0")}`;
  const p = M === 0 ? `${Y - 1}-12` : `${Y}-${String(M).padStart(2, "0")}`;
  const demo = [
    [ym, "01", "gelir", "Maaş", 42000, "gelir"], [ym, "03", "gider", "Migros", 1847.35, "market", 1],
    [ym, "05", "gider", "Burger King", 389, "yemek", 1], [ym, "07", "gider", "LC Waikiki", 1299.99, "kiyafet", 1],
    [ym, "08", "gider", "Shell", 2100, "ulasim", 1], [ym, "09", "gider", "Elektrik faturası", 940, "fatura"],
    [ym, "10", "gider", "A101", 612.5, "market", 1], [ym, "10", "gider", "Kahve Dünyası", 185, "yemek", 1],
    [p, "02", "gelir", "Maaş", 42000, "gelir"], [p, "06", "gider", "BİM", 2300, "market", 1],
    [p, "12", "gider", "Teknosa", 3499, "teknoloji", 1], [p, "20", "gider", "Opet", 1900, "ulasim", 1],
  ];
  demo.forEach(([m, d, tip, baslik, tutar, kat, fis]) => store.add({ tip, baslik, tutar, kat, tarih: `${m}-${d}`, fis: !!fis }));
  store.setBudget("market", 3000); store.setBudget("yemek", 1500);
  render(); toast("Örnek veriler eklendi — istediğin zaman silebilirsin");
}

// ---------- BAŞLAT ----------
render();
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
