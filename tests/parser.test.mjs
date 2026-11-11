// Çalıştır: node tests/parser.test.mjs
import { parseReceipt, parseAmount } from "../js/parser.js";
import assert from "node:assert/strict";

const migros = `MIGROS TICARET A.S.
ATATURK MAH. CUMHURIYET CAD. NO:12
KIRKLARELI
TARIH: 08.11.2026   SAAT: 18:42
FIS NO: 0045
SUT 1 LT        %1   *42,50
EKMEK           %1   *15,00
BEYAZ PEYNIR    %1  *289,90
DETERJAN       %20  *349,00
TOPKDV              *81,12
TOPLAM            *696,40
KREDI KARTI       *696,40`;

const burger = `BURGER KING
TAB GIDA SAN. VE TIC. A.S.
12/11/2026 13:05
WHOPPER MENU   *329,00
AYRAN           *45,00
ARA TOPLAM     *374,00
KDV            *34,00
GENEL TOPLAM   *374,00
NAKIT          *400,00
PARA USTU       *26,00`;

const benzin = `SHELL
AYTEMIZ AKARYAKIT
03-11-26
KURSUNSUZ 95  LT 40,12
TOPLAM
*2.105,50`;

const bilinmeyen = `KUZEY KIRTASIYE
05.10.2026
DEFTER *45,00
KALEM *20,00
TOPLAM *65,00`;

const tests = [
  [migros, { magaza: "Migros", tarih: "2026-11-08", tutar: 696.4, kategori: "market" }],
  [burger, { magaza: "Burger King", tarih: "2026-11-12", tutar: 374, kategori: "yemek" }],
  [benzin, { magaza: "Shell", tarih: "2026-11-03", tutar: 2105.5, kategori: "ulasim" }],
  [bilinmeyen, { magaza: "Kuzey Kirtasiye", tarih: "2026-10-05", tutar: 65 }],
];

let ok = 0;
for (const [txt, exp] of tests) {
  const r = parseReceipt(txt);
  for (const k of Object.keys(exp)) assert.equal(r[k], exp[k], `${exp.magaza} → ${k}: ${r[k]}`);
  ok++;
}
const m = parseReceipt(migros);
assert.equal(m.kalemler.length, 4, "migros ürün sayısı " + JSON.stringify(m.kalemler));
assert.equal(parseAmount("1.234,56"), 1234.56);
assert.equal(parseAmount("*45,9O"), 45.9);
console.log(`✅ ${ok} fiş testi + yardımcılar geçti`);
console.log(JSON.stringify(m, null, 1));
