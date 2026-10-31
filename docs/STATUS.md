# Retomada — Ministério Contábil

Revisado em **31/10/2026**. Ler [AGENTS.md](../AGENTS.md) e os documentos donos antes de alterar. Este arquivo descreve o estado atual, não autoriza iniciar backlog, servidores ou publicação.

## Falha de conexão confirmada e correção local (31/10/2026)

Novo relatório fornecido pelo responsável: commit **855cd9d04dbd325a9f2f9789eb5e40287992982a**, tag pretendida v0.6.5, PR #3; `phase: recheck-main`, `API_TRANSPORT_FAILED / UND_ERR_SOCKET`, `uploadAttempted: false`. A chamada de leitura ao GitHub após o build encontrou uma conexão encerrada. Não é erro de título, build, saldo ou migração, nem evidência de falta de permissão. O motivo físico do encerramento não é comprovado pelo código de erro; reuso de socket ocioso é compatível com esse padrão.

Branch atual **fix/deployment-api-connections**, baseada na main remota 855cd9d. **0.6.6 somente local**: chamadas de API do CI sem reuso persistente (Connection: close) e uma única segunda tentativa de GET para UND_ERR_SOCKET/ECONNRESET, com novo timeout. Sem retry de POST, SQL, tag ou upload, sem relaxar nenhuma guarda de versão/main/migrações e sem nova dependência. Demais erros preservam diagnóstico e propagação existentes. Contrato consolidado em CI.md.

**Verificação da correção:** 136 testes unitários aprovados (incluindo recuperação após recheck-main e limites de retry); tipos, sintaxe, formatação e build completo Cloudflare/TypeScript com dry-run/inspeção aprovados na cópia isolada. Integração financeira não repetida, pois não foi alterada. Sem servidor/app, navegador ou upload real.

**Ambientes:** nenhum deploy, re-run ou alteração de recurso remoto pelo agente. Migrações locais/produção não aplicadas. Última produção confirmada permanece **v0.6.3**; os relatórios de v0.6.4/v0.6.5 mostram tentativas sem envio iniciado e os mesmos IDs anteriores, sem nova conferência global da produção. O responsável fará push/PR/merge e a nova execução real confirmará a correção no runner. Sem mudança de token necessária pelo erro apresentado.

## Diagnóstico anterior e base da correção (31/10/2026)

Execução GitHub **41219267824**, commit **35a4e894de82bf5228688ea9ec9994f86000785c** do PR #2: 158 testes/tipos aprovados; build OpenNext, inspeção do pacote e dry-run aprovados; job de publicação falhou depois do build. Artefato fornecido pelo responsável confirma `uploadAttempted: false`, `status: failed` e versão/deployment anteriores **59ffc4c2-247e-4ee4-99d9-bd52a99c08fc / 27a09605-57e2-4c7f-98b1-dc3d1d0c8609**. Essa execução não iniciou o envio; o erro original ficou oculto e a etapa exata da reconferência não foi registrada. Não atribuir a causa a token, Node/Ubuntu, JSON ou conexão sem evidência. Duas leituras públicas ao GitHub antes/depois de bloqueio síncrono não reproduziram falha; isso não resolve o incidente.

A correção de diagnóstico de **fix/deployment-failure-diagnostics**, baseada na main remota 35a4e89 e preservando o padrão Git em inglês, foi integrada no PR #3 como **0.6.5**: registrar phase/código técnico seguro nos logs, resumo e relatório; preservar resultado incerto, exceções e política sem retry de escrita/rollback automático. Texto do validador agora orienta inglês. Não houve alteração de src/, migrações ou dependências. Essa base permitiu identificar o UND_ERR_SOCKET no recheck-main da execução seguinte, descrito acima; a causa física do encerramento continua não comprovada.

**Verificação da correção:** 123 testes unitários aprovados, incluindo os novos diagnósticos; integração financeira não foi repetida, pois não foi alterada. Tipos, sintaxe, formatação e build completo Cloudflare/TypeScript com dry-run/inspeção de pacote aprovados em cópia isolada por `npm run deploy -- --build-only`. Nenhum upload real.

As consultas iniciais de produção e migrações passaram antes do build da execução remota; não solicitar novamente permissões sem um erro que indique essa necessidade. O token foi ampliado com D1 Read pelo responsável. Nenhum deploy, re-run, alteração de recurso ou consulta Cloudflare foi executado pelo agente neste bloco. Produção permanece com **última versão confirmada v0.6.3**; não foi feita nova conferência do estado global atual. Migrações locais/produção não foram aplicadas; integração da suíte continua descartável.

