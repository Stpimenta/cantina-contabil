# Estado atual e retomada

Atualizado em **12/11/2026**. Ler [AGENTS.md](../AGENTS.md) e contratos donos: [ARCHITECTURE.md](ARCHITECTURE.md), [DESIGN.md](DESIGN.md), [UX-CONTRACT.md](UX-CONTRACT.md), [WEBSOCKET.md](WEBSOCKET.md). Preparação/envio em [DEPLOYMENT.md](DEPLOYMENT.md); ambiente em [LOCAL.md](LOCAL.md); histórico de publicações em [RELEASES.md](RELEASES.md).

## Código local, migrações e produção

| Item                 | Estado confirmado                                                                                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Worktree             | `/home/stpimenta/Desktop/Projects/cantina_contabil`, branch `feat/cantina-command-orders`; pasta normal do projeto, conforme pedido do responsável                                                                      |
| Base                 | `origin/main` **476a218**, após fetch de 12/11, merge do PR #8 contendo Eventos/Entregas **39315cc** e retomada **db4faed**                                                                                             |
| Código local         | MVP Cantina implementado e verificado localmente no commit **cff932c**, feat: add canteen pickup board and temporary access. Retomada documental conserva a mesma entrega/versão                                        |
| Versão local         | **0.6.10** nos três pontos do pacote/lockfile, incremento automático simples aprovado sobre main **0.6.9**, validado por validatePackageVersion                                                                         |
| D1 deste worktree    | Ambiente local iniciado pelo responsável; banco preservado e sem migração pelo agente. Histórico de migrações não reconferido neste ajuste                                                                              |
| D1 da pasta original | Entrega anterior documenta até **0024** com backups; não reconferido neste trabalho                                                                                                                                     |
| Migração nova        | **0025_canteen.sql**, somente arquivo versionado; não aplicada ao desenvolvimento/produção pelo agente                                                                                                                  |
| D1 remoto            | Última conferência documentada até **0022**; 0023/0024/0025 não reconferidas/aplicadas pelo agente neste trabalho                                                                                                       |
| Produção             | Última publicação confirmada documentalmente: **v0.6.6**, commit `97e648da93ae06924cfe513db870c5acef44e5cd`, Actions `41228319960`. Sem consulta/deploy nesta implementação; merge/tag/build não confirmam versão ativa |
| Recursos             | COMMANDS/CommandHub SQLite e migração de classe canteen-v1 preparados nos arquivos locais. Nenhum recurso remoto criado/alterado; R2/segredos/estado preservados                                                        |

## MVP autorizado e implementado

Autorização final de 12/11 substitui a suspensão anterior; a primeira tentativa de chat havia sido cancelada antes de trabalho. Decisão confirmada neste chat: **entrar/sair de Cantina é bloqueado com pedidos preservados, inclusive excluídos**. Padrão/Entregas e suas proteções anteriores permanecem.

- Terceira modalidade Cantina, comandas Aguardando retirada/Retirado com Desfazer, independente de pagamento e sem alterar cálculos financeiros. Nome/itens/observação, busca compartilhada, 15/página, mais antigos primeiro e filtro de retirados.
- WebSocket hibernado por evento no mesmo Worker, com recuperação por intenção/alarme durável antes do commit, fencing de operação tardia e publicação at-least-once. Sem polling/Queues. GET apenas do pedido afetado, IDs/contagem da janela e preenchimento dos IDs ausentes; abertura/reconexão enfileira avisos até sincronizar.
- Queda mantém registros, mostra aviso discreto e desabilita retirar/desfazer. Revogação/expiração mostra **Sua sessão foi encerrada** e encerra operações/conexão.
- Link temporário por evento com nome, data/hora escolhida, sugestão +2h e revogação. Segredos de 256 bits, hashes no banco, ativação explícita single-use e cookie próprio de navegador. Posse permite a primeira ativação, explicada na UI; sem fingerprint físico. Autor do acesso e criador são separados no histórico.
- API mínima de consulta, OpenAPI 3.1 gerado por schemas Zod e Scalar em `/api-docs`; spec em `/api/openapi`, ambos exigindo login normal. Tablet não recebe acesso financeiro/cadastro/edição/exclusão/Scalar. JWT externo não recebeu validação de assinatura neste escopo.
- custom-worker.ts reutiliza OpenNext e exporta CommandHub. RPC armCommands por WORKER_SELF_REFERENCE alcança o mesmo Worker, inclusive a partir do Next local, pois getPlatformProxy não executa DO interno. Porta 5174 encaminha somente o upgrade WS ao Worker local de loopback; nenhum serviço separado.
- Documentos donos consolidados substituindo suspensão/proibição antigas. README, RELEASES e arquivos preexistentes da pasta original preservados.

## Reorganização para a pasta normal do projeto

A pedido explícito do responsável, a implementação está agora em `/home/stpimenta/Desktop/Projects/cantina_contabil`, na branch `feat/cantina-command-orders`, versão **0.6.10**. O worktree 34a1 foi deixado em HEAD destacado para liberar a mesma branch; não houve cópia de banco/segredos ou nova implementação paralela. O worktree 94cc/feat/cantina-orders anterior não foi alterado.

