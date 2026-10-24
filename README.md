# Grupo Azul · Gestão

App web de gestão da **Grupo Azul – Instalações Hidráulicas**: obras com acompanhamento diário da equipe, clientes, orçamentos em PDF, financeiro (entradas e saídas), relatórios e cadastro de funcionários.

É um site estático, sem etapa de build: `index.html` + `app.js`. Usa o Supabase para login, banco de dados e fotos, e é publicado na Vercel.

Abrindo `index.html` sem preencher o Supabase (ou com `?demo=1` no endereço), o app roda em **modo demonstração**, com dados fictícios só na memória.

## Perfis

| Perfil | O que vê |
|---|---|
| **Administrador** (o dono e quem ele quiser) | Tudo |
| **Financeiro** | Dashboard, clientes, orçamentos, financeiro e relatórios. Não edita obras nem a equipe |
| **Funcionário** | Só a aba **Obras**, e só as obras em que está: etapas, prazo, feedback do dia com fotos e pedido de material |

O dono é cadastrado pelo `schema.sql` e não pode ser desativado nem rebaixado.

## Colocar no ar

1. **Supabase**: crie um projeto novo (plano Free). A seção 9 do `supabase/schema.sql` (no fim) já cadastra `barbeariavm0058@gmail.com` como conta principal (troque se for outro). Vá em **SQL Editor → New query**, cole o arquivo inteiro e clique em **Run**.
2. **app.js**: preencha `SUPABASE_URL` e `SUPABASE_KEY` nas primeiras linhas. O URL fica em **Connect** (botão no alto) ou é `https://<código-do-projeto>.supabase.co`. Use a chave **anon / publishable**. Nunca coloque a *service_role / secret key*.
   No mesmo lugar, ajuste o bloco `EMPRESA` (contato, pagamento e garantia que saem no PDF do orçamento).
3. **Vercel**: **Add New → Project** → importe este repositório → **Deploy**. Não precisa configurar nada.
4. **Supabase → Authentication → URL Configuration**: em **Site URL** coloque o endereço da Vercel (ex.: `https://grupo-azul.vercel.app`) e adicione o mesmo endereço em **Redirect URLs**.
5. **Primeiro acesso do dono**: abra o app, toque em **Primeiro acesso? Criar minha senha**, use o e-mail do passo 1 e confirme pelo link que chega no e-mail.
6. **Equipe**: em **Funcionários**, cadastre cada pessoa com o e-mail dela e o perfil. Abra o cadastro e toque em **Enviar acesso pelo WhatsApp**: a pessoa recebe o link e cria a própria senha em **Primeiro acesso**.

## Segurança

- RLS em todas as tabelas (prefixo `ga_`). Cada perfil só lê e grava o que pode, conferido no banco, não só na tela.
- Só entra quem foi cadastrado em Funcionários: um e-mail desconhecido cria a conta mas não vê nada.
- Desativar alguém corta o acesso na hora. Trocar o e-mail de alguém desfaz o vínculo com o login antigo.
- Fotos e comprovantes ficam no bucket privado `ga-arquivos`, abertos só por links temporários.

## Fase 2

- Estoque
- Ordens de serviço
- Nota fiscal (fora por enquanto)
