# Estado atual — 22/11/2026

Retomada curta. Use o [mapa de leitura](README.md) e os contratos das áreas. Resultados desta revisão não confirmam publicação.

## Entrega local

- Branch `feat/shared-product-stock`: entrega principal e rotas preservadas no commit `2a1f198`, enviado pelo responsável. Ajustes posteriores do filtro de Produtos e estoque permanecem locais, sem novo commit; publicação não confirmada.
- Estoque compartilhado entre produtos recorrentes, preservando preços, pedidos e respectivos caixas. Criação/edição permite selecionar produtos existentes para grupos novos/vazios; novos itens e vínculos são salvos no mesmo batch. Não duplica estoque físico. Desvincular exige escolher o saldo que acompanha o produto. Eventos não participam.
- Pedidos recorrentes já reduzem o disponível da lista, somando demanda pendente de todos os produtos vinculados, com mínimo zero. Cadastro sem estoque continua permitido e Detalhes mantém Falta produzir; o modal Estoque preserva o saldo físico e a retirada não desconta duas vezes. Alteração local com revisão estática e regressões acrescentadas aos cenários de vínculo/retirada; checagem final isolada de tipos aprovada, sem nova execução de testes/build.
- Planejamento abre Consolidado, com um único filtro de cenário no topo: Consolidado mostra todos, separados em vinculados (com ícone de elo) e sem vínculo; o filtro Produtos tem apenas Consolidado e Exclusivos do grupo (todos os produtos sem vínculo). Nomes não concatenam participantes. Períodos filtram somente demanda. Ajuste posterior ao commit revisado estaticamente, sem nova execução de tipos/testes/build. Reposição, correção, exclusão e retirada/desfazer usam o saldo comum, exigindo Alteração em todos os grupos. Histórico preserva origem e redistribuições. Regras em [Produtos recorrentes](funcionalidades/produtos-recorrentes.md#estoque-compartilhado).
- Interface simplificada: somente Vincular produtos existentes cria compartilhamento, com filtro por grupo de origem e lista de produtos com checkboxes à direita, centralizados verticalmente em cada linha; permite várias escolhas de uma vez e preserva a seleção entre grupos. Botão Selecionados (quantidade) confirma para o formulário. Produto manual começa com estoque próprio; preços continuam independentes. Ícone discreto de elos apenas informativo, sem abrir modal; na edição, fica junto ao rótulo do nome, sem se afastar em direção ao preço. Removidos Compartilhar estoque e os botões Histórico do estoque/Vínculos do produto do modal Estoque; auditoria e vínculos existentes preservados. Vincular dois produtos já cadastrados está em proposta, sem nova implementação. Revisão estática/formatação, sem novos testes/typecheck/build/navegador para esta alteração; conferência funcional fica com o responsável.
- Rotas: entregadores reutilizáveis, equipe e saída por evento, montagem manual, várias viagens, transferência atômica, conclusão automática e acesso temporário individual. Ordenação inicial por endereço, sem cálculo geográfico/API paga. Contrato em [Rotas e entregadores](funcionalidades/entregas-e-enderecos.md#rotas-e-entregadores).

## Preparação para envio

- Versão **0.6.30** preparada para o fix posterior ao envio de 0.6.29, sincronizada no pacote e nas duas entradas do lockfile; dependências inalteradas. `validatePackageVersion` conferida contra 0.6.29 do commit enviado e contra a referência local disponível de `origin/main`, 0.6.28. A main remota atual permanece sem confirmação: fetch bloqueado por `.git` somente leitura. Nenhum novo commit/envio pelo agente.
- Atualização remota **não confirmada**: `git fetch origin` falhou ao abrir `.git/FETCH_HEAD` por sistema de arquivos somente leitura. A consulta de referências com `git ls-remote origin` também falhou por resolução DNS de `github.com`. Tag `v0.6.29` não existe nas referências locais; estado remoto desconhecido. Conferir main/tag remotas antes de enviar.
- Identidade Git configurada do responsável conferida; sem conflitos de merge/rebase ou arquivos de credenciais rastreados na revisão. Nenhum commit/push/PR/merge/tag/deploy realizado pelo agente.

## Correções após a execução do responsável

- O responsável executou a suíte completa: **424 testes passaram e 3 falharam**. Corrigidos localmente: contexto de estoque normalizado como `null` também na primeira resposta; teste de migração compara somente registros de auditoria, sem metadados físicos do D1; exclusão de grupo com entradas ativas preserva `STOCK_HAS_ENTRIES` antes da proteção de vínculo.
- A correção do guarda usa **0039_shared_stock_deletion_guard.sql**, aplicada em produção pelo responsável conforme log enviado, junto de 0037/0038. A migração 0038 foi preservada. Este fix do filtro não acrescenta SQL nem altera registros/auditoria.
- Revisão estática, formatação e diff das correções; sem nova execução da integração, pois a restrição de loopback do agente permanece. Os três cenários precisam ser repetidos no terminal do responsável. O aviso do Wrangler no teste de proxy não foi a causa das falhas; configuração preservada.

## Verificação final executada pelo agente

| Verificação              | Resultado real                                                                                                                                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm test`               | 289 testes unitários passaram, em 25 arquivos. Os 138 casos de integração, em 14 arquivos, falharam na preparação por `listen EPERM: operation not permitted 127.0.0.1`; comportamento D1 não foi validado. Não substituir por banco do aplicativo/remoto.                     |
| TypeScript isolado       | `tsc --noEmit --incremental false` passou novamente na revisão final, incluindo o desconto de pedidos pendentes, em cópia temporária sem `.env`, credenciais ou estado, com código/testes, dependências independentes e tipos de rota disponíveis. Cópia removida ao terminar. |
| Build Cloudflare isolado | `npm run deploy -- --build-only` compilou o Next, mas parou na etapa de TypeScript: `Could not parse output from TypeScript's --showConfig`. O build completo, inspeção do pacote e dry-run não foram concluídos. Cópia temporária removida; builds em uso preservados.        |
| Formatação e diff        | Prettier aprovou novamente todos os arquivos alterados/novos compatíveis; `git diff --check` passou. Versão 0.6.29 validada contra a referência local 0.6.28; fetch novamente bloqueado por `.git` somente leitura.                                                            |
| Interface ao vivo        | Não iniciada pelo agente; não há validação funcional/visual pelo resultado de tipos ou compilação.                                                                                                                                                                             |

O TS7006 do batch de rotas informado anteriormente pelo responsável foi corrigido; a checagem isolada de tipos acima passou com essa correção. As tentativas bloqueadas não autorizam declarar a entrega pronta para publicação.

## Migrações e produção

| Ambiente                 | Estado confirmado                                                                                                                                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Código/SQL               | `0037_delivery_routes.sql`, `0038_shared_product_stock.sql` e nova correção `0039_shared_stock_deletion_guard.sql` presentes; 0038 e migrações anteriores preservadas.                                                                              |
| D1 local do aplicativo   | O responsável compartilhou log de 0038 aplicada e execução seguinte sem migrações pendentes. O agente não consultou nem alterou esse banco.                                                                                                         |
| D1/R2 e recursos remotos | Nenhuma consulta/migração/alteração nesta revisão. Log enviado pelo responsável confirma 0037/0038/0039 aplicadas no banco remoto configurado. Nenhuma aplicação pelo agente; integridade pós-migração e nova execução do CI ainda não confirmadas. |
| Publicação               | Não realizada; versão ativa não confirmada.                                                                                                                                                                                                         |

## Pendências

- Conferir main e tag remotas; ajustar versão caso a main tenha avançado, preservando a regra de incrementar somente o último número.
- Executar integração e build Cloudflare completo no terminal do responsável/CI com permissões normais; conferir funcionalmente a interface. As falhas de ambiente acima não validam as regras do D1 nem o pacote final.
- Repetir os três cenários corrigidos e aplicar 0039 pelo fluxo local normal do responsável. Antes da publicação, confirmar migrações remotas. SQL remoto exige pedido explícito; Actions apenas consulta os nomes e não aplica migrações. Não executar deploy manual para contornar checks.
- Preparar commit/envio após resolver as pendências. Agrupamento geográfico automático e WhatsApp permanecem fora do escopo.
