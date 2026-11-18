# O que ler para cada tarefa

Comece pelo [estado atual](estado-atual.md) ao retomar o projeto. Depois escolha uma linha abaixo e a área afetada. Não leia todos os documentos por rotina; histórico não faz parte da preparação normal.

## Escolha pelo tipo de mudança

| Vou alterar…                                        | Ler somente estes contratos, além da área afetada                                                                                                                    |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Texto, disposição, CSS ou responsividade            | [Visual](interface/DESIGN.md); [componentes/formulários](interface/formularios-e-feedback.md) somente se usar esses controles                                        |
| Interação, busca, navegação ou paginação            | [UX compartilhada](interface/UX.md); [formulários/erros](interface/formularios-e-feedback.md) se houver envio/modal                                                  |
| Skeleton, ausência de resultados ou transição       | [Carregamento e estados](interface/carregamento-e-estados.md)                                                                                                        |
| Use case, repository ou organização de código       | [Estrutura e camadas](arquitetura/estrutura-e-camadas.md); [validação/erros/logs](arquitetura/validacao-e-erros.md) quando envolver entradas ou falhas               |
| SQL, schema, saldo, versão concorrente ou auditoria | [Banco e integridade](arquitetura/banco-e-auditoria.md); [migrações](operacao/banco-e-migracoes.md) se alterar estrutura/estado do banco                             |
| Campo monetário, data, CEP, telefone ou API externa | [Máscaras e integração](arquitetura/mascaras-e-integracoes.md); [endereços](funcionalidades/entregas-e-enderecos.md) somente para ViaCEP/entregas                    |
| Login, sessão ou autorização por caixa              | [Autenticação e usuários](funcionalidades/autenticacao-e-usuarios.md); [configuração dos provedores](operacao/supabase-e-resend.md) somente se configurar o ambiente |
| Rodar/diagnosticar o ambiente                       | [Ambiente local](operacao/ambiente-local.md); [diagnósticos](operacao/diagnosticos.md) se o problema corresponder                                                    |
| Criar/alterar testes                                | [Testes](operacao/testes.md)                                                                                                                                         |
| Preparar commit/PR, versão, merge ou publicar       | [Git e publicação](operacao/git-e-publicacao.md); [CI](operacao/integracao-continua.md) somente para workflow/falha de publicação                                    |
| Investigar o que foi feito/publicado antes          | [Publicações](historico/publicacoes.md) ou [retomadas antigas](historico/retomadas-2026-11.md), conforme a data                                                      |

## Escolha a funcionalidade

Cada arquivo reúne regras/dados, fluxo/UX e composição visual **somente daquela área**. Consulte as seções relacionadas à mudança, sem abrir as outras áreas.

| Área                                                         | Documento dono                                                        |
| ------------------------------------------------------------ | --------------------------------------------------------------------- |
| Entrar, confirmação, convites, senha, usuários e Meus dados  | [Autenticação e usuários](funcionalidades/autenticacao-e-usuarios.md) |
| Caixas, saldo, olhinho e histórico de caixa                  | [Caixas e saldos](funcionalidades/caixas-e-saldos.md)                 |
| Doadores, doações e edição/exclusão                          | [Doações](funcionalidades/doacoes.md)                                 |
| Eventos, produtos, pedidos e pagamentos                      | [Eventos e pedidos](funcionalidades/eventos-e-pedidos.md)             |
| Produtos recorrentes, categorias, estoque e retiradas        | [Produtos recorrentes](funcionalidades/produtos-recorrentes.md)       |
| Etapas, transporte, endereço/CEP e filtros de entrega        | [Entregas e endereços](funcionalidades/entregas-e-enderecos.md)       |
| Compras/doações materiais, anexos e detalhes dos insumos     | [Insumos e comprovantes](funcionalidades/insumos-e-comprovantes.md)   |
| Entradas/saídas manuais e seus comprovantes                  | [Movimentações](funcionalidades/movimentacoes.md)                     |
| Resumo financeiro e painéis iniciais                         | [Home](funcionalidades/home.md)                                       |
| Retirada, acesso temporário, gerenciamento e API de consulta | [Cantina e comandas](funcionalidades/cantina-e-comandas.md)           |
| Socket, sincronização, hibernação e publicação durável       | [Transporte da Cantina](funcionalidades/cantina-websocket.md)         |

## Exemplos de pedidos

- “Ajuste o celular das doações: leia Visual e Doações.”
- “Corrija o pagamento do pedido: leia Estrutura e camadas, Banco e integridade e Eventos e pedidos.”
- “Mude o formulário de insumo: leia Componentes/formulários, Máscaras e Insumos.”
- “Revise o login: leia Autenticação e usuários; consulte os provedores só se precisar de configuração.”

Não é preciso repetir esses nomes em todo pedido: o agente deve usar este mapa para selecionar a leitura. Se a investigação revelar outro assunto afetado, abrir seu dono naquele momento.

## Manutenção

Uma regra tem um dono. Documentos compartilhados definem o padrão; a área registra apenas sua aplicação/exceção aprovada e limites de negócio. Atualize a regra no lugar, sem copiar para AGENTS ou empilhar notas datadas. Estado atual fica curto; verificações antigas e fatos de versões vão para historico/. docs-example/ é material preexistente de referência, não contrato do sistema. Detalhes de implementação não pertencem ao README da raiz.
