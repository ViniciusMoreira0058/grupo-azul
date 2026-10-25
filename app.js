"use strict";
/* =====================================================================
   GRUPO AZUL · app de gestão
   Preencha as duas linhas abaixo com os dados do Supabase
   (Project Settings → API). Use só a chave anon/publishable.
   Com SUPABASE_URL vazio o app abre em modo demonstração.
   ===================================================================== */
const SUPABASE_URL = "https://ywswnutpvujkditmndmx.supabase.co";
const SUPABASE_KEY = "sb_publishable_9-MH99CiuzmvMR6K5vK4vg_IzqTjsLk";

// dados que saem no rodapé do PDF do orçamento
const EMPRESA = {
  nome: "Grupo Azul Instalações Hidráulicas",
  contato: "grupoazul.com.br · (11) 4000-0000 · contato@grupoazul.com.br",
  pagamento: "40% na aprovação, 30% na metade da obra e 30% na entrega. PIX ou transferência.",
  garantia: "5 anos para a instalação hidráulica. Equipamentos conforme garantia do fabricante. Teste de estanqueidade incluso.",
  validade: 15
};

const DEMO = !SUPABASE_URL || !SUPABASE_KEY || new URLSearchParams(location.search).has("demo");
const sb = DEMO ? null : window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET = "ga-arquivos";
const LOGO_DARK = "assets/logo-dark.png";

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const brl = v => (+v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brl0 = v => (+v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = { get(k) { try { return localStorage.getItem(k) } catch (e) { return null } }, set(k, v) { try { localStorage.setItem(k, v) } catch (e) { } } };
const initials = n => String(n || "").trim().split(/\s+/).filter(Boolean).map(p => p[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join("").toUpperCase() || "?";
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const pad = n => String(n).padStart(2, "0");
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const D = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d) };
const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })();
const HOJE = isoOf(TODAY);
const addDays = (iso, n) => { const d = D(iso); d.setDate(d.getDate() + n); return isoOf(d) };
const addMonths = (iso, n) => { const d = D(iso), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return isoOf(d) };
const fd = iso => iso ? iso.split("-").reverse().join("/") : "—";
const MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MES3 = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const DIA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const mesNome = k => `${cap(MES[+k.slice(5, 7) - 1])} de ${k.slice(0, 4)}`;
const hojeLongo = () => `${cap(DIA[TODAY.getDay()])}, ${TODAY.getDate()} de ${MES[TODAY.getMonth()]} de ${TODAY.getFullYear()}`;
const lastMonths = n => Array.from({ length: n }, (_, i) => addMonths(HOJE.slice(0, 8) + "01", i - n + 1).slice(0, 7));
const saudacao = () => { const h = new Date().getHours(); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite" };
const firstName = n => String(n || "").split(" ")[0];
const digits = s => String(s || "").replace(/\D/g, "");
const waLink = (phone, text) => { let n = digits(phone); if (n && n.length <= 11) n = "55" + n; return `https://wa.me/${n}?text=${encodeURIComponent(text)}` };
const appUrl = () => location.origin + location.pathname;

/* ---------- estado ---------- */
let me = null;            // { id, name, ini, role: admin|fin|tec, funcao, dono }
let clients = [], quotes = [], obras = [], lanc = [], staff = [], lembretes = [], lemMissing = false;
let current = "dash";
const FOTO_URL = {};      // caminho no storage → link temporário

const clientById = id => clients.find(c => c.id === id) || { id, name: "—", contact: "", phone: "", city: "", obra: "", status: "", value: 0 };
const emp = id => staff.find(e => e.id === id) || { id, name: "—", ini: "?", role: "" };
const qTotal = q => q.items.reduce((s, i) => s + (+i[1] || 0) * (+i[2] || 0), 0);

/* ---------- tema ---------- */
function applyTheme(t) { document.documentElement.setAttribute("data-theme", t); const m = $('meta[name="theme-color"]'); if (m) m.content = t === "dark" ? "#000000" : "#f3f6fa" }
applyTheme(store.get("ga-theme") || "dark");
$("#themeBtn").onclick = () => { const t = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"; applyTheme(t); store.set("ga-theme", t) };

/* =====================================================================
   DADOS: carregar e salvar (demonstração = só na memória; real = Supabase)
   ===================================================================== */
async function live(q) { const { data, error } = await q; if (error) throw error; return data }
const sel = (t, build = q => q) => live(build(sb.from(t).select("*")).order("id", { ascending: true }).range(0, 9999));

function mapClient(c) { return { id: c.id, name: c.nome, contact: c.contato || "", phone: c.telefone || "", city: c.cidade || "", obra: c.servico || "", status: c.status, value: +c.valor || 0 } }
function mapQuote(q) { return { id: q.id, n: q.numero, client: q.cliente_id, date: q.data, status: q.status, title: q.titulo, items: q.itens || [] } }
function mapLanc(l) { return { id: l.id, type: l.tipo, d: l.data, desc: l.descricao, cat: l.categoria || "", who: l.quem || "", obra: l.obra_id, pay: l.forma || "", v: +l.valor, paid: l.pago, file: l.comprovante || null } }
function mapLem(l) { return { id: l.id, title: l.titulo, obs: l.obs || "", urg: l.urgencia, due: l.data, done: l.feito, at: l.criado_em } }
function mapStaff(e) { return { id: e.id, name: e.nome, role: e.funcao, phone: e.telefone || "", email: e.email || "", cpf: e.cpf || "", since: e.admissao || "", daily: +e.diaria || 0, access: e.acesso, active: e.ativo, dono: e.dono, linked: !!e.user_id } }
function mapObra(o, fb, fa) {
  return {
    id: o.id, client: o.cliente_id, title: o.titulo, addr: o.endereco || "", start: o.inicio, end: o.fim, resp: o.responsavel, team: o.equipe || [], pct: o.pct, notes: o.recado || "",
    tasks: (o.etapas || []).map(e => [e.t, !!e.ok]),
    log: fb.filter(f => f.obra_id === o.id).sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id)
      .map(f => ({ id: f.id, d: f.data, who: f.autor, pct: f.pct, text: f.texto || "", problem: f.problema || "", fotos: f.fotos || [] })),
    missing: fa.filter(m => m.obra_id === o.id).sort((a, b) => b.id - a.id)
      .map(m => ({ id: m.id, item: m.item, qty: m.qtd || "", urgent: m.urgente, obs: m.obs || "", by: m.autor, d: m.data, st: m.status }))
  };
}

async function reload() {
  if (DEMO) return;
  const r = me.role;
  const nomes = await live(sb.rpc("ga_nomes")) || { equipe: [], clientes: [] };
  const desde = addDays(HOJE, -120), desdeFin = addMonths(HOJE, -24);
  const [ob, fb, fa, cl, qu, la, eq] = await Promise.all([
    sel("ga_obras"),
    sel("ga_feedbacks", q => q.gte("data", desde)),
    sel("ga_faltas", q => q.or(`status.eq.Aberto,data.gte.${desde}`)),
    r === "tec" ? [] : sel("ga_clientes"),
    r === "tec" ? [] : sel("ga_orcamentos"),
    r === "tec" ? [] : sel("ga_lancamentos", q => q.or(`data.gte.${desdeFin},pago.eq.false`)),
    r === "admin" ? sel("ga_equipe") : []
  ]);
  staff = r === "admin" ? eq.map(mapStaff) : (nomes.equipe || []).map(e => ({ id: e.id, name: e.nome, role: e.funcao, active: e.ativo, access: "tec" }));
  clients = r === "tec" ? (nomes.clientes || []).map(c => ({ ...clientById(), id: c.id, name: c.nome, city: c.cidade || "" })) : cl.map(mapClient);
  quotes = qu.map(mapQuote);
  lanc = la.map(mapLanc);
  obras = ob.map(o => mapObra(o, fb, fa));
  staff.forEach(e => e.ini = initials(e.name));
  // lembretes: se a tabela ainda não existe (002_lembretes.sql não rodou), o resto do app segue normal
  if (r === "admin") { try { lembretes = (await sel("ga_lembretes")).map(mapLem); lemMissing = false } catch (e) { lembretes = []; lemMissing = true } }
  // links temporários das fotos do feedback
  const paths = [...new Set(fb.flatMap(f => f.fotos || []))].filter(p => !FOTO_URL[p]);
  for (let i = 0; i < paths.length; i += 100) {
    const { data } = await sb.storage.from(BUCKET).createSignedUrls(paths.slice(i, i + 100), 60 * 60 * 6);
    (data || []).forEach(x => { if (x.signedUrl) FOTO_URL[x.path] = x.signedUrl });
  }
}

function loadDemo() {
  const s = demoSeed(HOJE, addDays, addMonths);
  ({ staff, clients, quotes, obras, lanc } = s); lembretes = s.lembretes || [];
  staff.forEach(e => e.ini = initials(e.name));
}

let busyN = 0;
function busy(on) { busyN += on ? 1 : -1; document.body.classList.toggle("busy", busyN > 0) }
function render() { if (VIEWS[current]) VIEWS[current](); if (me) renderNav() }
// roda uma alteração: na demonstração mexe só na memória; no real grava e recarrega
async function act(fn, okMsg) {
  try { busy(true); await fn(); if (!DEMO) await reload(); render(); if (okMsg) toast(okMsg); return true }
  catch (e) { console.error(e); toast("Não foi possível salvar. " + friendly(e)); return false }
  finally { busy(false) }
}
function friendly(e) {
  const m = (e && (e.message || e.error_description)) || String(e);
  if (/Failed to fetch|NetworkError/i.test(m)) return "Sem conexão com a internet.";
  if (/row-level security|permission/i.test(m)) return "Seu perfil não tem permissão para isso.";
  if (/duplicate key.*numero/i.test(m)) return "Já existe um orçamento com esse número.";
  if (/duplicate key.*email/i.test(m)) return "Já existe alguém da equipe com esse e-mail.";
  return m;
}
const nextId = arr => arr.reduce((m, x) => Math.max(m, typeof x.id === "number" ? x.id : 0), 0) + 1;

// fotos e comprovantes: reduz a foto e envia para a pasta privada
async function shrink(file, max = 1600) {
  if (!file.type.startsWith("image/")) return file;
  try {
    const img = await createImageBitmap(file), s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(b => r(b || file), "image/jpeg", .82));
  } catch (e) { return file }
}
async function uploadFiles(files, folder) {
  const out = [];
  for (const f of files) {
    const blob = await shrink(f);
    if (DEMO) { out.push(URL.createObjectURL(blob)); continue }
    const ext = blob.type === "image/jpeg" ? "jpg" : (f.name.split(".").pop() || "bin").toLowerCase();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    await live(sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || f.type }));
    out.push(path);
  }
  return out;
}
const fotoUrl = p => DEMO ? p : FOTO_URL[p];
async function openFile(path) {
  if (DEMO) { window.open(path, "_blank"); return }
  const w = window.open("", "_blank");
  try { const { signedUrl } = await live(sb.storage.from(BUCKET).createSignedUrl(path, 600)); if (w) w.location = signedUrl; else location.href = signedUrl }
  catch (e) { if (w) w.close(); toast("Não foi possível abrir o arquivo. " + friendly(e)) }
}

/* =====================================================================
   LOGIN
   ===================================================================== */
let authMode = "login", starting = false;
const AUTH = {
  login: { title: "", btn: "Entrar", pass: true, pass2: false, links: true },
  signup: { title: "Primeiro acesso: use o e-mail que o escritório cadastrou e crie sua senha.", btn: "Criar minha senha", pass: true, pass2: true, links: false },
  reset: { title: "Digite seu e-mail. Enviamos um link para criar uma senha nova.", btn: "Enviar link", pass: false, pass2: false, links: false },
  newpass: { title: "Crie sua senha nova.", btn: "Salvar senha nova", pass: true, pass2: true, links: false }
};
function authMsg(text, bad) { const m = $("#authMsg"); m.hidden = !text; m.textContent = text || ""; m.classList.toggle("bad", !!bad) }
function setAuthMode(m) {
  authMode = m; const c = AUTH[m];
  $("#authTitle").hidden = !c.title; $("#authTitle").textContent = c.title;
  $("#fEmail").hidden = m === "newpass"; $("#fPass").hidden = !c.pass; $("#fPass2").hidden = !c.pass2;
  $("#lgPass").autocomplete = c.pass2 ? "new-password" : "current-password";
  $("#authGo").textContent = c.btn; $("#authLinks").hidden = !c.links; $("#authBack").hidden = c.links || m === "newpass";
  authMsg("");
}
function showLogin() {
  me = null; $("#app").hidden = true; $("#login").hidden = false; closeDrawer(); closeModal();
  $("#demoBox").hidden = !DEMO; $("#authLinks").hidden = DEMO;
  if (DEMO) { $("#lgEmail").value = "rafael@grupoazul.com.br"; $("#lgPass").value = "demonstracao" }
}
let demoRole = "admin";
$$("#rolePick button").forEach(b => b.onclick = () => {
  demoRole = b.dataset.r; $$("#rolePick button").forEach(x => x.classList.toggle("active", x === b));
  $("#lgEmail").value = { admin: "rafael@grupoazul.com.br", fin: "patricia@grupoazul.com.br", tec: "carlos@grupoazul.com.br" }[demoRole];
  $("#roleNote").textContent = { admin: "Vê tudo: obras, orçamentos, financeiro, relatórios e equipe.", fin: "Vê financeiro, orçamentos, clientes e relatórios.", tec: "Só a aba Obras: o que fazer, prazo, feedback do dia e pedido de material." }[demoRole];
});
$$("#authLinks [data-mode]").forEach(b => b.onclick = () => setAuthMode(b.dataset.mode));
$("#authBack").onclick = () => setAuthMode("login");

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (DEMO) { splashShow(); loadDemo(); const p = staff.find(s => s.access === demoRole && s.active); me = { id: p.id, name: p.name, ini: p.ini, role: demoRole, funcao: p.role, dono: !!p.dono }; enterApp(); splashHide(); return }
  const email = $("#lgEmail").value.trim().toLowerCase(), pass = $("#lgPass").value, pass2 = $("#lgPass2").value;
  const btn = $("#authGo"); btn.disabled = true; authMsg("");
  try {
    if (authMode === "login") {
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw new Error(/invalid/i.test(error.message) ? "E-mail ou senha incorretos." : /confirm/i.test(error.message) ? "Confirme seu e-mail pelo link que enviamos antes de entrar." : error.message);
      await start();
    } else if (authMode === "signup" || authMode === "newpass") {
      if (pass.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
      if (pass !== pass2) throw new Error("As duas senhas não estão iguais.");
      if (authMode === "newpass") {
        await live(sb.auth.updateUser({ password: pass })); setAuthMode("login"); await start(); return;
      }
      if (!await live(sb.rpc("ga_email_cadastrado", { p_email: email }))) throw new Error("Esse e-mail não está cadastrado na equipe. Peça ao escritório para cadastrar você em Funcionários.");
      const data = await live(sb.auth.signUp({ email, password: pass, options: { emailRedirectTo: appUrl() } }));
      if (data.user && data.user.identities && data.user.identities.length === 0) throw new Error("Esse e-mail já tem senha. Toque em Voltar e use Entrar, ou Esqueci a senha.");
      if (data.session) { await start(); return }
      setAuthMode("login"); authMsg(`Pronto! Enviamos um e-mail para ${email}. Abra o link de confirmação e depois entre aqui com a sua senha.`);
    } else if (authMode === "reset") {
      await live(sb.auth.resetPasswordForEmail(email, { redirectTo: appUrl() }));
      authMsg(`Se ${email} estiver cadastrado, você vai receber um link para criar a senha nova.`);
    }
  } catch (err) { authMsg(friendly(err), true) }
  finally { btn.disabled = false }
});

