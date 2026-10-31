# Ministério Contábil

O Ministério Contábil é um braço do **GestPV** que, pelas regras de negócio específicas da gestão financeira, foi separado em uma aplicação própria. Mantém a integração com o GestPV para autenticação e identificação dos usuários.

O Ministério Contábil nasceu para organizar o financeiro de ministérios e eventos dentro da igreja. A proposta é reunir o dinheiro destinado a cada finalidade, os recebimentos e os gastos em um só lugar, facilitando a prestação de contas e a consulta do que foi registrado.

## O que já é possível fazer

- Organizar caixas por ministério ou finalidade e acompanhar seus saldos reais e pendentes.
- Registrar doações, entradas e saídas, com comprovantes nas movimentações quando necessário.
- Cadastrar eventos, produtos e pedidos, acompanhando pagamentos e insumos comprados ou doados.
- Consultar o histórico e a autoria das alterações.

## Para onde queremos ir

A ideia é expandir o projeto para integrar pagamentos e acompanhar pedidos em um fluxo de comandas. Para eventos com entregas, também queremos permitir o cadastro de endereços e o envio de rotas aos responsáveis pelas entregas.

Essas são possibilidades de evolução; ainda não são funcionalidades disponíveis.

## Como rodar localmente

O projeto usa Next.js, React e TypeScript e está preparado para executar na Cloudflare:

- **Workers:** executa o aplicativo no servidor, incluindo consultas e operações financeiras, com adaptação do Next.js pelo OpenNext.
- **D1:** banco de dados que guarda caixas, doações, eventos, pedidos, movimentações e histórico.
- **R2:** armazena os comprovantes em arquivos privados, acessíveis pelas rotas autenticadas do aplicativo.

No desenvolvimento, **Miniflare** emula o ambiente Workers, D1 e R2 no computador, sem precisar acessar esses recursos em produção. O estado local é persistente e separado do publicado; o login continua dependendo da API externa do GestPV.

`npm run dev` inicia o Next.js para desenvolvimento e a prévia do Worker com Miniflare. Também é possível executar apenas a prévia com `npm run dev:worker`, após encerrar a outra instância. Nenhum desses comandos publica na Cloudflare.

Requer **Node.js 22.17 ou posterior compatível** e npm. Na pasta do projeto:

```bash
npm ci
cp .env.example .env
npm run dev
```

Confira o endereço da API em `.env` antes de iniciar. Na primeira execução, o comando gera o segredo local da sessão se estiver vazio e prepara o banco local. Não compartilhe nem versione o `.env`.

Aguarde o ambiente ficar pronto e abra [localhost:5174](http://localhost:5174). Para acessar pelo celular na mesma rede, use o endereço informado no terminal. Encerre com **Ctrl+C** e não abra duas instâncias.

O login precisa de internet e de uma conta autorizada, conforme a seção abaixo. Não é necessário publicar na Cloudflare para desenvolver localmente.

[Ambiente local e debug](docs/LOCAL.md) · [Arquitetura](docs/ARCHITECTURE.md) · [Testes automatizados](docs/TESTING.md) · [Publicação com GitHub Actions](docs/CI.md) · [Estado e pendências](docs/STATUS.md) · [Orientações para agentes](AGENTS.md)

## Autenticação e permissões

A autenticação depende da **API externa do GestPV**, configurada por `AUTH_API_URL`. O aplicativo usa o login existente e consulta o perfil do usuário; não possui cadastro próprio nem acesso de demonstração. Baixar e iniciar o projeto não cria uma conta ou concede acesso. A API precisa estar disponível e a pessoa deve ter uma conta válida no GestPV.

Os perfis autorizados atualmente são:

| Perfil       | Acesso atual                                         |
| ------------ | ---------------------------------------------------- |
| `tesouraria` | Acesso às funcionalidades financeiras do aplicativo. |
| `admin`      | Mesmo acesso às funcionalidades atuais.              |
| `root`       | Mesmo acesso às funcionalidades atuais.              |

Não há diferenciação de permissões entre esses três perfis nesta etapa. Outros perfis ou um perfil ausente não têm acesso. A sessão interna dura até duas horas, podendo expirar antes se o acesso externo vencer.

**Pendência de segurança:** a assinatura do JWT externo ainda não é validada. A assinatura da sessão interna não resolve essa pendência. [Detalhes na arquitetura](docs/ARCHITECTURE.md#pendência-autenticidade-do-jwt-externo).
