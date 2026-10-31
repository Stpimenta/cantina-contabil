# Testes unitários e de integração

Implementação local autorizada pelo responsável em 30/10/2026. Vitest 5.0.5 e Miniflare 5.20261019.2-beta fixados no package/lockfile; Miniflare conserva a versão já utilizada pelo Wrangler. Nenhuma regra produtiva alterada. Contratos de negócio em [ARCHITECTURE.md](ARCHITECTURE.md); ambiente em [LOCAL.md](LOCAL.md); estado em [STATUS.md](STATUS.md).

## Objetivo e limite

Proteger as principais regras financeiras e de acesso com uma suíte pequena e determinística. Testar entradas, resultados e efeitos observáveis, sem reproduzir o código nos testes ou exigir chamadas internas em uma ordem específica. Não há garantia de ausência de erros: a cobertura protege os cenários explicitados abaixo.

A suíte não inclui navegador, comparação visual, carga ou cobertura percentual obrigatória. A execução no GitHub Actions foi autorizada em 31/10/2026 e segue [CI.md](CI.md). TypeScript continua responsável pelos tipos estáticos; testes exercitam comportamento e validação de dados durante a execução. Revisão funcional da interface permanece com o responsável.

## Organização aprovada

- Unitários: funções puras de regras, inputs Zod, dinheiro, datas, comprovantes e sessão. Casos tabelados com entrada válida, inválida e limites relevantes; sem banco.
- Integração: entrada pelo método público do use case, implementações reais dos repositories Drizzle e D1 emulado com as migrações SQL reais. Conferir retorno ou código técnico de erro, consultas públicas de saldo/lista/histórico e persistência. Não substituir repositories financeiros por mocks.
- Guardas do banco: poucos casos adicionais escrevem pela infraestrutura após uma leitura desatualizada, para provar que as triggers também impedem saldo insuficiente e versões concorrentes. Testar somente o use case não comprova essas proteções atômicas.
- API externa de login/perfil: respostas controladas, sem internet nem credenciais reais. R2 emulado para integração de anexos. Sessões sintéticas somente no processo de testes, sem bypass na aplicação.

