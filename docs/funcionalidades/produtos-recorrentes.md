# Produtos recorrentes — contrato da área

Contrato aprovado, com implementação local na branch feat/recurring-products. Código local não comprova migração aplicada ou publicação. Consulte o [estado atual](../estado-atual.md) e o [mapa de leitura](../README.md).

## Grupos de produtos e acesso

Produtos no menu abre os grupos de produtos (categorias no modelo). O detalhe de cada categoria reúne produtos, preços, estoque e acesso a Pedidos, Insumos e Histórico. Categoria representa vendas recorrentes, sem data de encerramento. Exemplo: Bolos de pote, com brigadeiro e maracujá, cada um com preço e estoque próprios.

Cada categoria pertence a um único caixa; operações financeiras seguem os contratos desse caixa. Administrador acessa tudo; financeiro consulta ou altera conforme a permissão do caixa; operador consulta ou altera somente os grupos explicitamente concedidos, conforme o contrato de Autenticação e usuários. A autorização é obrigatória no servidor, inclusive em consultas, gravações e comprovantes. A adaptação compartilhada de armazenamento foi aprovada: eventos e categorias têm tipos explícitos, com telas separadas e sem data fictícia.

## Produtos e estoque

Cada produto possui preço e estoque separados. O botão Estoque do produto abre um único modal para reposição, correção e exclusão lógica de entradas, sem exigir custo de produção ou compra. Não existe reserva ao cadastrar pedido, distribuição automática, sugestão de alocação nem produção direta sem estoque.

Entrada incorreta pode ser corrigida ou excluída logicamente, preservando autor, data/hora e os registros anteriores. Excluir retira do saldo somente a contribuição daquela entrada e mantém a quantidade original no registro excluído. Entradas excluídas não podem ser alteradas ou excluídas novamente; repetição idêntica da operação é reconhecida. Entrada incorreta pode ser corrigida. Corrigir de 20 para 15 reduz o saldo em 5; o servidor aplica somente a diferença e bloqueia qualquer saldo negativo, explicando quando retiradas anteriores impedirem a redução. Saldo, concorrência e histórico precisam permanecer consistentes em uma operação atômica, seguindo [Banco e integridade](../arquitetura/banco-e-auditoria.md).

## Pedidos e pagamento

