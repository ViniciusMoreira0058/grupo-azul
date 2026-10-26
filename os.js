/* Ordens de serviço: serviços rápidos que não são uma obra inteira
   (vazamento, troca de registro, manutenção, visita técnica).
   No app real precisa do supabase/008_ordens_servico.sql. */
(() => {
  let falta008 = false, osEst = [];
  const osOk = () => DEMO || !falta008;
  const TIPOS_OS = { vazamento: ["Vazamento", "💧"], desentup: ["Desentupimento", "🚿"], troca: ["Troca de peça", "🔧"], manut: ["Manutenção", "🛠️"], instal: ["Instalação", "🔩"], visita: ["Visita técnica", "🔎"] };
  const ST = { "Aberta": "c-info", "Em andamento": "c-warn", "Concluída": "c-good", "Cancelada": "c-mute" };
  const PAGS = ["PIX", "Dinheiro", "Cartão", "Boleto"];
  let ordens = [], osLanc = [], osFiltro = "abertas", osQ = "";
  const lancar = l => { l.id = nextId(lanc); lanc.push(l); osLanc.push(l) };

  const totalOS = o => (+o.mao || 0) + o.mat.reduce((s, m) => s + m.qtd * m.v, 0);
  const valorOS = o => o.status === "Concluída" ? totalOS(o) : +o.valor || 0;
  const numOS = n => "OS-" + String(n).padStart(4, "0");
  const quando = o => `${o.d === HOJE ? "Hoje" : o.d === addDays(HOJE, 1) ? "Amanhã" : o.d === addDays(HOJE, -1) ? "Ontem" : fd(o.d).slice(0, 5)} às ${o.h}`;
  const minhas = () => ordens.filter(o => o.tec === me.id);

  // assinatura de exemplo para as OS já fechadas da demonstração
  function assinaturaFake(nome) {
    const c = document.createElement("canvas"); c.width = 360; c.height = 110; const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, 360, 110); g.fillStyle = "#14233a"; g.font = "italic 38px 'Brush Script MT', 'Segoe Script', cursive"; g.fillText(nome, 18, 66);
    g.strokeStyle = "#14233a"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(14, 80); g.bezierCurveTo(120, 92, 220, 70, 330, 84); g.stroke();
    return c.toDataURL("image/png");
  }

  function seedOS() {
    const tecs = ["e1", "e3", "e7", "e8", "e2"];
    const L = [
      [-21, "10:00", "vazamento", 4, "Vazamento embaixo da pia da cozinha", "e1", "Trocamos o sifão e a vedação da válvula. Testado sem vazamento.", [["Sifão cromado", 1, 129], ["Fita veda-rosca", 1, 12]], 180, true, "PIX"],
      [-17, "14:00", "troca", 6, "Registro do chuveiro pingando", "e3", "Troca do reparo do registro de pressão 3/4\" do banheiro social.", [["Reparo de registro 3/4\"", 2, 48]], 160, true, "Dinheiro"],
      [-12, "09:00", "desentup", 9, "Ralo do box entupido", "e8", "Desentupimento com máquina e limpeza da caixa sifonada.", [], 260, true, "PIX"],
      [-8, "08:30", "manut", 17, "Revisão da bomba do reservatório", "e7", "Limpeza do rotor, troca do selo mecânico e teste de pressão.", [["Selo mecânico", 1, 95]], 340, true, "Boleto"],
      [-5, "15:30", "instal", 7, "Instalar misturador na cozinha", "e1", "Instalado misturador monocomando com engates novos.", [["Engate flexível 40 cm", 2, 32]], 220, false, "PIX"],
      [-2, "11:00", "vazamento", 14, "Mancha de umidade na parede da sala", "e3", "Localizado vazamento no ramal de água quente com detector. Feito reparo e teste.", [["Luva PPR 25 mm", 2, 18], ["Tubo PPR 25 mm (m)", 1.5, 26]], 420, false, "PIX"],
      [0, "08:00", "troca", 11, "Torneira da área de serviço quebrada", "e1"],
      [0, "13:30", "vazamento", 2, "Vazamento na descarga do banheiro da suíte", "e1"],
      [0, "16:00", "visita", 20, "Avaliar pressão fraca no apartamento", "e7"],
      [1, "09:00", "desentup", 12, "Pia do lavabo escoando devagar", "e8"],
      [2, "10:30", "manut", 13, "Manutenção preventiva do aquecedor a gás", "e7"],
      [3, "14:00", "instal", 3, "Instalar ducha higiênica", "e2"]
    ];
    ordens = L.map((x, i) => {
      const c = clientById(x[3]), ob = obras.find(o => o.client === x[3]), fechada = x.length > 6;
      const o = { id: i + 1, n: numOS(31 + i), d: proxUtil(addDays(HOJE, x[0])), h: x[1], tipo: x[2], cli: x[3], local: (ob && ob.addr) || c.city, problema: x[4], tec: x[5], contato: c.contact || c.name, valor: [180, 160, 260, 340, 220, 420, 150, 200, 0, 250, 320, 180][i], status: fechada ? "Concluída" : x[0] === 0 && i === 6 ? "Em andamento" : "Aberta", feito: "", mat: [], mao: 0, fotosAntes: [], fotosDepois: [], assin: "", assinNome: "" };
      if (fechada) {
        Object.assign(o, { feito: x[6], mat: x[7].map(m => ({ nome: m[0], qtd: m[1], v: m[2] })), mao: x[8], pago: x[9], pay: x[10], fechadaEm: o.d, assinNome: o.contato, assin: assinaturaFake(firstName(o.contato)) });
        lancar({ type: "in", d: o.d, desc: `${o.n} · ${TIPOS_OS[o.tipo][0]} · ${c.name}`, cat: o.tipo === "visita" ? "Visita técnica" : "Manutenção", who: o.contato, obra: null, pay: o.pay, v: totalOS(o), paid: o.pago });
      }
      return o;
    });
  }
  const proxUtil = iso => { while (D(iso).getDay() === 0) iso = addDays(iso, 1); return iso };

  /* ---------- lista ---------- */
  VIEWS.os = () => {
    if (!osOk()) { $("#main").innerHTML = head("Ordens de serviço", "Serviços rápidos que não são obra") + `<div class="card"><h2>Quase pronto</h2><p class="s" style="margin:6px 0 0">${me.role === "admin" ? "Para usar esta parte, rode o arquivo <b>008_ordens_servico.sql</b> no SQL Editor do Supabase." : "Esta parte ainda está sendo preparada pelo administrador."}</p></div>`; return }
    const tec = me.role === "tec", t = osQ.trim().toLowerCase();
    const base = tec ? minhas() : ordens;
    const filtra = o => osFiltro === "todas" || (osFiltro === "abertas" ? ["Aberta", "Em andamento"].includes(o.status) : osFiltro === "concluidas" ? o.status === "Concluída" : o.status === "Cancelada");
    const busca = o => !t || [o.n, o.problema, clientById(o.cli).name, emp(o.tec).name].join(" ").toLowerCase().includes(t);
    const ord = (a, b) => osFiltro === "abertas" ? (a.d + a.h).localeCompare(b.d + b.h) : (b.d + b.h).localeCompare(a.d + a.h);
    const list = base.filter(o => filtra(o) && busca(o)).sort(ord);
    const abertas = base.filter(o => ["Aberta", "Em andamento"].includes(o.status)), hoje = abertas.filter(o => o.d <= HOJE);
    const mes = base.filter(o => o.status === "Concluída" && o.fechadaEm && o.fechadaEm.slice(0, 7) === HOJE.slice(0, 7));
    const receber = base.filter(o => o.status === "Concluída" && !o.pago);
    $("#main").innerHTML = head(tec ? "Minhas ordens de serviço" : "Ordens de serviço", tec ? "Serviços rápidos marcados para você. Ao terminar, feche a OS com a assinatura do cliente." : "Serviços rápidos que não são obra: vazamento, troca de peça, manutenção, visita.", tec ? "" : `<button class="btn primary" id="osNew">+ Nova OS</button>`) + `
 <div class="grid kpis" style="margin-bottom:14px">
  <div class="card kpi"><div class="eyebrow">Abertas</div><div class="v num">${abertas.length}</div><div class="d">${abertas.filter(o => o.status === "Em andamento").length} em andamento</div></div>
  <div class="card kpi"><div class="eyebrow">Para hoje</div><div class="v num ${hoje.some(o => o.d < HOJE) ? "down" : ""}">${hoje.length}</div><div class="d">${hoje.filter(o => o.d < HOJE).length ? hoje.filter(o => o.d < HOJE).length + " atrasadas" : "Nenhuma atrasada"}</div></div>
  <div class="card kpi"><div class="eyebrow">Feitas no mês</div><div class="v num">${mes.length}</div><div class="d">${tec ? "por você" : brl0(mes.reduce((s, o) => s + totalOS(o), 0))}</div></div>
  ${tec ? "" : `<div class="card kpi"><div class="eyebrow">A receber</div><div class="v num ${receber.length ? "down" : ""}">${brl0(receber.reduce((s, o) => s + totalOS(o), 0))}</div><div class="d">${receber.length} OS concluídas</div></div>`}
 </div>
 <div class="toolbar"><div class="tabs" id="osTabs">${[["abertas", "Abertas"], ["concluidas", "Concluídas"], ["canceladas", "Canceladas"], ["todas", "Todas"]].map(([k, l]) => `<button data-f="${k}" class="${osFiltro === k ? "active" : ""}">${l}</button>`).join("")}</div><input class="input" id="osQ" placeholder="Buscar cliente, OS ou serviço" value="${esc(osQ)}"></div>
 <div class="card"><div class="list">${list.map(osRow).join("") || `<p class="s" style="margin:0">${tec && osFiltro === "abertas" ? "Nenhuma OS aberta para você." : "Nenhuma ordem de serviço aqui."}</p>`}</div></div>`;
    const nb = $("#osNew"); if (nb) nb.onclick = () => osForm();
    $$("#osTabs button").forEach(b => b.onclick = () => { osFiltro = b.dataset.f; VIEWS.os() });
    $("#osQ").oninput = e => { osQ = e.target.value; const p = e.target.selectionStart; VIEWS.os(); const i = $("#osQ"); i.focus(); i.setSelectionRange(p, p) };
    $$("#main [data-os]").forEach(r => r.onclick = () => osDetail(ordens.find(o => o.id === +r.dataset.os)));
  };
  function osRow(o) {
    const c = clientById(o.cli), atras = ["Aberta", "Em andamento"].includes(o.status) && o.d < HOJE;
    return `<div class="row click" data-os="${o.id}"><span class="ev-ic">${TIPOS_OS[o.tipo][1]}</span><div class="grow"><div class="t">${esc(c.name)} · ${esc(o.problema)}</div><div class="s">${o.n} · ${quando(o)}${me.role === "tec" ? "" : " · " + esc(firstName(emp(o.tec).name))}${o.local ? " · " + esc(o.local) : ""}</div></div><div style="text-align:right;display:grid;gap:4px;justify-items:end"><span class="chip ${atras ? "c-bad" : ST[o.status]}">${atras ? "Atrasada" : o.status}</span>${valorOS(o) ? `<span class="s num">${brl0(valorOS(o))}${o.status === "Concluída" && !o.pago ? " · a receber" : ""}</span>` : ""}</div></div>`;
  }

  /* ---------- abrir / editar ---------- */
  function osForm(o, pre) {
    const tecs = staff.filter(e => e.active && e.access === "tec");
    const v = o || Object.assign({ cli: clients[0] && clients[0].id, tipo: "vazamento", problema: "", local: "", tec: tecs[0] && tecs[0].id, d: HOJE, h: "09:00", valor: "", contato: "" }, pre || {});
    modal(`<div class="sheet-head"><div><div class="eyebrow">${o ? o.n : "Ordem de serviço"}</div><h2>${o ? "Editar OS" : "Nova OS"}</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
 <div class="field"><label>Tipo de serviço</label><div class="tabs" id="ofT" style="flex-wrap:wrap">${Object.entries(TIPOS_OS).map(([k, t]) => `<button type="button" data-t="${k}" class="${v.tipo === k ? "active" : ""}">${t[1]} ${t[0]}</button>`).join("")}</div></div>
 <div class="form-grid"><div class="field"><label for="ofC">Cliente</label><select class="input" id="ofC">${clients.map(c => `<option value="${c.id}" ${c.id === v.cli ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div><div class="field"><label for="ofL">Endereço</label><input class="input" id="ofL" value="${esc(v.local)}" placeholder="Rua, número · bairro"></div></div>
 <div class="field"><label for="ofP">Qual é o problema?</label><textarea class="input" id="ofP" placeholder="Ex.: vazamento embaixo da pia da cozinha">${esc(v.problema)}</textarea></div>
 <div class="form-grid"><div class="field"><label for="ofTec">Técnico</label><select class="input" id="ofTec">${tecs.map(e => `<option value="${e.id}" ${e.id === v.tec ? "selected" : ""}>${esc(e.name)}</option>`).join("")}</select></div><div class="field"><label for="ofD">Dia</label><input class="input" type="date" id="ofD" value="${v.d}"></div><div class="field"><label for="ofH">Hora</label><input class="input" type="time" id="ofH" value="${v.h}"></div><div class="field"><label for="ofV">Valor combinado (R$)</label><input class="input num" type="number" min="0" step="0.01" id="ofV" value="${v.valor}" placeholder="Opcional"></div></div>
 <p class="s" id="ofConf" style="margin:0"></p><p class="s form-err" id="ofErr" hidden></p>
 <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="ofSave">${o ? "Salvar" : "Abrir OS"}</button></div>`, true);
    let tipo = v.tipo;
    $$("#ofT button").forEach(b => b.onclick = () => { tipo = b.dataset.t; $$("#ofT button").forEach(x => x.classList.toggle("active", x === b)) });
    $("#ofC").onchange = () => { const id = +$("#ofC").value, ob = obras.find(x => x.client === id); $("#ofL").value = ob ? ob.addr : clientById(id).city };
    if (!o && !v.local) $("#ofC").onchange();
    const conf = () => { const t = $("#ofTec").value, d = $("#ofD").value, h = $("#ofH").value, ch = ordens.find(x => x !== o && x.tec === t && x.d === d && x.h === h && x.status !== "Cancelada"); $("#ofConf").textContent = ch ? `⚠️ ${firstName(emp(t).name)} já tem a ${ch.n} nesse horário.` : "" };
    ["#ofTec", "#ofD", "#ofH"].forEach(s => $(s).onchange = conf); conf();
    $("#ofSave").onclick = () => {
      const problema = $("#ofP").value.trim(); if (!problema) { $("#ofErr").textContent = "Escreva qual é o problema."; $("#ofErr").hidden = false; return }
      const cli = +$("#ofC").value, c = clientById(cli);
      const d = { tipo, cli, local: $("#ofL").value.trim(), problema, tec: $("#ofTec").value, d: $("#ofD").value || HOJE, h: $("#ofH").value || "09:00", valor: +$("#ofV").value || 0, contato: c.contact || c.name };
      closeModal();
      act(async () => {
        if (DEMO) { if (o) Object.assign(o, d); else { const id = nextId(ordens); ordens.push({ id, n: numOS(30 + id), ...d, status: "Aberta", feito: "", mat: [], mao: 0, fotosAntes: [], fotosDepois: [], assin: "", assinNome: "" }) } return }
        const row = { tipo: d.tipo, cliente_id: d.cli, local: d.local, problema: d.problema, tecnico: d.tec, data: d.d, hora: d.h, valor: d.valor, contato: d.contato };
        await live(o ? sb.from("ga_os").update(row).eq("id", o.id) : sb.from("ga_os").insert(row));
      }, o ? "OS atualizada" : `OS aberta para ${firstName(emp(d.tec).name)} · ${fd(d.d)} às ${d.h}`);
    };
  }

  /* ---------- detalhe ---------- */
  function osDetail(o) {
    const c = clientById(o.cli), tec = me.role === "tec", aberta = ["Aberta", "Em andamento"].includes(o.status), fechada = o.status === "Concluída";
    const zap = c.phone ? waLink(c.phone, `Olá ${firstName(o.contato || c.name)}, tudo bem? Aqui é do Grupo Azul. Confirmando o atendimento (${TIPOS_OS[o.tipo][0].toLowerCase()}) ${o.d === HOJE ? "hoje" : "no dia " + fd(o.d)} às ${o.h} com ${firstName(emp(o.tec).name)}.`) : "";
    const fotos = (l, t) => l.length ? `<div><div class="eyebrow" style="margin-bottom:6px">${t}</div><div class="os-fotos">${l.map(fotoUrl).filter(Boolean).map(u => `<img src="${esc(u)}" alt="">`).join("")}</div></div>` : "";
    modal(`<div class="sheet-head"><div><div class="eyebrow">${o.n} · ${TIPOS_OS[o.tipo][1]} ${TIPOS_OS[o.tipo][0]}</div><h2>${esc(c.name)}</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
 <div class="et-resumo"><span class="chip ${ST[o.status]}">${o.status}</span><span>📅 <b>${quando(o)}</b></span><span>👷 ${esc(emp(o.tec).name)}</span>${o.contato ? `<span>👤 ${esc(o.contato)}</span>` : ""}${valorOS(o) ? `<span>💰 <b>${brl(valorOS(o))}</b>${fechada ? (o.pago ? " · recebido" : " · a receber") : " combinado"}</span>` : ""}</div>
 <div class="note" style="margin:0"><b>Problema:</b> ${esc(o.problema)}</div>
 ${fechada ? `<div><div class="eyebrow" style="margin-bottom:6px">O que foi feito</div><div>${esc(o.feito)}</div></div>
  ${o.mat.length ? `<div class="list">${o.mat.map(m => `<div class="row"><div class="grow">${esc(m.nome)}</div><span class="s num">${(+m.qtd).toLocaleString("pt-BR")} × ${brl(m.v)}</span><b class="num">${brl(m.qtd * m.v)}</b></div>`).join("")}${o.mao ? `<div class="row"><div class="grow">Mão de obra</div><b class="num">${brl(o.mao)}</b></div>` : ""}</div>` : ""}
  ${fotos(o.fotosAntes, "Antes")}${fotos(o.fotosDepois, "Depois")}
  ${o.assin ? `<div><div class="eyebrow" style="margin-bottom:6px">Assinatura do cliente</div><img class="os-assin" src="${o.assin}" alt="Assinatura"><div class="s">${esc(o.assinNome)} · ${fd(o.fechadaEm)}</div></div>` : `<div class="s">Fechada sem assinatura (cliente ausente).</div>`}` : ""}
 ${o.local && aberta ? mapaObra({ addr: o.local }) : o.local ? `<div class="s">📍 ${esc(o.local)}</div>` : ""}
 <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><span style="display:flex;gap:8px;flex-wrap:wrap">${!tec && aberta ? `<button class="btn ghost" id="odCanc">Cancelar OS</button><button class="btn" id="odEdit">Editar</button>` : ""}${zap && aberta && !tec ? `<a class="btn" href="${zap}" target="_blank" rel="noopener">Confirmar com o cliente</a>` : ""}</span>
  <span style="display:flex;gap:8px;flex-wrap:wrap">${o.status === "Aberta" ? `<button class="btn" id="odIni">Iniciar atendimento</button>` : ""}${aberta ? `<button class="btn primary" id="odFech">Fechar OS</button>` : ""}${fechada ? `${!tec && !o.pago ? `<button class="btn" id="odPago">Marcar como recebido</button>` : ""}<button class="btn" id="odPrint">Imprimir</button><button class="btn primary" id="odZap">📲 Enviar PDF no WhatsApp</button>` : ""}</span></div>`, true);
    const on = (id, fn) => { const b = $(id); if (b) b.onclick = fn };
    on("#odEdit", () => osForm(o));
    const cb = $("#odCanc"); if (cb) twoStep(cb, "Confirmar: cancelar", () => { closeModal(); act(async () => { if (DEMO) o.status = "Cancelada"; else await live(sb.from("ga_os").update({ status: "Cancelada" }).eq("id", o.id)) }, `${o.n} cancelada`) });
    on("#odIni", () => { closeModal(); act(async () => { if (DEMO) o.status = "Em andamento"; else await live(sb.rpc("ga_os_iniciar", { p_id: o.id })) }, "Atendimento iniciado") });
    on("#odFech", () => osFechar(o));
    on("#odPago", () => { closeModal(); act(async () => {
      if (DEMO) { o.pago = true; const l = lanc.find(x => x.desc.startsWith(o.n + " ")); if (l) { l.paid = true; l.d = HOJE } return }
      await live(sb.from("ga_os").update({ pago: true }).eq("id", o.id));
      if (o.lanc) await live(sb.from("ga_lancamentos").update({ pago: true, data: HOJE }).eq("id", o.lanc));
    }, "Recebimento confirmado") });
    on("#odPrint", () => printPaper(osPaper(o), o.n));
    on("#odZap", () => window.gaEnviarPdfWhats(osPaper(o), `${o.n} - ${c.name}`, c.phone, `Olá ${firstName(o.contato || c.name)}, segue a ordem de serviço ${o.n} do Grupo Azul (${TIPOS_OS[o.tipo][0].toLowerCase()}), total de ${brl(totalOS(o))}. Obrigado pela confiança!`));
  }

  /* ---------- fechar: o que foi feito, material, fotos e assinatura ---------- */
  function osFechar(o) {
    const c = clientById(o.cli), est = !DEMO && me.role === "tec" ? osEst : window.gaEstoque ? window.gaEstoque.itens().filter(i => i.qtd > 0) : [];
    let mat = o.mat.map(m => ({ ...m })), antes = [...o.fotosAntes], depois = [...o.fotosDepois], assinou = false;
    modal(`<div class="sheet-head"><div><div class="eyebrow">${o.n} · ${esc(c.name)}</div><h2>Fechar ordem de serviço</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
 <div class="field"><label for="ffF">O que foi feito</label><textarea class="input" id="ffF" placeholder="Ex.: trocamos o reparo da válvula e testamos a descarga">${esc(o.feito)}</textarea></div>
 <div class="field"><label>Material usado</label><div class="list" id="ffMat"></div>
  <div class="tool-add os-add"><select class="input" id="ffI"><option value="">Escolher do estoque…</option>${[...est].sort((a, b) => a.nome.localeCompare(b.nome)).map(i => `<option value="${i.id}">${esc(i.nome)} · tem ${(+i.qtd).toLocaleString("pt-BR")}</option>`).join("")}<option value="outro">Outro material (fora do estoque)</option></select><input class="input" id="ffN" placeholder="Nome do material" hidden><input class="input num" id="ffQ" type="number" min="0" step="0.5" value="1" placeholder="Qtd."><input class="input num" id="ffV" type="number" min="0" step="0.01" placeholder="Valor un. R$"><button type="button" class="btn sm" id="ffAdd">+ Adicionar</button></div></div>
 <div class="form-grid"><div class="field"><label for="ffM">Mão de obra (R$)</label><input class="input num" id="ffM" type="number" min="0" step="0.01" value="${o.mao || o.valor || ""}"></div><div class="field"><label for="ffPay">Forma de pagamento</label><select class="input" id="ffPay">${PAGS.map(p => `<option>${p}</option>`).join("")}</select></div></div>
 <div class="os-tot" id="ffTot"></div>
 <div class="form-grid"><div class="field"><label class="btn file-btn" for="ffA" style="justify-self:start">📷 <span id="ffAN">Fotos de antes</span><input type="file" id="ffA" accept="image/*" multiple hidden></label></div><div class="field"><label class="btn file-btn" for="ffD" style="justify-self:start">📷 <span id="ffDN">Fotos de depois</span><input type="file" id="ffD" accept="image/*" multiple hidden></label></div></div>
 <div class="field"><label>Assinatura do cliente</label><div class="assin-box"><canvas id="ffSig" aria-label="Área para o cliente assinar com o dedo"></canvas><span class="assin-hint" id="ffHint">Peça para o cliente assinar aqui com o dedo</span></div>
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input class="input" id="ffSN" value="${esc(o.contato || c.name)}" placeholder="Nome de quem assinou" style="flex:1;min-width:160px"><button type="button" class="btn sm ghost" id="ffLimpar">Limpar</button></div>
  <label class="task"><input type="checkbox" id="ffAus"><span>Cliente não estava no local (fechar sem assinatura)</span></label></div>
 ${me.role === "tec" ? "" : `<label class="task"><input type="checkbox" id="ffPago"><span>O cliente já pagou</span></label>`}
 <p class="s form-err" id="ffErr" hidden></p>
 <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="ffSave">Fechar OS</button></div>`, true);
    const tot = () => { const m = +$("#ffM").value || 0, s = mat.reduce((a, x) => a + x.qtd * x.v, 0); $("#ffTot").innerHTML = `<span>Material ${brl(s)}</span><span>Mão de obra ${brl(m)}</span><b>Total ${brl(s + m)}</b>` };
    const drawMat = () => {
      $("#ffMat").innerHTML = mat.map((m, i) => `<div class="row"><div class="grow"><div class="t">${esc(m.nome)}</div><div class="s">${(+m.qtd).toLocaleString("pt-BR")} × ${brl(m.v)}${m.item ? " · sai do estoque" : ""}</div></div><b class="num">${brl(m.qtd * m.v)}</b><button type="button" class="btn sm ghost" data-x="${i}" aria-label="Tirar">×</button></div>`).join("") || '<p class="s" style="margin:0">Nenhum material. Se usou algo, adicione abaixo.</p>';
      $$("#ffMat [data-x]").forEach(b => b.onclick = () => { mat.splice(+b.dataset.x, 1); drawMat() });
      tot();
    };
    drawMat(); $("#ffM").oninput = tot;
    $("#ffI").onchange = () => { const v = $("#ffI").value, i = est.find(x => x.id === +v); $("#ffN").hidden = v !== "outro"; if (i) $("#ffV").value = i.preco != null ? i.preco : Math.round(i.custo * 1.5 * 100) / 100; if (v === "outro") $("#ffN").focus() };
    $("#ffAdd").onclick = () => {
      const v = $("#ffI").value, i = est.find(x => x.id === +v), nome = i ? i.nome : $("#ffN").value.trim(), qtd = +$("#ffQ").value || 0;
      if (!nome || qtd <= 0) { $("#ffErr").textContent = "Escolha o material e a quantidade."; $("#ffErr").hidden = false; return }
      if (i && qtd > i.qtd) { $("#ffErr").textContent = `No estoque só tem ${(+i.qtd).toLocaleString("pt-BR")} ${i.un || ""}.`; $("#ffErr").hidden = false; return }
      $("#ffErr").hidden = true; mat.push({ nome, qtd, v: +$("#ffV").value || 0, item: i ? i.id : null });
      $("#ffI").value = ""; $("#ffN").value = ""; $("#ffN").hidden = true; $("#ffQ").value = 1; $("#ffV").value = ""; drawMat();
    };
    const fotosIn = (inp, lbl, alvo, txt) => $(inp).onchange = async () => { const fs = [...$(inp).files]; $(lbl).textContent = "Carregando…"; const urls = await uploadFiles(fs, `os/${o.id}`); alvo.push(...urls); $(lbl).textContent = `${txt} (${alvo.length})` };
    fotosIn("#ffA", "#ffAN", antes, "Fotos de antes"); fotosIn("#ffD", "#ffDN", depois, "Fotos de depois");
    if (antes.length) $("#ffAN").textContent = `Fotos de antes (${antes.length})`; if (depois.length) $("#ffDN").textContent = `Fotos de depois (${depois.length})`;

    // área de assinatura (dedo, caneta ou mouse)
    const cv = $("#ffSig"), g = cv.getContext("2d"), dpr = window.devicePixelRatio || 1;
    const fit = () => { const r = cv.getBoundingClientRect(); cv.width = r.width * dpr; cv.height = r.height * dpr; g.scale(dpr, dpr); g.lineWidth = 2.4; g.lineCap = g.lineJoin = "round"; g.strokeStyle = "#14233a"; g.fillStyle = "#fff"; g.fillRect(0, 0, r.width, r.height) };
    fit();
    let desenhando = false;
    const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] };
    cv.onpointerdown = e => { desenhando = true; cv.setPointerCapture(e.pointerId); const [x, y] = pt(e); g.beginPath(); g.moveTo(x, y); g.lineTo(x + .1, y + .1); g.stroke(); assinou = true; $("#ffHint").hidden = true };
    cv.onpointermove = e => { if (!desenhando) return; const [x, y] = pt(e); g.lineTo(x, y); g.stroke() };
    cv.onpointerup = cv.onpointercancel = () => { desenhando = false };
    $("#ffLimpar").onclick = () => { g.setTransform(1, 0, 0, 1, 0, 0); fit(); assinou = false; $("#ffHint").hidden = false };

    $("#ffSave").onclick = () => {
      const feito = $("#ffF").value.trim(), aus = $("#ffAus").checked, err = m => { $("#ffErr").textContent = m; $("#ffErr").hidden = false };
      if (!feito) return err("Conte o que foi feito.");
      if (!assinou && !aus) return err("Peça a assinatura do cliente ou marque que ele não estava no local.");
      const d = { feito, mat, mao: +$("#ffM").value || 0, pay: $("#ffPay").value, fotosAntes: antes, fotosDepois: depois, assin: assinou && !aus ? cv.toDataURL("image/jpeg", .85) : "", assinNome: aus ? "" : $("#ffSN").value.trim(), pago: !!($("#ffPago") && $("#ffPago").checked), status: "Concluída", fechadaEm: HOJE };
      closeModal();
      act(async () => {
        if (!DEMO) return void await live(sb.rpc("ga_os_fechar", { p_id: o.id, p_feito: d.feito, p_materiais: mat.map(m => ({ nome: m.nome, qtd: m.qtd, v: m.v, item: m.item || null })), p_mao: d.mao, p_forma: d.pay, p_fotos_antes: antes, p_fotos_depois: depois, p_assinatura: d.assin, p_assin_nome: d.assinNome, p_pago: d.pago }));
        Object.assign(o, d);
        mat.filter(m => m.item).forEach(m => window.gaEstoque.baixa(m.item, m.qtd, `${o.n} · ${c.name}`));
        const total = totalOS(o);
        if (total > 0) lancar({ type: "in", d: HOJE, desc: `${o.n} · ${TIPOS_OS[o.tipo][0]} · ${c.name}`, cat: o.tipo === "visita" ? "Visita técnica" : "Manutenção", who: o.contato || c.name, obra: null, pay: o.pay, v: total, paid: o.pago });
      }, `${o.n} fechada${totalOS(o) || d.mao || mat.length ? " · " + brl(d.mao + mat.reduce((a, x) => a + x.qtd * x.v, 0)) + (d.pago ? " recebido" : " a receber no Financeiro") : ""}`).then(ok => { if (ok) osDetail(ordens.find(x => x.id === o.id) || o) });
    };
  }

  /* ---------- PDF da OS ---------- */
  function osPaper(o) {
    const c = clientById(o.cli), mat = o.mat, sub = mat.reduce((s, m) => s + m.qtd * m.v, 0);
    const fotos = (l, t) => l.length ? `<div><div class="lbl">${t}</div><div class="pfotos">${l.map(fotoUrl).filter(Boolean).slice(0, 8).map(u => `<img src="${esc(u)}" alt="">`).join("")}</div></div>` : "";
    return `<div class="paper">${paperHead("ORDEM DE SERVIÇO", [o.n, `Atendimento em ${fd(o.fechadaEm || o.d)}`])}
  <div class="pb">
   <div class="cols"><div><div class="lbl">Cliente</div><b>${esc(c.name)}</b>${o.contato && o.contato !== c.name ? "<br>" + esc(o.contato) : ""}${c.phone ? "<br>" + esc(c.phone) : ""}${o.local ? "<br>" + esc(o.local) : ""}</div><div><div class="lbl">Serviço</div><b>${TIPOS_OS[o.tipo][0]}</b><br>Técnico: ${esc(emp(o.tec).name)}<br>${fd(o.d)} às ${o.h}</div></div>
   <div><div class="lbl">Problema relatado</div>${esc(o.problema)}</div>
   <div><div class="lbl">O que foi feito</div><div class="pre">${esc(o.feito)}</div></div>
   <table><thead><tr><th>Descrição</th><th class="r">Qtd.</th><th class="r">Valor un.</th><th class="r">Total</th></tr></thead><tbody>
    ${mat.map(m => `<tr><td>${esc(m.nome)}</td><td class="r num">${(+m.qtd).toLocaleString("pt-BR")}</td><td class="r num">${brl(m.v)}</td><td class="r num">${brl(m.qtd * m.v)}</td></tr>`).join("")}
    ${o.mao ? `<tr><td>Mão de obra</td><td class="r num">1</td><td class="r num">${brl(o.mao)}</td><td class="r num">${brl(o.mao)}</td></tr>` : ""}
   </tbody></table>
   <div class="tot num">${mat.length ? `<div><span>Material</span><span>${brl(sub)}</span></div>` : ""}<div class="g"><span>Total</span><span>${brl(totalOS(o))}</span></div><div><span>Pagamento</span><span>${esc(o.pay || "—")}${o.pago ? " · pago" : ""}</span></div></div>
   ${fotos(o.fotosAntes, "Antes")}${fotos(o.fotosDepois, "Depois")}
   <div class="cols" style="margin-top:8px"><div>${o.assin ? `<img src="${o.assin}" alt="" style="height:64px;display:block;margin-bottom:-18px">` : ""}<div class="sign">${o.assin ? esc(o.assinNome || c.name) + " · cliente" : "Cliente ausente no fechamento"}</div></div><div><div class="sign" style="margin-top:${o.assin ? 46 : 26}px">${esc(emp(o.tec).name)} · ${esc(EMPRESA.nome)}</div></div></div>
   <div class="frase">Garantia de 90 dias sobre o serviço executado.</div>
  </div>${paperFoot(o.n + " · " + c.name)}</div>`;
  }

  /* ---------- menu e dados ---------- */
  PAGES.splice(PAGES.findIndex(p => p[0] === "obr") + 1, 0, ["os", "Ordens de serviço"]);
  ALLOWED.admin.push("os"); ALLOWED.fin.push("os"); ALLOWED.tec.push("os");
  const si = SOON.findIndex(s => s[0] === "os"); if (si >= 0) SOON.splice(si, 1);
  const _renderNav = renderNav;
  renderNav = () => {
    _renderNav();
    const b = $("#nav button[data-p=os]"), base = me.role === "tec" ? minhas() : ordens, n = base.filter(o => ["Aberta", "Em andamento"].includes(o.status) && o.d <= HOJE).length;
    if (b && n) b.insertAdjacentHTML("beforeend", `<span class="nbadge info">${n}</span>`);
  };
  // app real: carrega as OS depois do resto
  const _reload = reload;
  reload = async () => {
    await _reload();
    if (DEMO) return;
    try {
      const rows = await sel("ga_os", q => q.gte("data", addDays(HOJE, -730)));
      ordens = rows.map(o => ({ id: o.id, n: numOS(o.id), cli: o.cliente_id, tipo: TIPOS_OS[o.tipo] ? o.tipo : "manut", local: o.local || "", problema: o.problema, contato: o.contato || "", tec: o.tecnico, d: o.data, h: o.hora, valor: +o.valor, status: o.status, feito: o.feito || "", mat: (o.materiais || []).map(m => ({ nome: m.nome, qtd: +m.qtd, v: +m.v, item: m.item || null })), mao: +o.mao, pay: o.forma || "", pago: o.pago, fotosAntes: o.fotos_antes || [], fotosDepois: o.fotos_depois || [], assin: o.assinatura || "", assinNome: o.assin_nome || "", fechadaEm: o.fechada_em, lanc: o.lancamento_id }));
      osEst = me.role === "tec" ? (await live(sb.rpc("ga_estoque_lista")) || []).map(i => ({ ...i, qtd: +i.qtd, preco: +i.preco })) : [];
      // links temporários das fotos das OS
      const paths = [...new Set(ordens.flatMap(o => [...o.fotosAntes, ...o.fotosDepois]))].filter(p => !FOTO_URL[p]);
      for (let i = 0; i < paths.length; i += 100) {
        const { data } = await sb.storage.from(BUCKET).createSignedUrls(paths.slice(i, i + 100), 60 * 60 * 6);
        (data || []).forEach(x => { if (x.signedUrl) FOTO_URL[x.path] = x.signedUrl });
      }
      falta008 = false;
    } catch (e) { console.warn("008 ainda não rodou?", e); falta008 = true; ordens = []; osEst = [] }
  };

  // as OS continuam entre um login e outro (dono abre, funcionário fecha), com os lançamentos delas
  let semeado = false;
  const _loadDemo = loadDemo;
  loadDemo = () => { _loadDemo(); osFiltro = "abertas"; osQ = ""; if (!semeado) { semeado = true; seedOS() } else osLanc.forEach(l => { l.id = nextId(lanc); lanc.push(l) }) };
})();