## Estado Git local e padrão atualizado (31/10/2026)

Antes do incidente, feat/deploy-github-actions foi integrado por fast-forward à main local com os padrões documentais. A branch fix/deployment-failure-diagnostics entregou os diagnósticos; a correção atual está em fix/deployment-api-connections, descrita acima. Novos desenvolvimentos usam branch própria feat/fix em inglês. O agente não executou push nem merge remoto.

Próximas branches, commits e títulos/descrições de PR serão em inglês, mantendo feat/fix e autoria do responsável, conforme AGENTS.md e CI.md. A entrega de deploy atual foi aceita como exceção; histórico e branch existentes preservados. Alteração apenas documental, sem novo build/teste, migração ou publicação. O texto de erro do validador foi atualizado na correção local descrita acima; a validação identifica prefixo/formato, não idioma.

## Base do workflow entregue em 31/10/2026

Branch **feat/deploy-github-actions**, criada da main remota ed422a7, com workflow em `.github/workflows/deploy.yml`. Essa base foi entregue como **0.6.4** e chegou ao Actions, onde falhou sem iniciar upload; código local atual é **0.6.6**, conforme a correção acima. Contrato aprovado em [CI.md](CI.md): versão escolhida no PR, título feat/fix como mensagem Cloudflare, validação no PR/main, build isolado, consulta de nomes de migrações, deploy após merge na main e tag Git imutável somente após confirmar tag/commit e 100% do tráfego. Scripts compartilhados preservam publicação manual; CI usa token em vez do perfil OAuth local. Regra feat/fix e autoria do responsável registradas em AGENTS.md. Nenhum arquivo src/ foi alterado.

**Verificação local:** **158 testes aprovados** em sete arquivos (110 unitários, incluindo 35 cenários novos de publicação/API/envio, e 48 de integração). Tipos, sintaxe dos scripts, YAML/estrutura do workflow, SHAs das actions oficiais, formatação, build completo Cloudflare/TypeScript, dry-run e inspeção de pacote aprovados. Build executado por `npm run deploy -- --build-only` em cópia temporária; nenhum upload. Simulações de publicação usam APIs e envio controlados, sem rede de produção. Não houve servidor Next, navegador ou screenshot.

**GitHub:** responsável confirmou por imagens ambiente cloudflare-workers, secret CLOUDFLARE_API_TOKEN e restrição à main. O agente conseguiu leitura do remoto, mas a simulação de push falhou sem credenciais; responsável fará push, PR e merge. A primeira execução real está documentada no diagnóstico acima e falhou após o build, sem iniciar envio. **D1 Read** foi adicionado pelo responsável e a consulta inicial de migrações passou; Workers Editor sozinho não permite consultar D1. Sem essa permissão o fluxo bloqueia antes de publicar. Proteção da main pelo check Testes, tipos e versão pode ser configurada após ele aparecer.

**Produção e migrações:** última produção confirmada continua **v0.6.3**. Nenhuma migração nova, aplicação no D1 de desenvolvimento/remoto, alteração de recursos, consulta Cloudflare ou deploy real neste bloco. Testes usam bancos descartáveis. A execução real confirmou as consultas iniciais de metadados e migrações, mas a publicação e as reconferências após o build não foram concluídas; não confundir isso com sucesso do deploy. Migrações remotas continuam manuais com autorização explícita. Uma falha de envio/confirmacão exige conferir o relatório/estado remoto, sem repetir upload ou rollback cegamente.

## Base de testes entregue em 30/10/2026

Suíte autorizada e implementada conforme [TESTING.md](TESTING.md): **123 testes aprovados**, sendo **75 unitários e 48 de integração**, em cinco arquivos. Vitest 5.0.5 e Miniflare 5.20261019.2-beta fixados no package/lockfile; esta versão do Miniflare já era utilizada pelo Wrangler. Casos de uso/repositories reais, migrações SQL reais e D1/R2 descartáveis com dados sintéticos. Cobertura: dinheiro/datas/inputs, saldos e operações financeiras, catálogo/snapshots, repetição, concorrência/guardas D1, vínculos/exclusão, Home, sessão/login/perfil e comprovantes privados. Propriedades enviadas aos componentes cliente pelas páginas de insumos/movimentações verificadas sem navegador.

