/* Botão "Excluir" nos cadastros: cliente, orçamento, funcionário, material do estoque e ordem de serviço.
   Sempre com uma tela explicando o que sai junto e confirmação em dois toques.
   Obras, lançamentos, compromissos e lembretes já tinham o próprio botão.
   O banco já deixa só quem pode apagar (RLS). */
(() => {
  const ATIVO = true;
  // apaga do armazenamento as fotos que ficariam sem dono
  const tirarFotos = async paths => { paths = paths.filter(p => p && !/^(blob:|data:|https?:)/.test(p)); for (let i = 0; i < paths.length; i += 100) await sb.storage.from(BUCKET).remove(paths.slice(i, i + 100)) };
  const pl = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const escritorio = () => me.role === "admin" || me.role === "fin";
  const PODE = {
    cliente: () => me.role === "admin",
    orcamento: escritorio,
    funcionario: e => me.role === "admin" && !e.dono && !e.oculto && e.id !== me.id,
    material: escritorio,
    os: escritorio
  };

  // o que cada exclusão leva junto, o que fica, e como apaga
  function plano(tipo, x) {
    if (tipo === "cliente") {
      const qs = quotes.filter(q => q.client === x.id), obs = obras.filter(o => o.client === x.id), nos = window.gaOS ? gaOS.doCliente(x.id) : 0;
      const nl = lanc.filter(l => obs.some(o => o.id === l.obra)).length;
      return {
        titulo: x.name, oque: "o cliente",
        vai: [qs.length && pl(qs.length, "orçamento", "orçamentos"), obs.length && `${pl(obs.length, "obra", "obras")} com os feedbacks e fotos`, nos && pl(nos, "ordem de serviço", "ordens de serviço")].filter(Boolean),
        fica: nl ? `${pl(nl, "lançamento", "lançamentos")} do Financeiro continuam (a lei manda guardar), só sem a ligação com a obra.` : "",
        aviso: obs.some(o => o.pct < 100 && TODAY >= D(o.start)) ? "Esse cliente tem obra em andamento." : "",
        demo: () => { clients = clients.filter(c => c.id !== x.id); quotes = quotes.filter(q => q.client !== x.id); const ids = obs.map(o => o.id); obras = obras.filter(o => o.client !== x.id); lanc.forEach(l => { if (ids.includes(l.obra)) l.obra = null }); if (window.gaOS) gaOS.tirarCliente(x.id); if (window.gaAgenda) gaAgenda.tirarCliente(x.id) },
        real: async () => { const fotos = obs.flatMap(o => o.log.flatMap(l => l.fotos || [])); await live(sb.from("ga_clientes").delete().eq("id", x.id)); await tirarFotos(fotos).catch(() => { }) },
        ok: `Cliente ${x.name} excluído`
      };
    }
    if (tipo === "orcamento") {
      const ob = obras.find(o => o.quote === x.id || (x.obra && o.id === x.obra));
      return {
        titulo: `${x.n} · ${clientById(x.client).name}`, oque: "o orçamento",
        vai: [], fica: ob ? `A obra que nasceu dele (${ob.title}) continua.` : "",
        aviso: x.status === "Aprovado" ? "Esse orçamento está aprovado." : "",
        demo: () => { quotes = quotes.filter(q => q !== x); if (ob) ob.quote = null },
        real: () => live(sb.from("ga_orcamentos").delete().eq("id", x.id)),
        ok: `Orçamento ${x.n} excluído`
      };
    }
    if (tipo === "funcionario") {
      const ativas = obras.filter(o => o.pct < 100 && (o.resp === x.id || o.team.includes(x.id))), nos = window.gaOS ? gaOS.doTecnico(x.id) : 0, nf = (x.ferramentas || []).filter(f => f.estado !== "Devolvida").length;
      return {
        titulo: x.name, oque: "o cadastro",
        vai: [nf && `${pl(nf, "ferramenta", "ferramentas")} sob responsabilidade (confira a devolução antes)`, "o acesso ao app"].filter(Boolean),
        fica: "Os feedbacks e registros que a pessoa já enviou continuam nas obras.",
        aviso: [ativas.length && `Está em ${pl(ativas.length, "obra em andamento", "obras em andamento")}: troque o responsável ou a equipe depois.`, nos && `Tem ${pl(nos, "OS aberta", "OS abertas")}.`, "Se a pessoa só saiu da empresa, prefira desmarcar \"Acesso ativo\" no cadastro: o histórico fica com o nome dela."].filter(Boolean).join(" "),
        demo: () => { staff = staff.filter(e => e !== x); obras.forEach(o => { o.team = o.team.filter(id => id !== x.id) }); if (window.gaAgenda) gaAgenda.tirarPessoa(x.id) },
        real: async () => {
          // tira a pessoa das equipes das obras e dos compromissos antes de apagar
          for (const o of obras.filter(o => o.team.includes(x.id))) await live(sb.from("ga_obras").update({ equipe: o.team.filter(id => id !== x.id) }).eq("id", o.id));
          for (const e of (window.gaAgenda ? gaAgenda.comPessoa(x.id) : [])) await live(sb.from("ga_agenda").update({ quem: e.quem.filter(id => id !== x.id) }).eq("id", e.id));
          await live(sb.from("ga_equipe").delete().eq("id", x.id));
        },
        ok: `Cadastro de ${firstName(x.name)} excluído`
      };
    }
    if (tipo === "material") {
      const nm = window.gaEstoque ? gaEstoque.movsDe(x.id) : 0;
      return {
        titulo: x.nome, oque: "o material",
        vai: [nm && `o histórico de ${pl(nm, "movimentação", "movimentações")} (entradas e baixas)`].filter(Boolean),
        fica: "",
        aviso: x.qtd > 0 ? `Ainda tem ${(+x.qtd).toLocaleString("pt-BR")} ${x.un} no estoque.` : "",
        demo: () => gaEstoque.apagar(x.id),
        real: () => live(sb.from("ga_estoque").delete().eq("id", x.id)),
        ok: `${x.nome} excluído do estoque`
      };
    }
    if (tipo === "os") {
      return {
        titulo: `${x.n} · ${clientById(x.cli).name}`, oque: "a ordem de serviço",
        vai: [(x.fotosAntes.length + x.fotosDepois.length) && `${pl(x.fotosAntes.length + x.fotosDepois.length, "foto", "fotos")}`, x.assin && "a assinatura do cliente"].filter(Boolean),
        fica: x.status === "Concluída" ? "O lançamento dela no Financeiro continua. Se quiser, apague lá também." : "",
        aviso: x.status === "Concluída" ? "Essa OS já foi feita e assinada. Para uma OS que não vai acontecer, prefira \"Cancelar OS\"." : "",
        demo: () => gaOS.apagar(x.id),
        real: async () => { await live(sb.from("ga_os").delete().eq("id", x.id)); await tirarFotos([...x.fotosAntes, ...x.fotosDepois]).catch(() => { }) },
        ok: `${x.n} excluída`
      };
    }
  }

  function confirmar(tipo, x) {
    const p = plano(tipo, x);
    modal(`<div class="sheet-head"><div><div class="eyebrow">Excluir ${p.oque}</div><h2>${esc(p.titulo)}</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
 <p style="margin:0">Vai apagar ${p.oque} de vez. <b>Não dá para desfazer.</b></p>
 ${p.aviso ? `<div class="note" style="margin:0">⚠️ ${esc(p.aviso)}</div>` : ""}
 ${p.vai.length ? `<div class="card" style="background:var(--surface-2)"><div class="eyebrow" style="margin-bottom:6px">Sai junto</div><ul style="margin:0;padding-left:18px">${p.vai.map(v => `<li>${esc(v)}</li>`).join("")}</ul></div>` : ""}
 ${p.fica ? `<div class="s">${esc(p.fica)}</div>` : ""}
 <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" data-close>Cancelar</button><button class="btn danger" id="xxOk">🗑 Excluir</button></div>`);
    twoStep($("#xxOk"), "Toque de novo para confirmar", () => { closeModal(); act(async () => { if (DEMO) p.demo(); else await p.real() }, p.ok) });
  }

  // coloca o botão no rodapé da janela que está aberta
  window.gaBotaoExcluir = (tipo, x) => {
    if (!ATIVO || !x || !PODE[tipo](x)) return;
    const rows = $$("#modalRoot .sheet > div").filter(d => d.querySelector(".btn") && getComputedStyle(d).display === "flex");
    const row = rows[rows.length - 1]; if (!row || row.querySelector(".x-del")) return;
    row.insertAdjacentHTML("afterbegin", `<button class="btn ghost x-del" type="button">🗑 Excluir</button>`);
    if (row.style.justifyContent === "flex-end" || getComputedStyle(row).justifyContent === "flex-end") row.querySelector(".x-del").style.marginRight = "auto";
    row.querySelector(".x-del").onclick = () => confirmar(tipo, x);
  };

  const _clientDetail = clientDetail;
  clientDetail = id => { _clientDetail(id); if (!$("#cdDel")) gaBotaoExcluir("cliente", clientById(id)) };
  const _pdfPreview = pdfPreview;
  pdfPreview = q => { _pdfPreview(q); gaBotaoExcluir("orcamento", q) };
  const _staffForm = staffForm;
  staffForm = e => { _staffForm(e); if (e && !$("#sfDel")) gaBotaoExcluir("funcionario", e) };
})();
