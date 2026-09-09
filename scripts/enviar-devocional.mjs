import { readFile } from "node:fs/promises";

const APP_ID = process.env.ONESIGNAL_APP_ID;
const API_KEY = process.env.ONESIGNAL_API_KEY;
const SITE_URL = process.env.SITE_URL;
const TIME_ZONE = "America/Campo_Grande";

if (!APP_ID || !API_KEY || !SITE_URL) {
  throw new Error(
    "Configure os segredos ONESIGNAL_APP_ID, ONESIGNAL_API_KEY e SITE_URL no GitHub."
  );
}

function datePartsInZone(date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });
  const values = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  }
  return values;
}

function devotionalIndex(date, total) {
  const parts = datePartsInZone(date);
  const todayUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  const anchorUtc = Date.UTC(2026, 0, 1);
  const elapsedDays = Math.floor((todayUtc - anchorUtc) / 86400000);
  return ((elapsedDays % total) + total) % total;
}

const source = await readFile(
  new URL("../dist/devocionais.json", import.meta.url),
  "utf8"
);
const devotionals = JSON.parse(source);

if (!Array.isArray(devotionals) || devotionals.length === 0) {
  throw new Error("O arquivo devocionais.json está vazio.");
}

const devotional = devotionals[devotionalIndex(new Date(), devotionals.length)];
let cleanSiteUrl = SITE_URL;
while (cleanSiteUrl.endsWith("/")) {
  cleanSiteUrl = cleanSiteUrl.slice(0, -1);
}

const payload = {
  app_id: APP_ID,
  target_channel: "push",
  included_segments: [filters: [
  { field: "session_count", relation: ">", value: "0" }
],
  name: "Devocional diário - " + devotional.id,
  headings: {
    en: "Palavras que Edificam"
  },
  contents: {
    en: devotional.tema + " — " + devotional.frase
  },
  url: cleanSiteUrl + "/",
  chrome_web_icon: cleanSiteUrl + "/icons/icon-192.png",
  ttl: 86400
};

const response = await fetch("https://api.onesignal.com/notifications", {
  method: "POST",
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    Authorization: "Key " + API_KEY
  },
  body: JSON.stringify(payload)
});

const result = await response.json();

if (!response.ok) {
  throw new Error(
    "O OneSignal recusou o envio: " +
      (result.errors ? JSON.stringify(result.errors) : response.status)
  );
}

if (!result.id) {
  throw new Error(
    "Nenhuma notificação foi criada. Verifique se já existe um aparelho inscrito."
  );
}

console.log("Devocional enviado com sucesso: " + devotional.tema);
