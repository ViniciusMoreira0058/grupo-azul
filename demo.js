/* Dados fictícios do modo demonstração (abre quando SUPABASE_URL está vazio
   ou com ?demo=1 na URL). Simula a empresa usando o app há pouco mais de um ano.
   As datas são relativas a hoje, então a demonstração nunca fica velha.
   Nada aqui vai para o banco. */
function demoSeed(HOJE, addDays, addMonths) {
  const d = n => addDays(HOJE, n);
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const dow = iso => new Date(iso + "T12:00").getDay();
  const between = (a, b) => Math.round((new Date(b + "T12:00") - new Date(a + "T12:00")) / 864e5);
  const y = HOJE.slice(0, 4);

  const staff = [
    { id: "e0", name: "Rafael Souza", role: "Dono", phone: "(11) 99100-2030", email: "rafael@grupoazul.com.br", cpf: "", since: d(-2900), daily: 0, access: "admin", active: true, dono: true, linked: true },
    { id: "e1", name: "Carlos Mendes", role: "Encanador líder", phone: "(11) 99231-4410", email: "carlos@grupoazul.com.br", cpf: "318.442.908-11", since: d(-1690), daily: 380, access: "tec", active: true, linked: true },
    { id: "e2", name: "Diego Alves", role: "Encanador", phone: "(11) 98455-1203", email: "diego@grupoazul.com.br", cpf: "402.115.678-30", since: d(-830), daily: 300, access: "tec", active: true, linked: true },
    { id: "e3", name: "João Pereira", role: "Encanador líder", phone: "(11) 97120-8834", email: "joao@grupoazul.com.br", cpf: "287.903.114-52", since: d(-2110), daily: 380, access: "tec", active: true, linked: true },
    { id: "e4", name: "Lucas Ferreira", role: "Ajudante", phone: "(11) 96688-2471", email: "lucas@grupoazul.com.br", cpf: "455.320.987-04", since: d(-630), daily: 200, access: "tec", active: true, linked: true },
    { id: "e5", name: "Patrícia Gomes", role: "Auxiliar administrativo", phone: "(11) 3045-1120", email: "patricia@grupoazul.com.br", cpf: "390.876.221-67", since: d(-900), daily: 0, access: "fin", active: true, linked: true },
    { id: "e6", name: "Renato Silva", role: "Encanador", phone: "(11) 99012-7765", email: "renato@grupoazul.com.br", cpf: "301.554.876-90", since: d(-1500), daily: 300, access: "tec", active: false, linked: true },
    { id: "e7", name: "Marcos Oliveira", role: "Técnico em aquecimento", phone: "(11) 98877-3104", email: "marcos@grupoazul.com.br", cpf: "362.118.450-77", since: d(-1180), daily: 420, access: "tec", active: true, linked: true },
    { id: "e8", name: "Anderson Costa", role: "Encanador líder", phone: "(11) 97345-6620", email: "anderson@grupoazul.com.br", cpf: "295.664.312-08", since: d(-1320), daily: 380, access: "tec", active: true, linked: true },
    { id: "e9", name: "Felipe Rocha", role: "Ajudante", phone: "(11) 96210-4598", email: "felipe@grupoazul.com.br", cpf: "478.209.115-63", since: d(-240), daily: 200, access: "tec", active: true, linked: true },
    { id: "e10", name: "Bruno Santos", role: "Encanador", phone: "(11) 95533-0871", email: "bruno@grupoazul.com.br", cpf: "", since: d(-12), daily: 300, access: "tec", active: true, linked: true },
    { id: "e12", name: "Gabriel Lima", role: "Ajudante", phone: "(11) 94120-7736", email: "gabriel@grupoazul.com.br", cpf: "", since: d(-1), daily: 200, access: "tec", active: true, linked: false },
    { id: "e11", name: "Juliana Moraes", role: "Gerente de obras", phone: "(11) 99654-2287", email: "juliana@grupoazul.com.br", cpf: "331.902.776-14", since: d(-560), daily: 0, access: "admin", active: true, linked: true }
  ];

  // clientes e obras. off = início em dias a partir de hoje, dur = prazo em dias,
  // now = % atual (obras em andamento). Obras sem "now" terminadas viram 100%.
  const C = [
    ["Residência Prado", "Ricardo Prado", "(11) 99812-4410", "Alphaville, Barueri/SP", "Al. das Acácias, 410 · Alphaville, Barueri/SP"],
    ["Ed. Villa Lobos", "Marta Ruiz (síndica)", "(11) 3045-7781", "Jardim Europa, São Paulo/SP", "R. Groenlândia, 1200 · Jardim Europa, São Paulo/SP"],
    ["Fazenda Boa Vista", "Henrique Salles", "(15) 99654-0921", "Porto Feliz/SP", "Estrada Municipal PFL-020, km 6 · Porto Feliz/SP"],
    ["Cobertura Andrade", "Dra. Beatriz Andrade", "(11) 98120-3377", "Vila Nova Conceição, São Paulo/SP", "R. Afonso Brás, 300 · Vila Nova Conceição, São Paulo/SP"],
    ["Restaurante Mesa Alta", "Paulo Teixeira", "(11) 97455-2208", "Pinheiros, São Paulo/SP", "R. dos Pinheiros, 870 · Pinheiros, São Paulo/SP"],
    ["Clínica Sorriso Pleno", "Fernanda Lima", "(11) 3322-9015", "Moema, São Paulo/SP", "Av. Ibirapuera, 2100 · Moema, São Paulo/SP"],
    ["Residência Takahashi", "Kenji Takahashi", "(11) 99401-7752", "Granja Viana, Cotia/SP", "R. das Hortênsias, 88 · Granja Viana, Cotia/SP"],
    ["Hotel Vista Serra", "Gustavo Brandão (gerente)", "(12) 3663-4100", "Campos do Jordão/SP", "Av. Macedo Soares, 515 · Capivari, Campos do Jordão/SP"],
    ["Casa Martinelli", "Sofia Martinelli", "(11) 98234-6619", "Jardim Paulistano, São Paulo/SP", "R. Colômbia, 455 · Jardim Paulistano, São Paulo/SP"],
    ["Academia Fit Prime", "Rodrigo Nunes", "(11) 3891-2244", "Itaim Bibi, São Paulo/SP", "R. Joaquim Floriano, 940 · Itaim Bibi, São Paulo/SP"],
    ["Residência Albuquerque", "Marcelo Albuquerque", "(11) 99760-1183", "Tamboré, Santana de Parnaíba/SP", "Al. Itapecuru, 210 · Tamboré, Santana de Parnaíba/SP"],
    ["Ed. Jardins Office", "Cláudia Reis (administradora)", "(11) 3062-8890", "Jardins, São Paulo/SP", "Al. Santos, 2300 · Jardins, São Paulo/SP"],
    ["Chácara Recanto Verde", "Antônio Ribeiro", "(11) 98123-5570", "Atibaia/SP", "Estrada da Usina, 1450 · Atibaia/SP"],
    ["Residência Monteiro", "Patrícia Monteiro", "(11) 99288-4031", "Morumbi, São Paulo/SP", "R. Dr. Alberto Seabra, 120 · Morumbi, São Paulo/SP"],
    ["Padaria Pão Dourado", "Sérgio Almeida", "(11) 3277-1406", "Vila Mariana, São Paulo/SP", "R. Domingos de Morais, 1820 · Vila Mariana, São Paulo/SP"],
    ["Residência Carvalho", "Eduardo Carvalho", "(11) 98944-2368", "Alto de Pinheiros, São Paulo/SP", "R. Cerro Corá, 2010 · Alto de Pinheiros, São Paulo/SP"],
    ["Cond. Parque das Flores", "Roberta Dias (síndica)", "(11) 4161-3300", "Alphaville, Barueri/SP", "Al. Madeira, 222 · Alphaville, Barueri/SP"],
    ["Loft Batista", "Thiago Batista", "(11) 97012-8845", "Vila Madalena, São Paulo/SP", "R. Harmonia, 615 · Vila Madalena, São Paulo/SP"],
    ["Escritório Lacerda Advogados", "Dr. Paulo Lacerda", "(11) 3159-7720", "Brooklin, São Paulo/SP", "Av. Eng. Luís Carlos Berrini, 1500 · Brooklin, São Paulo/SP"],
    ["Residência Fontana", "Luciana Fontana", "(11) 99512-6604", "Higienópolis, São Paulo/SP", "R. Sergipe, 401 · Higienópolis, São Paulo/SP"]
  ];
  const clients = C.map((c, i) => ({ id: i + 1, name: c[0], contact: c[1], phone: c[2], city: c[3], obra: "", status: "Aguardando aprovação", value: 0, _addr: c[4] }));

  const OB = [
    // concluídas (histórico)
    { c: 7, title: "Aquecimento solar + reservatório térmico 1.000 L", off: -395, dur: 38, resp: "e1", team: ["e2"], value: 68400, tasks: ["Instalar suportes e coletores solares no telhado", "Montar reservatório térmico de 1.000 L", "Interligar água quente aos banheiros", "Testes e regulagem do sistema"], mat: ["Coletores solares e reservatório térmico", "Tubos de cobre e conexões"] },
    { c: 8, title: "Casa de máquinas do aquecimento central", off: -370, dur: 62, resp: "e8", team: ["e7", "e4"], value: 196000, tasks: ["Demolir a casa de máquinas antiga", "Instalar caldeiras e bombas de recirculação", "Refazer prumadas de água quente", "Isolamento térmico das tubulações", "Teste de carga com o hotel ocupado"], mat: ["Caldeiras e bombas de recirculação", "Tubulação PPR e isolamento térmico"] },
    { c: 9, title: "Hidráulica completa da reforma", off: -330, dur: 55, resp: "e3", team: ["e6"], value: 92500, tasks: ["Retirar rede antiga", "Nova rede de água fria e quente em PEX", "Rede de esgoto e ventilação", "Instalar louças e metais", "Teste de estanqueidade"], mat: ["Tubulação PEX e conexões", "Louças e metais"] },
    { c: 10, title: "Vestiários e duchas da academia", off: -300, dur: 34, resp: "e8", team: ["e9"], value: 74800, tasks: ["Rede de água para 18 duchas", "Aquecedores de passagem a gás", "Ralos lineares e esgoto", "Testes com a academia funcionando"], mat: ["Aquecedores de passagem", "Ralos lineares e conexões"] },
    { c: 11, title: "Piscina aquecida e ofurô", off: -265, dur: 46, resp: "e7", team: ["e2"], value: 118000, tasks: ["Casa de máquinas da piscina", "Trocador de calor e bomba de calor", "Linha do ofurô com hidromassagem", "Partida e treinamento do caseiro"], mat: ["Bomba de calor e trocador", "Tubos, válvulas e filtro"] },
    { c: 12, title: "Troca das colunas de esgoto do prédio", off: -240, dur: 70, resp: "e1", team: ["e6", "e4"], value: 164000, tasks: ["Colunas do 1º ao 6º andar", "Colunas do 7º ao 12º andar", "Ligação no coletor predial", "Teste de fumaça e entrega à administradora"], mat: ["Tubos PVC série reforçada", "Conexões e abraçadeiras"] },
    { c: 13, title: "Poço artesiano + sistema de pressurização", off: -190, dur: 30, resp: "e3", team: ["e9"], value: 42600, tasks: ["Instalar bomba submersa", "Reservatório e pressurizador", "Rede até a casa e a área de lazer"], mat: ["Bomba submersa e pressurizador", "Tubos PEAD"] },
    { c: 14, title: "Banheiros master e social", off: -165, dur: 28, resp: "e8", team: ["e2"], value: 58900, tasks: ["Pontos de água e esgoto", "Instalar banheira e cuba esculpida", "Misturadores termostáticos", "Teste e limpeza final"], mat: ["Banheira e cubas", "Misturadores termostáticos"] },
    { c: 4, title: "Banheira de imersão e ducha de teto", off: -130, dur: 32, resp: "e1", team: ["e2"], value: 39800, tasks: ["Instalar banheira de imersão", "Ducha de teto e cromoterapia", "Teste e entrega"], mat: ["Banheira de imersão", "Ducha de teto e registros"] },
    { c: 15, title: "Caixa d'água e rede da produção", off: -112, dur: 24, resp: "e3", team: ["e4"], value: 31200, tasks: ["Troca da caixa d'água de 5.000 L", "Rede de água da área de produção", "Filtros e testes"], mat: ["Caixa d'água 5.000 L", "Filtros e tubulação"] },
    { c: 16, title: "Retrofit hidráulico da casa", off: -95, dur: 48, resp: "e8", team: ["e9", "e7"], value: 136500, tasks: ["Rede de água fria e quente em PEX", "Aquecedores a gás em cascata", "Pressurização da casa", "Instalar louças e metais", "Teste de estanqueidade e entrega"], mat: ["Aquecedores a gás", "Tubulação PEX"] },
    { c: 17, title: "Reservatórios e bombas do condomínio", off: -70, dur: 26, resp: "e7", team: ["e4"], value: 48700, tasks: ["Limpeza e impermeabilização dos reservatórios", "Troca do conjunto motobomba", "Automação de nível"], mat: ["Conjunto motobomba", "Boias e quadro de comando"] },
    // em andamento
    { c: 1, title: "Pressurização + aquecimento a gás", off: -52, dur: 79, resp: "e1", team: ["e2"], value: 86400, now: 72, notes: "Cliente pede que a equipe chegue depois das 8h. Chave com o caseiro (Sr. Antônio).", tasks: ["Passar tubulação PEX da casa de máquinas até os banheiros", "Instalar os 2 aquecedores Rinnai e a chaminé", "Instalar pressurizador Komeco e testar pressão", "Instalar misturadores termostáticos (5 banheiros)", "Teste de estanqueidade e entrega ao cliente"], mat: ["Aquecedores Rinnai REU-E33 (2 un.)", "Tubulação PEX e conexões"] },
    { c: 2, title: "Troca de prumadas de água fria (18 andares)", off: -39, dur: 166, resp: "e3", team: ["e4", "e9"], value: 212000, now: 35, notes: "Corte de água só das 9h às 16h, avisar a síndica Marta com 1 dia de antecedência.", tasks: ["Prumada 1 · 18º ao 10º andar", "Prumada 1 · 9º ao térreo", "Prumada 2 · 18º ao 10º andar", "Prumada 2 · 9º ao térreo", "Registros e válvulas redutoras por andar", "Teste final com a síndica"], mat: ["Tubos PPR Ø50 mm", "Válvulas redutoras de pressão"] },
    { c: 5, title: "Caixa de gordura e rede de esgoto da cozinha", off: -23, dur: 37, resp: "e8", team: ["e10"], value: 27600, now: 41, notes: "Trabalhar só antes das 11h ou depois das 15h por causa do almoço do restaurante.", tasks: ["Quebrar piso e abrir vala", "Assentar nova caixa de gordura 250 L", "Trocar rede de esgoto da cozinha (Ø100)", "Fechar piso e testar escoamento"], mat: ["Caixa de gordura 250 L", "Tubos PVC Ø100"] },
    { c: 18, title: "Aquecimento de piso hidrônico", off: -16, dur: 30, resp: "e7", team: ["e2"], value: 54300, now: 52, notes: "Prédio exige uso do elevador de serviço com proteção.", tasks: ["Distribuir serpentinas no contrapiso", "Instalar caldeira e coletores", "Teste de pressão antes do contrapiso", "Partida e regulagem dos ambientes"], mat: ["Serpentinas PEX-AL-PEX", "Caldeira e coletores"] },
    { c: 19, title: "Copas e banheiros do andar corporativo", off: -9, dur: 26, resp: "e1", team: ["e9"], value: 38900, now: 30, notes: "Obra só depois das 18h e aos sábados.", tasks: ["Pontos de água e esgoto das copas", "Banheiros masculino e feminino", "Filtros e purificadores", "Teste e entrega à administração"], mat: ["Louças e metais comerciais", "Tubulação e conexões"] },
    // próximas
    { c: 3, title: "Reúso de água pluvial + piscina aquecida", off: 17, dur: 140, resp: "e1", team: ["e2"], value: 148500, notes: "Aguardando a terraplenagem terminar.", tasks: ["Instalar cisterna de 10.000 L", "Calhas e filtro autolimpante", "Trocador de calor da piscina", "Testes e treinamento do caseiro"], mat: [] },
    { c: 20, title: "Pressurização e troca dos registros", off: 9, dur: 18, resp: "e8", team: ["e4"], value: 24800, notes: "Apartamento ocupado: combinar horários com a Luciana.", tasks: ["Instalar pressurizador", "Trocar registros de gaveta", "Teste de pressão"], mat: [] }
  ];

  const FALAS = [
    t => `Avançamos em: ${t}.`, t => `Dia produtivo. Seguimos com ${t}.`, t => `Continuamos ${t}. Tudo dentro do previsto.`,
    t => `${t}: parte concluída hoje, amanhã seguimos.`, t => `Trabalhamos em ${t}. Área limpa no fim do dia.`, t => `${t}. Cliente acompanhou e aprovou o que foi feito.`
  ];
  const EXTRAS = ["", "", "", " Material conferido para amanhã.", " Teste parcial sem vazamento.", " Fotos das passagens antes de fechar."];
  const PROBS = ["Chuva atrasou o início do serviço.", "Faltou energia no prédio por 2 horas.", "Cliente pediu para mudar o ponto do lavatório.", "Peça veio com defeito, já pedimos a troca.", "Acesso liberado só às 10h pela portaria.", "Encontramos um cano antigo corroído fora do previsto."];
  const FALTAS = [["Conexões PEX cotovelo Ø25 mm", "20 un."], ["Fita veda-rosca e cola PVC", "1 cx."], ["Registro de gaveta 3/4\"", "4 un."], ["Válvula redutora de pressão 1\"", "2 un."], ["Abraçadeiras tipo D Ø50", "30 un."], ["Misturador termostático Deca", "2 un."], ["Tubo PPR Ø32 mm PN25", "6 barras"], ["Luva de correr Ø100", "4 un."]];
  const hit = { e1: .95, e2: .82, e3: .92, e4: .72, e6: .8, e7: .9, e8: .93, e9: .78, e10: .85 };

  const obras = [], quotes = [];
  let missId = 1;
  const numero = () => "";

  OB.forEach(o => { o.value = Math.round(o.value * 1.4 / 100) * 100 });
  OB.forEach((o, i) => {
    const start = d(o.off), end = addDays(start, o.dur), cl = clients[o.c - 1];
    const done = !("now" in o) && end < HOJE, future = start > HOJE;
    const pct = done ? 100 : future ? 0 : o.now;
    const nT = o.tasks.length;
    const ob = {
      id: i + 1, client: cl.id, title: o.title, addr: cl._addr, start, end, resp: o.resp, team: o.team, pct, notes: o.notes || "",
      tasks: o.tasks.map((t, k) => [t, pct >= Math.round((k + 1) / nT * 100) - 2]), log: [], missing: []
    };
    // feedbacks dia a dia, da data de início até hoje (ou até a entrega)
    if (!future) {
      const last = done ? end : addDays(HOJE, -1), total = Math.max(1, between(start, last));
      for (let day = start; day <= last; day = addDays(day, 1)) {
        if (dow(day) === 0) continue;
        const frac = between(start, day) / total, p = Math.min(100, Math.max(1, Math.round(pct * Math.pow(frac, .9))));
        const task = o.tasks[Math.min(nT - 1, Math.floor(p / 100 * nT))].toLowerCase();
        [o.resp, ...o.team].forEach(who => {
          const since = staff.find(s => s.id === who).since;
          if (since > day || rnd() > (hit[who] || .85)) return;
          ob.log.push({ d: day, who, pct: p, text: pick(FALAS)(task.charAt(0).toUpperCase() + task.slice(1)).replace(/^./, c => c.toUpperCase()) + pick(EXTRAS), problem: rnd() < .07 ? pick(PROBS) : "", fotos: [] });
        });
        if (rnd() < .06) { const [item, qty] = pick(FALTAS); ob.missing.push({ id: missId++, item, qty, urgent: rnd() < .25, obs: "", by: o.resp, d: day, st: "Comprado" }) }
      }
      ob.log.sort((a, b) => b.d.localeCompare(a.d));
    }
    obras.push(ob);
    cl.obra = o.title; cl.value = o.value; cl.status = done ? "Concluída" : future ? "Planejamento" : "Em andamento";
    // orçamento aprovado antes de começar
    const qd = addDays(start, -12 - Math.floor(rnd() * 14));
    const m1 = Math.round(o.value * .32 / 10) * 10, m2 = Math.round(o.value * .18 / 10) * 10;
    quotes.push({ id: quotes.length + 1, n: numero(qd), client: cl.id, date: qd, status: "Aprovado", title: o.title, items: [[(o.mat[0] || "Equipamentos e materiais principais"), 1, m1], [(o.mat[1] || "Tubulação, conexões e acessórios"), 1, m2], ["Mão de obra especializada", 1, o.value - m1 - m2]] });
  });

  // a obra de hoje: últimos feedbacks com texto do dia e pedidos ainda abertos
  const o1 = obras[12], o2 = obras[13], o3 = obras[14];
  o1.log = o1.log.filter(l => l.d !== HOJE);
  o1.log.unshift({ d: HOJE, who: "e1", pct: 72, text: "Terminamos o pressurizador e testamos a 4 bar sem vazamento. Começamos os misturadores do banho master.", problem: "", fotos: [] });
  o1.missing.unshift({ id: missId++, item: "Misturador termostático Deca", qty: "2 un.", urgent: true, obs: "Modelo igual ao do banho master", by: "e1", d: HOJE, st: "Aberto" });
  const iso = h => new Date(Date.now() - h * 36e5).toISOString();
  o1.missing.unshift({ id: missId++, item: "Rolo de PEX Ø20 mm (50 m)", qty: "1 rolo", urgent: false, obs: "", by: "e2", d: d(-2), st: "Comprado", reply: "Comprei na Tigre, está no depósito. Passa lá às 7h.", replyAt: iso(20), doneAt: iso(20) });
  o2.missing.unshift({ id: missId++, item: "Válvula redutora de pressão 1\"", qty: "6 un.", urgent: false, obs: "", by: "e3", d: d(-3), st: "Aberto", reply: "O fornecedor só entrega na quinta. Até lá, sigam com a prumada 2.", replyAt: iso(30) });
  o3.log = o3.log.filter(l => l.d !== d(-2)); o3.log.unshift({ d: d(-2), who: "e8", pct: 41, text: "Vala aberta e base da caixa concretada.", problem: "Caixa chegou sem a tampa de inspeção, não dá pra assentar.", fotos: [] });
  o3.log.sort((a, b) => b.d.localeCompare(a.d));
  o3.missing.unshift({ id: missId++, item: "Tampa de inspeção para caixa de gordura 250 L", qty: "1 un.", urgent: true, obs: "", by: "e8", d: d(-2), st: "Aberto" });

  // orçamentos que não viraram obra
  [[6, "Manutenção preventiva anual", -4, "Enviado", 9800], [4, "Aquecimento de piso no banho master", 0, "Rascunho", 18200], [9, "Pressurizador para a área gourmet", -6, "Enviado", 7400],
   [10, "Reforma da rede hidráulica do 2º andar", -210, "Recusado", 41600], [15, "Troca de toda a rede de esgoto", -150, "Recusado", 40600], [12, "Hidrômetros individuais por sala", -45, "Enviado", 63800],
   [17, "Medição individual de água", -300, "Recusado", 88000], [13, "Aquecimento solar da piscina", -18, "Aprovado", 26500]].forEach(([c, title, off, status, v]) => {
    const qd = d(off), m = Math.round(v * .55 / 10) * 10;
    quotes.push({ id: quotes.length + 1, n: numero(qd), client: c, date: qd, status, title, items: [["Materiais e equipamentos", 1, m], ["Mão de obra especializada", 1, v - m]] });
  });
  const porAno = {};
  quotes.sort((a, b) => a.date.localeCompare(b.date)).forEach(q => { const a = q.date.slice(0, 4); porAno[a] = (porAno[a] || 0) + 1; q.n = `ORC-${a}-${String(porAno[a]).padStart(3, "0")}` });
  clients.forEach(c => { delete c._addr; if (!c.obra) { const q = quotes.find(q => q.client === c.id); c.obra = q ? q.title : "Visita técnica"; c.value = q ? qTot(q) : 0 } });
  function qTot(q) { return q.items.reduce((s, i) => s + i[1] * i[2], 0) }

  // financeiro: tudo que entrou e saiu desde que o app começou a ser usado
  const lanc = []; let id = 1;
  const add = (type, dd, desc, cat, who, v, extra = {}) => { const paid = extra.paid ?? dd <= HOJE; lanc.push({ id: id++, type, d: dd, desc, cat, who, obra: null, pay: "PIX", v: Math.round(v * 100) / 100, ...extra, paid }) };
  const FORN = ["Tigre Distribuidora", "Hidro Comercial", "Leroy Merlin", "C&C Casa e Construção", "Rinnai Revenda SP", "Amanco Wavin Revenda", "Ferragens Paulista"];
  obras.forEach((o, i) => {
    const def = OB[i], cl = clientById(o.client);
    if (o.start > HOJE) { add("in", addDays(o.start, -3), `Entrada 40% · ${cl.name}`, "Obra", cl.contact, def.value * .4, { obra: o.id, paid: false, pay: "Transferência" }); return }
    const mid = addDays(o.start, Math.round(def.dur / 2));
    add("in", o.start, `Entrada 40% · ${cl.name}`, "Obra", cl.contact, def.value * .4, { obra: o.id, pay: "Transferência" });
    add("in", mid, `Parcela 30% · ${cl.name}`, "Obra", cl.contact, def.value * .3, { obra: o.id });
    add("in", o.end, `Saldo final 30% · ${cl.name}`, "Obra", cl.contact, def.value * .3, { obra: o.id, pay: "Transferência" });
    [[2, .55], [Math.round(def.dur * .3), .3], [Math.round(def.dur * .6), .15]].forEach(([k, f], j) => {
      const dd = addDays(o.start, k), mat = def.mat[j] || "Materiais complementares";
      add("out", dd, `${mat} · ${cl.name}`, "Material", pick(FORN), def.value * .3 * f, { obra: o.id, pay: pick(["Boleto", "Cartão de crédito", "PIX"]) });
    });
  });
  // um recebimento atrasado, para mostrar o alerta
  const late = lanc.find(l => l.obra === 15 && l.desc.startsWith("Parcela")); if (late) { late.d = d(-5); late.paid = false }
  // diárias da equipe toda sexta-feira
  for (let n = -395; n <= 20; n++) {
    const day = d(n); if (dow(day) !== 5) continue;
    const ativos = staff.filter(s => s.access === "tec" && s.since <= day && (s.active || n < -60));
    const v = ativos.reduce((s, e) => s + e.daily * (3 + Math.round(rnd() * 2)), 0);
    add("out", day, `Diárias da equipe · semana de ${day.slice(8, 10)}/${day.slice(5, 7)}`, "Diárias da equipe", "Equipe de campo", v, { pay: "PIX" });
  }
  // custos fixos e serviços avulsos de cada mês
  for (let k = -13; k <= 1; k++) {
    const m = addMonths(HOJE.slice(0, 8) + "01", k), at = day => addDays(m, day - 1);
    add("out", at(5), "Contabilidade", "Impostos e taxas", "Contábil Silva & Associados", 850, { pay: "Boleto" });
    add("out", at(10), "Aluguel do depósito", "Aluguel e estrutura", "Imobiliária Lopes", 4200, { pay: "Boleto" });
    add("out", at(15), "Parcela da van Fiorino", "Veículos e combustível", "Banco Itaú", 2350, { pay: "Boleto" });
    add("out", at(26), "Combustível e pedágios do mês", "Veículos e combustível", "Posto Shell Faria Lima", 1250 + Math.round(rnd() * 700), { pay: "Cartão de débito" });
    const prev = addMonths(m, -1).slice(0, 7), fat = lanc.filter(l => l.type === "in" && l.d.startsWith(prev)).reduce((s, l) => s + l.v, 0);
    if (fat) add("out", at(20), "Simples Nacional (DAS)", "Impostos e taxas", "Receita Federal", fat * .06, { pay: "Boleto" });
    if (rnd() < .35) add("out", at(8 + Math.floor(rnd() * 15)), pick(["Ferramentas: termofusora e prensa PEX", "Manutenção da van", "Detector de vazamento por ultrassom", "Escadas e andaime"]), pick(["Ferramentas", "Veículos e combustível"]), pick(FORN), 900 + Math.round(rnd() * 3200), { pay: "Cartão de crédito" });
    for (let v = 0; v < 2 + Math.floor(rnd() * 3); v++) {
      const day = at(2 + Math.floor(rnd() * 25)), c = clients[Math.floor(rnd() * clients.length)];
      add("in", day, `${pick(["Visita técnica", "Caça-vazamento", "Manutenção preventiva", "Desentupimento"])} · ${c.name}`, pick(["Visita técnica", "Manutenção"]), c.contact, 380 + Math.round(rnd() * 14) * 60);
    }
  }
  lanc.sort((a, b) => a.d.localeCompare(b.d)).forEach((l, i) => l.id = i + 1);

  // lembretes do escritório
  const at = n => new Date(Date.now() + n * 864e5).toISOString();
  const lembretes = [
    { id: 1, title: "Ligar para a síndica Marta e confirmar o corte de água de quinta", obs: "Ed. Villa Lobos · (11) 3045-7781", urg: "urgente", due: HOJE, done: false, at: at(-1) },
    { id: 2, title: "Cobrar a parcela atrasada do Restaurante Mesa Alta", obs: "Paulo Teixeira · parcela de 30%", urg: "urgente", due: d(-2), done: false, at: at(-4) },
    { id: 3, title: "Renovar o seguro da van Fiorino", obs: "Vence no fim do mês", urg: "normal", due: d(6), done: false, at: at(-3) },
    { id: 4, title: "Mandar o orçamento revisado para a Clínica Sorriso Pleno", obs: "", urg: "normal", due: d(2), done: false, at: at(-2) },
    { id: 5, title: "Aniversário do Carlos no dia 3", obs: "Comprar um bolo para a equipe", urg: "lembrar", due: null, done: false, at: at(-6) },
    { id: 6, title: "Pedir orçamento de termofusora nova", obs: "", urg: "lembrar", due: null, done: false, at: at(-8) },
    { id: 7, title: "Pagar o aluguel do depósito", obs: "", urg: "normal", due: d(-14), done: true, at: at(-15) },
    { id: 8, title: "Enviar fotos da entrega para o Hotel Vista Serra", obs: "", urg: "normal", due: null, done: true, at: at(-20) }
  ];

  function clientById(cid) { return clients.find(c => c.id === cid) }
  return { staff, clients, quotes, obras, lanc, lembretes };
}
