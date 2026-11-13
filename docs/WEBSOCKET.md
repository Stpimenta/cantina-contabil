# Transporte das comandas

Contrato do MVP autorizado em 12/11/2026. Dados/regras em [ARCHITECTURE.md](ARCHITECTURE.md#publicação-durável-e-websocket), interação em [UX-CONTRACT.md](UX-CONTRACT.md#comandas-da-cantina). Não é API pública para clientes cadastrarem pedidos.

## Conexão

`GET /api/events/{id}/commands/socket`, upgrade WebSocket no mesmo domínio com Origin correspondente e cookie de sessão normal ou acesso temporário. Sem bearer externo, evento/segredo de ativação na credencial URL ou subprotocol secreto. O caminho contém somente o identificador do evento. Servidor autoriza evento Cantina e ator antes do binding; escopo/revogação/expiração são novamente conferidos no hub.

O custom Worker trata upgrade diretamente porque a porta de rotas Next não é dona de WebSocket. A operação usa AuthorizeConnectionUseCase e os mesmos contratos/repositories; não chama Action nem move regra de negócio para o adaptador.

## Mensagens do servidor

| Mensagem JSON                              | Significado                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `{"type":"ready"}`                         | Socket registrado; iniciar snapshot HTTP, mantendo demais avisos em fila. Ainda não habilita mutações.             |
| `{"type":"order","id":"UUID","version":2}` | Pedido criado/alterado/excluído. Consultar o ID via API autenticada; não contém nome, itens, pagamento ou segredo. |
| `{"type":"session-ended"}`                 | Acesso revogado/expirado. Bloquear operações, mostrar Sua sessão foi encerrada e não reconectar automaticamente.   |

Encerramento `4401` também significa sessão encerrada. Fechamento/rede transitórios mantêm dados visíveis e operações bloqueadas; reconexão com backoff até 30s, seguida de nova sincronização. Uma recusa de upgrade sem código consultará autorização uma vez; não há polling de pedidos ou heartbeat de aplicação.

Cliente não envia mutações pelo socket. Marcar/desfazer continua na Server Action e no CollectCommandUseCase, com validação, autorização, versão e UUID. Mensagens recebidas pelo hub apenas verificam validade do acesso; não concedem comandos adicionais.

## Sincronização e garantias

Registrar antes de ready, buscar snapshot e drenar fila (inclusive avisos chegados durante a busca). Processamento serial; descartar ID/versão já observados ou anteriores. GET do pedido com `window=1` inclui IDs/contagem/página da seleção atual; preencher IDs ausentes individualmente. Uma edição simples não retransmite todos os registros da lista. Busca, paginação de 15 e filtro de retirada permanecem na URL.

Publicação pelo alarme é at-least-once: falha após transmissão pode repetir mensagem. Banco D1 é fonte da verdade e reconexão obtém novo snapshot; não há garantia exactly-once ou de latência durante indisponibilidade do provedor. Intenção e despertar persistentes precedem a gravação; a trigger confirma publicação na mesma transação. Intenções abandonadas vencem em 120s e impedem commit tardio; trabalho pendente mantém retry, sem loop ocioso. Revogação usa a mesma recuperação, mas recusa de operação independe de entrega do aviso.

O hub usa hibernação nativa, inclusive anexos com identidade já autorizada. Alarmes atendem somente publicação pendente e vencimento dos sockets ativos. Documentação HTTP interativa em `/api-docs` e spec privada em `/api/openapi`, ambas exclusivas do login normal.
