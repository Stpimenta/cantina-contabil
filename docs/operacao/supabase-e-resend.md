# Configuração Supabase e Resend

Contrato atual. Leia somente ao alterar este assunto. [Escolher outra leitura](../README.md).

## Autenticação independente

Configuração do provedor, não relato de implantação. Estado por ambiente em [estado atual](../estado-atual.md) e [migrações](banco-e-migracoes.md). Regras de login em [Autenticação e usuários](../funcionalidades/autenticacao-e-usuarios.md).

## Configuração do servidor

APP_URL e SUPABASE_URL de produção são declaradas em vars do wrangler.jsonc para manter os próximos deploys sincronizados com o painel. As chaves Supabase e SESSION_SECRET permanecem como Secrets do Worker, fora do arquivo versionado.

Usar somente .env e .env.example, sem imprimir/enviar valores. APP_URL é http://localhost:5174 no local e https://ministerio-contabil.ibpalavraviva.com.br em produção. SUPABASE_URL contém origem HTTPS do projeto; SUPABASE_PUBLISHABLE_KEY usa sb_publishable_; SUPABASE_SECRET_KEY usa sb_secret_ e fica exclusivamente no servidor/Secret do Worker. SESSION_SECRET preservado cifra tokens/sustenta credenciais; AUTH_API_URL mantém GestPV para ingresso inicial. Não usar NEXT_PUBLIC_, senha PostgreSQL ou personal access token como chave do aplicativo. Resend fica somente no SMTP Supabase, sem RESEND_API_KEY no app.

Responsável informou projeto, SMTP, domínio Verified e variáveis locais/Worker configurados. Sem leitura de valores ou conferência remota pelo agente. Mesmo projeto Auth no local/produção foi aprovado para o MVP; senha e e-mail de testes manuais atingem esse provedor compartilhado, mas D1/R2 financeiros locais continuam emulados. Testes automatizados são sintéticos.

## Ajustes do provedor antes do teste funcional

- Site URL: https://ministerio-contabil.ibpalavraviva.com.br.
- Redirect URLs exatas: https://ministerio-contabil.ibpalavraviva.com.br/auth/confirm e http://localhost:5174/auth/confirm. Se usar 127.0.0.1, autorizar a origem exata e alinhar APP_URL. Sem wildcard.
- E-mail/senha e confirmação habilitados; cadastro público e acesso anônimo desabilitados. SMTP Resend permanece no Supabase.
- Email OTP Expiration compartilhado: **259200 segundos (72h)** para convite, confirmação e recuperação, explicitamente aprovado. Prazo acima do limite do painel exige Management API; responsável informou configuração concluída, sem conferência remota pelo agente. Não equivale à duração do access token, e JWT expiry não deve ser alterado para 12h por equivalência.
- Template Invite: link para `{{ .RedirectTo }}#token_hash={{ .TokenHash }}&type=invite`.
- Template Recovery (também usado para habilitação de identidade já existente): `{{ .RedirectTo }}#token_hash={{ .TokenHash }}&type=recovery`.
- /auth/confirm já está implementado: captura/limpa fragmento e só verifica prova ao confirmar. Não usar o link padrão que consome no GET do provedor e devolve tokens ao navegador. /auth/password define senha por ticket de setup no servidor. Nenhum template foi alterado pelo agente.

Após migrações/configuração, responsável verifica Entrar com credenciais existentes para iniciar a habilitação automática, e-mail, senha própria, login/logout, recuperação, convite/reenvio/cancelamento, bloqueio e operador com caixa autorizado e outro somente leitura. Conta já ativada não depende da disponibilidade do GestPV; habilitação inédita exige essa integração ou convite administrativo. Teste manual não realizado pelo agente; não iniciar app/navegador por iniciativa própria.

Referências: [URLs](https://supabase.com/docs/guides/auth/redirect-urls), [templates](https://supabase.com/docs/guides/auth/auth-email-templates), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [prazo de links](https://supabase.com/docs/guides/auth/auth-email-passwordless). Estado local, migrações e produção separados em estado-atual.md.
