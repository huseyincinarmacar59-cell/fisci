// Fişçi — veri katmanı (cihazda, localStorage)
const KEY = "fisci:v1";

const empty = () => ({ islemler: [], butceler: {}, olusturma: new Date().toISOString() });

let state = load();

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.islemler)) return { ...empty(), ...s };
  } catch (e) { /* bozuk veri */ }
  return empty();
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
  catch (e) { console.warn("Kaydedilemedi", e); return false; }
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const store = {
  get all() { return state.islemler; },
  get budgets() { return state.butceler; },

  add(tx) {
    const t = { id: uid(), eklenme: new Date().toISOString(), ...tx };
    state.islemler.push(t);
    persist();
    return t;
  },
  update(id, patch) {
    const t = state.islemler.find(x => x.id === id);
    if (t) { Object.assign(t, patch); persist(); }
    return t;
  },
  remove(id) {
    const i = state.islemler.findIndex(x => x.id === id);
    if (i < 0) return null;
    const [t] = state.islemler.splice(i, 1);
    persist();
    return t;
  },
  restore(t) { state.islemler.push(t); persist(); },

  setBudget(kat, tutar) {
    if (tutar > 0) state.butceler[kat] = tutar; else delete state.butceler[kat];
    persist();
  },

  month(y, m) {
    const ym = `${y}-${String(m + 1).padStart(2, "0")}`;
    return state.islemler.filter(t => t.tarih.startsWith(ym))
      .sort((a, b) => b.tarih.localeCompare(a.tarih) || b.eklenme.localeCompare(a.eklenme));
  },

  exportJSON() { return JSON.stringify(state, null, 2); },
  importJSON(text) {
    const s = JSON.parse(text);
    if (!s || !Array.isArray(s.islemler)) throw new Error("Geçersiz yedek dosyası");
    state = { ...empty(), ...s };
    persist();
  },
  exportCSV() {
    const head = "tarih;tur;aciklama;kategori;tutar;fis";
    const rows = [...state.islemler].sort((a, b) => a.tarih.localeCompare(b.tarih)).map(t =>
      [t.tarih, t.tip, `"${String(t.baslik).replace(/"/g, '""')}"`, t.kat, String(t.tutar).replace(".", ","), t.fis ? "evet" : ""].join(";"));
    return "﻿" + [head, ...rows].join("\n");
  },
  reset() { state = empty(); persist(); },
};
