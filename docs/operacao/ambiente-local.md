# Ambiente local e debug

Contrato atual. Leia somente ao alterar este assunto. [Escolher outra leitura](../README.md).

## Uso diário

```bash
npm run dev
```

Inicia o Next.js em **http://localhost:5174**, com atualização automática ao salvar, e também o Worker/Miniflare em **http://localhost:8787**. A compilação do Worker acontece antes de iniciar o Next para evitar disputa pelos arquivos gerados. O comando prepara o D1 local, aplica apenas migrações pendentes e informa os endereços do ambiente. Na primeira execução, gera o segredo local caso esteja ausente. Pare com Ctrl+C.

O Next escuta em 0.0.0.0:5174 e pode ser acessado por outro dispositivo na mesma rede usando http://IP-DO-COMPUTADOR:5174. O terminal lista os IPv4 disponíveis (inclusive interfaces virtuais); escolher o IP da rede física, confirmado nesta sessão como 192.168.1.200. O IP pode mudar. A função de configuração retorna um novo objeto (sem modificar a configuração base, que pode ser congelada pelo Next); allowedDevOrigins é preenchido apenas no modo de desenvolvimento com localhost, 127.0.0.1 e IPv4 das interfaces locais para recursos do Next; sem wildcard, sem relaxar CSRF das Server Actions ou alterar produção. Worker 8787, Local Explorer e inspectors continuam em loopback. Acesso por 127.0.0.1 precisa constar nessa lista: sem isso, recursos JavaScript com esse Origin recebem 403 e o HTML aparece sem controles ativos. Para aplicar mudança de hostname ou dessa lista, parar o ambiente no terminal e iniciar npm run dev novamente; não criar outra instância nem encerrar processos do responsável pelo agente. Se o acesso for bloqueado pela rede/firewall, conferir separadamente, sem alterar regras automaticamente.

O responsável normalmente executa o comando no próprio terminal. O agente não deve iniciar nem deixar servidores em segundo plano sem pedido explícito. Antes de iniciar outra instância, encerre a anterior; erro EADDRINUSE indica porta ocupada. Não limpar o banco nem trocar portas silenciosamente para contornar isso.

O D1 local começa sem os dados publicados. Dados cadastrados localmente permanecem em `.wrangler/state/v3`, separados da produção. Não apagar essa pasta para limpar o projeto.

O login usa Supabase e exige internet; a API GestPV participa somente da habilitação inicial nos bastidores do Entrar. Nenhum usuário de teste ou bypass foi habilitado. `.env` é a única fonte de variáveis locais para Next.js e Worker/Miniflare, incluindo AUTH_API_URL, APP_ENV e SESSION_SECRET. `.env.example` é apenas o modelo sem segredo. Não compartilhar nem versionar `.env`. A prévia Worker recebe `--env-file .env` explicitamente; nenhum `.dev.vars` ou `.env.local` é necessário.

## Worker / Miniflare incluído no ambiente

`npm run dev` já inicia o Worker, o Local Explorer e o inspector. Para executar somente a prévia do Worker, sem o Next (não execute junto de outro ambiente já iniciado):

```bash
npm run dev:worker
```

Compila o aplicativo localmente e executa o bundle com Wrangler/Miniflare. **Não faz deploy.**

- Aplicativo no runtime Workers: http://localhost:8787
- Local Explorer para D1 e recursos locais: http://localhost:8787/cdn-cgi/local/explorer
- Inspector para debug: http://127.0.0.1:9229

Essa prévia usa o mesmo D1 local do Next. O Next atualiza automaticamente ao salvar; o Worker serve o bundle compilado na inicialização. Para atualizar esse bundle após editar, encerre e reinicie `npm run dev` (ou `dev:worker`, quando usado isoladamente). Ctrl+C em `npm run dev` encerra os dois servidores. O terminal informa os links; aguarde as mensagens de pronto antes de acessar.

Não remover `.next` ou `.open-next` enquanto os servidores estiverem usando esses arquivos. Eles são gerados e ignorados pelo Git, assim como segredos e o estado local.

## Debug no VS Code

Abra a pasta do projeto no VS Code e vá a Executar e Depurar:

