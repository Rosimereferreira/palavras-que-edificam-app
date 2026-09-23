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

  var seriesCore = {
    "Amor de Deus": "O amor de Deus não é prêmio por desempenho. Ele nasce do caráter de Deus e foi revelado em Cristo antes que pudéssemos merecê-lo.",
    "Perdão": "Perdoar não apaga a verdade nem chama a ferida de pequena; é recusar que a dor continue governando o coração.",
    "Aliança": "Aliança é fidelidade que permanece quando a emoção oscila; é compromisso sustentado por verdade, responsabilidade e presença.",
    "Fidelidade": "Fidelidade é permanecer inteiro diante de Deus também nas pequenas escolhas que ninguém vê.",
    "Entrega": "Entregar não é desistir da vida, mas devolver a Deus o lugar de governo que a ansiedade tenta ocupar.",
    "Fé": "Fé bíblica não ignora a realidade; ela escolhe interpretar a realidade a partir de quem Deus é.",
    "Oração": "Oração é relacionamento antes de ser pedido: nela o coração se abre, se alinha e aprende a reconhecer a presença de Deus.",
    "Cura da Alma": "Deus não trata nossas feridas com pressa nem superficialidade; Ele nos encontra na verdade para restaurar o que foi quebrado.",
    "Identidade em Deus": "Nossa identidade mais profunda não nasce de rótulos, aprovação ou rejeição, mas do que Deus declara sobre nós em Cristo.",
    "Coragem": "Coragem não é ausência de medo; é não entregar ao medo o direito de decidir por nós.",
    "Espera": "Esperar em Deus não é ficar parada; é amadurecer sem forçar portas que ainda não foram abertas.",
    "Propósito": "Propósito não começa no palco, mas na fidelidade ao que Deus colocou diante de nós hoje.",
    "Família": "A fé dentro de casa é construída em palavras, perdão, presença e escolhas repetidas de amor.",
    "Casamento e Relacionamentos": "Relacionamentos saudáveis exigem graça e verdade caminhando juntas; amor sem verdade adoece, e verdade sem amor fere.",
    "Amizades e Comunhão": "Deus também nos sustenta por meio de vínculos seguros, maduros e capazes de nos aproximar da verdade.",
    "Sabedoria": "Sabedoria é mais do que saber muito; é discernir o que honra a Deus antes de agir.",
    "Paz": "A paz de Deus não depende de um cenário perfeito; ela nasce de um coração governado pela presença de Cristo.",
    "Ansiedade e Descanso": "Descansar em Deus não elimina responsabilidades, mas impede que o peso delas ocupe o lugar da confiança.",
    "Gratidão": "Gratidão não nega o que falta; ela se recusa a esquecer o que Deus já sustentou.",
    "Obediência": "Obediência é confiança em movimento: fazemos o que Deus mostra mesmo quando ainda não enxergamos todo o caminho.",
    "Santidade": "Santidade não é aparência religiosa, mas uma vida que aprende a pertencer a Deus também no secreto.",
    "Graça": "Graça não é permissão para permanecer igual; é o favor de Deus que nos recebe e também nos transforma.",
    "Misericórdia": "Misericórdia olha a verdade da queda sem reduzir a pessoa ao pior momento de sua história.",
    "Esperança": "Esperança cristã não é otimismo vazio; é confiança no caráter de Deus quando o final ainda não pode ser visto.",
    "Perseverança": "Perseverar é continuar fiel sem confundir cansaço com fracasso nem demora com abandono.",
    "Recomeços": "Em Deus, recomeçar não significa fingir que nada aconteceu, mas permitir que a graça escreva um novo capítulo com verdade.",
    "Chamado": "O chamado de Deus não depende de perfeição, mas de disponibilidade, formação e fidelidade ao que Ele confiou.",
    "Liderança Servidora": "Liderança no Reino não é controle; é responsabilidade, exemplo e disposição para servir pessoas sem usá-las.",
    "Fruto do Espírito": "O fruto do Espírito revela o que Deus está formando por dentro antes de qualquer performance por fora.",
    "Domínio Próprio": "Domínio próprio é liberdade para não ser governada por impulsos, emoções ou hábitos que nos afastam do que importa.",
    "Alegria no Senhor": "A alegria do Senhor é uma fonte mais profunda do que o humor do dia; ela pode coexistir com processos difíceis.",
    "Confiança": "Confiar em Deus é descansar no caráter dEle quando nossas explicações ainda estão incompletas.",
    "Provisão": "A provisão de Deus nos ensina dependência, responsabilidade e contentamento, não passividade.",
    "Proteção": "A proteção de Deus não promete ausência de vales, mas presença, direção e cuidado enquanto os atravessamos.",
    "Direção de Deus": "Deus costuma iluminar o próximo passo antes de mostrar a estrada inteira; direção também exige obediência ao que já ficou claro.",
    "Palavra de Deus": "A Palavra não foi dada apenas para informar, mas para confrontar, consolar, corrigir e formar nossa maneira de viver.",
    "Espírito Santo": "O Espírito Santo não é uma ideia distante; Ele consola, ensina, convence, fortalece e conduz a vida de quem se rende a Deus.",
    "Adoração": "Adoração é oferecer a Deus mais do que uma canção: é colocar escolhas, prioridades e coração diante dEle.",
    "Serviço": "Servir como Jesus é amar de maneira prática sem transformar entrega em necessidade de aprovação.",
    "Generosidade": "Generosidade nasce quando entendemos que recebemos de Deus para também nos tornarmos canal de cuidado.",
    "Humildade": "Humildade não é pensar menos de si, mas não precisar colocar a si mesma no centro de tudo.",
    "Justiça e Compaixão": "A fé que toca o coração também abre nossos olhos para a dor do outro e nos chama a agir com justiça e compaixão.",
    "Unidade": "Unidade não exige que todos sejam iguais; exige maturidade para preservar o amor sem abandonar a verdade.",
    "Batalha Espiritual": "A batalha espiritual é enfrentada com verdade, oração, obediência e a obra de Cristo — não com medo de pessoas.",
    "Promessas de Deus": "As promessas de Deus devem ser seguradas junto com o caráter de quem prometeu, sem manipular o processo.",
    "Tempo de Deus": "O tempo de Deus não é desperdício; muitas vezes aquilo que parece demora está formando estrutura para sustentar a resposta.",
    "Milagres": "Milagres apontam para quem Deus é e nos chamam à fé, mas nunca substituem obediência, processo e gratidão.",
    "Restauração": "Restauração verdadeira não apenas devolve o que se perdeu; ela trata as rachaduras para que a história não seja reconstruída do mesmo jeito.",
    "Testemunho": "Um testemunho saudável não engrandece a nossa força, mas revela a fidelidade de Deus no meio de uma história real.",
    "Missão e Evangelismo": "Missão começa quando a presença de Jesus em nós se transforma em amor, serviço e coragem para compartilhar esperança.",
    "Eternidade e Presença de Deus": "A eternidade reorganiza nossas prioridades: esta vida importa, mas ela não é o capítulo final da história com Deus."
  };

  var loveOfGodPhrases = [
    "Você não precisa provar que merece o amor que Jesus já decidiu demonstrar.",
    "A luta pode tocar suas circunstâncias, mas não pode arrancar você do amor de Deus.",
    "Quando você se sabe profundamente amada, o medo perde o direito de governar.",
    "O amor de Deus não ficou apenas em palavras; ele tomou a forma de entrega.",
    "Você não ama para ser aceita; você aprende a amar porque primeiro foi alcançada.",
    "Amor verdadeiro aparece na forma como tratamos pessoas quando seria mais fácil reagir.",
    "Permanecer no amor de Jesus é fazer da presença dEle a casa do coração."
  ];

  var loveOfGodReflections = [
    "Antes de você acertar, melhorar ou conseguir organizar a própria vida, Deus já havia se movido em sua direção. Romanos 5:8 mostra que Cristo morreu por nós quando ainda éramos pecadores. Isso quebra a lógica de que precisamos merecer amor para então sermos recebidas. O amor de Deus não começa na sua performance; começa nEle. O que aprendemos com isso? Você pode parar de viver tentando provar valor diante de Deus e começar a responder, com gratidão e transformação, ao amor que já a alcançou.",
    "Há dias em que a dor, o silêncio ou uma resposta que não chegou fazem parecer que Deus se afastou. Mas Romanos 8:38–39 não promete uma vida sem luta; afirma que nenhuma luta tem poder para romper o amor de Deus revelado em Cristo. Sentimento de distância não é prova de abandono. O que aprendemos com isso? A circunstância pode mudar, suas emoções podem oscilar, mas o amor de Deus não precisa ser medido pelo dia que você está vivendo. Em Cristo, você continua amada, vista e sustentada.",
    "O medo sempre tenta antecipar perda, rejeição e punição. Já o amor de Deus nos ensina a descansar no caráter do Pai. 1 João 4:18 mostra que o amor aperfeiçoado lança fora o medo. Isso não significa que nunca sentiremos medo, mas que ele não precisa governar nossas decisões. O que aprendemos com isso? Quanto mais o coração conhece quem Deus é, menos espaço sobra para viver escravizada pelo pior cenário.",
    "João 3:16 revela que o amor de Deus não ficou no discurso: Ele entregou o Filho. Amor bíblico tem movimento, custo e propósito. Por isso, quando dizemos que amamos, somos chamadas a ultrapassar palavras bonitas e entrar no terreno da presença, do serviço e da entrega. O que aprendemos com isso? O amor que recebemos de Deus nos transforma em pessoas capazes de amar de maneira concreta, inclusive quando isso exige renúncia.",
    "1 João 4:19 coloca a ordem correta: nós amamos porque Ele nos amou primeiro. Muitas vezes tentamos oferecer aquilo que ainda não aprendemos a receber. Quem vive mendigando aprovação pode transformar amor em cobrança, medo ou dependência. O que aprendemos com isso? Antes de exigir de si mesma a capacidade de amar perfeitamente, deixe o amor de Deus curar suas carências e reorganizar seu coração.",
    "1 Coríntios 13 tira o amor do campo das intenções e o coloca nas atitudes: paciência, bondade, perseverança e ausência de egoísmo. É fácil falar de amor quando ninguém nos contraria; o caráter aparece quando somos frustradas, cansadas ou feridas. O que aprendemos com isso? Amor não é apenas o que sentimos por alguém, mas a maneira como escolhemos tratá-lo diante de Deus.",
    "Jesus não disse apenas que nos ama; em João 15:9 Ele nos chama a permanecer nesse amor. Permanecer é fazer morada, voltar, continuar, não viver entrando e saindo da verdade conforme o humor do dia. O que aprendemos com isso? Sua segurança espiritual cresce quando o amor de Cristo deixa de ser uma frase conhecida e passa a ser o lugar onde seus pensamentos, escolhas e identidade descansam."
  ];

  var genericImpactPhrases = [
    "A Palavra de hoje não veio apenas para informar você, mas para transformar a forma como você caminha.",
    "Aquilo que Deus revela ao coração pode mudar a maneira como você interpreta o que está vivendo.",
    "Uma verdade obedecida vale mais do que muitas verdades apenas admiradas.",
    "Deus também trabalha profundamente nas decisões que ninguém vê.",
    "O coração muda quando a verdade de Deus fala mais alto do que o medo.",
    "Uma resposta sincera a Deus hoje pode mudar o rumo dos próximos passos.",
    "Não termine esta palavra apenas emocionada; termine decidida a viver o que Deus mostrou."
  ];

  function buildGeneric(seriesItem, dayIndex) {
    var day = seriesItem.dias[dayIndex];
    var name = seriesItem.serie;
    var lower = name.toLowerCase();
    var core = seriesCore[name] || "Deus usa a Sua Palavra para revelar verdade, formar caráter e conduzir nossas escolhas.";
    var phrase = name === "Amor de Deus" ? loveOfGodPhrases[dayIndex] : genericImpactPhrases[dayIndex];

    var reflections = [
      core + " Em " + day.referencia + ", a Palavra nos mostra: " + day.versiculo + " O tema “" + day.tema + "” nos chama a sair da teoria e permitir que essa verdade alcance a vida real. O que aprendemos com isso? Deus não quer apenas mudar o que você sabe; Ele quer transformar a maneira como você responde ao que está vivendo.",
      core + " " + day.versiculo + " Há momentos em que as emoções contam uma história diferente da Palavra, e é exatamente aí que a fé precisa criar raízes. “" + day.tema + "” não é uma frase para ignorar a realidade, mas um convite para enxergá-la a partir de Deus. O que aprendemos com isso? Nem tudo o que sentimos deve receber autoridade para definir o que é verdade.",
      core + " A verdade de " + day.referencia + " nos confronta: " + day.versiculo + " Existe uma diferença entre conhecer um versículo e permitir que ele mude nossas escolhas. O que aprendemos com isso? Crescimento espiritual acontece quando a Palavra encontra uma decisão concreta, especialmente nas áreas em que obedecer custa alguma coisa.",
      core + " " + day.versiculo + " Deus não ilumina uma área da nossa vida para nos humilhar, mas para nos conduzir à liberdade. A palavra “" + day.tema + "” toca justamente o lugar onde talvez seja mais fácil fugir, justificar ou endurecer. O que aprendemos com isso? Cura e maturidade começam quando paramos de esconder de Deus aquilo que Ele já deseja tratar com graça e verdade.",
      core + " Em " + day.referencia + ", somos lembradas de que " + day.versiculo.charAt(0).toLowerCase() + day.versiculo.slice(1) + " A fé amadurece quando a verdade deixa de competir com o medo e passa a governar o coração. O que aprendemos com isso? Você não precisa esperar a circunstância mudar para começar a responder de uma maneira nova diante de Deus.",
      core + " A Palavra diz: " + day.versiculo + " Muitas mudanças profundas começam em silêncio, numa decisão que talvez ninguém perceba. “" + day.tema + "” nos lembra que Deus leva a sério o que fazemos com aquilo que Ele nos mostra. O que aprendemos com isso? Pequenas escolhas alinhadas à verdade podem construir uma vida inteira de maturidade.",
      core + " " + day.versiculo + " Depois de ouvir essa verdade, a pergunta mais importante não é apenas “o que eu senti?”, mas “o que vou viver?”. O que aprendemos com isso? A Palavra produz fruto quando continua conosco depois da leitura — nas conversas, reações, prioridades e decisões do cotidiano."
    ];

    var prayers = [
      "Senhor, leva esta verdade além da minha mente e planta-a profundamente no meu coração. Forma em mim " + lower + " de maneira sincera e prática. Que Tua Palavra conduza minhas escolhas hoje. Amém.",
      "Pai, mostra onde preciso amadurecer e dá-me graça para responder com fé. Não quero apenas compreender; quero praticar o que o Senhor está me ensinando. Amém.",
      "Deus, alinha meus pensamentos, minhas palavras e minhas atitudes à Tua vontade. Dá-me coragem para obedecer ao que já ficou claro. Amém.",
      "Senhor, toca as áreas que precisam de cura, correção e crescimento. Que eu receba Tua direção sem medo e caminhe em liberdade. Amém.",
      "Pai, quando minhas emoções falarem mais alto, lembra-me da Tua Palavra. Firma meu coração em Ti e ensina-me a confiar. Amém.",
      "Deus, usa minhas escolhas de hoje para formar algo duradouro em mim. Que minha vida reflita a verdade que estou recebendo. Amém.",
      "Senhor, ajuda-me a guardar e praticar aquilo que veio de Ti. Que esta Palavra continue produzindo fruto depois que eu fechar esta tela. Amém."
    ];

    var tasks = [
      "Leia " + day.referencia + " na sua Bíblia e escreva em uma frase o que essa verdade precisa mudar em você hoje.",
      "Ore por uma situação específica ligada a " + lower + " e entregue-a a Deus pelo nome.",
      "Escolha uma atitude concreta que combine com a Palavra de hoje e pratique-a antes do fim do dia.",
      "Anote a área em que esta palavra mais confrontou você e converse com Deus sobre ela com total sinceridade.",
      "Quando o medo ou a emoção falar mais alto hoje, releia " + day.referencia + " antes de reagir.",
      "Separe cinco minutos em silêncio e pergunte: “Senhor, o que preciso colocar em prática a partir desta Palavra?”",
      "Antes de dormir, relembre a mensagem de hoje e registre uma mudança de pensamento, atitude ou oração que ela produziu."
    ];

    return {
      serie: name,
      tema: day.tema,
      frase: phrase,
      referencia: day.referencia,
      versiculo: day.versiculo,
      reflexao: name === "Amor de Deus" ? loveOfGodReflections[dayIndex] : reflections[dayIndex],
      oracao: prayers[dayIndex],
      tarefa: tasks[dayIndex]
    };
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
    if (subscription.optedIn) { button.innerHTML = "<span aria-hidden=\"true\">✓</span> Mensagens ativadas"; status.textContent = "Tudo certo! A palavra do dia está programada para chegar às 6h."; }
    else { button.innerHTML = "<span aria-hidden=\"true\">♡</span> Ativar palavra das 6h"; status.textContent = isIOS() && !isStandalone() ? "No iPhone, instale o aplicativo antes de ativar as mensagens." : "Toque uma vez para autorizar a notificação diária das 6h."; }
    button.disabled = false;
  }
  async function requestNotifications() {
    if (isIOS() && !isStandalone()) { openDialog(byId("install-dialog")); byId("status-message").textContent = "Depois de instalar, abra pelo ícone e ative as mensagens."; return; }
    if (!state.oneSignal) { openDialog(byId("setup-dialog")); return; }
    var button = byId("notify-button"); button.disabled = true; byId("status-message").textContent = "Abrindo a autorização do aparelho…";
    try { if (!state.oneSignal.Notifications.isPushSupported()) throw new Error("Este navegador não oferece notificações."); await state.oneSignal.User.PushSubscription.optIn(); showToast("Pronto! A palavra diária das 6h foi ativada."); window.setTimeout(updateNotificationStatus, 600); }
    catch (error) { button.disabled = false; byId("status-message").textContent = error && error.message ? error.message : "Não foi possível ativar agora."; }
  }
  function maybeOfferDailyNotification() {
    if (!state.oneSignal || state.oneSignal.User.PushSubscription.optedIn) return;
    if (isIOS() && !isStandalone()) return;
    try {
      if (window.localStorage.getItem("diario-fe-notify-invite-v1") === "shown") return;
      window.setTimeout(function () {
        var dialog = byId("notification-dialog");
        if (dialog && state.oneSignal && !state.oneSignal.User.PushSubscription.optedIn) {
          openDialog(dialog);
          window.localStorage.setItem("diario-fe-notify-invite-v1", "shown");
        }
      }, 1200);
    } catch (error) {
      window.setTimeout(function () {
        var dialog = byId("notification-dialog");
        if (dialog && state.oneSignal && !state.oneSignal.User.PushSubscription.optedIn) openDialog(dialog);
      }, 1200);
    }
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
        state.oneSignal = OneSignal; OneSignal.User.PushSubscription.addEventListener("change", updateNotificationStatus); updateNotificationStatus(); maybeOfferDailyNotification(); button.addEventListener("click", requestNotifications);
      } catch (error) { button.disabled = false; byId("status-message").textContent = "Confira o App ID e o endereço configurado no OneSignal."; }
    });
  }

  function setupEvents() {
    byId("share-button").addEventListener("click", shareCurrent); byId("install-button").addEventListener("click", installApp); var inviteButton = byId("notification-dialog-button"); if (inviteButton) inviteButton.addEventListener("click", function () { var dialog = byId("notification-dialog"); if (dialog && typeof dialog.close === "function") dialog.close(); requestNotifications(); });
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
