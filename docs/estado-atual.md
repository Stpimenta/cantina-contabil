# Estado atual — 17/11/2026

Retomada curta. Use o [mapa de leitura](README.md) para abrir somente os contratos da tarefa. Histórico detalhado em [retomadas anteriores](historico/retomadas-2026-11.md); ele não substitui os contratos atuais.

## Local de trabalho e limites

- Envio solicitado em 17/11: branch existente feat/independent-auth segue o padrão feat/<descrição-em-inglês>; identidade Git configurada. Fetch bloqueado porque .git/FETCH_HEAD está em sistema somente leitura no ambiente do agente. Nenhum commit/push criado, referência remota não atualizada e versão não revalidada contra main atual. É necessário liberar escrita em .git para concluir; não criar cópia/worktree para contornar.

- Pasta exclusiva: `/home/stpimenta/Desktop/Projects/cantina_contabil`; branch `feat/independent-auth`, base origin/main c7cdd35 (último fetch registrado em 15/11). Não pressupor referência remota atualizada para uma nova entrega.
- Versão local 0.6.11 sincronizada no pacote/lockfile, validada contra main 0.6.10 na preparação anterior. Alterações da autenticação/documentação ainda sem commit/envio. Preservar esta versão maior da mesma entrega; nova preparação deve conferir origin/main.
- Main local tem cinco commits próprios preservados. Worktree 7bdc em HEAD destacado, intacta; não implementar ali. README/next-env e docs-example/ tinham alterações preexistentes. README/AGENTS agora também receberam reorganização documental autorizada; preservar o restante.

## Trabalho em andamento — acessos

- Correção no celular via IP/HTTP: comandas e acessos temporários usam UUID v4 com getRandomValues quando randomUUID não existe. Segredos do servidor preservados; revisão estática sem testes/build.

- Cabeçalho dos detalhes do evento no mobile: nome com reticências, sem subtítulo nem composição Dinheiro/Pix, ações em uma linha própria abaixo do nome, com Comandas à esquerda e editar/excluir à direita. Desktop e nome armazenado preservados; revisão estática sem testes/build.

- Breadcrumb dos detalhes de evento/pedidos/insumos/comandas omite Home para operador; demais perfis e Voltar preservados. Ajuste apenas de apresentação, revisão estática sem testes/build.

- Comandas: quem tem Alteração no evento pode listar/criar/revogar seus acessos temporários, com autorização no servidor e botão condicionado à mesma política. Consulta continua sem gerenciamento. Sem migração adicional, testes ou build neste ajuste.

- Login: botão Entrando… com indicador circular e status visível durante pending; formulário preservado e sem tela branca. Apenas revisão estática; sem testes/build neste ajuste.