/* ---------- tela de carregamento ---------- */
const SPLASH_MIN = 1600; let splashAt = performance.now(), splashTok = 0;
function splashShow() { splashTok++; splashAt = performance.now(); const s = $("#splash"); s.hidden = false; s.classList.remove("out") }
function splashHide() {
  const t = splashTok, wait = Math.max(0, SPLASH_MIN - (performance.now() - splashAt));
  setTimeout(() => { if (t !== splashTok) return; const s = $("#splash"); s.classList.add("out"); setTimeout(() => { if (t === splashTok) s.hidden = true }, 420) }, wait);
}

async function start() {
  if (starting || me) return; starting = true; splashShow();
  try {
    const p = await live(sb.rpc("ga_vincular"));
    if (!p) { await sb.auth.signOut(); showLogin(); authMsg("Seu e-mail ainda não está cadastrado na equipe do Grupo Azul. Peça ao escritório para cadastrar você e tente de novo.", true); return }
    if (p.inativo) { await sb.auth.signOut(); showLogin(); authMsg("Seu acesso foi desativado. Fale com o escritório.", true); return }
    me = { id: p.id, name: p.nome, ini: initials(p.nome), role: p.acesso, funcao: p.funcao, dono: p.dono };
    busy(true); await reload(); enterApp();
  } catch (e) { console.error(e); showLogin(); authMsg("Não foi possível entrar. " + friendly(e), true) }
  finally { starting = false; busyN = 0; busy(false); splashHide() }
}

$("#logoutBtn").onclick = async () => { if (!DEMO) await sb.auth.signOut(); showLogin(); setAuthMode("login") };

/* =====================================================================
   NAVEGAÇÃO
   ===================================================================== */
const ICON = {
  func: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  obr: '<path d="M3 18h18M5 18v-2a7 7 0 0 1 14 0v2"/><path d="M10 9V5h4v4M12 5v4"/>',
  dash: '<path d="M4 13h6V4H4zM14 20h6v-9h-6zM14 4v4h6V4zM4 20h6v-3H4z"/>',
  cli: '<path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/>',
  orc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  fin: '<path d="M3 7h18v12H3z"/><path d="M3 11h18M7 15h3"/>',
  rel: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  est: '<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/>',
  lem: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  os: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>'
};
const PAGES = [["dash", "Dashboard"], ["obr", "Obras"], ["lem", "Lembretes"], ["cli", "Clientes"], ["orc", "Orçamentos"], ["fin", "Financeiro"], ["rel", "Relatórios"], ["func", "Funcionários"]];
const ALLOWED = { admin: PAGES.map(p => p[0]), fin: ["dash", "cli", "orc", "fin", "rel"], tec: ["obr"] };
const SOON = [["est", "Estoque"], ["os", "Ordens de serviço"]];
const can = p => ALLOWED[me.role].includes(p);
function renderNav() {
  const pages = PAGES.filter(p => can(p[0]));
  const nLem = lemPend().filter(l => l.urg === "urgente" || (l.due && l.due <= HOJE)).length;
  $("#nav").innerHTML = pages.map(([k, l]) => `<button data-p="${k}" class="${k === current ? "active" : ""}"><svg viewBox="0 0 24 24">${ICON[k]}</svg>${l}${k === "lem" && nLem ? `<span class="nbadge">${nLem}</span>` : ""}</button>`).join("")
    + (me.role === "tec" ? "" : `<div class="nav-label eyebrow">Fase 2</div>` + SOON.map(([k, l]) => `<button disabled><svg viewBox="0 0 24 24">${ICON[k]}</svg>${l}<span class="soon">Em breve</span></button>`).join(""));
  $$("#nav button[data-p]").forEach(b => b.onclick = () => go(b.dataset.p));
}
function go(p) {
  if (!can(p)) p = ALLOWED[me.role][0];
  current = p; renderNav(); closeDrawer(); render(); window.scrollTo(0, 0);
  try { history.replaceState(null, "", location.search + "#" + p) } catch (e) { }
}
function openDrawer() { $("#drawer").classList.add("open"); $("#scrim").hidden = false }
function closeDrawer() { $("#drawer").classList.remove("open"); $("#scrim").hidden = true }
$("#menuBtn").onclick = openDrawer; $("#scrim").onclick = closeDrawer;
function enterApp() {
  $("#login").hidden = true; $("#app").hidden = false;
  const perfil = { admin: me.dono ? "Dono · Administrador" : "Administrador", fin: "Financeiro", tec: "Funcionário" }[me.role];
  $("#userRow").innerHTML = `<div class="avatar">${esc(me.ini)}</div><div><b>${esc(me.name)}</b><small>${esc(me.funcao)} · ${perfil}</small></div>`;
  $("#topAvatar").textContent = me.ini; $("#topAvatar").title = me.name;
  $("#today").textContent = `${DIA[TODAY.getDay()].slice(0, 3)}, ${TODAY.getDate()} ${MES3[TODAY.getMonth()].toLowerCase()}`;
  const h = location.hash.slice(1); go(PAGES.some(p => p[0] === h) ? h : ALLOWED[me.role][0]);
  setTimeout(welcome, 80);
}

function toast(msg) { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; t.setAttribute("role", "status"); document.body.appendChild(t); setTimeout(() => t.remove(), 3200) }
function modal(html, wide) {
  const r = $("#modalRoot"); r.innerHTML = `<div class="modal"><div class="sheet ${wide ? "wide" : ""}" role="dialog" aria-modal="true">${html}</div></div>`;
  r.querySelector(".modal").onclick = e => { if (e.target.classList.contains("modal")) closeModal() };
  $$("[data-close]", r).forEach(b => b.onclick = closeModal);
}
function closeModal() { $("#modalRoot").innerHTML = "" }
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); closeDrawer() } });
const banner = () => DEMO ? `<div class="demo-banner"><b>Demonstração</b> Todos os nomes e valores são fictícios.</div>` : "";
const head = (t, s, actions = "") => `${banner()}<div class="page-head"><div><h1>${t}</h1>${s ? `<p>${s}</p>` : ""}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${actions}</div></div>`;
const empty = (text, btn = "") => `<div class="empty"><p>${text}</p>${btn}</div>`;
const STATUS_CHIP = { "Em andamento": "c-info", "Planejamento": "c-mute", "Concluída": "c-good", "Aguardando aprovação": "c-warn", "Aprovado": "c-good", "Enviado": "c-info", "Rascunho": "c-mute", "Recusado": "c-bad", "Recebido": "c-good", "Pago": "c-good", "Pendente": "c-warn", "Atrasado": "c-bad", "A receber": "c-warn", "A pagar": "c-warn" };
const chip = s => `<span class="chip ${STATUS_CHIP[s] || "c-mute"}">${esc(s)}</span>`;
// confirmação em dois toques (o app não usa confirm())
function twoStep(btn, label, fn) { btn.onclick = () => { if (btn.dataset.armed) { fn(); return } btn.dataset.armed = "1"; btn.textContent = label; btn.classList.add("danger"); setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed } }, 4000) } }

