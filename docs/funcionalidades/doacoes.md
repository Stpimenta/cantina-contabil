# Doações — contrato da área

Contrato atual. Leia somente ao alterar este assunto. [Escolher outra leitura](../README.md).

## Regras e implementação

### Doações recebidas

- Caixa obrigatório, valor positivo, data civil, doador opcional até 100 e observação opcional até 500. Cadastro/consulta, edição versionada e exclusão lógica confirmada; sem estorno bancário, recebível ou anexo.
- Inteiros em centavos, conversão com BigInt sem ponto flutuante, limite Number.MAX_SAFE_INTEGER por valor/saldo. Validação na aplicação e D1; apresentação BRL preserva centavos.
- Data da doação YYYY-MM-DD, independente de created_at UTC. Ano filtra essa data. Retroatividade permitida; não foi estabelecida restrição de data futura.
- UUID por formulário é a chave da operação: mesmo autor/conteúdo retorna o registro existente; reutilização diferente é conflito. Sem retries automáticos.
- Triggers impedem gravar em caixa indisponível ou ultrapassar precisão de saldo. Edição e exclusão lógica foram autorizadas; retiram o efeito anterior antes do recálculo e bloqueiam saldo negativo nos caixas afetados. Registros excluídos são imutáveis e não entram no saldo/lista.
- Busca q somente pelo nome do doador, trim e limite de 100. LIKE parametrizado com escape de !/%/_, combinado com caixa/ano na contagem e listagem. Busca/filtros/paginação ficam na URL.

- Correção de doação pode alterar caixa, valor, data, doador e observação. Use cases validam dados/referência antes de consultar e usam BigInt para conferir o saldo final de ambos os caixas quando houver mudança. Bloquear redução/exclusão de entrada já usada quando resultar em negativo; D1 repete a guarda atomicamente com gravação e auditoria. Versão otimista, autoria de criação preservada e data/autor de alteração/exclusão.
- Migração 0021_donation_edit_soft_delete.sql acrescenta version/updated_at/updated_by/updated_by_name com metadados anteriores preservados; preenche a atualização inicial a partir da criação. donation_audit recebe snapshots iniciais das doações existentes, conservando autor/data/valores; novas operações registram antes/depois e caixa atual/anterior no histórico. Dados de doação não são apagados, snapshots são imutáveis; não somar auditoria ao saldo.

## Fluxo e interação

### Doações

- Resumo da lista mostra caixa, valor, data da doação e doador quando preenchido. Observação, autor e data/hora de registro ficam nos detalhes/histórico, sem removê-los dos dados.

- Nova doação abre DonationFormModal. Caixa, valor e data obrigatórios; doador/observação opcionais. Sem caixa, orientar cadastrar um antes.
- Data inicia no dia atual de America/Sao_Paulo. Guardar data civil sem fuso; autoria e data técnica ficam separadas.
- Sucesso fecha, mostra Doação registrada e atualiza lista/saldo/histórico. Mesmo ID/conteúdo não duplica o recebimento; erro incerto orienta conferir a lista.
- Cancelar com alterações usa ConfirmationModal. Erros preservam dados e apontam os campos.
- O nome do caixa na doação é um botão textual que abre Detalhes da doação em Modal compartilhado: caixa, valor, data, doador, observação e autoria de criação/alteração. Não navega ao caixa. Fechar/Escape retorna o foco ao nome; menu Editar/Excluir e histórico permanecem.
- Menu de três pontos RecordActionsMenu por doação, com Editar e Excluir; sem opção Detalhes no menu: o nome do caixa abre esse modal, e os snapshots continuam no histórico. Edição usa DonationFormModal preenchido e os mesmos validadores/erros/foco/campos do cadastro. Caixa/valor/data/doador/observação podem ser corrigidos, com versão otimista e saldo recalculado nos caixas afetados.
- Excluir exige confirmação curta no padrão compartilhado. Exclusão é lógica; doação some da lista e deixa de somar ao saldo, mantendo autoria e snapshots. Bloquear edição/exclusão se qualquer caixa afetado ficar negativo, preservando o contexto e mostrando ErrorModal. Sem estorno bancário ou anexos.
- Sucesso de edição/exclusão fecha o modal, mostra toast e atualiza lista/saldos/históricos preservando busca/filtros/página. Histórico de Entradas mostra Doação recebida/atualizada/excluída, autor e detalhes antes/depois, inclusive no caixa anterior ao corrigir o vínculo.

- Títulos estáticos não recebem aparência de link. Em Doações, o nome do caixa é uma ação explícita de abrir detalhes, com botão textual acessível; o restante do corpo permanece estático e Editar/Excluir ficam no menu próprio.

## Composição visual

### Doações

- Doações mantém lista com separadores e aparência aprovada. Nome e valor ocupam a primeira linha no desktop, com menu à direita. Abaixo de 600px, nome e valor ficam agrupados à esquerda, valor abaixo do nome, seguido somente de data da doação/doador com intervalo de 4px; somente o menu ocupa a coluna direita, preservando 44px e espaço para textos longos. Observação, autor e horário do registro ficam somente em detalhes/histórico, em todas as larguras. Corpo sem navegação implícita; o nome abre detalhes conforme contrato. Três pontos disponibilizam apenas Editar/Excluir, com os mesmos ícones, alinhamento, teclado e foco do dono compartilhado. Edição reutiliza DonationFormModal size=form e sua grade atual, sem novo tema/card. Detalhes de snapshots completos permanecem no histórico do caixa.

## Busca e filtros da área

- Doações tem botão Filtros com texto e contagem quando ativo. Abre DonationFiltersModal com Caixa/Ano atuais. Cancelar/Escape/fechar descartam escolhas não aplicadas; Aplicar filtros navega e fecha ao concluir. Durante navegação, desabilitar campos/aplicar/fechar.
- Aplicar busca preserva Caixa/Ano; aplicar filtros preserva q. Paginação preserva os três. Limpar busca remove só q; Todos os caixas/Todos os anos removem os respectivos filtros.
- Não há seta externa de limpar filtros em Doações: foi revertida pelo responsável. Não reintroduzir. A busca voltou ao limite de 768px; no celular ocupa a primeira linha e Filtros fica abaixo.
- Doações: botão Filtros com contagem quando ativo abre modal padrão com Caixa/Ano e Cancelar/Aplicar filtros. Não há botão externo de reverter.
