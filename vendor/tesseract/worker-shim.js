// Fişçi — Tesseract worker kılıfı
// Türkçe dil verisini uygulamanın kendi .js dosyasından (tur-data.js) verir;
// böylece hiçbir dış sunucuya ya da özel dosya türüne ihtiyaç kalmaz.
const BASE = self.location.href.replace(/[^/]*$/, "");
const realFetch = self.fetch.bind(self);
let turBytes = null;
self.fetch = (url, opts) => {
  if (String(url).includes("tur.traineddata")) {
    if (!turBytes) {
      importScripts(BASE + "tur-data.js");
      const bin = atob(self.TUR_TRAINEDDATA_B64);
      turBytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) turBytes[i] = bin.charCodeAt(i);
      self.TUR_TRAINEDDATA_B64 = null;
    }
    return Promise.resolve(new Response(turBytes, { status: 200 }));
  }
  return realFetch(url, opts);
};
importScripts(BASE + "worker.min.js");
