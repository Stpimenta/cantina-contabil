# Banco, integridade e auditoria

Contrato atual. Leia somente ao alterar este assunto. [Escolher outra leitura](../README.md).

## Banco e integridade

- Binding DB; D1 publicado cantina-contabil. `shared/infrastructure/database.ts` monta o Drizzle com o binding D1, somente no servidor. Cada repository de infraestrutura recebe essa conexão; use cases e contratos de repositories não dependem do ORM.
- Migrações existentes: 0001_cash_boxes.sql, 0002_cash_box_audit.sql e 0003_donations.sql; o bloco de eventos acrescenta 0004_events.sql até 0009_event_audit.sql. Não editar depois de aplicadas; mudanças exigem nova migração. Schemas Drizzle ficam separados por tabela; uma migração SQL pode coordenar os objetos da alteração.
- IDs UUID; autoria vem da sessão, nunca de campos enviados pela interface. Datas técnicas ISO/UTC, exibidas em America/Sao_Paulo.
- Toda movimentação tem data de ocorrência e data/autor do registro. Soft delete preserva registro, data e autor; não criar exclusão física como operação de negócio.
- Movimentações manuais seguem a fronteira atômica e regras aprovadas em funcionalidades/movimentacoes.md; transferências automáticas futuras precisam de decisão própria. Soft delete não autoriza alterar silenciosamente o financeiro.

## ORM e schemas

- Drizzle ORM 0.45.4; organização por funcionalidade preservada. Um arquivo `.schema.ts` por tabela na infraestrutura do dono: cash-box.schema.ts, cash-box-audit.schema.ts e donation.schema.ts.
- Schemas mapeiam colunas, tipos e referências para consultas/gravações; não substituem os models da aplicação. Dependências entre schemas representam vínculos existentes no banco.
- CRUD, contagens, filtros e opções usam o construtor tipado. Agregação de saldo e UNION do histórico usam o template `sql` do Drizzle, mantendo parâmetros separados dos dados e a ordenação anterior.
- As migrações SQL existentes continuam sendo a fonte de criação e integridade: índices, CHECKs e triggers de auditoria/saldo permanecem em migrations/. Os schemas de consulta não são uma descrição completa desses objetos. Não usar push nem gerar diferenças automáticas a partir deles, pois isso poderia remover proteções.
- A adoção do ORM não exige recriar tabelas nem aplicar migrações: o banco existente permanece compatível. Novas mudanças estruturais exigem nova migração SQL versionada e atualização do schema correspondente. Wrangler continua aplicando migrações; não há Drizzle Kit ou segundo histórico de migrações nesta etapa.
- Erros de constraints são reconhecidos na cadeia limitada de causas do provedor, pois o Drizzle pode encapsulá-los. Preservar retornos de conflito, idempotência e concorrência dos repositories.

## Catálogo compartilhado de vendas

`events.kind` distingue eventos de categorias recorrentes, conforme [Produtos recorrentes](../funcionalidades/produtos-recorrentes.md#aplicação-no-código). Pedidos, pagamentos, insumos e auditoria financeira compartilham os registros existentes. Entradas físicas usam `product_stock_entries`; cada correção incrementa versão e acrescenta antes/depois em `product_stock_audit` por trigger na mesma gravação. Entradas de estoque excluídas preservam quantidade e metadados de exclusão; guardas impedem alteração posterior e saldo negativo também na exclusão, conforme migração 0033. `product_stock_balances` calcula entradas ativas menos quantidades retiradas no snapshot atual de cada pedido, sem saldo editável ou reservas. Triggers repetem as proteções de quantidade e disponibilidade durante a gravação, impedindo concorrência de produzir saldo negativo. As retiradas integram a versão imutável do pedido e sua auditoria existente.

Correções de várias entradas de estoque usam o D1 batch já adotado pelo projeto, em uma transação atômica com auditoria por entrada. As atualizações não ignoram versões conflitantes: o trigger exige versão anterior + 1 e aborta a transação inteira se houver conflito, exclusão ou saldo insuficiente. Exclusão física de entradas é bloqueada no banco. Adicionar com correções pendentes inclui a nova entrada no mesmo D1 batch, com sua auditoria de criação; as correções mantêm auditoria por entrada. Nenhuma gravação financeira adicional é criada por esse agrupamento.

## Histórico, paginação e datas

- Histórico de caixa usa UNION ALL da auditoria cadastral, auditoria de doações e auditoria dos eventos/pedidos vinculados, ordenado por data/hora técnica e ID estável. Categorias all/events/incoming/outgoing: incoming inclui doações e alterações de pedidos com pagamento atual ou anterior; events inclui cadastro de caixas/eventos e pedidos pendentes. Saídas inclui a auditoria das compras de insumos pagas pelo caixa consultado e movimentações de saída; Entradas também inclui movimentações manuais de entrada. Auditoria não é uma nova entrada financeira. Snapshots completos chegam ao detalhe sem consulta extra.
- Subconsultas correlacionadas de saldo qualificam explicitamente o ID do caixa externo com sql.identifier e os nomes do schema. Não interpolar somente cashBoxes.id nesses trechos: a simplificação de referências do Drizzle em SELECT de uma tabela pode remover o qualificador, tornando o ID ambíguo ou vinculando-o à tabela interna.
- Limite único DEFAULT_PAGE_SIZE = 15 em shared/pagination.ts; LIMIT/OFFSET no repository. Caixas ordena criação/ID, doações data civil/criação/ID e pedidos nome ascendente (COLLATE NOCASE), com criação/ID decrescentes para desempate. Página fora do intervalo é ajustada.
- Datas visíveis dd/mm/aaaa; auditoria acrescenta HH:mm em America/Sao_Paulo. DateField faz máscara/validação e entrega ISO; datas civis não sofrem conversão de fuso.

## Dependências na exclusão lógica

Somente dependências ativas impedem excluir caixas, eventos/grupos ou remover produtos do catálogo. A migração 0034_active_deletion_dependencies.sql alinha os triggers com essa regra; consultas de remoção de produto usam o mesmo filtro. Dependentes devem ser excluídos primeiro, sem cascata ou exclusão física. Guardas de saldo, estoque, retirada e concorrência permanecem. Registros, snapshots e autoria/data da exclusão são preservados. Não foi criada consulta de cadastros excluídos: o responsável aceitou manter a interface atual de histórico, que exige caixa/evento ativo; após excluir o cadastro principal, seus registros continuam armazenados, mas seu histórico próprio deixa de ser acessível pela tela atual.

## Contas excluídas

A migração 0035_account_soft_delete.sql acrescenta deleted_at e requires_activation_name ao cadastro, preserva os vínculos de identidade e estende a auditoria com deletedAt. Exclusão lógica bloqueia a conta, remove suas concessões e, na mesma gravação, revoga sessões, cancela convites e expira tickets não consumidos, preservando todos os registros. Reconvite mantém o ID e define novas permissões, exigindo nome na ativação. Regras e fluxo em [Autenticação e usuários](../funcionalidades/autenticacao-e-usuarios.md#exclusão-e-nova-ativação-de-conta). Nomes salvos em movimentações e snapshots não são atualizados.
