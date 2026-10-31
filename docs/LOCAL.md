# Desenvolvimento local e publicação

Revisado em 30/10/2026. Estado corrente em [STATUS.md](STATUS.md); histórico de entregas e recuperação em [RELEASES.md](RELEASES.md).

Requisito: Node.js 22.17 ou posterior compatível, npm e dependências do lockfile (`npm ci`). Miniflare/workerd já vêm com o Wrangler instalado no projeto; não há instalação global ou assinatura adicional para rodar localmente.

## Uso diário

```bash
npm run dev
```

Inicia o Next.js em **http://localhost:5174**, com atualização automática ao salvar, e também o Worker/Miniflare em **http://localhost:8787**. A compilação do Worker acontece antes de iniciar o Next para evitar disputa pelos arquivos gerados. O comando prepara o D1 local, aplica apenas migrações pendentes e informa os endereços do ambiente. Na primeira execução, gera o segredo local caso esteja ausente. Pare com Ctrl+C.

O Next escuta em 0.0.0.0:5174 e pode ser acessado por outro dispositivo na mesma rede usando http://IP-DO-COMPUTADOR:5174. O terminal lista os IPv4 disponíveis (inclusive interfaces virtuais); escolher o IP da rede física, confirmado nesta sessão como 192.168.1.200. O IP pode mudar. A função de configuração retorna um novo objeto (sem modificar a configuração base, que pode ser congelada pelo Next); allowedDevOrigins é preenchido apenas no modo de desenvolvimento com IPv4 das interfaces locais para recursos do Next; sem wildcard, sem relaxar CSRF das Server Actions ou alterar produção. Worker 8787, Local Explorer e inspectors continuam em loopback. Para aplicar mudança de hostname, parar o ambiente no terminal e iniciar npm run dev novamente; não criar outra instância nem encerrar processos do responsável pelo agente. Se o acesso for bloqueado pela rede/firewall, conferir separadamente, sem alterar regras automaticamente.

O responsável normalmente executa o comando no próprio terminal. O agente não deve iniciar nem deixar servidores em segundo plano sem pedido explícito. Antes de iniciar outra instância, encerre a anterior; erro EADDRINUSE indica porta ocupada. Não limpar o banco nem trocar portas silenciosamente para contornar isso.

O D1 local começa sem os dados publicados. Dados cadastrados localmente permanecem em `.wrangler/state/v3`, separados da produção. Não apagar essa pasta para limpar o projeto.

O login continua usando a API existente e exige internet. Nenhum usuário de teste ou bypass foi habilitado. `.env` é a única fonte de variáveis locais para Next.js e Worker/Miniflare, incluindo AUTH_API_URL, APP_ENV e SESSION_SECRET. `.env.example` é apenas o modelo sem segredo. Não compartilhar nem versionar `.env`. A prévia Worker recebe `--env-file .env` explicitamente; nenhum `.dev.vars` ou `.env.local` é necessário.

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

## Banco local

```bash
npm run db:local
```

Aplica migrações exclusivamente locais. `npm run dev` e `dev:worker` já fazem isso automaticamente. Não acessa o D1 remoto. Ao adicionar tabelas, criar nova migração SQL e o schema Drizzle na infraestrutura da funcionalidade; não alterar as migrações já aplicadas. As migrações continuam pelo Wrangler, sem Drizzle Kit/push e sem segundo histórico. Drizzle usa as tabelas existentes; novas migrações preservam dados, índices, constraints, triggers e auditorias. Uma migração pode coordenar vários objetos da mesma mudança.

## Estado das migrações

| Migrações | Conteúdo                                                       | Local        | Produção                   |
| --------- | -------------------------------------------------------------- | ------------ | -------------------------- |
| 0001–0003 | Caixas, auditoria e doações recebidas                          | Aplicadas    | Aplicadas                  |
| 0004–0011 | Eventos/produtos/pedidos, versões, histórico e exclusão lógica | Aplicadas    | Aplicadas                  |
| 0012–0016 | Insumos/auditoria, ícones, PDF, edição/exclusão                | Aplicadas    | Aplicadas                  |
| 0017      | Descrição dos insumos                                          | Aplicada     | Aplicada                   |
| 0018–0019 | Múltiplos comprovantes e nome do doador de insumo              | Aplicadas    | Aplicadas                  |
| 0020      | Movimentações manuais e integração de saldos                   | Aplicada     | Aplicada                   |
| **0021**  | **Edição/exclusão de doações e snapshots de auditoria**        | **Aplicada** | **Aplicada em 28/10/2026** |
| **0022**  | **Comprovantes opcionais em movimentações**                    | **Aplicada** | **Aplicada em 28/10/2026** |

