# 🧾 Fişçi

**Fişi tarat, harcamanı otomatik ekle.** Market, yemek, kıyafet fişlerini telefonla çek; Fişçi tutarı, tarihi, mağazayı ve kategoriyi okuyup aylık gelir-gider tablona ekler.

- 📷 **Fiş tarama** — Türkçe OCR (Tesseract.js) tamamen telefonda çalışır, fotoğraf hiçbir sunucuya gitmez
- 🏪 **Mağaza tanıma** — Migros, A101, BİM, ŞOK, Burger King, LC Waikiki, Shell, Teknosa ve daha fazlası → otomatik kategori
- 📊 **Aylık özet** — gelir, gider, kalan para, kategori grafiği, geçen aya göre değişim
- 🎯 **Bütçe limitleri** — kategori bazlı limit, %80'de ve aşınca uyarı
- 📋 **Hareketler** — arama, kategori filtresi, gün gün liste, düzenle/sil/geri al
- 💾 **Yedek** — Excel'de açılan CSV ve JSON yedek al/yükle
- 📱 **PWA** — iPhone'da Safari → Paylaş → *Ana Ekrana Ekle* ile uygulama gibi çalışır

API anahtarı yok, sunucu yok, ücret yok. Veriler cihazdaki tarayıcıda (localStorage) tutulur.

## Yayına alma (GitHub Pages)

1. Bu dosyaları depoya yükle
2. **Settings → Pages → Source: Deploy from a branch → `main` / root**
3. Birkaç dakika sonra `https://KULLANICI.github.io/DEPO/` adresinde açılır
4. iPhone'da Safari ile aç → Paylaş → **Ana Ekrana Ekle**

> Kamera ve service worker için site **HTTPS** olmalı — GitHub Pages zaten HTTPS.

## Yerelde çalıştırma

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Testler

```bash
node tests/parser.test.mjs
```

## Dosya yapısı

```
index.html            arayüz
style.css             tasarım
js/app.js             ekranlar, formlar, tarama akışı
js/parser.js          fiş metninden mağaza/tarih/toplam/kategori/ürün çıkarma
js/ocr.js             görüntü iyileştirme + Tesseract (Türkçe)
js/store.js           veri katmanı, CSV/JSON yedek
vendor/tesseract/     OCR motoru + Türkçe dil verisi (internet/CDN gerekmez)
sw.js                 çevrimdışı önbellek
manifest.webmanifest  PWA ayarları
```

## Yol haritası

- [ ] Hesap + bulut senkron (birden fazla cihaz / aile)
- [ ] AI ile daha isabetli fiş okuma (buruşuk/soluk fişler)
- [ ] Tekrarlayan gelir/gider (maaş, kira, abonelik)
- [ ] Aylık rapor ve grafik geçmişi
