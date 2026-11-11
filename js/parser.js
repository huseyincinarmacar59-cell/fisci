// Fişçi — Türk fişi metin ayrıştırıcı
// OCR'dan gelen ham metinden mağaza, tarih, toplam tutar, kategori ve ürünleri çıkarır.

export const CATEGORIES = {
  market:    { ad: "Market",    ic: "🛒", renk: "#7cf29c" },
  yemek:     { ad: "Yemek",     ic: "🍔", renk: "#ffb547" },
  kiyafet:   { ad: "Kıyafet",   ic: "👕", renk: "#b388ff" },
  ulasim:    { ad: "Ulaşım",    ic: "⛽", renk: "#5ad4ff" },
  fatura:    { ad: "Fatura",    ic: "💡", renk: "#ff8a80" },
  teknoloji: { ad: "Teknoloji", ic: "🎮", renk: "#64ffda" },
  saglik:    { ad: "Sağlık",    ic: "💊", renk: "#f48fb1" },
  diger:     { ad: "Diğer",     ic: "📦", renk: "#9aa3b2" },
};

// Bilinen mağazalar → [görünen ad, kategori]
const STORES = [
  [/MIGROS|MİGROS|MACRO ?CENTER|MACROCENTER/, "Migros", "market"],
  [/A ?101|YENI MAGAZACILIK|YENİ MAĞAZACILIK/, "A101", "market"],
  [/\bB[İI]M\b|BIM BIRLESIK|BİM BİRLEŞİK/, "BİM", "market"],
  [/\bŞOK\b|\bSOK\b|SOK MARKETLER|ŞOK MARKETLER/, "ŞOK", "market"],
  [/CARREFOUR/, "CarrefourSA", "market"],
  [/\bFILE\b|\bFİLE\b/, "File", "market"],
  [/METRO GROSMARKET|METRO TOPTAN/, "Metro", "market"],
  [/HAPPY ?CENTER|ONUR MARKET|BIZIM TOPTAN|BİZİM TOPTAN|TARIM KREDI|TARIM KREDİ/, null, "market"],
  [/BURGER ?KING/, "Burger King", "yemek"],
  [/MC ?DONALD/, "McDonald's", "yemek"],
  [/STARBUCKS/, "Starbucks", "yemek"],
  [/KAHVE DUNYASI|KAHVE DÜNYASI/, "Kahve Dünyası", "yemek"],
  [/DOMINO|PIZZA|PİZZA|POPEYES|KFC|SIMIT SARAYI|SİMİT SARAYI|BAYDONER|BAYDÖNER|TAVUK DUNYASI|TAVUK DÜNYASI|KOFTECI|KÖFTECİ|LOKANTA|RESTORAN|RESTAURANT|CAFE|KAFE|DONER|DÖNER|KEBAP|PIDE|PİDE|FIRIN|PASTANE|BAKLAVA/, null, "yemek"],
  [/LC ?WA[İI]K[İI]K[İI]/, "LC Waikiki", "kiyafet"],
  [/DEFACTO/, "DeFacto", "kiyafet"],
  [/KOTON/, "Koton", "kiyafet"],
  [/\bMAV[İI]\b/, "Mavi", "kiyafet"],
  [/\bZARA\b/, "Zara", "kiyafet"],
  [/H ?& ?M|HENNES/, "H&M", "kiyafet"],
  [/FLO |FLO$|SKECHERS|NIKE|ADIDAS|DECATHLON|BOYNER|COLIN|PULL ?& ?BEAR|BERSHKA|PENTI|PENTİ/, null, "kiyafet"],
  [/SHELL/, "Shell", "ulasim"],
  [/\bOPET\b/, "Opet", "ulasim"],
  [/PETROL OF[İI]S[İI]|\bPO\b/, "Petrol Ofisi", "ulasim"],
  [/\bBP\b|BRITISH PETROL/, "BP", "ulasim"],
  [/TOTAL ?ENERG|AYTEMIZ|AYTEMİZ|AKARYAKIT|BENZIN|BENZİN|MOTORIN|MOTORİN|TAKSI|TAKSİ|OTOPARK/, null, "ulasim"],
  [/TEKNOSA/, "Teknosa", "teknoloji"],
  [/MEDIA ?MARKT/, "MediaMarkt", "teknoloji"],
  [/VATAN B[İI]LG[İI]SAYAR/, "Vatan Bilgisayar", "teknoloji"],
  [/APPLE|SAMSUNG|ITOPYA|İTOPYA|GAMEFIX|GAMESATIS/, null, "teknoloji"],
  [/ECZANE|PHARMACY|GRATIS|WATSONS|ROSSMANN/, null, "saglik"],
  [/ELEKTR[İI]K|ENERJISA|ENERJİSA|CK ENERJI|DOGALGAZ|DOĞALGAZ|IGDAS|İGDAŞ|ISKI|İSKİ|SU IDARESI|TURKCELL|VODAFONE|TURK TELEKOM|TÜRK TELEKOM|SUPERONLINE/, null, "fatura"],
];

