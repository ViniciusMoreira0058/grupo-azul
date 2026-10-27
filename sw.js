/* Service worker do Grupo Azul: só cuida das notificações (não guarda nada em cache). */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
// aviso mandado pelo servidor (app real)
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {} } catch (x) { d = { body: e.data ? e.data.text() : "" } }
  e.waitUntil(self.registration.showNotification(d.title || "Grupo Azul", { body: d.body || "", icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: d.tag, data: { p: d.p || "" } }));
});
// tocou na notificação: abre o app na tela certa
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const p = (e.notification.data || {}).p || "", url = new URL("./" + (p ? "#" + p : ""), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => "focus" in x);
    if (c) { c.postMessage({ irPara: p }); return c.focus() }
    return self.clients.openWindow(url);
  }));
});
