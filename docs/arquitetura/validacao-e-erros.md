# Validação, erros e logs

Contrato atual. Leia somente ao alterar este assunto. [Escolher outra leitura](../README.md).

## Entradas e validação com Zod

- Zod 4.6.7 é o padrão das entradas de login, gravações e consultas de caixas/doações/eventos/pedidos/insumos/movimentações. Schemas e funções validate ficam em inputs/ da funcionalidade; criar/editar caixa compartilham save-cash-box.input.ts por terem os mesmos campos/regras. Não criar DTO/controller/service obrigatório.
- Use cases recebem dados não confiáveis, verificam acesso quando aplicável e chamam os validadores antes de consultar/gravar. Actions apenas extraem FormData/argumentos, obtêm sessão/contexto e cuidam de revalidação/redirecionamento. Consultas entram por Server Components, usando os mesmos validadores nos use cases.
- Cada schema define tipos/formato/limites e as transformações aprovadas. z.input/z.output permitem derivar tipos sem duplicar contratos. Schemas de entrada Zod são diferentes dos schemas de tabelas Drizzle.
- shared/validation/input.ts centraliza safeParse e a conversão para códigos técnicos e issues por propriedade; parseInput transforma a falha em BusinessError. Não devolver nem registrar ZodError, suas mensagens ou dados brutos. A apresentação continua dona das mensagens e da associação visual aos campos.
- Preservar o formato de e-mail existente e nunca normalizar a senha. Nome de caixa mantém NFKC/espaços; textos opcionais mantêm trim/limites. Parsing de centavos usa funções puras com BigInt, sem lógica monetária na tela; data civil usa isDateOnly. Zod organiza essas regras, sem substituí-las por conversões genéricas ou aceitar novos formatos.
- Consultas preservam truncamento/normalização da busca, limite de ano e página inválida voltando a 1; categoria inválida do histórico volta a all. Identificadores de caixas mantêm o valor original e ausência é tratada pelo use case. Sem remover HTML/caracteres indiscriminadamente nem alterar silenciosamente textos.
- Formulário de doação reutiliza o mesmo schema para feedback local; a validação no servidor é obrigatória. Os demais formulários financeiros também reutilizam seus validadores puros pelo useServerAction. Regras que exigem banco, autorização, concorrência e idempotência continuam nos use cases/repositories e nas proteções do D1.

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
