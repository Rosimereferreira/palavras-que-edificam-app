"use strict";

var CACHE_NAME = "diario-da-fe-digital-v45";
var APP_FILES = [
  "./",
  "./index.html",
  "./biblia.html",
  "./oracoes.html",
  "./jornadas.html",
  "./caminhada.html",
  "./desafios.html",
  "./jardim.html",
  "./jardim.js",
  "./backup.html",
  "./ajuda.html",
  "./backup.js",
  "./compartilhar.html",
  "./styles.css",
  "./app.js",
  "./momento-com-deus.js",
  "./analytics.js",
  "./annual-devotional.js",
  "./config.js",
  "./devocionais.json",
  "./outubro-mulheres.json",
  "./series-1.json",
  "./series-2.json",
  "./series-3.json",
  "./series-4.json",
  "./manifest.webmanifest",
  "./icons/logo-diario-da-fe.svg",
  "./icons/icon-outubro-v2-maskable-512.png",
  "./icons/icon-outubro-v2-512.png",
  "./icons/icon-outubro-v2-192.png",
  "./icons/icon-outubro-v2-180.png",
  "./icons/logo-diario-da-fe.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_FILES);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        return key === CACHE_NAME || key.indexOf("diario-da-fe-digital-v") !== 0 ? Promise.resolve() : caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  var requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin || !requestUrl.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  var preferNetwork = event.request.mode === "navigate" ||
    requestUrl.pathname.endsWith("/config.js") ||
    requestUrl.pathname.endsWith("/annual-devotional.js") ||
    requestUrl.pathname.endsWith("/devocionais.json") ||
    requestUrl.pathname.endsWith("/outubro-mulheres.json") ||
    requestUrl.pathname.includes("/series-");

  if (preferNetwork) {
    event.respondWith(
      fetch(event.request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        }
        return response;
      }).catch(function () {
        return caches.match(event.request,{ignoreSearch:true}).then(function (cached) {
          return cached || caches.match("./index.html");
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request,{ignoreSearch:true}).then(function (cached) {
      var network = fetch(event.request).then(function (response) {
        if (response && response.ok && response.type === "basic") {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        }
        return response;
      }).catch(function () {
        if (event.request.mode === "navigate") return caches.match("./index.html");
        return cached;
      });
      return cached || network;
    })
  );
});
