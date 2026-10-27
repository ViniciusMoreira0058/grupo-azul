/* Notificações no celular.
   Escritório → funcionário: entrou numa obra, prazo da obra mudou, compromisso ou confraternização na agenda,
   OS nova/remarcada/cancelada, resposta sobre o material pedido.
   Funcionário → escritório: feedback do dia, problema na obra, pedido de material, OS concluída.
   Por enquanto só na demonstração: o aviso aparece quando se entra com o perfil de quem recebe. */
(() => {
  if (!DEMO) return;
  const PREF = "ga-notif";
  const pref = () => { try { return localStorage.getItem(PREF) } catch (e) { return null } };
  const setPref = v => { try { localStorage.setItem(PREF, v) } catch (e) { } };
  const suporta = () => "Notification" in window;
  const ligado = () => suporta() && Notification.permission === "granted" && pref() !== "off";
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const instalado = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

  // avisos da demonstração: continuam entre um login e outro (até recarregar a página)
  let avisos = [];
  const meus = () => avisos.filter(a => a.para === me.id).sort((a, b) => b.em - a.em);
  const naoLidos = () => meus().filter(a => !a.lido);

  /* ---------- o que mudou depois de cada ação ---------- */
  const lista = (g, k) => (window[g] && window[g].lista ? window[g].lista() : []);
  function foto() {
    const ob = {}, ag = {}, os = {};
    obras.forEach(o => ob[o.id] = { cli: o.client, t: o.title, start: o.start, end: o.end, team: [...new Set([o.resp, ...o.team].filter(Boolean))],
      log: o.log.map(l => ({ who: l.who, d: l.d, pct: l.pct, text: l.text, problem: l.problem })),
      miss: o.missing.map(m => ({ k: m.id || `${m.by}|${m.d}|${m.item}`, item: m.item, qty: m.qty, urgent: m.urgent, by: m.by, st: m.st, reply: m.reply })) });
    lista("gaAgenda").forEach(e => ag[e.id] = { d: e.d, h: e.h, tipo: e.tipo, titulo: e.titulo, local: e.local, ve: e.equipeVe ? [...e.quem] : [] });
    lista("gaOS").forEach(o => os[o.id] = { n: o.n, cli: o.cli, tec: o.tec, d: o.d, h: o.h, tipo: o.tipo, status: o.status, total: (+o.mao || 0) + (o.mat || []).reduce((s, m) => s + m.qtd * m.v, 0) });
    return JSON.parse(JSON.stringify({ ob, ag, os }));
  }
  const quando = d => d === HOJE ? "hoje" : d === addDays(HOJE, 1) ? "amanhã" : `${DIA[D(d).getDay()]}, ${fd(d).slice(0, 5)}`;
  const tec = id => { const e = staff.find(x => x.id === id); return e && e.access === "tec" && e.active && id !== me.id };
  const escritorio = (...perfis) => staff.filter(e => perfis.includes(e.access) && e.active && !e.oculto && e.id !== me.id).map(e => e.id);
  const TIPO_OS = { vazamento: "Vazamento", desentup: "Desentupimento", troca: "Troca de peça", manut: "Manutenção", instal: "Instalação", visita: "Visita técnica" };

  function comparar(a, b) {
    const sai = [], quem = firstName(me.name);
    const manda = (para, titulo, corpo, p) => [].concat(para).forEach(id => sai.push({ id: Math.random().toString(36).slice(2), para: id, de: me.id, titulo, corpo, p, em: Date.now(), lido: false }));
    if (me.role === "tec") {
      Object.entries(b.ob).forEach(([id, o]) => {
        const v = a.ob[id] || { log: [], miss: [] }, cli = clientById(o.cli).name;
        o.log.filter(l => l.who === me.id).forEach(l => {
          const antes = v.log.find(x => x.who === l.who && x.d === l.d); // um feedback por pessoa por dia
          if (antes && antes.text === l.text && antes.pct === l.pct && antes.problem === l.problem) return;
          if (l.problem && (!antes || antes.problem !== l.problem)) manda(escritorio("admin"), `⚠️ Problema na obra · ${cli}`, `${quem}: ${l.problem}`, "obr");
          else manda(escritorio("admin"), `${antes ? "Feedback atualizado" : "Feedback do dia"} · ${cli}`, `${quem}: obra em ${l.pct}%. ${l.text}`, "obr");
        });
        o.miss.filter(m => m.by === me.id && !v.miss.some(x => x.k === m.k)).forEach(m =>
          manda(escritorio("admin"), m.urgent ? `🚨 Falta material e parou a obra · ${cli}` : `Pedido de material · ${cli}`, `${quem} pediu ${m.item}${m.qty ? ` (${m.qty})` : ""}.`, "lem"));
      });
      Object.entries(b.os).forEach(([id, o]) => {
        const v = a.os[id];
        if (v && v.status !== "Concluída" && o.status === "Concluída") manda(escritorio("admin", "fin"), `OS concluída · ${clientById(o.cli).name}`, `${o.n} · ${TIPO_OS[o.tipo] || ""} · feita por ${quem}${o.total ? ` · ${brl(o.total)} a receber` : ""}.`, "os");
      });
    } else {
      // obras: entrou na equipe, ou as datas mudaram
      Object.entries(b.ob).forEach(([id, o]) => {
        const v = a.ob[id], cli = clientById(o.cli).name;
        o.team.filter(tec).forEach(p => {
          if (!v || !v.team.includes(p)) manda(p, `Você está na obra · ${cli}`, `${o.t}. Começa ${quando(o.start)}, entrega prevista ${fd(o.end)}.`, "obr");
          else if (v.end !== o.end || v.start !== o.start) manda(p, `Datas da obra mudaram · ${cli}`, `${o.t}: agora de ${fd(o.start)} a ${fd(o.end)}.`, "obr");
        });
        (o.miss || []).forEach(m => {
          const x = v && v.miss.find(y => y.k === m.k);
          if (x && tec(m.by) && (x.reply !== m.reply || (x.st !== m.st && m.st !== "Aberto"))) manda(m.by, `Sobre o material que você pediu`, `${m.item}: ${m.reply || (m.st === "Resolvido" ? "já foi comprado." : m.st)}`, "obr");
        });
      });
      // agenda: só o que está marcado para o funcionário ver
      Object.entries(b.ag).forEach(([id, e]) => {
        const v = a.ag[id], festa = e.tipo === "confra";
        e.ve.filter(tec).forEach(p => {
          if (!v || !v.ve.includes(p)) manda(p, festa ? "🎉 Confraternização" : "Novo na sua agenda", `${e.titulo} · ${cap(quando(e.d))} às ${e.h}${e.local ? ` · ${e.local}` : ""}`, "agd");
          else if (v.d !== e.d || v.h !== e.h) manda(p, festa ? "🎉 Confraternização mudou de dia" : "Compromisso remarcado", `${e.titulo} · agora ${quando(e.d)} às ${e.h}`, "agd");
        });
      });
      Object.entries(a.ag).forEach(([id, e]) => { if (!b.ag[id]) e.ve.filter(tec).forEach(p => manda(p, "Compromisso cancelado", `${e.titulo} · ${quando(e.d)} às ${e.h}`, "agd")) });
      // ordens de serviço
      Object.entries(b.os).forEach(([id, o]) => {
        const v = a.os[id], cli = clientById(o.cli).name, txt = `${o.n} · ${TIPO_OS[o.tipo] || ""} · ${cli}`;
        if (!o.tec || !tec(o.tec)) return;
        if (o.status === "Cancelada") { if (v && v.status !== "Cancelada") manda(o.tec, "OS cancelada", txt, "os"); return }
        if (!v || v.tec !== o.tec) manda(o.tec, "Nova ordem de serviço para você", `${txt} · ${cap(quando(o.d))} às ${o.h}`, "os");
        else if (v.d !== o.d || v.h !== o.h) manda(o.tec, "OS remarcada", `${txt} · agora ${quando(o.d)} às ${o.h}`, "os");
      });
      Object.entries(a.os).forEach(([id, o]) => { if (!b.os[id] && o.tec && tec(o.tec) && ["Aberta", "Em andamento"].includes(o.status)) manda(o.tec, "OS cancelada", `${o.n} · ${clientById(o.cli).name}`, "os") });
    }
    if (!sai.length) return;
    avisos.push(...sai);
    enviado(sai);
    sino();
  }

  const _act = act;
  act = async (fn, msg) => {
    let antes = null; try { if (me) antes = foto() } catch (e) { }
    const ok = await _act(fn, msg);
    if (ok && antes && me) try { comparar(antes, foto()) } catch (e) { console.warn("avisos", e) }
    return ok;
  };

  /* ---------- como o aviso aparece ---------- */
  // cartão no alto da tela, com a cara da notificação do celular
  function cartao(a, rotulo) {
    let box = $("#avPilha"); if (!box) { box = document.createElement("div"); box.id = "avPilha"; box.className = "av-pilha"; document.body.appendChild(box) }
    const c = document.createElement("button"); c.type = "button"; c.className = "av-card";
    c.innerHTML = `<img src="icons/icon-192.png" alt=""><div><div class="av-top"><b>Grupo Azul</b><span>${esc(rotulo || "agora")}</span></div><div class="t">${esc(a.titulo)}</div><div class="s">${esc(a.corpo)}</div></div>`;
    c.onclick = () => { c.remove(); if (a.para === me.id) abrir(a) };
    box.appendChild(c); while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => c.classList.add("sai"), 5200); setTimeout(() => c.remove(), 5600);
  }
  async function sistema(a) {
    if (!ligado()) return false;
    const op = { body: a.corpo, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: a.id, data: { p: a.p } };
    try { const r = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (r) { await r.showNotification(a.titulo, op); return true } } catch (e) { }
    try { const n = new Notification(a.titulo, op); n.onclick = () => { window.focus(); n.close(); abrir(a) }; return true } catch (e) { return false }
  }
  // quem fez a ação vê para quem foi o aviso
  function enviado(sai) {
    const nomes = [...new Set(sai.map(a => firstName(emp(a.para).name)))];
    const lista = nomes.length > 3 ? `${nomes.slice(0, 3).join(", ")} e mais ${nomes.length - 3}` : nomes.length > 1 ? `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}` : nomes[0];
    setTimeout(() => cartao({ ...sai[0], para: null }, `vai para ${lista}`), 600);
  }
  function abrir(a) { a.lido = true; sino(); closeModal(); if (can(a.p)) go(a.p) }
  // chegando: quem entra vê o que mandaram para ele
  function entregar() {
    const n = naoLidos().filter(a => !a.entregue); if (!n.length) return;
    n.forEach(a => a.entregue = true);
    n.slice(0, 3).reverse().forEach((a, i) => setTimeout(() => { sistema(a); cartao(a) }, 900 + i * 700));
    if (n.length > 3) setTimeout(() => cartao({ titulo: `Mais ${n.length - 3} avisos`, corpo: "Toque no sino para ver todos.", p: "", para: null }), 900 + 3 * 700);
  }

  /* ---------- sino no topo e lista de avisos ---------- */
  function sino() {
    if (!me) return;
    let b = $("#sinoBtn");
    if (!b) { b = document.createElement("button"); b.id = "sinoBtn"; b.className = "sino"; b.setAttribute("aria-label", "Avisos"); b.onclick = listaAvisos; $("#topAvatar").before(b) }
    const n = naoLidos().length;
    b.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>${n ? `<span class="nbadge">${n > 9 ? "9+" : n}</span>` : ""}`;
    botaoMenu();
  }
  const ha = ms => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? "agora" : m < 60 ? `há ${m} min` : `há ${Math.round(m / 60)} h` };
  function listaAvisos() {
    const l = meus();
    modal(`<div class="sheet-head"><div><div class="eyebrow">Avisos</div><h2>${l.length ? `${naoLidos().length} novo${naoLidos().length === 1 ? "" : "s"}` : "Nada por aqui"}</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
 ${l.length ? `<div class="list">${l.map(a => `<button class="row av-row ${a.lido ? "" : "novo"}" data-av="${a.id}"><div class="grow"><div class="t">${esc(a.titulo)}</div><div class="s">${esc(a.corpo)}</div><div class="s">${ha(a.em)}${a.de ? ` · ${esc(firstName(emp(a.de).name))}` : ""}</div></div></button>`).join("")}</div>`
        : `<p class="s" style="margin:0">${me.role === "tec" ? "Quando o escritório colocar você numa obra, marcar algo na sua agenda ou mandar uma OS, o aviso aparece aqui." : "Quando a equipe mandar feedback, pedir material ou fechar uma OS, o aviso aparece aqui."}</p>`}
 <div style="display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap">${naoLidos().length ? `<button class="btn" id="avTodos">Marcar todos como lidos</button>` : ""}<button class="btn primary" id="avCfg">${ligado() ? "🔔 Notificações ligadas" : "🔔 Ativar notificações"}</button></div>`);
    $$("[data-av]").forEach(r => r.onclick = () => abrir(avisos.find(a => a.id === r.dataset.av)));
    if ($("#avTodos")) $("#avTodos").onclick = () => { meus().forEach(a => a.lido = true); sino(); listaAvisos() };
    $("#avCfg").onclick = ativar;
  }

  /* ---------- botão no menu: Ativar notificações ---------- */
  const RECEBE = {
    tec: ["Quando você entrar numa obra ou a data dela mudar", "Compromisso ou confraternização na sua agenda", "Ordem de serviço nova, remarcada ou cancelada", "Resposta sobre o material que você pediu"],
    admin: ["Feedback do dia de cada obra", "Problema relatado na obra", "Pedido de material (e quando está parando a obra)", "OS concluída pelo funcionário"],
    fin: ["OS concluída pelo funcionário, com o valor a receber"]
  };
  function botaoMenu() {
    let b = $("#notifBtn");
    if (!b) {
      b = document.createElement("button"); b.id = "notifBtn"; b.type = "button";
      $("#themeBtn").before(b); b.onclick = () => { closeDrawer(); ativar() };
    }
    b.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg><span>${ligado() ? "Notificações ligadas" : "Ativar notificações"}</span>${ligado() ? '<span class="nbadge info">✓</span>' : ""}`;
  }
  async function registrar() { try { if ("serviceWorker" in navigator) { await navigator.serviceWorker.register("sw.js"); await navigator.serviceWorker.ready } } catch (e) { console.warn("sw", e) } }
  async function ativar() {
    const recebe = `<div class="card" style="background:var(--surface-2)"><div class="eyebrow" style="margin-bottom:6px">Você vai receber</div><ul style="margin:0;padding-left:18px">${RECEBE[me.role].map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>`;
    const demoNota = `<div class="s">Na demonstração o aviso aparece neste aparelho quando você entra com o perfil de quem recebe. Teste: entre como Dono, mande uma OS para o Carlos, saia e entre como Funcionário.</div>`;
    const cab = t => `<div class="sheet-head"><div><div class="eyebrow">Notificações no celular</div><h2>${t}</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>`;
    if (!suporta()) {
      modal(`${cab(ios && !instalado() ? "Primeiro, coloque o app na tela de início" : "Este navegador não mostra notificações")}
 ${ios && !instalado() ? `<p style="margin:0">No iPhone, a Apple só deixa mandar notificação para app instalado na tela de início:</p><ol style="margin:0;padding-left:20px"><li>Abra o app no <b>Safari</b></li><li>Toque em <b>Compartilhar</b> (o quadrado com a seta para cima)</li><li>Toque em <b>Adicionar à Tela de Início</b></li><li>Abra o Grupo Azul pelo ícone novo e toque aqui de novo</li></ol>` : `<p style="margin:0">Abra o app no Chrome (Android ou computador) ou instale na tela de início do iPhone.</p>`}
 ${recebe}${demoNota}
 <div style="display:flex;justify-content:flex-end"><button class="btn primary" data-close>Entendi</button></div>`);
      return;
    }
    if (Notification.permission === "default") {
      let r = "default"; try { r = await Notification.requestPermission() } catch (e) { }
      if (r === "granted") { setPref("on"); await registrar(); sino(); sistema({ titulo: "Notificações ligadas ✓", corpo: "É assim que os avisos do Grupo Azul vão chegar.", p: "", id: "teste" }) }
      sino(); if (r !== "granted") return ativar();
    }
    if (Notification.permission === "denied") {
      modal(`${cab("As notificações estão bloqueadas")}
 <p style="margin:0">O celular bloqueou os avisos deste app. Para liberar:</p>
 <ul style="margin:0;padding-left:18px"><li><b>Android (Chrome):</b> toque no cadeado ao lado do endereço → Permissões → Notificações → Permitir</li><li><b>iPhone:</b> Ajustes → Notificações → Grupo Azul → Permitir</li><li><b>Computador:</b> clique no cadeado ao lado do endereço e permita as notificações</li></ul>
 ${recebe}<div style="display:flex;justify-content:flex-end"><button class="btn primary" data-close>Entendi</button></div>`);
      return;
    }
    // permitido: liga, desliga ou testa
    modal(`${cab(ligado() ? "Ligadas neste aparelho ✓" : "Desligadas neste aparelho")}
 ${recebe}${demoNota}
 <div style="display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap"><button class="btn" id="ntOnOff">${ligado() ? "Desligar neste aparelho" : "Ligar neste aparelho"}</button><button class="btn primary" id="ntTeste" ${ligado() ? "" : "disabled"}>Mandar um teste</button></div>`);
    $("#ntOnOff").onclick = async () => { setPref(ligado() ? "off" : "on"); if (ligado()) await registrar(); sino(); ativar(); toast(ligado() ? "Notificações ligadas" : "Notificações desligadas neste aparelho") };
    $("#ntTeste").onclick = async () => { const ok = await sistema({ titulo: "Teste do Grupo Azul", corpo: `Oi, ${firstName(me.name)}! As notificações estão funcionando.`, p: "", id: "teste" }); toast(ok ? "Teste enviado. Olhe a barra de notificações." : "Não deu para mostrar a notificação neste navegador.") };
  }

  // tocou na notificação do celular: abre a tela certa
  if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", e => { const p = e.data && e.data.irPara; if (me && p && can(p)) go(p) });

  // dados da demonstração continuam entre um login e outro, para o aviso fazer sentido do outro lado
  let anterior = false;
  const _loadDemo = loadDemo;
  loadDemo = () => {
    const prev = anterior ? { staff, clients, quotes, obras, lanc, lembretes } : null, ids = prev ? prev.lanc.map(l => l.id) : [];
    _loadDemo(); anterior = true;
    if (prev) { ({ staff, clients, quotes, obras, lanc, lembretes } = prev); lanc.forEach((l, i) => l.id = ids[i]) }
  };
  const _enterApp = enterApp;
  enterApp = () => { const pilha = $("#avPilha"); if (pilha) pilha.remove(); _enterApp(); sino(); if (ligado()) registrar(); setTimeout(entregar, 400) };
})();
