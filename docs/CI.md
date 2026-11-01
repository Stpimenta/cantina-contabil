# GitHub Actions — validação e publicação

Fluxo autorizado em 31/10/2026. Implementação local em `.github/workflows/deploy.yml`; ativação depende do envio e merge pelo responsável. Estado por ambiente em [STATUS.md](STATUS.md), comandos locais em [LOCAL.md](LOCAL.md) e cobertura em [TESTING.md](TESTING.md). Este documento não confirma execução remota nem publicação.

Preparação de versão/commit, entrega do PR e recuperação de divergências locais seguem [DEPLOYMENT.md](DEPLOYMENT.md). Este documento é o dono do workflow e de suas guardas técnicas.

## Decisões aprovadas

- Cada PR destinado à `main` informa uma versão nova, escolhida no próprio PR alterando `package.json`, `package-lock.json` e a versão raiz dentro de `packages` no lockfile. O agente obtém a escolha e valida os três pontos antes do commit de entrega, conforme DEPLOYMENT.md; o responsável revisa e faz merge. Versão estável `X.Y.Z`, sem prefixo `v` no pacote; deve ser maior que a anterior, inclusive em PRs somente de documentação/testes.
- Branches `feat/<short-description>` para melhorias e `fix/<short-description>` para correções; nomes de branches, commits e títulos/descrições de PR são em inglês. Commits e títulos usam `feat: short description` ou `fix: short description`, com escopo opcional, como `fix(cash-boxes): correct balance calculation`. Regra atualizada em 31/10/2026; a entrega de deploy já preparada foi aceita como exceção, sem reescrever seu histórico. A versão não é calculada pelo prefixo. Uma mudança incompatível exige escolher explicitamente a versão e descrever seu impacto no PR.
- Após merge na `main`, o Actions valida o commit e publica automaticamente o Worker existente. Não há aprovação manual adicional no ambiente; o merge é a autorização deste fluxo. Push direto sem um PR associado não publica. Squash merge é recomendado, mas merge commit também funciona: o SHA precisa corresponder ao `merge_commit_sha` do PR.
- A tag Git e a tag da versão Cloudflare usam `vX.Y.Z`. A mensagem Cloudflare acompanha o idioma inglês do título do PR e vem desse título, acrescida do número do PR e do commit completo; títulos longos são reduzidos por bytes sem cortar caracteres. Tags Git são imutáveis e criadas somente depois da confirmação da versão com 100% do tráfego.
- Nenhuma migração, criação de recurso, mudança de domínio ou rollback de banco faz parte da automação. Aplicação de migrações de produção continua manual, mediante autorização explícita.

O validador verifica o prefixo feat/fix e uma linha de texto; não identifica automaticamente o idioma. Sua orientação textual exige descrição em inglês, conforme o padrão atual.

## Configuração no GitHub e Cloudflare

Ambiente GitHub **`cloudflare-workers`**, limitado à branch **`main`**, sem Required reviewers ou Wait timer. Secret do ambiente: **`CLOUDFLARE_API_TOKEN`**. A conta, o Worker e o banco são lidos do `wrangler.jsonc` versionado; não duplicar valores em `.env` do runner. Secrets do aplicativo permanecem no Worker existente.

O token precisa de **Workers Editor** para o Worker `cantina-contabil` e **D1 Read** na conta do banco, para consultar apenas os nomes de migrações aplicadas. A permissão Workers Editor isolada basta para publicar os bindings, mas não para consultar D1. Se faltar D1 Read, o workflow deve falhar antes do upload. Não conceder D1 Write: o fluxo não aplica migrações nem lê registros financeiros. Não precisa de permissões adicionais de R2 para os bindings existentes. O responsável ajusta o token/secret no painel; não copiar seu valor para chat, arquivos ou logs.

O `GITHUB_TOKEN` efêmero, fornecido pelo próprio Actions, recebe `contents: write` apenas no job de publicação para criar a tag e `pull-requests: read` para consultar o título/merge. Não é necessário cadastrar PAT para o workflow. Regras de tags do repositório não podem bloquear a criação de `v*` por esse token. O job de validação tem somente leitura e não recebe o token Cloudflare; usa `pull_request`, nunca `pull_request_target`. Checkout não mantém credenciais no disco. Actions oficiais estão fixadas por SHA.

Depois de configurar o workflow pela primeira vez, o responsável pode exigir o check **Testes, tipos e versão** na proteção da `main`, para bloquear merges reprovados. Mesmo sem essa proteção, o job de publicação depende da aprovação desse check na execução da `main`.

## Etapas