Pedido contém um ou mais produtos de uma única categoria e pode ser cadastrado mesmo sem estoque. Reutiliza o registro de pedidos dos eventos e sua política de snapshots, quantidades, valor ajustável, pagamento, concorrência e histórico, descrita em [Eventos e pedidos](eventos-e-pedidos.md#pedido-e-pagamento-simples).

Data prevista de retirada é opcional. Somente retirada nesta versão, como padrão; não há entrega, endereço ou frete. Quantidades podem ser editadas, mas nunca reduzidas abaixo das já retiradas. Para isso, corrigir primeiro a retirada.

Pagamento mantém Pago/Pendente, com Pix, Dinheiro ou misto, sem pagamento parcial. Pagamento e retirada são independentes; correção de retirada não altera automaticamente o pagamento.

## Retiradas e correções

Retirada é sempre total: marcar Retirado dá baixa de todos os produtos do pedido, exigindo estoque suficiente para cada um. Não há retirada parcial ou edição de quantidade retirada por produto. O botão Mais (+) abre a lista completa dos itens e os seletores independentes de Pagamento e Retirada. Pagamento e retirada são salvos juntos na mesma atualização atômica quando ambos mudarem.

Voltar para A retirar devolve ao estoque todas as quantidades registradas; histórico preserva antes/depois, autor e data/hora. Registros parciais anteriores não são apagados nem convertidos automaticamente: o seletor permite concluir o pedido inteiro ou desfazer a retirada anterior. Aumentar quantidades de um pedido já retirado mantém retirada total, exigindo estoque adicional; reduzir abaixo da retirada exige primeiro voltar para A retirar. No celular, o resumo dos itens é limitado a duas linhas com reticências e as ações ficam abaixo, preservando largura de leitura. A lista completa está no Mais.

## Insumos

Reutilizar [Insumos e comprovantes](insumos-e-comprovantes.md), vinculando o registro à categoria: compras, doações materiais, recebimento, anexos privados, correções e comportamento financeiro existentes. Insumos não alteram automaticamente o estoque dos produtos prontos. Não exigir vínculo entre reposição e compra/doação de insumo.

## Histórico

Entradas e correções de estoque, retiradas e correções de retirada preservam antes/depois, autor da sessão e data/hora, conforme o contrato de auditoria em [Banco e integridade](../arquitetura/banco-e-auditoria.md). Não apagar ou sobrescrever o registro anterior para ocultar correções. Auditoria não duplica movimentação financeira.

## Interface e organização

Reutilizar composição, tokens, componentes, formulários, feedback e camadas existentes de Eventos. Não criar tema, dependências, infraestrutura ou arquitetura exclusivos. Regras de estoque e permissões são aplicadas no servidor; controles visuais refletem essas regras. A conferência funcional será feita pelo responsável; durante implementação, somente leitura direcionada e revisão estática, sem executar app, navegador, testes, typecheck ou build automaticamente.

## Aplicação no código

- Model `ProductCategory` identifica o tipo `product_category`; o catálogo compartilhado continua na tabela `events`, com discriminador `kind`. Eventos existentes permanecem `event`, com suas datas; categorias usam `occurs_on` nulo no banco e ausência de data na interface. O adaptador mantém string vazia no contrato legado compartilhado, sem inventar uma data.
- Telas em `/products`, `/products/[id]`, `/products/[id]/orders` e `/products/[id]/supplies`. Reutilizam os formulários, componentes e casos de uso financeiros de Eventos. A listagem e os próximos eventos excluem categorias. Vínculos diretos antigos de categoria em `/events/[id]`, pedidos e insumos redirecionam para Produtos após a autorização.
- Estoque no detalhe abre modal na mesma página, com `stock=<productId>` na URL. Nome e saldo lado a lado; nova entrada usa QuantityStepper compacto com −/número/+ e Adicionar. Sucesso atualiza o saldo e fecha imediatamente o modal.
- Cada lançamento mostra somente data/hora, input number compacto com a quantidade e lixeira. Autoria e detalhes de correção ficam exclusivamente no Histórico. Várias quantidades dos lançamentos carregados podem ser editadas como rascunho; nada é gravado por tecla. Salvar alterações no rodapé salva as correções em conjunto e fecha imediatamente o modal. Não há conferir/cancelar por linha nem modal extra de edição. Fechar/X com alterações não salvas pede descarte. Adicionar permanece disponível durante as correções. Como o modal fecha após sucesso, Adicionar com rascunhos grava a nova entrada junto das correções em um único D1 batch atômico; sem rascunhos, registra somente a entrada. Em falha, o modal fica aberto com os valores preservados. A rolagem e o carregamento continuam disponíveis com rascunhos; o limite técnico de 15 correções por salvamento permanece, com aviso para salvar antes de editar outras entradas, sem impedir novas inclusões.
- A gravação conjunta valida caixa, vínculo de cada entrada, versão otimista, idempotência, quantidades e saldo no servidor. Usa D1 batch atômico, com os guardas de versão/estoque e auditoria existentes: conflito ou falha reverte todo o conjunto. Aumentos são gravados antes das reduções para evitar saldo negativo transitório. Cada entrada corrigida mantém seu antes/depois, autor e data/hora no histórico, sem apagar as versões anteriores.
- Lista tem rolagem contínua interna acessível por teclado, carregando blocos de 15 entradas por cursor (data/hora e ID), sem controles de página. Ao descer, carrega entradas antigas; ao subir, preserva dados, posição e rascunhos já carregados. Linhas distantes usam content-visibility, conservando os controles e valores no documento. Carregar mais também fica disponível como ação explícita. Falha usa ErrorModal sem repetição automática enquanto o erro estiver aberto. Financeiro com Consulta vê as quantidades sem editar. A lixeira pede confirmação e reutiliza a exclusão lógica existente, preservando o histórico e bloqueando saldo negativo. Excluir descarta somente o rascunho daquela linha; outras correções pendentes são preservadas. Corrigir para zero mantém a entrada como registro ativo de quantidade zero, sem apagar o histórico.
- A rota antiga `/products/[id]/stock/[productId]` redireciona ao modal preservando a página, sem manter uma segunda interface de estoque. Migração `0033_stock_entry_soft_delete.sql` acrescenta exclusão lógica e adapta visão de saldo, guardas e auditoria, sem alterar a 0032. Nenhuma migração é aplicada automaticamente pelo agente.
- Formulário de pedido recorrente reutiliza o modal formCompact de Eventos em duas etapas: Pedido (produtos, previsão opcional de retirada e observação) e Pagamento. Campo de data tem largura limitada e se adapta ao celular, sem ocupar a linha inteira no desktop.
- Situação do pedido é centralizada no Mais (+), sem modal separado de retirada. O servidor converte Retirado em todas as quantidades do pedido e A retirar em zero, com guardas atômicos de estoque e histórico. A operação anterior de retirada rejeita novos valores parciais.
- Ao clicar na lixeira de um produto existente no formulário do grupo, a interface consulta o servidor e bloqueia imediatamente sua remoção quando houver entradas ou pedidos ativos, mantendo a linha e os demais rascunhos. O salvamento conserva a proteção final contra alterações concorrentes. Produtos com entradas ou pedidos ativos não são removidos do catálogo, para preservar acesso ao estoque e aos itens pendentes. Grupo com entradas ativas não pode ser excluído. Pedido com quantidade retirada positiva exige corrigir a retirada para zero antes de excluir; não há devolução física automática pelo botão de exclusão.
- Migração `0032_recurring_products.sql` preparada, não aplicada pelo agente. Reconstrói somente a tabela `events` para admitir ausência de data, copiando explicitamente colunas, IDs e metadados, recriando seus índices/triggers e preservando versões/auditorias existentes. Acrescenta entradas e auditoria de estoque, visão de saldo derivado e proteções atômicas de estoque/retirada.
- Reposição não cria movimentação financeira. Pedidos/insumos continuam nas tabelas compartilhadas, portanto somam nos cálculos existentes do caixa sem duplicar entradas. Comprovantes reutilizam a rota autenticada compartilhada de insumos, inclusive autorização pelo evento/grupo concedido ao operador ou pelo caixa para os demais perfis.
- UI usa os mesmos tokens, listas, modais, máscaras, erros, descarte, paginação e feedback. Carregamento de Produtos acompanha sua composição pelo PageTransition compartilhado. Sem nova dependência ou serviço.

O detalhe do grupo mantém editar/excluir ao lado do título no cabeçalho compacto. Caixa vinculado e descrição aparecem depois das ações Pedidos/Insumos/Histórico e antes da lista de produtos.

### Proporções do estoque

Modal principal usa tamanho standard compartilhado, com altura natural. Nome do produto à esquerda e saldo à direita em uma faixa de fundo quente; número do saldo destacado com a cor primária e tipografia existentes. Nomes e números longos podem quebrar sem transbordar. Nova entrada usa QuantityStepper compacto, com −/número/+ e digitação, junto de Adicionar. A largura do número é limitada; as entradas existentes mantêm seu campo numérico nativo sem botões externos. Nas entradas, quantidade fica ao lado dos dados; controles podem quebrar abaixo em telas estreitas. Entradas mantêm rolagem contínua; o Histórico de auditoria conserva sua paginação.

Na lista de produtos, nome/ícone e preço ficam à esquerda; quantidade disponível e botão Estoque formam o grupo à direita. Quantidade usa tamanho font-lg, semibold e cor primária, com disponíveis em linha secundária discreta. No celular, esse grupo empilha quantidade e botão à direita, preservando espaço para o nome. Sem alterar cálculos ou ações.
