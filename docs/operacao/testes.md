# Testes automatizados

Contrato atual. Leia somente ao alterar este assunto. [Escolher outra leitura](../README.md).

## Contrato

Implementação local autorizada pelo responsável em 30/10/2026. Vitest 5.0.5 e Miniflare 5.20261019.2-beta fixados no package/lockfile; Miniflare conserva a versão já utilizada pelo Wrangler. Nenhuma regra produtiva alterada. Contratos de negócio em [estrutura-e-camadas.md](../arquitetura/estrutura-e-camadas.md); ambiente em [ambiente-local.md](ambiente-local.md); estado em [estado-atual.md](../estado-atual.md).

## Quando executar

Decisão do responsável em 17/11/2026: não executar automaticamente testes, typecheck, build ou auditorias durante cada modificação. Trabalhar com leitura direcionada e revisão estática, sem ampliar o levantamento. O responsável concentra a execução na revisão final antes dos deploys; o agente executa somente mediante pedido explícito. Não repetir verificações por alteração ou retomada de chat. Registrar o que foi ou não executado, sem declarar aprovação pelo simples exame do código.

Os comandos e requisitos abaixo descrevem essa etapa final, não uma obrigação de execução a cada edição. As verificações já configuradas no CI permanecem preservadas.

## Critério para manter testes

Priorizar regras observáveis que protegem dinheiro, estoque, autorização, autenticação atual, exclusão/auditoria e concorrência. Validações de formato/limites permanecem quando representam riscos distintos; não agrupar casos apenas para diminuir a contagem. Não adicionar testes apenas de textos, classes, skeleton, estrutura de HTML ou navegação simples. Uso de HTML para verificar prevenção de vazamento de senha/segredo continua válido. Composição visual fica na revisão funcional do responsável. Testes de mecanismos legados fora da composição atual são removidos quando a proteção vigente já está coberta. Guardas de publicação continuam por protegerem produção, sem serviços reais.

## Objetivo e limite

Proteger as principais regras financeiras e de acesso com uma suíte pequena e determinística. Testar entradas, resultados e efeitos observáveis, sem reproduzir o código nos testes ou exigir chamadas internas em uma ordem específica. Não há garantia de ausência de erros: a cobertura protege os cenários explicitados abaixo.

A suíte não inclui testes apenas de composição de HTML/skeleton/breadcrumbs, navegador, comparação visual, carga ou cobertura percentual obrigatória. A execução no GitHub Actions foi autorizada em 31/10/2026 e segue [integracao-continua.md](integracao-continua.md). TypeScript continua responsável pelos tipos estáticos; testes exercitam comportamento e validação de dados durante a execução. Revisão funcional da interface permanece com o responsável.

## Organização aprovada

- Unitários: funções puras de regras, inputs Zod, dinheiro, datas, comprovantes e sessão. Casos tabelados com entrada válida, inválida e limites relevantes; sem banco.
- Integração: entrada pelo método público do use case, implementações reais dos repositories Drizzle e D1 emulado com as migrações SQL reais. Conferir retorno ou código técnico de erro, consultas públicas de saldo/lista/histórico e persistência. Não substituir repositories financeiros por mocks.
- Guardas do banco: poucos casos adicionais escrevem pela infraestrutura após uma leitura desatualizada, para provar que as triggers também impedem saldo insuficiente e versões concorrentes. Testar somente o use case não comprova essas proteções atômicas.
- API externa de login/perfil: respostas controladas, sem internet nem credenciais reais. R2 emulado para integração de anexos. Sessões sintéticas somente no processo de testes, sem bypass na aplicação.

