(function () {
  "use strict";

  var config = window.APP_CONFIG || {};
  var timeZone = config.timeZone || "America/Campo_Grande";
  var SERIES_START_UTC = Date.UTC(2026, 8, 15);
  var SERIES_FILES = ["./series-1.json", "./series-2.json", "./series-3.json", "./series-4.json"];
  var state = { devotionals: [], series: [], current: null, renderedDateKey: null, deferredInstall: null, oneSignal: null, toastTimer: null };

  function byId(id) { return document.getElementById(id); }
  function isIOS() { return /iphone|ipad|ipod/i.test(window.navigator.userAgent); }
  function isStandalone() { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; }
  function openDialog(dialog) { if (dialog && typeof dialog.showModal === "function") dialog.showModal(); }
  function showToast(message) {
    var toast = byId("toast");
    window.clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.classList.add("visible");
    state.toastTimer = window.setTimeout(function () { toast.classList.remove("visible"); }, 2800);
  }

  function datePartsInZone(date) {
    var formatter = new Intl.DateTimeFormat("en-US", { timeZone: timeZone, year: "numeric", month: "numeric", day: "numeric" });
    var values = {};
    formatter.formatToParts(date).forEach(function (part) { if (part.type !== "literal") values[part.type] = Number(part.value); });
    return { year: values.year, month: values.month, day: values.day };
  }
  function dateKey(date) {
    var p = datePartsInZone(date);
    return [p.year, String(p.month).padStart(2, "0"), String(p.day).padStart(2, "0")].join("-");
  }
  function devotionalIndex(date, total) {
    var p = datePartsInZone(date);
    var todayUtc = Date.UTC(p.year, p.month - 1, p.day);
    var elapsedDays = Math.floor((todayUtc - Date.UTC(2026, 0, 1)) / 86400000);
    return ((elapsedDays % total) + total) % total;
  }
  function cycleDay(date) {
    var p = datePartsInZone(date);
    var todayUtc = Date.UTC(p.year, p.month - 1, p.day);
    var elapsedDays = Math.floor((todayUtc - SERIES_START_UTC) / 86400000);
    return ((elapsedDays % 365) + 365) % 365;
  }
  function formattedDate(date) {
    var text = new Intl.DateTimeFormat("pt-BR", { timeZone: timeZone, weekday: "long", day: "2-digit", month: "long" }).format(date);
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  var giantWeek = [
    { frase: "O que te assusta hoje não é maior do que o Deus que está com você.", reflexao: "Nem todo gigante tem rosto. Às vezes ele aparece como medo, pressão, uma notícia, uma dívida ou uma situação que parece grande demais. Davi venceu Golias não porque era o mais forte, mas porque sabia em nome de quem estava entrando na batalha. O tamanho do problema não muda o tamanho de Deus. Hoje, não alimente o gigante com seus pensamentos; alimente sua fé com a Palavra.", oracao: "Senhor, eu Te entrego o gigante que hoje tenta me intimidar. Tira de mim o medo, fortalece meu coração e ensina-me a enfrentar esta batalha em Teu nome. Eu creio que o Senhor é maior. Em nome de Jesus, amém.", tarefa: "Escreva qual é o seu gigante de hoje e, ao lado, escreva: “Meu Deus é maior.”" },
    { frase: "Quanto mais você mede o gigante, menor você se sente; quanto mais olha para Deus, maior sua fé se torna.", reflexao: "O exército de Israel olhava para Golias todos os dias e só enxergava impossibilidade. Davi olhou para a mesma cena e lembrou quem era o Deus de Israel. O problema pode ser real, mas ele não merece ocupar todo o seu campo de visão. Troque a comparação, a ansiedade e as previsões de derrota pela lembrança da fidelidade de Deus.", oracao: "Pai, muda o foco dos meus olhos. Que eu não passe o dia medindo o problema, mas lembrando do Teu poder e da Tua fidelidade. Amém.", tarefa: "Toda vez que o medo voltar hoje, responda com uma lembrança de algo que Deus já fez por você." },
    { frase: "Você não precisa copiar a estratégia de outra pessoa para viver a vitória que Deus preparou para você.", reflexao: "Saul ofereceu a Davi uma armadura, mas ela não combinava com a história que Deus estava construindo nele. Comparação pode nos fazer carregar pesos que nunca foram nossos. Deus pode usar sua personalidade, sua trajetória e aquilo que já colocou em suas mãos. Não tente vencer parecendo outra pessoa; avance sendo fiel ao que Deus confiou a você.", oracao: "Senhor, livra-me da comparação e da necessidade de imitar caminhos que não são meus. Mostra-me o que já colocaste em minhas mãos e ensina-me a usar isso com fé. Amém.", tarefa: "Anote três recursos, dons ou experiências que Deus já colocou em suas mãos." },
    { frase: "Uma pequena atitude de fé pode ser a pedra que inicia uma grande mudança.", reflexao: "A pedra parecia pequena diante de Golias, mas não estava sozinha: havia fé, treinamento e obediência por trás daquele gesto. Nem sempre a mudança começa com algo grandioso. Uma ligação, um pedido de perdão, uma decisão, uma oração ou um limite pode ser o início da queda de um gigante. Faça hoje o que Deus já mostrou.", oracao: "Deus, dá-me discernimento para reconhecer o passo que está diante de mim e coragem para não desprezá-lo por parecer pequeno. Amém.", tarefa: "Escolha uma atitude prática que você vem adiando e dê esse passo hoje." },
    { frase: "A coragem não espera o medo desaparecer; ela corre na direção certa apesar dele.", reflexao: "Davi não ficou parado esperando sentir-se invencível. Ele correu para a batalha com a confiança colocada no Senhor. Coragem bíblica não é ausência de emoção; é decisão de obedecer mesmo com o coração acelerado. Você pode sentir medo e ainda assim não ser governada por ele.", oracao: "Senhor, quando meu coração tremer, lembra-me que Tua presença permanece firme. Dá-me coragem para avançar com sabedoria e fé. Amém.", tarefa: "Faça hoje uma coisa necessária que você vem adiando por medo." },
    { frase: "A vitória não é licença para orgulho; é motivo para testemunhar a fidelidade de Deus.", reflexao: "Depois que o gigante cai, existe outra batalha: não transformar a vitória em vaidade. Davi sabia que a batalha pertencia ao Senhor. Quando Deus abrir uma porta ou responder uma oração, celebre, agradeça e use essa história para fortalecer outras pessoas. O testemunho correto aponta para Deus, não para o nosso ego.", oracao: "Pai, quando a vitória chegar, guarda meu coração do orgulho. Que minha história sempre aponte para Tua graça e fidelidade. Amém.", tarefa: "Conte a alguém uma vitória que Deus já lhe deu, destacando o que você aprendeu sobre Ele." },
    { frase: "Não guarde apenas a memória do gigante; guarde a memória do Deus que deu a vitória.", reflexao: "Muitas pessoas se lembram com detalhes do medo, mas esquecem rapidamente das respostas de Deus. A fé para batalhas futuras é fortalecida quando fazemos memória da fidelidade passada. Termine esta semana olhando menos para Golias e mais para o Deus que esteve com você em cada passo.", oracao: "Senhor, ajuda-me a guardar no coração as provas da Tua fidelidade. Que minhas memórias alimentem fé e não medo. Amém.", tarefa: "Faça uma lista de cinco situações em que Deus já sustentou, livrou ou direcionou você." }
  ];

  var genericPhrases = [
    "Uma verdade recebida pela fé pode mudar a forma como você atravessa este dia.",
    "Deus não perdeu o controle da área da sua vida que hoje mais precisa de cuidado.",
    "Você não precisa ter todas as respostas para responder a Deus com fé hoje.",
    "O próximo passo pode ser simples, mas a obediência nunca é pequena nas mãos de Deus.",
    "A fé cresce quando você troca a pressa de controlar pela coragem de confiar.",
    "Deus pode usar uma decisão de hoje para iniciar uma mudança muito maior amanhã.",
    "Guarde esta verdade: Deus continua fiel, mesmo quando o processo ainda não terminou."
  ];

  function buildGeneric(seriesItem, dayIndex) {
    var day = seriesItem.dias[dayIndex];
    var name = seriesItem.serie;
    var lower = name.toLowerCase();
    var reflections = [
      "A série desta semana nos convida a crescer em " + lower + ". A Palavra de hoje nos lembra: " + day.versiculo + " Não trate isso apenas como uma ideia bonita. Peça ao Espírito Santo para transformar esta verdade em uma escolha prática no seu dia.",
      "Há áreas da vida que só amadurecem quando permitimos que a Palavra corrija nosso olhar. Hoje, em " + day.tema.toLowerCase() + ", Deus nos chama a sair da reação automática e caminhar com fé. " + day.versiculo + " Leve essa verdade para as decisões pequenas, porque é nelas que o caráter é formado.",
      "Deus não trabalha apenas no resultado; Ele também trabalha em quem estamos nos tornando durante o caminho. A verdade de " + day.referencia + " nos chama a uma resposta real: " + day.versiculo + " Não espere sentir tudo perfeitamente para obedecer. Dê o passo que já ficou claro.",
      "Talvez o assunto desta semana toque exatamente uma área que você preferia evitar. Ainda assim, a graça de Deus não expõe para humilhar; ela ilumina para curar e direcionar. " + day.versiculo + " Receba a Palavra com humildade e permita que ela produza mudança.",
      "Fé não é negar a realidade, mas decidir quem terá a palavra final dentro de nós. Em " + day.referencia + ", somos lembradas de que " + day.versiculo.charAt(0).toLowerCase() + day.versiculo.slice(1) + " Hoje, escolha alimentar convicções que combinam com a Palavra, não com o medo.",
      "Algumas transformações começam com uma decisão silenciosa que ninguém vê. A Palavra de hoje aponta um caminho de " + lower + ": " + day.versiculo + " Não despreze o que Deus pode construir a partir de uma resposta sincera e obediente.",
      "Chegamos ao fim desta série semanal, mas a verdade não precisa terminar aqui. " + day.versiculo + " Faça memória do que Deus falou nesses dias e escolha uma prática para continuar levando com você. Crescimento espiritual acontece quando a Palavra deixa de ser apenas ouvida e passa a ser vivida."
    ];
    var prayers = [
      "Senhor, abre meu coração para viver esta verdade. Forma em mim " + lower + " de maneira sincera e prática. Que Tua Palavra conduza minhas escolhas hoje. Amém.",
      "Pai, mostra onde preciso amadurecer e dá-me graça para responder com fé. Não quero apenas compreender; quero praticar o que o Senhor está me ensinando. Amém.",
      "Deus, alinha meus pensamentos, minhas palavras e minhas atitudes à Tua vontade. Dá-me coragem para obedecer ao que já ficou claro. Amém.",
      "Senhor, toca as áreas que precisam de cura, correção e crescimento. Que eu receba Tua direção sem medo e caminhe em liberdade. Amém.",
      "Pai, quando minhas emoções falarem mais alto, lembra-me da Tua Palavra. Firma meu coração em Ti e ensina-me a confiar. Amém.",
      "Deus, usa minhas escolhas de hoje para formar algo duradouro em mim. Que minha vida reflita a verdade que estou recebendo. Amém.",
      "Senhor, obrigada pelo que me ensinaste nesta semana. Ajuda-me a guardar, praticar e compartilhar aquilo que veio de Ti. Amém."
    ];
    var tasks = [
      "Leia " + day.referencia + " na sua Bíblia e escreva em uma frase o que Deus falou ao seu coração.",
      "Ore hoje por uma situação específica ligada a " + lower + " e entregue-a a Deus pelo nome.",
      "Repita a verdade principal desta palavra em voz alta três vezes e escolha uma atitude coerente com ela.",
      "Anote uma área em que você precisa praticar " + lower + " e dê um pequeno passo ainda hoje.",
      "Compartilhe esta palavra com alguém que possa ser fortalecido por ela.",
      "Reserve cinco minutos em silêncio, releia " + day.referencia + " e pergunte: “Senhor, o que preciso ajustar hoje?”",
      "Antes de dormir, agradeça a Deus por um sinal, ainda que pequeno, do que Ele está fazendo nesta área."
    ];
    return { serie: name, tema: day.tema, frase: genericPhrases[dayIndex], referencia: day.referencia, versiculo: day.versiculo, reflexao: reflections[dayIndex], oracao: prayers[dayIndex], tarefa: tasks[dayIndex] };
  }

  function specialDay() {
    return { serie: "Paz e Recomeço", tema: "Paz no coração", frase: "A oração transforma o lugar onde a ansiedade queria construir morada.", referencia: "Filipenses 4:6–7", versiculo: "Apresente seus pedidos a Deus, e a paz dele guardará o seu coração e a sua mente.", reflexao: "Nem sempre a oração muda a situação imediatamente, mas ela muda o ambiente dentro de nós. Quando você conversa com Deus, a ansiedade deixa de ser um monólogo e passa a ser uma entrega. A paz do Senhor pode guardar você mesmo antes de a resposta chegar.", oracao: "Pai, receba aquilo que tem ocupado meus pensamentos. Guarda meu coração e minha mente com uma paz maior do que minhas circunstâncias. Amém.", tarefa: "Troque dez minutos de preocupação por dez minutos de oração específica." };
  }

  function devotionalForDate(date) {
    var day = cycleDay(date);
    if (day === 364) {
      var special = specialDay();
      special.id = "especial-365";
      return special;
    }
    var seriesIndex = Math.floor(day / 7);
    var dayIndex = day % 7;
    var seriesItem = state.series[seriesIndex];
    if (!seriesItem || !Array.isArray(seriesItem.dias) || !seriesItem.dias[dayIndex]) throw new Error("Série devocional incompleta.");
    var devotional;
    if (seriesIndex === 0) {
      devotional = Object.assign({ serie: seriesItem.serie, tema: seriesItem.dias[dayIndex].tema, referencia: seriesItem.dias[dayIndex].referencia, versiculo: seriesItem.dias[dayIndex].versiculo }, giantWeek[dayIndex]);
    } else {
      devotional = buildGeneric(seriesItem, dayIndex);
    }
    devotional.id = "s" + (seriesIndex + 1) + "d" + (dayIndex + 1);
    return devotional;
  }

  function renderDevotional(devotional) {
    state.current = devotional;
    state.renderedDateKey = dateKey(new Date());
    var label = formattedDate(new Date());
    if (devotional.serie) label += " • Série: " + devotional.serie;
    byId("date-label").textContent = label;
    byId("devotional-title").textContent = devotional.tema;
    byId("impact-phrase").textContent = devotional.frase;
    byId("verse-text").textContent = devotional.versiculo;
    byId("verse-reference").textContent = devotional.referencia;
    byId("reflection-text").textContent = devotional.reflexao;
    byId("prayer-text").textContent = devotional.oracao;
    byId("daily-action").textContent = devotional.tarefa;
    document.title = devotional.tema + " | Diário da Fé Digital";
  }

  async function loadLegacyDevotional() {
    var response = await fetch("./devocionais.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível carregar os devocionais.");
    state.devotionals = await response.json();
    if (!Array.isArray(state.devotionals) || state.devotionals.length === 0) throw new Error("A lista de devocionais está vazia.");
    renderDevotional(state.devotionals[devotionalIndex(new Date(), state.devotionals.length)]);
  }

  async function loadDevotional() {
    try {
      if (state.series.length !== 52) {
        var responses = await Promise.all(SERIES_FILES.map(function (path) { return fetch(path, { cache: "no-store" }); }));
        responses.forEach(function (response) { if (!response.ok) throw new Error("Não foi possível carregar uma série devocional."); });
        var groups = await Promise.all(responses.map(function (response) { return response.json(); }));
        state.series = [].concat.apply([], groups);
        if (state.series.length !== 52) throw new Error("O plano anual está incompleto.");
      }
      renderDevotional(devotionalForDate(new Date()));
    } catch (seriesError) {
      try { await loadLegacyDevotional(); }
      catch (error) {
        byId("date-label").textContent = "Tente novamente em instantes";
        byId("devotional-title").textContent = "Deus continua perto";
        byId("impact-phrase").textContent = "Mesmo quando algo falha, a fidelidade do Senhor permanece.";
        byId("reflection-text").textContent = "Não conseguimos abrir a mensagem de hoje. Verifique sua conexão e atualize a página.";
        byId("prayer-text").textContent = "Senhor, traz paz ao meu coração e conduz o meu dia. Amém.";
        byId("daily-action").textContent = "Respire fundo e leia Salmos 46.";
      }
    }
  }

  async function shareCurrent() {
    if (!state.current) return;
    var shareText = state.current.tema + "\n“" + state.current.frase + "”\n" + state.current.referencia + "\n\nDiário da Fé Digital";
    var shareData = { title: state.current.tema, text: shareText, url: window.location.href.split("#")[0] };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard) { await navigator.clipboard.writeText(shareText + "\n" + shareData.url); showToast("Palavra copiada. Agora é só enviar."); }
      else showToast("Use o menu do navegador para compartilhar.");
    } catch (error) { if (error && error.name !== "AbortError") showToast("Não foi possível compartilhar agora."); }
  }

  function updateInstallButton() {
    var button = byId("install-button");
    if (isStandalone()) { button.innerHTML = "<span aria-hidden=\"true\">✓</span> Instalado no celular"; button.disabled = true; }
  }
  async function installApp() {
    if (isStandalone()) { showToast("O aplicativo já está instalado."); return; }
    if (state.deferredInstall) { state.deferredInstall.prompt(); await state.deferredInstall.userChoice; state.deferredInstall = null; updateInstallButton(); return; }
    if (isIOS()) { openDialog(byId("install-dialog")); return; }
    showToast("Abra o menu do navegador e escolha “Instalar aplicativo”.");
  }

  function updateNotificationStatus() {
    if (!state.oneSignal) return;
    var button = byId("notify-button");
    var status = byId("status-message");
    var subscription = state.oneSignal.User.PushSubscription;
    if (subscription.optedIn) { button.innerHTML = "<span aria-hidden=\"true\">✓</span> Mensagens ativadas"; status.textContent = "Tudo certo! Você receberá uma palavra bíblica pela manhã."; }
    else { button.innerHTML = "<span aria-hidden=\"true\">♡</span> Receber mensagem diária"; status.textContent = isIOS() && !isStandalone() ? "No iPhone, instale o aplicativo antes de ativar as mensagens." : "Toque para permitir uma notificação bíblica por dia."; }
    button.disabled = false;
  }
  async function requestNotifications() {
    if (isIOS() && !isStandalone()) { openDialog(byId("install-dialog")); byId("status-message").textContent = "Depois de instalar, abra pelo ícone e ative as mensagens."; return; }
    if (!state.oneSignal) { openDialog(byId("setup-dialog")); return; }
    var button = byId("notify-button"); button.disabled = true; byId("status-message").textContent = "Abrindo a autorização do aparelho…";
    try { if (!state.oneSignal.Notifications.isPushSupported()) throw new Error("Este navegador não oferece notificações."); await state.oneSignal.User.PushSubscription.optIn(); window.setTimeout(updateNotificationStatus, 600); }
    catch (error) { button.disabled = false; byId("status-message").textContent = error && error.message ? error.message : "Não foi possível ativar agora."; }
  }
  function setupOneSignal() {
    var appId = String(config.oneSignalAppId || "").trim();
    var button = byId("notify-button");
    if (!appId || appId.indexOf("COLE_AQUI") !== -1) { byId("status-message").textContent = "Versão de teste: falta conectar o serviço de notificações."; button.addEventListener("click", function () { openDialog(byId("setup-dialog")); }); return; }
    button.disabled = true; byId("status-message").textContent = "Preparando as mensagens diárias…"; window.OneSignalDeferred = window.OneSignalDeferred || [];
    var sdk = document.createElement("script"); sdk.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"; sdk.defer = true;
    sdk.onerror = function () { button.disabled = false; byId("status-message").textContent = "Não foi possível preparar as notificações. Tente novamente."; };
    document.head.appendChild(sdk);
    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        var basePath = new URL(".", window.location.href).pathname; if (basePath.charAt(basePath.length - 1) !== "/") basePath += "/";
        var workerPath = basePath.substring(1) + "push/onesignal/OneSignalSDKWorker.js";
        await OneSignal.init({ appId: appId, serviceWorkerPath: workerPath, serviceWorkerParam: { scope: basePath + "push/onesignal/" }, autoResubscribe: true, persistNotification: false, promptOptions: { slidedown: { prompts: [{ type: "push", autoPrompt: false, text: { actionMessage: "Receba uma palavra bíblica para começar bem cada dia.", acceptButton: "Permitir", cancelButton: "Agora não" } }] } }, welcomeNotification: { title: "Diário da Fé Digital", message: "Pronto! Você receberá uma palavra bíblica todos os dias." } });
        state.oneSignal = OneSignal; OneSignal.User.PushSubscription.addEventListener("change", updateNotificationStatus); updateNotificationStatus(); button.addEventListener("click", requestNotifications);
      } catch (error) { button.disabled = false; byId("status-message").textContent = "Confira o App ID e o endereço configurado no OneSignal."; }
    });
  }

  function setupEvents() {
    byId("share-button").addEventListener("click", shareCurrent); byId("install-button").addEventListener("click", installApp);
    window.addEventListener("beforeinstallprompt", function (event) { event.preventDefault(); state.deferredInstall = event; });
    window.addEventListener("appinstalled", function () { state.deferredInstall = null; updateInstallButton(); showToast("Aplicativo instalado com sucesso."); });
  }
  function watchDayChange() { window.setInterval(function () { var currentKey = dateKey(new Date()); if (state.renderedDateKey && currentKey !== state.renderedDateKey) loadDevotional(); }, 60000); }
  function registerOfflineWorker() { if ("serviceWorker" in navigator) window.addEventListener("load", function () { navigator.serviceWorker.register("./sw.js").catch(function () {}); }); }

  loadDevotional();
  setupEvents();
  updateInstallButton();
  setupOneSignal();
  watchDayChange();
  registerOfflineWorker();
})();
