# Estado atual e retomada

Atualizado em **11/11/2026**. Contratos atuais em [ARCHITECTURE.md](ARCHITECTURE.md), [DESIGN.md](DESIGN.md), [UX-CONTRACT.md](UX-CONTRACT.md) e [AGENTS.md](../AGENTS.md). Histórico de publicações em [RELEASES.md](RELEASES.md); preparação de entrega em [DEPLOYMENT.md](DEPLOYMENT.md).

## Código local, migrações e produção

| Item      | Estado confirmado                                                                                                                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch    | `feat/event-deliveries`, já existente e reutilizada para este escopo; HEAD e `origin/main` em `d75e8ad` após fetch de 11/11, sem divergência entre essas referências                                        |
| Código    | Implementação/documentação consolidadas nesta branch; commit e push autorizados em 11/11, confirmação de execução no chat/histórico Git. Sem PR/merge/deploy pelo agente; main local preservada             |
| Versão    | Pacote/lockfile em **0.6.9**, incremento simples autorizado sobre origin/main **0.6.8** e validado nos três pontos. Preparação local automática pelo agente; CI não modifica o pacote                       |
| D1 local  | Migrações até **0024**, aplicadas com backups privados e conferência de preservação                                                                                                                         |
| D1 remoto | Última conferência documentada até **0022**; 0023/0024 não aplicadas pelo agente nem reconferidas remotamente neste encerramento                                                                            |
| Produção  | Última publicação confirmada documentalmente: **v0.6.6**, commit `97e648da93ae06924cfe513db870c5acef44e5cd`, Actions `41228319960`. Não reconferida; tag recebida ou build local não confirmam versão ativa |
| R2        | Produção preservada; emulação local separada; sem novos recursos neste escopo                                                                                                                               |

## Escopo implementado nesta branch

- **Evento:** seletor Modalidade com Padrão/Entregas, apenas rótulos do booleano existente. Produtos opcionais no cadastro e inclusão posterior na edição; erros próprios de nome/preço. Modal compacto, Caixa em linha inteira e Data/Modalidade lado a lado somente a partir de 1024px; Adicionar produto dimensionado pelo conteúdo.
- **Entrega/retirada:** somente em evento habilitado, pedido novo/editado exige modalidade explícita, com endereço separado e telefone opcionais. Endereço iniciado exige essenciais; CEP/UF/DDD validados. Concluir/desfazer é independente do pagamento; dados/autoria/snapshots preservados. Legados seguem sem modalidade até a edição. Desativação bloqueada quando houver dados de transporte preservados, inclusive em pedidos excluídos.
- **Pedido em etapas:** Pedido → Entrega ou retirada → Pagamento em formCompact, com dados preservados, validação Zod por grupo, foco e envio único. Sem entregas, formulário simples. Cancelar oculto abaixo de 1024px somente no formulário em etapas; X mantém descarte. Quantidade fica à direita do nome também no celular, mantendo controles de 44px.
- **Situação rápida:** + iconOnly em todas as larguras substitui Marcar como pago. Modal único permite salvar pagamento, entrega/retirada ou ambos atomicamente. Pagamento confirmado não é refeito/desfeito nessa ação; transporte pode ser concluído/desfeito sem mudar parcelas. Legado sem modalidade pode pagar, mas define transporte na edição. Preserva valor, itens, pessoa, observação, endereço, contato, versão/idempotência e histórico.
- **Filtros de pedidos:** Pagamento e, somente em eventos habilitados, Entrega ou retirada: Todas/Não concluídas. Inclui legado não concluído; exclui concluídos/excluídos. Combina nome/pagamento/transporte no banco antes da contagem/paginação de 15, preservando parâmetros e contagem de filtros ativos. Evento comum ignora filtro de transporte.
- **CEP e máscaras:** BrazilianMaskedField e funções centrais de CEP/telefone; dinheiro/datas mantêm seus donos anteriores. Consulta ViaCEP em `server/addresses`, por action/use case/contrato/adaptador HTTP, com sessão/perfil, Zod, timeout e executor de erros existentes; sem banco próprio. Só consulta CEP completo editado, preserva campos corrigidos durante a busca e dados não postais, descarta respostas antigas e permite preenchimento manual. CEP inexistente é distinto de falha. Maps continua busca externa manual, sem confirmar endereço ou organizar rota.
- **Saldos e navegação:** olhinho na Home (canto superior direito dentro da faixa creme) e lista/detalhe dos caixas, valores inicialmente ocultos, escolha preservada no AppShell e barras mantidas. Voltar discreto à direita dos breadcrumbs nas páginas secundárias, com ancestral imediato e fallback desabilitado.
- **Textos:** Buscar pelo nome em Caixas/Eventos/Pedidos; Buscar por doador em Doações, incluindo fallbacks. Estado sem produtos: Adicione produtos para cadastrar pedidos. Exclusões das seis áreas: título Excluir [tipo]? e corpo compartilhado O histórico será preservado.; regras, ações, foco e descarte de formulários mantidos.

Nenhuma alteração de cálculo financeiro, transferência, estorno, pagamento parcial ou cobrança externa foi aprovada. Documentos donos consolidam os contratos atuais; instruções superadas foram substituídas.

## Migrações e preservação local

