# Git, versão e publicação

Contrato atual. Leia somente ao alterar este assunto. [Escolher outra leitura](../README.md).

## Contrato

Guia operacional aprovado em 01/11/2026 para responsáveis e agentes. Ler antes de preparar commits para envio, abrir PR, atualizar a main ou retomar falhas de publicação. O contrato técnico do workflow, permissões e migrações está em [integracao-continua.md](integracao-continua.md); ambiente e build isolado em [ambiente-local.md](ambiente-local.md); situação confirmada em [estado-atual.md](../estado-atual.md).

## 1. Conferir o Git antes de alterar

```bash
git status --short --branch
git branch --show-current
git fetch origin
```

- Verificar arquivos modificados, conflitos, merge/rebase em andamento e diferenças entre branches. Não trocar de branch, iniciar outro merge ou criar commit enquanto houver operação interrompida sem entender o estado.
- Novas alterações usam `feat/...` ou `fix/...`, em inglês, a partir de `origin/main` atualizada. Não usar uma main local divergente como base por conveniência. Preservar as alterações existentes e trabalhar na pasta normal salva `/home/stpimenta/Desktop/Projects/cantina_contabil`, organizando a branch nessa mesma pasta. Não criar worktree, clone ou cópia isolada de implementação sem pedido explícito do responsável; impedimento exige diagnóstico, não uma cópia por iniciativa do agente. Cópias temporárias exclusivamente de build/testes continuam autorizadas.
- Não criar commits de desenvolvimento ou merges locais na main por rotina. Se a main local contém commits próprios, diagnosticar e preservar esse histórico antes de qualquer reconciliação. Não enviar esses commits diretamente à main remota para “sincronizar”.
- Conferir identidade Git do responsável. Separar arquivos gerados, `.env`, estado D1/R2 e backups; nunca incluir segredos ou dados locais no commit. Não descartar alterações preexistentes para obter uma árvore limpa.

## 2. Incrementar a versão antes do commit de entrega

**Não entregar uma branch como pronta para envio com a versão ainda pendente.** Regra simplificada aprovada pelo responsável em 11/11/2026: o agente incrementa automaticamente o último número de X.Y.Z ao preparar cada nova entrega, inclusive de documentação/testes. Não há classificação major/minor por tipo de mudança nem cálculo pelo prefixo feat/fix. Uma versão maior já preparada para a mesma entrega é preservada ao retomar; não incrementar novamente por repetição do procedimento.

O incremento acontece localmente antes do commit, nos três pontos do pacote/lockfile. O workflow do GitHub não altera esses arquivos: valida, publica após o merge e cria a tag correspondente. As travas de incremento, versão ativa e tags imutáveis permanecem; não confundir tag automática com aumento do número no pacote.

1. Atualizar a referência `origin/main` e conferir a versão de seu `package.json`.
2. Preparar a próxima versão aumentando somente o último número a partir da main remota atualizada; deve ser maior que ela. Preservar versão maior já preparada para esta entrega e nunca reutilizar tag existente.
3. Sincronizar os três pontos: `package.json → version`, `package-lock.json → version` e `package-lock.json → packages[""] → version`.
4. Preservar dependências e demais entradas do lockfile. Não atualizar pacotes para alterar apenas a versão do aplicativo.
5. Validar com a regra real do projeto, não apenas lendo os números visualmente.

Na raiz da branch de entrega, com dependências já instaladas e `origin/main` atualizada:

```bash
node --input-type=module <<'JS'
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { validatePackageVersion } from './scripts/release-rules.mjs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const base = JSON.parse(execFileSync('git', ['show', 'origin/main:package.json'], {
  encoding: 'utf8',
}));
console.log(validatePackageVersion(pkg, lock, base.version));
JS
```

Esse comando só confere formato, sincronização e incremento; não publica nem substitui os demais checks. `ci-release.mjs validate` no Actions também usa o evento do GitHub para conferir base, título e migrações: uma execução local sem esse contexto não comprova o mesmo cenário.

## 3. Entregar a branch e o PR

Quando o responsável pedir os comandos para subir a branch, entregar somente os três comandos simples abaixo, com a mensagem do commit e o nome real da branch preenchidos. Não incluir cd, fetch, validação de versão, testes, build, subshell ou scripts nesse bloco. As conferências necessárias continuam sendo feitas na preparação; pendências reais devem ser informadas brevemente fora dos comandos, sem declarar validações ainda não realizadas como aprovadas.

```bash
git add .
git commit -m "fix: short description in English"
git push -u origin fix/actual-branch-name
```

Sempre acompanhar os comandos de título e resumo do PR em inglês, prontos para copiar. O título deve começar com feat: ou fix: e refletir o escopo final. O resumo descreve o problema/comportamento resultante, as mudanças relevantes e a validação realmente realizada, distinguindo verificações pendentes. Não inventar aprovação de testes/build nem prometer publicação.

