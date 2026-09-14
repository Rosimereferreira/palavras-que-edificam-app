import { readFile } from "node:fs/promises";

const APP_ID = process.env.ONESIGNAL_APP_ID;
const API_KEY = process.env.ONESIGNAL_API_KEY;
const SITE_URL = process.env.SITE_URL;
const TIME_ZONE = "America/Campo_Grande";
const SERIES_START_UTC = Date.UTC(2026, 8, 15);

if (!APP_ID || !API_KEY || !SITE_URL) {
  throw new Error("Configure os segredos ONESIGNAL_APP_ID, ONESIGNAL_API_KEY e SITE_URL no GitHub.");
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
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return values;
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
  "Uma verdade recebida pela fé pode mudar a forma como você atravessa este dia.",
  "Deus não perdeu o controle da área da sua vida que hoje mais precisa de cuidado.",
  "Você não precisa ter todas as respostas para responder a Deus com fé hoje.",
  "O próximo passo pode ser simples, mas a obediência nunca é pequena nas mãos de Deus.",
  "A fé cresce quando você troca a pressa de controlar pela coragem de confiar.",
  "Deus pode usar uma decisão de hoje para iniciar uma mudança muito maior amanhã.",
  "Guarde esta verdade: Deus continua fiel, mesmo quando o processo ainda não terminou."
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

const devotional = devotionalForDate(new Date());
let cleanSiteUrl = SITE_URL;
while (cleanSiteUrl.endsWith("/")) cleanSiteUrl = cleanSiteUrl.slice(0, -1);

const payload = {
  app_id: APP_ID,
  target_channel: "push",
  filters: [
    { field: "session_count", relation: ">", value: "0" }
  ],
  name: "Devocional diário - " + devotional.id,
  headings: {
    en: "Diário da Fé Digital"
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
  throw new Error("Nenhuma notificação foi criada. Verifique se já existe um aparelho inscrito.");
}

console.log("Devocional enviado com sucesso: " + devotional.tema);
