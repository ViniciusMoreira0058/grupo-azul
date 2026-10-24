/* Dados fictícios do modo demonstração (abre quando SUPABASE_URL está vazio
   ou com ?demo=1 na URL). As datas são relativas a hoje, então a demonstração
   nunca fica velha. Nada aqui vai para o banco. */
function demoSeed(HOJE, addDays, addMonths) {
  const d = n => addDays(HOJE, n);

  const staff = [
    { id: "e0", name: "Rafael Souza", role: "Dono", phone: "(11) 99100-2030", email: "rafael@grupoazul.com.br", cpf: "", since: "2018-02-01", daily: 0, access: "admin", active: true, dono: true, linked: true },
    { id: "e1", name: "Carlos Mendes", role: "Encanador líder", phone: "(11) 99231-4410", email: "carlos@grupoazul.com.br", cpf: "318.442.908-11", since: "2021-03-08", daily: 380, access: "tec", active: true, linked: true },
    { id: "e2", name: "Diego Alves", role: "Encanador", phone: "(11) 98455-1203", email: "diego@grupoazul.com.br", cpf: "402.115.678-30", since: "2023-07-17", daily: 300, access: "tec", active: true, linked: true },
    { id: "e3", name: "João Pereira", role: "Encanador líder", phone: "(11) 97120-8834", email: "joao@grupoazul.com.br", cpf: "287.903.114-52", since: "2020-01-13", daily: 380, access: "tec", active: true, linked: true },
    { id: "e4", name: "Lucas Ferreira", role: "Ajudante", phone: "(11) 96688-2471", email: "lucas@grupoazul.com.br", cpf: "455.320.987-04", since: "2025-02-03", daily: 200, access: "tec", active: true, linked: false },
    { id: "e5", name: "Patrícia Gomes", role: "Auxiliar administrativo", phone: "(11) 3045-1120", email: "patricia@grupoazul.com.br", cpf: "390.876.221-67", since: "2024-05-06", daily: 0, access: "fin", active: true, linked: true },
    { id: "e6", name: "Renato Silva", role: "Encanador", phone: "(11) 99012-7765", email: "renato@grupoazul.com.br", cpf: "301.554.876-90", since: "2022-09-12", daily: 300, access: "tec", active: false, linked: true }
  ];

  const clients = [
    { id: 1, name: "Residência Prado", contact: "Ricardo Prado", phone: "(11) 99812-4410", city: "Alphaville, Barueri/SP", obra: "Pressurização + aquecimento a gás", status: "Em andamento", value: 86400 },
    { id: 2, name: "Ed. Villa Lobos", contact: "Marta Ruiz (síndica)", phone: "(11) 3045-7781", city: "Jardim Europa, São Paulo/SP", obra: "Troca de prumadas de água fria (18 andares)", status: "Em andamento", value: 212000 },
    { id: 3, name: "Fazenda Boa Vista", contact: "Henrique Salles", phone: "(15) 99654-0921", city: "Porto Feliz/SP", obra: "Reúso de água pluvial + piscina aquecida", status: "Planejamento", value: 148500 },
    { id: 4, name: "Cobertura Andrade", contact: "Dra. Beatriz Andrade", phone: "(11) 98120-3377", city: "Vila Nova Conceição, São Paulo/SP", obra: "Banheira de imersão e ducha de teto", status: "Concluída", value: 39800 },
    { id: 5, name: "Restaurante Mesa Alta", contact: "Paulo Teixeira", phone: "(11) 97455-2208", city: "Pinheiros, São Paulo/SP", obra: "Caixa de gordura e rede de esgoto da cozinha", status: "Em andamento", value: 27600 },
    { id: 6, name: "Clínica Sorriso Pleno", contact: "Fernanda Lima", phone: "(11) 3322-9015", city: "Moema, São Paulo/SP", obra: "Manutenção preventiva anual", status: "Aguardando aprovação", value: 9800 }
  ];

  const y = HOJE.slice(0, 4);
  const quotes = [
    { id: 1, n: `ORC-${y}-048`, client: 3, date: d(-2), status: "Enviado", title: "Reúso de água pluvial + aquecimento da piscina", items: [["Cisterna de 10.000 L em polietileno com filtro autolimpante", 1, 9850], ["Bomba pressurizadora Rowa Super Press 30", 2, 2890], ["Tubulação PPR Ø32 mm PN25 (barra 3 m)", 48, 96], ["Trocador de calor para piscina 60.000 kcal/h", 1, 14200], ["Mão de obra especializada (instalação e testes)", 1, 38500]] },
    { id: 2, n: `ORC-${y}-047`, client: 6, date: d(-4), status: "Enviado", title: "Manutenção preventiva anual", items: [["Visitas técnicas trimestrais com laudo", 4, 1650], ["Limpeza e desinfecção de reservatórios", 2, 1600]] },
    { id: 3, n: `ORC-${y}-045`, client: 1, date: d(-57), status: "Aprovado", title: "Pressurização + aquecimento a gás", items: [["Aquecedor a gás Rinnai REU-E33 (33 L/min)", 2, 8990], ["Pressurizador Komeco TP 40 G4", 1, 3480], ["Tubulação PEX Ø25 mm com conexões crimpadas (rolo 50 m)", 6, 1240], ["Misturadores termostáticos para chuveiros", 5, 1860], ["Mão de obra especializada", 1, 39800]] },
    { id: 4, n: `ORC-${y}-043`, client: 2, date: d(-80), status: "Aprovado", title: "Troca de prumadas de água fria", items: [["Prumadas em PPR Ø50 mm, 18 pavimentos", 4, 24500], ["Registros de gaveta e válvulas redutoras", 36, 780], ["Mão de obra e andaimes", 1, 85920]] },
    { id: 5, n: `ORC-${y}-041`, client: 5, date: d(-87), status: "Recusado", title: "Reforma completa da rede hidráulica", items: [["Rede de esgoto em PVC série reforçada", 1, 18200], ["Mão de obra", 1, 22400]] },
    { id: 6, n: `ORC-${y}-049`, client: 4, date: d(0), status: "Rascunho", title: "Aquecimento de piso no banho master", items: [["Sistema de piso aquecido hidrônico 12 m²", 1, 11800], ["Mão de obra", 1, 6400]] }
  ];

  const obras = [
    { id: 1, client: 1, title: "Pressurização + aquecimento a gás", addr: "Al. das Acácias, 410 · Alphaville, Barueri/SP", start: d(-52), end: d(27), resp: "e1", team: ["e2"], pct: 72,
      notes: "Cliente pede que a equipe chegue depois das 8h. Chave com o caseiro (Sr. Antônio).",
      tasks: [["Passar tubulação PEX da casa de máquinas até os banheiros", true], ["Instalar os 2 aquecedores Rinnai e a chaminé", true], ["Instalar pressurizador Komeco e testar pressão", true], ["Instalar misturadores termostáticos (5 banheiros)", false], ["Teste de estanqueidade e entrega ao cliente", false]],
      log: [{ d: d(0), who: "e1", pct: 72, text: "Terminamos o pressurizador e testamos a 4 bar sem vazamento. Começamos os misturadores do banho master.", problem: "", fotos: [] },
            { d: d(-1), who: "e1", pct: 68, text: "Chaminé dos aquecedores fixada e vedada. Aquecedores ligados e regulados.", problem: "", fotos: [] },
            { d: d(-2), who: "e2", pct: 63, text: "Passamos a tubulação de água quente do 2º andar.", problem: "Faltou 1 rolo de PEX, peguei no depósito.", fotos: [] }],
      missing: [{ id: 1, item: "Misturador termostático Deca", qty: "2 un.", urgent: true, by: "e1", d: d(0), st: "Aberto" }] },
    { id: 2, client: 2, title: "Troca de prumadas de água fria (18 andares)", addr: "R. Groenlândia, 1200 · Jardim Europa, São Paulo/SP", start: d(-39), end: d(127), resp: "e3", team: ["e1", "e4"], pct: 35,
      notes: "Corte de água só das 9h às 16h, avisar a síndica Marta com 1 dia de antecedência.",
      tasks: [["Prumada 1 · 18º ao 10º andar", true], ["Prumada 1 · 9º ao térreo", true], ["Prumada 2 · 18º ao 10º andar", false], ["Prumada 2 · 9º ao térreo", false], ["Registros e válvulas redutoras por andar", false], ["Teste final com a síndica", false]],
      log: [{ d: d(-1), who: "e3", pct: 35, text: "Prumada 1 finalizada até o térreo. Amanhã começamos a prumada 2 pelo 18º.", problem: "", fotos: [] }],
      missing: [{ id: 2, item: "Válvula redutora de pressão 1\"", qty: "6 un.", urgent: false, by: "e3", d: d(-3), st: "Comprado" }] },
    { id: 3, client: 5, title: "Caixa de gordura e rede de esgoto da cozinha", addr: "R. dos Pinheiros, 870 · Pinheiros, São Paulo/SP", start: d(-23), end: d(14), resp: "e3", team: ["e4"], pct: 48,
      notes: "Trabalhar só antes das 11h ou depois das 15h por causa do almoço do restaurante.",
      tasks: [["Quebrar piso e abrir vala", true], ["Assentar nova caixa de gordura 250 L", false], ["Trocar rede de esgoto da cozinha (Ø100)", false], ["Fechar piso e testar escoamento", false]],
      log: [{ d: d(-2), who: "e3", pct: 48, text: "Vala aberta e base da caixa concretada.", problem: "Caixa chegou sem a tampa de inspeção, não dá pra assentar.", fotos: [] }],
      missing: [{ id: 3, item: "Tampa de inspeção para caixa de gordura 250 L", qty: "1 un.", urgent: true, by: "e3", d: d(-2), st: "Aberto" }] },
    { id: 4, client: 3, title: "Reúso de água pluvial + piscina aquecida", addr: "Estrada Municipal PFL-020, km 6 · Porto Feliz/SP", start: d(17), end: d(157), resp: "e1", team: ["e2"], pct: 0,
      notes: "Aguardando a terraplenagem terminar.",
      tasks: [["Instalar cisterna de 10.000 L", false], ["Calhas e filtro autolimpante", false], ["Trocador de calor da piscina", false], ["Testes e treinamento do caseiro", false]], log: [], missing: [] },
    { id: 5, client: 4, title: "Banheira de imersão e ducha de teto", addr: "R. Afonso Brás, 300 · Vila Nova Conceição, São Paulo/SP", start: d(-81), end: d(-21), resp: "e1", team: ["e2"], pct: 100,
      notes: "", tasks: [["Instalar banheira e ducha de teto", true], ["Teste e entrega", true]], log: [], missing: [] }
  ];

  // histórico de feedbacks dos últimos 30 dias, para a pontualidade de cada um
  const hit = { e1: .95, e2: .8, e3: .9, e4: .72 };
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  obras.filter(o => o.pct < 100 && o.start <= HOJE).forEach(o => {
    const known = new Set(o.log.map(l => l.d + l.who));
    for (let n = 3; n <= 29; n++) {
      const day = d(-n); if (day < o.start || new Date(day + "T12:00").getDay() === 0) continue;
      [o.resp, ...o.team].forEach(who => {
        if (rnd() > (hit[who] || .8) || known.has(day + who)) return;
        const frac = (n - 2) / 30, pct = Math.max(0, Math.round(o.pct * (1 - frac * .6)));
        const task = (o.tasks.find(t => !t[1]) || o.tasks[0])[0].toLowerCase();
        o.log.push({ d: day, who, pct, text: `Seguimos com: ${task}.`, problem: "", fotos: [] });
      });
    }
    o.log.sort((a, b) => b.d.localeCompare(a.d));
  });

  // financeiro: mês atual detalhado + resumo dos 5 meses anteriores
  const lanc = [];
  let id = 1;
  const add = (type, dd, desc, cat, who, v, extra = {}) => lanc.push({ id: id++, type, d: dd, desc, cat, who, obra: null, pay: "PIX", v, paid: true, ...extra });
  add("in", d(-1), "Parcela 2/3 · Residência Prado", "Obra", "Ricardo Prado", 28800, { obra: 1 });
  add("out", d(-2), "Tubos e conexões PPR", "Material", "Tigre Distribuidora", 6340, { obra: 2, pay: "Boleto" });
  add("in", d(-3), "Medição 1 · Ed. Villa Lobos", "Obra", "Cond. Villa Lobos", 42400, { obra: 2, pay: "Transferência" });
  add("out", d(-4), "Equipe terceirizada (quinzena)", "Mão de obra", "JR Serviços Hidráulicos", 9800, { pay: "Transferência" });
  add("out", d(-6), "Aquecedores Rinnai REU-E33 (2 un.)", "Material", "Rinnai Revenda SP", 17980, { obra: 1, pay: "Cartão de crédito" });
  add("out", d(-9), "Combustível e pedágios", "Veículos e combustível", "Posto Shell Faria Lima", 1420, { pay: "Cartão de débito" });
  add("in", d(-14), "Saldo final · Cobertura Andrade", "Obra", "Beatriz Andrade", 3080, { obra: 5 });
  add("out", d(-19), "Aluguel do depósito", "Aluguel e estrutura", "Imobiliária Lopes", 4200, { pay: "Boleto" });
  add("out", d(-19), "Ferramentas: termofusora e prensa PEX", "Ferramentas", "Leroy Merlin", 4180, { pay: "Cartão de crédito" });
  add("in", d(6), "Parcela 2 · Restaurante Mesa Alta", "Obra", "Paulo Teixeira", 13800, { obra: 3, paid: false });
  add("in", d(17), "Medição 2 · Ed. Villa Lobos", "Obra", "Cond. Villa Lobos", 42400, { obra: 2, paid: false, pay: "Transferência" });
  add("in", d(27), "Parcela 3/3 · Residência Prado", "Obra", "Ricardo Prado", 28800, { obra: 1, paid: false });
  add("in", d(-9), "Visita técnica emergencial", "Visita técnica", "Clínica Sorriso Pleno", 850, { paid: false });
  add("out", d(3), "Equipe terceirizada (quinzena)", "Mão de obra", "JR Serviços Hidráulicos", 9800, { paid: false, pay: "Transferência" });
  add("out", d(7), "Pressurizadores e bombas", "Material", "Hidro Comercial", 8670, { paid: false, pay: "Boleto" });
  add("out", d(12), "Aluguel do depósito", "Aluguel e estrutura", "Imobiliária Lopes", 4200, { paid: false, pay: "Boleto" });
  add("out", d(17), "Parcela da van Fiorino", "Veículos e combustível", "Banco Itaú", 2350, { paid: false, pay: "Boleto" });
  const hist = [[68750, 41300], [57300, 36200], [61400, 38900], [52900, 34100], [48200, 31600]];
  hist.forEach(([vin, vout], k) => {
    const base = addMonths(HOJE.slice(0, 8) + "10", -(k + 1));
    add("in", base, "Recebimentos de obras do mês", "Obra", "Vários clientes", vin, { pay: "Transferência" });
    add("out", addDays(base, 5), "Materiais do mês", "Material", "Vários fornecedores", Math.round(vout * .55), { pay: "Boleto" });
    add("out", addDays(base, 8), "Equipe terceirizada", "Mão de obra", "JR Serviços Hidráulicos", Math.round(vout * .3), { pay: "Transferência" });
    add("out", addDays(base, 12), "Aluguel, veículos e ferramentas", "Aluguel e estrutura", "Vários", vout - Math.round(vout * .55) - Math.round(vout * .3), { pay: "Boleto" });
  });

  return { staff, clients, quotes, obras, lanc };
}