- Concentrar as verificações de código na revisão final antes do deploy, conduzida pelo responsável, conforme [quando executar](testes.md#quando-executar). O agente não roda testes, typecheck, build ou auditorias automaticamente durante modificações; executa somente mediante pedido explícito. Na etapa final solicitada, usar os grupos afetados e o build Cloudflare/TypeScript isolado. Documentação exige somente revisão de conteúdo, links e formatação.
- Revisar o diff staged e confirmar ausência de conflitos/arquivos indevidos antes de criar o commit. Commits e título do PR usam feat/fix com descrição em inglês.
- Antes de fornecer o comando de push, confirmar branch, commit, versão preparada nos três pontos e incremento validado. Se algum desses itens estiver pendente, informar explicitamente que a entrega ainda não está pronta para envio.
- Push, criação de PR e merge remoto continuam dependendo de pedido explícito do responsável. Não executar publicação manual como alternativa a um CI bloqueado.
- Conferir o título final sugerido pelo GitHub e os checks do PR. Se a main avançou, conferir novamente se a versão continua maior. Não fazer merge de PR com validação reprovada para tentar corrigir depois.
- Merge remoto autorizado aciona o deploy automático, mas não comprova sucesso. Só declarar publicação após confirmar execução, versão ativa, tráfego e tag, conforme integracao-continua.md.

## 4. Recuperar falha de versão

| Situação                                             | Próximo passo                                                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PR aberto, versão igual ou menor que a main          | Atualizar os três pontos para a próxima versão válida, validar, criar commit pequeno na mesma branch e enviar somente com autorização.                 |
| PR já integrado com versão inválida                  | Criar branch `fix/...` da main remota atualizada, corrigir a versão e preparar novo PR. Atualizar uma branch já integrada não altera o commit da main. |
| Apenas título do PR incorreto                        | Corrigir título conforme integracao-continua.md; isso não altera nem corrige a versão do pacote.                                                       |
| Reexecutar job do mesmo commit sem corrigir a versão | Continua inválido. Corrigir os arquivos e validar antes da nova execução.                                                                              |

Não usar amend, rebase ou force-push para evitar um commit pequeno sem autorização explícita para reescrever o histórico. Não mover tags existentes. A correção de versão não autoriza deploy manual, rollback, mudança de token ou migração remota.

## 5. Atualizar a main sem criar divergência adicional

Não é necessário entrar na main local para criar uma branch de entrega: usar `origin/main` atualizada como base evita carregar commits locais antigos.

Se a main local estiver sem alterações e sem commits próprios, atualizar explicitamente por fast-forward:

```bash
git switch main
git pull --ff-only origin main
```

Se houver divergência, esse comando deve parar. Diagnosticar antes de escolher a recuperação:

```bash
git status --short --branch
git log --oneline --left-right main...origin/main
```

- Não responder automaticamente à divergência com merge, rebase, reset ou alteração global de configuração. Registrar quais commits são locais e quais vieram do remoto; preservar ambos e esclarecer a reconciliação necessária.
- Não criar sucessivos commits de merge na main apenas para remover o aviso do pull. Uma operação local de preservação de histórico não deve virar um push direto à main.
- Se um merge já estava aberto e sua resolução foi solicitada: revisar os conflitos, manter os contratos atuais sem substituir por instruções antigas, preservar mudanças independentes e concluir esse merge local. Não iniciar outro pull enquanto ele estiver pendente.
- `next-env.d.ts` pode ser regenerado pelo Next. Preservar sua alteração fora do commit quando preexistente; não apagar builds em uso. Um autostash pode ser mantido como cópia de segurança; conferir conteúdo antes de reaplicar ou remover.
- Não mudar configurações de Git para todos os projetos. Qualquer configuração necessária deve ter alcance explícito e não substitui o diagnóstico da divergência.

## Registro ao encerrar

Atualizar estado-atual.md com branch/commit, versão local, verificação realizada, pendências e distinção de produção/migrações. Não afirmar “pronto para publicar” quando faltar versão ou check. Não confundir push, PR integrado, build aprovado ou tag pretendida com deploy confirmado. Releases anteriores permanecem históricos em publicacoes.md.

## Regras e implementação

### Ambiente, publicação e documentação

[ambiente-local.md](ambiente-local.md) descreve comandos, variáveis, persistência e debug. Next 5174 e Worker/Miniflare 8787 iniciam juntos; produção tem configuração separada. Somente .env/.env.example no local, sem ler valores em logs ou recriar .dev.vars/.env.local.

Deploy automático via GitHub Actions autorizado em 31/10/2026 após merge de PR na main, limitado ao workflow de [integracao-continua.md](integracao-continua.md). O merge autoriza a execução desse fluxo; preparar alterações não autoriza publicação manual pelo agente. Deploy manual e demais alterações remotas continuam exigindo pedido explícito. `npm run deploy` exige tag/descrição, compila e seleciona wrangler.jsonc; autenticação por token no CI ou perfil cantina-contabil no caminho local sem token. Preparação/inspeção em deploy-build.mjs e envio em deploy-worker.mjs são compartilhados. O CI valida contratos de API com Zod e safeParse nos próprios scripts, sem expor respostas ou credenciais. Consulta somente o histórico de migrações; não aplica migrações remotas. Verificar versão e tráfego antes de declarar sucesso.

## Operação

### Isolamento do pacote de publicação

OpenNext lê arquivos .env presentes durante a compilação e pode embutir suas variáveis no Worker. O .gitignore não interfere nisso. deploy.mjs usa deploy-build.mjs para copiar apenas código/configurações necessárias e dependências instaladas para uma pasta privada temporária, sem .env, credenciais, banco local ou builds existentes. Dependências são copiadas independentemente, sem symlink para o projeto; nenhum npm ci adicional ou instalação é feito nessa etapa. Ambiente do processo de compilação contém somente variáveis de sistema necessárias, não os segredos do shell.

O script exige next-env.mjs vazio para production/development/test, bloqueia arquivos de ambiente/chaves privadas e procura os valores sensíveis conhecidos do .env/shell nos artefatos .open-next e no bundle final de um dry-run Wrangler. Esses checks não substituem revisão de segredos desconhecidos inseridos no código. Só após aprovação envia o mesmo pacote, usando os Secrets já configurados no Worker. O envio compartilhado em deploy-worker.mjs usa token quando fornecido; sem token, mantém o perfil local cantina-contabil. CANTINA_SECRETS_FILE, se explicitamente configurado, é resolvido fora da cópia e passado somente ao envio; nunca ao build. Pasta temporária é removida ao terminar ou falhar; arquivos e processos locais não são encerrados/modificados. Nenhuma migração é aplicada.

Para compilar/verificar sem publicar: `npm run deploy -- --build-only`. Esse caminho permite o build completo sem disputar .next/.open-next com o ambiente local aberto. O fluxo de desenvolvimento permanece usando .env e recursos emulados.

### Publicação automática e publicação manual

Em 31/10/2026 foi autorizado o deploy automático via GitHub Actions após merge de PR na main, com testes/tipos aprovados e demais guardas de [integracao-continua.md](integracao-continua.md). Ambiente GitHub cloudflare-workers, token de publicação e leitura D1, versão incrementada localmente antes do commit pelo último número (regra simplificada aprovada em 11/11/2026), mensagem pelo título e tag após confirmação remota. O responsável fará o envio/merge do workflow; sua implementação local não confirma ativação remota. O Actions consulta nomes de migrações, sem aplicar SQL de migração.

Implementar ou corrigir não autoriza deploy manual pelo agente. Acesso à conta e retomada de chat não autorizam migração remota ou alteração de recursos. O procedimento manual abaixo continua disponível somente com solicitação explícita.

Quando houver novo pedido explícito:

1. Conferir STATUS/RELEASES, pacote/lockfile e migrações pendentes. Preservar configurações/segredos; não criar bucket/banco novo sem pedido.
2. Registrar ponto remoto com D1 Time Travel antes de migrar e conferir contagens/totais agregados. Exportação completa da produção para arquivo local foi recusada pela revisão automática nesta sessão; não contornar ou repetir por conveniência. Recuperação permanece no próprio D1; restauração exige autorização separada e análise de gravações posteriores.
3. Aplicar somente as migrações remotas autorizadas, conferir integridade/referências e preservação dos agregados. Não executar por rotina enquanto desenvolve. Migração local aplicada não comprova estado remoto.
4. Atualizar versão de package.json/package-lock.json e publicar pelo comando abaixo, com tag e descrição curta em inglês. O script prepara uma cópia temporária isolada, compila e seleciona wrangler.jsonc/perfil cantina-contabil; **não aplica migrações remotas**.
5. Confirmar tag/descrição, ID da versão e porcentagem do tráfego por metadados antes de declarar sucesso. Registrar RELEASES, atualizar STATUS e a matriz de migrações, sem alegar teste funcional pelo build.

```bash
npm run deploy -- vX.Y.Z "Descrição curta da entrega"
```

Alternativa equivalente: npm run deploy -- --tag vX.Y.Z --message "Descrição curta da entrega". Os valores são exemplos; uma revisão documental não autoriza executar esses passos.

Versão ativa e migrações não são presumidas pelo procedimento. Consultar estado-atual e, para IDs/bookmarks anteriores, o histórico do ambiente/publicações.

Workflow, configuração do GitHub e recuperação de falhas: [integracao-continua.md](integracao-continua.md).