As verificações descritas são as já realizadas neste trabalho; em outro ambiente, consultar o estado antes de presumir migrações aplicadas. Código local atual exige 0021/0022. Para preparar o local, npm run db:local ou o fluxo autorizado de npm run dev aplica pendentes; nunca usar D1 remoto como desenvolvimento.

- 0015 reconstruiu event_supplies em transação para ampliar o CHECK a PDF, preservando IDs, vínculos, índices/triggers e dados; usa defer_foreign_keys. Não editar essa migração já aplicada.
- 0018 converteu cada comprovante antigo em receipts_json, preservando chave/tipo, dados e auditorias; tamanho legado desconhecido é null.
- 0020 criou movimentações/auditoria sem registros fictícios e adaptou compras/saldos aos lançamentos manuais.
- 0021 adicionou versão e metadados de atualização das doações, inicialmente iguais aos de criação, e donation_audit com snapshots/autoria anteriores. Aplicada localmente em 28/10/2026 após backup privado; integridade/referências, comparação de todas as colunas/linhas antigas e dados dos snapshots aprovados.

Não apagar .wrangler/state nem reaplicar migrações manualmente para contornar erro de esquema. Parar/reiniciar o ambiente existente quando for necessário atualizar o bundle do Worker, sem criar instância concorrente.

- 0022 acrescentou receipts_json com padrão vazio nas movimentações e novos snapshots/contagem de anexos, sem reescrever dados/auditorias anteriores. Aplicada no local após backup em 28/10/2026; integridade/referências e comparação de todas as colunas/linhas antigas aprovadas. Aplicada também em produção, junto da 0021, em 28/10/2026: quick_check aprovado, referências sem ocorrências e nenhuma migração pendente. Totais das doações preservados; detalhes dos agregados em RELEASES.md.

## Comprovantes locais e R2 privado

- wrangler.local.jsonc usa RECEIPTS emulado, cantina-contabil-receipts-local, remote=false. Next e Worker compartilham .wrangler/state/v3/r2.
- Produção usa wrangler.jsonc e bucket privado cantina-contabil-receipts, binding RECEIPTS; r2.dev desativado. Não enviar dados/arquivos locais para produção nem trocar bindings por conveniência.
- Insumos e movimentações reutilizam o mesmo binding privado e limites. Em movimentações anexar é sempre opcional; prefixo de chave movements/id/hash, sem nome original no objeto.
- Até 5 arquivos JPEG/PNG/WebP/PDF de 5 MB cada, entre mantidos e novos; Server Actions bodySizeLimit=26mb. Bytes/hash e gravações são sequenciais, sem Base64/chunks. Limites de payload foram avaliados; não houve teste de carga/memória/concorrência.
- Imagem por rota autenticada em modal; PDF como attachment; sem cache público. Remoção no X só persiste ao salvar e preserva arquivos históricos. Reconciliação de objetos órfãos aguarda decisão própria.

## Verificação autorizada

Testes unitários e de integração autorizados em 30/10/2026, com Vitest e Miniflare. Não precisam de `.env`, conta GestPV, app aberto ou recursos Cloudflare. Dados sintéticos e D1/R2 descartáveis em diretórios temporários exclusivos, removidos ao final. As migrações reais são aplicadas somente nesses bancos novos; `.wrangler/state` e os bancos existentes permanecem intactos. O emulador inicia e encerra seus processos/portas aleatórias de loopback durante a execução.

```bash
npm run test:unit
npm run test:integration
npm test
```

Os comandos executam uma vez e falhas retornam código diferente de zero. Para um cenário: `npm run test:integration -- -t "trecho do nome"`. Cobertura e organização em [TESTING.md](TESTING.md). Em ambiente restrito, `listen EPERM` indica falta de permissão para sockets locais do Miniflare; não mudar o app nem usar banco remoto para contornar.

Para código: executar os grupos afetados e o build completo Cloudflare/TypeScript. Ao alterar a suíte, executar também `npm run typecheck` para conferir os tipos de testes; o build isolado não copia `tests/` ou `vitest.config.mts`. Com ambiente do responsável aberto, usar `npm run deploy -- --build-only`, preservando os builds em uso e sem publicar. Não iniciar o app, percorrer fluxos de interface ou gerar screenshots; esses testes funcionais continuam com o responsável. Para documentação, revisar conteúdo, referências e formatação; não repetir build. Falha ou mudança adicional pode justificar nova compilação.

Migrações exigem cuidado com preservação: backup local privado antes, quick_check, foreign_key_check e comparação dos registros/colunas antigos; snapshots novos conferidos quando houver backfill. Não imprimir dados pessoais completos ou segredos.

### Diagnóstico de build no ambiente do agente