// Ürün adına göre kategori tahmini (mağaza tanınmazsa)
const ITEM_HINTS = [
  [/EKMEK|SUT|SÜT|PEYNIR|PEYNİR|YUMURTA|DOMATES|PATATES|SOGAN|SOĞAN|DETERJAN|MAKARNA|PIRINC|PİRİNÇ|YOGURT|YOĞURT|ZEYTIN|ZEYTİN|SUCUK|TAVUK BUT|KG/, "market"],
  [/MENU|MENÜ|BURGER|AYRAN|PORSIYON|PORSİYON|LAHMACUN|KAHVE|LATTE|CAY|ÇAY|COLA|TOST|SALATA/, "yemek"],
  [/TSHIRT|T-SHIRT|TISORT|TİŞÖRT|PANTOLON|GOMLEK|GÖMLEK|ELBISE|ELBİSE|AYAKKABI|MONT|CEKET|CEKET|SWEAT|KAZAK|JEAN|CORAP|ÇORAP/, "kiyafet"],
  [/BENZIN|BENZİN|MOTORIN|MOTORİN|LPG|KURSUNSUZ|KURŞUNSUZ|DIZEL|DİZEL|LT/, "ulasim"],
];

const NOT_ITEM = /TOPLAM|TOPKDV|KDV|ARA ?TOP|NAKIT|NAKİT|KRED[İI]|KART|PARA ?USTU|PARA ÜSTÜ|IND[İI]R[İI]M|TUTAR|ODENEN|ÖDENEN|FIS ?NO|FİŞ ?NO|Z ?NO|EKU|MERSIS|VERG[İI]|V\.D|TEL|TARIH|TARİH|SAAT|BANKA|ONAY|PROVIZYON|PROVİZYON|ADET|POS/;