- Alterações locais de permissões em andamento: administrador total, financeiro por caixa e operador por evento, com consulta/alteração por recurso; formulário compacto de convite/edição. Sem commit, migração aplicada ou publicação neste bloco. Preservar alterações anteriores da autenticação.
- Migração 0031_account_access.sql preparada, ainda não aplicada ao banco local ou remoto. Operadores anteriores passam ao perfil financeiro com os caixas de alteração já concedidos; novos operadores usam eventos.
- Antes da suspensão das verificações: unitários 238 aprovados; tipos aprovados após correção dos testes. Integração bloqueada por listen EPERM no loopback; build isolado compilou o código, mas falhou na leitura do TypeScript --showConfig. Aprovação completa pendente; não declarar pronto para publicação.
- Permissões responsivas: SelectField em itens estreitos; três botões em linha quando há pelo menos 22rem disponíveis dentro do modal. Mesmo valor/atualização nas duas apresentações; validação funcional fica para o responsável posteriormente. Sem testes/build.
- Correção mobile: Modal compartilhado limita o corpo rolável entre cabeçalho/rodapé; legenda e frase introdutória de escolha das permissões removidas. Sem acesso permanece padrão dos novos convites e agora tem o mesmo destaque das outras seleções. Revisão estática, sem testes/build/navegador; migrações e produção intactas.
- Ajuste visual de acessos: nome/ícone de cada caixa/evento em faixa creme suave, distinta do seletor branco, inclusive no estado inicial Sem acesso; Consulta/Alteração destacam a faixa com traço lateral e ícone terracota, sem deslocamento; opções Sem acesso/Consulta/Alteração ficam visíveis como botões, com seleção e resumo distintos. Revisão estática de JSX/CSS; sem testes, build ou navegador neste ajuste.
- Regra atual: sem testes/typecheck/build/auditorias automáticos por alteração. O responsável fará a revisão final antes dos deploys; agente executa somente a pedido. Detalhes em [quando executar](operacao/testes.md#quando-executar).

## Código local

- Cantina e consultas/API/WS existentes; revisão de auth integrada: Supabase diário, GestPV somente na habilitação automática pelo Entrar, prova de e-mail e senha própria, convites privados, recuperação, sessão revogável com 12h sem uso e admin/operador.
- Operador consulta todos os caixas/escopos, mas só grava nos concedidos; não cria caixas nem gerencia acessos. Contrato em [Autenticação e usuários](funcionalidades/autenticacao-e-usuarios.md).
- Login sem referência ao GestPV/primeiro acesso separado; recuperação discreta sob senha, aviso de e-mail curto e responsivo. Confirmação sem Voltar para entrar. Meus dados mostra somente nome/e-mail/perfil; nascimento/telefone armazenados não são exibidos.
- Esta reorganização muda somente documentação: leitura por tema, regras gerais menores, histórico separado e referências revisadas. Nenhum comportamento do aplicativo alterado neste bloco.

## Migrações e produção

| Ambiente                 | Último estado confirmado                                                                                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 local da pasta normal | Consulta somente de esquema/histórico em 16/11 confirmou 0026–0029 aplicadas, sem birth_date/phone_country/phone_number.                                                                                        |
| Correção 0030            | Campos de perfil separados em 0030_local_account_profile.sql; preparada/testada, não aplicada pelo agente. Aplicação posterior pelo responsável não reconferida. Não reaplicar 0029 nem apagar histórico.       |
| Supabase/Resend          | Responsável informou configuração local/Worker, SMTP, domínio, templates/URLs/prazo concluídos; não reconferidos remotamente. Projeto Auth compartilhado local/produção aprovado; D1/R2 local continua emulado. |
| Produção                 | Nenhuma consulta, migração ou publicação pelo agente nesta entrega. Último registro anterior aponta v0.6.6; não confirma a versão hoje ativa.                                                                   |

## Verificação e próximo passo

- Código anterior: suíte completa 366 aprovada em 15/11; depois, grupos afetados de auth/entrada única, migração e login aprovados (sobrepostos, não somar). Tipos incluindo testes e último build Cloudflare isolado/inspeção/dry-run aprovados, sem upload.
- Última correção de migração: 27 testes, com preservação dos dados sintéticos a partir de 0029. Últimos ajustes visuais: revisão estática e build, sem navegador/teste visual ao vivo. Auditor conserva três achados preexistentes (DatePicker/filtros de doações).
- Documentação reorganizada: 185 seções de origem encaminhadas, contratos compartilhados/áreas revisados e histórico preservado. Todos os links/âncoras locais e a formatação conferidos; diff sem erros. Nenhum teste/build/app executado neste bloco exclusivamente documental. AGENTS de 3841 para cerca de 743 palavras; retomada de 4337 para cerca de 520 palavras.
- Próximo passo do responsável: confirmar/aplicar 0030 local com backup/ambiente parado, testar habilitação/e-mail/senha, convites/recuperação/bloqueio e operador. Não iniciar app, migrar ou publicar automaticamente.
- Permanecem fora do escopo: assinatura JWT GestPV no ingresso inicial, consulta/reconstrução de link temporário pendente, reconciliação R2 sem vínculo, avisos de dependências, recursos/migrações remotos e reconciliação da main. Backlog não autoriza iniciar novas funcionalidades.
