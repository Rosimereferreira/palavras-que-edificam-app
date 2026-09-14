/*
 * Configuração pública do Diário da Fé Digital.
 * A App API Key do OneSignal nunca deve ser colocada aqui.
 */
window.APP_CONFIG = Object.freeze({
  oneSignalAppId: "336185ce-bb64-4f44-b68e-b43c75d68f18",
  timeZone: "America/Campo_Grande"
});

/*
 * O plano anual é carregado separadamente para manter o aplicativo simples.
 * São 52 temas semanais (364 dias) + 1 devocional especial, totalizando 365 dias.
 */
window.addEventListener("load", function () {
  var script = document.createElement("script");
  script.src = "./annual-devotional.js?v=1";
  script.async = true;
  document.body.appendChild(script);
});