| Migração                        | Aplicação local documentada                                                                         | Backup privado, ignorado pelo Git                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `0023_event_deliveries.sql`     | 01/11/2026, habilitação e guardas                                                                   | `.wrangler/backups/before-event-deliveries-20261101-193559.sqlite` |
| `0024_legacy_order_payment.sql` | 04/11/2026, substitui somente guarda de atualização para pagamento de legado com transporte intacto | `.wrangler/backups/before-quick-payment-20261104-025958.sqlite`    |

Backups com permissão 600. Integridade (`quick_check`), chaves estrangeiras, colunas/linhas anteriores, histórico de migrações e índices/triggers conferidos, exceto as mudanças previstas nas migrações. Metadados internos `_cf_METADATA` excluídos da comparação. Nenhum banco remoto foi alterado. As ampliações de 11/11 não exigiram novas migrações. O Actions apenas consulta migrações e bloqueará a publicação enquanto 0023/0024 estiverem pendentes no remoto; aplicação remota depende de solicitação explícita.

## Verificações realizadas

- Execução completa anterior às ampliações de 11/11: **235 testes aprovados**. Não apresentar esse número como execução completa da árvore atual.
- CEP/máscaras: **60 testes afetados aprovados**, incluindo adaptador HTTP com transporte controlado e entregas em D1 descartável.
- Situação rápida independente/conjunta: **20 testes afetados aprovados**, cobrindo atomicidade, preservação de dados/saldos/parcelas, desfazer transporte, acesso, legado, exclusão, concorrência e repetição.
- Filtros combinados: **7 testes afetados aprovados**, com contagem/paginação no banco, busca, pagamento, legado, exclusão e saldos preservados.
- Olhinho e Voltar tiveram seus grupos afetados aprovados; verificações de produtos opcionais registraram 66 testes afetados. Esses grupos se sobrepõem: não somar os números como total da suíte.
- Tipos incluindo testes, formatação/diff e builds completos Cloudflare/TypeScript isolados com inspeção/dry-run aprovados nas alterações correspondentes. Último build aprovado após o ajuste de rótulos Modalidade/Padrão/Entregas. Sem publicação.
- Revisão estática de composição/foco/erros e celular, faixas intermediárias, tablet e PC; sem app/navegador ou comprovação visual/funcional ao vivo pelo agente. O responsável realizou sua conferência local durante a conversa. Serviço ViaCEP real não foi exercitado pelos testes.
- Auditor estrito mantém **três achados preexistentes** fora do escopo: dois em DatePicker e um em filtros de doações. O achado do formulário de filtros de pedidos foi resolvido no componente tocado.
- Encerramento atual somente documental: revisão de conteúdo/links/formatação; sem repetir testes/build ou aplicar migrações. Nenhum servidor iniciado/reiniciado/encerrado pelo agente.

## Cantina e próximos assuntos

**Não implementar Cantina:** o responsável suspendeu expressamente essa implementação. A proposta de uma terceira modalidade inicialmente igual à Padrão não foi incorporada ao model, seletor, banco ou migrações. Diferenças, persistência e eventual autorização serão discutidas depois. Não criar branch/commit de Cantina para esta entrega.

Diagrama das tabelas/relações adiado para planejamento posterior. Seleção de entregas, responsável, WhatsApp e organização de rotas continuam futuros. API própria, pagamentos integrados, comandas, lucro, anexos gerais de doações, filas/WS e transferências pareadas também exigem planejamento específico.

## Preparação da entrega e limites

- Manter `feat/event-deliveries`; não renomear nem criar outra branch para o mesmo trabalho. Sugestão de título do commit/PR: `feat: add event deliveries and quick order updates`.
- Identidade Git do responsável configurada; ausência de merge/rebase em andamento. Não usar identidade Codex nem mexer na main local.
- Regra aprovada em 11/11: incrementar automaticamente somente o último número de X.Y.Z ao preparar nova entrega, sem classificação major/minor; preservar versão maior já preparada para a mesma entrega ao retomar. O workflow valida/publica/cria tag, sem alterar o pacote. Contratos atualizados em AGENTS/DEPLOYMENT/CI.
- Versão 0.6.9 sincronizada em package.json e nos dois pontos do lockfile; validatePackageVersion aprovada contra origin/main 0.6.8. Commit/push autorizados, sem autorização para abrir PR ou fazer merge. Conferir commit/remoto no histórico Git e no resultado do envio no chat.
- README não foi editado neste encerramento, conforme solicitação; sua alteração preexistente, assim como `next-env.d.ts` e `docs-example/`, foi preservada e não deve ser incluída automaticamente no commit desta funcionalidade. Esses materiais locais pertencem a trabalho anterior; a documentação da entrega permanece em docs/ e AGENTS.
- Push autorizado somente para feat/event-deliveries; PR/merge ficam com o responsável, migração remota/deploy manual continuam sem autorização. Este registro descreve a preparação anterior ao commit/envio; o resultado efetivo deve ser conferido no Git/chat. Preservar `.env`, estado D1/R2, backups, builds em uso e alterações existentes.
- Assinatura do JWT externo, avisos de dependências já documentados e reconciliação de objetos R2 sem vínculo permanecem pendentes. Nenhuma atualização de dependências/infraestrutura neste bloco.
