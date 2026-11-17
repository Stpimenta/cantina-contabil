# Autenticação e usuários — contrato da área

Contrato atual. Leia somente ao alterar este assunto. [Escolher outra leitura](../README.md).

## Regras e implementação

### Autenticação independente

Implementação local aprovada em 15/11/2026; estado de migrações e produção em estado-atual.md.

- Supabase Auth cuida de identidade, senha e renovação; Resend é o SMTP configurado no Supabase. D1 continua dono do negócio, vínculos, bloqueios e permissões. Não existe cadastro público irrestrito.
- Entrada única em /login: contas locais ativas usam diretamente Supabase, sem consultar GestPV ou enviar a senha própria à integração antiga. Para e-mail ainda sem conta, ou conta importada pendente, LoginOrActivateAccountUseCase inicia a verificação GestPV nos bastidores do botão Entrar, aceitando root/admin/tesouraria e importando o perfil aprovado. O retorno solicita confirmação por e-mail e definição de senha própria, sem criar sessão antes da prova. Contas bloqueadas ou convidadas pendentes não recorrem ao GestPV; senha própria incorreta também não aciona essa alternativa. Indisponibilidade do GestPV não afeta contas ativadas; habilitação inédita exige a integração disponível ou convite administrativo. A senha GestPV nunca é copiada. Depois da ativação, login diário usa Supabase e permissões locais; novo ingresso GestPV não restaura conta bloqueada, perfil ou caixas.
- Admin não tem restrição de caixas e gerencia usuários/acessos. Operador consulta todos os caixas, saldos, históricos, comprovantes e escopos, mas só grava nos caixas concedidos; não cria caixas nem gerencia usuários; gerenciamento de acessos temporários exige Alteração no evento. Gravações conferem escopo no use case, incluindo caixas anterior/novo. Insumo exige caixa do evento e pagadores envolvidos; pedidos e retirada normal seguem o caixa do evento. Controles refletem a permissão sem substituir o servidor.
- Identidades importadas preservam os IDs GestPV positivos. Novos convidados recebem autoria negativa correspondente ao ID interno. Vínculo Supabase e identidade externa são imutáveis; históricos e snapshots não são reescritos. Nome, e-mail, nascimento e telefone aprovados ficam no perfil interno; convidados podem não ter os campos opcionais.
- Convites privados têm 72h, cancelamento, reenvio e uso único. Reenvio cancela o convite anterior e preserva o perfil local existente. Prova de e-mail é necessária antes de definir senha. Bloqueio impede a ativação. Confirmação e recuperação também têm 72h, conforme aprovação do prazo compartilhado do provedor.
- Sessão usa credencial aleatória opaca de 256 bits em cookie HttpOnly, SameSite=Lax, path=/ e Secure em produção: cantina-account no local e __Host-cantina-account em produção. Cookie de navegador, sem opção de permanecer conectado por 30 dias. D1 guarda somente hash da credencial e tokens do provedor cifrados AES-GCM com chave derivada e separação de domínio do SESSION_SECRET; tokens/senhas não chegam à interface ou aos logs.
- Inatividade de 12h encerra a sessão; atividade renova o limite no D1. Access token pode ter prazo menor, com refresh protegido por lease/versionamento para evitar rotação concorrente. Cada leitura verifica estado/permissões atuais. Logout revoga no D1; conclusão de redefinição de senha revoga sessões anteriores.
- /auth/activate redireciona para /login por compatibilidade com links anteriores; habilitação começa pelo próprio Entrar, sem citar GestPV na interface; /auth/confirm captura e limpa o fragmento, com confirmação explícita antes de consumir a prova; /auth/password usa ticket opaco de setup, cifrado no D1, limitado pela validade restante da prova/token. GET não ativa a conta. /auth/recover dá resposta uniforme para não revelar cadastros. A ativação/consumo e revogação são protegidos por triggers/transação do D1.
- /users é exclusivo do admin: busca/paginação de 15, convite por e-mail e caixas, edição de perfil/bloqueio/caixas com confirmação, reenvio/cancelamento de convite e estado/vencimento. Versão otimista e auditoria preservam autor e snapshots das alterações.
- Migrações 0026–0029 criam contas/vínculos, sessões, convites/tickets e gerenciamento/auditoria. A 0030 acrescenta nascimento/telefone ao perfil interno; esses campos não pertencem à 0029 já aplicada. Bancos novos e existentes seguem a mesma sequência versionada, sem reaplicar arquivos registrados. Testes usam D1 descartável; o agente não aplica migrações de desenvolvimento/produção automaticamente.
- Exceção aprovada para o MVP de até dez pessoas: local e produção usam o mesmo projeto Supabase Auth. Alterações de senha e envios atingem esse provedor compartilhado; permissões e dados D1/R2 locais continuam emulados. Ao habilitar identidade já existente no provedor, associação exige e-mail exato e nova prova; nenhum vínculo é concedido por correspondência parcial. Testes automatizados usam transporte sintético.
- Acesso temporário da Cantina mantém cookie, autoria, ativação e revogação separados. Socket normal usa a sessão opaca e verifica conta ativa, revogação e inatividade no D1; operador sem permissão no caixa consulta, mas não retira/desfaz nem administra acessos.

