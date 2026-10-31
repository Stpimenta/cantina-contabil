# Arquitetura e padrões aprovados

Contrato atual consolidado em 30/10/2026. Histórico de versões em [RELEASES.md](RELEASES.md); contexto de retomada em [STATUS.md](STATUS.md). Uma pendência não autoriza implementação.

## Stack e limites atuais

- Next.js, React e TypeScript; Cloudflare Workers com OpenNext; D1 com Drizzle ORM e consultas parametrizadas.
- Consultas por Server Components e gravações por Server Actions; chamadas internas não fazem HTTP para a própria aplicação.
- Não há API REST própria, controllers ou camada de DTOs. Login/perfil usam uma API externa.
- Nome público Ministério Contábil; identificadores técnicos/cookies e URL preservados. Versão publicada e diferenças locais são registradas somente em STATUS.md; migrações por ambiente em LOCAL.md e fatos históricos em RELEASES.md. R2 privado em produção e emulado no local. Anexos gerais, cobrança online e filas/WS continuam futuros.

## Estrutura e responsabilidades

```text
src/
  app/                       # rotas, páginas e layouts
    (authenticated)/         # Home, caixas, doações, eventos, movimentações e layout protegido
    login/
  presentation/              # componentes específicos por funcionalidade
  components/                # UI, modais e layout compartilhados
  server/
    auth/                    # cada funcionalidade possui apenas as camadas necessárias
    users/
    cash-boxes/
    events/
    movements/
    donations/
      actions/               # entrada pelas Server Actions
      inputs/                # schemas Zod e validadores das entradas
      use-cases/             # uma operação por arquivo
      models/                # modelos separados e funções puras de regras
      repositories/          # contratos
      infrastructure/        # repositories Drizzle/D1, schemas por tabela, API/cookies
      composition.ts         # montagem manual de dependências
  shared/                    # contratos, erros, logging, hooks e utilitários
migrations/                  # alterações SQL versionadas, com preservação dos objetos existentes
```

`server/` é o backend da aplicação, mesmo sem uma API própria exposta. A organização é por funcionalidade: suas camadas ficam próximas. Não reunir todos os models, inputs ou repositories de funcionalidades diferentes em pastas globais.

| Parte                  | Responsabilidade                                                                                      | Limite                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Action                 | Adaptar a chamada da interface: extrair dados, obter sessão, chamar use case e revalidar/redirecionar | Depende de Next; não concentra validação ou regras de negócio              |
| Input com Zod          | Definir e validar a entrada, aplicar normalizações/conversões aprovadas                               | Sem mensagens de interface, acesso ao banco ou efeitos colaterais          |
| Use case               | Executar uma operação: verificar acesso, chamar validação, aplicar regras e coordenar repositories    | Sem Next/HTTP, SQL, Drizzle ou instruções de formulário                    |
| Model                  | Representar conceitos e dados da aplicação, inclusive modelos de leitura                              | Não é a definição física de uma tabela e não depende do ORM                |
| Contrato de repository | Definir consultas/gravações e seus resultados necessários à operação                                  | Sem detalhes de D1, Drizzle ou API externa                                 |
| Infraestrutura         | Implementar os contratos usando Drizzle/D1, API externa ou cookies                                    | Detalhes dos provedores ficam aqui                                         |
| Schema Drizzle         | Mapear uma tabela para consultas/gravações tipadas                                                    | Na infraestrutura do dono; integridade completa continua nas migrações SQL |
| Composition            | Montar os use cases com as implementações dos repositories                                            | Sem regras de negócio                                                      |

Uma operação por use case pode incluir vários passos: validar, conferir idempotência, verificar disponibilidade, construir o model e solicitar a gravação. Isso não exige criar use cases separados para cada passo. Manter um model por arquivo; schemas e validadores relacionados à mesma entrada podem compartilhar arquivo. Criar/editar podem reutilizar a mesma entrada quando campos e regras forem iguais. Regras reutilizáveis são funções puras; não criar services intermediários artificiais ou pastas vazias.

### Composição e referências

Estrutura por funcionalidade inspirada em Clean Architecture, com injeção por construtor sem container (Pure DI). composition.ts é a fábrica de montagem de cada funcionalidade: obtém o adaptador Drizzle/D1, instancia repositories e injeta seus contratos nos use cases. Banco/R2 ficam na infraestrutura, não nos use cases. Actions, Server Components/layouts e futuros adaptadores HTTP consomem os use cases montados; use cases não chamam composition. users é montado pela autenticação, conforme o fluxo atual. Não são singletons globais: cada chamada monta o conjunto necessário à funcionalidade. Não há obrigação de criar container, services/controllers/DTOs ou uma composição própria para área sem necessidade.

