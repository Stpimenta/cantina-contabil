# Ministério Contábil

O Ministério Contábil é um braço do **GestPV** que, pelas regras de negócio específicas da gestão financeira, foi separado em uma aplicação própria. Mantém integração com o GestPV na habilitação inicial; depois, usa conta e senha próprias.

O Ministério Contábil nasceu para organizar o financeiro de ministérios e eventos dentro da igreja. A proposta é reunir o dinheiro destinado a cada finalidade, os recebimentos e os gastos em um só lugar, facilitando a prestação de contas e a consulta do que foi registrado.

## O que já é possível fazer

- Organizar caixas por ministério ou finalidade e acompanhar seus saldos reais e pendentes.
- Registrar doações, entradas e saídas, com comprovantes nas movimentações quando necessário.
- Cadastrar eventos, produtos e pedidos, acompanhando pagamentos e insumos comprados ou doados.
- Em eventos com entregas habilitadas, registrar endereço/contato opcionais e acompanhar entrega ou retirada dos pedidos.
- Consultar o histórico e a autoria das alterações.
- Acompanhar retirada de comandas na Cantina, inclusive com acesso temporário por evento.

## Para onde queremos ir

A ideia é expandir o projeto para integrar pagamentos e ampliar o fluxo de pedidos. Para eventos com entregas, também queremos permitir a seleção de pedidos e o envio de rotas aos responsáveis pelas entregas.

Essas são possibilidades de evolução; ainda não são funcionalidades disponíveis.

## Como rodar localmente

O projeto usa Next.js, React e TypeScript e está preparado para executar na Cloudflare:

- **Workers:** executa o aplicativo no servidor, incluindo consultas e operações financeiras, com adaptação do Next.js pelo OpenNext.
- **D1:** banco de dados que guarda caixas, doações, eventos, pedidos, movimentações e histórico.
- **R2:** armazena os comprovantes em arquivos privados, acessíveis pelas rotas autenticadas do aplicativo.

No desenvolvimento, **Miniflare** emula o ambiente Workers, D1 e R2 no computador, sem precisar acessar esses recursos em produção. O estado local é persistente e separado do publicado; o login diário usa Supabase; GestPV é necessário somente na habilitação inicial.

`npm run dev` inicia o Next.js para desenvolvimento e a prévia do Worker com Miniflare. Também é possível executar apenas a prévia com `npm run dev:worker`, após encerrar a outra instância. Nenhum desses comandos publica na Cloudflare.

Requer **Node.js 22.17 ou posterior compatível** e npm. Na pasta do projeto:

```bash
npm ci
cp -n .env.example .env
npm run dev
```

Preencha `.env` conforme [configuração de autenticação](docs/operacao/supabase-e-resend.md), preservando valores existentes. Na primeira execução, o comando gera o segredo local da sessão se estiver vazio e prepara o banco local. Não compartilhe nem versione o `.env`.

Aguarde o ambiente ficar pronto e abra [localhost:5174](http://localhost:5174). Para acessar pelo celular na mesma rede, use o endereço informado no terminal. Encerre com **Ctrl+C** e não abra duas instâncias.

O login precisa de internet e de uma conta autorizada, conforme a seção abaixo. Não é necessário publicar na Cloudflare para desenvolver localmente.

[Mapa da documentação](docs/README.md) · [Ambiente local](docs/operacao/ambiente-local.md) · [Estado atual](docs/estado-atual.md) · [Orientações para agentes](AGENTS.md)

## Autenticação e permissões

Entre com e-mail/senha. A habilitação inicial pelo login existente acontece nos bastidores, com confirmação por e-mail e criação de senha própria; também há convite privado. Contas ativadas entram pela autenticação nova mesmo sem a API antiga. Não existe cadastro público ou acesso de demonstração.

Administrador gerencia usuários e todos os caixas. Operador consulta os dados, mas só altera os caixas concedidos, sem criar caixas ou gerenciar acessos. Sessão encerra após 12h sem uso. [Regras de autenticação e limitações conhecidas](docs/funcionalidades/autenticacao-e-usuarios.md).