- **Local: Next.js e navegador**: F5 inicia o ambiente, conecta o debugger aos processos Node e abre Chrome ao ficar pronto. Use essa opção para depurar use cases, Server Actions e componentes. Pare um `npm run dev` existente antes de iniciar outro pela mesma porta.
- **Local: navegador (servidor já iniciado)**: depura os componentes do navegador usando o ambiente já aberto na porta 5174.
- **Local: anexar ao servidor Next.js**: execute `npm run dev:debug` primeiro; depois selecione essa configuração para conectar na porta 9230.
- **Local: anexar ao Worker / Miniflare**: execute `npm run dev` (ou `dev:worker` isolado) primeiro; depois conecte o debugger à porta 9229. Essa opção inspeciona o bundle compilado e o runtime Workers.

Configurações compartilhadas em `.vscode/launch.json`. Usa os depuradores JavaScript já incluídos no VS Code; o navegador Chrome precisa estar instalado para as opções de navegador.

## Referências da configuração

- [OpenNext: integração local de bindings](https://opennext.js.org/cloudflare/get-started)
- [Cloudflare: D1 local](https://developers.cloudflare.com/d1/best-practices/local-development/)
- [Cloudflare: Local Explorer](https://developers.cloudflare.com/workers/local-development/local-explorer/)
- [Next.js: debug no VS Code](https://nextjs.org/docs/app/guides/debugging)
- [Cloudflare: defer_foreign_keys no D1](https://developers.cloudflare.com/d1/sql-api/foreign-keys/)

## Cantina no ambiente local

custom-worker.ts envolve o fetch gerado por OpenNext e exporta CommandHub. Os dois wrangler.jsonc usam o mesmo entrypoint e declaram COMMANDS com migração de classe SQLite canteen-v1. A configuração local emula DB/R2/DO e não usa recurso remoto. Build isolado copia também o custom entrypoint, gera OpenAPI privado antes de compilar e inspeciona o bundle final; --build-only continua sem upload/criação de recurso.

A preparação persistente das gravações usa armCommands pela RPC do binding WORKER_SELF_REFERENCE para o Worker já iniciado; getPlatformProxy não executa o entrypoint nem classes DO internas. Next seleciona `environment: "next"` no mesmo wrangler.local.jsonc: proxy `cantina-contabil-next-proxy`, binding para `cantina-contabil-local`. Nomes distintos impedem resolver a RPC no proxy vazio. D1/R2 repetem os mesmos IDs locais, remote=false e persistência existente, pois esses bindings não são herdados entre ambientes Wrangler. Nenhum novo Worker/serviço remoto ou porta é criado. Reiniciar npm run dev após esse ajuste fica com o responsável.

No desenvolvimento pela porta 5174, Next encaminha somente o upgrade /api/events/:id/commands/socket para o Worker de loopback 8787; consultas/Actions continuam no Next. O encaminhamento local preserva Origin/x-forwarded-host, aceito apenas fora de APP_ENV=production. Em produção o custom Worker exige Origin do próprio domínio. Não colocar URL WS com segredo ou variável pública com credencial. Cookies de desenvolvimento conservam os nomes sem __Host e são próprios do ambiente.

O estado confirmado de 0025 e das demais migrações fica em banco-e-migracoes.md/estado-atual; a existência do arquivo não comprova aplicação por ambiente. As migrações de classe DO e o binding são preparação local, não recurso remoto já criado. Produção exige ação explicitamente autorizada para a preparação de recursos/migrações; não antecipar deploy nem alteração remota. npm run dev segue o procedimento existente de migrações locais, que o responsável executa; preserve backups/estado antes de aplicar novas migrações.

Scalar e zod-openapi são as dependências adicionais aprovadas para documentação; a referência é empacotada no app, sem CDN/proxy externo. A geração usa esbuild já presente no lockfile da stack OpenNext; artefato em src/server/api/generated é ignorado e reconstruído antes de build/typecheck, nunca servido como arquivo público. `/api-docs` requer login normal e `/api/openapi` repete a autorização, mesmo quando solicitado diretamente.

Após alteração de caminhos ou next.config.ts, o responsável deve reiniciar npm run dev e reabrir o link temporário completo. A ativação local confere Origin contra a URL ou o Host real do navegador; o hostname interno de escuta do Next não bloqueia localhost/IP. Builds e tipos de rotas antigos em .next podem continuar referindo caminhos anteriores; validar em cópia isolada, sem apagar artefatos em uso.
