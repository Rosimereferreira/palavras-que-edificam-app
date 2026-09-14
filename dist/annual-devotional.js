(function () {
  "use strict";

  var TIME_ZONE = "America/Campo_Grande";
  var SERIES_START_UTC = Date.UTC(2026, 8, 15);

  var giantPhrases = [
    "O que te assusta hoje não é maior do que o Deus que está com você.",
    "Quanto mais você mede o gigante, menor você se sente; quanto mais olha para Deus, maior sua fé se torna.",
    "Você não precisa copiar a estratégia de outra pessoa para viver a vitória que Deus preparou para você.",
    "Uma pequena atitude de fé pode ser a pedra que inicia uma grande mudança.",
    "A coragem não espera o medo desaparecer; ela avança confiando em quem Deus é.",
    "A vitória não é licença para orgulho; é motivo para testemunhar a fidelidade de Deus.",
    "Não guarde apenas a memória do gigante; guarde a memória do Deus que deu a vitória."
  ];

  var phrases = [
    "Uma verdade recebida pela fé pode mudar a forma como você atravessa este dia.",
    "Deus não perdeu o controle da área da sua vida que hoje mais precisa de cuidado.",
    "Você não precisa ter todas as respostas para responder a Deus com fé hoje.",
    "O próximo passo pode ser simples, mas a obediência nunca é pequena nas mãos de Deus.",
    "A fé cresce quando você troca a pressa de controlar pela coragem de confiar.",
    "Deus pode usar uma decisão de hoje para iniciar uma mudança muito maior amanhã.",
    "Guarde esta verdade: Deus continua fiel, mesmo quando o processo ainda não terminou."
  ];

  var reflectionOpeners = [
    "Existem dias em que Deus nos chama a olhar para a situação por uma perspectiva diferente.",
    "Nem sempre o que sentimos revela tudo o que Deus está fazendo.",
    "A vida com Deus também é construída nas decisões pequenas e silenciosas.",
    "Algumas batalhas começam a mudar quando o nosso coração volta para a verdade da Palavra.",
    "Deus não desperdiça processos; Ele pode usar este dia para fortalecer algo dentro de você.",
    "Quando a pressão aumenta, precisamos lembrar onde está firmada a nossa confiança.",
    "A Palavra de Deus nos convida a não terminar o dia da mesma maneira que começamos."
  ];

  var reflectionClosers = [
    "Não permita que o tamanho do desafio determine o tamanho da sua esperança. Caminhe hoje lembrando que Deus continua presente.",
    "Leve essa verdade para as situações reais do seu dia. Fé não é negar a realidade, mas permitir que Deus tenha a palavra final.",
    "Talvez você não consiga resolver tudo hoje, mas pode escolher um passo de fé. Deus sabe trabalhar com corações disponíveis.",
    "Ore antes de reagir, escute antes de decidir e confie antes de desistir. O Senhor continua conduzindo sua história.",
    "O processo ainda pode não ter terminado, mas isso não significa que Deus parou. Permaneça sensível ao que Ele está ensinando.",
    "Não carregue sozinha aquilo que pode ser colocado diante do Senhor. A presença de Deus muda a maneira como atravessamos a batalha.",
    "Guarde essa palavra no coração e pratique-a. Uma verdade vivida hoje pode se transformar no testemunho de amanhã."
  ];

  var tasks = [
    "Escreva qual é o maior desafio diante de você hoje e ore declarando que Deus é maior do que ele.",
    "Leia novamente o versículo de hoje em voz alta e transforme-o em uma oração pessoal.",
    "Identifique uma atitude que precisa mudar e dê hoje um pequeno passo de obediência.",
    "Separe cinco minutos sem distrações e converse com Deus especificamente sobre esta área da sua vida.",
    "Anote uma verdade que Deus está lhe ensinando nesta semana e carregue-a com você durante o dia.",
    "Envie uma mensagem de encorajamento para alguém que também precisa desta palavra.",
    "Antes de dormir, registre uma evidência da fidelidade de Deus que você percebeu hoje."
  ];

  function partsInZone(date) {
    var formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "numeric",
      day: "numeric"
    });
    var values = {};
    formatter.formatToParts(date).forEach(function (part) {
      if (part.type !== "literal") values[part.type] = Number(part.value);
    });
    return values;
  }

  function cycleDay(date) {
    var p = partsInZone(date);
    var todayUtc = Date.UTC(p.year, p.month - 1, p.day);
    var elapsed = Math.floor((todayUtc - SERIES_START_UTC) / 86400000);
    return ((elapsed % 365) + 365) % 365;
  }

  function formattedDate(date) {
    var text = new Intl.DateTimeFormat("pt-BR", {
      timeZone: TIME_ZONE,
      weekday: "long",
      day: "2-digit",
      month: "long"
    }).format(date);
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function buildDevotional(series, seriesIndex, dayIndex) {
    var daily = series.dias[dayIndex];
    var phrase = seriesIndex === 0 ? giantPhrases[dayIndex] : phrases[dayIndex];
    var reflection = reflectionOpeners[dayIndex] + " Nesta semana estamos refletindo sobre “" + series.serie + "”, e a palavra de hoje é “" + daily.tema + "”. " + daily.versiculo + " " + reflectionClosers[dayIndex];
    var prayer = "Senhor, fala comigo através desta palavra sobre " + series.serie.toLowerCase() + ". Ajuda-me a viver a verdade de “" + daily.tema + "” com fé, sabedoria e obediência. Fortalece meu coração e conduz minhas decisões hoje. Em nome de Jesus, amém.";

    return {
      tema: daily.tema,
      frase: phrase,
      referencia: daily.referencia,
      versiculo: daily.versiculo,
      reflexao: reflection,
      oracao: prayer,
      tarefa: tasks[dayIndex]
    };
  }

  function render(d) {
    var set = function (id, value) {
      var el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    set("date-label", formattedDate(new Date()));
    set("devotional-title", d.tema);
    set("impact-phrase", d.frase);
    set("verse-text", d.versiculo);
    set("verse-reference", d.referencia);
    set("reflection-text", d.reflexao);
    set("prayer-text", d.oracao);
    set("daily-action", d.tarefa);
    document.title = d.tema + " | Diário da Fé Digital";
  }

  async function activateAnnualPlan() {
    try {
      var groups = await Promise.all([1, 2, 3, 4].map(function (number) {
        return fetch("./series-" + number + ".json", { cache: "no-store" }).then(function (response) {
          if (!response.ok) throw new Error("Série não encontrada");
          return response.json();
        });
      }));
      var series = groups.flat();
      if (series.length !== 52) throw new Error("O plano anual precisa ter 52 séries semanais");

      var day = cycleDay(new Date());
      if (day === 364) {
        render({
          tema: "Paz no coração",
          frase: "A oração transforma o lugar onde a ansiedade queria construir morada.",
          referencia: "Filipenses 4:6–7",
          versiculo: "Apresente seus pedidos a Deus, e a paz dele guardará o seu coração e a sua mente.",
          reflexao: "Depois de uma caminhada inteira de palavras, termine este ciclo lembrando que a paz de Deus não depende de todas as respostas estarem prontas. Entregue o que pesa, agradeça pelo caminho percorrido e permita que o Senhor guarde seu coração para um novo começo.",
          oracao: "Pai, obrigada por Tua fidelidade em cada dia. Entrego a Ti minhas preocupações e recebo a Tua paz. Prepara meu coração para um novo ciclo contigo. Em nome de Jesus, amém.",
          tarefa: "Faça uma oração de gratidão pelo ciclo vivido e escreva três motivos para confiar em Deus no novo começo."
        });
        return;
      }

      var seriesIndex = Math.floor(day / 7);
      var dayIndex = day % 7;
      render(buildDevotional(series[seriesIndex], seriesIndex, dayIndex));
    } catch (error) {
      console.error("Plano anual:", error);
    }
  }

  if (document.readyState === "complete") {
    activateAnnualPlan();
  } else {
    window.addEventListener("load", function () {
      window.setTimeout(activateAnnualPlan, 150);
    });
  }
})();
