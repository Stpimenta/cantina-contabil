# Diagnósticos de ambiente

Contrato atual. Leia somente ao alterar este assunto. [Escolher outra leitura](../README.md).

## Diagnóstico de build no ambiente do agente

Em 28/10/2026, a execução restrita da ferramenta causou `Could not parse output from TypeScript's --showConfig`: o processo auxiliar do compilador entregava stdout vazio, e uma reprodução com spawnSync revelou EPERM. Executar `npm run build:cloudflare` fora dessa restrição, com a revisão de permissão da ferramenta, concluiu Next/TypeScript/OpenNext com código 0. Não foi necessário mudar tsconfig, versão de dependências ou desativar validação. Isso não é evidência de defeito no compilador/projeto nem exige alteração no terminal do responsável. Se reaparecer, conferir erro/saída reais do subprocesso antes de modificar configurações; permissão fora da restrição segue o mecanismo da ferramenta, sem contornar rejeição. Build não publica nem substitui conferência funcional/visual.
