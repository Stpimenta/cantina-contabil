# Estrutura e camadas do código

Leia para mudanças no backend/organização. [Mapa](../README.md). Regras específicas estão em funcionalidades/; validação/erros e banco têm contratos próprios.

## Stack e organização

Next.js/React/TypeScript no Cloudflare Workers via OpenNext; D1/Drizzle e R2 privado. Server Components consultam use cases; Server Actions gravam sem HTTP interno para a própria aplicação. Exceção aprovada: API de consulta das comandas, com Route Handlers finos e os mesmos use cases. Sem migração REST das gravações, container ou services/controllers/DTOs obrigatórios.

| Pasta          | Responsabilidade                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------ |
| app/           | Rotas, páginas e layouts                                                                         |
| presentation/  | Interface específica da funcionalidade                                                           |
| components/    | UI, modais e layout compartilhados                                                               |
| server/<área>/ | Backend com as camadas necessárias próximas; sem modules/features ou models/repositories globais |
| shared/        | Contratos, erros, logging, utilitários, máscaras e infraestrutura compartilhada                  |
| migrations/    | SQL versionado, incluindo índices/constraints/triggers                                           |

## Responsabilidades

- **Action/página:** extrai dados, sessão/contexto e adapta navegação/revalidação. Não concentra validação, regra de negócio, SQL ou acesso direto ao banco. Página pode chamar use case diretamente.
- **inputs/:** schemas Zod e validadores puros; tipos de entrada/saída derivados. Mesmo campo/regra compartilha validação entre criar/editar e navegador/servidor.
- **use-cases/:** uma operação por arquivo; pode coordenar vários passos/repositories. Valida e verifica acesso antes de consultar/gravar. Recebe contratos por construtor, retorna valores e não depende de Next/HTTP/Cloudflare/ORM/composition.
- **models/:** um conceito por arquivo; representa dados/regras da aplicação, não transporte externo nem tabela Drizzle.
- **repositories/:** contratos separados da infraestrutura, sem D1/R2/HTTP/Drizzle.
- **infrastructure/:** adaptadores Drizzle/D1/R2/HTTP/cookies e schemas de tabela por arquivo. Conhece o provedor e traduz somente falhas identificadas.
- **composition.ts:** montagem manual por funcionalidade (Pure DI), sem regras; instancia adaptadores e injeta construtores. Actions/páginas consomem use cases prontos; use case não importa composition ou implementação. users participa da montagem de auth. Sem singletons/containers/camadas vazias obrigatórias.

## Caminhos de gravação e consulta

- Gravação: formulário → useServerAction → Action → use case → contrato → adaptador → D1/R2. Sucesso fecha formulário/toast e revalida/redireciona pelo padrão da área.
- Consulta: Server Component/Route Handler → use case → validação/autorização → repository. Interface nunca importa banco/segredos/composição para o navegador; server-only protege as fronteiras necessárias.
- Falha: executeOperation → handleFailure → tradução da apresentação/logger. Ver [validação e erros](validacao-e-erros.md).
- AppShell vive no layout autenticado e persiste na navegação. Layout não substitui autorização nas páginas/operações. Login fica fora desse grupo.
- Caminhos próprios de páginas/APIs são em inglês; textos da UI continuam em português. Caminhos antigos usam redirecionamento compatível quando aprovado; endpoints externos não são renomeados.

Referências: [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html), [Pure DI](https://blog.ploeh.dk/2014/06/10/pure-di/). A organização por funcionalidade é a adaptação aprovada do projeto.