1. Em PR: validar incremento de versão, título e preservação das migrações existentes; instalar pelo lockfile, executar testes, tipos e build completo isolado com inspeção de pacote e dry-run, sem publicar.
2. Em push na `main`: repetir testes/tipos e validar versão do commit resultante. O job de publicação usa o mesmo SHA validado, dentro do ambiente configurado.
3. Consultar o PR associado, a tag Git existente e os metadados da versão ativa na Cloudflare. Bloquear versão repetida de outro commit, versão inferior à produção, tag conflitante ou tráfego dividido. Sem tag semântica na versão ativa, exigir conferência manual.
4. Consultar D1 com SQL fixo de leitura: `SELECT name FROM d1_migrations ORDER BY name`. Comparar exatamente com os nomes dos arquivos locais. Migração pendente, migração extra remota, falta de acesso ou contrato inválido bloqueiam o envio. Isso verifica o histórico de nomes, não checksum dos SQLs ou integridade de todos os dados. PRs não podem editar/remover/renomear migrações anteriores.
5. Compilar e inspecionar em diretório temporário privado, reaproveitando `prepareDeployment`. O ambiente de build continua limitado e sem secrets. Antes do upload, conferir novamente `main`, migrações e identidade do deployment anterior; alteração inesperada bloqueia o envio.
6. Enviar o pacote já conferido pelo Wrangler instalado no lockfile, com tag/mensagem. Autenticação via token; o perfil OAuth local é usado apenas no caminho manual sem token. `GITHUB_TOKEN` não é repassado ao processo Wrangler.
7. Consultar os metadados ativos: uma versão com 100% do tráfego, tag esperada e marcador do commit. Registrar IDs e então criar a tag Git no SHA publicado. Preservar relatório e resumo, inclusive se a criação da tag falhar.

As chamadas de API do CI enviam `Connection: close`, para não reaproveitar uma conexão que ficou ociosa durante a compilação síncrona. Somente GET pode ter uma segunda tentativa, limitada a uma, quando o próprio fetch lança TypeError com causa UND_ERR_SOCKET ou ECONNRESET. Cada tentativa tem timeout novo de 30 segundos e preserva host, credencial e bloqueio de redirecionamento. Falhas HTTP, JSON/contrato inválido, outros erros e a segunda falha propagam sem nova tentativa. POST não é repetido, inclusive consulta D1 e criação de tag; upload Wrangler também não é repetido automaticamente. Essa recuperação pertence apenas aos scripts de CI, sem alterar a política HTTP do aplicativo.

As publicações usam um grupo de concorrência com `cancel-in-progress: false` e `queue: max`; uma execução não interrompe upload em andamento. A checagem da ponta da `main` descarta commits superados antes do envio, evitando que uma execução antiga substitua a nova. Não se promete publicar todos os commits intermediários. Não executar deploy manual simultâneo: mudanças externas ao workflow não participam dessa fila.

## Falhas e retomada

O Actions mostra o motivo técnico controlado no log, um resumo e o artefato **`cantina-deployment`**, com retenção de 30 dias. O JSON contém commit/tag/PR, versão anterior, etapa atual (`phase`), indicação de tentativa de upload e código técnico controlado de falha (`failure`), quando houver, e, quando confirmados, IDs da versão/deployment e tráfego. Não inclui credenciais, headers, payloads brutos de API ou registros financeiros. Falhas de transporte/timeout, JSON inválido e operações locais usam códigos de uma lista explícita, sem serializar mensagem/stack/causa do provedor; a exceção original continua propagando. O resumo também mostra etapa, tentativa de upload e código. Guardar os identificadores relevantes em RELEASES/STATUS ao conferir uma entrega; o workflow não cria commits automáticos nesses documentos.

- Falha antes do upload: sem tag de sucesso; corrigir a causa e executar novamente.
- Falha/timeout durante ou depois do upload: o resultado pode ser incerto. Não declarar produção inalterada; conferir metadados na Cloudflare e o relatório. Não há retry automático de escrita nem rollback automático.
- `deployed-tag-pending`: publicação confirmada, mas a tag Git não foi concluída. Reexecutar com a mesma `main`: o fluxo reconhece tag/commit ativos e completa somente a tag, sem novo upload.
- `already-live`: mesmo commit e versão já estão ativos; confirmar/completar a tag sem publicar outra vez. Se o título do PR foi alterado depois da publicação, preservar a mensagem já gravada.
- `superseded`: a `main` avançou; nenhuma publicação foi feita por essa execução. Usar a execução do commit mais recente.
- Depois que a `main` avançou ou houve publicação manual, não forçar tags nem reexecutar código antigo para corrigir histórico. Conferir a situação e tratar a recuperação separadamente.

Para repetir após aplicar manualmente migrações autorizadas ou corrigir permissão: usar Re-run jobs na execução correspondente, se ainda for a `main` atual, ou **Run workflow** escolhendo `main`. O disparo manual também executa testes e precisa de PR mesclado associado. A execução real é necessária para confirmar autenticação, permissões, nomes das migrações e formatos de metadados; simulações locais não comprovam isso. Re-run de uma execução antiga usa o código antigo: para obter diagnósticos introduzidos numa correção, primeiro mesclar o PR da correção e usar a execução nova.

## Referências

- [Cloudflare: GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [Cloudflare: permissões de Workers e bindings](https://developers.cloudflare.com/workers/authorization/workers/)
- [Cloudflare: consulta D1 e permissões aceitas](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/)
- [Cloudflare: deployments ativos](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/list/)
- [GitHub: concorrência e fila](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency)

Referência do problema de socket/reuso no cliente do Node: [Undici #3492](https://github.com/nodejs/undici/issues/3492). O relatório do projeto confirma socket encerrado, não a causa física exata do encerramento.
