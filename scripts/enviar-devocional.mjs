import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const APP_ID = process.env.ONESIGNAL_APP_ID;
const API_KEY = process.env.ONESIGNAL_API_KEY;
const SITE_URL = process.env.SITE_URL;
const TIME_ZONE = "America/Campo_Grande";
const SERIES_START_UTC = Date.UTC(2026, 8, 15);
const IDEMPOTENCY_NAMESPACE = "b8b52f27-4ad1-4acd-a75d-66ea68f8c991";

if (!APP_ID || !API_KEY || !SITE_URL) {
  throw new Error("Configure os segredos ONESIGNAL_APP_ID, ONESIGNAL_API_KEY e SITE_URL no GitHub.");
}

function datePartsInZone(date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23"
  });
  const values = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return values;
}

function addDays(parts, amount) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + amount, 12));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

function dateKey(parts) {
  return [
    parts.year,
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0")
  ].join("-");
}

function targetDateParts(now) {
  const local = datePartsInZone(now);
  // A execução da noite prepara a mensagem do dia seguinte.
  // A execução da madrugada funciona como segurança para o mesmo dia.
  return local.hour >= 12 ? addDays(local, 1) : {
    year: local.year,
    month: local.month,
    day: local.day
  };
}

function zonedLocalTimeToUtc(parts, hour, minute) {
  const guess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute, 0));
  const seen = datePartsInZone(guess);
  const seenAsUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute, 0);
  const offsetMs = seenAsUtc - guess.getTime();
  return new Date(guess.getTime() - offsetMs);
}

function uuidV5(name, namespace) {
  const namespaceHex = namespace.replace(/-/g, "");
  const namespaceBytes = Buffer.from(namespaceHex, "hex");
  const hash = createHash("sha1")
    .update(namespaceBytes)
    .update(Buffer.from(name, "utf8"))
    .digest();

  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join("-");
}

function cycleDay(date) {
  const parts = datePartsInZone(date);
  const todayUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  const elapsedDays = Math.floor((todayUtc - SERIES_START_UTC) / 86400000);
  return ((elapsedDays % 365) + 365) % 365;
}

const groups = await Promise.all(
  [1, 2, 3, 4].map(async (number) => {
    const source = await readFile(
      new URL(`../dist/series-${number}.json`, import.meta.url),
      "utf8"
    );
    return JSON.parse(source);
  })
);
const series = groups.flat();

if (series.length !== 52) {
  throw new Error("O plano anual precisa conter 52 séries semanais.");
}

const giantPhrases = [
  "O que te assusta hoje não é maior do que o Deus que está com você.",
  "Quanto mais você mede o gigante, menor você se sente; quanto mais olha para Deus, maior sua fé se torna.",
  "Você não precisa copiar a estratégia de outra pessoa para viver a vitória que Deus preparou para você.",
  "Uma pequena atitude de fé pode ser a pedra que inicia uma grande mudança.",
  "A coragem não espera o medo desaparecer; ela corre na direção certa apesar dele.",
  "A vitória não é licença para orgulho; é motivo para testemunhar a fidelidade de Deus.",
  "Não guarde apenas a memória do gigante; guarde a memória do Deus que deu a vitória."
];

const genericPhrases = [
  "A Palavra de hoje não veio apenas para informar você, mas para transformar a forma como você caminha.",
  "Aquilo que Deus revela ao coração pode mudar a maneira como você interpreta o que está vivendo.",
  "Uma verdade obedecida vale mais do que muitas verdades apenas admiradas.",
  "Deus também trabalha profundamente nas decisões que ninguém vê.",
  "O coração muda quando a verdade de Deus fala mais alto do que o medo.",
  "Uma resposta sincera a Deus hoje pode mudar o rumo dos próximos passos.",
  "Não termine esta palavra apenas emocionada; termine decidida a viver o que Deus mostrou."
];

function devotionalForDate(date) {
  const day = cycleDay(date);
  if (day === 364) {
    return {
      id: "especial-365",
      tema: "Paz no coração",
      frase: "A oração transforma o lugar onde a ansiedade queria construir morada."
    };
  }

  const seriesIndex = Math.floor(day / 7);
  const dayIndex = day % 7;
  const weeklySeries = series[seriesIndex];
  const daily = weeklySeries?.dias?.[dayIndex];
  if (!daily) throw new Error("Série devocional incompleta.");

  return {
    id: `s${seriesIndex + 1}d${dayIndex + 1}`,
    tema: daily.tema,
    frase: seriesIndex === 0 ? giantPhrases[dayIndex] : genericPhrases[dayIndex]
  };
}

const now = new Date();
const targetParts = targetDateParts(now);
const targetKey = dateKey(targetParts);
const targetDate = new Date(Date.UTC(targetParts.year, targetParts.month - 1, targetParts.day, 12));
const devotional = devotionalForDate(targetDate);
const sendAt = zonedLocalTimeToUtc(targetParts, 6, 0);
const sendInFuture = sendAt.getTime() > now.getTime() + 60000;

let cleanSiteUrl = SITE_URL;
while (cleanSiteUrl.endsWith("/")) cleanSiteUrl = cleanSiteUrl.slice(0, -1);

const payload = {
  app_id: APP_ID,
  target_channel: "push",
  included_segments: ["Subscribed Users"],
  idempotency_key: uuidV5("diario-da-fe:" + targetKey, IDEMPOTENCY_NAMESPACE),
  name: "Palavra do dia - " + targetKey + " - " + devotional.id,
  headings: {
    en: "Diário da Fé Digital",
    pt: "Diário da Fé Digital"
  },
  contents: {
    en: "A palavra de hoje já está disponível. Toque para ler. 🙏🏻",
    pt: "A palavra de hoje já está disponível. Toque para ler. 🙏🏻"
  },
  url: cleanSiteUrl + "/",
  chrome_web_icon: cleanSiteUrl + "/icons/icon-192.png",
  ttl: 43200
};

if (sendInFuture) {
  payload.send_after = sendAt.toISOString();
}

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
  throw new Error("Nenhuma notificação foi criada. Verifique se existem aparelhos com as notificações autorizadas.");
}

console.log(
  (sendInFuture ? "Notificação programada" : "Notificação enviada imediatamente") +
  " para " + targetKey +
  " | palavra: " + devotional.tema +
  " | horário planejado: 06:00 " + TIME_ZONE +
  " | OneSignal ID: " + result.id
);