O merge antigo da main local foi diagnosticado: todas as entradas do índice já correspondiam a origin/main 476a218, exceto STATUS.md em conflito. Antes de encerrá-lo, 90 arquivos alterados/não rastreados e o índice/metadados do merge foram guardados no backup privado `.wrangler/backups/before-canteen-handoff-20261113-000304.tar.gz` (horário UTC no nome, permissão 600), com bytes conferidos. Depois, o merge foi abortado e a branch existente da Cantina foi aberta na pasta normal, sem reset/rebase/reescrita de commits nem atualização/envio da main.

README.md, next-env.d.ts e docs-example/ preexistentes foram mantidos fora dos commits e comparados byte a byte com o backup após a troca. .env, D1/R2, backups e builds locais preservados. O processo principal de npm run dev da pasta normal foi encerrado a pedido do responsável, fechando seus filhos; portas 5174/8787 conferidas livres. Nenhum app foi reiniciado nem migração aplicada. Dependências alinhadas ao lockfile com npm ci, sem executar scripts de instalação.

A mudança de pasta não altera o código verificado; não repetir build/testes por essa reorganização. Conferir branch/versão, alterações preservadas, dependências, documentação e ausência de operação Git interrompida. A próxima execução de npm run dev será feita pelo responsável na pasta normal, ciente de que o fluxo aplica migrações locais pendentes.

## Correção da abertura do link temporário

Na mesma branch/entrega **0.6.10**, corrigida a perda da chave no desenvolvimento: o efeito lia o fragmento, limpava a URL e sua repetição pelo Strict Mode lia vazio, desabilitando Ativar acesso. Captura protegida por referência da instância montada, mantendo a chave somente em memória e a URL limpa. Sem mudança de layout, sessão, ativação explícita ou regras do acesso. Reabrir o link completo copiado; a aba que já perdeu o fragmento não consegue reconstruí-lo.

Regressão reproduzida antes da alteração; os **dois testes específicos** e os **cinco contratos de Cantina** passaram após a correção, assim como os tipos incluindo testes. Build completo Cloudflare/TypeScript isolado, inspeção de pacote e dry-run aprovados. Sem navegador, leitura de segredos, nova migração, parada/reinício do ambiente do responsável ou envio remoto.

## Verificação e limites

- **Build final 0.6.10 aprovado** após os ajustes de RPC, geração privada de OpenAPI, carregamento e privacidade do Scalar: Cloudflare/OpenNext/TypeScript em cópia temporária isolada, inspeção sem valores privados e Wrangler dry-run, **sem upload**. COMMANDS/DB/R2/WORKER_SELF_REFERENCE reconhecidos; bundle gzip de aproximadamente 2158 KiB. Isso não comprova produção nem consumo real de cotas.
- **Tipos incluindo testes aprovados**, geração OpenAPI antes do check, versão validada contra main 0.6.9, formatação global e diff conferidos. Uma quebra de linha do CSS do formulário de evento, já tocado pelo seletor, foi normalizada sem mudar geometria.
- Execução conjunta de sete grupos: **45 testes aprovados** (Cantina, Entregas, OpenAPI, janela por ID, carregamento, navegação e ambiente). Após os últimos ajustes de fallback/Origin, nova execução dos seis grupos afetados: **29 aprovados**. Execuções sobrepostas, não somar como total da suíte. Finanças/filtros de transporte também passaram na execução afetada anterior; três regressões de formato então encontradas na repetição do pagamento foram corrigidas e o grupo completo de Entregas passou depois.
- Cantina exercitou D1/DO reais no Miniflare descartável: retirada/desfazer, versão/idempotência/concorrência, preservação financeira/autoria, ativação em corrida, hashes, escopo/revogação/expiração, modalidade com excluídos, ordenação/paginação, criação/edição/exclusão versionadas, publicação automática com socket conectado após hibernação, RPC pelo mesmo Worker, handshake com Origin/cookie e encerramento automático no vencimento. Emuladores/sockets encerrados; nenhum banco do app alterado.
- Auditor estático estrito conserva somente os **três achados preexistentes** (dois DatePicker, um filtros de doações), fora do escopo; nenhum novo achado. Não declarar auditoria global sem achados.
- Revisão estática de componentes/CSS, celular/tablet/notebook/PC, nomes longos, quebra das ações, máscara do link, foco, erro e controles compartilhados. **Sem app/navegador/screenshot ou validação visual/funcional ao vivo.** Responsável fará teste manual, inclusive encaminhamento WS real em 5174.
- Dependências adicionais aprovadas: zod-openapi **6.0.2** e Scalar React **0.9.50**, compatíveis com Node 22.17 atual. Versões recentes de Scalar exigiam Node >=22.19 em dependências. Instalação final sinalizou **15 avisos de audit** (sete baixos adicionais na cadeia Scalar; três moderados/cinco altos anteriores). Sem audit fix/atualização ampla da stack. Telemetria, fontes remotas e agente externo do Scalar foram desabilitados; isso não elimina os avisos das dependências.

## Pendências antes de uso/publicação

Testes manuais da UI e conexão local ficam com o responsável. Nenhuma migração pelo agente; histórico local após a inicialização pelo responsável não reconferido. Recursos DO remotos não foram criados. Não iniciar/reiniciar ambiente nem aplicar migrações automaticamente.

Sem push/PR/merge/deploy pelo agente. Envio depende de novo pedido. Assinatura do JWT externo, reconciliação R2 sem vínculo, avisos de dependências e reconciliação da main original continuam pendentes e fora do MVP. Cliente cadastrar próprio pedido, índice alfabético, WhatsApp/rotas de entrega, pagamentos integrados, lucro e transferências continuam futuros.
