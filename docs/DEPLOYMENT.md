# Preparação de PR, publicação e recuperação

Guia operacional aprovado em 01/11/2026 para responsáveis e agentes. Ler antes de preparar commits para envio, abrir PR, atualizar a main ou retomar falhas de publicação. O contrato técnico do workflow, permissões e migrações está em [CI.md](CI.md); ambiente e build isolado em [LOCAL.md](LOCAL.md); situação confirmada em [STATUS.md](STATUS.md).

## 1. Conferir o Git antes de alterar

```bash
git status --short --branch
git branch --show-current
git fetch origin
```

- Verificar arquivos modificados, conflitos, merge/rebase em andamento e diferenças entre branches. Não trocar de branch, iniciar outro merge ou criar commit enquanto houver operação interrompida sem entender o estado.
- Novas alterações usam `feat/...` ou `fix/...`, em inglês, a partir de `origin/main` atualizada. Não usar uma main local divergente como base por conveniência. Preservar as alterações existentes; usar worktree isolado quando necessário.
- Não criar commits de desenvolvimento ou merges locais na main por rotina. Se a main local contém commits próprios, diagnosticar e preservar esse histórico antes de qualquer reconciliação. Não enviar esses commits diretamente à main remota para “sincronizar”.
- Conferir identidade Git do responsável. Separar arquivos gerados, `.env`, estado D1/R2 e backups; nunca incluir segredos ou dados locais no commit. Não descartar alterações preexistentes para obter uma árvore limpa.

## 2. Escolher a versão antes do commit de entrega

**Não entregar uma branch como pronta para envio com a versão ainda pendente.** Pedir a escolha do responsável antes de preparar o commit final. Não deduzir a versão pelo prefixo feat/fix. Isso também vale para PR somente de documentação ou testes.

1. Atualizar a referência `origin/main` e conferir a versão de seu `package.json`.
2. Obter a versão nova escolhida pelo responsável; ela deve ser maior que a versão da main remota atualizada.
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

- Executar as verificações do escopo, conforme [TESTING.md](TESTING.md) e [LOCAL.md](LOCAL.md). Código exige grupos afetados e build Cloudflare/TypeScript isolado; documentação exige conteúdo, links e formatação. Não repetir checks aprovados sem mudança ou falha que justifique.
- Revisar o diff staged e confirmar ausência de conflitos/arquivos indevidos antes de criar o commit. Commits e título do PR usam feat/fix com descrição em inglês.
- Antes de fornecer o comando de push, confirmar branch, commit, versão escolhida nos três pontos e incremento validado. Se algum desses itens estiver pendente, informar explicitamente que a entrega ainda não está pronta para envio.
- Push, criação de PR e merge remoto continuam dependendo de pedido explícito do responsável. Não executar publicação manual como alternativa a um CI bloqueado.
- Conferir o título final sugerido pelo GitHub e os checks do PR. Se a main avançou, conferir novamente se a versão continua maior. Não fazer merge de PR com validação reprovada para tentar corrigir depois.
- Merge remoto autorizado aciona o deploy automático, mas não comprova sucesso. Só declarar publicação após confirmar execução, versão ativa, tráfego e tag, conforme CI.md.

## 4. Recuperar falha de versão

| Situação                                             | Próximo passo                                                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PR aberto, versão igual ou menor que a main          | Atualizar os três pontos para a versão escolhida, validar, criar commit pequeno na mesma branch e enviar somente com autorização.                      |
| PR já integrado com versão inválida                  | Criar branch `fix/...` da main remota atualizada, corrigir a versão e preparar novo PR. Atualizar uma branch já integrada não altera o commit da main. |
| Apenas título do PR incorreto                        | Corrigir título conforme CI.md; isso não altera nem corrige a versão do pacote.                                                                        |
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

Atualizar STATUS.md com branch/commit, versão local, verificação realizada, pendências e distinção de produção/migrações. Não afirmar “pronto para publicar” quando faltar versão ou check. Não confundir push, PR integrado, build aprovado ou tag pretendida com deploy confirmado. Releases anteriores permanecem históricos em RELEASES.md.
