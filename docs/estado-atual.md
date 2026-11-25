# Estado atual — 24/11/2026

Retomada curta. Use o [mapa de leitura](README.md) e os contratos das áreas.

## Entrega local

- Branch feat/event-shared-stock, criada pelo responsável a partir de origin/main após atualizar a main. Base local 0.6.30; versão 0.6.31 preparada no pacote e nas duas entradas do lockfile, validada por validatePackageVersion contra a referência local origin/main 0.6.30. Implementação sem commit/envio pelo agente. Atualização remota não reconferida: Git permanece somente leitura para o agente.
- Eventos selecionam produtos existentes de grupos recorrentes pelo seletor já aprovado, compartilhando físico/demanda e preservando preço, pedidos e caixa do destino. Não selecionam outro evento nem juntam produtos já cadastrados.
- Produtos e Eventos aceitam pedido sem estoque. Disponível desconta toda a demanda pendente; físico baixa apenas na retirada/entrega/Comanda. Falta na conclusão usa Adicionar tudo e salvar, com reposição e pedido atômicos. Desfazer devolve ao mesmo estoque.
- Operador com Alteração no evento conclui/desfaz com saldo existente sem acesso aos demais participantes. Vínculo e reposição manual/confirmada/correções continuam exigindo autorização conjunta. Links temporários não repõem; falta bloqueia a conclusão e orienta regularização pelo responsável.
- Regras em [Produtos recorrentes](funcionalidades/produtos-recorrentes.md#estoque-compartilhado) e [Eventos e pedidos](funcionalidades/eventos-e-pedidos.md#estoque-dos-eventos).

## Banco e produção

- Nova 0040_event_shared_stock.sql preparada, sem aplicação em banco local/remoto. Preserva migrações anteriores, referências de abertura, entradas, pedidos e auditorias; converte o cálculo dos eventos para físico menos conclusões.
- Nenhuma consulta de dados do aplicativo ou de produção, migração aplicada, deploy, tag, push, PR ou merge nesta entrega. Publicação e versão ativa não reconferidas.

## Revisão e pendências

- Revisão estática de código, fluxos de autorização, JSX responsivo e contratos. Cenários de integração ajustados/ampliados para regra comum, concorrência, confirmação, acessos temporários e preservação na migração.
- Testes, typecheck, build e app/navegador não executados, conforme orientação. Conferência funcional e execução final ficam com o responsável ou mediante pedido explícito.
- Conferir migração 0040 pelo fluxo autorizado e executar os grupos afetados, tipos e build isolado na revisão final antes do envio. Não declarar pronta para publicação sem esses resultados e comparação atual da versão remota.

## Consistência e exclusões

- Lista e planejamento agora consultam catálogo, participantes, físico e demanda em uma única instrução SQL. A autorização dos nomes/cenários usa os participantes do mesmo retrato. Sem novas tabelas, dependências ou migração adicional.
- Planejamento de semana/mês usa a Data do evento para Eventos e a Data de entrega para Produtos, conforme aprovação. Período altera somente a demanda.
- Removidos a Action, o caso de uso e a montagem da reposição antiga por item; confirmação continua junto da conclusão no batch existente. A Action anterior de retirada agora também revalida Eventos.
- Cenários acrescentados para excluir/reduzir pedidos entre origens, déficit de produção, desfazer e excluir, repetição sem nova liberação, exclusão concorrente com retirada, exclusão de entrada compartilhada e bloqueio após consumo, períodos mistos, leitura consistente e mudança de saldo antes do commit da confirmação.
- Revisão estática/formatação; cenários apenas preparados, sem execução de testes/tipos/build. A versão 0.6.31 desta mesma entrega foi preservada; migração 0040 continua não aplicada pelo agente.

## Ajustes após a suíte do responsável

- O responsável informou **440 testes aprovados e 4 falhas**, em 39 arquivos. Normalizado orderStockBalances para omitir stockId sem vínculo, conforme o contrato opcional, reaproveitando essa consulta no diagnóstico de falta.
- Dois testes de criação/repetição agora conferem o retorno inicial pelos seus campos e comparam a repetição ao registro completo persistido, incluindo os metadados adicionais do banco. Conferência de pedido único e de entradas permanece.
- O cenário de autorização usa o mesmo UUID em entryId/requestId, permitindo chegar à verificação de permissões em vez de falhar antes na validação da entrada.
- Correções revisadas estaticamente e formatadas; sem nova execução de testes/tipos/build pelo agente. Versão 0.6.31 preservada nesta entrega; migração local/remota não aplicada pelo agente.
