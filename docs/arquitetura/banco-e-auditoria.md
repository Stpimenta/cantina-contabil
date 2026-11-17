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

## Histórico, paginação e datas

- Histórico de caixa usa UNION ALL da auditoria cadastral, auditoria de doações e auditoria dos eventos/pedidos vinculados, ordenado por data/hora técnica e ID estável. Categorias all/events/incoming/outgoing: incoming inclui doações e alterações de pedidos com pagamento atual ou anterior; events inclui cadastro de caixas/eventos e pedidos pendentes. Saídas inclui a auditoria das compras de insumos pagas pelo caixa consultado e movimentações de saída; Entradas também inclui movimentações manuais de entrada. Auditoria não é uma nova entrada financeira. Snapshots completos chegam ao detalhe sem consulta extra.
- Subconsultas correlacionadas de saldo qualificam explicitamente o ID do caixa externo com sql.identifier e os nomes do schema. Não interpolar somente cashBoxes.id nesses trechos: a simplificação de referências do Drizzle em SELECT de uma tabela pode remover o qualificador, tornando o ID ambíguo ou vinculando-o à tabela interna.
- Limite único DEFAULT_PAGE_SIZE = 15 em shared/pagination.ts; LIMIT/OFFSET no repository. Caixas ordena criação/ID, doações data civil/criação/ID e pedidos nome ascendente (COLLATE NOCASE), com criação/ID decrescentes para desempate. Página fora do intervalo é ajustada.
- Datas visíveis dd/mm/aaaa; auditoria acrescenta HH:mm em America/Sao_Paulo. DateField faz máscara/validação e entrega ISO; datas civis não sofrem conversão de fuso.