/* ---------- gráficos ---------- */
function niceMax(v) { if (v <= 0) return 1000; const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 2, 2.5, 4, 5, 8, 10]) if (m * p >= v) return m * p; return 10 * p }
const fmtK = v => Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : String(Math.round(v));
function barChart(a, b, labels) {
  const W = 640, H = 240, L = 50, R = 8, T = 12, B = 28, max = niceMax(Math.max(...a, ...b)), steps = [0, .25, .5, .75, 1].map(f => f * max);
  const y = v => T + (H - T - B) * (1 - v / max), gw = (W - L - R) / labels.length, bw = Math.min(18, gw / 4);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Entradas e saídas por mês">`;
  steps.forEach(v => { s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${fmtK(v)}</text>` });
  labels.forEach((m, i) => {
    const cx = L + gw * i + gw / 2;
    s += `<rect x="${cx - bw - 2}" y="${y(a[i])}" width="${bw}" height="${Math.max(0, y(0) - y(a[i]))}" rx="4" fill="var(--accent-2)"${i === labels.length - 1 ? "" : ' opacity=".75"'}><title>${m}: entradas ${brl0(a[i])}</title></rect>`;
    s += `<rect x="${cx + 2}" y="${y(b[i])}" width="${bw}" height="${Math.max(0, y(0) - y(b[i]))}" rx="4" fill="var(--muted)" opacity=".45"><title>${m}: saídas ${brl0(b[i])}</title></rect>`;
    s += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${m}</text>`;
  });
  return s + "</svg>";
}
function lineChart(vals, labels) {
  const W = 640, H = 220, L = 50, R = 16, T = 22, B = 28, top = niceMax(Math.max(0, ...vals)), bot = Math.min(0, ...vals) < 0 ? -niceMax(-Math.min(...vals)) : 0;
  const y = v => T + (H - T - B) * (1 - (v - bot) / (top - bot)), x = i => L + (W - L - R) * i / Math.max(1, labels.length - 1);
  const steps = [0, .25, .5, .75, 1].map(f => bot + f * (top - bot));
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Lucro por mês">`;
  steps.forEach(v => { s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${fmtK(v)}</text>` });
  s += `<polygon points="${x(0)},${y(0)} ${pts} ${x(vals.length - 1)},${y(0)}" fill="var(--accent-soft)"/>`;
  s += `<polyline points="${pts}" fill="none" stroke="var(--accent-2)" stroke-width="2.5" stroke-linejoin="round"/>`;
  vals.forEach((v, i) => {
    const last = i === vals.length - 1;
    s += `<circle cx="${x(i)}" cy="${y(v)}" r="${last ? 5 : 3}" fill="${last ? "var(--accent-2)" : "var(--surface)"}" stroke="var(--accent-2)" stroke-width="2"><title>${labels[i]}: ${brl0(v)}</title></circle><text x="${x(i)}" y="${H - 8}" text-anchor="middle">${labels[i]}</text>`;
    if (last) s += `<text x="${x(i) - 8}" y="${y(v) - 12}" text-anchor="end" style="fill:var(--fg);font-weight:700">${brl0(v)}</text>`;
  });
  return s + "</svg>";
}

/* =====================================================================
   OBRAS: regras de prazo
   ===================================================================== */
const expected = o => Math.max(0, Math.min(100, Math.round((TODAY - D(o.start)) / Math.max(1, D(o.end) - D(o.start)) * 100)));
const daysLeft = o => Math.round((D(o.end) - TODAY) / 864e5);
const todayDone = o => o.log.some(l => l.d === HOJE);
function obraStatus(o) {
  if (o.pct >= 100) return ["Concluída", "c-good"];
  if (TODAY < D(o.start)) return ["Não iniciada", "c-mute"];
  const e = expected(o);
  if (TODAY > D(o.end) || o.pct < e - 5) return ["Atrasada", "c-bad"];
  if (o.pct > e + 8) return ["Adiantada", "c-good"];
  return ["No prazo", "c-info"];
}
const stChip = o => { const [s, c] = obraStatus(o); return `<span class="chip ${c}">${s}</span>` };
function progLine(o) {
  const e = expected(o), late = obraStatus(o)[0] === "Atrasada", started = TODAY >= D(o.start);
  return `<div class="pl"><div class="pl-track ${late ? "late" : ""}"><i style="width:${o.pct}%"></i>${started && o.pct < 100 ? `<b class="pl-exp" style="left:${e}%" title="Esperado hoje: ${e}%"></b>` : ""}</div>
 <div class="pl-legend"><span><b class="num" style="color:var(--fg)">${o.pct}%</b> concluído</span><span class="num">${o.pct >= 100 ? "Entregue" : started ? `Esperado hoje: ${e}%` : `Começa em ${fd(o.start)}`}</span></div></div>`;
}
const prazo = o => { const d = daysLeft(o); return `Prazo ${fd(o.end)} · ${o.pct >= 100 ? "concluída" : d > 1 ? `faltam ${d} dias` : d === 1 ? "termina amanhã" : d === 0 ? "termina hoje" : `vencido há ${-d} dias`}` };
const openMissing = () => obras.flatMap(o => o.missing.filter(m => m.st === "Aberto").map(m => ({ ...m, o })));
const activeObras = () => obras.filter(o => TODAY >= D(o.start) && o.pct < 100);
const myObras = () => obras.filter(o => o.resp === me.id || o.team.includes(me.id));
const clientObra = c => obras.filter(o => o.client === c.id).sort((a, b) => (a.pct >= 100) - (b.pct >= 100) || b.start.localeCompare(a.start))[0];
function fbRate(e) {
  const mine = obras.filter(o => o.resp === e.id || o.team.includes(e.id));
  let days = 0; const sent = new Set();
  for (let n = 0; n < 30; n++) {
    const day = addDays(HOJE, -n); if (D(day).getDay() === 0) continue;
    if (mine.some(o => o.start <= day && day <= o.end && (o.pct < 100 || o.log.some(l => l.d >= day)))) days++;
  }
  mine.forEach(o => o.log.forEach(l => { if (l.who === e.id && l.d >= addDays(HOJE, -29)) sent.add(l.d) }));
  return days ? Math.min(100, Math.round(sent.size / days * 100)) : null;
}
// mapa da obra sem chave de API: incorporação do Google Maps + rota no Google Maps ou Waze
const mapaObra = o => o.addr ? `<div class="mapa"><iframe src="https://maps.google.com/maps?q=${encodeURIComponent(o.addr)}&z=16&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Mapa da obra"></iframe>
 <div class="mapa-btns"><a class="btn sm primary" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(o.addr)}" target="_blank" rel="noopener">Ir com Google Maps</a><a class="btn sm" href="https://waze.com/ul?q=${encodeURIComponent(o.addr)}&navigate=yes" target="_blank" rel="noopener">Ir com Waze</a></div></div>` : "";
const thumbs = fotos => (fotos || []).map(p => fotoUrl(p)).filter(Boolean).map(u => `<a href="${esc(u)}" target="_blank" rel="noopener"><img class="thumb" src="${esc(u)}" alt="Foto do feedback" loading="lazy"></a>`).join("");

/* =====================================================================
   TELAS
   ===================================================================== */
const VIEWS = {};

/* ---------- Dashboard ---------- */
VIEWS.dash = () => {
  const months = lastMonths(6), sumM = (k, t) => lanc.filter(l => l.paid && l.type === t && l.d.startsWith(k)).reduce((s, l) => s + l.v, 0);
  const IN = months.map(k => sumM(k, "in")), OUT = months.map(k => sumM(k, "out"));
  const inM = IN[5], outM = OUT[5], inP = IN[4], outP = OUT[4], prevName = MES[+months[4].slice(5) - 1];
  const delta = (a, b, goodUp) => { if (!b) return `<span class="s">sem dados de ${prevName}</span>`; const p = (a - b) / b * 100, up = p >= 0; return `<span class="${up === goodUp ? "up" : "down"}">${up ? "▲" : "▼"} ${Math.abs(p).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span> sobre ${prevName}` };
  const pend = lanc.filter(l => !l.paid), rec = pend.filter(l => l.type === "in"), recLate = rec.filter(l => l.d < HOJE).length;
  const rec30 = rec.filter(l => l.d <= addDays(HOJE, 30)).reduce((s, l) => s + l.v, 0);
  const due = [...pend].sort((a, b) => a.d.localeCompare(b.d)).slice(0, 6);
  const act = activeObras(), avisos = [...openMissing().map(m => `<div class="row"><div class="grow"><div class="t">Falta: ${esc(m.item)}</div><div class="s">${esc(clientById(m.o.client).name)} · ${esc(emp(m.by).name)} · ${fd(m.d)}</div></div>${m.urgent ? '<span class="chip c-bad">Parou a obra</span>' : '<span class="chip c-warn">Aguardando</span>'}</div>`),
  ...act.filter(o => !todayDone(o)).map(o => `<div class="row"><div class="grow"><div class="t">Sem feedback hoje</div><div class="s">${esc(clientById(o.client).name)} · ${esc(emp(o.resp).name)}</div></div><span class="chip c-warn">Pendente</span></div>`)];
  $("#main").innerHTML = banner() + `<div class="hero"><div class="lines bp-one" aria-hidden="true"></div><div><div class="eyebrow">${hojeLongo()}</div><h1>${saudacao()}, ${esc(firstName(me.name))}</h1><p>${act.length} ${act.length === 1 ? "obra" : "obras"} em andamento e ${brl0(rec30)} para receber nos próximos 30 dias.</p></div><button class="btn primary" id="qNew">+ Novo orçamento</button></div>
 <div class="grid kpis">
  <div class="card kpi"><div class="eyebrow">Faturamento do mês</div><div class="v num">${brl0(inM)}</div><div class="d">${delta(inM, inP, true)}</div></div>
  <div class="card kpi"><div class="eyebrow">Saídas do mês</div><div class="v num">${brl0(outM)}</div><div class="d">${delta(outM, outP, false)}</div></div>
  <div class="card kpi"><div class="eyebrow">Lucro do mês</div><div class="v num ${inM - outM < 0 ? "down" : ""}">${brl0(inM - outM)}</div><div class="d">${inM ? `Margem de ${Math.round((inM - outM) / inM * 100)}%` : "Sem entradas no mês"}</div></div>
  <div class="card kpi"><div class="eyebrow">A receber</div><div class="v num">${brl0(rec.reduce((s, l) => s + l.v, 0))}</div><div class="d">${rec.length} lançamentos${recLate ? ` · <span class="down">${recLate} atrasado${recLate > 1 ? "s" : ""}</span>` : ""}</div></div>
 </div>
 <div class="grid two" style="margin-top:14px">
  <div class="card"><div class="card-head"><h2>Entradas x saídas</h2><div class="legend"><span><i style="background:var(--accent-2)"></i>Entradas</span><span><i style="background:var(--muted);opacity:.45"></i>Saídas</span></div></div>${barChart(IN, OUT, months.map(k => MES3[+k.slice(5) - 1]))}</div>
  <div class="card"><div class="card-head"><h2>Próximos vencimentos</h2><button class="btn sm ghost" data-go="fin">Ver tudo</button></div><div class="list">
   ${due.length ? due.map(r => `<div class="row"><div class="grow"><div class="t">${esc(r.desc)}</div><div class="s">${fd(r.d)} · ${esc(r.who)}</div></div><div style="text-align:right"><div class="num ${r.type === "in" ? "up" : ""}" style="font-weight:700">${r.type === "in" ? "+" : "−"} ${brl0(r.v)}</div>${r.d < HOJE ? chip("Atrasado") : ""}</div></div>`).join("") : `<p class="s" style="margin:0">Nada para pagar ou receber.</p>`}
  </div></div>
 </div>
 <div class="grid two" style="margin-top:14px">
  <div class="card"><div class="card-head"><h2>Andamento das obras</h2>${can("obr") ? '<button class="btn sm ghost" data-go="obr">Ver obras</button>' : ""}</div><div class="grid" style="gap:18px">${act.length ? act.map(o => `<div><div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:8px;align-items:center"><div style="min-width:0"><b>${esc(clientById(o.client).name)}</b><div class="s">${esc(emp(o.resp).name)} · ${prazo(o)}</div></div>${stChip(o)}</div>${progLine(o)}</div>`).join("") : `<p class="s" style="margin:0">Nenhuma obra em andamento.</p>`}</div></div>
  <div class="card"><div class="card-head"><h2>Avisos da equipe</h2></div><div class="list">${avisos.join("") || `<p class="s" style="margin:0">Tudo em dia.</p>`}</div></div>
 </div>`;
  $$("#main [data-go]").forEach(b => b.onclick = () => go(b.dataset.go));
  $("#qNew").onclick = () => { go("orc"); quoteForm() };
};

/* ---------- Clientes ---------- */
const CLI_STATUS = ["Aguardando aprovação", "Planejamento", "Em andamento", "Concluída"];
let cliFilter = "Todos";
VIEWS.cli = () => {
  $("#main").innerHTML = head("Clientes", `${clients.length} ${clients.length === 1 ? "cliente" : "clientes"} · ${clients.filter(c => c.status === "Em andamento").length} em andamento`, `<button class="btn primary" id="cNew">+ Novo cliente</button>`) + `
 <div class="toolbar"><input class="input" id="cSearch" placeholder="Buscar por nome, bairro ou serviço"><div class="tabs" id="cTabs">${["Todos", ...CLI_STATUS].map(t => `<button class="${t === cliFilter ? "active" : ""}" data-f="${t}">${t}</button>`).join("")}</div></div>
 <div class="grid client-grid" id="cList"></div>`;
  const draw = () => {
    const q = $("#cSearch").value.toLowerCase();
    const list = clients.filter(c => (cliFilter === "Todos" || c.status === cliFilter) && (c.name + c.city + c.obra + c.contact).toLowerCase().includes(q));
    $("#cList").innerHTML = list.length ? list.map(c => { const o = clientObra(c); return `<button class="card client" data-id="${c.id}"><div class="top"><div><h3 style="font-size:16px">${esc(c.name)}</h3><div class="who">${esc(c.contact)}</div></div>${chip(c.status)}</div><div>${esc(c.obra)}</div><div class="meta"><span>${esc(c.city)}</span>${c.value ? `<span class="num">${brl0(c.value)}</span>` : ""}</div>${o && o.pct ? `<div class="bar" style="margin:0"><i style="width:${o.pct}%"></i></div>` : ""}</button>` }).join("")
      : clients.length ? `<p class="s">Nenhum cliente encontrado.</p>` : empty("Nenhum cliente cadastrado ainda.", `<button class="btn primary" id="cNew2">+ Cadastrar o primeiro cliente</button>`);
    $$("#cList .client").forEach(b => b.onclick = () => clientDetail(+b.dataset.id));
    const n2 = $("#cNew2"); if (n2) n2.onclick = () => clientForm();
  };
  $("#cSearch").oninput = draw;
  $$("#cTabs button").forEach(b => b.onclick = () => { cliFilter = b.dataset.f; $$("#cTabs button").forEach(x => x.classList.toggle("active", x === b)); draw() });
  $("#cNew").onclick = () => clientForm();
  draw();
};
function clientForm(c) {
  const v = c || { name: "", contact: "", phone: "", city: "", obra: "", status: "Aguardando aprovação", value: "" };
  modal(`<div class="sheet-head"><h2>${c ? "Editar cliente" : "Novo cliente"}</h2><button class="x" data-close aria-label="Fechar">×</button></div>
  <div class="form-grid"><div class="field"><label for="nc1">Nome / empreendimento</label><input class="input" id="nc1" value="${esc(v.name)}" placeholder="Ex.: Residência Oliveira"></div><div class="field"><label for="nc2">Contato</label><input class="input" id="nc2" value="${esc(v.contact)}" placeholder="Nome de quem decide"></div>
  <div class="field"><label for="nc3">Telefone / WhatsApp</label><input class="input" id="nc3" inputmode="tel" value="${esc(v.phone)}" placeholder="(11) 99999-9999"></div><div class="field"><label for="nc4">Bairro / cidade</label><input class="input" id="nc4" value="${esc(v.city)}"></div>
  <div class="field"><label for="nc6">Situação</label><select class="input" id="nc6">${CLI_STATUS.map(s => `<option ${s === v.status ? "selected" : ""}>${s}</option>`).join("")}</select></div><div class="field"><label for="nc7">Valor do contrato (R$)</label><input class="input num" id="nc7" type="number" min="0" step="0.01" value="${v.value || ""}"></div></div>
  <div class="field"><label for="nc5">Serviço</label><input class="input" id="nc5" value="${esc(v.obra)}" placeholder="Ex.: Aquecimento solar + reservatório"></div>
  <p class="s form-err" id="ncErr" hidden></p>
  <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="ncSave">Salvar cliente</button></div>`);
  $("#ncSave").onclick = () => {
    const d = { name: $("#nc1").value.trim(), contact: $("#nc2").value.trim(), phone: $("#nc3").value.trim(), city: $("#nc4").value.trim(), obra: $("#nc5").value.trim(), status: $("#nc6").value, value: +$("#nc7").value || 0 };
    if (!d.name) { $("#ncErr").textContent = "Escreva o nome do cliente."; $("#ncErr").hidden = false; return }
    closeModal();
    act(async () => {
      if (DEMO) { if (c) Object.assign(c, d); else clients.unshift({ id: nextId(clients), ...d }); return }
      const row = { nome: d.name, contato: d.contact, telefone: d.phone, cidade: d.city, servico: d.obra, status: d.status, valor: d.value };
      await live(c ? sb.from("ga_clientes").update(row).eq("id", c.id) : sb.from("ga_clientes").insert(row));
    }, "Cliente salvo");
  };
}
function clientDetail(id) {
  const c = clientById(id), qs = quotes.filter(q => q.client === id), o = clientObra(c);
  modal(`<div class="sheet-head"><div><div class="eyebrow">Cliente</div><h2>${esc(c.name)}</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
 <div class="form-grid"><div><div class="eyebrow">Contato</div>${esc(c.contact) || "—"}<br><span class="num" style="color:var(--muted)">${esc(c.phone)}</span>${c.phone ? ` · <a href="${waLink(c.phone, `Olá ${firstName(c.contact)}, tudo bem? Aqui é do Grupo Azul.`)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}</div><div><div class="eyebrow">Local</div>${esc(c.city) || "—"}</div></div>
 <div class="card" style="background:var(--surface-2)"><div class="card-head" style="margin-bottom:8px"><b>${esc(o ? o.title : c.obra) || "Sem serviço definido"}</b>${chip(c.status)}</div>
  ${o ? `<div class="meta"><span>Início ${fd(o.start)}</span><span>Previsão ${fd(o.end)}</span><span class="num">Contrato ${brl0(c.value)}</span></div><div class="bar"><i style="width:${o.pct}%"></i></div><div class="meta" style="margin-top:6px"><span>${o.pct}% concluído</span></div>` : `<div class="meta"><span>Nenhuma obra cadastrada</span>${c.value ? `<span class="num">Contrato ${brl0(c.value)}</span>` : ""}</div>`}</div>
 <div><div class="eyebrow" style="margin-bottom:6px">Orçamentos</div><div class="list">${qs.length ? qs.map(q => `<div class="row"><div class="grow"><div class="t">${esc(q.n)} · ${esc(q.title)}</div><div class="s">${fd(q.date)}</div></div><span class="num" style="font-weight:700">${brl0(qTotal(q))}</span>${chip(q.status)}</div>`).join("") : `<p class="s" style="margin:0">Nenhum orçamento ainda.</p>`}</div></div>
 <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" id="cdQuote">+ Orçamento</button><button class="btn primary" id="cdEdit">Editar cliente</button></div>`);
  $("#cdEdit").onclick = () => clientForm(c);
  $("#cdQuote").onclick = () => { go("orc"); quoteForm(null, c.id) };
}

/* ---------- Orçamentos ---------- */
VIEWS.orc = () => {
  const sum = s => quotes.filter(q => q.status === s).reduce((t, q) => t + qTotal(q), 0), y = HOJE.slice(0, 4);
  const ap = quotes.filter(q => q.status === "Aprovado" && q.date.startsWith(y)), rc = quotes.filter(q => q.status === "Recusado" && q.date.startsWith(y));
  const list = [...quotes].sort((a, b) => b.date.localeCompare(a.date) || b.n.localeCompare(a.n));
  $("#main").innerHTML = head("Orçamentos", "Monte o orçamento e gere o PDF com a marca do Grupo Azul", `<button class="btn primary" id="qNew">+ Novo orçamento</button>`) + `
 <div class="grid kpis" style="margin-bottom:14px">
  <div class="card kpi"><div class="eyebrow">Aguardando resposta</div><div class="v num">${brl0(sum("Enviado"))}</div><div class="d">${quotes.filter(q => q.status === "Enviado").length} orçamentos enviados</div></div>
  <div class="card kpi"><div class="eyebrow">Aprovados em ${y}</div><div class="v num">${brl0(ap.reduce((t, q) => t + qTotal(q), 0))}</div><div class="d">${ap.length + rc.length ? `Taxa de aprovação de ${Math.round(ap.length / (ap.length + rc.length) * 100)}%` : "Nenhum respondido ainda"}</div></div>
 </div>
 <div class="card">${list.length ? `<div class="table-wrap"><table><thead><tr><th>Número</th><th>Cliente</th><th>Serviço</th><th>Data</th><th class="r">Valor</th><th>Status</th><th></th></tr></thead><tbody>
 ${list.map(q => `<tr class="click" data-id="${q.id}"><td class="num"><b>${esc(q.n)}</b></td><td>${esc(clientById(q.client).name)}</td><td>${esc(q.title)}</td><td class="num">${fd(q.date)}</td><td class="r num"><b>${brl(qTotal(q))}</b></td><td>${chip(q.status)}</td><td><button class="btn sm">Ver PDF</button></td></tr>`).join("")}
 </tbody></table></div>` : empty("Nenhum orçamento ainda.", `<button class="btn primary" id="qNew2">+ Fazer o primeiro orçamento</button>`)}</div>`;
  $$("#main tr.click").forEach(r => r.onclick = () => pdfPreview(quotes.find(q => q.id == r.dataset.id)));
  $("#qNew").onclick = () => quoteForm(); const n2 = $("#qNew2"); if (n2) n2.onclick = () => quoteForm();
};
function nextQuoteNumber() {
  const y = HOJE.slice(0, 4), n = quotes.filter(q => q.n.startsWith(`ORC-${y}-`)).reduce((m, q) => Math.max(m, +q.n.split("-")[2] || 0), 0) + 1;
  return `ORC-${y}-${String(n).padStart(3, "0")}`;
}
function quoteForm(q, clientId) {
  if (!clients.length) { toast("Cadastre um cliente antes de fazer o orçamento."); go("cli"); return }
  let items = q ? q.items.map(i => [...i]) : [["", 1, 0]];
  modal(`<div class="sheet-head"><h2>${q ? `Editar ${esc(q.n)}` : "Novo orçamento"}</h2><button class="x" data-close aria-label="Fechar">×</button></div>
 <div class="form-grid"><div class="field"><label for="nqC">Cliente</label><select class="input" id="nqC">${clients.map(c => `<option value="${c.id}" ${c.id === (q ? q.client : clientId) ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div><div class="field"><label for="nqT">Serviço</label><input class="input" id="nqT" value="${esc(q ? q.title : "")}" placeholder="Ex.: Troca do sistema de aquecimento"></div></div>
 <div class="grid" style="gap:8px"><div class="item-row eyebrow"><span>Item</span><span>Qtd.</span><span>Valor un.</span><span></span></div><div class="items" id="nqItems"></div><button class="btn sm" id="nqAdd" style="justify-self:start">+ Adicionar item</button></div>
 <div class="total-line"><span class="eyebrow">Total</span><b class="num" id="nqTot"></b></div>
 <p class="s form-err" id="nqErr" hidden></p>
 <div style="display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="nqGo">Salvar e ver PDF</button></div>`, true);
  const tot = () => $("#nqTot").textContent = brl(items.reduce((s, i) => s + i[1] * i[2], 0));
  const draw = () => {
    $("#nqItems").innerHTML = items.map((it, i) => `<div class="item-row"><input class="input" id="it${i}d" value="${esc(it[0])}" placeholder="Ex.: Tubo PPR Ø25 mm" aria-label="Item"><input class="input num" id="it${i}q" type="number" min="0" step="any" value="${it[1]}" aria-label="Quantidade"><input class="input num" id="it${i}v" type="number" min="0" step="0.01" value="${it[2]}" aria-label="Valor unitário"><button class="x" data-rm="${i}" aria-label="Remover">×</button></div>`).join("");
    $$("#nqItems input").forEach(inp => inp.oninput = () => { const i = +inp.id.match(/\d+/)[0], k = inp.id.slice(-1); items[i][k === "d" ? 0 : k === "q" ? 1 : 2] = k === "d" ? inp.value : +inp.value || 0; tot() });
    $$("#nqItems [data-rm]").forEach(b => b.onclick = () => { items.splice(+b.dataset.rm, 1); if (!items.length) items.push(["", 1, 0]); draw() }); tot();
  };
  $("#nqAdd").onclick = () => { items.push(["", 1, 0]); draw(); $(`#it${items.length - 1}d`).focus() };
  $("#nqGo").onclick = async () => {
    const clean = items.filter(i => String(i[0]).trim()).map(i => [String(i[0]).trim(), +i[1] || 0, +i[2] || 0]), title = $("#nqT").value.trim(), client = +$("#nqC").value;
    const err = m => { $("#nqErr").textContent = m; $("#nqErr").hidden = false };
    if (!title) return err("Escreva o serviço do orçamento.");
    if (!clean.length) return err("Adicione pelo menos um item.");
    let saved;
    const ok = await act(async () => {
      if (q) {
        if (DEMO) Object.assign(q, { client, title, items: clean });
        else await live(sb.from("ga_orcamentos").update({ cliente_id: client, titulo: title, itens: clean }).eq("id", q.id));
        saved = q.id;
      } else {
        const n = nextQuoteNumber();
        if (DEMO) { saved = nextId(quotes); quotes.unshift({ id: saved, n, client, date: HOJE, status: "Rascunho", title, items: clean }) }
        else saved = (await live(sb.from("ga_orcamentos").insert({ numero: n, cliente_id: client, data: HOJE, status: "Rascunho", titulo: title, itens: clean }).select("id").single())).id;
      }
    }, q ? "Orçamento atualizado" : "Orçamento salvo como rascunho");
    if (ok) pdfPreview(quotes.find(x => x.id === saved));
  };
  draw();
}
function paperHtml(q) {
  const c = clientById(q.client), t = qTotal(q);
  return `<div class="paper">
  <div class="ph"><div class="lines bp-one" aria-hidden="true"></div><img src="${LOGO_DARK}" alt="${esc(EMPRESA.nome)}"><div class="doc"><b>ORÇAMENTO</b>${esc(q.n)}<br>Emitido em ${fd(q.date)}<br>Válido por ${EMPRESA.validade} dias</div></div>
  <div class="pb">
   <div class="cols"><div><div class="lbl">Cliente</div><b>${esc(c.contact || c.name)}</b><br>${c.contact ? esc(c.name) + "<br>" : ""}${esc(c.city)}${c.phone ? "<br>" + esc(c.phone) : ""}</div><div><div class="lbl">Serviço</div><b>${esc(q.title)}</b></div></div>
   <table><thead><tr><th>Descrição</th><th class="r">Qtd.</th><th class="r">Valor un.</th><th class="r">Subtotal</th></tr></thead><tbody>
    ${q.items.map(i => `<tr><td>${esc(i[0])}</td><td class="r num">${(+i[1]).toLocaleString("pt-BR")}</td><td class="r num">${brl(i[2])}</td><td class="r num">${brl(i[1] * i[2])}</td></tr>`).join("")}
   </tbody></table>
   <div class="tot num"><div class="g"><span>Total</span><span>${brl(t)}</span></div></div>
   <div class="cols"><div><div class="lbl">Condições de pagamento</div>${esc(EMPRESA.pagamento)}</div><div><div class="lbl">Garantia</div>${esc(EMPRESA.garantia)}</div></div>
   <div class="sign">${esc(EMPRESA.nome)}</div>
  </div>
  <div class="pf"><span>${esc(EMPRESA.contato)}</span><span>${esc(q.n)}</span></div>
 </div>`;
}
function pdfPreview(q) {
  if (!q) return;
  const c = clientById(q.client);
  const wa = waLink(c.phone, `Olá ${firstName(c.contact || c.name)}, tudo bem? Segue o orçamento ${q.n} do Grupo Azul: ${q.title}, total de ${brl(qTotal(q))}. Validade de ${EMPRESA.validade} dias. Qualquer dúvida estou à disposição.`);
  modal(`<div class="sheet-head"><div><div class="eyebrow">Orçamento</div><h2>${esc(q.n)}</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
 <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><label class="s" for="pqSt">Status</label><select class="input" id="pqSt" style="width:auto">${["Rascunho", "Enviado", "Aprovado", "Recusado"].map(s => `<option ${s === q.status ? "selected" : ""}>${s}</option>`).join("")}</select><span style="flex:1"></span><button class="btn sm" id="pqEdit">Editar itens</button></div>
 <div class="paper-wrap">${paperHtml(q)}</div>
 <p class="s" style="margin:0">Para mandar pelo WhatsApp: baixe o PDF, toque em "Abrir WhatsApp" e anexe o arquivo na conversa.</p>
 <div style="display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap">${c.phone ? `<a class="btn" href="${wa}" target="_blank" rel="noopener" id="pqWa">Abrir WhatsApp do cliente</a>` : `<span class="s">Cadastre o telefone do cliente para enviar pelo WhatsApp.</span>`}<button class="btn primary" id="pdfDl">Baixar PDF</button></div>`, true);
  $("#pqSt").onchange = () => { const st = $("#pqSt").value; act(async () => { if (DEMO) q.status = st; else await live(sb.from("ga_orcamentos").update({ status: st }).eq("id", q.id)) }, `Orçamento marcado como ${st.toLowerCase()}`) };
  $("#pqEdit").onclick = () => quoteForm(q);
  $("#pdfDl").onclick = () => printQuote(q);
  const w = $("#pqWa"); if (w) w.addEventListener("click", () => { if (q.status === "Rascunho") act(async () => { if (DEMO) q.status = "Enviado"; else await live(sb.from("ga_orcamentos").update({ status: "Enviado" }).eq("id", q.id)) }) });
}
function printQuote(q) {
  const root = $("#printRoot"), old = document.title;
  root.innerHTML = paperHtml(q); document.title = `Orcamento ${q.n} - ${clientById(q.client).name}`;
  document.body.classList.add("printing");
  const done = () => { document.body.classList.remove("printing"); root.innerHTML = ""; document.title = old; window.removeEventListener("afterprint", done) };
  window.addEventListener("afterprint", done);
  setTimeout(() => { window.print(); setTimeout(() => { if (document.body.classList.contains("printing")) done() }, 1500) }, 50);
  toast('Na janela que abrir, escolha "Salvar como PDF".');
}

/* ---------- Financeiro ---------- */
const CATS = { in: ["Obra", "Manutenção", "Visita técnica", "Outras entradas"], out: ["Material", "Mão de obra", "Diárias da equipe", "Veículos e combustível", "Ferramentas", "Aluguel e estrutura", "Impostos e taxas", "Outras saídas"] };
const PAYS = ["PIX", "Transferência", "Dinheiro", "Boleto", "Cartão de crédito", "Cartão de débito"];
const lateL = l => !l.paid && l.d < HOJE;
const sitL = l => l.paid ? (l.type === "in" ? "Recebido" : "Pago") : lateL(l) ? "Atrasado" : (l.type === "in" ? "A receber" : "A pagar");
let finTab = "all", finQ = "", editId = null, finType = "in", finMonth = HOJE.slice(0, 7);
VIEWS.fin = () => {
  const inMonth = l => l.d.startsWith(finMonth);
  const paidM = lanc.filter(l => l.paid && inMonth(l)), inM = paidM.filter(l => l.type === "in").reduce((s, l) => s + l.v, 0), outM = paidM.filter(l => l.type === "out").reduce((s, l) => s + l.v, 0);
  const rec = lanc.filter(l => !l.paid && l.type === "in").reduce((s, l) => s + l.v, 0), pay = lanc.filter(l => !l.paid && l.type === "out").reduce((s, l) => s + l.v, 0);
  const saldo = (DEMO ? 25000 : 0) + lanc.filter(l => l.paid).reduce((s, l) => s + (l.type === "in" ? l.v : -l.v), 0);
  const cats = CATS.out.map(c => [c, paidM.filter(l => l.type === "out" && l.cat === c).reduce((s, l) => s + l.v, 0)]).filter(c => c[1]).sort((a, b) => b[1] - a[1]), cmax = Math.max(1, ...cats.map(c => c[1]));
  const mName = mesNome(finMonth + "-01");
  $("#main").innerHTML = head("Financeiro", "Lance tudo o que entra e sai do caixa", `<div class="month-nav"><button class="btn sm" id="fmPrev" aria-label="Mês anterior">‹</button><b>${mName}</b><button class="btn sm" id="fmNext" aria-label="Próximo mês">›</button></div>`) + `
 <div class="grid kpis" style="margin-bottom:14px">
  <div class="card kpi"><div class="eyebrow">Saldo em caixa</div><div class="v num ${saldo < 0 ? "down" : ""}">${brl0(saldo)}</div><div class="d">Tudo o que já entrou menos o que já saiu</div></div>
  <div class="card kpi"><div class="eyebrow">Entrou no mês</div><div class="v num up">${brl0(inM)}</div><div class="d">${paidM.filter(l => l.type === "in").length} lançamentos</div></div>
  <div class="card kpi"><div class="eyebrow">Saiu no mês</div><div class="v num">${brl0(outM)}</div><div class="d">${paidM.filter(l => l.type === "out").length} lançamentos</div></div>
  <div class="card kpi"><div class="eyebrow">Resultado do mês</div><div class="v num ${inM - outM >= 0 ? "up" : "down"}">${brl0(inM - outM)}</div><div class="d">A receber ${brl0(rec)} · a pagar ${brl0(pay)}</div></div>
 </div>
 <div class="grid two">
  <form class="card lanc-form" id="lf" autocomplete="off"></form>
  <div class="card"><div class="card-head"><h2>Saídas por categoria</h2><span class="s">${mName}</span></div><div class="grid" style="gap:12px">${cats.map(c => `<div><div style="display:flex;justify-content:space-between;gap:8px;font-size:13px"><span>${c[0]}</span><b class="num">${brl0(c[1])}</b></div><div class="bar"><i style="width:${c[1] / cmax * 100}%"></i></div></div>`).join("") || '<p class="s" style="margin:0">Nenhuma saída paga neste mês.</p>'}</div></div>
 </div>
 <div class="toolbar" style="margin-top:18px"><div class="tabs" id="fTabs">${[["all", "Do mês"], ["in", "Entradas"], ["out", "Saídas"], ["rec", "A receber"], ["pay", "A pagar"]].map(([k, l]) => `<button type="button" data-t="${k}" class="${k === finTab ? "active" : ""}">${l}</button>`).join("")}</div><input class="input" id="fSearch" placeholder="Buscar descrição, cliente ou fornecedor" value="${esc(finQ)}"><button class="btn sm" id="fCsv">Baixar planilha</button></div>
 <div class="card"><div class="table-wrap" id="fTable"></div></div>`;
  $("#fmPrev").onclick = () => { finMonth = addMonths(finMonth + "-01", -1).slice(0, 7); VIEWS.fin() };
  $("#fmNext").onclick = () => { finMonth = addMonths(finMonth + "-01", 1).slice(0, 7); VIEWS.fin() };
  drawLancForm(); drawLancTable();
  $$("#fTabs button").forEach(b => b.onclick = () => { finTab = b.dataset.t; $$("#fTabs button").forEach(x => x.classList.toggle("active", x === b)); drawLancTable() });
  $("#fSearch").oninput = () => { finQ = $("#fSearch").value; drawLancTable() };
  $("#fCsv").onclick = () => exportCsv(lancList());
};
function drawLancForm() {
  const e = editId ? lanc.find(l => l.id === editId) : null; if (e && !e._t) finType = e.type;
  const t = finType, v = e || { d: HOJE, desc: "", cat: CATS[t][0], who: "", obra: null, pay: "PIX", v: "", paid: true };
  $("#lf").innerHTML = `<div class="card-head"><h2>${e ? "Editar lançamento" : "Novo lançamento"}</h2>${e ? '<button type="button" class="btn sm ghost" id="lfCancel">Cancelar edição</button>' : ""}</div>
 <div class="type-pick" id="lfType"><button type="button" data-k="in" class="${t === "in" ? "on in" : ""}">↓ Entrada</button><button type="button" data-k="out" class="${t === "out" ? "on out" : ""}">↑ Saída</button></div>
 <div class="field"><label for="lfV">Valor</label><div class="money"><span>R$</span><input class="input num" id="lfV" inputmode="decimal" placeholder="0,00" value="${v.v ? (+v.v).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}"></div></div>
 <div class="form-grid">
  <div class="field"><label for="lfDesc">Descrição</label><input class="input" id="lfDesc" placeholder="${t === "in" ? "Ex.: Parcela 1 · Residência Oliveira" : "Ex.: Tubos e conexões PPR"}" value="${esc(v.desc)}"></div>
  <div class="field"><label for="lfCat">Categoria</label><select class="input" id="lfCat">${CATS[t].map(c => `<option ${c === v.cat ? "selected" : ""}>${c}</option>`).join("")}</select></div>
  <div class="field"><label for="lfWho">${t === "in" ? "Cliente" : "Fornecedor / pessoa"}</label><input class="input" id="lfWho" list="lfWhoList" placeholder="${t === "in" ? "Nome do cliente" : "Loja, funcionário ou empresa"}" value="${esc(v.who)}"><datalist id="lfWhoList">${[...new Set(t === "in" ? clients.map(c => c.contact || c.name) : lanc.filter(l => l.type === "out").map(l => l.who))].filter(Boolean).map(x => `<option value="${esc(x)}">`).join("")}</datalist></div>
  <div class="field"><label for="lfObra">Obra (opcional)</label><select class="input" id="lfObra"><option value="">Nenhuma</option>${obras.map(o => `<option value="${o.id}" ${o.id === v.obra ? "selected" : ""}>${esc(clientById(o.client).name)} · ${esc(o.title)}</option>`).join("")}</select></div>
  <div class="field"><label for="lfPay">Forma de pagamento</label><select class="input" id="lfPay">${PAYS.map(p => `<option ${p === v.pay ? "selected" : ""}>${p}</option>`).join("")}</select></div>
  <div class="field"><label for="lfSit">Situação</label><select class="input" id="lfSit"><option value="1" ${v.paid ? "selected" : ""}>${t === "in" ? "Já recebido" : "Já pago"}</option><option value="0" ${v.paid ? "" : "selected"}>${t === "in" ? "A receber" : "A pagar"}</option></select></div>
  <div class="field"><label for="lfD" id="lfDLabel">${v.paid ? "Data" : "Vencimento"}</label><input class="input" type="date" id="lfD" value="${v.d}"></div>
  ${e ? "" : `<div class="field"><label for="lfParc">Parcelas</label><select class="input" id="lfParc">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i ? `${i + 1}x (mensal)` : "À vista / única"}</option>`).join("")}</select></div>`}
 </div>
 <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center">
  <label class="btn sm file-btn" for="lfFile">📎 <span id="lfFileName">${e && e.file ? "Trocar comprovante" : "Anexar comprovante"}</span><input type="file" id="lfFile" accept="image/*,application/pdf" hidden></label>
  <button type="submit" class="btn primary">${e ? "Salvar alteração" : t === "in" ? "Lançar entrada" : "Lançar saída"}</button>
 </div>
 <p class="s form-err" id="lfErr" hidden></p>`;
  $$("#lfType button").forEach(b => b.onclick = () => { finType = b.dataset.k; if (e) e._t = 1; drawLancForm() });
  $("#lfSit").onchange = () => $("#lfDLabel").textContent = $("#lfSit").value === "1" ? "Data" : "Vencimento";
  $("#lfFile").onchange = () => { const f = $("#lfFile").files[0]; $("#lfFileName").textContent = f ? f.name : "Anexar comprovante" };
  if (e) $("#lfCancel").onclick = () => { delete e._t; editId = null; finType = "in"; drawLancForm() };
  $("#lf").onsubmit = ev => {
    ev.preventDefault();
    const val = parseFloat(($("#lfV").value || "").replace(/\s|R\$/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
    const err = m => { $("#lfErr").textContent = m; $("#lfErr").hidden = false };
    if (!(val > 0)) return err("Informe o valor. Exemplo: 1.250,00");
    if (!$("#lfDesc").value.trim()) return err("Escreva uma descrição para achar o lançamento depois.");
    if (!$("#lfD").value) return err("Informe a data.");
    const file = $("#lfFile").files[0];
    const base = { type: finType, desc: $("#lfDesc").value.trim(), cat: $("#lfCat").value, who: $("#lfWho").value.trim(), obra: +$("#lfObra").value || null, pay: $("#lfPay").value, paid: $("#lfSit").value === "1" };
    const row = l => ({ tipo: l.type, data: l.d, descricao: l.desc, categoria: l.cat, quem: l.who, obra_id: l.obra, forma: l.pay, valor: l.v, pago: l.paid, comprovante: l.file || null });
    const n = e ? 1 : +$("#lfParc").value, d0 = $("#lfD").value;
    act(async () => {
      const up = file ? (await uploadFiles([file], "comprovantes"))[0] : null;
      if (e) {
        const upd = { ...base, v: val, d: d0, file: up || e.file };
        if (DEMO) { Object.assign(e, upd); delete e._t } else await live(sb.from("ga_lancamentos").update(row(upd)).eq("id", e.id));
      } else {
        const each = Math.round(val / n * 100) / 100, list = Array.from({ length: n }, (_, i) => ({ ...base, desc: n > 1 ? `${base.desc} (${i + 1}/${n})` : base.desc, paid: i === 0 ? base.paid : false, v: i === n - 1 ? Math.round((val - each * (n - 1)) * 100) / 100 : each, d: addMonths(d0, i), file: i === 0 ? up : null }));
        if (DEMO) { let id = nextId(lanc); list.forEach(l => lanc.push({ id: id++, ...l })) } else await live(sb.from("ga_lancamentos").insert(list.map(row)));
      }
      editId = null; finType = base.type;
    }, e ? "Lançamento atualizado" : n > 1 ? `${n} parcelas lançadas` : base.type === "in" ? "Entrada lançada" : "Saída lançada");
  };
}
function lancList() {
  const q = finQ.toLowerCase(), pendTab = finTab === "rec" || finTab === "pay";
  return lanc.filter(l => pendTab ? !l.paid && l.type === (finTab === "rec" ? "in" : "out") : l.d.startsWith(finMonth) && (finTab === "all" || l.type === finTab))
    .filter(l => (l.desc + l.who + l.cat).toLowerCase().includes(q)).sort((a, b) => pendTab ? a.d.localeCompare(b.d) : b.d.localeCompare(a.d));
}
let confirmDel = null;
function drawLancTable() {
  const list = lancList(), pendTab = finTab === "rec" || finTab === "pay", tot = list.reduce((s, l) => s + (l.type === "in" ? l.v : -l.v), 0);
  const oname = id => { const o = obras.find(x => x.id === id); return o ? esc(clientById(o.client).name) : '<span class="s">—</span>' };
  $("#fTable").innerHTML = list.length ? `<table><thead><tr><th>${pendTab ? "Vencimento" : "Data"}</th><th>Descrição</th><th>Categoria</th><th>Obra</th><th class="r">Valor</th><th>Situação</th><th></th></tr></thead><tbody>
 ${list.map(l => `<tr><td class="num">${fd(l.d)}</td><td><b>${esc(l.desc)}</b>${l.file ? ` <button class="link" data-file="${l.id}" title="Ver comprovante">📎</button>` : ""}<div class="s">${esc(l.who || "—")} · ${esc(l.pay)}</div></td><td>${esc(l.cat)}</td><td>${oname(l.obra)}</td><td class="r num ${l.type === "in" ? "up" : ""}"><b>${l.type === "in" ? "+ " : "− "}${brl(l.v)}</b></td><td>${chip(sitL(l))}</td>
  <td><div style="display:flex;gap:6px;justify-content:flex-end">${l.paid ? "" : `<button class="btn sm" data-ok="${l.id}">${l.type === "in" ? "Recebi ✓" : "Paguei ✓"}</button>`}<button class="btn sm ghost" data-ed="${l.id}">Editar</button><button class="btn sm ghost" data-del="${l.id}">Excluir</button></div></td></tr>`).join("")}
 </tbody><tfoot><tr><td colspan="4" class="s">${list.length} lançamentos</td><td class="r num"><b class="${tot >= 0 ? "up" : "down"}">${tot >= 0 ? "+ " : "− "}${brl(Math.abs(tot))}</b></td><td colspan="2"></td></tr></tfoot></table>`
    : `<p class="s" style="margin:0">${pendTab ? "Nada pendente aqui." : "Nenhum lançamento neste mês."}</p>`;
  const L = id => lanc.find(l => l.id == id);
  $$("#fTable [data-ok]").forEach(b => b.onclick = () => { const l = L(b.dataset.ok); act(async () => { if (DEMO) { l.paid = true; l.d = HOJE } else await live(sb.from("ga_lancamentos").update({ pago: true, data: HOJE }).eq("id", l.id)) }, l.type === "in" ? "Recebimento confirmado" : "Pagamento confirmado") });
  $$("#fTable [data-ed]").forEach(b => b.onclick = () => { editId = L(b.dataset.ed).id; drawLancForm(); $("#lf").scrollIntoView({ behavior: "smooth", block: "start" }) });
  $$("#fTable [data-file]").forEach(b => b.onclick = () => openFile(L(b.dataset.file).file));
  $$("#fTable [data-del]").forEach(b => twoStep(b, "Confirmar exclusão", () => { const id = L(b.dataset.del).id; act(async () => { if (DEMO) lanc = lanc.filter(l => l.id !== id); else await live(sb.from("ga_lancamentos").delete().eq("id", id)) }, "Lançamento excluído") }));
}
function exportCsv(list) {
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["Data", "Tipo", "Descrição", "Categoria", "Cliente/Fornecedor", "Obra", "Forma", "Valor", "Situação"],
  ...list.map(l => { const o = obras.find(x => x.id === l.obra); return [fd(l.d), l.type === "in" ? "Entrada" : "Saída", l.desc, l.cat, l.who, o ? clientById(o.client).name : "", l.pay, (l.type === "in" ? l.v : -l.v).toLocaleString("pt-BR", { minimumFractionDigits: 2 }), sitL(l)] })];
  const blob = new Blob(["﻿" + rows.map(r => r.map(q).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `financeiro-${finMonth}.csv`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------- Relatórios ---------- */
let relN = 6;
VIEWS.rel = () => {
  const months = lastMonths(relN), first = months[0] + "-01";
  const sumM = (k, t) => lanc.filter(l => l.paid && l.type === t && l.d.startsWith(k)).reduce((s, l) => s + l.v, 0);
  const IN = months.map(k => sumM(k, "in")), OUT = months.map(k => sumM(k, "out")), profit = IN.map((v, i) => v - OUT[i]);
  const outs = lanc.filter(l => l.paid && l.type === "out" && l.d >= first);
  const cats = CATS.out.map(c => [c, outs.filter(l => l.cat === c).reduce((s, l) => s + l.v, 0)]).filter(c => c[1]).sort((a, b) => b[1] - a[1]), cmax = Math.max(1, ...cats.map(c => c[1]));
  const withVal = clients.filter(c => c.value > 0), ticket = withVal.length ? withVal.reduce((s, c) => s + c.value, 0) / withVal.length : 0;
  const entregues = obras.filter(o => o.pct >= 100 && o.end >= first).length;
  const margem = c => { const ids = obras.filter(o => o.client === c.id).map(o => o.id), ls = lanc.filter(l => l.paid && ids.includes(l.obra)), i = ls.filter(l => l.type === "in").reduce((s, l) => s + l.v, 0), o = ls.filter(l => l.type === "out").reduce((s, l) => s + l.v, 0); return i ? `${Math.round((i - o) / i * 100)}%` : "—" };
  const recebido = c => { const ids = obras.filter(o => o.client === c.id).map(o => o.id); return lanc.filter(l => l.paid && l.type === "in" && ids.includes(l.obra)).reduce((s, l) => s + l.v, 0) };
  const top = [...withVal].sort((a, b) => b.value - a.value).slice(0, 8);
  const label = k => MES3[+k.slice(5) - 1] + (relN > 6 ? "/" + k.slice(2, 4) : "");
  $("#main").innerHTML = head("Relatórios", `${relN === 6 ? "Últimos 6 meses" : "Últimos 12 meses"} · ${mesNome(months[0] + "-01").toLowerCase()} a ${mesNome(months[months.length - 1] + "-01").toLowerCase()}`, `<div class="tabs" id="rTabs"><button data-n="6" class="${relN === 6 ? "active" : ""}">6 meses</button><button data-n="12" class="${relN === 12 ? "active" : ""}">12 meses</button></div>`) + `
 <div class="grid kpis" style="margin-bottom:14px">
  <div class="card kpi"><div class="eyebrow">Faturamento no período</div><div class="v num">${brl0(IN.reduce((a, b) => a + b, 0))}</div></div>
  <div class="card kpi"><div class="eyebrow">Lucro no período</div><div class="v num">${brl0(profit.reduce((a, b) => a + b, 0))}</div></div>
  <div class="card kpi"><div class="eyebrow">Ticket médio por cliente</div><div class="v num">${brl0(ticket)}</div></div>
  <div class="card kpi"><div class="eyebrow">Obras entregues</div><div class="v num">${entregues}</div></div>
 </div>
 <div class="grid two">
  <div class="card"><div class="card-head"><h2>Lucro por mês</h2></div>${lineChart(profit, months.map(label))}</div>
  <div class="card"><div class="card-head"><h2>Despesas do período</h2></div><div class="grid" style="gap:12px">${cats.map(c => `<div><div style="display:flex;justify-content:space-between;gap:8px;font-size:13px"><span>${c[0]}</span><b class="num">${brl0(c[1])}</b></div><div class="bar"><i style="width:${c[1] / cmax * 100}%"></i></div></div>`).join("") || '<p class="s" style="margin:0">Nenhuma despesa no período.</p>'}</div></div>
 </div>
 <div class="card" style="margin-top:14px"><div class="card-head"><h2>Maiores contratos</h2><span class="s">Margem = entradas menos saídas lançadas na obra</span></div>${top.length ? `<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Serviço</th><th>Status</th><th class="r">Contrato</th><th class="r">Recebido</th><th class="r">Margem</th></tr></thead><tbody>
  ${top.map(c => `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.obra)}</td><td>${chip(c.status)}</td><td class="r num">${brl0(c.value)}</td><td class="r num">${brl0(recebido(c))}</td><td class="r num">${margem(c)}</td></tr>`).join("")}
 </tbody></table></div>` : '<p class="s" style="margin:0">Cadastre o valor do contrato nos clientes para ver este ranking.</p>'}</div>
 <div class="grid client-grid" style="margin-top:14px">
  <div class="card soon-card"><span class="soon" style="margin:0;justify-self:start">Em breve</span><h3>Estoque</h3><p>Controle de tubos, conexões e equipamentos no depósito, com baixa automática quando o material sai para a obra.</p></div>
  <div class="card soon-card"><span class="soon" style="margin:0;justify-self:start">Em breve</span><h3>Ordens de serviço</h3><p>OS para a equipe de campo, com checklist, fotos antes e depois e assinatura do cliente no celular.</p></div>
 </div>`;
  $$("#rTabs button").forEach(b => b.onclick = () => { relN = +b.dataset.n; VIEWS.rel() });
};

/* ---------- Obras: funcionário ---------- */
function viewObrasTec() {
  const mine = myObras(), act = mine.filter(o => TODAY >= D(o.start) && o.pct < 100), next = mine.filter(o => TODAY < D(o.start)), pend = act.filter(o => !todayDone(o)).length;
  $("#main").innerHTML = banner() + `<div class="hero"><div class="lines bp-one" aria-hidden="true"></div><div><div class="eyebrow">${hojeLongo()}</div><h1>Olá, ${esc(firstName(me.name))}</h1><p>${act.length ? `Você está em ${act.length} ${act.length === 1 ? "obra" : "obras"}. ${pend ? `Falta enviar ${pend} feedback${pend > 1 ? "s" : ""} de hoje.` : "Todos os feedbacks de hoje foram enviados."}` : "Você não está em nenhuma obra em andamento agora."}</p></div></div>
 <div class="grid" style="gap:16px">${act.map(obraCardTec).join("")}</div>
 ${next.length ? `<h2 style="font-size:18px;margin:26px 0 12px">Próximas obras</h2><div class="grid client-grid">${next.map(o => `<div class="card"><div class="card-head" style="margin-bottom:6px"><b>${esc(clientById(o.client).name)}</b>${stChip(o)}</div><div>${esc(o.title)}</div><div class="meta" style="margin-top:6px"><span>Início ${fd(o.start)}</span><span>${o.resp === me.id ? "Você é o responsável" : "Responsável: " + esc(emp(o.resp).name)}</span></div></div>`).join("")}</div>` : ""}
 ${!act.length && !next.length ? empty("Quando o escritório colocar você numa obra, ela aparece aqui.") : ""}`;
  $$("#main [data-fb]").forEach(b => b.onclick = () => feedbackForm(obras.find(o => o.id == b.dataset.fb)));
  $$("#main [data-miss]").forEach(b => b.onclick = () => missingForm(obras.find(o => o.id == b.dataset.miss)));
  $$("#main [data-task]").forEach(cb => cb.onchange = () => {
    const [oid, i] = cb.dataset.task.split(":"), o = obras.find(x => x.id == oid);
    o.tasks[i][1] = cb.checked;
    if (!DEMO) live(sb.rpc("ga_atualizar_etapas", { p_obra: o.id, p_etapas: o.tasks.map(t => ({ t: t[0], ok: t[1] })) })).catch(e => { cb.checked = !cb.checked; o.tasks[i][1] = cb.checked; toast("Não foi possível salvar. " + friendly(e)) });
  });
}
function obraCardTec(o) {
  const c = clientById(o.client), miss = o.missing.filter(m => m.st === "Aberto"), last = o.log[0];
  return `<article class="card obra">
  <div class="card-head" style="align-items:flex-start;margin-bottom:10px"><div style="min-width:0"><div class="eyebrow">${o.resp === me.id ? "Você é o responsável" : "Responsável: " + esc(emp(o.resp).name)}</div><h2 style="font-size:20px;margin-top:4px">${esc(c.name)}</h2><div style="color:var(--muted)">${esc(o.title)}</div></div>${stChip(o)}</div>
  <div class="meta" style="margin-bottom:12px">${o.addr ? `<span>📍 <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.addr)}" target="_blank" rel="noopener">${esc(o.addr)}</a></span>` : ""}<span>${prazo(o)}</span></div>
  ${alertaObra(o)}
  ${progLine(o)}
  ${mapaObra(o)}
  ${o.notes ? `<div class="note"><b>Recado do escritório:</b> ${esc(o.notes)}</div>` : ""}
  <div class="obra-cols">
   <div><div class="eyebrow" style="margin-bottom:6px">O que fazer</div>${o.tasks.length ? o.tasks.map((t, i) => `<label class="task"><input type="checkbox" id="t${o.id}_${i}" data-task="${o.id}:${i}" ${t[1] ? "checked" : ""}><span>${esc(t[0])}</span></label>`).join("") : '<p class="s" style="margin:0">O escritório ainda não listou as etapas.</p>'}</div>
   <div><div class="eyebrow" style="margin-bottom:6px">Faltando para terminar</div>${miss.length ? miss.map(m => `<div class="miss"><b>${esc(m.item)}</b>${m.qty ? " · " + esc(m.qty) : ""} ${m.urgent ? '<span class="chip c-bad">Parou a obra</span>' : '<span class="chip c-warn">Aguardando</span>'}<div class="s">Pedido em ${fd(m.d)} por ${esc(emp(m.by).name)}</div></div>`).join("") : `<p class="s" style="margin:0">Nada faltando no momento.</p>`}
    ${last ? `<div class="eyebrow" style="margin:14px 0 6px">Último feedback</div><div class="s"><b style="color:var(--fg)">${fd(last.d)}</b> · ${esc(emp(last.who).name)}: ${esc(last.text)}</div><div class="thumbs">${thumbs(last.fotos)}</div>` : ""}</div>
  </div>
  <div class="obra-actions">${todayDone(o) ? `<span class="chip c-good">Feedback de hoje enviado</span><button class="btn sm" data-fb="${o.id}">Atualizar feedback</button>` : `<button class="btn primary" data-fb="${o.id}">Enviar feedback do dia</button>`}<button class="btn" data-miss="${o.id}">Falta peça ou material</button></div>
 </article>`;
}
function feedbackForm(o) {
  const c = clientById(o.client), e = expected(o), mineToday = o.log.find(l => l.d === HOJE && l.who === me.id);
  modal(`<div class="sheet-head"><div><div class="eyebrow">Feedback do dia · ${fd(HOJE)}</div><h2>${esc(c.name)}</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
 <div class="field"><label for="fbPct">Quanto da obra está pronto?</label><div style="display:flex;align-items:center;gap:12px"><input type="range" id="fbPct" min="0" max="100" step="1" value="${o.pct}" style="flex:1"><b class="num" id="fbPctV" style="font-size:20px;width:52px;text-align:right">${o.pct}%</b></div><div class="s">Para estar no prazo hoje, o esperado é ${e}%.</div></div>
 ${o.tasks.length ? `<div class="field"><label>Etapas concluídas</label>${o.tasks.map((t, i) => `<label class="task"><input type="checkbox" id="fbt${i}" ${t[1] ? "checked" : ""}><span>${esc(t[0])}</span></label>`).join("")}</div>` : ""}
 <div class="field"><label for="fbTxt">O que foi feito hoje</label><textarea class="input" id="fbTxt" placeholder="Ex.: Instalamos os misturadores do banho master">${esc(mineToday ? mineToday.text : "")}</textarea></div>
 <div class="field"><label for="fbProb">Teve algum problema ou impedimento? (opcional)</label><textarea class="input" id="fbProb" placeholder="Ex.: cliente pediu mudança, faltou água, peça com defeito">${esc(mineToday ? mineToday.problem : "")}</textarea></div>
 <div class="field"><label class="btn file-btn" for="fbFotos" style="justify-self:start">📷 <span id="fbFotosN">Adicionar fotos</span><input type="file" id="fbFotos" accept="image/*" multiple hidden></label></div>
 <p class="s form-err" id="fbErr" hidden></p>
 <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="fbSend">Enviar feedback</button></div>`);
  $("#fbPct").oninput = () => $("#fbPctV").textContent = $("#fbPct").value + "%";
  $("#fbFotos").onchange = () => { const n = $("#fbFotos").files.length; $("#fbFotosN").textContent = n ? `${n} foto${n > 1 ? "s" : ""} escolhida${n > 1 ? "s" : ""}` : "Adicionar fotos" };
  $("#fbSend").onclick = async () => {
    const text = $("#fbTxt").value.trim();
    if (!text) { $("#fbErr").textContent = "Conte em poucas palavras o que foi feito hoje."; $("#fbErr").hidden = false; return }
    const pct = +$("#fbPct").value, tasks = o.tasks.map((t, i) => [t[0], $("#fbt" + i).checked]), problem = $("#fbProb").value.trim(), files = [...$("#fbFotos").files];
    $("#fbSend").disabled = true; $("#fbSend").textContent = files.length ? "Enviando fotos…" : "Enviando…";
    const ok = await act(async () => {
      const fotos = await uploadFiles(files, `obras/${o.id}`);
      if (DEMO) {
        o.pct = pct; o.tasks = tasks;
        const prev = o.log.find(l => l.d === HOJE && l.who === me.id), entry = { d: HOJE, who: me.id, pct, text, problem, fotos: [...(prev ? prev.fotos : []), ...fotos] };
        if (prev) Object.assign(prev, entry); else o.log.unshift(entry);
      } else await live(sb.rpc("ga_enviar_feedback", { p_obra: o.id, p_pct: pct, p_etapas: tasks.map(t => ({ t: t[0], ok: t[1] })), p_texto: text, p_problema: problem, p_fotos: fotos }));
    }, "Feedback enviado. O escritório já pode ver.");
    if (ok) closeModal(); else { $("#fbSend").disabled = false; $("#fbSend").textContent = "Enviar feedback" }
  };
}
function missingForm(o) {
  modal(`<div class="sheet-head"><div><div class="eyebrow">Falta peça ou material</div><h2>${esc(clientById(o.client).name)}</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
 <div class="form-grid"><div class="field"><label for="msItem">O que está faltando?</label><input class="input" id="msItem" placeholder="Ex.: Conexão PEX cotovelo Ø25 mm"></div><div class="field"><label for="msQty">Quantidade</label><input class="input" id="msQty" placeholder="Ex.: 10 un."></div></div>
 <div class="field"><label>Isso impede de continuar a obra?</label><div class="tabs" id="msUrg" style="justify-self:start"><button data-u="1">Sim, parou a obra</button><button data-u="0" class="active">Não, dá pra seguir</button></div></div>
 <div class="field"><label for="msObs">Observação (opcional)</label><textarea class="input" id="msObs" placeholder="Ex.: marca, medida, onde comprar"></textarea></div>
 <p class="s form-err" id="msErr" hidden></p>
 <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="msSend">Enviar para o escritório</button></div>`);
  let urg = false; $$("#msUrg button").forEach(b => b.onclick = () => { urg = b.dataset.u === "1"; $$("#msUrg button").forEach(x => x.classList.toggle("active", x === b)) });
  $("#msSend").onclick = () => {
    const item = $("#msItem").value.trim(), qty = $("#msQty").value.trim(), obs = $("#msObs").value.trim();
    if (!item) { $("#msErr").textContent = "Escreva o que está faltando."; $("#msErr").hidden = false; return }
    closeModal();
    act(async () => {
      if (DEMO) o.missing.unshift({ id: Date.now(), item, qty, urgent: urg, obs, by: me.id, d: HOJE, st: "Aberto" });
      else await live(sb.from("ga_faltas").insert({ obra_id: o.id, item, qtd: qty, urgente: urg, obs, autor: me.id }));
    }, "Pedido enviado ao escritório");
  };
}

/* ---------- Obras: dono ---------- */
function viewObrasAdmin() {
  const act = activeObras(), late = act.filter(o => obraStatus(o)[0] === "Atrasada").length, fb = act.filter(todayDone).length, miss = openMissing();
  const list = [...obras].sort((a, b) => (a.pct >= 100) - (b.pct >= 100) || a.end.localeCompare(b.end));
  $("#main").innerHTML = head("Obras", "Cadastre a obra, defina o prazo e o responsável. A equipe atualiza o andamento todo dia.", `<button class="btn primary" id="oNew">+ Nova obra</button>`) + `
 <div class="grid kpis" style="margin-bottom:14px">
  <div class="card kpi"><div class="eyebrow">Obras ativas</div><div class="v num">${act.length}</div><div class="d">${obras.filter(o => TODAY < D(o.start)).length} para começar</div></div>
  <div class="card kpi"><div class="eyebrow">Atrasadas</div><div class="v num ${late ? "down" : ""}">${late}</div><div class="d">Abaixo do esperado para hoje</div></div>
  <div class="card kpi"><div class="eyebrow">Feedbacks de hoje</div><div class="v num">${fb} de ${act.length}</div><div class="d">${act.length - fb ? `<span class="down">${act.length - fb} sem resposta</span>` : "Todos enviados"}</div></div>
  <div class="card kpi"><div class="eyebrow">Faltas de material</div><div class="v num ${miss.length ? "down" : ""}">${miss.length}</div><div class="d">${miss.filter(m => m.urgent).length} parando obra</div></div>
 </div>
 ${miss.length ? `<div class="card" style="margin-bottom:14px"><div class="card-head"><h2>Pedidos da equipe</h2></div><div class="list">${miss.map(m => `<div class="row"><div class="grow"><div class="t">${esc(m.item)}${m.qty ? " · " + esc(m.qty) : ""}</div><div class="s">${esc(clientById(m.o.client).name)} · pedido por ${esc(emp(m.by).name)} em ${fd(m.d)}${m.obs ? " · " + esc(m.obs) : ""}</div></div>${m.urgent ? '<span class="chip c-bad">Parou a obra</span>' : '<span class="chip c-warn">Aguardando</span>'}<button class="btn sm" data-buy="${m.id}">Marcar comprado</button></div>`).join("")}</div></div>` : ""}
 <div class="grid" style="gap:12px">${list.length ? list.map(o => {
    const c = clientById(o.client), r = emp(o.resp), nm = o.missing.filter(m => m.st === "Aberto").length; return `<button class="card obra-row" data-o="${o.id}">
  <div class="card-head" style="margin-bottom:10px;align-items:flex-start"><div style="min-width:0;text-align:left"><h2 style="font-size:17px">${esc(c.name)}</h2><div class="s">${esc(o.title)}</div></div><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${stChip(o)}${TODAY >= D(o.start) && o.pct < 100 ? (todayDone(o) ? '<span class="chip c-good">Feedback hoje</span>' : '<span class="chip c-warn">Sem feedback hoje</span>') : ""}</div></div>
  ${progLine(o)}
  <div class="meta" style="margin-top:10px"><span class="who-chip"><span class="avatar sm">${esc(r.ini)}</span>${esc(r.name)}</span><span>${prazo(o)}</span>${nm ? `<span class="down">${nm} ${nm > 1 ? "itens faltando" : "item faltando"}</span>` : ""}</div>
 </button>` }).join("") : empty("Nenhuma obra cadastrada ainda.", `<button class="btn primary" id="oNew2">+ Cadastrar a primeira obra</button>`)}</div>`;
  $$("#main [data-o]").forEach(b => b.onclick = () => obraDetail(obras.find(o => o.id == b.dataset.o)));
  $$("#main [data-buy]").forEach(b => b.onclick = () => { const id = +b.dataset.buy || b.dataset.buy; act(async () => { if (DEMO) openMissing().find(m => m.id == id).o.missing.find(m => m.id == id).st = "Comprado"; else await live(sb.from("ga_faltas").update({ status: "Comprado" }).eq("id", id)) }, "Marcado como comprado") });
  $("#oNew").onclick = () => obraForm(); const n2 = $("#oNew2"); if (n2) n2.onclick = () => obraForm();
}
function obraDetail(o) {
  const c = clientById(o.client);
  modal(`<div class="sheet-head"><div><div class="eyebrow">Obra</div><h2>${esc(c.name)}</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
 <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div>${esc(o.title)}<div class="s">${esc(o.addr)}</div></div>${stChip(o)}</div>
 ${progLine(o)}
 <div class="s">Responsável: <b style="color:var(--fg)">${esc(emp(o.resp).name)}</b> · Equipe: ${o.team.map(id => esc(emp(id).name)).join(", ") || "—"} · ${fd(o.start)} a ${fd(o.end)}</div>
 ${mapaObra(o)}
 ${o.notes ? `<div class="note" style="margin:0"><b>Recado:</b> ${esc(o.notes)}</div>` : ""}
 <div><div class="eyebrow" style="margin-bottom:6px">Etapas</div>${o.tasks.map(t => `<div class="task"><span class="tick ${t[1] ? "on" : ""}">${t[1] ? "✓" : ""}</span><span>${esc(t[0])}</span></div>`).join("") || '<p class="s" style="margin:0">Sem etapas.</p>'}</div>
 <div><div class="eyebrow" style="margin-bottom:8px">Feedbacks da equipe</div>${o.log.length ? o.log.slice(0, 30).map(l => `<div class="log"><div><b>${fd(l.d)}</b> · ${esc(emp(l.who).name)} · <span class="num">${l.pct}%</span></div><div>${esc(l.text)}</div>${l.problem ? `<div class="down" style="font-size:13px">⚠ ${esc(l.problem)}</div>` : ""}${l.fotos && l.fotos.length ? `<div class="thumbs">${thumbs(l.fotos)}</div>` : ""}</div>`).join("") : `<p class="s" style="margin:0">Nenhum feedback ainda.</p>`}</div>
 <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><button class="btn ghost" id="odDel">Excluir obra</button><span style="display:flex;gap:8px"><button class="btn" data-close>Fechar</button><button class="btn primary" id="odEdit">Editar obra</button></span></div>`, true);
  $("#odEdit").onclick = () => obraForm(o);
  twoStep($("#odDel"), "Confirmar: excluir obra e feedbacks", () => { closeModal(); act(async () => { if (DEMO) obras = obras.filter(x => x !== o); else await live(sb.from("ga_obras").delete().eq("id", o.id)) }, "Obra excluída") });
}
function obraForm(o) {
  if (!clients.length) { toast("Cadastre o cliente antes de cadastrar a obra."); go("cli"); return }
  const field = staff.filter(e => e.active && e.access === "tec" || (o && (e.id === o.resp || o.team.includes(e.id))));
  if (!field.length) { toast("Cadastre pelo menos um funcionário de campo antes."); go("func"); return }
  const v = o || { client: clients[0].id, title: "", addr: "", start: HOJE, end: addDays(HOJE, 30), resp: field[0].id, team: [], notes: "", tasks: [], pct: 0 };
  modal(`<div class="sheet-head"><h2>${o ? "Editar obra" : "Nova obra"}</h2><button class="x" data-close aria-label="Fechar">×</button></div>
 <div class="form-grid"><div class="field"><label for="noC">Cliente</label><select class="input" id="noC">${clients.map(c => `<option value="${c.id}" ${c.id === v.client ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div><div class="field"><label for="noT">Serviço</label><input class="input" id="noT" value="${esc(v.title)}" placeholder="Ex.: Pressurização + aquecimento"></div></div>
 <div class="field"><label for="noA">Endereço</label><input class="input" id="noA" value="${esc(v.addr)}" placeholder="Rua, número · bairro, cidade"></div>
 <div class="form-grid"><div class="field"><label for="noS">Início</label><input class="input" type="date" id="noS" value="${v.start}"></div><div class="field"><label for="noE">Prazo para terminar</label><input class="input" type="date" id="noE" value="${v.end}"></div><div class="field"><label for="noR">Responsável</label><select class="input" id="noR">${field.map(e => `<option value="${e.id}" ${e.id === v.resp ? "selected" : ""}>${esc(e.name)} · ${esc(e.role)}</option>`).join("")}</select></div>${o ? `<div class="field"><label for="noP">Andamento (%)</label><input class="input num" type="number" min="0" max="100" id="noP" value="${v.pct}"></div>` : ""}</div>
 <div class="field"><label>Equipe</label><div style="display:flex;flex-wrap:wrap;gap:4px 16px">${field.map(e => `<label class="task"><input type="checkbox" id="noTm_${e.id}" ${v.team.includes(e.id) ? "checked" : ""}><span>${esc(e.name)}</span></label>`).join("")}</div></div>
 <div class="field"><label for="noTasks">O que a equipe precisa fazer (uma etapa por linha)</label><textarea class="input" id="noTasks" style="min-height:110px" placeholder="Ex.: Passar tubulação da casa de máquinas&#10;Instalar aquecedores&#10;Teste de estanqueidade">${esc(v.tasks.map(t => t[0]).join("\n"))}</textarea></div>
 <div class="field"><label for="noN">Recado para a equipe (opcional)</label><input class="input" id="noN" value="${esc(v.notes)}" placeholder="Ex.: chave com o porteiro, horário permitido"></div>
 <p class="s form-err" id="noErr" hidden></p>
 <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="noSave">${o ? "Salvar obra" : "Cadastrar obra"}</button></div>`, true);
  $("#noSave").onclick = () => {
    const err = m => { $("#noErr").textContent = m; $("#noErr").hidden = false };
    const r = $("#noR").value, start = $("#noS").value, end = $("#noE").value, title = $("#noT").value.trim();
    if (!title) return err("Escreva o serviço da obra.");
    if (!start || !end) return err("Informe o início e o prazo.");
    if (end < start) return err("O prazo precisa ser depois do início.");
    const done = new Map(v.tasks.map(t => [t[0], t[1]]));
    const d = { client: +$("#noC").value, title, addr: $("#noA").value.trim(), start, end, resp: r, team: field.filter(e => e.id !== r && $("#noTm_" + e.id)?.checked).map(e => e.id), notes: $("#noN").value.trim(), tasks: $("#noTasks").value.split("\n").map(s => s.trim()).filter(Boolean).map(s => [s, !!done.get(s)]), pct: o ? Math.max(0, Math.min(100, +$("#noP").value || 0)) : 0 };
    closeModal();
    act(async () => {
      if (DEMO) { if (o) Object.assign(o, d); else obras.push({ id: nextId(obras), ...d, log: [], missing: [] }); return }
      const row = { cliente_id: d.client, titulo: d.title, endereco: d.addr, inicio: d.start, fim: d.end, responsavel: d.resp, equipe: d.team, recado: d.notes, etapas: d.tasks.map(t => ({ t: t[0], ok: t[1] })), pct: d.pct };
      await live(o ? sb.from("ga_obras").update(row).eq("id", o.id) : sb.from("ga_obras").insert(row));
    }, o ? "Obra atualizada" : `Obra cadastrada para ${emp(r).name}`);
  };
}
VIEWS.obr = () => me.role === "tec" ? viewObrasTec() : viewObrasAdmin();
/* ---------- Lembretes (só administradores) ---------- */
const URG = { urgente: ["Urgente", "c-bad"], normal: ["Normal", "c-info"], lembrar: ["Só lembrar", "c-mute"] };
const URG_ORD = { urgente: 0, normal: 1, lembrar: 2 };
const lemPend = () => lembretes.filter(l => !l.done).sort((a, b) => URG_ORD[a.urg] - URG_ORD[b.urg] || (a.due || "9999").localeCompare(b.due || "9999") || String(a.at).localeCompare(String(b.at)));
const dueTxt = l => !l.due ? "" : l.due < HOJE ? `<span class="down">Atrasado · era para ${fd(l.due)}</span>` : l.due === HOJE ? `<b>Para hoje</b>` : l.due === addDays(HOJE, 1) ? "Para amanhã" : `Até ${fd(l.due)}`;
let lemUrg = "normal";
function addLembrete(d, okMsg = "Lembrete salvo") {
  return act(async () => {
    if (DEMO) { lembretes.push({ id: nextId(lembretes), ...d, done: false, at: new Date().toISOString() }); return }
    await live(sb.from("ga_lembretes").insert({ titulo: d.title, obs: d.obs || null, urgencia: d.urg, data: d.due || null }));
  }, okMsg);
}
const faltaJaLembrada = m => lembretes.some(l => l.falta === m.id || l.title.includes(m.item));
function lemFromFalta(m) {
  const o = m.o || obras.find(x => x.missing.includes(m));
  return { title: `Comprar ${m.item}${m.qty ? ` (${m.qty})` : ""}`, obs: `${clientById(o.client).name} · pedido de ${emp(m.by).name} em ${fd(m.d)}${m.urgent ? " · está parando a obra" : ""}`, urg: m.urgent ? "urgente" : "normal", due: m.urgent ? HOJE : addDays(HOJE, 2), falta: m.id };
}
VIEWS.lem = () => {
  const pend = lemPend(), feitos = lembretes.filter(l => l.done).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 15);
  const sug = openMissing().filter(m => !faltaJaLembrada(m));
  const row = l => `<div class="row lem ${l.done ? "done" : ""}"><input type="checkbox" class="lem-ck" data-ck="${l.id}" ${l.done ? "checked" : ""} aria-label="Marcar como feito"><div class="grow"><div class="t">${esc(l.title)}</div>${l.obs ? `<div class="s">${esc(l.obs)}</div>` : ""}${l.due && !l.done ? `<div class="s">${dueTxt(l)}</div>` : ""}</div><span class="chip ${URG[l.urg][1]}">${URG[l.urg][0]}</span><button class="btn sm ghost" data-rm="${l.id}" aria-label="Excluir">Excluir</button></div>`;
  $("#main").innerHTML = head("Lembretes", "Tarefas e coisas para não esquecer. Os urgentes aparecem quando você entra no app.") + `
 ${lemMissing ? `<div class="card note-warn">Para salvar lembretes, rode uma vez o arquivo <b>supabase/002_lembretes.sql</b> no SQL Editor do Supabase.</div>` : ""}
 <div class="grid two">
  <form class="card lem-form" id="lmF" autocomplete="off">
   <div class="card-head" style="margin-bottom:4px"><h2>Novo lembrete</h2></div>
   <div class="field"><label for="lmT">O que precisa lembrar ou fazer?</label><input class="input" id="lmT" placeholder="Ex.: Ligar para o Ricardo sobre o prazo"></div>
   <div class="field"><label>Urgência</label><div class="tabs" id="lmU">${Object.entries(URG).map(([k, [l]]) => `<button type="button" data-u="${k}" class="${k === lemUrg ? "active" : ""}">${l}</button>`).join("")}</div></div>
   <div class="form-grid"><div class="field"><label for="lmD">Para quando (opcional)</label><input class="input" type="date" id="lmD"></div><div class="field"><label for="lmO">Observação (opcional)</label><input class="input" id="lmO" placeholder="Detalhes, telefone, valor"></div></div>
   <p class="s form-err" id="lmErr" hidden></p>
   <div style="display:flex;justify-content:flex-end"><button class="btn primary" type="submit">Adicionar lembrete</button></div>
  </form>
  <div class="card"><div class="card-head"><h2>Sugestões das obras</h2></div><div class="list">${sug.length ? sug.map(m => `<div class="row"><div class="grow"><div class="t">Comprar ${esc(m.item)}${m.qty ? " · " + esc(m.qty) : ""}</div><div class="s">${esc(clientById(m.o.client).name)} · pedido por ${esc(emp(m.by).name)}</div></div>${m.urgent ? '<span class="chip c-bad">Parou a obra</span>' : ""}<button class="btn sm" data-sug="${m.id}">+ Lembrete</button></div>`).join("") : `<p class="s" style="margin:0">Quando alguém da equipe pedir peça ou material, aparece aqui para virar lembrete.</p>`}</div></div>
 </div>
 <div class="card" style="margin-top:14px"><div class="card-head"><h2>Para fazer</h2><span class="s">${pend.length} ${pend.length === 1 ? "lembrete" : "lembretes"}</span></div><div class="list">${pend.length ? pend.map(row).join("") : `<p class="s" style="margin:0">Nada pendente. 👏</p>`}</div></div>
 ${feitos.length ? `<div class="card" style="margin-top:14px"><div class="card-head"><h2>Feitos</h2></div><div class="list">${feitos.map(row).join("")}</div></div>` : ""}`;
  $$("#lmU button").forEach(b => b.onclick = () => { lemUrg = b.dataset.u; $$("#lmU button").forEach(x => x.classList.toggle("active", x === b)) });
  $("#lmF").onsubmit = e => {
    e.preventDefault();
    const title = $("#lmT").value.trim();
    if (!title) { $("#lmErr").textContent = "Escreva o que precisa lembrar."; $("#lmErr").hidden = false; return }
    addLembrete({ title, obs: $("#lmO").value.trim(), urg: lemUrg, due: $("#lmD").value || null }).then(ok => { if (ok) lemUrg = "normal" });
  };
  $$("#main [data-sug]").forEach(b => b.onclick = () => { const m = openMissing().find(x => x.id == b.dataset.sug); addLembrete(lemFromFalta(m), "Virou lembrete") });
  $$("#main [data-ck]").forEach(cb => cb.onchange = () => {
    const l = lembretes.find(x => x.id == cb.dataset.ck), done = cb.checked;
    act(async () => { if (DEMO) l.done = done; else await live(sb.from("ga_lembretes").update({ feito: done, feito_em: done ? new Date().toISOString() : null }).eq("id", l.id)) }, done ? "Feito ✓" : "Voltou para a lista");
  });
  $$("#main [data-rm]").forEach(b => twoStep(b, "Confirmar", () => { const id = lembretes.find(x => x.id == b.dataset.rm).id; act(async () => { if (DEMO) lembretes = lembretes.filter(l => l.id !== id); else await live(sb.from("ga_lembretes").delete().eq("id", id)) }, "Lembrete excluído") }));
};

