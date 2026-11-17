# Colaboração no Ministério Contábil

Responder em português, de forma simples e resumida. O responsável participa das decisões e não irá programar. Não ampliar o escopo.

## Leitura direcionada

- Ao iniciar/retomar, ler [estado atual](docs/estado-atual.md) e usar o [mapa de leitura](docs/README.md). Não ler toda a pasta docs por rotina.
- Escolher somente a funcionalidade afetada e os contratos compartilhados envolvidos. Backend, aparência, interação, banco e publicação têm leituras separadas. O mapa indica os arquivos exatos.
- Reutilizar o padrão aprovado mais próximo. Atualizar o documento dono da regra; substituir texto superado, sem acumular adendos contraditórios ou copiar a mesma regra para vários donos.
- Histórico registra fatos anteriores, não padrões atuais. Não ler historico/ nem docs-example/ como preparação normal. Pendências não autorizam implementação.
- README é a entrada para pessoas; docs/README é o mapa; estado-atual contém somente retomada/pendências. Detalhes técnicos e regras das áreas ficam em seus donos, não no README ou neste arquivo. Não recriar verification/.

## Decisões e autorização

- Explicar brevemente a mudança antes de executar. Preservar código, alterações preexistentes, dependências, segredos e bancos.
- Não escolher silenciosamente arquitetura, dependências, infraestrutura, regras de dados/negócio ou novo estilo exclusivo. Diante de ambiguidade/conflito, consultar o dono e perguntar antes da parte dependente; sugestão não é aprovação. Reutilização do padrão aprovado não exige nova confirmação.
- Não iniciar implementação durante planejamento sem solicitação, nem outro bloco de funcionalidades por existir backlog ou por mudança de chat.
- Push, PR e merge dependem de pedido explícito. Preparar branch/commit não autoriza envio. Deploy manual, migração remota, rollback e mudanças de recursos Cloudflare exigem pedido explícito. O merge autorizado aciona apenas o fluxo automático aprovado; Actions consulta migrações, não aplica SQL remoto.

## Pasta e Git

- Implementar exclusivamente em `/home/stpimenta/Desktop/Projects/cantina_contabil`. Não criar worktree, clone ou cópia de implementação sem pedido explícito. Cópias temporárias exclusivamente para build/testes são permitidas. Diagnosticar impedimentos sem contorná-los com outra cópia.
- Não trabalhar na main. Melhorias usam feat/<short-description>; correções fix/<short-description>, em inglês/minúsculas/hífens, a partir de origin/main atualizada. Preservar branches/commits já preparados e alterações existentes.
- Commits/PRs em inglês: feat: ou fix:, com escopo opcional. Usar identidade Git do responsável como autor/committer; nunca Codex como autor, committer ou coautor. Se faltar identidade válida, perguntar.
- Antes do commit de entrega, seguir [Git e publicação](docs/operacao/git-e-publicacao.md): incrementar somente o último número X.Y.Z desde origin/main atualizada; preservar versão maior já preparada para esta entrega. Sincronizar pacote/duas entradas do lockfile e validar com validatePackageVersion. Não declarar pronta para envio nem fornecer push com versão pendente/igual à main. Tags são imutáveis.
- Diagnosticar merge/rebase interrompido ou divergência antes de trocar branch/puxar. Atualização normal usa fast-forward; não criar merges locais sucessivos ou reescrever histórico por conveniência.

## Implementação e verificação

- Seguir a divisão app/presentation/components/server/shared e composição manual descritas em [estrutura e camadas](docs/arquitetura/estrutura-e-camadas.md). Regras financeiras/permissões são verificadas no servidor, nunca só escondendo controles.
- Aparência usa tokens/componentes compartilhados, CSS Modules do dono e a composição aprovada da área. Sem inline styles, sobrescritas internas ou redesenho de outras telas. Usar o [contrato visual](docs/interface/DESIGN.md) somente quando houver mudança visual.
- Durante alterações, fazer somente leitura direcionada e revisão estática do código; não executar automaticamente testes, typecheck, build ou auditorias. A verificação fica concentrada na revisão final antes do deploy, conduzida pelo responsável, ou mediante pedido explícito. Não repetir verificações por alteração/chat. [Testes](docs/operacao/testes.md) define a execução final, isolamento e limites.
- Testes podem iniciar apenas Miniflare descartável em loopback, com dados sintéticos, encerrado ao finalizar; nunca banco local/remoto do app. Não criar testes visuais/carga/cobertura percentual. A conferência funcional da UI fica com o responsável.
- Somente documentação: revisar conteúdo, links/âncoras e formatação; não rodar build/testes do aplicativo.
- Revisão visual é estática em celular, tablet, notebook e PC, inclusive faixas intermediárias, nomes/arquivos/valores longos, estados condicionais, foco/teclado e erros. Não iniciar app/navegador nem enviar prévias/screenshots. Não alegar validação visual ao vivo pelo build.

## Ambiente e encerramento

- Variáveis locais somente .env/.env.example; não criar .env.local/.dev.vars, imprimir segredos ou copiar bancos/credenciais. D1/R2 local é emulado; nunca usar financeiro remoto para desenvolvimento. Não apagar .wrangler/state ou builds em uso.
- Não iniciar/reiniciar app/servidores em segundo plano sem pedido explícito. Responsável normalmente executa npm run dev (Next 5174 + Worker 8787). Conferir conflitos antes de iniciar; encerrar processos iniciados pelo agente salvo pedido para mantê-los.
- Build/publicação usam cópia temporária sem .env/credenciais/estado, ambiente limitado e inspeção do pacote; --build-only não publica. Não mover .env nem sobrescrever builds em uso. Procedimentos completos em operacao/.
- Ao encerrar, atualizar estado-atual distinguindo código local, migração local e produção. Resumir mudança, motivo, verificação real e pendências; build/tag/merge não comprovam versão publicada. Registrar publicação confirmada no histórico, não inferir.