Vitest é o executor único e Miniflare emula D1/R2. A configuração de testes usa aliases exclusivos para `server-only` e para o acesso ao contexto Cloudflare, conectando o repository R2 real ao bucket descartável. Isso não altera o código produtivo. Nas verificações das propriedades enviadas aos componentes cliente, a composição é substituída por casos de uso reais e somente a renderização cliente é dispensada. Sem HTTP interno do app, API de teste ou novo container de injeção. Referências técnicas: [configuração Vitest](https://vitest.dev/config/), [D1 em Miniflare](https://developers.cloudflare.com/workers/testing/miniflare/storage/d1/). A API nativa da versão 5 foi conferida também nos tipos instalados; não copiar exemplos antigos da versão 4 sem adaptação.

Estrutura: `tests/unit/`, `tests/integration/` e `tests/support/`, agrupando arquivos por funcionalidade. Helpers mínimos de criação de caixa, evento, sessão e arquivo sintético; cada teste explicita os valores que importam. Não recriar `verification/`.

## Cobertura unitária essencial

| Grupo              | Entradas e resultados esperados                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dinheiro           | Conversão decimal exata para centavos, uma/duas casas decimais, rejeição de negativos, formato inválido e excesso de precisão/limite seguro. Zero aceito somente nos contratos que permitem gratuidade ou referência sem valor.                  |
| Inputs             | Campos obrigatórios, texto normalizado, limites de nome/descrição/justificativa, UUID e versão inválidos, datas civis inválidas e ano bissexto. Erros técnicos e campos identificados, sem mensagens brutas do Zod.                              |
| Regras financeiras | Efeito de entrada/saída, saldo final zero permitido, saldo negativo rejeitado nas operações protegidas e precisão segura com BigInt. Não estender silenciosamente essa regra a outras correções.                                                 |
| Pedidos            | Valor ajustável inclusive zero, Pago/Pendente, composição Pix/dinheiro/misto conforme validador atual, produto inválido e preservação de preço/nome do snapshot na edição.                                                                       |
| Insumos            | Compra exige valor positivo, caixa e comprovante; doação material permite zero e não exige caixa, com Pendente/Recebido e nome do doador normalizado.                                                                                            |
| Comprovantes       | Até 5 arquivos de até 5 MB, tipos permitidos e assinatura real dos bytes. Testar limite exato e excedente; metadados válidos não legitimam conteúdo incompatível. Movimentação aceita lista vazia; compra de insumo exige anexo mantido ou novo. |
| Acesso e sessão    | Ausência de sessão, papel não permitido, expiração, cookie adulterado/malformado e duração superior a duas horas rejeitados; sessão interna válida aceita. A assinatura do JWT externo continua uma pendência, não uma garantia coberta.         |

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
| Exclusão e vínculos         | Excluídos saem das listas/saldos e não aceitam edição; snapshots/autoria permanecem. Evento com pedidos ou insumos preservados não pode ser excluído; caixa com vínculos protegidos também não. Incluir vínculo já excluído logicamente.                                                                |
| Histórico e Home            | Criar/editar/excluir preserva antes/depois, autor e versão; troca de caixa aparece no histórico dos dois sem somar auditoria ao saldo. Home agrega todos os caixas ativos, sem depender da primeira página, e não inclui caixas excluídos.                                                              |
| Comprovantes privados       | Salvar e ler bytes pelo use case com vínculo válido; manter/remover anexos na edição preserva objetos históricos. Rejeitar receiptId de outro registro, sessão ausente e perfil proibido. Retornos destinados à interface não expõem chaves privadas.                                                   |
| Acesso e contratos externos | Leituras/gravações representativas recusam sessão ausente ou papel proibido sem efeitos. Login/perfil com resposta inválida, credenciais recusadas ou identidade divergente não concluem autenticação; respostas válidas permitem o fluxo esperado, sem chamar o serviço real.                          |

## Isolamento e execução

1. Criar D1 e R2 descartáveis com dados inteiramente sintéticos e aplicar as migrações versionadas em ordem. Não usar `.wrangler/state`, `.env`, banco de desenvolvimento ou recursos remotos.
2. Limpar/recriar apenas esse ambiente descartável entre cenários. Cada teste deve funcionar sozinho e em qualquer ordem; relógio controlado nos casos de expiração e datas.
3. Encerrar o emulador ao terminar, inclusive após erro. Sem servidor Next, portas fixas ou processos deixados em segundo plano.
4. Executar `npm run test:unit`, `npm run test:integration` ou `npm test` para ambos, com execução única por padrão. Para um cenário isolado: `npm run test:integration -- -t "trecho do nome"`. Os arquivos de integração executam em sequência para manter um contexto descartável por vez. Não usar `it.concurrent` com o harness compartilhado; concorrência financeira é exercitada dentro do próprio cenário.
5. Ao alterar código, executar os grupos afetados e o build completo Cloudflare/TypeScript conforme o contrato do projeto. Não confundir aprovação da suíte com validação da interface ou publicação.

## Manutenção e limites da evidência

As migrações SQL são lidas e aplicadas em ordem no banco novo de cada cenário, em batches transacionais, usando o parser SQL do Wrangler para preservar corpos de triggers. O parser é uma API `unstable` do Wrangler: atualizar a dependência exige executar a integração e conferir sua compatibilidade. O harness descarta somente seu diretório temporário e encerra o Miniflare no sucesso e na falha; nunca apaga estado do app.

O emulador precisa de processos e sockets locais em portas aleatórias de loopback. A execução restrita do agente pode exigir liberação da ferramenta para isso. Não há servidor Next, acesso ao D1/R2 remoto ou chamada real à API de login. Vitest não carrega `.env` (`envDir: false`); os contratos externos recebem respostas sintéticas por injeção de `fetch`. O deploy isolado não copia `tests/` nem a configuração Vitest para o pacote.

Arquivos donos da cobertura:

- `tests/unit/rules.test.ts`: dinheiro, datas, inputs e regras de pedidos/insumos.
- `tests/unit/release-error.test.mjs`: classificação técnica controlada e ausência de conteúdo privado nos diagnósticos.
- `tests/unit/deploy-worker.test.mjs`: envio por argumentos, autenticação por token/perfil e resultado incerto, com processo simulado.
- `tests/unit/release.test.mjs`: versões/tags, APIs controladas e falhas/repetição do fluxo de publicação, sem rede ou deploy real. Arquivo .mjs para testar scripts Node existentes sem acrescentar executor ou configuração de compilação.
- `tests/unit/receipts-session.test.ts`: metadados/conteúdo de comprovantes e sessão interna.
- `tests/integration/finance.test.ts`: saldos, CRUD financeiro, snapshots, repetição, concorrência, vínculos e Home.
- `tests/integration/receipts-access.test.ts`: R2, vínculos privados, acesso e propriedades enviadas aos componentes cliente pelas páginas reais, sem navegador.
- `tests/integration/auth.test.ts`: login/perfil com repositories reais, transporte controlado e sessão sintética assinada.

A suíte deve passar individualmente e em conjunto, com saída diferente de zero nas falhas e identificação da regra violada. Ao modificar regras cobertas, atualizar os cenários correspondentes sem espelhar detalhes internos. Não alterar regra de negócio apenas para tornar um teste verde.

Os testes não validam visual, interação no navegador, cabeçalhos HTTP das rotas de comprovantes, carga ou serviço externo real. A implementação não resolve a assinatura pendente do JWT externo nem reconcilia objetos R2 sem vínculo. Não exige limpeza de objetos após falha D1: o contrato preserva resultados incertos. Nenhuma migração no banco de desenvolvimento ou produção faz parte da execução da suíte.