/* =====================================================================
   AVISOS AO ENTRAR
   dono/admin: o que mudou nas obras desde a última vez, dicas e reconhecimento
   funcionário: uma vez por dia, o que fazer hoje e como está o prazo
   ===================================================================== */
const diasEntre = (a, b) => Math.round((D(b) - D(a)) / 864e5);
function dicas(o) {
  const out = [], resp = firstName(emp(o.resp).name), gap = expected(o) - o.pct, d = daysLeft(o);
  const urg = o.missing.filter(m => m.st === "Aberto" && m.urgent), last = o.log[0], sem = last ? diasEntre(last.d, HOJE) : diasEntre(o.start, HOJE);
  if (urg.length) out.push(`Compre já <b>${esc(urg[0].item)}</b>: ${esc(firstName(emp(urg[0].by).name))} avisou que isso está parando a obra.`);
  if (sem >= 2) out.push(`Sem feedback há ${sem} dias. Ligue para ${esc(resp)} e veja o que está travando.`);
  if (gap >= 15) out.push(`Está ${gap} pontos atrás do esperado. Vale reforçar a equipe com mais uma pessoa por alguns dias.`);
  else if (gap > 0) out.push(`Combine com ${esc(resp)} uma meta por dia para recuperar os ${gap}% até ${fd(addDays(HOJE, 7))}.`);
  if (d < 0) out.push(`O prazo venceu há ${-d} dias. Alinhe uma nova data com o cliente.`);
  else if (d <= 7) out.push(`Faltam ${d} dias para o prazo. Se precisar de mais tempo, avise o cliente antes.`);
  const prob = o.log.slice(0, 5).find(l => l.problem);
  if (prob) out.push(`Problema relatado em ${fd(prob.d)}: “${esc(prob.problem)}”`);
  return out.slice(0, 3);
}
function alertaObra(o) {
  if (o.pct >= 100 || TODAY < D(o.start)) return "";
  const st = obraStatus(o)[0], gap = expected(o) - o.pct;
  if (st === "Atrasada") return `<div class="alerta"><span class="sirene" aria-hidden="true">🚨</span><div><b>Obra atrasada</b><br>${daysLeft(o) < 0 ? `O prazo venceu há ${-daysLeft(o)} dias.` : `Está ${gap}% atrás do esperado para hoje.`} Hoje é dia de acelerar.</div></div>`;
  if (st === "Adiantada") return `<div class="boa"><span aria-hidden="true">🚀</span><div><b>Vocês estão adiantados!</b><br>Terminem o quanto antes para seguir para a próxima obra.</div></div>`;
  return "";
}
function welcome() {
  if (!me || $("#modalRoot").innerHTML) return;
  if (me.role === "admin") welcomeAdmin(); else if (me.role === "tec") welcomeTec();
}
function welcomeAdmin() {
  const key = "ga-visto-" + me.id, seen = (() => { try { return JSON.parse(store.get(key) || "null") } catch (e) { return null } })();
  const ontem = addDays(HOJE, -1), novo = (x, k) => !seen ? x.d >= ontem : DEMO || x.id == null ? x.d > seen.day : x.id > (seen[k] || 0);
  const logs = obras.flatMap(o => o.log.map(l => ({ ...l, o })));
  const fbNovos = logs.filter(l => novo(l, "fb")), faltas = openMissing(), faltasNovas = faltas.filter(m => novo(m, "fa"));
  const primeiraHoje = !seen || seen.day !== HOJE;
  const maxId = arr => arr.reduce((m, x) => Math.max(m, typeof x.id === "number" ? x.id : 0), 0);
  store.set(key, JSON.stringify({ day: HOJE, fb: maxId(logs), fa: maxId(obras.flatMap(o => o.missing)) }));
  if (!primeiraHoje && !fbNovos.length && !faltasNovas.length) return;
  const act = activeObras(), late = act.filter(o => obraStatus(o)[0] === "Atrasada"), adi = act.filter(o => obraStatus(o)[0] === "Adiantada");
  const porObra = [...new Map(fbNovos.sort((a, b) => b.d.localeCompare(a.d)).map(l => [l.o.id, l])).values()].reverse().sort((a, b) => b.d.localeCompare(a.d));
  const tecs = staff.filter(e => e.active && e.access === "tec"), rates = tecs.map(fbRate).filter(r => r !== null), emDia = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null;
  const lemHoje = lemPend().filter(l => l.urg === "urgente" || (l.due && l.due <= HOJE));
  modal(`<div class="sheet-head"><div><div class="eyebrow">${hojeLongo()}</div><h2>${saudacao()}, ${esc(firstName(me.name))}</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
 ${!late.length && act.length ? `<div class="boa"><span aria-hidden="true">🏆</span><div><b>A equipe está mandando bem!</b><br>Todas as ${act.length} obras estão no prazo${emDia !== null ? ` e os feedbacks estão ${emDia}% em dia` : ""}.${adi.length ? ` ${adi.map(o => esc(firstName(emp(o.resp).name))).filter((v, i, a) => a.indexOf(v) === i).join(" e ")} ${adi.length > 1 ? "estão" : "está"} adiantado${adi.length > 1 ? "s" : ""}: vale um elogio.` : ""}</div></div>` : ""}
 ${late.length ? `<div class="w-sec"><div class="eyebrow">Precisa de atenção · ${late.length} ${late.length > 1 ? "obras atrasadas" : "obra atrasada"}</div>${late.map(o => `<div class="w-obra bad"><div class="w-top"><b>${esc(clientById(o.client).name)}</b><span class="chip c-bad">${o.pct}% · esperado ${expected(o)}%</span></div><ul class="dicas">${dicas(o).map(t => `<li>${t}</li>`).join("")}</ul></div>`).join("")}${adi.length ? `<p class="s" style="margin:0">👏 ${adi.map(o => `${esc(firstName(emp(o.resp).name))} está adiantado em ${esc(clientById(o.client).name)}`).join("; ")}.</p>` : ""}</div>` : ""}
 ${porObra.length ? `<div class="w-sec"><div class="eyebrow">Feedbacks novos · ${fbNovos.length}</div>${porObra.map(l => `<div class="w-obra"><div class="w-top"><b>${esc(clientById(l.o.client).name)}</b><span class="s">${fd(l.d)} · ${esc(emp(l.who).name)} · ${l.pct}%</span></div><div class="s">${esc(l.text)}</div>${l.problem ? `<div class="down" style="font-size:13px">⚠ ${esc(l.problem)}</div>` : ""}</div>`).join("")}</div>` : act.length ? `<p class="s" style="margin:0">Nenhum feedback novo desde a última vez.</p>` : ""}
 ${faltas.length ? `<div class="w-sec"><div class="eyebrow">Faltando material · ${faltas.length}</div>${faltas.map(m => `<div class="row"><div class="grow"><div class="t">${esc(m.item)}${m.qty ? " · " + esc(m.qty) : ""}${faltasNovas.includes(m) ? ' <span class="chip c-info">Novo</span>' : ""}</div><div class="s">${esc(clientById(m.o.client).name)} · ${esc(emp(m.by).name)}</div></div>${m.urgent ? '<span class="chip c-bad">Parou a obra</span>' : ""}${faltaJaLembrada(m) ? "" : `<button class="btn sm" data-wl="${m.id}">+ Lembrete</button>`}</div>`).join("")}</div>` : ""}
 ${lemHoje.length ? `<div class="w-sec"><div class="eyebrow">Seus lembretes para hoje</div>${lemHoje.map(l => `<div class="row"><div class="grow"><div class="t">${esc(l.title)}</div>${l.due ? `<div class="s">${dueTxt(l)}</div>` : ""}</div><span class="chip ${URG[l.urg][1]}">${URG[l.urg][0]}</span></div>`).join("")}</div>` : ""}
 <div style="display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap">${lemHoje.length ? '<button class="btn" data-wgo="lem">Ver lembretes</button>' : ""}<button class="btn primary" data-wgo="obr">Ver obras</button></div>`, true);
  $$("#modalRoot [data-wgo]").forEach(b => b.onclick = () => { closeModal(); go(b.dataset.wgo) });
  $$("#modalRoot [data-wl]").forEach(b => b.onclick = async () => { const m = faltas.find(x => x.id == b.dataset.wl); b.disabled = true; if (await addLembrete(lemFromFalta(m), "Virou lembrete")) { b.replaceWith(Object.assign(document.createElement("span"), { className: "chip c-good", textContent: "Lembrete criado" })) } else b.disabled = false });
}
function welcomeTec() {
  const key = "ga-dia-" + me.id;
  if (store.get(key) === HOJE) return;
  const mine = myObras(), act = mine.filter(o => TODAY >= D(o.start) && o.pct < 100), logo = mine.filter(o => o.start > HOJE && o.start <= addDays(HOJE, 2));
  if (!act.length && !logo.length) return;
  store.set(key, HOJE);
  const bloco = o => {
    const st = obraStatus(o)[0], next = o.tasks.filter(t => !t[1]).slice(0, 2), urg = o.missing.filter(m => m.st === "Aberto");
    const topo = st === "Atrasada" ? `<div class="alerta"><span class="sirene" aria-hidden="true">🚨</span><div><b>Emergência: obra atrasada</b><br>${daysLeft(o) < 0 ? `O prazo venceu há ${-daysLeft(o)} dias.` : `Está ${expected(o) - o.pct}% atrás do esperado.`} Hoje o foco total é recuperar.</div></div>`
      : st === "Adiantada" ? `<div class="boa"><span aria-hidden="true">🚀</span><div><b>Vocês estão adiantados!</b><br>Mandem bem e terminem logo: a próxima obra já está esperando.</div></div>`
      : `<div class="ok-msg"><span aria-hidden="true">👍</span><div><b>No ritmo certo.</b><br>Mantendo assim, a entrega fica para ${fd(o.end)}.</div></div>`;
    return `<div class="w-obra ${st === "Atrasada" ? "bad" : ""}"><div class="w-top"><b>${esc(clientById(o.client).name)}</b><span class="s">${o.pct}% pronto</span></div>${topo}
   <div class="eyebrow" style="margin-top:4px">Hoje você deve</div><ul class="dicas">${next.map(t => `<li>${esc(t[0])}</li>`).join("") || "<li>Finalizar os detalhes e preparar a entrega</li>"}${todayDone(o) ? "" : "<li>Enviar o feedback do dia com fotos</li>"}</ul>
   ${o.notes ? `<div class="s"><b>Recado do escritório:</b> ${esc(o.notes)}</div>` : ""}${urg.length ? `<div class="s">O escritório já sabe que falta: ${urg.map(m => esc(m.item)).join(", ")}.</div>` : ""}</div>`;
  };
  modal(`<div class="sheet-head"><div><div class="eyebrow">${hojeLongo()}</div><h2>${saudacao()}, ${esc(firstName(me.name))}!</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
 ${act.map(bloco).join("")}
 ${logo.length ? `<div class="w-sec"><div class="eyebrow">Começa logo</div>${logo.map(o => `<div class="s"><b style="color:var(--fg)">${esc(clientById(o.client).name)}</b> começa ${o.start === addDays(HOJE, 1) ? "amanhã" : "em " + fd(o.start)}.</div>`).join("")}</div>` : ""}
 <div style="display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap">${act.length ? `<button class="btn" data-wfb="${act[0].id}">Enviar feedback agora</button>` : ""}<button class="btn primary" data-close>Bora trabalhar</button></div>`);
  const fb = $("#modalRoot [data-wfb]"); if (fb) fb.onclick = () => feedbackForm(obras.find(o => o.id == fb.dataset.wfb));
}