**Verificação:** `npm run test:unit` aprovado; integração executada e depois suíte completa `npm test` aprovada (123 testes, cerca de 52 segundos). `npm run typecheck` aprovado, incluindo os testes. Build completo Cloudflare/TypeScript, dry-run e inspeção de pacote aprovados por `npm run deploy -- --build-only`, em cópia temporária isolada; nenhum envio. Formatação dos arquivos alterados conferida. Configuração Vitest não carrega `.env`; o emulador usa loopback/portas aleatórias, encerra ao finalizar e remove somente seu diretório descartável.

**Separação de ambientes:** nenhum arquivo de aplicação em src/ alterado; alterações locais somente na suíte, configuração/dependências de desenvolvimento e documentação. Nenhuma migração aplicada ao D1 de desenvolvimento ou remoto; as migrações foram executadas apenas nos bancos descartáveis. Produção permanece v0.6.3, sem novo deploy, versão ou consulta remota neste bloco. Testes funcionais da interface continuam com o responsável; não houve servidor Next, navegador ou screenshots.

**Dependências:** `npm audit` identificou oito avisos (cinco altos/três moderados) na cadeia de OpenNext/glob/minimatch e Miniflare/undici/Wrangler. Vitest não apareceu entre os pacotes sinalizados. Miniflare já existia de forma transitiva e agora é dependência direta de testes na mesma versão. Não foi executado audit fix, downgrade ou atualização da stack; correção desses avisos exige avaliação separada, sem tratar a instalação da suíte como revisão completa de segurança.

## Produção e trabalho local

| Item             | Estado confirmado                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| Produção         | **v0.6.3**, Cloudflare `59ffc4c2-247e-4ee4-99d9-bd52a99c08fc`, 100% de tráfego confirmado na publicação |
| Endereço         | https://cantina-contabil.devibpv3.workers.dev                                                           |
| Projeto/lockfile | **0.6.6 local**, recuperação de conexão no CI; última produção confirmada 0.6.3                         |
| D1 remoto        | Migrações até **0022**, nenhuma pendente na conferência remota de 28/10/2026                            |
| D1 local         | Migrações até **0022**, com backup e preservação de dados conferidos                                    |
| Comprovantes     | R2 privado `cantina-contabil-receipts`, binding RECEIPTS; r2.dev desativado. Local emulado, separado    |

Publicações e pontos de recuperação anteriores: [RELEASES.md](RELEASES.md). Ambiente, migrações e procedimento de deploy: [LOCAL.md](LOCAL.md).

### O que já está publicado

- Nome Ministério Contábil, login externo, sessão interna assinada de até 2 horas, Meus dados e logout. Expiração detectada em operação/comprovante redireciona para /login.
- Layout persistente, navegação lateral/drawer, breadcrumbs e transição sutil sem atraso artificial ou conteúdo escondido.
- Caixas, doações recebidas, eventos/produtos/pedidos, insumos e Movimentações. Paginação de 15; saldos real/pendente e histórico com autoria/snapshots.
- Pedidos em página própria, filtro Todos/Pendentes/Pagos, busca por pessoa, A–Z antes da paginação, único valor ajustável inclusive zero, Pix inicial e pagamento dinheiro/Pix/misto. Observação truncada apenas na lista. Todos os pedidos ativos contam nas unidades vendidas; apenas pagos entram na composição Dinheiro/Pix.
- Insumos: compras de qualquer caixa com saldo suficiente/débito imediato ou doação Pendente/Recebido sem efeito financeiro; descrição opcional, nome opcional do doador, ícones, até 5 comprovantes de 5 MB. Detalhes/edição/exclusão lógica e arquivos privados preservados no histórico.
- Movimentações: registrar/consultar/editar/excluir entradas/saídas, com caixa, valor positivo, data e justificativa obrigatória. Bloqueio de saldo negativo, inclusive ao reduzir/excluir entrada utilizada, e histórico nos caixas afetados.
- Busca compartilhada automática após 350 ms, preservando filtros/digitação; contorno da busca corrigido. Pedidos/Insumos/Histórico cabem em três colunas no celular, com texto e alvo mínimo de 44px.

## Base funcional — v0.6.0

