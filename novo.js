/* Módulos novos (precisam do supabase/007_etapas_estoque_agenda.sql no app real):
   1. Evolução da obra por etapas (dias por etapa, feedback em 3 níveis, atraso em dias)
   2. Estoque (materiais, entrada, baixa por obra, alerta de acabando)
   3. Agenda (visitas, manutenções, confraternização, aviso ao funcionário)
   4. Orçamento aprovado vira obra com um toque + PDF direto no WhatsApp
   5. Ferramentas sob responsabilidade do funcionário
   Obras antigas (sem dias nas etapas) continuam com o jeito anterior. */
(() => {
  // no app real: true enquanto o 007 não foi rodado no Supabase (aí fica tudo como antes)
  let falta007 = false;
  const novoOk = () => DEMO || !falta007;
  const avisoSql = () => `<div class="card"><h2>Quase pronto</h2><p class="s" style="margin:6px 0 0">${me.role === "admin" ? "Para usar esta parte, rode o arquivo <b>007_etapas_estoque_agenda.sql</b> no SQL Editor do Supabase." : "Esta parte ainda está sendo preparada pelo administrador."}</p></div>`;

  /* =====================================================================
     1. OBRA POR ETAPAS
     ===================================================================== */
  const isDom = iso => D(iso).getDay() === 0;
  const proxUtil = iso => { while (isDom(iso)) iso = addDays(iso, 1); return iso };
  // data em que termina um trabalho de n dias úteis começando em iso (domingo não conta)
  const fimUteis = (iso, n) => { let d = proxUtil(iso), k = 1; while (k < n) { d = addDays(d, 1); if (!isDom(d)) k++ } return d };
  const uteisEntre = (a, b) => { let n = 0; for (let d = a; d < b; d = addDays(d, 1)) if (!isDom(d)) n++; return n }; // [a, b)
  const NIV = { bom: { v: 1, t: "Avançou bem", i: "🚀", c: "c-good" }, pouco: { v: .5, t: "Avançou pouco", i: "🐢", c: "c-warn" }, parado: { v: 0, t: "Não avançou", i: "⛔", c: "c-bad" } };
  const diasTxt = n => `${n} ${n === 1 ? "dia" : "dias"}`;

  // calcula tudo a partir das etapas e dos feedbacks
  function calc(o) {
    const et = o.etapas, total = et.reduce((s, e) => s + e.dias, 0) || 1;
    const porDia = {}; o.log.forEach(l => { const v = NIV[l.nivel || "bom"].v; porDia[l.d] = Math.max(porDia[l.d] ?? 0, v) });
    const bruto = et.map(() => 0);
    Object.keys(porDia).sort().forEach(d => {
      // o dia conta para a primeira etapa que ainda não tinha sido concluída antes desse dia
      const i = et.findIndex(e => !(e.ok && e.okEm < d)); if (i >= 0) bruto[i] += porDia[d];
    });
    const cred = et.map((e, i) => e.ok ? e.dias : Math.min(e.dias, bruto[i]));
    const feito = cred.reduce((a, b) => a + b, 0), cur = et.findIndex(e => !e.ok);
    const esperado = TODAY < D(o.start) ? 0 : Math.min(total, uteisEntre(o.start, HOJE));
    const atraso = Math.round((esperado - feito) * 2) / 2;
    const falta = total - feito, previsao = falta > 0 ? fimUteis(addDays(HOJE, porDia[HOJE] != null ? 1 : 0), Math.ceil(falta)) : (o.log[0] || {}).d || HOJE;
    return { total, cred, bruto, feito, cur, esperado, atraso, previsao, pct: Math.round(feito / total * 100), passou: cur >= 0 ? Math.max(0, bruto[cur] - et[cur].dias) : 0 };
  }
  function syncObra(o) {
    if (!o.etapas) return;
    const k = calc(o);
    o.pct = o.etapas.every(e => e.ok) ? 100 : Math.min(99, k.pct);
    o.end = fimUteis(o.start, k.total);
    o.tasks = o.etapas.map(e => [e.t, e.ok]);
  }
  const atrasoTxt = a => a >= 1 ? `${diasTxt(Math.ceil(a))} de atraso` : a <= -1 ? `${diasTxt(Math.floor(-a))} adiantada` : "no ritmo certo";

  const _obraStatus = obraStatus;
  obraStatus = o => {
    if (!o.etapas) return _obraStatus(o);
    if (o.pct >= 100) return ["Concluída", "c-good"];
    if (TODAY < D(o.start)) return ["Não iniciada", "c-mute"];
    const a = calc(o).atraso;
    if (a >= 1) return ["Atrasada", "c-bad"];
    if (a <= -2) return ["Adiantada", "c-good"];
    return ["No prazo", "c-info"];
  };
  // aviso no card do funcionário, em dias
  const _alertaObra = alertaObra;
  alertaObra = o => {
    if (!o.etapas || o.pct >= 100 || TODAY < D(o.start)) return _alertaObra(o);
    const st = obraStatus(o)[0], k = calc(o);
    if (st === "Atrasada") return `<div class="alerta"><span class="sirene" aria-hidden="true">🚨</span><div><b>Obra ${diasTxt(Math.ceil(k.atraso))} atrasada</b><br>Do jeito que está, a entrega fica para ${fd(k.previsao)} (o prazo é ${fd(o.end)}). Hoje é dia de acelerar.</div></div>`;
    if (st === "Adiantada") return `<div class="boa"><span aria-hidden="true">🚀</span><div><b>Vocês estão ${diasTxt(Math.floor(-k.atraso))} adiantados!</b><br>Nesse ritmo a entrega fica para ${fd(k.previsao)}. Terminem o quanto antes para seguir para a próxima obra.</div></div>`;
    return "";
  };

  const _progLine = progLine;
  progLine = o => {
    if (!o.etapas) return _progLine(o);
    const k = calc(o), started = TODAY >= D(o.start), late = obraStatus(o)[0] === "Atrasada";
    const seg = o.etapas.map((e, i) => `<span class="et-seg ${e.ok ? "ok" : i === k.cur ? "cur" : ""}" style="flex:${e.dias}" title="${esc(e.t)} · ${diasTxt(e.dias)}"><i style="width:${Math.round(k.cred[i] / e.dias * 100)}%"></i></span>`).join("");
    const atual = k.cur >= 0 ? o.etapas[k.cur] : null;
    return `<div class="pl et"><div class="et-track ${late ? "late" : ""}">${seg}${started && o.pct < 100 ? `<b class="pl-exp" style="left:${k.esperado / k.total * 100}%" title="Onde deveria estar hoje"></b>` : ""}</div>
 <div class="pl-legend"><span><b class="num" style="color:var(--fg)">${o.pct}%</b> concluído${atual ? ` · agora: <b style="color:var(--fg)">${esc(atual.t)}</b>` : ""}</span><span class="num">${o.pct >= 100 ? "Entregue" : !started ? `Começa em ${fd(o.start)}` : `<b class="${k.atraso >= 1 ? "down" : k.atraso <= -2 ? "up" : ""}">${atrasoTxt(k.atraso)}</b>`}</span></div></div>`;
  };

  // lista das etapas com dias e situação
  function etapasHtml(o, compacto) {
    const k = calc(o);
    return `<div class="et-list">${o.etapas.map((e, i) => {
      const st = e.ok ? `<span class="chip c-good">Concluída${e.okEm ? " " + fd(e.okEm).slice(0, 5) : ""}</span>` : i === k.cur && TODAY >= D(o.start) ? `<span class="chip c-info">Agora · dia ${Math.min(e.dias, Math.floor(k.bruto[i]) + 1)} de ${e.dias}</span>` : `<span class="chip c-mute">${diasTxt(e.dias)}</span>`;
      return `<div class="et-row ${e.ok ? "ok" : i === k.cur ? "cur" : ""}"><span class="tick ${e.ok ? "on" : ""}">${e.ok ? "✓" : i + 1}</span><div class="grow"><div>${esc(e.t)}</div>${!compacto && i === k.cur && k.passou > 0 ? `<div class="s down">Passou ${diasTxt(Math.ceil(k.passou))} do previsto</div>` : ""}</div>${st}</div>`;
    }).join("")}</div>`;
  }
  function resumoEtapas(o) {
    const k = calc(o);
    return `<div class="et-resumo"><span><b>${diasTxt(k.total)}</b> úteis planejados</span><span>Prazo <b>${fd(o.end)}</b></span>${o.pct < 100 && TODAY >= D(o.start) ? `<span>Previsão de entrega <b class="${k.previsao > o.end ? "down" : "up"}">${fd(k.previsao)}</b></span>` : ""}</div>`;
  }

  // dono: cadastro da obra com etapas e dias, prazo calculado
  const _obraForm = obraForm;
  obraForm = (o, pre) => {
    if ((o && !o.etapas) || !novoOk()) return _obraForm(o);
    if (!clients.length) { toast("Cadastre o cliente antes de cadastrar a obra."); go("cli"); return }
    const field = staff.filter(e => e.active && e.access === "tec" || (o && (e.id === o.resp || o.team.includes(e.id))));
    if (!field.length) { toast("Cadastre pelo menos um funcionário de campo antes."); go("func"); return }
    const v = o || Object.assign({ client: clients[0].id, title: "", addr: "", start: proxUtil(addDays(HOJE, 1)), resp: field[0].id, team: [], notes: "", etapas: [{ t: "", dias: 5 }] }, pre || {});
    let ets = v.etapas.map(e => ({ ...e }));
    modal(`<div class="sheet-head"><div><div class="eyebrow">${pre && pre.quote ? "Orçamento " + esc(quotes.find(q => q.id === pre.quote).n) + " aprovado" : "Obra por etapas"}</div><h2>${o ? "Editar obra" : "Nova obra"}</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
 <div class="form-grid"><div class="field"><label for="noC">Cliente</label><select class="input" id="noC">${clients.map(c => `<option value="${c.id}" ${c.id === v.client ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div><div class="field"><label for="noT">Serviço</label><input class="input" id="noT" value="${esc(v.title)}" placeholder="Ex.: Pressurização + aquecimento"></div></div>
 <div class="field"><label for="noA">Endereço</label><input class="input" id="noA" value="${esc(v.addr)}" placeholder="Rua, número · bairro, cidade"></div>
 <div class="form-grid"><div class="field"><label for="noS">Início</label><input class="input" type="date" id="noS" value="${v.start}"></div><div class="field"><label for="noR">Responsável</label><select class="input" id="noR">${field.map(e => `<option value="${e.id}" ${e.id === v.resp ? "selected" : ""}>${esc(e.name)} · ${esc(e.role)}</option>`).join("")}</select></div></div>
 <div class="field"><label>Equipe</label><div style="display:flex;flex-wrap:wrap;gap:4px 16px">${field.map(e => `<label class="task"><input type="checkbox" id="noTm_${e.id}" ${v.team.includes(e.id) ? "checked" : ""}><span>${esc(e.name)}</span></label>`).join("")}</div></div>
 <div class="field"><label>Etapas e quantos dias cada uma leva</label><div id="etEd" class="et-ed"></div><button type="button" class="btn sm" id="etAdd" style="justify-self:start">+ Adicionar etapa</button>
  <div class="note" id="etPrazo" style="margin:4px 0 0"></div></div>
 <div class="field"><label for="noN">Recado para a equipe (opcional)</label><input class="input" id="noN" value="${esc(v.notes)}" placeholder="Ex.: chave com o porteiro, horário permitido"></div>
 ${pre && pre.quote ? `<label class="task"><input type="checkbox" id="noParc" checked><span>Lançar as parcelas no Financeiro como "a receber"<br><span class="s" id="noParcTxt"></span></span></label>` : ""}
 <p class="s form-err" id="noErr" hidden></p>
 <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="noSave">${o ? "Salvar obra" : "Cadastrar obra"}</button></div>`, true);
    const ler = () => { ets = $$("#etEd .et-ed-row").map((r, i) => ({ ...ets[i], t: r.querySelector(".etT").value, dias: Math.max(1, Math.round(+r.querySelector(".etD").value || 1)) })) };
    const prazoTxt = () => { const tot = ets.reduce((s, e) => s + e.dias, 0), ini = $("#noS").value || HOJE; $("#etPrazo").innerHTML = `⏱ <b>${diasTxt(tot)} úteis</b> no total. Começando em ${fd(proxUtil(ini))}, o prazo fica <b>${fd(fimUteis(ini, tot))}</b> (domingo não conta).` };
    const draw = () => {
      $("#etEd").innerHTML = ets.map((e, i) => `<div class="et-ed-row"><span class="tick ${e.ok ? "on" : ""}">${e.ok ? "✓" : i + 1}</span><input class="input etT" value="${esc(e.t)}" placeholder="Ex.: Passar tubulação da casa de máquinas"><label class="et-d"><input class="input num etD" type="number" min="1" value="${e.dias}"><span class="s">dias</span></label><button type="button" class="btn sm ghost etX" aria-label="Tirar etapa" ${ets.length < 2 ? "disabled" : ""}>×</button></div>`).join("");
      $$("#etEd .etT, #etEd .etD").forEach(x => x.oninput = () => { ler(); prazoTxt() });
      $$("#etEd .etX").forEach((b, i) => b.onclick = () => { ler(); ets.splice(i, 1); draw() });
      prazoTxt();
    };
    $("#etAdd").onclick = () => { ler(); ets.push({ t: "", dias: 3 }); draw(); $$("#etEd .etT").pop().focus() };
    $("#noS").onchange = prazoTxt;
    draw();
    const parcelas = () => { const ps = (EMPRESA.pagamento.match(/\d+(?=\s*%)/g) || []).map(Number); return ps.length && ps.reduce((a, b) => a + b, 0) === 100 ? ps : [40, 30, 30] };
    if ($("#noParcTxt")) { const q = quotes.find(x => x.id === pre.quote), t = qTotal(q); $("#noParcTxt").textContent = parcelas().map((p, i, a) => `${p}% ${i === 0 ? "no início" : i === a.length - 1 ? "na entrega" : "no meio"} (${brl0(t * p / 100)})`).join(" · ") }
    $("#noSave").onclick = () => {
      ler();
      const err = m => { $("#noErr").textContent = m; $("#noErr").hidden = false };
      const r = $("#noR").value, start = $("#noS").value, title = $("#noT").value.trim(), clean = ets.filter(e => e.t.trim()).map(e => ({ ...e, t: e.t.trim() }));
      if (!title) return err("Escreva o serviço da obra.");
      if (!start) return err("Informe o dia de início.");
      if (!clean.length) return err("Coloque pelo menos uma etapa com o nome.");
      const d = { client: +$("#noC").value, title, addr: $("#noA").value.trim(), start, resp: r, team: field.filter(e => e.id !== r && $("#noTm_" + e.id)?.checked).map(e => e.id), notes: $("#noN").value.trim(), etapas: clean };
      const lancar = $("#noParc") && $("#noParc").checked;
      closeModal();
      act(async () => {
        // calcula prazo e andamento numa cópia, para gravar já certinho
        const tmp = { ...(o || {}), ...d, log: o ? o.log : [] }; syncObra(tmp);
        const parcelasObra = obraId => {
          if (!(pre && pre.quote && lancar)) return [];
          const q = quotes.find(x => x.id === pre.quote), t = qTotal(q), c = clientById(d.client), ps = parcelas(), meio = addDays(tmp.start, Math.round(diasEntre(tmp.start, tmp.end) / 2));
          return ps.map((p, i) => ({ type: "in", d: i === 0 ? tmp.start : i === ps.length - 1 ? tmp.end : meio, desc: `${i === 0 ? "Entrada" : i === ps.length - 1 ? "Saldo final" : "Parcela"} ${p}% · ${c.name}`, cat: "Obra", who: c.contact || c.name, obra: obraId, pay: "PIX", v: Math.round(t * p) / 100, paid: false })).filter(l => l.v > 0);
        };
        if (DEMO) {
          let ob = o;
          if (o) Object.assign(o, d); else { ob = { id: nextId(obras), ...d, log: [], missing: [], quote: pre && pre.quote }; obras.push(ob) }
          syncObra(ob);
          if (pre && pre.quote) { quotes.find(x => x.id === pre.quote).obra = ob.id; parcelasObra(ob.id).forEach(l => lanc.push({ id: nextId(lanc), ...l })) }
          return;
        }
        const row = { cliente_id: d.client, titulo: d.title, endereco: d.addr, inicio: d.start, fim: tmp.end, responsavel: d.resp, equipe: d.team, recado: d.notes, pct: tmp.pct, etapas: d.etapas.map(e => ({ t: e.t, dias: e.dias, ok: !!e.ok, okEm: e.okEm || null })) };
        if (pre && pre.quote) row.orcamento_id = pre.quote;
        let id = o && o.id;
        if (o) await live(sb.from("ga_obras").update(row).eq("id", o.id)); else id = (await live(sb.from("ga_obras").insert(row).select("id").single())).id;
        const ls = parcelasObra(id);
        if (ls.length) await live(sb.from("ga_lancamentos").insert(ls.map(l => ({ tipo: "in", data: l.d, descricao: l.desc, categoria: l.cat, quem: l.who, obra_id: l.obra, forma: l.pay, valor: l.v, pago: false }))));
      }, o ? "Obra atualizada" : pre && pre.quote ? "Orçamento virou obra! A equipe já pode ver." : `Obra cadastrada para ${emp(r).name}`);
    };
  };

  const _obraDetail = obraDetail;
  obraDetail = o => {
    _obraDetail(o);
    if (!o.etapas) return;
    // troca a lista simples de etapas pela lista com dias e situação
    const blocos = $$("#modalRoot .sheet > div"), et = blocos.find(b => b.querySelector(".eyebrow") && b.querySelector(".eyebrow").textContent === "Etapas");
    if (et) et.innerHTML = `<div class="eyebrow" style="margin-bottom:6px">Etapas</div>${resumoEtapas(o)}${etapasHtml(o)}`;
    $$("#modalRoot .log").forEach((el, i) => { const l = o.log[i]; if (l && l.nivel) el.firstElementChild.insertAdjacentHTML("beforeend", ` · <span class="chip ${NIV[l.nivel].c}">${NIV[l.nivel].i} ${NIV[l.nivel].t}</span>`) });
  };

  // funcionário: card da obra mostra as etapas com os dias
  const _obraCardTec = obraCardTec;
  obraCardTec = o => {
    const html = _obraCardTec(o);
    if (!o.etapas) return html;
    const box = document.createElement("div"); box.innerHTML = html;
    const col = box.querySelector(".obra-cols > div");
    if (col) col.innerHTML = `<div class="eyebrow" style="margin-bottom:6px">Etapas da obra</div>${resumoEtapas(o)}${etapasHtml(o)}<p class="s" style="margin:8px 0 0">Terminou uma etapa? Marque no feedback do dia: a linha pula para a próxima.</p>`;
    return box.innerHTML;
  };

  // funcionário: feedback em 3 níveis + "terminamos a etapa"
  const _feedbackForm = feedbackForm;
  feedbackForm = o => {
    if (!o.etapas) return _feedbackForm(o);
    const c = clientById(o.client), k = calc(o), atual = k.cur >= 0 ? o.etapas[k.cur] : null, mine = o.log.find(l => l.d === HOJE && l.who === me.id);
    let nivel = mine ? mine.nivel : "";
    modal(`<div class="sheet-head"><div><div class="eyebrow">Feedback do dia · ${fd(HOJE)}</div><h2>${esc(c.name)}</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
 ${atual ? `<div class="note" style="margin:0">Etapa de agora: <b>${esc(atual.t)}</b> · dia ${Math.min(atual.dias, Math.floor(k.bruto[k.cur]) + 1)} de ${atual.dias}</div>` : ""}
 <div class="field"><label>Como foi o dia na obra?</label><div class="niv" id="fbNiv">${Object.entries(NIV).map(([key, n]) => `<button type="button" data-n="${key}" class="${nivel === key ? "on" : ""}"><span>${n.i}</span>${n.t}<small>${key === "bom" ? "a linha anda 1 dia" : key === "pouco" ? "a linha anda meio dia" : "a linha não anda"}</small></button>`).join("")}</div></div>
 ${atual ? `<label class="task et-fim"><input type="checkbox" id="fbFim"><span><b>Terminamos a etapa "${esc(atual.t)}"</b><br><span class="s">A linha pula para a próxima etapa, mesmo que tenha terminado antes do previsto.</span></span></label>` : ""}
 <div class="field"><label for="fbTxt">O que foi feito hoje</label><textarea class="input" id="fbTxt" placeholder="Ex.: Instalamos os misturadores do banho master">${esc(mine ? mine.text : "")}</textarea></div>
 <div class="field"><label for="fbProb" id="fbProbL">Teve algum problema ou impedimento? (opcional)</label><textarea class="input" id="fbProb" placeholder="Ex.: cliente pediu mudança, faltou água, peça com defeito">${esc(mine ? mine.problem : "")}</textarea></div>
 <div class="field"><label class="btn file-btn" for="fbFotos" style="justify-self:start">📷 <span id="fbFotosN">Adicionar fotos</span><input type="file" id="fbFotos" accept="image/*" multiple hidden></label></div>
 <p class="s form-err" id="fbErr" hidden></p>
 <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="fbSend">Enviar feedback</button></div>`);
    const prob = () => { $("#fbProbL").textContent = nivel === "bom" || !nivel ? "Teve algum problema ou impedimento? (opcional)" : "O que atrapalhou? (obrigatório)" };
    $$("#fbNiv button").forEach(b => b.onclick = () => { nivel = b.dataset.n; $$("#fbNiv button").forEach(x => x.classList.toggle("on", x === b)); prob() }); prob();
    $("#fbFotos").onchange = () => { const n = $("#fbFotos").files.length; $("#fbFotosN").textContent = n ? `${n} foto${n > 1 ? "s" : ""} escolhida${n > 1 ? "s" : ""}` : "Adicionar fotos" };
    $("#fbSend").onclick = async () => {
      const text = $("#fbTxt").value.trim(), problem = $("#fbProb").value.trim(), fim = $("#fbFim") && $("#fbFim").checked;
      const err = m => { $("#fbErr").textContent = m; $("#fbErr").hidden = false };
      if (!nivel) return err("Toque em como foi o dia: avançou bem, pouco ou não avançou.");
      if (!text) return err("Conte em poucas palavras o que foi feito hoje.");
      if (nivel !== "bom" && !problem) return err("Conte o que atrapalhou, para o escritório poder ajudar.");
      const files = [...$("#fbFotos").files];
      $("#fbSend").disabled = true; $("#fbSend").textContent = files.length ? "Enviando fotos…" : "Enviando…";
      const ok = await act(async () => {
        const fotos = await uploadFiles(files, `obras/${o.id}`);
        // monta o resultado numa cópia: etapas, feedback de hoje e o novo andamento
        const ets = o.etapas.map(e => ({ ...e })); if (fim && k.cur >= 0) { ets[k.cur].ok = true; ets[k.cur].okEm = HOJE }
        const prev = o.log.find(l => l.d === HOJE && l.who === me.id), entry = { d: HOJE, who: me.id, pct: 0, text, problem, nivel, fotos: [...(prev ? prev.fotos : []), ...fotos] };
        const tmp = { ...o, etapas: ets, log: prev ? o.log.map(l => l === prev ? { ...l, ...entry } : l) : [entry, ...o.log] };
        syncObra(tmp); entry.pct = tmp.pct;
        if (DEMO) { if (prev) Object.assign(prev, entry); else o.log.unshift(entry); o.etapas = ets; syncObra(o); return }
        await live(sb.rpc("ga_enviar_feedback_etapa", { p_obra: o.id, p_pct: tmp.pct, p_etapas: ets.map(e => ({ t: e.t, dias: e.dias, ok: !!e.ok, okEm: e.okEm || null })), p_nivel: nivel, p_texto: text, p_problema: problem, p_fotos: fotos }));
      }, fim ? "Etapa concluída! A linha pulou para a próxima." : "Feedback enviado. O escritório já pode ver.");
      if (ok) closeModal(); else { $("#fbSend").disabled = false; $("#fbSend").textContent = "Enviar feedback" }
    };
  };

  // dados da demonstração: transforma as etapas das obras em etapas com dias
  const RITMO = { 12: { fim: .82, pouco: .05 }, 13: { fim: .97, pouco: .06 }, 14: { fim: 1.12, pouco: .3 }, 15: { fim: .9, pouco: .05 }, 16: { fim: 1, pouco: .08 } };
  function seedEtapas() {
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    obras.forEach((o, idx) => {
      const n = o.tasks.length; if (!n) return;
      const total = Math.max(n, uteisEntre(o.start, addDays(o.end, 1))), pesos = o.tasks.map((t, i) => 1 + ((i * 37 + idx * 11) % 7) / 10), soma = pesos.reduce((a, b) => a + b, 0);
      const dias = pesos.map(p => Math.max(1, Math.round(p / soma * total))); dias[n - 1] += total - dias.reduce((a, b) => a + b, 0); if (dias[n - 1] < 1) dias[n - 1] = 1;
      o.etapas = o.tasks.map((t, i) => ({ t: t[0], dias: dias[i], ok: false }));
      const conc = o.pct >= 100, r = RITMO[idx] || { fim: 1, pouco: .05 };
      // nível de cada dia: com problema não avançou; alguns dias avançou pouco
      [...o.log].reverse().forEach(l => { l.nivel = l.problem ? (rnd() < .6 ? "parado" : "pouco") : rnd() < r.pouco ? "pouco" : "bom" });
      // a equipe marca a etapa como concluída quando termina (às vezes antes do previsto)
      const porDia = {}; o.log.forEach(l => { porDia[l.d] = Math.max(porDia[l.d] ?? 0, NIV[l.nivel].v) });
      let cur = 0, acc = 0;
      Object.keys(porDia).sort().forEach(d => {
        if (cur >= n) return;
        acc += porDia[d];
        const meta = conc ? o.etapas[cur].dias * (.9 + rnd() * .2) : o.etapas[cur].dias * r.fim;
        if (acc >= meta && (conc || cur < n - 1)) { o.etapas[cur].ok = true; o.etapas[cur].okEm = d; cur++; acc = 0 }
      });
      if (conc) o.etapas.forEach((e, i) => { if (!e.ok) { e.ok = true; e.okEm = o.log[0] ? o.log[0].d : o.end } });
      const fimAntigo = o.end; syncObra(o); if (conc) o.end = fimAntigo;
      o.log.forEach(l => { if (!conc) l.pct = Math.min(l.pct, o.pct) });
    });
  }

  /* =====================================================================
     2. ESTOQUE
     ===================================================================== */
  let estoque = [], movs = [], estQ = "", estCat = "";
  const EST_CATS = ["Tubos", "Conexões", "Registros e válvulas", "Metais e louças", "Aquecimento", "Bombas", "Consumo"];
  const acabando = () => estoque.filter(i => i.qtd <= i.min);
  function seedEstoque() {
    const L = [
      ["Tubo PEX Ø16 mm (rolo 100 m)", "Tubos", "rolo", 6, 3, 389], ["Tubo PEX Ø20 mm (rolo 100 m)", "Tubos", "rolo", 4, 3, 512], ["Tubo PEX Ø25 mm (rolo 50 m)", "Tubos", "rolo", 1, 2, 468],
      ["Tubo PVC esgoto Ø100 mm (barra 6 m)", "Tubos", "barra", 22, 10, 74], ["Tubo PVC soldável Ø25 mm (barra 6 m)", "Tubos", "barra", 35, 15, 21], ["Tubo CPVC Ø22 mm (barra 3 m)", "Tubos", "barra", 9, 12, 58],
      ["Cotovelo PEX Ø16 mm", "Conexões", "un.", 140, 60, 6.9], ["Cotovelo PEX Ø25 mm", "Conexões", "un.", 18, 40, 11.5], ["Tê PEX Ø20 mm", "Conexões", "un.", 75, 30, 9.8], ["Luva de correr PVC Ø100", "Conexões", "un.", 12, 8, 19.9], ["Anel de crimpagem Ø20 mm", "Conexões", "un.", 320, 150, 1.4],
      ["Registro de gaveta 3/4\"", "Registros e válvulas", "un.", 3, 6, 64], ["Registro de pressão 3/4\"", "Registros e válvulas", "un.", 14, 6, 71], ["Válvula redutora de pressão 1\"", "Registros e válvulas", "un.", 2, 2, 389], ["Válvula de retenção 1\"", "Registros e válvulas", "un.", 7, 3, 92],
      ["Misturador termostático", "Metais e louças", "un.", 2, 2, 1290], ["Sifão cromado", "Metais e louças", "un.", 16, 6, 89], ["Engate flexível 40 cm", "Metais e louças", "un.", 48, 20, 18.5],
      ["Aquecedor a gás 33 L/min", "Aquecimento", "un.", 1, 1, 6890], ["Kit chaminé Ø80 mm", "Aquecimento", "kit", 3, 2, 420], ["Isolante térmico Ø22 (barra 2 m)", "Aquecimento", "barra", 0, 10, 12.9],
      ["Pressurizador 400 W", "Bombas", "un.", 2, 1, 1750], ["Bomba circuladora", "Bombas", "un.", 1, 1, 980],
      ["Fita veda-rosca 18 mm x 50 m", "Consumo", "rolo", 34, 20, 7.5], ["Adesivo PVC 175 g", "Consumo", "un.", 6, 10, 16.9], ["Abraçadeira tipo D Ø50", "Consumo", "un.", 110, 50, 2.2]
    ];
    estoque = L.map((x, i) => ({ id: i + 1, nome: x[0], cat: x[1], un: x[2], qtd: x[3], min: x[4], custo: x[5], local: i % 3 === 0 ? "Depósito · prateleira A" : i % 3 === 1 ? "Depósito · prateleira B" : "Van Fiorino" }));
    const ativas = obras.filter(o => TODAY >= D(o.start) && o.pct < 100), quem = ["e1", "e3", "e8", "e7"];
    let id = 1, s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let n = -45; n <= 0; n++) {
      const d = addDays(HOJE, n); if (isDom(d)) continue;
      if (rnd() < .45 && ativas.length) { const it = estoque[Math.floor(rnd() * estoque.length)], o = ativas[Math.floor(rnd() * ativas.length)], q = Math.max(1, Math.round(it.min * (.2 + rnd() * .4))); movs.push({ id: id++, item: it.id, tipo: "saida", qtd: q, obra: o.id, d, quem: o.resp, obs: "" }) }
      if (rnd() < .12) { const it = estoque[Math.floor(rnd() * estoque.length)], q = Math.max(1, Math.round(it.min * (1 + rnd()))); movs.push({ id: id++, item: it.id, tipo: "entrada", qtd: q, obra: null, d, quem: "e0", obs: "Compra · " + ["Tigre Distribuidora", "Hidro Comercial", "Leroy Merlin", "Rinnai Revenda SP"][Math.floor(rnd() * 4)] }) }
    }
    movs.reverse();
  }
  const valorEst = () => estoque.reduce((s, i) => s + i.qtd * i.custo, 0);
  const qtdTxt = (n, un) => `${(+n).toLocaleString("pt-BR")} ${un}`;

  VIEWS.est = () => {
    if (!novoOk()) { $("#main").innerHTML = head("Estoque", "Materiais no depósito e na van") + avisoSql(); return }
    const ac = acabando(), t = estQ.trim().toLowerCase();
    const list = estoque.filter(i => (!estCat || (estCat === "acabando" ? i.qtd <= i.min : i.cat === estCat)) && (!t || i.nome.toLowerCase().includes(t))).sort((a, b) => (a.qtd / Math.max(1, a.min)) - (b.qtd / Math.max(1, b.min)));
    const saidas30 = movs.filter(m => m.tipo === "saida" && m.d >= addDays(HOJE, -30)).reduce((s, m) => s + m.qtd * (estoque.find(i => i.id === m.item) || { custo: 0 }).custo, 0);
    $("#main").innerHTML = head("Estoque", "Materiais no depósito e na van. Dê baixa quando o material sai para a obra.", `<button class="btn" id="esEnt">+ Entrada (compra)</button><button class="btn primary" id="esSai">Baixa para obra</button>`) + `
 <div class="grid kpis" style="margin-bottom:14px">
  <div class="card kpi"><div class="eyebrow">Itens cadastrados</div><div class="v num">${estoque.length}</div></div>
  <div class="card kpi"><div class="eyebrow">Valor em estoque</div><div class="v num">${brl0(valorEst())}</div><div class="d">Pelo custo de compra</div></div>
  <div class="card kpi"><div class="eyebrow">Acabando</div><div class="v num ${ac.length ? "down" : ""}">${ac.length}</div><div class="d">${ac.filter(i => !i.qtd).length} zerados</div></div>
  <div class="card kpi"><div class="eyebrow">Saiu para obras</div><div class="v num">${brl0(saidas30)}</div><div class="d">Últimos 30 dias</div></div>
 </div>
 ${ac.length ? `<div class="card alerta-est" style="margin-bottom:14px"><div class="card-head"><h2>⚠️ Acabando: hora de comprar</h2><button class="btn sm" id="esLista">Lista de compras no WhatsApp</button></div><div class="list">${ac.slice(0, 5).map(i => `<div class="row click" data-i="${i.id}"><div class="grow"><div class="t">${esc(i.nome)}</div><div class="s">Tem ${qtdTxt(i.qtd, i.un)} · mínimo ${qtdTxt(i.min, i.un)} · comprar ${qtdTxt(Math.max(i.min * 2 - i.qtd, 1), i.un)}</div></div>${i.qtd ? '<span class="chip c-warn">Acabando</span>' : '<span class="chip c-bad">Zerado</span>'}</div>`).join("")}</div>${ac.length > 5 ? `<button class="btn sm ghost" id="esVerAc" style="margin-top:8px">Ver os ${ac.length} itens acabando</button>` : ""}</div>` : ""}
 <div class="toolbar"><div class="tabs" id="esCats"><button data-c="" class="${!estCat ? "active" : ""}">Todos</button><button data-c="acabando" class="${estCat === "acabando" ? "active" : ""}">Acabando</button>${EST_CATS.map(c => `<button data-c="${c}" class="${estCat === c ? "active" : ""}">${c}</button>`).join("")}</div><input class="input" id="esQ" placeholder="Buscar material" value="${esc(estQ)}"></div>
 <div class="card"><div class="list">${list.map(i => { const pr = Math.min(100, i.qtd / Math.max(1, i.min * 2) * 100); return `<div class="row click" data-i="${i.id}"><div class="grow"><div class="t">${esc(i.nome)}</div><div class="s">${esc(i.cat)} · ${esc(i.local)} · mínimo ${qtdTxt(i.min, i.un)}</div><div class="bar ${i.qtd <= i.min ? "bar-low" : ""}" style="max-width:260px"><i style="width:${pr}%"></i></div></div><div style="text-align:right"><b class="num ${i.qtd <= i.min ? "down" : ""}" style="font-size:16px">${qtdTxt(i.qtd, i.un)}</b><div class="s">${brl(i.custo)} / ${esc(i.un)}</div></div></div>` }).join("") || '<p class="s" style="margin:0">Nenhum material encontrado.</p>'}</div></div>
 <div class="card" style="margin-top:14px"><div class="card-head"><h2>Últimas movimentações</h2><button class="btn sm" id="esNovo">+ Cadastrar material</button></div><div class="list">${movs.slice(0, 12).map(movRow).join("")}</div></div>`;
    $("#esEnt").onclick = () => movForm("entrada"); $("#esSai").onclick = () => movForm("saida"); $("#esNovo").onclick = () => itemForm();
    $$("#esCats button").forEach(b => b.onclick = () => { estCat = b.dataset.c; VIEWS.est() });
    $("#esQ").oninput = e => { estQ = e.target.value; const p = e.target.selectionStart; VIEWS.est(); const i = $("#esQ"); i.focus(); i.setSelectionRange(p, p) };
    $$("#main [data-i]").forEach(r => r.onclick = () => itemDetail(estoque.find(i => i.id === +r.dataset.i)));
    const va = $("#esVerAc"); if (va) va.onclick = () => { estCat = "acabando"; VIEWS.est(); $("#esCats").scrollIntoView({ block: "start" }) };
    const wl = $("#esLista"); if (wl) wl.onclick = () => window.open(waLink("", "*Lista de compras · Grupo Azul*\n" + acabando().map(i => `• ${i.nome}: ${qtdTxt(Math.max(i.min * 2 - i.qtd, 1), i.un)}`).join("\n")), "_blank");
  };
  function movRow(m) {
    const it = estoque.find(i => i.id === m.item) || { nome: "—", un: "" }, o = obras.find(x => x.id === m.obra);
    return `<div class="row"><span class="mov ${m.tipo}">${m.tipo === "entrada" ? "↓" : "↑"}</span><div class="grow"><div class="t">${esc(it.nome)}</div><div class="s">${fd(m.d)} · ${m.tipo === "entrada" ? esc(m.obs || "Entrada") : `para ${esc(o ? clientById(o.client).name : "obra")}`} · ${esc(emp(m.quem).name)}</div></div><b class="num ${m.tipo === "entrada" ? "up" : ""}">${m.tipo === "entrada" ? "+" : "−"}${qtdTxt(m.qtd, it.un)}</b></div>`;
  }
  function itemDetail(i) {
    const ms = movs.filter(m => m.item === i.id), porObra = {};
    ms.filter(m => m.tipo === "saida").forEach(m => porObra[m.obra] = (porObra[m.obra] || 0) + m.qtd);
    modal(`<div class="sheet-head"><div><div class="eyebrow">${esc(i.cat)}</div><h2>${esc(i.nome)}</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
 <div class="grid kpis"><div class="card kpi"><div class="eyebrow">Em estoque</div><div class="v num ${i.qtd <= i.min ? "down" : ""}">${qtdTxt(i.qtd, i.un)}</div><div class="d">Mínimo ${qtdTxt(i.min, i.un)}</div></div><div class="card kpi"><div class="eyebrow">Valor</div><div class="v num">${brl0(i.qtd * i.custo)}</div><div class="d">${brl(i.custo)} por ${esc(i.un)}</div></div></div>
 <div class="s">📍 ${esc(i.local)}</div>
 ${Object.keys(porObra).length ? `<div><div class="eyebrow" style="margin-bottom:6px">Usado nas obras</div>${Object.entries(porObra).map(([oid, q]) => { const o = obras.find(x => x.id === +oid); return `<div class="row"><div class="grow">${esc(o ? clientById(o.client).name : "—")}</div><b class="num">${qtdTxt(q, i.un)}</b></div>` }).join("")}</div>` : ""}
 <div><div class="eyebrow" style="margin-bottom:6px">Movimentações</div><div class="list">${ms.slice(0, 15).map(movRow).join("") || '<p class="s" style="margin:0">Nenhuma ainda.</p>'}</div></div>
 <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><button class="btn ghost" id="idEdit">Editar material</button><span style="display:flex;gap:8px"><button class="btn" id="idEnt">+ Entrada</button><button class="btn primary" id="idSai">Baixa para obra</button></span></div>`, true);
    $("#idEdit").onclick = () => itemForm(i); $("#idEnt").onclick = () => movForm("entrada", i); $("#idSai").onclick = () => movForm("saida", i);
  }
  function itemForm(i) {
    const v = i || { nome: "", cat: EST_CATS[0], un: "un.", qtd: 0, min: 5, custo: "", local: "Depósito" };
    modal(`<div class="sheet-head"><h2>${i ? "Editar material" : "Cadastrar material"}</h2><button class="x" data-close aria-label="Fechar">×</button></div>
 <div class="field"><label for="ifN">Material</label><input class="input" id="ifN" value="${esc(v.nome)}" placeholder="Ex.: Cotovelo PEX Ø20 mm"></div>
 <div class="form-grid"><div class="field"><label for="ifC">Categoria</label><select class="input" id="ifC">${EST_CATS.map(c => `<option ${c === v.cat ? "selected" : ""}>${c}</option>`).join("")}</select></div><div class="field"><label for="ifU">Unidade</label><input class="input" id="ifU" value="${esc(v.un)}" placeholder="un., rolo, barra, kit"></div>
 ${i ? "" : `<div class="field"><label for="ifQ">Quantidade agora</label><input class="input num" type="number" min="0" id="ifQ" value="${v.qtd}"></div>`}<div class="field"><label for="ifM">Avisar quando ficar abaixo de</label><input class="input num" type="number" min="0" id="ifM" value="${v.min}"></div>
 <div class="field"><label for="ifV">Custo por unidade (R$)</label><input class="input num" type="number" min="0" step="0.01" id="ifV" value="${v.custo}"></div><div class="field"><label for="ifL">Onde fica</label><input class="input" id="ifL" value="${esc(v.local)}"></div></div>
 <p class="s form-err" id="ifErr" hidden></p>
 <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="ifSave">Salvar</button></div>`);
    $("#ifSave").onclick = () => {
      const nome = $("#ifN").value.trim(); if (!nome) { $("#ifErr").textContent = "Escreva o nome do material."; $("#ifErr").hidden = false; return }
      const d = { nome, cat: $("#ifC").value, un: $("#ifU").value.trim() || "un.", min: Math.max(0, +$("#ifM").value || 0), custo: +$("#ifV").value || 0, local: $("#ifL").value.trim() };
      const qtd = Math.max(0, +$("#ifQ")?.value || 0);
      closeModal(); act(async () => {
        if (DEMO) { if (i) Object.assign(i, d); else estoque.push({ id: nextId(estoque), ...d, qtd }); return }
        const row = { nome: d.nome, categoria: d.cat, unidade: d.un, minimo: d.min, custo: d.custo, local: d.local };
        await live(i ? sb.from("ga_estoque").update(row).eq("id", i.id) : sb.from("ga_estoque").insert({ ...row, qtd }));
      }, i ? "Material atualizado" : "Material cadastrado");
    };
  }
  function movForm(tipo, item) {
    const ativas = obras.filter(o => o.pct < 100).sort((a, b) => a.start.localeCompare(b.start));
    if (!estoque.length) { toast("Cadastre o material primeiro."); itemForm(); return }
    if (tipo === "saida" && !ativas.length) { toast("Não há obra em andamento para dar baixa."); return }
    modal(`<div class="sheet-head"><div><div class="eyebrow">${tipo === "entrada" ? "Chegou material" : "Material saindo para a obra"}</div><h2>${tipo === "entrada" ? "Entrada no estoque" : "Baixa para obra"}</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
 <div class="field"><label for="mfI">Material</label><select class="input" id="mfI">${[...estoque].sort((a, b) => a.nome.localeCompare(b.nome)).map(i => `<option value="${i.id}" ${item && item.id === i.id ? "selected" : ""}>${esc(i.nome)} · tem ${qtdTxt(i.qtd, i.un)}</option>`).join("")}</select></div>
 <div class="form-grid"><div class="field"><label for="mfQ">Quantidade</label><input class="input num" type="number" min="1" id="mfQ" value="1"></div>
 ${tipo === "saida" ? `<div class="field"><label for="mfO">Para qual obra</label><select class="input" id="mfO">${ativas.map(o => `<option value="${o.id}">${esc(clientById(o.client).name)}</option>`).join("")}</select></div>` : `<div class="field"><label for="mfF">Fornecedor (opcional)</label><input class="input" id="mfF" placeholder="Ex.: Hidro Comercial"></div>`}</div>
 <p class="s" id="mfInfo" style="margin:0"></p>
 <p class="s form-err" id="mfErr" hidden></p>
 <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="mfSave">${tipo === "entrada" ? "Dar entrada" : "Dar baixa"}</button></div>`);
    const info = () => { const i = estoque.find(x => x.id === +$("#mfI").value), q = +$("#mfQ").value || 0, depois = tipo === "entrada" ? i.qtd + q : i.qtd - q; $("#mfInfo").innerHTML = `Fica com <b>${qtdTxt(depois, i.un)}</b>${tipo === "saida" && depois <= i.min ? ` · <span class="down">vai entrar no alerta de acabando</span>` : ""}` };
    $("#mfI").onchange = info; $("#mfQ").oninput = info; info();
    $("#mfSave").onclick = () => {
      const i = estoque.find(x => x.id === +$("#mfI").value), q = Math.round(+$("#mfQ").value || 0);
      const err = m => { $("#mfErr").textContent = m; $("#mfErr").hidden = false };
      if (q < 1) return err("Coloque a quantidade.");
      if (tipo === "saida" && q > i.qtd) return err(`Só tem ${qtdTxt(i.qtd, i.un)} no estoque.`);
      const obra = tipo === "saida" ? +$("#mfO").value : null, obs = tipo === "entrada" ? ($("#mfF").value.trim() ? "Compra · " + $("#mfF").value.trim() : "Entrada") : "";
      closeModal();
      act(async () => {
        if (DEMO) { i.qtd += tipo === "entrada" ? q : -q; movs.unshift({ id: nextId(movs), item: i.id, tipo, qtd: q, obra, d: HOJE, quem: me.id, obs }); return }
        await live(sb.rpc("ga_mover_estoque", { p_item: i.id, p_tipo: tipo, p_qtd: q, p_obra: obra, p_obs: obs }));
      },
        tipo === "entrada" ? "Entrada registrada" : i.qtd - q <= i.min ? `Baixa feita. Atenção: ${i.nome} está acabando.` : "Baixa feita");
    };
  }

  /* =====================================================================
     3. AGENDA
     ===================================================================== */
  let eventos = [], agMes = HOJE.slice(0, 7), agDia = HOJE, agQuem = "";
  const TIPOS = { visita: ["Visita técnica", "🔎", "c-info"], orc: ["Medição / orçamento", "📐", "c-warn"], manut: ["Manutenção", "🔧", "c-good"], entrega: ["Entrega da obra", "🔑", "c-good"], reuniao: ["Reunião", "👥", "c-mute"], confra: ["Confraternização", "🎉", "c-info"], obra: ["Dia de obra", "🏗️", "c-mute"] };
  function seedAgenda() {
    const ev = (d, h, tipo, titulo, cli, quem, extra = {}) => eventos.push({ id: eventos.length + 1, d: proxUtil(addDays(HOJE, d)), h, tipo, titulo, cli, quem, local: cli ? (obras.find(o => o.client === cli) || {}).addr || clientById(cli).city : "", obs: "", feito: d < 0, equipeVe: ["visita", "manut", "entrega"].includes(tipo) && quem.some(id => emp(id).access === "tec"), ...extra });
    ev(0, "08:00", "manut", "Troca do reparo da válvula de descarga", 6, ["e7"]);
    ev(0, "14:30", "orc", "Medição para pressurização do apartamento", 20, ["e0"]);
    ev(0, "17:00", "reuniao", "Alinhamento semanal das obras", null, ["e0", "e11", "e1", "e3"], { local: "Escritório" });
    ev(1, "09:00", "visita", "Vazamento no teto do banheiro social", 9, ["e8"]);
    ev(1, "15:00", "orc", "Orçamento de aquecimento solar", 7, ["e0"]);
    ev(2, "10:00", "manut", "Limpeza dos reservatórios", 17, ["e3", "e4"]);
    ev(3, "08:30", "visita", "Pressão fraca nos chuveiros", 11, ["e7", "e1"]);
    ev(4, "11:00", "entrega", "Vistoria final com a síndica", 2, ["e3", "e0"]);
    ev(6, "09:00", "orc", "Medição para reúso de água", 3, ["e0", "e1"]);
    ev(8, "14:00", "manut", "Revisão anual dos aquecedores", 8, ["e7"]);
    ev(9, "09:00", "visita", "Início: conferência do apartamento", 20, ["e8", "e4"]);
    ev(12, "10:00", "reuniao", "Reunião com o arquiteto do Loft", 18, ["e0", "e11"]);
    ev(15, "08:00", "manut", "Manutenção preventiva das bombas", 17, ["e7"]);
    ev(19, "13:30", "orc", "Orçamento troca de prumadas (bloco B)", 2, ["e0"]);
    ev(4, "18:00", "confra", "Churrasco de fim de mês da equipe", null, staff.filter(e => e.active && (e.access === "tec" || e.dono)).map(e => e.id), { local: "Depósito do Grupo Azul", obs: "Carne e bebida por conta da empresa. Pode levar a família!", equipeVe: true });
    ev(-1, "09:00", "visita", "Infiltração na garagem", 12, ["e8"]);
    ev(-2, "15:00", "orc", "Medição do vestiário novo", 10, ["e0"]);
    ev(-4, "08:00", "manut", "Troca do pressurizador", 13, ["e3"]);
    ev(-6, "10:30", "entrega", "Entrega do sistema de pressurização", 17, ["e7", "e0"]);
    ev(-9, "14:00", "visita", "Ruído na tubulação de água quente", 14, ["e1"]);
  }
  // obras que têm equipe trabalhando em um dia (segunda a sábado)
  const obrasNoDia = d => isDom(d) ? [] : obras.filter(o => d >= o.start && d <= (o.pct >= 100 ? entregaObra(o) : o.end) && (o.pct < 100 || d <= entregaObra(o)));
  function itensDoDia(d) {
    const qf = e => !agQuem || e.quem.includes(agQuem);
    const tec = me.role === "tec";
    const evs = eventos.filter(e => e.d === d && qf(e) && (!tec || (e.equipeVe && e.quem.includes(me.id)))).sort((a, b) => a.h.localeCompare(b.h));
    // funcionário: só o dia de início e o de entrega das obras dele
    const obs = tec ? obras.filter(o => (o.resp === me.id || o.team.includes(me.id)) && (d === o.start || (d === o.end && o.pct < 100))) : obrasNoDia(d).filter(o => !agQuem || o.resp === agQuem || o.team.includes(agQuem));
    return { evs, obs };
  }
  VIEWS.agd = () => {
    if (!novoOk()) { $("#main").innerHTML = head("Agenda", "Visitas, medições, manutenções e confraternizações") + avisoSql(); return }
    const [y, m] = agMes.split("-").map(Number), first = new Date(y, m - 1, 1), ini = addDays(isoOf(first), -((first.getDay() + 6) % 7));
    const dias = Array.from({ length: 42 }, (_, i) => addDays(ini, i)), semanas = dias[35].slice(0, 7) === agMes ? 6 : 5;
    const pessoas = staff.filter(e => e.active && !e.oculto && e.id !== "e5");
    const cel = d => {
      const { evs, obs } = itensDoDia(d), fora = d.slice(0, 7) !== agMes;
      return `<button class="cal-d ${fora ? "fora" : ""} ${d === HOJE ? "hoje" : ""} ${d === agDia ? "sel" : ""} ${isDom(d) ? "dom" : ""}" data-d="${d}"><span class="n">${+d.slice(8)}</span>
   <span class="cal-evs">${evs.slice(0, 3).map(e => `<i class="ev ${e.tipo}">${TIPOS[e.tipo][1]} <b>${e.h}</b> ${esc(e.titulo)}</i>`).join("")}${evs.length > 3 ? `<i class="mais">+${evs.length - 3}</i>` : ""}${me.role === "tec" ? obs.map(o => `<i class="ev ${d === o.start ? "orc" : "entrega"}">${d === o.start ? "🏁 Início" : "🔑 Entrega"} ${esc(clientById(o.client).name)}</i>`).join("") : ""}</span>
   <span class="cal-dots">${evs.map(e => `<i class="dot ${e.tipo}"></i>`).join("")}${me.role === "tec" ? obs.map(o => `<i class="dot ${d === o.start ? "orc" : "entrega"}"></i>`).join("") : obs.length ? `<i class="dot obra"></i>` : ""}</span>${obs.length && me.role !== "tec" ? `<span class="cal-ob">🏗️ ${obs.length}</span>` : ""}</button>`;
    };
    const prox = eventos.filter(e => e.d >= HOJE && e.d <= addDays(HOJE, 7) && (!agQuem || e.quem.includes(agQuem)) && (me.role !== "tec" || (e.equipeVe && e.quem.includes(me.id)))).sort((a, b) => (a.d + a.h).localeCompare(b.d + b.h));
    $("#main").innerHTML = head("Agenda", me.role === "tec" ? "Início e entrega das suas obras e os compromissos que o escritório marcou para você" : "Visitas, medições, manutenções e onde cada um está trabalhando", me.role === "tec" ? "" : `<button class="btn primary" id="agNew">+ Agendar</button>`) + `
 <div class="ag-top"><div class="month-nav"><button class="btn sm" id="agPrev" aria-label="Mês anterior">‹</button><b>${mesNome(agMes + "-01")}</b><button class="btn sm" id="agNext" aria-label="Próximo mês">›</button></div><button class="btn sm" id="agHoje">Hoje</button><span style="flex:1"></span>${me.role === "tec" ? "" : `<select class="input" id="agQuem" style="width:auto"><option value="">Toda a equipe</option>${pessoas.map(e => `<option value="${e.id}" ${agQuem === e.id ? "selected" : ""}>${esc(e.name)}</option>`).join("")}</select>`}</div>
 <div class="ag-grid"><div class="card cal-card"><div class="cal">${["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(d => `<span class="cal-h">${d}</span>`).join("")}${dias.slice(0, semanas * 7).map(cel).join("")}</div>
  <div class="cal-leg">${me.role === "tec" ? `<span><i class="dot orc"></i>Início de obra</span><span><i class="dot entrega"></i>Entrega da obra</span><span><i class="dot"></i>Compromisso marcado pelo escritório</span>` : ""}${me.role === "tec" ? "" : Object.entries(TIPOS).filter(([k]) => k !== "obra").map(([k, t]) => `<span><i class="dot ${k}"></i>${t[0]}</span>`).join("") + `<span><i class="dot obra"></i>Equipe em obra</span>`}</div></div>
  <div class="card" id="agDiaBox"></div></div>
 <div class="card" style="margin-top:14px"><div class="card-head"><h2>Próximos 7 dias</h2></div><div class="list">${prox.map(e => evRow(e, true)).join("") || '<p class="s" style="margin:0">Nada agendado.</p>'}</div></div>`;
    const mv = n => { agMes = addMonths(agMes + "-01", n).slice(0, 7); VIEWS.agd() };
    $("#agPrev").onclick = () => mv(-1); $("#agNext").onclick = () => mv(1); $("#agHoje").onclick = () => { agMes = HOJE.slice(0, 7); agDia = HOJE; VIEWS.agd() };
    const aq = $("#agQuem"); if (aq) aq.onchange = () => { agQuem = aq.value; VIEWS.agd() };
    const an = $("#agNew"); if (an) an.onclick = () => evForm(null, agDia >= HOJE ? agDia : HOJE);
    $$("#main .cal-d").forEach(b => b.onclick = () => { agDia = b.dataset.d; if (agDia.slice(0, 7) !== agMes) { agMes = agDia.slice(0, 7); VIEWS.agd() } else { $$("#main .cal-d").forEach(x => x.classList.toggle("sel", x === b)); diaBox() } });
    $$("#main [data-ev]").forEach(r => r.onclick = () => evDetail(eventos.find(e => e.id === +r.dataset.ev)));
    diaBox();
  };
  function evRow(e, comData) {
    const t = TIPOS[e.tipo], c = e.cli ? clientById(e.cli) : null;
    return `<div class="row click ${e.feito ? "feito" : ""}" data-ev="${e.id}"><span class="ev-ic ${e.tipo}">${t[1]}</span><div class="grow"><div class="t">${esc(e.titulo)}</div><div class="s">${comData ? `${cap(DIA[D(e.d).getDay()]).slice(0, 3)} ${fd(e.d).slice(0, 5)} · ` : ""}<b>${e.h}</b> · ${t[0]}${c ? " · " + esc(c.name) : ""} · ${e.quem.map(id => esc(firstName(emp(id).name))).join(", ")}</div></div>${e.feito ? '<span class="chip c-good">Feito</span>' : me.role !== "tec" && e.equipeVe ? '<span class="chip c-info" title="Aparece na agenda do funcionário">👁 Equipe vê</span>' : ""}</div>`;
  }
  function diaBox() {
    const { evs, obs } = itensDoDia(agDia), box = $("#agDiaBox");
    box.innerHTML = `<div class="card-head"><h2>${agDia === HOJE ? "Hoje" : cap(DIA[D(agDia).getDay()])}, ${fd(agDia).slice(0, 5)}</h2>${me.role === "tec" ? "" : `<button class="btn sm" id="agNewD">+ Agendar neste dia</button>`}</div>
   <div class="list">${evs.map(e => evRow(e)).join("") || '<p class="s" style="margin:0 0 6px">Nenhuma visita ou compromisso.</p>'}</div>
   ${obs.length ? `<div class="eyebrow" style="margin:14px 0 6px">${me.role === "tec" ? "Suas obras" : "Equipe em obra"}</div><div class="list">${obs.map(o => `<div class="row click" data-ob="${o.id}"><span class="ev-ic ${me.role === "tec" ? (agDia === o.start ? "orc" : "entrega") : "obra"}">${me.role === "tec" ? (agDia === o.start ? "🏁" : "🔑") : "🏗️"}</span><div class="grow"><div class="t">${me.role === "tec" ? (agDia === o.start ? "Início da obra · " : "Entrega da obra · ") : ""}${esc(clientById(o.client).name)}</div><div class="s">${[o.resp, ...o.team].map(id => esc(firstName(emp(id).name))).join(", ")} · ${esc(o.title)}</div></div></div>`).join("")}</div>` : ""}`;
    $$("#agDiaBox [data-ev]").forEach(r => r.onclick = () => evDetail(eventos.find(e => e.id === +r.dataset.ev)));
    $$("#agDiaBox [data-ob]").forEach(r => r.onclick = () => { const o = obras.find(x => x.id === +r.dataset.ob); me.role === "tec" ? go("obr") : obraDetail(o) });
    const nd = $("#agNewD"); if (nd) nd.onclick = () => evForm(null, agDia);
  }
  function evDetail(e) {
    const t = TIPOS[e.tipo], c = e.cli ? clientById(e.cli) : null;
    const msg = c && c.phone ? waLink(c.phone, `Olá ${firstName(c.contact || c.name)}, tudo bem? Aqui é do Grupo Azul. Confirmando nossa ${t[0].toLowerCase()} ${e.d === HOJE ? "hoje" : "no dia " + fd(e.d)} às ${e.h}. Até lá!`) : "";
    modal(`<div class="sheet-head"><div><div class="eyebrow">${t[1]} ${t[0]}</div><h2>${esc(e.titulo)}</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
 <div class="et-resumo"><span>📅 <b>${cap(DIA[D(e.d).getDay()])}, ${fd(e.d)}</b> às <b>${e.h}</b></span>${c ? `<span>👤 ${esc(c.name)}${c.contact ? " · " + esc(c.contact) : ""}</span>` : ""}<span>👷 ${e.quem.map(id => esc(emp(id).name)).join(", ")}</span>${me.role !== "tec" ? `<span>${e.equipeVe ? "👁 Aparece na agenda do funcionário" : "🔒 Só o escritório vê"}</span>` : ""}</div>
 ${e.obs ? `<div class="note" style="margin:0">${esc(e.obs)}</div>` : ""}
 ${e.local && e.local !== "Escritório" ? mapaObra({ addr: e.local }) : e.local ? `<div class="s">📍 ${esc(e.local)}</div>` : ""}
 <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">${me.role === "tec" ? "<span></span>" : `<button class="btn ghost" id="evDel">Excluir</button>`}<span style="display:flex;gap:8px;flex-wrap:wrap">${msg && me.role !== "tec" ? `<a class="btn" href="${msg}" target="_blank" rel="noopener">Confirmar com o cliente</a>` : ""}${me.role === "tec" ? "" : `<button class="btn" id="evEdit">Editar</button>`}<button class="btn primary" id="evFeito">${e.feito ? "Marcar como não feito" : "Marcar como feito"}</button></span></div>`, true);
    $("#evFeito").onclick = () => { const f = !e.feito; closeModal(); act(async () => { if (DEMO) e.feito = f; else await live(me.role === "tec" ? sb.rpc("ga_agenda_feito", { p_id: e.id, p_feito: f }) : sb.from("ga_agenda").update({ feito: f }).eq("id", e.id)) }, f ? "Marcado como feito" : "Desmarcado") };
    const ed = $("#evEdit"); if (ed) ed.onclick = () => evForm(e);
    const dl = $("#evDel"); if (dl) twoStep(dl, "Confirmar: excluir", () => { closeModal(); act(async () => { if (DEMO) eventos = eventos.filter(x => x !== e); else await live(sb.from("ga_agenda").delete().eq("id", e.id)) }, "Compromisso excluído") });
  }
  function evForm(e, dia) {
    const v = e || { tipo: "visita", titulo: "", d: dia || HOJE, h: "09:00", cli: null, quem: [], local: "", obs: "", equipeVe: false };
    const pessoas = staff.filter(x => x.active && !x.oculto && x.id !== "e5");
    modal(`<div class="sheet-head"><h2>${e ? "Editar compromisso" : "Agendar"}</h2><button class="x" data-close aria-label="Fechar">×</button></div>
 <div class="field"><label>Tipo</label><div class="tabs" id="efT" style="flex-wrap:wrap">${Object.entries(TIPOS).filter(([k]) => k !== "obra").map(([k, t]) => `<button type="button" data-t="${k}" class="${v.tipo === k ? "active" : ""}">${t[1]} ${t[0]}</button>`).join("")}</div></div>
 <div class="field"><label for="efTi">O que é</label><input class="input" id="efTi" value="${esc(v.titulo)}" placeholder="Ex.: Vazamento no banheiro da suíte"></div>
 <div class="form-grid"><div class="field"><label for="efD">Dia</label><input class="input" type="date" id="efD" value="${v.d}"></div><div class="field"><label for="efH">Hora</label><input class="input" type="time" id="efH" value="${v.h}"></div>
 <div class="field"><label for="efC">Cliente (opcional)</label><select class="input" id="efC"><option value="">—</option>${clients.map(c => `<option value="${c.id}" ${c.id === v.cli ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div><div class="field"><label for="efL">Endereço</label><input class="input" id="efL" value="${esc(v.local)}" placeholder="Rua, número · bairro"></div></div>
 <div class="field"><label>Quem vai</label><div style="display:flex;flex-wrap:wrap;gap:4px 16px">${pessoas.map(x => `<label class="task"><input type="checkbox" id="efQ_${x.id}" ${v.quem.includes(x.id) ? "checked" : ""}><span>${esc(x.name)}</span></label>`).join("")}</div><button type="button" class="btn sm" id="efTodos" style="justify-self:start">Marcar toda a equipe</button></div>
 <div class="field"><label for="efO">Observação (opcional)</label><textarea class="input" id="efO" placeholder="Ex.: levar escada e detector de vazamento">${esc(v.obs)}</textarea></div>
 <label class="task et-fim"><input type="checkbox" id="efVe" ${v.equipeVe ? "checked" : ""}><span><b>Mostrar na agenda do funcionário</b><br><span class="s">Quem vai recebe esse compromisso na agenda dele. Se não marcar, só o escritório vê.</span></span></label>
 <p class="s" id="efConf" style="margin:0"></p><p class="s form-err" id="efErr" hidden></p>
 <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="efSave">Salvar</button></div>`, true);
    let tipo = v.tipo;
    $$("#efT button").forEach(b => b.onclick = () => { tipo = b.dataset.t; $$("#efT button").forEach(x => x.classList.toggle("active", x === b)); conf(); if (tipo === "confra") { $("#efVe").checked = true; if (!$("#efTi").value) $("#efTi").placeholder = "Ex.: Churrasco de fim de ano da equipe" } });
    $("#efTodos").onclick = () => { pessoas.forEach(x => $("#efQ_" + x.id).checked = true); conf() };
    $("#efC").onchange = () => { const id = +$("#efC").value, o = obras.find(x => x.client === id); if (id && !$("#efL").value) $("#efL").value = o ? o.addr : clientById(id).city };
    // avisa se alguém já tem compromisso ou obra no mesmo dia
    const conf = () => { const d = $("#efD").value, h = $("#efH").value, q = pessoas.filter(x => $("#efQ_" + x.id).checked).map(x => x.id), msgs = [];
      q.forEach(id => { const ch = eventos.find(x => x !== e && x.d === d && x.h === h && x.quem.includes(id)); if (ch) msgs.push(`${firstName(emp(id).name)} já tem "${ch.titulo}" nesse horário`); const ob = tipo !== "confra" && h < "17:00" && obrasNoDia(d).find(o => o.pct < 100 && (o.resp === id || o.team.includes(id))); if (ob) msgs.push(`${firstName(emp(id).name)} está escalado na obra ${clientById(ob.client).name}`) });
      $("#efConf").innerHTML = msgs.length ? `⚠️ ${msgs.map(esc).join(" · ")}` : "" };
    ["#efD", "#efH"].forEach(s => $(s).onchange = conf); $$("#modalRoot [id^=efQ_]").forEach(x => x.onchange = conf); conf();
    $("#efSave").onclick = () => {
      const titulo = $("#efTi").value.trim(), quem = pessoas.filter(x => $("#efQ_" + x.id).checked).map(x => x.id);
      const err = m => { $("#efErr").textContent = m; $("#efErr").hidden = false };
      if (!titulo) return err("Escreva o que é o compromisso."); if (!quem.length) return err("Escolha quem vai.");
      const d = { tipo, titulo, d: $("#efD").value || HOJE, h: $("#efH").value || "09:00", cli: +$("#efC").value || null, quem, local: $("#efL").value.trim(), obs: $("#efO").value.trim(), equipeVe: $("#efVe").checked };
      closeModal(); agDia = d.d; agMes = d.d.slice(0, 7);
      act(async () => {
        if (DEMO) { if (e) Object.assign(e, d); else eventos.push({ id: nextId(eventos), ...d, feito: false }); return }
        const row = { data: d.d, hora: d.h, tipo: d.tipo, titulo: d.titulo, cliente_id: d.cli, quem: d.quem, local: d.local, obs: d.obs, equipe_ve: d.equipeVe };
        await live(e ? sb.from("ga_agenda").update(row).eq("id", e.id) : sb.from("ga_agenda").insert(row));
      }, e ? "Compromisso atualizado" : `Agendado para ${fd(d.d)} às ${d.h}`);
    };
  }

  /* =====================================================================
     4. ORÇAMENTO VIRA OBRA + PDF NO WHATSAPP
     ===================================================================== */
  const ETAPAS_PADRAO = [["Preparação e conferência do local", 2], ["Passagem da tubulação", 6], ["Instalação dos equipamentos e metais", 5], ["Testes de pressão e estanqueidade", 2], ["Limpeza e entrega ao cliente", 1]];
  function virarObra(q) {
    const c = clientById(q.client), ant = obras.find(o => o.client === q.client && o.addr);
    // etapas: uma por item principal do orçamento (sem mão de obra), mais testes e entrega
    const itens = q.items.filter(i => !/m[aã]o de obra|deslocamento|taxa/i.test(i[0])).slice(0, 4);
    const etapas = itens.length >= 2 ? [...itens.map(i => ({ t: "Instalar " + i[0].charAt(0).toLowerCase() + i[0].slice(1), dias: Math.max(2, Math.min(10, Math.round(i[1] * i[2] / 6000))) })), { t: "Testes de pressão e estanqueidade", dias: 2 }, { t: "Limpeza e entrega ao cliente", dias: 1 }] : ETAPAS_PADRAO.map(([t, dias]) => ({ t, dias }));
    obraForm(null, { client: q.client, title: q.title, addr: ant ? ant.addr : "", quote: q.id, etapas, resp: (staff.find(e => e.active && e.access === "tec") || {}).id });
  }

  // gera o PDF de verdade (arquivo) a partir do papel do orçamento
  const loadScript = src => new Promise((ok, no) => { if ([...document.scripts].some(s => s.src.endsWith(src))) return ok(); const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s) });
  async function pdfBlob(html) {
    await loadScript("vendor/html2canvas.min.js"); await loadScript("vendor/jspdf.umd.min.js");
    const box = document.createElement("div"); box.className = "pdf-render"; box.innerHTML = html; document.body.appendChild(box);
    try {
      await Promise.all([...box.querySelectorAll("img")].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r })));
      const cv = await html2canvas(box.firstElementChild, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      const pdf = new window.jspdf.jsPDF({ unit: "mm", format: "a4" }), W = 210, H = 297, pagePx = Math.floor(cv.width * H / W);
      for (let y = 0, p = 0; y < cv.height; y += pagePx, p++) {
        const part = document.createElement("canvas"); part.width = cv.width; part.height = Math.min(pagePx, cv.height - y);
        part.getContext("2d").drawImage(cv, 0, y, cv.width, part.height, 0, 0, cv.width, part.height);
        if (p) pdf.addPage();
        pdf.addImage(part.toDataURL("image/jpeg", .92), "JPEG", 0, 0, W, part.height * W / cv.width);
      }
      return pdf.output("blob");
    } finally { box.remove() }
  }
  async function enviarPdfWhats(html, nome, phone, texto) {
    toast("Gerando o PDF…");
    let blob; try { blob = await pdfBlob(html) } catch (e) { console.error(e); toast("Não foi possível gerar o PDF aqui. Use \"Baixar PDF\"."); return }
    const file = new File([blob], nome + ".pdf", { type: "application/pdf" });
    // no celular abre a tela de compartilhar: escolha o WhatsApp e o PDF já vai anexado
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text: texto }); return } catch (e) { if (e.name === "AbortError") return } }
    // no computador: baixa o PDF e abre a conversa para anexar
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    if (phone) window.open(waLink(phone, texto), "_blank");
    toast("PDF baixado. Na conversa do WhatsApp, toque no clipe e anexe o arquivo.");
  }
  window.gaEnviarPdfWhats = enviarPdfWhats;

  const _pdfPreview = pdfPreview;
  pdfPreview = q => {
    _pdfPreview(q);
    if (!q) return;
    const c = clientById(q.client), obra = q.obra && obras.find(o => o.id === q.obra), texto = `Olá ${firstName(c.contact || c.name)}, tudo bem? Segue o orçamento ${q.n} do Grupo Azul: ${q.title}, total de ${brl(qTotal(q))}. Validade de ${EMPRESA.validade} dias. Qualquer dúvida estou à disposição.`;
    const dl = $("#pdfDl"), row = dl.parentElement, wa = $("#pqWa");
    if (wa) wa.remove();
    const p = row.previousElementSibling; if (p && p.tagName === "P") p.textContent = "No celular, \"Enviar PDF no WhatsApp\" já abre o WhatsApp com o PDF anexado. No computador, o PDF é baixado e a conversa do cliente abre para você anexar.";
    dl.insertAdjacentHTML("beforebegin", `<button class="btn" id="pqZap">📲 Enviar PDF no WhatsApp</button>`);
    if (me.role === "admin" && novoOk()) row.insertAdjacentHTML("afterbegin", obra ? `<button class="btn" id="pqVerObra">✓ Já virou obra · ver obra</button><span style="flex:1"></span>` : `<button class="btn ${q.status === "Aprovado" ? "primary" : ""}" id="pqObra" ${q.status === "Aprovado" ? "" : "hidden"}>🏗️ Transformar em obra</button><span style="flex:1"></span>`);
    row.style.justifyContent = "flex-start";
    $("#pqZap").onclick = async () => { await enviarPdfWhats(paperHtml(q), `Orcamento ${q.n} - ${c.name}`, c.phone, texto); if (q.status === "Rascunho") act(async () => { if (DEMO) q.status = "Enviado"; else await live(sb.from("ga_orcamentos").update({ status: "Enviado" }).eq("id", q.id)) }) };
    const bo = $("#pqObra"); if (bo) bo.onclick = () => virarObra(q);
    const vo = $("#pqVerObra"); if (vo) vo.onclick = () => { go("obr"); obraDetail(obra) };
    const st = $("#pqSt"), on = st.onchange;
    st.onchange = () => { on(); if (st.value === "Aprovado" && !q.obra) { const b = $("#pqObra"); if (b) { b.hidden = false; b.classList.add("primary", "pulse"); toast("Orçamento aprovado! Toque em \"Transformar em obra\" para já criar a obra.") } } };
  };

  // relatório da obra para o cliente: também vai direto no WhatsApp
  const _relatorioObra = relatorioObra;
  relatorioObra = (o, tipo = "cliente") => {
    _relatorioObra(o, tipo);
    if (tipo !== "cliente") return;
    const c = clientById(o.client), dl = $("#roPdf"), w = dl && dl.parentElement.querySelector("a.btn");
    if (!dl) return; if (w) w.remove();
    dl.insertAdjacentHTML("beforebegin", `<button class="btn" id="roZap">📲 Enviar PDF no WhatsApp</button>`);
    $("#roZap").onclick = () => enviarPdfWhats(obraPaper(o, "cliente"), `Relatorio - ${c.name}`, c.phone, `Olá ${firstName(c.contact || c.name)}, tudo bem? Segue o relatório da obra "${o.title}". Obrigado pela confiança no Grupo Azul!`);
  };

  /* =====================================================================
     MENU, BADGES E DADOS DA DEMONSTRAÇÃO
     ===================================================================== */
  ICON.agd = '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>';
  PAGES.splice(PAGES.findIndex(p => p[0] === "lem"), 0, ["agd", "Agenda"]);
  PAGES.splice(PAGES.findIndex(p => p[0] === "rel"), 0, ["est", "Estoque"]);
  ALLOWED.admin.push("agd", "est"); ALLOWED.fin.push("agd", "est"); ALLOWED.tec.push("agd");
  const si = SOON.findIndex(s => s[0] === "est"); if (si >= 0) SOON.splice(si, 1);

  const _renderNav = renderNav;
  renderNav = () => {
    _renderNav();
    const badge = (p, n, cls = "") => { const b = $(`#nav button[data-p=${p}]`); if (b && n) b.insertAdjacentHTML("beforeend", `<span class="nbadge ${cls}">${n}</span>`) };
    badge("est", acabando().length);
    badge("agd", eventos.filter(e => e.d === HOJE && !e.feito && (me.role !== "tec" || (e.equipeVe && e.quem.includes(me.id)))).length, "info");
  };

  // funcionário: ao entrar, aviso do que o escritório colocou na agenda dele
  const sigEv = e => `${e.id}|${e.d}|${e.h}`;
  function avisoAgenda() {
    if (!me || me.role !== "tec" || !novoOk()) return;
    const key = "ga-agvisto-" + me.id; let vistos = []; try { vistos = JSON.parse(store.get(key) || "[]") } catch (e) { }
    const novos = eventos.filter(e => e.equipeVe && e.quem.includes(me.id) && e.d >= HOJE && !vistos.includes(sigEv(e))).sort((a, b) => (a.d + a.h).localeCompare(b.d + b.h));
    if (!novos.length) return;
    store.set(key, JSON.stringify([...vistos, ...novos.map(sigEv)].slice(-200)));
    const confra = novos.find(e => e.tipo === "confra");
    const bloco = `<div class="w-sec ag-aviso ${confra ? "festa" : ""}"><div class="eyebrow">📅 Novo na sua agenda</div>${novos.map(e => `<div class="row"><span class="ev-ic ${e.tipo}">${TIPOS[e.tipo][1]}</span><div class="grow"><div class="t">${esc(e.titulo)}</div><div class="s">${e.d === HOJE ? "Hoje" : e.d === addDays(HOJE, 1) ? "Amanhã" : cap(DIA[D(e.d).getDay()]) + ", " + fd(e.d).slice(0, 5)} às ${e.h}${e.local ? " · " + esc(e.local) : ""}${e.obs ? " · " + esc(e.obs) : ""}</div></div></div>`).join("")}<button class="btn sm" id="avAg" style="justify-self:start">Ver na agenda</button></div>`;
    const sheet = $("#modalRoot .sheet");
    if (sheet) sheet.querySelector(".sheet-head").insertAdjacentHTML("afterend", bloco);
    else modal(`<div class="sheet-head"><div><div class="eyebrow">${hojeLongo()}</div><h2>${confra ? "🎉 Tem festa chegando, " : "Novidade na agenda, "}${esc(firstName(me.name))}!</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>${bloco}<div style="display:flex;justify-content:flex-end"><button class="btn primary" data-close>Entendi</button></div>`);
    $("#avAg").onclick = () => { closeModal(); agDia = novos[0].d; agMes = agDia.slice(0, 7); go("agd") };
  }
  const _welcome = welcome;
  welcome = () => { _welcome(); avisoAgenda() };

  /* =====================================================================
     FERRAMENTAS SOB RESPONSABILIDADE DO FUNCIONÁRIO
     ===================================================================== */
  const ESTADOS = ["Nova", "Boa", "Precisa de reparo", "Devolvida"];
  function seedFerramentas() {
    const F = {
      e1: [["Furadeira de impacto Bosch GSB 13 RE", "GA-014", -400, "Boa", 489], ["Termofusora 20 a 63 mm", "GA-022", -380, "Boa", 690], ["Prensa para PEX com 3 mordentes", "GA-031", -200, "Nova", 2150], ["Kit de chaves (grifo, inglesa, Allen)", "GA-040", -700, "Boa", 380]],
      e3: [["Furadeira de impacto Makita", "GA-015", -900, "Precisa de reparo", 520], ["Detector de vazamento por ultrassom", "GA-051", -120, "Nova", 3890], ["Cortador de tubo PEX", "GA-033", -500, "Boa", 120]],
      e7: [["Analisador de gás de combustão", "GA-060", -300, "Boa", 4200], ["Manômetro digital", "GA-061", -300, "Boa", 650], ["Kit de chaves para aquecedor", "GA-062", -300, "Boa", 290]],
      e8: [["Martelete rompedor SDS", "GA-018", -600, "Boa", 1290], ["Termofusora 20 a 63 mm", "GA-023", -600, "Boa", 690], ["Escada de alumínio 7 degraus", "GA-070", -250, "Boa", 420]],
      e2: [["Cortador de tubo PEX", "GA-034", -300, "Boa", 120], ["Arco de serra e lima", "GA-041", -300, "Boa", 85]],
      e4: [["Kit de chaves básico", "GA-042", -500, "Boa", 160]]
    };
    Object.entries(F).forEach(([id, l]) => { const e = staff.find(x => x.id === id); if (e) e.ferramentas = l.map(f => ({ nome: f[0], cod: f[1], d: addDays(HOJE, f[2]), estado: f[3], valor: f[4] })) });
  }
  const _staffForm = staffForm;
  staffForm = e => {
    _staffForm(e);
    if (!novoOk()) return;
    const antes = (e && e.ferramentas || []).filter(f => f.id).map(f => f.id);
    let tl = (e && e.ferramentas || []).map(f => ({ ...f }));
    $("#sfErr").insertAdjacentHTML("beforebegin", `<div class="card" style="background:var(--surface-2);display:grid;gap:10px" id="sfTools"></div>`);
    const draw = () => {
      const ativas = tl.filter(f => f.estado !== "Devolvida"), tot = ativas.reduce((s, f) => s + (+f.valor || 0), 0);
      $("#sfTools").innerHTML = `<div class="card-head" style="margin:0"><div class="eyebrow">🧰 Ferramentas sob responsabilidade</div>${ativas.length ? `<span class="s">${ativas.length} · ${brl0(tot)}</span>` : ""}</div>
  <p class="s" style="margin:0">O que a empresa entregou para essa pessoa cuidar. Na saída da empresa, confira a devolução.</p>
  <div class="list">${tl.map((f, i) => `<div class="row tool ${f.estado === "Devolvida" ? "feito" : ""}"><div class="grow"><div class="t">${esc(f.nome)}</div><div class="s">${f.cod ? "Nº " + esc(f.cod) + " · " : ""}entregue em ${fd(f.d)}${f.valor ? " · " + brl0(f.valor) : ""}</div></div><select class="input tEst" data-i="${i}" style="width:auto">${ESTADOS.map(x => `<option ${x === f.estado ? "selected" : ""}>${x}</option>`).join("")}</select><button type="button" class="btn sm ghost tDel" data-i="${i}" aria-label="Tirar">×</button></div>`).join("") || '<p class="s" style="margin:0">Nenhuma ferramenta cadastrada.</p>'}</div>
  <div class="tool-add"><input class="input" id="tN" placeholder="Ferramenta (ex.: Furadeira de impacto)"><input class="input" id="tC" placeholder="Nº / patrimônio"><input class="input num" id="tV" type="number" min="0" step="0.01" placeholder="Valor R$"><input class="input" id="tD" type="date" value="${HOJE}"><button type="button" class="btn sm" id="tAdd">+ Adicionar</button></div>
  ${e && tl.length ? `<button type="button" class="btn sm" id="tTermo" style="justify-self:start">📄 Termo de responsabilidade (PDF)</button>` : ""}`;
      $$("#sfTools .tEst").forEach(x => x.onchange = () => { tl[+x.dataset.i].estado = x.value; draw() });
      $$("#sfTools .tDel").forEach(x => x.onclick = () => { tl.splice(+x.dataset.i, 1); draw() });
      $("#tAdd").onclick = () => { const nome = $("#tN").value.trim(); if (!nome) { $("#tN").focus(); return } tl.push({ nome, cod: $("#tC").value.trim(), valor: +$("#tV").value || 0, d: $("#tD").value || HOJE, estado: "Nova" }); draw(); $("#tN").focus() };
      const tt = $("#tTermo"); if (tt) tt.onclick = () => { const html = termoPaper(e, tl.filter(f => f.estado !== "Devolvida")); enviarPdfWhats(html, `Termo de ferramentas - ${e.name}`, e.phone, `Olá ${firstName(e.name)}, segue o termo de responsabilidade das ferramentas da empresa que estão com você. Confira e assine, por favor.`) };
    };
    draw();
    // ao salvar o cadastro, grava as ferramentas junto
    aoSalvarEquipe = async id => {
      if (DEMO) { const alvo = staff.find(x => x.id === id); if (alvo) alvo.ferramentas = tl; return }
      const row = f => ({ equipe_id: id, nome: f.nome, codigo: f.cod || null, valor: +f.valor || 0, entregue: f.d || HOJE, estado: f.estado });
      const fica = tl.filter(f => f.id).map(f => f.id), sai = antes.filter(x => !fica.includes(x)), novas = tl.filter(f => !f.id);
      if (sai.length) await live(sb.from("ga_ferramentas").delete().in("id", sai));
      for (const f of tl.filter(f => f.id)) await live(sb.from("ga_ferramentas").update(row(f)).eq("id", f.id));
      if (novas.length) await live(sb.from("ga_ferramentas").insert(novas.map(row)));
    };
  };
  function termoPaper(e, tl) {
    return `<div class="paper">${paperHead("TERMO DE RESPONSABILIDADE", ["Ferramentas e equipamentos", `Emitido em ${fd(HOJE)}`])}
  <div class="pb">
   <div class="cols"><div><div class="lbl">Funcionário</div><b>${esc(e.name)}</b><br>${esc(e.role)}${e.cpf ? "<br>CPF " + esc(e.cpf) : ""}</div><div><div class="lbl">Empresa</div><b>${esc(EMPRESA.nome)}</b>${EMPRESA.cnpj ? "<br>CNPJ " + esc(EMPRESA.cnpj) : ""}</div></div>
   <div>Declaro que recebi da empresa as ferramentas e equipamentos abaixo, em condições de uso, e me comprometo a usá-los apenas no trabalho, cuidar deles e devolvê-los quando solicitado ou ao sair da empresa. Em caso de perda ou dano por mau uso, comunicarei imediatamente o escritório.</div>
   <table><thead><tr><th>Ferramenta</th><th>Nº</th><th>Entregue em</th><th>Estado</th><th class="r">Valor</th></tr></thead><tbody>
    ${tl.map(f => `<tr><td>${esc(f.nome)}</td><td>${esc(f.cod || "—")}</td><td>${fd(f.d)}</td><td>${esc(f.estado)}</td><td class="r num">${f.valor ? brl(f.valor) : "—"}</td></tr>`).join("")}
   </tbody></table>
   <div class="tot num"><div class="g"><span>Total</span><span>${brl(tl.reduce((s, f) => s + (+f.valor || 0), 0))}</span></div></div>
   <div class="cols" style="margin-top:28px"><div class="sign">${esc(e.name)}</div><div class="sign">${esc(EMPRESA.nome)}</div></div>
  </div>${paperFoot("Termo · " + e.name)}</div>`;
  }

  // app real: carrega os dados novos depois do resto
  const _mapObra = mapObra;
  mapObra = (o, fb, fa) => {
    const x = _mapObra(o, fb, fa), et = o.etapas || [];
    if (et.length && et.every(e => +e.dias > 0)) x.etapas = et.map(e => ({ t: e.t, dias: Math.round(+e.dias), ok: !!e.ok, okEm: e.okEm || null }));
    const niv = {}; fb.forEach(f => { if (f.obra_id === o.id && f.nivel) niv[f.id] = f.nivel });
    x.log.forEach(l => { if (niv[l.id]) l.nivel = niv[l.id] });
    x.quote = o.orcamento_id || null;
    return x;
  };
  const _reload = reload;
  reload = async () => {
    await _reload();
    if (DEMO) return;
    const r = me.role;
    obras.forEach(syncObra);
    quotes.forEach(q => { const o = obras.find(x => x.quote === q.id); q.obra = o ? o.id : null });
    try {
      const [ag, es, mv, fe] = await Promise.all([
        sel("ga_agenda", q => q.gte("data", addDays(HOJE, -400))),
        r === "tec" ? [] : sel("ga_estoque"),
        r === "tec" ? [] : sel("ga_estoque_mov", q => q.gte("data", addDays(HOJE, -365))),
        r === "admin" ? sel("ga_ferramentas") : []
      ]);
      eventos = ag.map(e => ({ id: e.id, d: e.data, h: e.hora, tipo: TIPOS[e.tipo] ? e.tipo : "visita", titulo: e.titulo, cli: e.cliente_id, quem: e.quem || [], local: e.local || "", obs: e.obs || "", feito: e.feito, equipeVe: e.equipe_ve }));
      estoque = es.map(i => ({ id: i.id, nome: i.nome, cat: i.categoria, un: i.unidade, qtd: +i.qtd, min: +i.minimo, custo: +i.custo, local: i.local || "" }));
      movs = mv.map(m => ({ id: m.id, item: m.item_id, tipo: m.tipo, qtd: +m.qtd, obra: m.obra_id, d: m.data, quem: m.quem, obs: m.obs || "" })).sort((a, b) => b.d.localeCompare(a.d) || b.id - a.id);
      staff.forEach(e => e.ferramentas = fe.filter(f => f.equipe_id === e.id).map(f => ({ id: f.id, nome: f.nome, cod: f.codigo || "", valor: +f.valor, d: f.entregue, estado: f.estado })));
      falta007 = false;
    } catch (e) { console.warn("007 ainda não rodou?", e); falta007 = true; eventos = []; estoque = []; movs = [] }
  };

  let semeado = false;
  const _loadDemo = loadDemo;
  loadDemo = () => {
    _loadDemo(); seedEtapas(); seedFerramentas();
    // estoque e agenda continuam entre um login e outro, para dar para testar dono → funcionário
    if (!semeado) { semeado = true; seedEstoque(); seedAgenda() }
    agMes = HOJE.slice(0, 7); agDia = HOJE;
  };
})();
