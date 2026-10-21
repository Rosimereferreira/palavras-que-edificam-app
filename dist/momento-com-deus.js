(function(){"use strict";
function init(){
 var box=document.getElementById("momento-com-deus");if(!box)return;
 var start=box.querySelector("[data-momento-start]"),next=box.querySelector("[data-momento-next]"),panel=box.querySelector("[data-momento-panel]"),heading=box.querySelector("[data-momento-heading]"),body=box.querySelector("[data-momento-body]"),stepText=box.querySelector("[data-momento-step]");
 if(!start||!next||!panel||!heading||!body||!stepText)return;
 var step=-1;
 function read(id){var el=document.getElementById(id);return el?(el.textContent||"").trim():""}
 function clean(t){return t.replace(/\s+/g," ").trim()}
 var steps=[
  {title:"1. Aquiete o coração 🌿",text:function(){return "Respire com calma. Por alguns instantes, deixe as preocupações de lado e reconheça que Deus está presente com você."}},
  {title:"2. Medite na Palavra 📖",text:function(){var verse=clean(read(box.getAttribute("data-momento-verse")));var title=clean(read(box.getAttribute("data-momento-title")));return (title?"Hoje, a palavra é: "+title+". ":"")+(verse?"Releia e medite: "+verse:"Pense na reflexão que acabou de ler.")+" O que Deus está ensinando ao seu coração?";}},
  {title:"3. Converse com Deus 🙏",text:function(){var prayer=clean(read(box.getAttribute("data-momento-prayer")));return prayer||"Converse com Deus com suas próprias palavras. Agradeça, entregue suas preocupações e peça direção para este dia."}}
 ];
 function render(){if(step<0){panel.hidden=true;start.hidden=false;return}panel.hidden=false;start.hidden=true;heading.textContent=steps[step].title;body.textContent=steps[step].text();stepText.textContent="Passo "+(step+1)+" de 3";next.textContent=step===2?"✓ Concluir meu momento":"Continuar →"}
 start.addEventListener("click",function(){step=0;render();panel.scrollIntoView({behavior:"smooth",block:"nearest"})});
 next.addEventListener("click",function(){if(step===2){step=-1;render();start.textContent="🙏 Fazer novamente";return}step++;render()});
 var watch=box.getAttribute("data-momento-watch");if(watch&&window.MutationObserver){var target=document.getElementById(watch);if(target){new window.MutationObserver(function(){if(step>=0){step=-1;render()}}).observe(target,{childList:true,characterData:true,subtree:true})}}
 render();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();