- Home final: resumo Real/Pendente e quatro blocos — Doações, Movimentações, gráfico Saldo por caixa e Próximos eventos. Sem listas de últimas movimentações/pedidos pendentes ou novas fórmulas financeiras.
- Padrões visuais refinados com o responsável: cabeçalhos/menu discretos, subtítulos explicativos ocultos no celular, doações resumidas com detalhes em modal, ações dos insumos à direita e organização financeira do evento no celular. Desktop preservado conforme contrato.
- Login/logout sem ErrorModal indevido de redirect; exclusão bloqueada de caixa fecha a confirmação ao dispensar o erro. Filtro/reverter na mesma linha.
- Backend com Zod para contratos GestPV/sessão; sem catches genéricos de HTTP/JSON/R2 e consultas D1. Nove catches específicos para constraints e token/cookie malformados. Logger protege payload em SyntaxError. Injeção manual por composition.ts consolidada no contrato; sem container novo.
- Desenvolvimento acessível por localhost e IP da rede na porta 5174; Worker/debug em loopback. Configuração de desenvolvimento retorna novo objeto, sem mutar configuração congelada.
- Deploy em cópia temporária privada sem .env/credenciais/estado local. Build completo, TypeScript, verificação do pacote e dry-run aprovados; envio validado por tag/descrição/bindings e 100% do tráfego. Nenhuma migração aplicada, nenhuma alteração de dados ou novo recurso remoto. SESSION_SECRET existente preservado e confirmado apenas pelo nome.
- README apresenta origem no GestPV, finalidade, capacidades atuais, visão futura, Cloudflare/Miniflare e acesso. Contratos atuais em AGENTS/ARCHITECTURE/DESIGN/UX-CONTRACT/LOCAL; histórico em RELEASES.

## Código local, migrações e produção

Projeto/lockfile 0.6.6 local para a correção de conexão descrita acima. Última publicação 0.6.3: Insumos acompanha Dinheiro/Pix como informação discreta, sem mudar o cálculo. Publicado com build isolado Cloudflare/TypeScript e dry-run aprovados; revisão estática de composição, sem teste funcional/navegador. Tag v0.6.3, versão 59ffc4c2-247e-4ee4-99d9-bd52a99c08fc, deployment 27a09605-57e2-4c7f-98b1-dc3d1d0c8609 e 100% do tráfego confirmados. Após a publicação, foram adicionados localmente a suíte de testes e o workflow descritos no início deste documento, sem alterar o comportamento da aplicação nem publicar novamente. D1 local permanece documentado até 0022, sem novas migrações locais nesta conversa; D1 remoto consultado em leitura e sem pendências. Estado local e arquivos de desenvolvimento não foram enviados à produção.

O pacote novo não inclui os valores privados locais conhecidos, nem arquivos de ambiente; origens de desenvolvimento não alteram produção. Artefatos locais antigos podem conter variáveis locais geradas pelo OpenNext e continuam privados/ignorados; não apagá-los enquanto em uso. A chave de produção vem dos Secrets do Worker. Não afirmar ausência de todo segredo desconhecido no código apenas por essa verificação.

## Insumos publicados — v0.6.2

Cards de insumos abrem o modal existente de detalhes por clique/toque ou teclado; link do caixa e ações continuam independentes. Situação financeira do evento exibe Insumos: soma das compras ativas daquele evento, pagas por qualquer caixa; doações e excluídos não entram, ausência de compras resulta em R$ 0,00. Real/Pendente permanecem iguais, sem cálculo de lucro. Publicado por solicitação explícita, tag v0.6.2, versão ca2048ae-41ae-4bb0-bb53-610c0529604d e deployment 9af21f5f-5ae2-487a-93e2-b53a1d4fb705, 100% do tráfego confirmado. Sem migração. Build isolado completo Cloudflare/TypeScript e dry-run aprovados, com inspeção do pacote. Revisão estática de JSX/CSS; sem navegador ou teste funcional, conforme contrato.

## Marca publicada — v0.6.1

Logo MC (opção 1) aprovado e publicado no Brand de login/cabeçalho, favicon e Apple icon. Login com marca ampliada (64px/52px) e revelação de texto por 1s, respeitando movimento reduzido; header compacto preservado. Original em logos/, assets leves em public/brand. Build isolado completo/TypeScript, dry-run e inspeção de pacote aprovados. Sem migração ou teste funcional/navegador pelo agente. Versão a9d5e6fd-a2e9-4628-8430-f7e95cf645a6, deployment 3d5cb6c0-4d83-421e-a68f-d657cf79ad5d, tag v0.6.1 e 100% de tráfego confirmados.