Referências conceituais: [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html), [Dependency Injection](https://martinfowler.com/articles/injection.html), [Pure DI](https://blog.ploeh.dk/2014/06/10/pure-di/) e [Composition Root](https://blog.ploeh.dk/2011/07/28/CompositionRoot/). A organização por composition.ts de funcionalidade é adaptação deste projeto, não reprodução literal de uma raiz global única.

### Caminhos de gravação e consulta

- **Gravação:** formulário → useServerAction → Server Action → use case. O use case verifica acesso, chama o validador Zod em inputs/, recebe dados normalizados, aplica regras e usa o contrato de repository. A implementação de infraestrutura usa Drizzle → D1. A Action revalida as páginas afetadas ou redireciona após sucesso; a interface fecha o formulário e mostra o toast pelo padrão existente.
- **Consulta:** Server Component → use case → validação dos parâmetros/filtros → contrato de repository → infraestrutura Drizzle → D1. O resultado retorna à página para renderização; consultas não precisam atravessar uma Server Action.
- **Validação:** validateInput executa schema.safeParse; resultado válido contém os dados normalizados. parseInput entrega esses dados ao use case ou lança BusinessError com códigos/issues técnicos. O formulário de doação também usa essa validação pura para feedback local, sem substituir a validação obrigatória no servidor.
- **Falha:** executeOperation → handleFailure. BusinessError é traduzido pelo catálogo da apresentação; infraestrutura/desconhecidos recebem diagnóstico no logger e referência segura para a interface. Erros de validação com campos corrigíveis ficam inline; ErrorModal atende as demais falhas de gravação; PageFailure atende consultas. O use case não escolhe mensagens nem componentes visuais.

Para uma futura API, o adaptador HTTP chamará os mesmos use cases e validadores, conforme a seção API futura; não dependerá das Actions. Não antecipar essa implementação.

Use cases não dependem de Next/HTTP/Cloudflare. A interface usa Server Actions, tipos e regras puras; não importa banco, segredos ou composição para o navegador. Server Components podem chamar use cases diretamente no servidor. `server-only` protege os pontos de composição/infraestrutura necessários; o nome da pasta server sozinho não protege imports.

`app/(authenticated)/layout.tsx` monta AppShell uma vez. Navegação entre páginas preserva o menu; login fica fora do grupo. Layout não substitui autorização nas operações: páginas conferem sessão e use cases verificam acesso.

## Entradas e validação com Zod

- Zod 4.6.7 é o padrão das entradas de login, gravações e consultas de caixas/doações/eventos/pedidos/insumos/movimentações. Schemas e funções validate ficam em inputs/ da funcionalidade; criar/editar caixa compartilham save-cash-box.input.ts por terem os mesmos campos/regras. Não criar DTO/controller/service obrigatório.
- Use cases recebem dados não confiáveis, verificam acesso quando aplicável e chamam os validadores antes de consultar/gravar. Actions apenas extraem FormData/argumentos, obtêm sessão/contexto e cuidam de revalidação/redirecionamento. Consultas entram por Server Components, usando os mesmos validadores nos use cases.
- Cada schema define tipos/formato/limites e as transformações aprovadas. z.input/z.output permitem derivar tipos sem duplicar contratos. Schemas de entrada Zod são diferentes dos schemas de tabelas Drizzle.
- shared/validation/input.ts centraliza safeParse e a conversão para códigos técnicos e issues por propriedade; parseInput transforma a falha em BusinessError. Não devolver nem registrar ZodError, suas mensagens ou dados brutos. A apresentação continua dona das mensagens e da associação visual aos campos.
- Preservar o formato de e-mail existente e nunca normalizar a senha. Nome de caixa mantém NFKC/espaços; textos opcionais mantêm trim/limites. Parsing de centavos usa funções puras com BigInt, sem lógica monetária na tela; data civil usa isDateOnly. Zod organiza essas regras, sem substituí-las por conversões genéricas ou aceitar novos formatos.
- Consultas preservam truncamento/normalização da busca, limite de ano e página inválida voltando a 1; categoria inválida do histórico volta a all. Identificadores de caixas mantêm o valor original e ausência é tratada pelo use case. Sem remover HTML/caracteres indiscriminadamente nem alterar silenciosamente textos.
- Formulário de doação reutiliza o mesmo schema para feedback local; a validação no servidor é obrigatória. Os demais formulários financeiros também reutilizam seus validadores puros pelo useServerAction. Regras que exigem banco, autorização, concorrência e idempotência continuam nos use cases/repositories e nas proteções do D1.

## Contratos de integração e sessão

Schemas Zod de respostas do GestPV ficam na infraestrutura de cada dono: user-profile.schema.ts e login-response.schema.ts. safeParse verifica estrutura/tipos/limites sem registrar mensagens ou objetos brutos do Zod. Repository verifica também identidade (ID do perfil igual ao solicitado), HTTP e status de login com if e falhas técnicas apropriadas. Preservar as regras existentes: nome não vazio após trim e até 200 caracteres, email string até 254 (sem impor novo formato); nascimento/telefone opcionais mantêm normalização anterior. Login status=false continua INVALID_CREDENTIALS mesmo sem token, status=true exige token string não vazio. 401, timeout de 12s e redirect manual preservados.

session-payload.schema.ts valida a estrutura assinada do cookie; datas/limite de duas horas continuam verificados pelo codec. Schema puro privado em read-external-identity valida claims; expiração e perfil autorizado continuam verificações semânticas independentes. Model User não vira schema de transporte ou tabela. Inputs de formulário/consulta continuam em inputs/ e não se confundem com contratos externos ou schemas Drizzle. JSONs de snapshots internos não foram reescritos nem receberam novas regras de negócio nesta revisão.

## Máscaras de entrada compartilhadas

- shared/masks/input-masks.ts é o dono das funções puras maskMoneyInput, formatMoneyInput e maskBrazilianDate. Não criar máscaras próprias em páginas, formulários ou use cases; novos formatos precisam ampliar os donos compartilhados conforme decisão aprovada.
- Todo campo editável de dinheiro usa components/ui/money-field.tsx, inclusive preço de produto, valor do pedido, parcela em dinheiro e doação. Esse componente reutiliza Field e centraliza digitação/colagem, bloqueio de letras/overflow, máscara por centavos e posicionamento do cursor. Exibição pt-BR com duas casas; o valor emitido/FormData é decimal sem separador de milhar.
- Datas usam components/ui/date-field.tsx e a máscara central dd/mm/aaaa; conversão/validação de calendário permanece em shared/dates/date-only.ts e o valor enviado é ISO.
- Parsing monetário e schemas ficam em shared/validation/money-input.ts e inputs/ da funcionalidade. A máscara não altera limites/regras: doação permanece estritamente positiva, pedidos/produtos permitem zero conforme os contratos. Dados vindos de outras entradas continuam sujeitos à validação no servidor.
- Valores somente para leitura usam formatCurrency/formatDateOnly/formatDateTime; não aplicar máscara de edição em saldos ou histórico.

## Exceções tipadas e executor central

- Use cases retornam valores diretamente. Erros conhecidos lançam BusinessError via throwBusinessError, com código tipado, categoria e issues técnicas associadas às propriedades de entrada. Não contêm mensagens, rótulos ou instruções de formulário. O contrato BusinessFailure fica em shared/errors/business-failure.ts. Não lançar Result nem criar uma classe para cada código.
- InfrastructureError representa falhas reconhecidas da infraestrutura, como HTTP não bem-sucedido, contrato externo inválido ou binding ausente. Se houver tradução de uma exceção específica, preserva a causa. Falhas inesperadas de fetch/JSON/D1/R2 propagam com seu erro original até a entrada, sem wrapper genérico.
- `shared/errors/execute-operation.ts` captura operações de entrada, recebe operação/mensagem/arquivo/rota/método/contexto e retorna Result serializável para o frontend. Preserva redirect/notFound e demais sinais do Next com unstable_rethrow.
- `handle-failure.ts` usa presentation/errors/present-business-failure.ts para traduzir BusinessError em mensagem/campos da interface, sem log de falha interna. O catálogo da apresentação é único e também atende a validação local. Infraestrutura/desconhecidos geram referência, log técnico e mensagem amigável. Nunca enviar stack, SQL, causa ou mensagem bruta do provedor à interface.
- Não repetir try/catch em actions, páginas ou use cases. Na infraestrutura, capturar apenas quando existe tratamento específico: constraints identificadas, recuperação de formato inválido esperado ou contexto indispensável a uma exceção reconhecida. Nenhum catch só para trocar a mensagem; casos não reconhecidos são relançados com throw cause, preservando tipo/stack/cause. Não deslocar a repetição para um helper genérico nem usar Promise.catch como disfarce.
- D1 mantém capturas nas gravações exclusivamente para traduzir códigos de triggers/constraints em resultados técnicos (duplicidade, concorrência, saldo insuficiente etc.). Consultas não têm wrappers query; inesperados sobem diretamente. R2 put/get e chamadas HTTP/response.json também não possuem capturas genéricas. Executor central segue responsável por resposta amigável, referência e único log; erro nativo inesperado recebe UNEXPECTED_ERROR, falha explícita InfrastructureError recebe SERVICE_UNAVAILABLE, sem expor detalhes ao usuário.
- JWT externo e cookie da sessão mantêm captura estreita de SyntaxError/DOMException InvalidCharacterError para token/cookie malformado: convertem somente esses formatos nos resultados técnicos já existentes. Outras falhas, inclusive criptográficas inesperadas, propagam. Isso não valida a assinatura do JWT externo nem altera a pendência.
- validateDonation, em donations/inputs/create-donation.input.ts, usa o schema Zod compartilhado com o formulário e retorna uma união técnica de sucesso/BusinessFailure. O use case usa parseInput para lançar BusinessError quando inválido; o formulário traduz a falha pelo catálogo da apresentação. Essa união técnica não é o Result serializável da fronteira.
- Falhas fora da operação ou de renderização passam por `src/instrumentation.ts` (onRequestError), com o mesmo logger, e pelo fallback visual do Next.
- Futuro adaptador HTTP usa mapHttpError: validação 400; sem autenticação 401; sem permissão 403; ausente 404; conflito 409; inesperado 500; indisponibilidade 503. Status HTTP não pertence ao domínio.

## Logs e auditoria

Logger próprio JSON em `shared/logging/logger.ts`; terminal no local e Workers Logs em produção, com observabilidade habilitada. Nenhum serviço externo foi contratado; retenção segue a conta.

- Campos: timestamp, nível, ambiente, operação, arquivo de origem, rota/método, motivo, código, referência e contexto seguro (autor/recurso quando disponível).
- Diagnóstico: classe, mensagem, stack, cadeia de causas, code/errno/syscall e metadados de serviço/status/endpoint/arquivo. Causas limitadas a cinco níveis e AggregateError a dez itens por nível.
- SyntaxError pode incluir trecho do JSON recebido: logger omite a mensagem original e conserva apenas linhas de stack com localização técnica, sem trechos de payload.
- DrizzleQueryError contém SQL e parâmetros na mensagem/stack: o logger substitui essa mensagem por diagnóstico genérico e omite essa stack, preservando a causa técnica. Não serializar query/params.
- Um log na fronteira por falha capturada. Adaptadores não registram logs; contexto adicional só nas falhas explicitamente reconhecidas. A fronteira identifica operação/rota/origem, e o erro original conserva a stack/cadeia de causas. Erros conhecidos não geram log de falha interna.
- Filtrar segredos e informações pessoais; não registrar corpo de login, headers, cookies, tokens, parâmetros SQL ou objetos pessoais completos. URLs técnicas perdem credenciais, query e fragmento.
- Não afirmar que uma gravação não ocorreu quando a resposta é incerta. A mensagem deve orientar conferir os dados antes de repetir.
- Auditoria financeira/autoria fica no banco, separada dos logs técnicos.

## Ações no frontend

`shared/hooks/use-server-action.ts` é o executor único para login, logout, criação/edição de caixa, exclusão, doação, eventos e pedidos. Controla pending, trava síncrona, erro/campos, validação local, revalidação ao editar e foco. Validação com campos mapeados não abre modal; demais falhas usam ErrorModal. O ErrorModal central intercepta especificamente SESSION_EXPIRED com categoria unauthenticated e navega com router.replace para /login sem abrir diálogo; isso também cobre falhas da rota de comprovante. Não redirecionar por toda falha de autenticação: credenciais inválidas e expiração do acesso na tentativa de login permanecem no formulário de login.

Cada componente informa mensagem de conexão, IDs dos campos em ordem visual e callbacks. Somente a chamada remota é capturada; erro de callback local não deve virar falsa falha de conexão após sucesso. O catch do hook chama unstable_rethrow antes de tratar transporte, preservando os sinais de navegação do Next também no navegador: redirect de login/logout não abre ErrorModal. Não atualizar estado nem executar callbacks após desmontagem.

Sem retry, log técnico no navegador ou referência fictícia. Login limpa senha após falha de autenticação/servidor, preservando-a em erro de validação; formulários financeiros preservam dados. Formulários fornecem validate e validationKey ao hook: usam os mesmos validadores puros de inputs/ e presentBusinessFailure, sem duplicar regras. O hook valida no envio, foca o primeiro campo inválido e, após a tentativa, revalida localmente quando os valores mudam, sem chamada remota ou deslocamento de foco. O servidor sempre repete a validação antes de acessar dados. PageFailure e app/error.tsx atendem outros contextos. Busca/filtros são navegação; CopyButton usa API do navegador e não passa por esse hook.

## Banco e integridade

- Binding DB; D1 publicado cantina-contabil. `shared/infrastructure/database.ts` monta o Drizzle com o binding D1, somente no servidor. Cada repository de infraestrutura recebe essa conexão; use cases e contratos de repositories não dependem do ORM.
- Migrações existentes: 0001_cash_boxes.sql, 0002_cash_box_audit.sql e 0003_donations.sql; o bloco de eventos acrescenta 0004_events.sql até 0009_event_audit.sql. Não editar depois de aplicadas; mudanças exigem nova migração. Schemas Drizzle ficam separados por tabela; uma migração SQL pode coordenar os objetos da alteração.
- IDs UUID; autoria vem da sessão, nunca de campos enviados pela interface. Datas técnicas ISO/UTC, exibidas em America/Sao_Paulo.
- Toda movimentação tem data de ocorrência e data/autor do registro. Soft delete preserva registro, data e autor; não criar exclusão física como operação de negócio.
- Movimentações manuais seguem a fronteira atômica e regras aprovadas abaixo; transferências automáticas futuras precisam de decisão própria. Soft delete não autoriza alterar silenciosamente o financeiro.

### ORM e schemas

- Drizzle ORM 0.45.4; organização por funcionalidade preservada. Um arquivo `.schema.ts` por tabela na infraestrutura do dono: cash-box.schema.ts, cash-box-audit.schema.ts e donation.schema.ts.
- Schemas mapeiam colunas, tipos e referências para consultas/gravações; não substituem os models da aplicação. Dependências entre schemas representam vínculos existentes no banco.
- CRUD, contagens, filtros e opções usam o construtor tipado. Agregação de saldo e UNION do histórico usam o template `sql` do Drizzle, mantendo parâmetros separados dos dados e a ordenação anterior.
- As migrações SQL existentes continuam sendo a fonte de criação e integridade: índices, CHECKs e triggers de auditoria/saldo permanecem em migrations/. Os schemas de consulta não são uma descrição completa desses objetos. Não usar push nem gerar diferenças automáticas a partir deles, pois isso poderia remover proteções.
- A adoção do ORM não exige recriar tabelas nem aplicar migrações: o banco existente permanece compatível. Novas mudanças estruturais exigem nova migração SQL versionada e atualização do schema correspondente. Wrangler continua aplicando migrações; não há Drizzle Kit ou segundo histórico de migrações nesta etapa.
- Erros de constraints são reconhecidos na cadeia limitada de causas do provedor, pois o Drizzle pode encapsulá-los. Preservar retornos de conflito, idempotência e concorrência dos repositories.

### Caixas

- Cadastro, listagem/busca, consulta, edição e soft delete. Nome obrigatório até 100 caracteres; descrição opcional até 500.
- Nome ativo único por chave Unicode NFKC, espaços normalizados e minúsculas pt-BR; índice único parcial garante concorrência. Edição/exclusão verificam versão.
- created/updated/deleted preservam data, ID e nome do autor. Triggers gravam snapshots antes/depois em cash_box_audit na mesma operação; falha na auditoria desfaz a gravação.
- Caixa com qualquer doação, evento vinculado, compra de insumo ou movimentação preservada não pode ser excluído; triggers garantem a regra mesmo em concorrência. Não presumir proteção para outros módulos futuros.
- CashBoxSummary separa o modelo de leitura: balanceCents é o real (doações não excluídas + valores dos pedidos pagos dos eventos vinculados); pendingCents soma os valores dos pedidos pendentes. Compras de insumos são subtraídas do real do caixa de origem, inclusive quando financiam evento de outro caixa. Movimentações manuais ativas somam entradas e subtraem saídas do real, sem alterar pendente. Pedidos excluídos ficam fora de ambos os saldos. Não somar novamente a auditoria ou parcelas por forma de pagamento, não usar zero fixo nem permitir edição direta de saldo.

### Doações recebidas

- Caixa obrigatório, valor positivo, data civil, doador opcional até 100 e observação opcional até 500. Cadastro/consulta, edição versionada e exclusão lógica confirmada; sem estorno bancário, recebível ou anexo.
- Inteiros em centavos, conversão com BigInt sem ponto flutuante, limite Number.MAX_SAFE_INTEGER por valor/saldo. Validação na aplicação e D1; apresentação BRL preserva centavos.
- Data da doação YYYY-MM-DD, independente de created_at UTC. Ano filtra essa data. Retroatividade permitida; não foi estabelecida restrição de data futura.
- UUID por formulário é a chave da operação: mesmo autor/conteúdo retorna o registro existente; reutilização diferente é conflito. Sem retries automáticos.
- Triggers impedem gravar em caixa indisponível ou ultrapassar precisão de saldo. Edição e exclusão lógica foram autorizadas; retiram o efeito anterior antes do recálculo e bloqueiam saldo negativo nos caixas afetados. Registros excluídos são imutáveis e não entram no saldo/lista.
- Busca q somente pelo nome do doador, trim e limite de 100. LIKE parametrizado com escape de !/%/_, combinado com caixa/ano na contagem e listagem. Busca/filtros/paginação ficam na URL.

- Correção de doação pode alterar caixa, valor, data, doador e observação. Use cases validam dados/referência antes de consultar e usam BigInt para conferir o saldo final de ambos os caixas quando houver mudança. Bloquear redução/exclusão de entrada já usada quando resultar em negativo; D1 repete a guarda atomicamente com gravação e auditoria. Versão otimista, autoria de criação preservada e data/autor de alteração/exclusão.
- Migração 0021_donation_edit_soft_delete.sql acrescenta version/updated_at/updated_by/updated_by_name com metadados anteriores preservados; preenche a atualização inicial a partir da criação. donation_audit recebe snapshots iniciais das doações existentes, conservando autor/data/valores; novas operações registram antes/depois e caixa atual/anterior no histórico. Dados de doação não são apagados, snapshots são imutáveis; não somar auditoria ao saldo.

### Histórico, paginação e datas

- Histórico de caixa usa UNION ALL da auditoria cadastral, auditoria de doações e auditoria dos eventos/pedidos vinculados, ordenado por data/hora técnica e ID estável. Categorias all/events/incoming/outgoing: incoming inclui doações e alterações de pedidos com pagamento atual ou anterior; events inclui cadastro de caixas/eventos e pedidos pendentes. Saídas inclui a auditoria das compras de insumos pagas pelo caixa consultado e movimentações de saída; Entradas também inclui movimentações manuais de entrada. Auditoria não é uma nova entrada financeira. Snapshots completos chegam ao detalhe sem consulta extra.
- Subconsultas correlacionadas de saldo qualificam explicitamente o ID do caixa externo com sql.identifier e os nomes do schema. Não interpolar somente cashBoxes.id nesses trechos: a simplificação de referências do Drizzle em SELECT de uma tabela pode remover o qualificador, tornando o ID ambíguo ou vinculando-o à tabela interna.
- Limite único DEFAULT_PAGE_SIZE = 15 em shared/pagination.ts; LIMIT/OFFSET no repository. Caixas ordena criação/ID, doações data civil/criação/ID e pedidos nome ascendente (COLLATE NOCASE), com criação/ID decrescentes para desempate. Página fora do intervalo é ajustada.
- Datas visíveis dd/mm/aaaa; auditoria acrescenta HH:mm em America/Sao_Paulo. DateField faz máscara/validação e entrega ISO; datas civis não sofrem conversão de fuso.

## Eventos e pedidos

### Cadastro e organização

- Funcionalidade em server/events/, com actions, inputs Zod, use cases independentes, models separados, contratos de repository, implementação Drizzle e composition. Não criar services/controllers/DTOs obrigatórios.
- O preço do produto é editado com MoneyField: máscara por centavos e exibição pt-BR, emitindo string decimal canônica sem agrupamento. Letras/overflow não atualizam o estado; o servidor mantém moneyInputSchema, sem aceitar strings arbitrárias ou confiar na máscara.
- Evento pertence a um caixa, com nome obrigatório até 100, descrição opcional até 500, data civil e 1 a 100 produtos. Produto tem UUID estável, nome até 100, ícone do catálogo permitido e preço em centavos, inclusive zero. Edições preservam as versões anteriores do catálogo.
- O vínculo ao caixa permanece no cadastro original: editar evento altera nome/descrição/data/produtos, sem transferência entre caixas. Exclusão lógica de evento é permitida somente sem pedidos, com confirmação, autoria/data e histórico preservados no caixa; o registro deixa a lista e não abre mais no detalhe. Bloqueio no use case e trigger atômica impedem corrida com criação de pedidos. Caixa com evento vinculado continua sem permitir exclusão, preservando o acesso ao histórico.
- Tabelas: events, event_products, event_orders, event_order_items, event_order_payments e event_audit. Schemas Drizzle por tabela; migrações SQL versionadas por alteração, podendo coordenar vários objetos. As migrações anteriores não foram alteradas.

### Pedido e pagamento simples

- Nome da pessoa obrigatório até 100; observação sempre disponível, opcional e até 500. Não exigir justificativa para gratuidade, desconto ou contribuição adicional.
- Pedido contém 1 a 100 produtos distintos e quantidades inteiras positivas. Preço unitário/nome/ícone são obtidos no servidor; nunca confiar em preço enviado pela interface. Produtos já presentes num pedido editado mantêm seu snapshot; novos produtos usam o catálogo atual.
- Há somente um valor do pedido: começa com a soma de preço × quantidade e pode ser editado livremente para menos, mais ou zero. Enquanto não ajustado manualmente, acompanha mudanças nos itens; depois do ajuste, o valor digitado é preservado. O subtotal dos produtos é referência, sem outro saldo ou valor combinado independente.
- Situação escolhida: pago ou pendente. Não há pagamento parcial. Pago contribui integralmente com o valor ajustado no real; pendente contribui integralmente no pendente. Exclusão lógica retira o valor do respectivo saldo, sem apagar snapshots ou registrar devolução. Pedido zero não altera valores dos saldos, independentemente da situação.
- Formas na interface: Pix, Dinheiro e Dinheiro e Pix, nessa ordem. Novos pedidos começam com Pix; edição preserva a forma inferida das parcelas existentes. Pago/Pendente continua uma escolha própria. Nas formas únicas, todo o valor vai à forma escolhida. No misto, informa-se a parcela em dinheiro e Pix é calculado como o restante do mesmo valor do pedido. As parcelas de um pedido pago somam exatamente esse valor; pendente tem parcelas zero. Não há um campo adicional de valor recebido.
- Exemplo aprovado: produtos de R$ 40 com valor do pedido alterado para R$ 20 significam R$ 20 no real se pago ou R$ 20 no pendente se não pago. Para contribuir R$ 50, basta digitar R$ 50 no mesmo campo.
- Editar permite corrigir itens/quantidades, pessoa, observação, valor, situação e distribuição dinheiro/Pix. Correções recalculam real/pendente e preservam antes/depois, autor e instante. Correção de registro não representa devolução física de dinheiro; estorno/devolução/cancelamento continuam fora do escopo.

- Consulta de pedidos aceita status all/pending/paid, normalizado por Zod (valor ausente/inválido vira all). Repository aplica condição paid antes da contagem e do limite; não filtra somente os itens da página. Exclusão de evento continua consultando todos os pedidos, sem filtro.

- Detalhe do evento exibe Dinheiro e Pix em linha secundária discreta após o resumo financeiro, com quebra natural no celular. Somam somente as parcelas dos pedidos pagos ativos, incluindo pagamento misto; pendentes/excluídos ficam fora. São composição do Real, sem somar novamente ao saldo ou descontar insumos por meio de pagamento. Agregação em centavos no repository com precisão segura; sem novos campos persistidos ou migração.

### Integridade, versões e auditoria

- Gravação principal única de evento/pedido; triggers criam produtos/itens/parcelas e auditoria na mesma operação. Falha em qualquer etapa desfaz toda a gravação. Sem transação interativa ou sequência de gravações independentes.
- Produtos, itens e parcelas guardam versões imutáveis: chaves event_id/version/id, order_id/version/product_id e order_id/version/method. event_audit guarda snapshots JSON completos anteriores/posteriores, recurso, operação, autor e instante. Não apagar as versões antigas ao editar.
- payload_json dos registros principais contém o snapshot canônico criado no servidor; triggers projetam esse mesmo conteúdo nas tabelas de versões e na auditoria. Leituras dos agregados usam esse snapshot com metadados/valores tipados; não aceitar JSON bruto fornecido pelo navegador como snapshot autorizado.
- UUID por formulário identifica a operação; lastOperation/fingerprint normalizado e autor permitem reconhecer repetição idêntica. Reutilizar a operação com dados diferentes é conflito; sem retry automático.
- Edição verifica a versão lida e faz UPDATE condicionado à versão. O formulário de pedido também informa a versão do catálogo: alteração concorrente de produtos exige atualizar o contexto, sem converter um preço desatualizado em desconto silencioso. Trigger confere novamente essa versão e a origem dos preços.
- Dinheiro usa BigInt para conversão/cálculo e inteiros seguros para persistência; schema/limites protegem valores e subtotal. Triggers impedem ultrapassar precisão agregada no real (doações + pedidos pagos) e no pendente por caixa, inclusive quando uma doação é inserida após pedidos.
- Saldos são calculados dos registros atuais, sem sobrescrever saldo diretamente, sem terceiro saldo teórico/previsto e sem duplicação em donations ou na auditoria. Compras de insumos geram saída imediata no caixa escolhido; movimentações manuais cobrem entradas/saídas gerais; estoque, anexos fora dos insumos e integrações de cobrança permanecem futuros.

## API futura

Quando houver necessidade aprovada: Route Handler → controller por operação → use case → repository. Rotas específicas por recurso, sem endpoint genérico que decida tudo por campo de ação. Não antecipar catálogo REST, controllers ou DTOs. OpenAPI/Swagger ficam para o futuro; preservar tipos independentes de HTTP desde agora.

## Autenticação e perfil

- Autenticação pelo endpoint existente: `POST https://gestpvapi.ibpalavraviva.com.br/api/Login`, com os campos `gmail` e `senha`.
- Credenciais inválidas retornam HTTP `401`, com `status: false` e token vazio.
- Login bem-sucedido retorna `status: true` e `jwtToken`.
- Somente os perfis `root`, `admin` e `tesouraria`, informados no campo `status` do JWT, poderão acessar o sistema.
- Os perfis `membro`, `pending`, `inativo` e qualquer perfil ausente ou desconhecido devem ter acesso negado.

### Carregamento do perfil

- Após o login aceito e a conferência do perfil permitido, consultar no servidor `GET https://gestpvapi.ibpalavraviva.com.br/api/Usuario/{id}`.
- Obter o ID do próprio usuário do claim `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/sid` do JWT; não usar um ID arbitrário enviado pela tela para esse carregamento.
- Utilizar o perfil retornado para apresentar o usuário no app, incluindo seu nome. O contrato informado também oferece `id`, `email` e `urlImage`, além de outros campos pessoais.
- Não repassar o objeto completo à interface nem registrá-lo integralmente nos logs. Campos aprovados para a primeira entrega: nome, e-mail, perfil de acesso, data de nascimento e telefone; CPF, RG, endereço, outras datas pessoais e `tokenContribuicao` não devem ser expostos por conveniência.
- Esse GET recebe `Authorization: Bearer <jwtToken>`, conforme confirmado pelo usuário. Não presumir que a consulta do perfil valida a assinatura do JWT ou resolve a pendência de segurança abaixo.
- A autorização continua baseada nos perfis permitidos do JWT, conforme combinado. Não substituir essa regra pelos campos `rule` ou `active` do perfil sem decisão do usuário.
- Falha ao carregar o perfil impede concluir a entrada e apresenta modal amigável, com diagnóstico técnico no log.

### Pendência: autenticidade do JWT externo

**PENDENTE — a integração inicial foi planejada sem validação criptográfica da assinatura do JWT. Essa limitação foi aceita temporariamente e precisa ser corrigida posteriormente para confirmar que o token é autêntico.**

Decodificar o JWT permite ler informações como `sid`, `status` e `exp`, mas não comprova que o token foi emitido pelo sistema de login nem que seu conteúdo permanece íntegro. A autenticidade dos claims não é comprovada por sua leitura; conferir perfil ou expiração isoladamente não resolve essa pendência. No caminho atual, o JWT vem diretamente da resposta HTTPS da API externa no servidor: a tela envia somente e-mail/senha e não há entrada aprovada para um JWT arbitrário do navegador. Não afirmar que foi demonstrada injeção ou invasão; também não afirmar segurança completa sem a validação pendente.

Antes de considerar a autenticação segura para uso em produção:

- Definir com o sistema de login a validação da assinatura no servidor, com algoritmo e chave confiáveis, ou um endpoint confiável que valide o token.
- Validar também a expiração e os demais critérios aplicáveis ao contrato da integração, como emissor e destinatário.
- Aplicar a validação e a autorização em todas as rotas protegidas, incluindo operações financeiras e acesso aos comprovantes.
- Rejeitar tokens inválidos, adulterados ou expirados e verificar esses cenários.

Não incluir senhas, tokens reais ou chaves secretas neste repositório.

A integração inicial foi implementada com a pendência acima preservada. A sessão interna é assinada, mas a assinatura do JWT externo ainda não é validada.

### Sessão e transporte atuais

- Após conferir sid/status/exp e carregar o perfil permitido, criar sessão interna HMAC-SHA256/Web Crypto com duração máxima fixa de 2 horas a partir do login, sem renovação automática por atividade, limitada também pela expiração do JWT externo. Sessão assinada versão 2 inclui issuedAt/expiresAt; leitura rejeita duração maior que 2 horas e cookies antigos sem essa garantia exigem novo login. HttpOnly, SameSite=Lax e Secure em produção; cookie __Host-cantina-session em produção e cantina-session no local, path=/.
- Logout remove o cookie do navegador; não existe revogação central da sessão já assinada. Um cookie válido obtido por outro meio pode ser reutilizado até expirar. HttpOnly dificulta leitura por JavaScript, não é garantia contra todo roubo de sessão.
- Guardar apenas dados de perfil aprovados e papel de acesso na sessão. Senha e JWT externo não são persistidos nem enviados ao navegador. Perfil é snapshot do login, sem novo GET a cada abertura de Meus dados.
- GET de perfil precisa corresponder ao ID do próprio usuário. Falha impede concluir o login. Não usar rule/active do perfil para substituir o status autorizado do token sem aprovação.
- Fetch de login/perfil: redirect=manual, timeout de 12 segundos e sem cache. Rejeitar 3xx, sem reenviar credenciais/Bearer para outro endereço. Não existe bypass local de autenticação.

## Ambiente, publicação e documentação

[LOCAL.md](LOCAL.md) descreve comandos, variáveis, persistência e debug. Next 5174 e Worker/Miniflare 8787 iniciam juntos; produção tem configuração separada. Somente .env/.env.example no local, sem ler valores em logs ou recriar .dev.vars/.env.local.

Deploy e alterações remotas somente com pedido explícito. `npm run deploy` exige tag/descrição, compila e seleciona wrangler.jsonc e o perfil cantina-contabil; não aplica migração remota automaticamente. Verificar versão publicada antes de declarar sucesso.

Tema/tokens/base e padrões reutilizados em app/globals.css; CSS Modules ao lado de cada dono. SelectField usa lista própria com options serializáveis, valor e onValueChange; hidden input mantém FormData e o evento input do filtro automático. Contratos completos em [DESIGN.md](DESIGN.md) e [UX-CONTRACT.md](UX-CONTRACT.md).

Testes unitários e de integração foram autorizados em 30/10/2026 e implementados em `tests/`, com Vitest e D1/R2 descartáveis no Miniflare. Casos de uso e repositories reais protegem as regras financeiras; dados e serviços externos são sintéticos, sem bypass no app. Cobertura, isolamento e limites em [TESTING.md](TESTING.md); comandos em [LOCAL.md](LOCAL.md#verificação-autorizada). Executar os grupos afetados pelas mudanças e manter o build completo Cloudflare/TypeScript. Não recriar verification/, testes visuais, carga ou cobertura percentual sem novo pedido. Notas de releases conservam verificações históricas, não substituem este contrato.

A migração 0010_event_soft_delete.sql adiciona autoria/data de exclusão em events e bloqueios atômicos. A exclusão incrementa a versão e grava deletedAt/deletedBy/deletedByName no snapshot; a auditoria existente registra a atualização de estado, apresentada como Evento excluído no histórico do caixa. Versões anteriores e produtos permanecem preservados. Eventos excluídos não aceitam edição nem novos pedidos.

## Página de pedidos e exclusão lógica

- Pedidos é página /eventos/[id]/pedidos dentro do layout autenticado, com consulta via use cases e q/page/status na URL. EventOrders é o link de navegação no detalhe; OrderList mantém interação e modais de adicionar/editar/excluir. URLs antigas orders=1 redirecionam preservando q/page. Breadcrumbs e PageHeader identificam o contexto de cada tela. SearchForm mantém scroll=true para envio explícito nas páginas; a busca automática após 350 ms usa scroll=false e replace, preserva filtros e reinicia a paginação. Centraliza debounce, composição de texto, sincronização da URL e preservação da digitação durante resposta pendente; sem implementar timers por tela. scroll=false permanece disponível para navegação dentro de modal.
- DeleteOrderUseCase valida sessão, IDs, versão e vínculo ao evento antes de chamar softDeleteOrder. Uma única atualização versionada grava deleted_at/deleted_by/deleted_by_name, autoria técnica e marcadores no payload; triggers preservam snapshots, itens, pagamentos e auditoria. A ação revalida evento, lista de eventos e caixas.
- Migração 0011_order_soft_delete.sql adiciona metadados de exclusão e impede novas alterações em pedidos excluídos. Consultas/listas/saldos e triggers de precisão monetária ignoram pedidos excluídos, mantendo o histórico fora dos cálculos financeiros. A auditoria técnica continua sendo atualização de estado, apresentada como Pedido excluído a partir do snapshot. Pedidos pagos excluídos aparecem em Entradas do histórico como registro de correção, sem duplicar ou manter valores no saldo.
- Não há exclusão física nem devolução de dinheiro. A regra aprovada de exclusão de evento continua exigindo ausência de pedidos, inclusive registros históricos excluídos, garantida pela trigger existente.

- Event.soldUnits é calculado somando quantidades da versão atual dos itens de todos os pedidos ativos (pagos, pendentes e gratuitos). JOIN por order_id e version evita duplicação de versões históricas; pedidos excluídos não contam. Não persistir contador nem contar tipos de produto em vez de unidades.

## Insumos e comprovantes privados

- Insumos é a expressão aprovada para ingredientes, embalagens e materiais de preparo. Funcionalidade dentro de server/events/ com models, inputs Zod, use cases, contratos de repository e infraestrutura D1/R2. Página /eventos/[id]/insumos segue breadcrumb, PageHeader, cadastro/listagem e paginação de 15, sem busca por nome.
- Cadastro: nome até 100, descrição opcional até 500, ícone do catálogo compartilhado, valor e origem compra/doação. Um registro pode agrupar os itens de uma nota com valor total e até 5 comprovantes; não existe obrigação de cadastrar cada item separadamente. Compra exige valor positivo, qualquer caixa ativo selecionado e arquivo de comprovante; já é paga e não gera pendência. Doação permite valor de referência inclusive zero, sem caixa, Pendente/Recebido e nome de quem doou opcional até 100 caracteres. O nome é normalizado sem espaços nas extremidades e compras sempre o gravam vazio; edição e snapshots preservam sua autoria e alterações. Marcar recebido atualiza versão/autoria/histórico sem movimentação financeira. Edição permite alterar nome/descrição/ícone/valor/origem/caixa/recebimento/comprovante com versão otimista. Exclusão é lógica e confirmada: marca autoria/data, retira da lista e devolve ao saldo do caixa o valor da compra. Não há estoque, quantidade ou movimentação física de devolução nesta etapa.
- Saldos do caixa: doações financeiras + pedidos pagos ativos dos eventos do caixa − compras ativas de insumos pagas por esse caixa + entradas manuais ativas − saídas manuais ativas. Pendente continua apenas pedidos pendentes; doações materiais não entram em nenhum saldo. O resumo Real/Pendente do evento continua representando seus pedidos. Event.supplyCostCents é agregado na consulta D1 somando amount_cents de event_supplies do evento, source=purchase e deleted_at nulo, sem restringir o caixa pagador. Coalesce resulta em zero na ausência de compras; doações não entram. Validar inteiro seguro como os demais agregados. Campo derivado, sem persistência ou migração, sem cálculo de lucro e sem descontar novamente de Real.
- Saldo insuficiente é conferido no use case e novamente por triggers antes do INSERT/UPDATE, atomicamente com a gravação e a auditoria. Na edição, a despesa anterior do próprio registro é excluída da soma antes de validar o novo débito; trocar de caixa credita o anterior e debita o novo, converter para doação retira a despesa. Limite monetário também é guardado no banco. Correções posteriores de outras movimentações conservam suas regras já aprovadas; a checagem de saldo suficiente se aplica à compra no cadastro e na edição.
- Migrações 0012_event_supplies.sql e 0013_event_supply_audit.sql preservam tabelas anteriores, adicionam insumos/auditoria e protegem exclusão do evento ou caixa com vínculo. Migração 0016_supply_edit_soft_delete.sql acrescenta deletedAt/deletedBy/deletedByName e substitui a restrição de recebimento único por edição versionada e exclusão lógica; registros excluídos são imutáveis. Auditoria é unida ao histórico do evento; alterações aparecem no histórico do caixa atual e do anterior, inclusive troca para doação/exclusão, sem duplicar saldos. Novos snapshots preservam referências imutáveis de comprovantes no D1; consultas removem receiptKey e receipts (com chaves privadas) antes de enviar histórico à interface. Arquivos anteriores não são apagados.
- Repetição de cadastro usa UUID estável, fingerprint dos dados normalizados + hash da imagem + autor. Comprovante tem chave imutável derivada de UUIDs/hash, sem nome original ou dados pessoais. Dados e conteúdo não são registrados em logs.
- Upload: até 5 arquivos por insumo, JPEG/PNG/WebP/PDF de até 5 MB cada, contando existentes mantidos e novos. FileUploadField acumula seleção e lista todos os arquivos abaixo da área com X individual; metadados validados por Zod e assinatura/hash conferidos no servidor. Actions extraem todos os arquivos do FormData; use cases validam quantidade/tamanho antes de ler conteúdo. Novos arquivos têm bytes validados/hash calculado e gravações R2 em sequência, sem Promise.all de buffers nem Base64. Server Actions bodySizeLimit=26mb cobre até 25 MiB e envelope. Multipart em chunks não foi adotado para arquivos individuais de até 5 MiB; os limites de payload comportam esse tamanho, mas isso não comprova memória/CPU/concorrência sem teste de carga. Browser recebe somente IDs/tipo/tamanho, nunca credenciais/chaves R2.
- R2ReceiptRepository usa binding RECEIPTS: wrangler.jsonc aponta para o bucket privado cantina-contabil-receipts em produção; wrangler.local.jsonc aponta para emulação com remote=false e persistência Miniflare em .wrangler/state/v3/r2. Sem diretório público ou leitura arbitrária por chave. A rota de comprovante valida sessão/perfil, evento/insumo e vínculo; resposta privada no-store/nosniff com tipo validado e CSP restritiva. Não há URL pública do bucket.
- Objeto é armazenado antes do INSERT/UPDATE D1. Não existe transação distribuída R2/D1: falha posterior pode deixar objeto sem vínculo; não apagar automaticamente em resultado incerto, preservando a possibilidade de gravação já concluída e de repetição idempotente. Reconciliação de órfãos permanece pendente, sem processo automático.
- R2 privado já está configurado e publicado; estado e binding em LOCAL.md/STATUS.md. Não criar novos buckets nem habilitar acesso público por iniciativa própria.

- Migração 0014_supply_icons.sql adiciona icon aos insumos existentes com padrão bag e inclui o ícone nos novos snapshots de auditoria, sem reescrever os antigos. Seletor de ícones é compartilhado com produtos; categorias são derivadas do catálogo, incluindo Ingredientes e Utensílios. Não há busca por nome nos insumos, nem filtro correspondente no repository.

- PDF acrescentado ao contrato de comprovantes: metadados Zod e assinatura %PDF- conferidos no servidor, limite de 5 MB preservado. Resposta de PDF é attachment com filename genérico .pdf, privada/no-store/nosniff; não executa conteúdo no app. FileUploadField aceita seleção múltipla por clique ou arrastar, com estados hover/drag/disabled/foco e teclado via botão nativo.
- Migração 0015_supply_pdf_receipts.sql amplia o CHECK receipt_type por reconstrução versionada e transacional de event_supplies, necessária para alterar essa restrição SQLite. Copia explicitamente todas as colunas/IDs e recria índices/triggers, preservando referências e auditoria. defer_foreign_keys é restrito à transação; nenhuma validação financeira foi removida e não se altera migração já aplicada.

- Visualização de imagem de comprovante usa a rota autenticada existente via fetch same-origin/no-store, sem expor chave R2. ImagePreviewModal valida MIME de imagem, usa URL de objeto temporária e aborta/revoga ao fechar. Erros da rota preservam mensagem/referência no ErrorModal; falhas de transporte não inventam referência. PDF permanece attachment. Sem iframe nem alteração de CSP/binding.

- Migração 0017_supply_description.sql acrescenta description não nula com padrão vazio e CHECK até 500 caracteres, preservando registros existentes. Novos snapshots incluem descrição antes/depois; versões anteriores não são reescritas. Exclusão lógica mantém o campo imutável junto aos demais dados. Sem mudança de cálculo financeiro.

- Múltiplos comprovantes: EventSupplyReceipt representa id/key/type/size (tamanho null para anexos legados). Coluna receipts_json em event_supplies guarda até 5 referências como parte da mesma versão/gravação atômica do insumo, conforme snapshots já usados no domínio. receipt_key/receipt_type permanecem como primeiro anexo para compatibilidade e CHECKs anteriores. Migração 0018_supply_multiple_receipts.sql converte referências antigas sem regravar autoria/versão/auditoria; recria guardas financeiros e snapshots, acrescenta validação da lista e imutabilidade na exclusão. Novos snapshots mantêm lista privada e receiptCount; consultas removem receipts/receiptKey antes da interface.
- Edição envia retainedReceiptIds, não chaves ou metadados confiáveis do navegador. O servidor resolve IDs exclusivamente nos anexos do insumo atual; IDs ausentes/versão concorrente geram conflito. Metadados novos vêm dos Files reais. X retira referência somente ao salvar; cancelar preserva lista original, objetos anteriores ficam no R2 para histórico. A rota autenticada de comprovante recebe receiptId opcional e valida vínculo; URL antiga sem ID continua abrindo o primeiro anexo.
- Referências de capacidade: [Server Actions bodySizeLimit](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions), [limites Workers](https://developers.cloudflare.com/workers/platform/limits/) e [uploads R2](https://developers.cloudflare.com/r2/objects/upload-objects/). Consulta documental não equivale a teste funcional ou de carga; manter compilação e testes autorizados no escopo de TESTING.md, sem inferir validação de carga.

- Migração 0019_supply_donor_name.sql acrescenta donor_name com padrão vazio e limite de 100 caracteres, permitido apenas em doações. Novos snapshots registram o nome; auditorias anteriores permanecem intactas. Exclusão lógica preserva o campo.

## Movimentações manuais

- Funcionalidade em server/movements, com models, inputs Zod, contratos de repository, infraestrutura Drizzle/D1 e um use case por operação; interface em presentation/movements e rota /movimentacoes. Mesmo acesso root/admin/tesouraria, executeOperation/handleFailure/logger e validação independente de Actions.
- Caixa ativo, Entrada/Saída, valor positivo em centavos, data civil e justificativa obrigatória até 500 caracteres. Entrada registra rendimentos/aportes; saída registra retirada/despesa justificada. Efeito imediato no real, sem pendência, sem duplicar doações/pedidos/insumos, sem forma de pagamento; até 5 comprovantes opcionais por registro, conforme a seção abaixo.
- Registrar, consultar, editar e excluir. Cadastro idempotente por UUID/fingerprint normalizado e autoria; edição/exclusão por versão otimista. Correção pode alterar caixa/tipo/valor/data/justificativa; ao mudar de caixa, verificar ambos os saldos. Isso é correção do registro, não uma transferência pareada ou integração bancária.
- Saldo final negativo nunca é aceito nas operações de movimentações: cadastro, edição e exclusão verificam o efeito em cada caixa afetado, inclusive redução/exclusão de entrada cujo valor já tenha sido usado. Verificação no use case com BigInt e novamente no D1 de forma atômica com gravação/auditoria. Limite monetário seguro preservado. As regras já aprovadas de correções de pedidos/insumos não são ampliadas silenciosamente.
- Exclusão lógica confirmada remove o efeito financeiro e a linha da lista, preservando dados, criação, autoria/data de alteração/exclusão e snapshots. Registro excluído é imutável; DELETE físico é bloqueado. Caixa com qualquer movimentação preservada não pode ser excluído.
- Migração 0020_cash_movements.sql cria cash_movements e cash_movement_audit, índices e triggers. Não altera registros existentes; adapta as guardas de saldo suficiente dos insumos para considerar entradas/saídas manuais e adiciona proteção de precisão financeira às gravações relacionadas. Auditoria não pode ser atualizada/apagada. Drizzle representa tabelas da funcionalidade, sem novo framework, dependência ou serviço.
- Histórico do caixa une auditoria de movimentações com prefixo movement_, autoria, horário técnico e snapshots antes/depois. Entradas/Saídas consideram tipo atual e anterior nas correções; mudança de caixa preserva acesso no histórico de ambos. Não somar a auditoria ao saldo. Lista de movimentações tem 15 itens, ordenada por data civil/criação/ID decrescentes, sem pesquisa/filtros extras neste bloco.

### Comprovantes de movimentações

- MovementReceipt guarda id/key/type/size; receipts_json integra a mesma versão de Movement. Comprovante é opcional tanto para entrada quanto saída. Limites e metadados Zod compartilhados em shared/receipts/receipt-input.ts: até 5 JPEG/PNG/WebP/PDF de até 5 MB, entre mantidos e novos. Assinatura/hash em shared/receipts/receipt-content.ts; os adaptadores anteriores de insumos preservam compatibilidade.
- Create/UpdateMovementUseCase recebem Files reais separados, substituem metadados do cliente pelos arquivos e validam antes do armazenamento. Edição resolve retainedReceiptIds somente nos anexos atuais, verifica versão/quantidade combinada e conserva referências mantidas. Conteúdo/hash e gravações são sequenciais; R2ReceiptRepository e binding RECEIPTS existentes, prefixo movements/id/hash. Sem novo bucket/segredo/dependência, Base64 ou chunks; bodySizeLimit=26mb permanece suficiente para o envelope aprovado, sem alegar teste de carga.
- Objeto é salvo antes da atualização D1; as regras de resultado incerto/órfãos também se aplicam. Remover no X só persiste ao salvar e objetos anteriores não são apagados. Exclusão lógica preserva recibos e snapshots.
- GetMovementReceiptUseCase valida sessão/perfil, UUIDs, movimentação ativa e vínculo do receiptId; rota /movimentacoes/[id]/comprovante entrega imagem privada ou PDF attachment, no-store/nosniff/CSP restritiva. Navegador recebe somente id/type/size, nunca key. ReceiptLink compartilhado abre ImagePreviewModal ou download; SupplyReceipt adapta a URL de insumos sem duplicar visualizador.
- Migração 0022_movement_receipts.sql acrescenta lista vazia aos registros existentes sem alterar dados/auditorias anteriores; valida até 5 referências e tipos/tamanhos/IDs únicos, inclui receipts/receiptCount nos novos snapshots e preserva a lista na exclusão. Histórico do caixa remove receipts privados antes de enviar à interface, mantendo a contagem.

## Consulta da Home

server/home/composition.ts monta GetHomeUseCase com os contratos de caixas e eventos, usando a mesma conexão D1. Use case verifica sessão/perfil antes de consultar; sem entrada externa, Action ou novo endpoint. CashBoxRepository.overview reutiliza as expressões de saldo de caixas, exclui caixas removidos e ordena criação/ID decrescentes. Use case valida inteiros seguros e soma todos os saldos com BigInt, verifica precisão antes de converter e envia apenas id/nome/saldos de todos os caixas ativos para o gráfico. Nesta implementação, a consulta lê os caixas ativos para somar sem usar ponto flutuante; não soma auditorias nem apenas a prévia.

EventRepository.upcoming recebe a data interna de São Paulo e consulta somente id/nome/data de até cinco eventos ativos de hoje em diante, por data/nome/ID crescentes. Data é gerada no servidor, sem parâmetros do navegador. Ambos os repositories usam seus adaptadores Drizzle e deixam falhas inesperadas propagarem; fronteira da página usa executeOperation/PageFailure. Sem nova tabela, migração, dependência ou mudança das fórmulas financeiras.

Gráfico nativo calcula apenas proporções com BigInt antes de converter coordenadas, sem alterar valores financeiros. A Home não consulta movimentações recentes nem pendências por evento; consultas e métodos exclusivos dessas prévias foram removidos após simplificação aprovada. Doações/Movimentações são apenas links de navegação.