// Türkçe büyük harf + OCR karışıklıklarını sadeleştir
export function normalize(s) {
  return String(s || "")
    .replace(/i/g, "İ").replace(/ı/g, "I")
    .toUpperCase()
    .replace(/[“”"']/g, "")
    .replace(/\t/g, "    ");
}

// "1.234,56" / "1234,56" / "1234.56" / "*45,90" → sayı
export function parseAmount(raw) {
  if (raw == null) return null;
  let s = String(raw).replace(/[*₺TL\s]/gi, "").replace(/[Oo]/g, "0");
  const m = s.match(/(\d{1,3}(?:[.,]\d{3})*|\d+)[.,](\d{2})(?!\d)/);
  if (!m) return null;
  const whole = m[1].replace(/[.,]/g, "");
  const n = parseFloat(whole + "." + m[2]);
  return Number.isFinite(n) ? n : null;
}

const AMOUNT_RE = /\*?\s?(\d{1,3}(?:[.,\s]\d{3})*|\d+)\s?[.,]\s?(\d{2})(?!\d)/g;

function amountsIn(line) {
  const out = [];
  let m;
  AMOUNT_RE.lastIndex = 0;
  while ((m = AMOUNT_RE.exec(line))) {
    const n = parseFloat(m[1].replace(/[.,\s]/g, "") + "." + m[2]);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

export function findDate(text) {
  const m = text.match(/\b(\d{1,2})\s?[./-]\s?(\d{1,2})\s?[./-]\s?(\d{4}|\d{2})\b/);
  if (!m) return null;
  let [, d, mo, y] = m;
  d = +d; mo = +mo; y = +y;
  if (y < 100) y += 2000;
  if (d < 1 || d > 31 || mo < 1 || mo > 12 || y < 2015 || y > 2100) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function findTotal(lines) {
  // 1) "TOPLAM" geçen ama KDV/ARA olmayan satırlar (veya bir sonraki satır)
  const cands = [];
  lines.forEach((l, i) => {
    if (/(GENEL ?)?TOPLAM|TOP\s|ODENECEK|ÖDENECEK|TOTAL/.test(l) && !/KDV|ARA ?TOP|TOPKDV|INDIRIM|İNDİRİM/.test(l)) {
      let a = amountsIn(l);
      if (!a.length && lines[i + 1]) a = amountsIn(lines[i + 1]);
      a.forEach(v => cands.push({ v, w: /GENEL|ODENECEK|ÖDENECEK/.test(l) ? 3 : 2 }));
    }
  });
  if (cands.length) {
    cands.sort((a, b) => b.w - a.w || b.v - a.v);
    return cands[0].v;
  }
  // 2) Ödeme satırları (NAKİT / KREDİ KARTI)
  const pay = [];
  lines.forEach(l => { if (/NAKIT|NAKİT|KRED[İI] ?KART|KART/.test(l)) pay.push(...amountsIn(l)); });
  if (pay.length) return Math.max(...pay);
  // 3) En büyük yıldızlı tutar
  const star = [];
  lines.forEach(l => { if (/\*\s?\d/.test(l)) star.push(...amountsIn(l)); });
  if (star.length) return Math.max(...star);
  return null;
}

export function findStore(lines, full) {
  for (const [re, name, cat] of STORES) {
    if (re.test(full)) {
      if (name) return { magaza: name, kategori: cat };
      // isim yoksa: eşleşen satırı kullan
      const line = lines.find(l => re.test(l));
      return { magaza: prettify(line || ""), kategori: cat };
    }
  }
  // İlk anlamlı satır (çoğu fişte firma adı en üstte)
  const first = lines.slice(0, 5).find(l => {
    const letters = (l.match(/[A-ZÇĞİÖŞÜ]/g) || []).length;
    return letters >= 3 && letters / l.length > 0.5 && !/T[İI]CARET|TEL|ADRES|MAH|CAD|SOK\.|NO:/.test(l);
  });
  return { magaza: first ? prettify(first) : "", kategori: null };
}

function prettify(s) {
  return s.replace(/\b(A\.?Ş\.?|LTD\.?|ŞT[İI]\.?|SAN\.?|T[İI]C\.?|VE)\b/g, "")
    .replace(/[^A-ZÇĞİÖŞÜ0-9&' ]/g, " ")
    .replace(/ {2,}/g, " ").trim()
    .replace(/İ/g, "i").toLowerCase()
    .replace(/(^|\s)\S/g, c => c.toLocaleUpperCase("tr-TR"))
    .slice(0, 40);
}

export function findItems(lines) {
  const items = [];
  for (const l of lines) {
    if (NOT_ITEM.test(l)) continue;
    const m = l.match(/^(.*?[A-ZÇĞİÖŞÜ]{2,}.*?)\s+(?:%\s?\d{1,2}\s+)?\*\s?(\d{1,3}(?:[.,]\d{3})*|\d+)[.,](\d{2})\s*$/);
    if (!m) continue;
    // OCR sütun boşluklarını korur: ürün adı ilk sütundur (KDV oranı vb. atılır)
    const ad = m[1].split(/\s{2,}|\s[—–-]\s?/)[0].replace(/%\s?\d{1,2}/g, "").replace(/\s+\S?$/, "").trim();
    const fiyat = parseFloat(m[2].replace(/[.,]/g, "") + "." + m[3]);
    if (ad.length >= 2 && fiyat > 0) items.push({ ad: prettify(ad) || ad, fiyat });
  }
  return items.slice(0, 40);
}

function guessCategory(items, full) {
  const score = {};
  const txt = full + " " + items.map(i => i.ad.toUpperCase()).join(" ");
  for (const [re, cat] of ITEM_HINTS) {
    const g = new RegExp(re.source, "g");
    const n = (txt.match(g) || []).length;
    if (n) score[cat] = (score[cat] || 0) + n;
  }
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : "diger";
}

export function parseReceipt(rawText) {
  const full = normalize(rawText);
  const lines = full.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const flat = lines.map(l => l.replace(/ {2,}/g, " "));
  const store = findStore(flat, flat.join("\n"));
  const items = findItems(lines);
  const tutar = findTotal(flat);
  const tarih = findDate(full);
  const kategori = store.kategori || guessCategory(items, flat.join("\n"));
  return {
    magaza: store.magaza,
    tarih,
    tutar,
    kategori,
    kalemler: items,
    guven: [store.magaza, tarih, tutar].filter(Boolean).length, // 0-3
  };
}