**Domínios pendentes:** Wrangler reativou workers.dev/prévias porque as opções não estão no config; consulta antes do término confirmou ambos desativados. Restauração rejeitada pela revisão automática por falta de confirmação do alcance; não executada. Pergunta ao responsável pendente para desligar ambos ou somente prévias; não alterar sem resposta. Domínios personalizados não foram modificados.

## Padrões que não devem regredir

- Donos: [arquitetura](ARCHITECTURE.md), [design](DESIGN.md), [UX](UX-CONTRACT.md). Backend por funcionalidade, Drizzle na infraestrutura e Zod nos inputs; use cases validam independentemente das Actions. executeOperation/handleFailure/logger, useServerAction e ErrorModal compartilhados.
- Minimalismo com hierarquia/agrupamento. Cards em insumos, blocos suaves nos produtos do pedido e painéis aprovados na Home; outras listas mantêm separadores. Sem novo tema ou conversão de outras telas por iniciativa própria.
- Button é dono dos ícones: padrão mobileIcon abaixo de 600px; **ações diretas Editar/Excluir abaixo de 1024px** via iconBreakpoint=tablet; layout/drawer em 768px. Form-grid com duas colunas a partir de 1024px; campos relacionados, nome/textos longos em linha própria. Insumos usa formCompact.
- MoneyField/DateField e máscaras centrais; tokens e z-index globais. Busca automática só no SearchForm compartilhado. Dados completos permanecem na edição/detalhes/histórico quando o resumo trunca.
- Real/Pendente somente, sem pagamento parcial nem valor recebido separado. Não transformar a correção entre caixas de insumos/movimentações/doações em transferência bancária automática. Regras de saldo negativo são por operação aprovada, não uma autorização para alterar silenciosamente pedidos antigos.

## Visão futura, sem autorização de implementação

README apresenta a motivação de organizar finanças dos ministérios/eventos da igreja e a intenção de evoluir para pagamentos integrados, fluxo de comandas e endereços/rotas para entregas. São direções de produto, sem contrato de funcionamento, arquitetura ou implementação aprovados. Não iniciar essas funcionalidades por esta documentação.

## Pendências reais

- **Segurança:** validação da assinatura do JWT externo ainda pendente, aceita temporariamente; sessão HMAC e GET de perfil não resolvem essa pendência. Detalhes em ARCHITECTURE.md.
- **Resultado do evento:** lucro não foi solicitado e não é calculado. O indicador Insumos soma somente compras ativas, conforme contrato abaixo.
- **Verificação funcional:** com o responsável, incluindo doações editáveis, comprovantes de movimentações e alterações responsivas. Build não comprova navegação, Android, qualidade visual ou carga de uploads.
- **Armazenamento:** reconciliação de objetos R2 sem vínculo após falha D1 continua pendente; não apagar arquivos de resultado incerto ou históricos automaticamente.
- Anexos gerais de doações, cobrança online, filas/WS, API própria/OpenAPI, transferências pareadas e GitHub continuam fora deste bloco.

## Verificações e limites para retomar

Build completo Cloudflare, incluindo TypeScript, aprovado na cópia isolada da v0.6.0, junto do dry-run e inspeção de arquivos/valores privados conhecidos no pacote final. A antiga falha de --showConfig foi diagnosticada como EPERM da execução restrita da ferramenta, não falha do projeto. Sintaxe e formatação dos scripts/documentos conferidas. Sem navegador/servidor ou teste funcional executado pelo agente; responsável revisou imagens e orientou os refinamentos. Conferência funcional/visual final continua com o responsável.

Publicação v0.6.0 concluída: versão 3a4be970-94d5-4dd9-a220-59e3bd737e26, deployment 51a72a5e-5b10-4b8b-bcd6-dd5a305518f5, 100% de tráfego. D1 sem migrações pendentes; nenhum dado migrado nesta entrega. Histórico e recuperação anterior permanecem em RELEASES.md.

O responsável mantém npm run dev no próprio terminal. Não encerrar/recriar sua instância, apagar .wrangler/state nem sobrescrever .next/.open-next em uso. Para build completo enquanto o ambiente estiver aberto, usar npm run deploy -- --build-only, que não publica. Novos deploys, migrações remotas e alterações de recursos exigem novo pedido explícito. Não exportar dados de produção para arquivo local por conveniência.
