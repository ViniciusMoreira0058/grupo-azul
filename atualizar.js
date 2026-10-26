/* Mantém o app sempre na versão mais nova.
   Ao abrir, ao voltar para o app (celular/aba) e a cada 5 minutos, confere se os arquivos
   mudaram no servidor. Se mudaram, recarrega sozinho. Se a pessoa estiver no meio de um
   formulário, não recarrega: mostra uma faixa "Atualizar agora". */
(() => {
  const ARQS = ["index.html", "app.js", "novo.js", "os.js", "apagar.js", "demo.js", "atualizar.js"];
  const marca = async () => (await Promise.all(ARQS.map(a =>
    fetch(a, { method: "HEAD", cache: "no-store" }).then(r => r.ok ? (r.headers.get("etag") || r.headers.get("last-modified") || "") : "").catch(() => "")
  ))).join("|");
  let base = null, ultimo = 0, nova = false;
  const ocupado = () => { const m = document.getElementById("modalRoot"); return !!(m && m.innerHTML.trim()) };
  const faixa = () => {
    if (document.getElementById("novaVersao")) return;
    const d = document.createElement("div"); d.id = "novaVersao"; d.className = "nova-versao"; d.setAttribute("role", "status");
    d.innerHTML = `<span>Tem uma versão nova do app.</span><button class="btn sm primary" type="button">Atualizar agora</button>`;
    d.querySelector("button").onclick = () => location.reload();
    document.body.appendChild(d);
  };
  const aplicar = () => { if (!nova) return; if (ocupado()) faixa(); else location.reload() };
  async function conferir(forcar) {
    if (nova) return aplicar();
    if (!forcar && Date.now() - ultimo < 30000) return;
    ultimo = Date.now();
    const m = await marca(); if (!m.replace(/\|/g, "")) return; // sem internet ou servidor sem ETag
    if (base === null) { base = m; return }
    if (m !== base) { nova = true; aplicar() }
  }
  conferir(true);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") conferir() });
  window.addEventListener("focus", () => conferir());
  window.addEventListener("online", () => conferir(true));
  setInterval(() => conferir(true), 5 * 60 * 1000);
  // fechou o formulário e tinha versão nova esperando: atualiza
  document.addEventListener("click", () => setTimeout(() => { if (nova && !ocupado()) location.reload() }, 300), true);
})();