Vitest é o executor único e Miniflare emula D1/R2. A configuração de testes usa aliases exclusivos para `server-only` e para o acesso ao contexto Cloudflare, conectando o repository R2 real ao bucket descartável. Isso não altera o código produtivo. Nas verificações das propriedades enviadas aos componentes cliente, a composição é substituída por casos de uso reais e somente a renderização cliente é dispensada. Sem HTTP interno do app, API de teste ou novo container de injeção. Referências técnicas: [configuração Vitest](https://vitest.dev/config/), [D1 em Miniflare](https://developers.cloudflare.com/workers/testing/miniflare/storage/d1/). A API nativa da versão 5 foi conferida também nos tipos instalados; não copiar exemplos antigos da versão 4 sem adaptação.

Estrutura: `tests/unit/`, `tests/integration/` e `tests/support/`, agrupando arquivos por funcionalidade. Helpers mínimos de criação de caixa, evento, sessão e arquivo sintético; cada teste explicita os valores que importam. Não recriar `verification/`.

## Cobertura unitária essencial

| Grupo              | Entradas e resultados esperados                                                                                                                                                                                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dinheiro           | Conversão decimal exata para centavos, uma/duas casas decimais, rejeição de negativos, formato inválido e excesso de precisão/limite seguro. Zero aceito somente nos contratos que permitem gratuidade ou referência sem valor.                                                                                                                    |
| Inputs             | Campos obrigatórios, texto normalizado, limites de nome/descrição/justificativa, UUID e versão inválidos, datas civis inválidas e ano bissexto. Erros técnicos e campos identificados, sem mensagens brutas do Zod.                                                                                                                                |
| Regras financeiras | Efeito de entrada/saída, saldo final zero permitido, saldo negativo rejeitado nas operações protegidas e precisão segura com BigInt. Não estender silenciosamente essa regra a outras correções.                                                                                                                                                   |
| Pedidos            | Valor ajustável inclusive zero, Pago/Pendente, composição Pix/dinheiro/misto conforme validador atual, produto inválido e preservação de preço/nome do snapshot na edição.                                                                                                                                                                         |
| Insumos            | Compra exige valor positivo, caixa e comprovante; doação material permite zero e não exige caixa, com Pendente/Recebido e nome do doador normalizado.                                                                                                                                                                                              |
| Comprovantes       | Até 5 arquivos de até 5 MB, tipos permitidos e assinatura real dos bytes. Testar limite exato e excedente; metadados válidos não legitimam conteúdo incompatível. Movimentação aceita lista vazia; compra de insumo exige anexo mantido ou novo.                                                                                                   |
| Acesso e sessão    | Ausência de sessão, papel não permitido, expiração/revogação, credencial opaca inválida e inatividade de 12h rejeitados; sessão própria válida aceita. O codec HMAC legado continua testado com seu limite antigo de duas horas, sem participar da composição atual. A assinatura do JWT externo continua uma pendência, não uma garantia coberta. |

## Cobertura de integração essencial

Cada linha representa um grupo pequeno de cenários independentes, não um único teste longo. Quando houver rejeição, conferir que valores, versão e auditoria no D1 permanecem iguais. Falha após upload pode deixar objeto R2 sem vínculo conforme o contrato atual; não exigir limpeza inexistente.

| Grupo                       | Cenário e resultado observável                                                                                                                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Saldo consolidado           | Doação financeira de R$ 100 + pedido pago de R$ 30 + entrada de R$ 20 − compra de R$ 25 − saída de R$ 10 = Real de R$ 115. Pedido pendente de R$ 40 aparece somente no Pendente; doação material não altera nenhum saldo. Valores esperados explícitos, sem reutilizar a fórmula da aplicação no teste. |
| Doações financeiras         | Criar, editar valor/caixa e excluir atualiza os caixas afetados uma única vez; reduzir, excluir ou retirar de um caixa uma entrada já utilizada é bloqueado quando deixaria saldo negativo.                                                                                                             |
| Pedidos                     | Criar pendente, marcar pago, ajustar valor/forma e excluir recalcula Real/Pendente e Dinheiro/Pix sem dupla contagem; pedido gratuito é permitido. Unidades vendidas incluem todos os ativos, sem multiplicar versões; excluídos não contam.                                                            |
| Catálogo                    | Edição de produto preserva snapshots anteriores; tentativa de salvar pedido com versão desatualizada do catálogo retorna conflito, sem gravação parcial.                                                                                                                                                |
| Compra de insumo            | Debita o caixa escolhido, inclusive diferente do caixa do evento; edição recalcula o próprio débito, troca de caixa afeta ambos, conversão para doação remove a despesa e exclusão devolve o valor. Compra sem saldo é rejeitada.                                                                       |
| Doação material e evento    | Recebimento não movimenta dinheiro. Custo de insumos do evento soma somente compras ativas de qualquer caixa; começa em zero e não desconta novamente do Real do evento.                                                                                                                                |
| Movimentações               | Entrada/saída, edição de valor/tipo/caixa e exclusão produzem o saldo esperado. Bloquear saída excessiva, redução/exclusão de entrada utilizada e troca de caixa que deixaria qualquer caixa afetado negativo.                                                                                          |
| Concorrência e repetição    | Duas edições da mesma versão: apenas uma prevalece. Mesmo cadastro repetido não duplica registro, saldo ou auditoria; mesmo identificador com conteúdo incompatível retorna conflito. Aplicar aos fluxos com esses contratos.                                                                           |
| Atomicidade financeira      | Duas compras ou saídas de R$ 70 após ambas observarem R$ 100: somente uma grava, saldo final R$ 30 e uma auditoria de sucesso. A guarda do D1 deve funcionar mesmo sem a proteção prévia do use case.                                                                                                   |
| Exclusão e vínculos         | Excluídos saem das listas/saldos e não aceitam edição; snapshots/autoria permanecem. Evento com pedidos ou insumos ativos não pode ser excluído; caixa com vínculos ativos protegidos também não. Dependências excluídas permitem excluir o principal, preservando os registros e a auditoria.          |
| Histórico e Home            | Criar/editar/excluir preserva antes/depois, autor e versão; troca de caixa aparece no histórico dos dois sem somar auditoria ao saldo. Home agrega todos os caixas ativos, sem depender da primeira página, e não inclui caixas excluídos.                                                              |
| Comprovantes privados       | Salvar e ler bytes pelo use case com vínculo válido; manter/remover anexos na edição preserva objetos históricos. Rejeitar receiptId de outro registro, sessão ausente e perfil proibido. Retornos destinados à interface não expõem chaves privadas.                                                   |
| Acesso e contratos externos | Leituras/gravações representativas recusam sessão ausente ou papel proibido sem efeitos. Login/perfil com resposta inválida, credenciais recusadas ou identidade divergente não concluem autenticação; respostas válidas permitem o fluxo esperado, sem chamar o serviço real.                          |

## Isolamento e execução

1. Criar D1 e R2 descartáveis com dados inteiramente sintéticos e aplicar as migrações versionadas em ordem. Não usar `.wrangler/state`, `.env`, banco de desenvolvimento ou recursos remotos.
2. Limpar/recriar apenas esse ambiente descartável entre cenários. Cada teste deve funcionar sozinho e em qualquer ordem; relógio controlado nos casos de expiração e datas.
3. Encerrar o emulador ao terminar, inclusive após erro. Sem servidor Next, portas fixas ou processos deixados em segundo plano.
4. Executar `npm run test:unit`, `npm run test:integration` ou `npm test` para ambos, com execução única por padrão. Para um cenário isolado: `npm run test:integration -- -t "trecho do nome"`. Os arquivos de integração executam em sequência para manter um contexto descartável por vez. Não usar `it.concurrent` com o harness compartilhado; concorrência financeira é exercitada dentro do próprio cenário.
5. Na revisão final solicitada, executar os grupos afetados e o build completo Cloudflare/TypeScript conforme o contrato do projeto. Não confundir aprovação da suíte com validação da interface ou publicação.

## Manutenção e limites da evidência

As migrações SQL são lidas e aplicadas em ordem no banco novo de cada cenário, em batches transacionais, usando o parser SQL do Wrangler para preservar corpos de triggers. O parser é uma API `unstable` do Wrangler: atualizar a dependência exige executar a integração e conferir sua compatibilidade. O harness descarta somente seu diretório temporário e encerra o Miniflare no sucesso e na falha; nunca apaga estado do app.

O emulador precisa de processos e sockets locais em portas aleatórias de loopback. A execução restrita do agente pode exigir liberação da ferramenta para isso. Não há servidor Next, acesso ao D1/R2 remoto ou chamada real à API de login. Vitest não carrega `.env` (`envDir: false`); os contratos externos recebem respostas sintéticas por injeção de `fetch`. O deploy isolado não copia `tests/` nem a configuração Vitest para o pacote.

Arquivos donos da cobertura:

- `tests/unit/order-steps.test.ts`: validação independente por grupo, etapa do erro final e parcela de pagamento; integração de Pix/dinheiro/misto, preservação e legado em deliveries.test.ts.

- `tests/unit/dev-origins.test.ts`: origens de loopback/rede no desenvolvimento, sem wildcard ou inclusão em produção; inicialização Cloudflare simulada.

- `tests/unit/login-form.test.ts`: HTML inicial do login exige POST para caminho limpo, bloqueia envio antes da hidratação, não expõe GestPV/primeiro acesso e mantém recuperação entre senha e envio; URLs com campos de credenciais redirecionam antes da sessão, sem credenciais reais.

- `tests/unit/event-products.test.ts`: catálogo opcional, nome/preço específicos por campo, zero permitido e duplicidade rejeitada; integração de cadastro vazio/inclusão posterior em deliveries.test.ts.
- `tests/unit/address-masks.test.ts`: máscaras parciais/completas de CEP e telefone, validação de CEP/DDD e mesclagem que preserva correções/dados e descarta CEP antigo.
- `tests/integration/postal-address.test.ts`: caso de uso e adaptador ViaCEP reais com transporte controlado, acesso, entrada inválida, contrato/identidade, CEP inexistente/genérico e erros HTTP/rede/timeout; sem serviço externo real nem banco.
- `tests/unit/order-query.test.ts`: composição e normalização dos filtros independentes de pagamento e transporte.
- `tests/integration/order-fulfillment-filter.test.ts`: Não concluídas combina entrega/retirada, busca/pagamento, contagem e paginação antes do limite; exclui concluídos/excluídos, inclui legado não concluído e preserva saldos.
- `tests/unit/order-delivery.test.ts`: endereço parcial/completo/vazio, CEP/UF, contato/DDD, modalidade obrigatória e link Maps sem dados de contato/referência.
- `tests/integration/deliveries.test.ts`: entrega/retirada, conclusão/desfazer independente de pagamento, atualização rápida isolada/conjunta atômica, saldos/parcelas/dados preservados, concorrência, idempotência, históricos, pedidos legados, exclusão e guardas atômicas.
- `tests/unit/rules.test.ts`: dinheiro, datas, inputs e regras de pedidos/insumos.
- `tests/unit/ci-api.test.mjs`: recuperação limitada de GET com socket encerrado, timeout por tentativa e ausência de retry para escritas/erros não reconhecidos.
- `tests/unit/release-error.test.mjs`: classificação técnica controlada e ausência de conteúdo privado nos diagnósticos.
- `tests/unit/deploy-worker.test.mjs`: envio por argumentos, autenticação por token/perfil e resultado incerto, com processo simulado.
- `tests/unit/release.test.mjs`: versões/tags, APIs controladas e falhas/repetição do fluxo de publicação, sem rede ou deploy real. Arquivo .mjs para testar scripts Node existentes sem acrescentar executor ou configuração de compilação.
- `tests/unit/receipts-session.test.ts`: metadados/conteúdo de comprovantes e sessão interna.
- `tests/integration/finance.test.ts`: saldos, CRUD financeiro, snapshots, repetição, concorrência, vínculos e Home.
- `tests/integration/receipts-access.test.ts`: R2, vínculos privados, acesso e propriedades enviadas aos componentes cliente pelas páginas reais, sem navegador.
- `tests/integration/auth.test.ts`: login/perfil com repositories reais, transporte controlado e sessão sintética assinada.

A suíte deve passar individualmente e em conjunto, com saída diferente de zero nas falhas e identificação da regra violada. Ao modificar regras cobertas, manter os cenários correspondentes coerentes, sem espelhar detalhes internos; sua execução segue Quando executar. Não alterar regra de negócio apenas para tornar um teste verde.

Os testes não validam visual, interação no navegador, cabeçalhos HTTP das rotas de comprovantes, carga ou serviço externo real. A implementação não resolve a assinatura pendente do JWT externo nem reconcilia objetos R2 sem vínculo. Não exige limpeza de objetos após falha D1: o contrato preserva resultados incertos. Nenhuma migração no banco de desenvolvimento ou produção faz parte da execução da suíte.

## Cantina e acesso temporário

O grupo canteen também cobre atualização pelo modal Situação do pedido: pagamento e collected na mesma gravação, consulta pela Comanda, auditoria única na repetição, desfazer sem estorno financeiro, estoque reservado inalterado, versão antiga e operador com somente Consulta recusados.

`tests/integration/canteen.test.ts` amplia o harness opcionalmente com o CommandHub real, empacotado por esbuild da stack existente. Mesmo D1 sintético e DO SQLite descartáveis no Miniflare, sem app Next, .env, banco local/remoto ou servidor do responsável. Testa retirada/desfazer independente do pagamento, versão/idempotência/concorrência, autoria acesso/criador, ativação única em corrida e repetição do navegador original, hash sem segredo persistido, escopo/revogação/expiração, modalidade bloqueada com pedido preservado/excluído, paginação e recuperação por alarme com socket conectado/hibernado. Fechar sockets/emulador e remover somente diretório temporário ao terminar.

`tests/unit/canteen-contracts.test.ts` valida exclusividade das modalidades, vencimento futuro sem máximo arbitrário, credencial aleatória/hash, OpenAPI 3.1/cookies/erros/resposta mínima. A descrição é gerada antes de build/typecheck; o build isolado verifica também o custom Worker e binding COMMANDS. A suíte não comprova interação/visual no navegador, encaminhamento real de upgrade pela porta 5174 ou consumo efetivo de cotas Free. Esses testes funcionais permanecem com o responsável.

`tests/unit/temporary-access-link.test.ts` reproduz a repetição do efeito de montagem após a limpeza do fragmento: a chave sintética continua em memória, o botão é habilitado sem expor o segredo no HTML e a ausência de chave mantém o bloqueio. Sem navegador ou novo armazenamento persistente.

`tests/unit/activation-origin.test.ts` cobre localhost, loopback/IP de rede com URL interna do Next, origem ausente/externa/inválida e a restrição de produção. `tests/unit/activation-route.test.ts` exercita o POST com composição/cookies controlados: sucesso grava cookie privado e rejeição retorna 403 em Result JSON sem consumir o link. Contratos de carregamento, redirecionamentos, OpenAPI, comprovantes e handshake usam caminhos em inglês.

A configuração real do ambiente Next é conferida em `tests/unit/local-proxy-config.test.ts`: proxy com nome distinto, RPC para o Worker executável e mesmos bindings privados locais de D1/R2. O harness de Cantina usa também um proxy sem entrypoint, com nome próprio e binding cruzado para o Worker real; revogação/publicação passam por esse caminho. Isso cobre a chamada RPC entre workers e o encerramento de socket por revogação; não comprova o registro de dois processos Wrangler/Next em execução real.

## Preparação da autenticação independente

`tests/integration/supabase-auth.test.ts` usa o adaptador HTTP real com transporte sintético: login, refresh token rotacionado, identidade consultada no provedor, e-mail confirmado, contratos inválidos, falhas HTTP/rede e ausência de permissões importadas de metadados. Sem conta Supabase ou envio de e-mail real.

`tests/integration/local-accounts.test.ts` usa D1/Drizzle descartáveis com a migração 0026: habilitação inicial por root/admin/tesouraria com transporte GestPV sintético, perfil/e-mail inválidos, conta bloqueada, preservação de autorias existentes, repetição/concorrência, colisão de e-mail sem associação automática, identidade imutável e faixa negativa dos convidados. Testa a política isolada admin/operador. O grupo independent-auth complementa a sessão atual, convites e autorização de gravações; consultas financeiras continuam gerais por decisão explícita. Testes funcionais de UI ficam com o responsável.

## Autenticação independente

Grupos independent-auth, local-accounts e supabase-auth exercitam D1/crypto reais descartáveis e transporte HTTP sintético: primeiro vínculo, IDs preservados/negativos, convites e cancelamento, prova/senha, cookie opaco/tokens cifrados, inatividade de 12h, refresh concorrente, bloqueios atuais, redefinição/logout, grants otimistas e auditoria. Operador consulta outros caixas, mas grava somente nos concedidos e não amplia permissões. Contratos Supabase incluem convite administrativo, identidade pré-existente no projeto compartilhado com e-mail exato, confirmação e senha sem normalização. Entrada única também cobre habilitação pelo Entrar sem sessão antes da prova, login ativado com API antiga indisponível/sem envio de senha para ela, ausência de fallback em senha incorreta/bloqueio/convidado pendente e falha da habilitação inédita sem criar conta na indisponibilidade. Não usam contas/e-mails reais, .env ou bancos financeiros do responsável; teste funcional e configuração do provedor permanecem separados.

`tests/integration/account-profile-migration.test.ts` inicia D1 descartável somente até 0029, com conta/caixa sintéticos existentes e sem campos de perfil. Aplica 0030 pelo parser real do Wrangler, compara todas as colunas anteriores da conta, caixas e auditoria e confere novo cadastro com nascimento/telefone. A sequência completa dos demais testes também exerce a instalação nova até 0030. Nenhum banco de desenvolvimento/produção é migrado pela suíte.

## Operação

### Verificação autorizada

Testes unitários e de integração autorizados em 30/10/2026, com Vitest e Miniflare. Não precisam de `.env`, conta GestPV, app aberto ou recursos Cloudflare. Dados sintéticos e D1/R2 descartáveis em diretórios temporários exclusivos, removidos ao final. As migrações reais são aplicadas somente nesses bancos novos; `.wrangler/state` e os bancos existentes permanecem intactos. O emulador inicia e encerra seus processos/portas aleatórias de loopback durante a execução.

```bash
npm run test:unit
npm run test:integration
npm test
```

Os comandos executam uma vez e falhas retornam código diferente de zero. Para um cenário: `npm run test:integration -- -t "trecho do nome"`. Cobertura e organização em [testes.md](testes.md). Em ambiente restrito, `listen EPERM` indica falta de permissão para sockets locais do Miniflare; não mudar o app nem usar banco remoto para contornar.

Na revisão final solicitada: executar os grupos afetados e o build completo Cloudflare/TypeScript; se a suíte foi alterada, executar também `npm run typecheck` para conferir os tipos de testes; o build isolado não copia `tests/` ou `vitest.config.mts`. Com ambiente do responsável aberto, usar `npm run deploy -- --build-only`, preservando os builds em uso e sem publicar. Não iniciar o app, percorrer fluxos de interface ou gerar screenshots; esses testes funcionais continuam com o responsável. Para documentação, revisar conteúdo, referências e formatação; não repetir build. Uma falha na revisão final pode justificar correção e nova compilação dentro dessa etapa solicitada; alterações intermediárias não disparam verificações automaticamente.

Migrações exigem cuidado com preservação: backup local privado antes, quick_check, foreign_key_check e comparação dos registros/colunas antigos; snapshots novos conferidos quando houver backfill. Não imprimir dados pessoais completos ou segredos.

Testes unitários e de integração foram autorizados em 30/10/2026 e implementados em `tests/`, com Vitest e D1/R2 descartáveis no Miniflare. Casos de uso e repositories reais protegem as regras financeiras; dados e serviços externos são sintéticos, sem bypass no app. Cobertura, isolamento e limites em [testes.md](testes.md); comandos em [ambiente-local.md](testes.md#verificação-autorizada). Concentrar os grupos afetados e o build completo Cloudflare/TypeScript na revisão final solicitada, conforme Quando executar. Não recriar verification/, testes visuais, carga ou cobertura percentual sem novo pedido. Notas de releases conservam verificações históricas, não substituem este contrato.

## Produtos recorrentes

`tests/integration/recurring-products.test.ts` usa D1 descartável com todas as migrações: escopo do operador por grupo, Consulta sem gravação, Alteração no estoque, grupo bloqueado por entrada ativa e liberado após exclusão, cursor sem salto após excluir lançamento e rollback integral de correções concorrentes. `finance.test.ts` confere exclusão de eventos/caixas após excluir os dependentes, com auditoria armazenada. Não aplica migrações em bancos do aplicativo nem valida a interação visual do modal.

## Comprovantes opcionais dos pedidos

`tests/integration/order-receipts.test.ts` acrescenta cenários D1/R2 descartáveis: pedido sem anexo, upload/leitura de PDF privado, repetição sem duplicação, edição com manutenção/remoção e adição, preservação na retirada e do objeto histórico, upload/remoção pelo + sem alterar financeiro com repetição idempotente, assinatura/tamanho/quantidade, tentativa de usar anexo de outro pedido e permissões de consulta/alteração. A inclusão dos cenários não comprova sua execução nem interação de UI.
