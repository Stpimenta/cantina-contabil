# Cantina — transporte WebSocket

Contrato atual. Leia somente ao alterar este assunto. [Escolher outra leitura](../README.md).

## Contrato

Contrato do MVP autorizado em 12/11/2026. Dados/regras em [estrutura-e-camadas.md](cantina-websocket.md#publicação-durável-e-websocket), interação em [UX.md](cantina-e-comandas.md#comandas-da-cantina). Não é API pública para clientes cadastrarem pedidos.

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

## Sessão normal e operadores

Socket normal usa cantina-account/__Host-cantina-account, credencial opaca com hash e sessão revogável no D1. Autorização/anexo conservam IDs internos de conta/sessão; verificações recusam conta bloqueada, sessão revogada ou 12h sem uso. Operador consulta comandas, mas retirada/desfazer exige permissão no caixa do evento; administrar acessos temporários é exclusivo do admin. Cookie/atores temporários continuam independentes.

## Regras e implementação

### Publicação durável e WebSocket

Mesmo Worker OpenNext, com custom-worker.ts e CommandHub exportado; namespace COMMANDS, um Durable Object SQLite por evento. Usa acceptWebSocket/attachments de hibernação, sem timers de heartbeat/polling no navegador, serviço separado ou Cloudflare Queues. D1 continua fonte da verdade. A RPC armCommands no entrypoint padrão reutiliza WORKER_SELF_REFERENCE, inclusive pelo proxy do Next em desenvolvimento; não cria outra porta HTTP ou serviço separado. O Wrangler não executa o entrypoint nem classes DO internas no getPlatformProxy. O Next seleciona o ambiente `next` do mesmo wrangler.local.jsonc, nomeado `cantina-contabil-next-proxy`, distinto do Worker executável `cantina-contabil-local`; WORKER_SELF_REFERENCE aponta para este último pelo registro local do Wrangler. Usar o mesmo nome resolveria a RPC no proxy vazio e falharia antes da gravação. D1/R2 conservam os mesmos identificadores e persistência, com remote=false; não existe novo serviço publicado. `DurablePublicationCoordinator` é injetado no repository de Eventos e protege criação/edição/exclusão de pedido Cantina, incluindo pagamento e retirada.

Protocolo sem lacuna entre commit e despertar:

1. Antes da gravação, o hub persiste evento e alarme sob output gate; só depois insere intenção armed no D1 com deadline de 120s. Se armar falha, a operação não grava.
2. Trigger exige intenção armed do evento/operação e deadline futuro. A alteração do pedido e a intenção committed com ID/versão são uma única transação D1. Revogação usa o mesmo protocolo, com trigger na alteração de revoked_at.
3. Alarme consulta apenas trabalho pendente, transmite ID/versão a sockets ainda autorizados e marca published. Falha após envio pode repetir; não promete exactly-once. Intenção sem commit vence/cancela e cerca qualquer gravação tardia, sem trabalho infinito de uma operação abandonada.
4. Antes do IO do processamento, persiste novo despertar em 30s: falha prolongada não depende apenas das seis tentativas automáticas do provedor. Enquanto armed/committed existe, agenda próximo trabalho (até 1s no sucesso normal); sem trabalho, remove alarme, salvo vencimento exato de sockets ativos. Não há loop periódico ocioso. Falha total/indisponibilidade do provedor pode atrasar a recuperação; não equivale a entrega instantânea garantida.

Handshake registra socket antes de ready. Cliente mantém avisos em fila enquanto busca snapshot inicial/reconexão, drena também os recebidos durante essa busca e só habilita retirada após sincronizar. Processamento serial, versões antigas/repetidas ignoradas e reconexão com backoff até 30s. Pedido afetado é consultado por GET com a janela atual: retorna somente esse pedido e IDs/contagem/página da janela; itens que faltam para preenchê-la são buscados por seus próprios IDs. Não enviar toda a lista a cada edição; busca/retirada/paginação e contagens permanecem coerentes, inclusive exclusão e reposição.

Queda mantém dados carregados e aviso vermelho discreto, com operações desabilitadas até reconexão e sincronização. Uma recusa de upgrade consulta a autorização uma vez para distinguir encerramento de sessão; isso não é polling. O servidor valida Origin, sessão/escopo e modalidade antes de entregar ao binding; o hub repete expiração/revogação no handshake, envio e mensagens recebidas. Credencial nunca aparece na URL WS.

Referências: [custom Worker OpenNext](https://opennext.js.org/cloudflare/howtos/custom-worker), [hibernação WebSocket](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) e [alarms](https://developers.cloudflare.com/durable-objects/api/alarms/). SQLite é necessário para o plano Free; estimativa de 60 pedidos/um tablet não substitui medição nem garante ficar nas cotas de todos os serviços.
