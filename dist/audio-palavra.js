(function(){
"use strict";
var synth=window.speechSynthesis;
function init(){
  var host=document.getElementById("audio-palavra"),start=document.getElementById("audio-start"),pause=document.getElementById("audio-pause"),stop=document.getElementById("audio-stop"),rate=document.getElementById("audio-rate"),status=document.getElementById("audio-status");
  if(!host||!start||!pause||!stop||!rate||!status)return;
  if(!synth||typeof window.SpeechSynthesisUtterance!=="function"){host.hidden=true;return}
  var chunks=[],index=0,playing=false,paused=false,session=0,voice=null;
  function chooseVoice(){var voices=synth.getVoices?synth.getVoices():[];var pt=voices.filter(function(v){return /^pt([-_]|$)/i.test(v.lang||"")});voice=pt.find(function(v){return /^pt[-_]BR$/i.test(v.lang||"")&&v.localService})||pt.find(function(v){return /^pt[-_]BR$/i.test(v.lang||"")})||pt[0]||null}
  chooseVoice();if(synth.addEventListener)synth.addEventListener("voiceschanged",chooseVoice);
  function update(){start.textContent=playing?"↻ Ouvir novamente":"▶ Ouvir a Palavra";pause.textContent=paused?"▶ Continuar":"⏸ Pausar";pause.disabled=!playing;stop.disabled=!playing;start.setAttribute("aria-pressed",String(playing))}
  function end(message){session++;playing=false;paused=false;chunks=[];index=0;try{synth.cancel()}catch(e){}status.textContent=message||"Leitura encerrada.";update()}
  function getText(){var ids=host.getAttribute("data-audio-ids").split(",");var parts=[];ids.forEach(function(id){var el=document.getElementById(id.trim());if(el){var text=(el.textContent||"").trim();if(text&&text.indexOf("carregando versículo")===-1&&text.indexOf("não foi possível carregar")===-1)parts.push(text)}});return parts.join(".\n\n")}
  function splitText(text){var result=[];text.split(/(?<=[.!?;:])\s+|\n+/).forEach(function(part){part=part.trim();if(!part)return;while(part.length>190){var cut=part.lastIndexOf(" ",190);if(cut<60)cut=190;result.push(part.slice(0,cut));part=part.slice(cut).trim()}if(part)result.push(part)});return result}
  function speakNext(token){if(token!==session||!playing||paused)return;if(index>=chunks.length){end("Leitura concluída. Que esta Palavra permaneça em seu coração. 💗");return}
    var utter=new SpeechSynthesisUtterance(chunks[index++]);utter.lang=voice?voice.lang:"pt-BR";if(voice)utter.voice=voice;utter.rate=Number(rate.value)||.9;utter.pitch=1;utter.onend=function(){if(token===session)speakNext(token)};utter.onerror=function(e){if(token!==session)return;if(e.error==="interrupted"||e.error==="canceled")return;end("Não foi possível continuar a leitura. Tente novamente.")};
    try{synth.speak(utter);status.textContent="🔊 Lendo a Palavra em voz alta…"}catch(e){end("Seu navegador não conseguiu iniciar a leitura.")}}
  start.addEventListener("click",function(){var text=getText();if(!text){status.textContent="Aguarde a Palavra carregar e tente novamente.";return}end("");chunks=splitText(text);index=0;playing=true;paused=false;var token=session;update();speakNext(token)});
  pause.addEventListener("click",function(){if(!playing)return;try{if(paused){synth.resume();paused=false;status.textContent="🔊 Leitura retomada."}else{synth.pause();paused=true;status.textContent="⏸ Leitura pausada."}update()}catch(e){end("Não foi possível pausar ou continuar. Tente ouvir novamente.")}});
  stop.addEventListener("click",function(){end("Leitura interrompida.")});
  rate.addEventListener("change",function(){if(playing)status.textContent="Velocidade alterada. Será aplicada ao próximo trecho."});
  var watched=host.getAttribute("data-audio-watch");if(watched){var el=document.getElementById(watched);if(el&&window.MutationObserver){var observer=new window.MutationObserver(function(){if(playing)end("A Palavra mudou. Toque em Ouvir para começar a nova leitura.")});observer.observe(el,{childList:true,characterData:true,subtree:true})}}
  window.addEventListener("pagehide",function(){if(playing)end("")});update()
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();