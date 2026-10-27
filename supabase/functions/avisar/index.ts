// GRUPO AZUL · função "avisar": manda para o celular os avisos que o app acabou de gravar (SQL 009).
// Segredos que precisam estar no Supabase (Edge Functions → Secrets): VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY o próprio Supabase já coloca.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });

webpush.setVapidDetails("https://grupo-azul.vercel.app", Deno.env.get("VAPID_PUBLIC_KEY") ?? "", Deno.env.get("VAPID_PRIVATE_KEY") ?? "");

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    // quem está chamando (com o login da pessoa)
    const usuario = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: eu, error: e1 } = await usuario.rpc("ga_eu");
    if (e1 || !eu) return resposta({ erro: "Sem acesso" }, 401);

    const { ids, teste } = await req.json().catch(() => ({}));
    const adm = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    // botão "Mandar um teste": manda para os aparelhos da própria pessoa
    if (teste) {
      const { data: meus } = await adm.from("ga_push").select("id, endpoint, p256dh, auth").eq("equipe_id", eu);
      let enviados = 0;
      for (const s of meus ?? []) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: "Teste do Grupo Azul", body: "As notificações estão funcionando neste aparelho.", p: "", tag: "teste" }), { TTL: 600, urgency: "high" });
          enviados++;
        } catch (e) {
          const st = (e as { statusCode?: number }).statusCode;
          if (st === 404 || st === 410) await adm.from("ga_push").delete().eq("id", s.id);
          else console.error("teste", st, (e as Error).message);
        }
      }
      return resposta({ enviados });
    }

    const lista = (Array.isArray(ids) ? ids : []).map(Number).filter(Number.isInteger).slice(0, 200);
    if (!lista.length) return resposta({ enviados: 0 });

    // só os avisos que essa pessoa mandou e que ainda não saíram
    const { data: avisos, error: e2 } = await adm.from("ga_avisos").select("id, para, titulo, corpo, pagina").in("id", lista).eq("de", eu).is("enviado_em", null);
    if (e2) throw e2;
    if (!avisos?.length) return resposta({ enviados: 0 });

    const pessoas = [...new Set(avisos.map(a => a.para))];
    const { data: aparelhos, error: e3 } = await adm.from("ga_push").select("id, equipe_id, endpoint, p256dh, auth").in("equipe_id", pessoas);
    if (e3) throw e3;

    let enviados = 0;
    const mortos: number[] = [];
    await Promise.all(avisos.flatMap(a => (aparelhos ?? []).filter(s => s.equipe_id === a.para).map(async s => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: a.titulo, body: a.corpo, p: a.pagina ?? "", tag: "av" + a.id }), { TTL: 60 * 60 * 24, urgency: "high" });
        enviados++;
      } catch (e) {
        const st = (e as { statusCode?: number }).statusCode;
        if (st === 404 || st === 410) mortos.push(s.id); // celular desinstalou ou desligou: esquece esse aparelho
        else console.error("push", st, (e as Error).message);
      }
    })));
    if (mortos.length) await adm.from("ga_push").delete().in("id", [...new Set(mortos)]);
    await adm.from("ga_avisos").update({ enviado_em: new Date().toISOString() }).in("id", avisos.map(a => a.id));
    return resposta({ enviados });
  } catch (e) {
    console.error(e);
    return resposta({ erro: (e as Error).message ?? String(e) }, 500);
  }
});
