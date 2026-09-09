(function () {
  "use strict";

  var config = window.APP_CONFIG || {};
  var timeZone = config.timeZone || "America/Campo_Grande";
  var state = {
    devotionals: [],
    current: null,
    deferredInstall: null,
    oneSignal: null,
    toastTimer: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
  }

  function openDialog(dialog) {
    if (dialog && typeof dialog.showModal === "function") {
      dialog.showModal();
    }
  }

  function showToast(message) {
    var toast = byId("toast");
    window.clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.classList.add("visible");
    state.toastTimer = window.setTimeout(function () {
      toast.classList.remove("visible");
    }, 2800);
  }

  function datePartsInZone(date) {
    var formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric"
    });
    var parts = formatter.formatToParts(date);
    var values = {};
    parts.forEach(function (part) {
      if (part.type !== "literal") {
        values[part.type] = Number(part.value);
      }
    });
    return {
      year: values.year,
      month: values.month,
      day: values.day
    };
  }

  function devotionalIndex(date, total) {
    var parts = datePartsInZone(date);
    var todayUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
    var anchorUtc = Date.UTC(2026, 0, 1);
    var elapsedDays = Math.floor((todayUtc - anchorUtc) / 86400000);
    return ((elapsedDays % total) + total) % total;
  }

  function formattedDate(date) {
    var text = new Intl.DateTimeFormat("pt-BR", {
      timeZone: timeZone,
      weekday: "long",
      day: "2-digit",
      month: "long"
    }).format(date);
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function renderDevotional(devotional) {
    state.current = devotional;
    byId("date-label").textContent = formattedDate(new Date());
    byId("devotional-title").textContent = devotional.tema;
    byId("impact-phrase").textContent = devotional.frase;
    byId("verse-text").textContent = devotional.versiculo;
    byId("verse-reference").textContent = devotional.referencia;
    byId("reflection-text").textContent = devotional.reflexao;
    byId("prayer-text").textContent = devotional.oracao;
    byId("daily-action").textContent = devotional.tarefa;
    document.title = devotional.tema + " | Palavras que Edificam";
  }

  async function loadDevotional() {
    try {
      var response = await fetch("./devocionais.json");
      if (!response.ok) {
        throw new Error("Não foi possível carregar os devocionais.");
      }
      state.devotionals = await response.json();
      if (!Array.isArray(state.devotionals) || state.devotionals.length === 0) {
        throw new Error("A lista de devocionais está vazia.");
      }
      renderDevotional(state.devotionals[devotionalIndex(new Date(), state.devotionals.length)]);
    } catch (error) {
      byId("date-label").textContent = "Tente novamente em instantes";
      byId("devotional-title").textContent = "Deus continua perto";
      byId("impact-phrase").textContent = "Mesmo quando algo falha, a fidelidade do Senhor permanece.";
      byId("reflection-text").textContent = "Não conseguimos abrir a mensagem de hoje. Verifique sua conexão e atualize a página.";
      byId("prayer-text").textContent = "Senhor, traz paz ao meu coração e conduz o meu dia. Amém.";
      byId("daily-action").textContent = "Respire fundo e leia Salmos 46.";
    }
  }

  async function shareCurrent() {
    if (!state.current) {
      return;
    }
    var shareText = state.current.tema + "\n“" + state.current.frase + "”\n" +
      state.current.referencia + "\n\nPalavras que Edificam";
    var shareData = {
      title: state.current.tema,
      text: shareText,
      url: window.location.href.split("#")[0]
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText + "\n" + shareData.url);
        showToast("Palavra copiada. Agora é só enviar.");
      } else {
        showToast("Use o menu do navegador para compartilhar.");
      }
    } catch (error) {
      if (error && error.name !== "AbortError") {
        showToast("Não foi possível compartilhar agora.");
      }
    }
  }

  function updateInstallButton() {
    var button = byId("install-button");
    if (isStandalone()) {
      button.innerHTML = "<span aria-hidden=\"true\">✓</span> Instalado no celular";
      button.disabled = true;
    }
  }

  async function installApp() {
    if (isStandalone()) {
      showToast("O aplicativo já está instalado.");
      return;
    }

    if (state.deferredInstall) {
      state.deferredInstall.prompt();
      await state.deferredInstall.userChoice;
      state.deferredInstall = null;
      updateInstallButton();
      return;
    }

    if (isIOS()) {
      openDialog(byId("install-dialog"));
      return;
    }

    showToast("Abra o menu do navegador e escolha “Instalar aplicativo”.");
  }

  function updateNotificationStatus() {
    if (!state.oneSignal) {
      return;
    }

    var button = byId("notify-button");
    var status = byId("status-message");
    var subscription = state.oneSignal.User.PushSubscription;

    if (subscription.optedIn) {
      button.innerHTML = "<span aria-hidden=\"true\">✓</span> Mensagens ativadas";
      status.textContent = "Tudo certo! Você receberá uma palavra bíblica pela manhã.";
    } else {
      button.innerHTML = "<span aria-hidden=\"true\">♡</span> Receber mensagem diária";
      status.textContent = isIOS() && !isStandalone()
        ? "No iPhone, instale o aplicativo antes de ativar as mensagens."
        : "Toque para permitir uma notificação bíblica por dia.";
    }
    button.disabled = false;
  }

  async function requestNotifications() {
    if (isIOS() && !isStandalone()) {
      openDialog(byId("install-dialog"));
      byId("status-message").textContent =
        "Depois de instalar, abra pelo ícone e ative as mensagens.";
      return;
    }

    if (!state.oneSignal) {
      openDialog(byId("setup-dialog"));
      return;
    }

    var button = byId("notify-button");
    button.disabled = true;
    byId("status-message").textContent = "Abrindo a autorização do aparelho…";

    try {
      if (!state.oneSignal.Notifications.isPushSupported()) {
        throw new Error("Este navegador não oferece notificações.");
      }
      await state.oneSignal.User.PushSubscription.optIn();
      window.setTimeout(updateNotificationStatus, 600);
    } catch (error) {
      button.disabled = false;
      byId("status-message").textContent =
        error && error.message ? error.message : "Não foi possível ativar agora.";
    }
  }

  function setupOneSignal() {
    var appId = String(config.oneSignalAppId || "").trim();
    var button = byId("notify-button");

    if (!appId || appId.indexOf("COLE_AQUI") !== -1) {
      byId("status-message").textContent =
        "Versão de teste: falta conectar o serviço de notificações.";
      button.addEventListener("click", function () {
        openDialog(byId("setup-dialog"));
      });
      return;
    }

    button.disabled = true;
    byId("status-message").textContent = "Preparando as mensagens diárias…";
    window.OneSignalDeferred = window.OneSignalDeferred || [];

    var sdk = document.createElement("script");
    sdk.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    sdk.defer = true;
    sdk.onerror = function () {
      button.disabled = false;
      byId("status-message").textContent =
        "Não foi possível preparar as notificações. Tente novamente.";
    };
    document.head.appendChild(sdk);

    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        var basePath = new URL(".", window.location.href).pathname;
        if (basePath.charAt(basePath.length - 1) !== "/") {
          basePath += "/";
        }
        var workerPath = basePath.substring(1) +
          "push/onesignal/OneSignalSDKWorker.js";

        await OneSignal.init({
          appId: appId,
          serviceWorkerPath: workerPath,
          serviceWorkerParam: {
            scope: basePath + "push/onesignal/"
          },
          autoResubscribe: true,
          persistNotification: false,
          promptOptions: {
            slidedown: {
              prompts: [{
                type: "push",
                autoPrompt: false,
                text: {
                  actionMessage: "Receba uma palavra bíblica para começar bem cada dia.",
                  acceptButton: "Permitir",
                  cancelButton: "Agora não"
                }
              }]
            }
          },
          welcomeNotification: {
            title: "Palavras que Edificam",
            message: "Pronto! Você receberá uma palavra bíblica todos os dias."
          }
        });

        state.oneSignal = OneSignal;
        OneSignal.User.PushSubscription.addEventListener(
          "change",
          updateNotificationStatus
        );
        updateNotificationStatus();
        button.addEventListener("click", requestNotifications);
      } catch (error) {
        button.disabled = false;
        byId("status-message").textContent =
          "Confira o App ID e o endereço configurado no OneSignal.";
      }
    });
  }

  function setupEvents() {
    byId("share-button").addEventListener("click", shareCurrent);
    byId("install-button").addEventListener("click", installApp);

    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      state.deferredInstall = event;
    });

    window.addEventListener("appinstalled", function () {
      state.deferredInstall = null;
      updateInstallButton();
      showToast("Aplicativo instalado com sucesso.");
    });
  }

  function registerOfflineWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("./sw.js").catch(function () {
          // O aplicativo continua funcionando online se o modo offline falhar.
        });
      });
    }
  }

  loadDevotional();
  setupEvents();
  updateInstallButton();
  setupOneSignal();
  registerOfflineWorker();
})();