/* ---------- Funcionários (só o dono/admin) ---------- */
const ACCESS = { tec: ["Funcionário", "Só a aba Obras: tarefas, feedback do dia e pedidos de material"], fin: ["Financeiro", "Financeiro, orçamentos, clientes e relatórios"], admin: ["Administrador", "Acesso completo, igual ao dono"] };
const ROLES = ["Encanador líder", "Encanador", "Ajudante", "Técnico em aquecimento", "Auxiliar administrativo", "Dono"];
const inviteText = e => `Olá ${firstName(e.name)}! Você foi cadastrado no app do Grupo Azul. Abra ${appUrl()} , toque em "Primeiro acesso" e crie sua senha usando o e-mail ${e.email}.`;
VIEWS.func = () => {
  const act = staff.filter(e => e.active), tecs = act.filter(e => e.access === "tec"), rates = tecs.map(fbRate).filter(r => r !== null);
  $("#main").innerHTML = head("Funcionários", "Cadastre a equipe e defina o que cada pessoa pode ver no app.", `<button class="btn primary" id="fNew">+ Novo funcionário</button>`) + `
 <div class="grid kpis" style="margin-bottom:14px">
  <div class="card kpi"><div class="eyebrow">Equipe ativa</div><div class="v num">${act.length}</div><div class="d">${staff.length - act.length} com acesso desativado</div></div>
  <div class="card kpi"><div class="eyebrow">Em obra agora</div><div class="v num">${tecs.filter(e => activeObras().some(o => o.resp === e.id || o.team.includes(e.id))).length}</div><div class="d">Com pelo menos 1 obra ativa</div></div>
  <div class="card kpi"><div class="eyebrow">Feedback em dia</div><div class="v num">${rates.length ? Math.round(rates.filter(r => r >= 90).length / rates.length * 100) + "%" : "—"}</div><div class="d">Da equipe de campo enviou 90%+ dos dias</div></div>
 </div>
 <div class="toolbar"><input class="input" id="fSearch" placeholder="Buscar por nome ou função"></div>
 <div class="grid client-grid" id="fList"></div>`;
  const draw = () => {
    const q = $("#fSearch").value.toLowerCase();
    const list = staff.filter(e => (e.name + e.role).toLowerCase().includes(q)).sort((a, b) => (b.active - a.active) || (b.dono ? 1 : 0) - (a.dono ? 1 : 0) || a.name.localeCompare(b.name));
    $("#fList").innerHTML = list.map(e => {
      const ob = obras.filter(o => (o.resp === e.id || o.team.includes(e.id)) && o.pct < 100), rate = e.access === "tec" ? fbRate(e) : null; return `<button class="card client" data-e="${e.id}" style="${e.active ? "" : "opacity:.6"}">
   <div class="top"><div style="display:flex;gap:12px;align-items:center;min-width:0"><span class="avatar" style="width:44px;height:44px;font-size:15px">${esc(e.ini)}</span><div style="min-width:0"><h3 style="font-size:16px">${esc(e.name)}</h3><div class="who">${esc(e.role)}${e.dono ? " · Dono" : ""}</div></div></div>${e.active ? `<span class="chip ${e.access === "tec" ? "c-info" : "c-good"}">${ACCESS[e.access][0]}</span>` : '<span class="chip c-mute">Desativado</span>'}</div>
   <div class="meta"><span class="num">${esc(e.phone) || "Sem telefone"}</span>${e.since ? `<span>Desde ${fd(e.since)}</span>` : ""}<span>${e.linked ? "Já entrou no app" : `<span class="down">Ainda não criou a senha</span>`}</span></div>
   ${e.access === "tec" ? `<div class="meta"><span>${ob.length ? ob.map(o => esc(clientById(o.client).name)).join(", ") : "Sem obra no momento"}</span></div>
   <div><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted)"><span>Feedbacks enviados (30 dias)</span><b class="num" style="color:var(--fg)">${rate === null ? "—" : rate + "%"}</b></div><div class="bar"><i style="width:${rate || 0}%"></i></div></div>` : `<div class="s">Trabalha no escritório, não envia feedback de obra.</div>`}
  </button>` }).join("") || `<p class="s">Ninguém encontrado.</p>`;
    $$("#fList [data-e]").forEach(b => b.onclick = () => staffForm(emp(b.dataset.e)));
  };
  $("#fSearch").oninput = draw; $("#fNew").onclick = () => staffForm(null); draw();
};
function staffForm(e) {
  const n = !e, v = e || { name: "", role: "Encanador", phone: "", email: "", cpf: "", since: HOJE, daily: "", access: "tec", active: true };
  const ob = e ? obras.filter(o => (o.resp === e.id || o.team.includes(e.id)) && o.pct < 100) : [];
  modal(`<div class="sheet-head"><div><div class="eyebrow">${n ? "Cadastro" : "Funcionário"}</div><h2>${n ? "Novo funcionário" : esc(e.name)}</h2></div><button class="x" data-close aria-label="Fechar">×</button></div>
 <div class="form-grid"><div class="field"><label for="sfN">Nome completo</label><input class="input" id="sfN" value="${esc(v.name)}"></div><div class="field"><label for="sfR">Função</label><select class="input" id="sfR">${[...new Set([...ROLES, v.role])].map(r => `<option ${r === v.role ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></div>
 <div class="field"><label for="sfP">Telefone / WhatsApp</label><input class="input num" id="sfP" inputmode="tel" value="${esc(v.phone)}" placeholder="(11) 99999-9999"></div><div class="field"><label for="sfC">CPF</label><input class="input num" id="sfC" value="${esc(v.cpf)}"></div>
 <div class="field"><label for="sfS">Data de admissão</label><input class="input" type="date" id="sfS" value="${v.since || ""}"></div><div class="field"><label for="sfD">Valor da diária (R$)</label><input class="input num" type="number" min="0" step="0.01" id="sfD" value="${v.daily || ""}"></div></div>
 <div class="card" style="background:var(--surface-2);display:grid;gap:12px"><div class="eyebrow">Acesso ao app</div>
  <div class="field"><label for="sfE">E-mail de login</label><input class="input" id="sfE" type="email" value="${esc(v.email)}" placeholder="nome@email.com"><span class="s">A pessoa cria a senha no app em "Primeiro acesso", com este e-mail.${e && e.linked ? " Se trocar o e-mail, ela precisa criar a senha de novo." : ""}</span></div>
  <div class="field"><label>O que essa pessoa pode ver</label><div class="grid" style="gap:6px">${Object.entries(ACCESS).map(([k, [l, d]]) => `<label class="task"><input type="radio" name="sfA" id="sfA_${k}" value="${k}" ${k === v.access ? "checked" : ""} ${e && e.dono ? "disabled" : ""}><span><b>${l}</b><br><span class="s">${d}</span></span></label>`).join("")}</div></div>
  ${n || e.dono ? "" : `<label class="task"><input type="checkbox" id="sfAct" ${v.active ? "checked" : ""}><span>Acesso ativo<br><span class="s">Desmarque quando a pessoa sair da empresa. O histórico das obras fica guardado.</span></span></label>`}
  ${e && e.dono ? `<p class="s" style="margin:0">Esta é a conta do dono: fica sempre ativa e como administrador.</p>` : ""}
 </div>
 ${e && e.access === "tec" ? `<div><div class="eyebrow" style="margin-bottom:6px">Obras</div>${ob.length ? ob.map(o => `<div class="row"><div class="grow"><div class="t">${esc(clientById(o.client).name)}</div><div class="s">${o.resp === e.id ? "Responsável" : "Equipe"} · ${prazo(o)}</div></div>${stChip(o)}</div>`).join("") : `<p class="s" style="margin:0">Sem obra no momento.</p>`}</div>` : ""}
 <p class="s form-err" id="sfErr" hidden></p>
 <div style="display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap">${e && !e.dono && e.phone && e.email ? `<a class="btn" href="${waLink(e.phone, inviteText(e))}" target="_blank" rel="noopener">Enviar acesso pelo WhatsApp</a>` : ""}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="sfSave">${n ? "Cadastrar" : "Salvar alterações"}</button></div>`, true);
  $("#sfSave").onclick = () => {
    const err = m => { $("#sfErr").textContent = m; $("#sfErr").hidden = false };
    const name = $("#sfN").value.trim(), email = $("#sfE").value.trim().toLowerCase();
    if (!name) return err("Escreva o nome.");
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err("Esse e-mail não parece certo.");
    if (!email) return err("Coloque o e-mail: é com ele que a pessoa entra no app.");
    if (staff.some(s => s !== e && s.email && s.email.toLowerCase() === email)) return err("Já existe alguém da equipe com esse e-mail.");
    const d = { name, role: $("#sfR").value, phone: $("#sfP").value.trim(), cpf: $("#sfC").value.trim(), since: $("#sfS").value || null, daily: +$("#sfD").value || 0, email, access: e && e.dono ? "admin" : document.querySelector("input[name=sfA]:checked").value, active: n || e.dono ? true : $("#sfAct").checked };
    closeModal();
    act(async () => {
      if (DEMO) { if (n) staff.push({ id: "e" + Date.now(), ...d, ini: initials(name), linked: false }); else Object.assign(e, d, { ini: initials(name), linked: e.linked && e.email === email }); return }
      const row = { nome: d.name, funcao: d.role, telefone: d.phone, cpf: d.cpf, admissao: d.since, diaria: d.daily, email: d.email, acesso: d.access, ativo: d.active };
      await live(n ? sb.from("ga_equipe").insert(row) : sb.from("ga_equipe").update(row).eq("id", e.id));
    }, n ? `${name} cadastrado. Abra o cadastro para enviar o acesso pelo WhatsApp.` : "Cadastro atualizado");
  };
}

/* ---------- login 3D e profundidade ---------- */
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
$("#login").addEventListener("pointermove", e => { if (reduced()) return; const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5; $("#rig").style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 6}deg)` });

/* ---------- início ---------- */
setAuthMode("login"); showLogin();
if (DEMO) splashHide();
if (!DEMO) {
  sb.auth.onAuthStateChange((ev, session) => {
    if (ev === "PASSWORD_RECOVERY") { setAuthMode("newpass"); return }
    if (ev === "SIGNED_IN" && session && !me && authMode !== "newpass") setTimeout(start, 0);
    if (ev === "SIGNED_OUT" && me) showLogin();
  });
  sb.auth.getSession().then(({ data }) => { if (data.session && authMode !== "newpass" && !location.hash.includes("type=recovery")) start(); else splashHide() }).catch(splashHide);
}
if ("serviceWorker" in navigator && !DEMO) { /* sem cache offline por enquanto: o app sempre busca a versão mais nova */ }