Em 28/10/2026, a execução restrita da ferramenta causou `Could not parse output from TypeScript's --showConfig`: o processo auxiliar do compilador entregava stdout vazio, e uma reprodução com spawnSync revelou EPERM. Executar `npm run build:cloudflare` fora dessa restrição, com a revisão de permissão da ferramenta, concluiu Next/TypeScript/OpenNext com código 0. Não foi necessário mudar tsconfig, versão de dependências ou desativar validação. Isso não é evidência de defeito no compilador/projeto nem exige alteração no terminal do responsável. Se reaparecer, conferir erro/saída reais do subprocesso antes de modificar configurações; permissão fora da restrição segue o mecanismo da ferramenta, sem contornar rejeição. Build não publica nem substitui conferência funcional/visual.

## Isolamento do pacote de publicação

OpenNext lê arquivos .env presentes durante a compilação e pode embutir suas variáveis no Worker. O .gitignore não interfere nisso. deploy.mjs usa deploy-build.mjs para copiar apenas código/configurações necessárias e dependências instaladas para uma pasta privada temporária, sem .env, credenciais, banco local ou builds existentes. Dependências são copiadas independentemente, sem symlink para o projeto; nenhum npm ci adicional ou instalação é feito nessa etapa. Ambiente do processo de compilação contém somente variáveis de sistema necessárias, não os segredos do shell.

O script exige next-env.mjs vazio para production/development/test, bloqueia arquivos de ambiente/chaves privadas e procura os valores sensíveis conhecidos do .env/shell nos artefatos .open-next e no bundle final de um dry-run Wrangler. Esses checks não substituem revisão de segredos desconhecidos inseridos no código. Só após aprovação envia o mesmo pacote, usando os Secrets já configurados no Worker e o perfil de publicação. CANTINA_SECRETS_FILE, se explicitamente configurado, é resolvido fora da cópia e passado somente ao envio; nunca ao build. Pasta temporária é removida ao terminar ou falhar; arquivos e processos locais não são encerrados/modificados. Nenhuma migração é aplicada.

Para compilar/verificar sem publicar: `npm run deploy -- --build-only`. Esse caminho permite o build completo sem disputar .next/.open-next com o ambiente local aberto. O fluxo de desenvolvimento permanece usando .env e recursos emulados.

## Publicação, somente quando solicitada

Implementar ou corrigir não autoriza publicar. A autorização anterior de deploy automático foi revogada. Acesso à conta e retomada de chat também não autorizam migração remota, deploy ou alteração de recursos.

Quando houver novo pedido explícito:

1. Conferir STATUS/RELEASES, pacote/lockfile e migrações pendentes. Preservar configurações/segredos; não criar bucket/banco novo sem pedido.
2. Registrar ponto remoto com D1 Time Travel antes de migrar e conferir contagens/totais agregados. Exportação completa da produção para arquivo local foi recusada pela revisão automática nesta sessão; não contornar ou repetir por conveniência. Recuperação permanece no próprio D1; restauração exige autorização separada e análise de gravações posteriores.
3. Aplicar somente as migrações remotas autorizadas, conferir integridade/referências e preservação dos agregados. Não executar por rotina enquanto desenvolve. Migração local aplicada não comprova estado remoto.
4. Atualizar versão de package.json/package-lock.json e publicar pelo comando abaixo, com tag e descrição curta em português. O script prepara uma cópia temporária isolada, compila e seleciona wrangler.jsonc/perfil cantina-contabil; **não aplica migrações remotas**.
5. Confirmar tag/descrição, ID da versão e porcentagem do tráfego por metadados antes de declarar sucesso. Registrar RELEASES, atualizar STATUS e a matriz de migrações, sem alegar teste funcional pelo build.

```bash
npm run deploy -- vX.Y.Z "Descrição curta da entrega"
```

Alternativa equivalente: npm run deploy -- --tag vX.Y.Z --message "Descrição curta da entrega". Os valores são exemplos; uma revisão documental não autoriza executar esses passos.

Última produção confirmada: v0.6.3, versão 59ffc4c2-247e-4ee4-99d9-bd52a99c08fc, com 100% do tráfego. Ponto D1 anterior às migrações 0021/0022: 00000031-00000000-00005112-e8571e9def2c99e11980b4aef3b2aadb. Demais versões/bookmarks permanecem em RELEASES.md.

## Referências da configuração

- [OpenNext: integração local de bindings](https://opennext.js.org/cloudflare/get-started)
- [Cloudflare: D1 local](https://developers.cloudflare.com/d1/best-practices/local-development/)
- [Cloudflare: Local Explorer](https://developers.cloudflare.com/workers/local-development/local-explorer/)
- [Next.js: debug no VS Code](https://nextjs.org/docs/app/guides/debugging)
- [Cloudflare: defer_foreign_keys no D1](https://developers.cloudflare.com/d1/sql-api/foreign-keys/)
