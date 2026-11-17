# Banco e migrações por ambiente

Leia antes de alterar schema/SQL ou aplicar/conferir migrações. [Mapa](../README.md). Integridade/ORM em [Banco e auditoria](../arquitetura/banco-e-auditoria.md); estado atualizado em [retomada](../estado-atual.md).

## Execução local

```bash
npm run db:local
```

Wrangler aplica somente migrações pendentes ao D1 emulado; npm run dev/dev:worker já executam esse passo. Não acessa o remoto. Parar ambiente existente quando precisar reiniciar o bundle, preservar backup e .wrangler/state; não abrir instância concorrente ou apagar estado para contornar falha.

Nova estrutura exige SQL versionado e schema Drizzle do dono. Uma migração pode coordenar tabelas, índices, constraints e triggers; não editar/apagar/renomear a que já foi aplicada, reaplicar manualmente ou remover seu registro. Wrangler é o único histórico: sem Drizzle Kit/push/diff automático. Instalação local não comprova produção.

## Estado confirmado e correção 0030

| Escopo                         | Evidência disponível                                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local da pasta normal          | Consulta somente de esquema/histórico em 16/11 confirmou nomes até 0029, inclusive 0023/0024/0025. Não é uma auditoria de conteúdo/checksum.                                                                  |
| 0030_local_account_profile.sql | Criada/testada para birth_date/phone_country/phone_number, ausentes apesar de 0029 registrada. Aplicação local pelo responsável posterior à correção não reconferida; agente não aplicou. Não reaplicar 0029. |
| Produção                       | Registro anterior confirma até 0022; estado posterior não reconferido neste bloco. Nunca inferir pelo local, build, versão ou branch.                                                                         |

Datas, backups/bookmarks e validações anteriores estão no [histórico do ambiente](../historico/ambiente-anterior-2026-11.md). Atualizar esta matriz/estado-atual quando houver nova evidência; não acumular tabelas contraditórias.

## Anexos e preservação

- R2 privado em produção; local emulado por RECEIPTS no wrangler.local.jsonc, remote=false, persistência em .wrangler/state/v3/r2. Sem bucket público nem troca de binding para desenvolver. Anexos gerais não estão autorizados.
- Limites compartilhados: até cinco JPEG/PNG/WebP/PDF de 5MB por registro, contando mantidos/novos; Server Actions bodySizeLimit=26mb, bytes/hash sequenciais sem Base64/chunks. Não houve teste de carga/memória.
- Donos visuais: FileUploadField/ReceiptLink/ImagePreviewModal. Remover pelo X só persiste ao salvar, sem apagar arquivos históricos. Chaves privadas ficam no servidor, comprovante exige sessão/vínculo. Detalhes em [Insumos](../funcionalidades/insumos-e-comprovantes.md) e [Movimentações](../funcionalidades/movimentacoes.md).
- R2/D1 não têm transação distribuída; resultado incerto pode deixar objeto sem vínculo. Não apagar automaticamente ou presumir que a gravação falhou; reconciliação de órfãos continua pendente.

## Produção

Somente pedido explícito autoriza migração remota. Antes, seguir [Git e publicação](git-e-publicacao.md): Time Travel no próprio D1, integridade/referências/agregados antes/depois e proteção de gravações posteriores. Exportação completa da produção para arquivo local foi recusada na revisão anterior; não contornar por conveniência. Restauração exige autorização separada. Actions consulta o histórico de nomes e bloqueia divergência, nunca aplica migrações.