Adaptadores Supabase validam respostas com Zod e conferem identidade/e-mail explicitamente, sem confiar em permissões de metadados ou decodificação de JWT. Chaves modernas usam apikey; Authorization recebe somente token do usuário quando necessário. Configuração, templates com fragmento e prazo compartilhado de 72h em [ambiente-local.md](../operacao/supabase-e-resend.md#autenticação-independente). Recursos externos informados como configurados pelo responsável não foram reconferidos pelo agente. Pendência da assinatura JWT GestPV permanece restrita à habilitação inicial.

### Proteção do formulário de login

LoginForm declara method=post e action=/login, além de impedir o submit nativo no manipulador. O envio permanece bloqueado até a hidratação; depois usa useServerAction/loginAction com as validações e erros atuais. Sem JavaScript, o botão permanece desabilitado; o fallback nativo nunca usa GET. A página redireciona URLs com parâmetros gmail/senha para /login limpo, antes de consultar a sessão, sem consumir nem registrar esses valores. Essa limpeza não remove registros anteriores do histórico ou de infraestrutura; credenciais já expostas precisam ser substituídas pelo responsável.

### Contratos de integração e sessão

Schemas Zod de respostas do GestPV ficam na infraestrutura de cada dono: user-profile.schema.ts e login-response.schema.ts. safeParse verifica estrutura/tipos/limites sem registrar mensagens ou objetos brutos do Zod. Repository verifica também identidade (ID do perfil igual ao solicitado), HTTP e status de login com if e falhas técnicas apropriadas. Preservar as regras existentes: nome não vazio após trim e até 200 caracteres, email string até 254 (sem impor novo formato); nascimento/telefone opcionais mantêm normalização anterior. Login status=false continua INVALID_CREDENTIALS mesmo sem token, status=true exige token string não vazio. 401, timeout de 12s e redirect manual preservados.

Respostas Supabase são validadas na infraestrutura. Sessão diária usa credencial opaca e estado autoritativo no D1, conforme Autenticação independente. session-payload.schema.ts e codec HMAC anteriores permanecem apenas como código legado/testes, sem participação na composição atual. Claims GestPV continuam sujeitos à validação estrutural e verificações semânticas de expiração/perfil no primeiro ingresso.

### Primeiro ingresso pelo GestPV

- Autenticação pelo endpoint existente: `POST https://gestpvapi.ibpalavraviva.com.br/api/Login`, com os campos `gmail` e `senha`.
- Credenciais inválidas retornam HTTP `401`, com `status: false` e token vazio.
- Login bem-sucedido retorna `status: true` e `jwtToken`.
- Somente os perfis `root`, `admin` e `tesouraria`, informados no campo `status` do JWT, podem iniciar a habilitação pelo GestPV.
- Os perfis `membro`, `pending`, `inativo` e qualquer perfil ausente ou desconhecido devem ter acesso negado.

### Carregamento do perfil

- Após o login aceito e a conferência do perfil permitido, consultar no servidor `GET https://gestpvapi.ibpalavraviva.com.br/api/Usuario/{id}`.
- Obter o ID do próprio usuário do claim `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/sid` do JWT; não usar um ID arbitrário enviado pela tela para esse carregamento.
- Utilizar o perfil retornado para apresentar o usuário no app, incluindo seu nome. O contrato informado também oferece `id`, `email` e `urlImage`, além de outros campos pessoais.
- Não repassar o objeto completo à interface nem registrá-lo integralmente nos logs. Meus dados apresenta somente nome, e-mail e perfil de acesso, conforme revisão de 16/11. Nascimento/telefone importados continuam armazenados, sem exibição nesse modal; CPF, RG, endereço, outras datas pessoais e `tokenContribuicao` não devem ser expostos por conveniência.
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

A integração inicial foi implementada com a pendência acima preservada. A sessão diária usa credencial opaca no D1; a assinatura do JWT GestPV do ingresso inicial ainda não é validada.

### Transporte do ingresso inicial

Login/perfil GestPV usam fetch sem cache, redirect=manual e timeout de 12s, sem reenviar credenciais para outro endereço. O ID do perfil deve coincidir com o claim do login. Não há bypass local. Perfil aprovado é preservado no D1; sessão diária segue Autenticação independente e não depende da expiração do token GestPV.

## Fluxo e interação

### Login, sessão e navegação

Para operador, o caminho dos detalhes de evento, pedidos, insumos e comandas começa em Eventos, sem Home. Outros perfis preservam Home; os destinos de Voltar continuam os mesmos.

Durante o envio, Entrar muda para Entrando… com indicador circular no lugar da seta, sem alterar o tamanho do botão. Uma região de status visível informa Verificando seu acesso. Aguarde um instante. e reserva altura para evitar deslocamento. O formulário permanece visível e os campos/botão bloqueados pelo pending existente; não criar tela branca ou simular progresso. Indicador usa tokens existentes e respeita movimento reduzido.

Após iniciar habilitação, a mensagem é curta e agrupada: Confira seu e-mail, destinatário destacado, Abra o link para criar sua senha e prazo de 72h discreto. Região role=status/aria-atomic anuncia o resultado completo; e-mail longo quebra sem corte.

Uma única tela Entrar recebe e-mail/senha, sem botão de primeiro acesso ou referência ao GestPV. Contas ativadas entram diretamente na autenticação própria, mesmo com a API antiga indisponível. Para quem ainda não tem conta, a verificação de elegibilidade acontece nos bastidores e o sucesso orienta confirmar o e-mail e definir senha própria. Importados pendentes podem repetir esse fluxo; convidados pendentes usam seu convite. Senha incorreta de conta ativada ou bloqueio não acionam o ingresso externo. /auth/activate redireciona para /login. Esqueci minha senha fica discreto abaixo da senha, alinhado à direita, antes de Entrar. Convites privados permitem usuários sem GestPV. Links de convite, confirmação e recuperação valem 72h. A tela de confirmação mantém somente Confirmar e-mail como ação, sem Voltar para entrar. Confirmação exige botão explícito; GET não consome o link, e o fragmento é removido da URL. Recuperação dá resposta uniforme; senha redefinida encerra sessões anteriores. Sem código diário ou opção de permanecer conectado por 30 dias.

Sessão renova durante uso e encerra após 12h sem atividade. Admin gerencia acessos; operador vê todos os caixas/escopos, históricos e comprovantes, mas só altera os caixas concedidos. Não cria caixas nem gerencia usuários. Acessos temporários das comandas podem ser listados, criados e revogados por quem tenha Alteração no evento; Consulta não permite gerenciar. Operações envolvendo mais de um caixa exigem permissão nos caixas envolvidos; insumos incluem caixa do evento e pagador. Detalhes permanecem disponíveis em modo de consulta. Bloqueios/permissões são locais e não são restaurados por ingresso GestPV.

Usuários (/users), exclusivo do admin, reutiliza lista com separadores, busca automática/350ms e 15/página. Convidar informa e-mail/caixas. Editar ajusta admin/operador, bloqueio e caixas com confirmação; admin não tem restrição por caixa. Convite pendente mostra vencimento/estado e permite reenviar ou cancelar com confirmação. Reenvio mantém perfil e invalida convite anterior. Formulários usam componentes, descarte, erros e feedback existentes. Carregamento usa a mesma composição com skeleton e espera somente acessível.

- Sem sessão válida, páginas protegidas levam a /login. Falha SESSION_EXPIRED/unauthenticated recebida com a tela já aberta também redireciona automaticamente a /login, pelo tratamento central do ErrorModal, sem exibir modal nem pedir descarte. Credenciais recusadas ou LOGIN_SESSION_EXPIRED durante tentativa de login continuam como erros de autenticação na própria tela. Login válido com perfil carregado leva à Home; login já autenticado também leva à Home. Contas locais ativas, admin ou operador.
- Falha ao verificar identidade/conta impede concluir o login. Campos inválidos mostram erros abaixo dos campos e revalidam ao editar após a tentativa de envio. Credenciais recusadas e demais falhas usam ErrorModal; e-mail permanece, senha é limpa após falha de autenticação/servidor, não por validação de campo.
- Cabeçalho/menu vivem no layout autenticado, preservados entre Home, Caixas, Doações, Eventos e Movimentações. Menu do usuário à direita: Meus dados e Sair.
- Troca de página mantém cabeçalho/lateral estáveis, skeleton na estrutura da área e mínimo compartilhado de 300ms, conforme Carregamento de rotas. Dados resolvidos substituem o skeleton diretamente, sem animação de entrada, deslocamento ou fade. Busca/paginação/refresh na mesma rota não reiniciam o mínimo. Demais movimentos do aplicativo respeitam movimento reduzido.
- Meus dados mostra somente nome, e-mail e perfil de acesso, como consulta. E-mail ausente mostra Não informado. Não apresentar nascimento, telefone, CPF/RG/endereço ou objeto completo do provedor; a retirada visual não apaga dados armazenados.
- Redirecionamentos de login/logout são sinais de navegação preservados pelo useServerAction, sem modal de conexão durante a troca de página; falhas reais mantêm o tratamento existente.
- Logout remove a sessão e volta ao login. Falha mantém contexto e apresenta erro. Sem retries automáticos ou bypass local.
- Desktop tem menu lateral recolhível; abaixo de 768px, drawer modal. A preferência de recolhimento desktop vale enquanto AppShell está montado. Ao mudar para desktop, fechar o drawer. Navegação recolhida fica inerte e fora do foco. A partir de 768px, botão no meio da borda lateral também recolhe/reabre o menu; permanece acessível na borda esquerda quando fechado, com seta e rótulo conforme estado. Compartilha o estado do botão do cabeçalho.

## Composição visual

### Autenticação e usuários

A confirmação de envio no login usa aviso compacto com superfície branca, borda discreta e traço terracota à esquerda, conforme pedido de destaque de 16/11. Confira seu e-mail é o título; destinatário em linha própria/seminegrito, instrução curta e prazo secundário. Usa tokens existentes, largura fluida, min-width:0 e overflow-wrap:anywhere para e-mails longos em celular/tablet/desktop, sem truncar nem acrescentar ícone/ilustração. Login tem entrada única, sem menção ao provedor antigo ou ação separada de primeiro acesso. Esqueci minha senha integra o grupo da senha, abaixo do campo e alinhado à direita, em fonte pequena/cor discreta dos tokens existentes, com foco e área de toque compartilhados preservados. Login, habilitação, recuperação, confirmação e senha reutilizam o painel de autenticação aprovado, campos e botões compartilhados, sem novo estilo exclusivo. Usuários reutiliza PageHeader, lista com separadores, SearchForm, Pagination, Modal/form-grid, SelectField, FieldError e confirmações existentes. E-mail/nome é principal; perfil, bloqueio e convite são discretos. Convite/edição usa Modal formCompact: identificação e perfil em form-grid; permissões em lista com nome seminegrito e ícone de caixa/evento sobre faixa creme suave (--color-background), padding e raio dos tokens existentes. A faixa identifica o recurso independentemente da permissão selecionada; Consulta/Alteração acrescentam traço lateral e ícone terracota, enquanto Sem acesso permanece neutro. A borda transparente reserva a mesma largura no estado neutro, evitando deslocamento; seletor branco abaixo, sem alteração de sua aparência interna. Cada recurso mostra três Buttons compartilhados com aria-pressed: Sem acesso, Consulta e Alteração. A opção selecionada usa primary, inclusive Sem acesso; demais opções usam ghost. Novos convites começam sem recursos autorizados; editar e reenviar preservam os acessos existentes. Quando o item tem ao menos 22rem de largura disponível, as três opções ficam em uma linha; abaixo disso, um SelectField compartilhado apresenta a mesma permissão. A troca usa container query e display:none para retirar a alternativa oculta da leitura e do teclado. Os controles compartilham valor e atualização. Não exibir a frase Escolha o que esta pessoa pode fazer em cada caixa/evento nem legenda de Consulta/Alteração; o resumo recebe fundo discreto dos tokens existentes. Não alterar o estilo interno de Button. Skeleton usa a mesma lista e posições finais, sem frase visível de espera. Ações de gravação respeitam a permissão; detalhes continuam acessíveis ao operador em outros caixas. Sem alteração da composição desktop/mobile financeira aprovada.
