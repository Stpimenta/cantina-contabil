# Estado atual — 21/11/2026

Retomada curta. Use o [mapa de leitura](README.md) para escolher os contratos. A [retomada anterior preservada](historico/estado-preservado-2026-11-21.md) registra evidências antigas, sem substituir as regras atuais.

Preferência de entrega registrada em [Git e publicação](operacao/git-e-publicacao.md#3-entregar-a-branch-e-o-pr): pedidos de comandos recebem git add ., git commit e git push, acompanhados de título/resumo do PR em inglês.

## Entrega local

- Correção rápida dos rótulos de pickupOn para Data de entrega na lista, filtros, planejamento e histórico; formulário já usava o texto. Sem mudança de dados/regras, migração ou dependências. Revisão estática e diff; sem testes/build/app. Versão 0.6.27 mantida no complemento da mesma entrega; fetch continua bloqueado, main remota atual não reconferida.

- Branch `fix/orders-products-navigation`, baseada no mesmo commit da `origin/main` disponível: `cbef4c7`. Commit anterior `f433a4b` presente localmente e na referência disponível da branch remota; ajuste atual dos rótulos ainda sem commit/envio. Identidade Git do responsável configurada.
- Versão **0.6.27** sincronizada no pacote e nas duas entradas do lockfile, validada por `validatePackageVersion` contra **0.6.26** da referência disponível. Nenhuma dependência alterada.
- Git remoto não reconferido: fetch recusado por `.git/FETCH_HEAD` somente leitura; consulta direta ao GitHub falhou por DNS. Antes de enviar, atualizar `origin/main`, revalidar versão e conferir possível avanço da base/tag.
- Produtos/Eventos/Comandas: busca mobile com lupa interna discreta, filtros em ícone, pedidos com ações no topo e resumo de duas linhas, breadcrumbs compactos e carregamentos alinhados. Composição usa controles compartilhados e CSS Modules dos donos; detalhes e estoque seguem os tokens atuais.
- Estoque usa somente a rolagem do corpo do modal e carregamento progressivo; planejamento consulta período automaticamente. Calendário e histórico reutilizam as mesmas bases em Produtos/Eventos. Calendário distingue hoje com círculo claro e seleção com círculo escuro; seleção prevalece quando coincide com hoje. Ajustes posteriores à revisão final: calendário ocupa tela inteira abaixo de 600px pela opção explícita fullScreenOnMobile do Modal compartilhado; demais larguras preservadas. Conferidos estaticamente sem nova execução de testes/build.
- Cantina: Situação do pedido permite marcar/desfazer Retirado usando collected também no +, junto ao pagamento em atualização única autorizada/versionada. Sem nova baixa de estoque. Link temporário visível, com copiar/confere no campo; QR e descarte ao fechar preservados.
- Documentos donos atualizados; instruções antigas sobre resumo completo, posição do caixa e rolagem aninhada substituídas. Estado anterior preservado no histórico; regras não são replicadas nesta retomada.

## Alteração posterior — comprovantes de pedidos

- Implementação local de upload opcional na etapa Pagamento de criar/editar pedidos e em Situação do pedido (+), reutilizando FileUploadField e o R2 privado existente; até 5 imagens/PDF de 5 MB. OrderReceiptUpload compartilha seleção e visualização entre os formulários; no +, Comprovantes é o último campo após pagamento/retirada. Anexos podem ser mantidos/removidos e abertos na edição/+; + aceita salvar apenas comprovantes e conserva os arquivos na confirmação de reposição; autenticação, permissão e vínculo conferidos no servidor.
- Metadados no payload versionado já existente, sem chave privada na interface nem nova migração. Arquivos históricos preservados e fingerprint inclui hashes. Bucket/binding remoto não consultado nem alterado.
- Quatro cenários de integração acrescentados em order-receipts.test.ts e dois cenários unitários de validação/etapas; somente revisão estática e formatação nesta alteração, sem testes/typecheck/build/app. As aprovações abaixo são anteriores e não validam esta implementação. Versão 0.6.27 mantida para a mesma entrega, ainda sem commit/envio.

## Resultado do responsável e correções

- Execução completa enviada em 21/11: **404 aprovados e 2 falhas** (406 testes/36 arquivos). Falhas em deliveries e order-receipts, sem bloqueio de Miniflare nessa execução. Aviso do Wrangler sobre durable_objects em env.next permanece separado das falhas.
- Corrigida a leitura D1 para normalizar comprovantes ausentes como receipts: [], compatível com pedidos legados e com repetição do cadastro sem anexo. Teste acrescenta conferência da leitura sem comprovantes.
- Comparação do retorno repetido de criação no teste de comprovantes passou a toMatchObject, preservando conferência de todos os campos de negócio sem exigir ausência dos metadados adicionais de leitura (deletedAt/deletedBy/deletedByName/pickupOn). Contagem de objeto, auditoria e financeiro continua exigida.
- Correções conferidas estaticamente, sem nova execução de testes/typecheck/build. Reexecutar deliveries.test.ts e order-receipts.test.ts antes de concluir envio. Versão 0.6.27 preservada na mesma entrega.

## Conferência de publicação após os comprovantes

- Guia de Git/publicação e CI reconferido: branch correta, sem conflitos, identidade válida; 0.6.27 sincronizada e validada contra origin/main disponível (0.6.26). Diff e formatação de todos os arquivos alterados/novos aprovados. Sem novas migrações ou dependências.
- Fetch continua bloqueado por .git/FETCH_HEAD somente leitura. Referência/tag remota atual e estado de produção não confirmados. Não declarar entrega pronta para envio até reconferir remoto e concluir verificações finais.
- Responsável vai executar npm test. Também pendem typecheck e build isolado após os últimos ajustes; resultados anteriores abaixo não validam os comprovantes. Nenhum teste/build executado nesta conferência.

## Revisão final solicitada

- Revisão estática dos fluxos afetados, composição/CSS e responsividade; formatação dos arquivos alterados e diff sem erros. Sem app/navegador, capturas ou validação visual ao vivo.
- Testes unitários: **232 aprovados**. Grupo explícito de release/API/deploy: **66 aprovados** (execução separada; não somar como cobertura inédita).
- Integração: **53 aprovados; 115 bloqueados na preparação** por `listen EPERM` em loopback no Miniflare. Sem falha de asserção observada nessa execução. Dois cenários novos de Cantina cobrem retirada/pagamento, repetição/auditoria/estoque, desfazer, conflito de versão e falta de Alteração; ainda precisam executar em ambiente com Miniflare permitido.
- Typecheck completo, incluindo os testes e os ajustes finais de carregamento: aprovado.
- Build Cloudflare isolado: compilação Next aprovada, interrompida na leitura de TypeScript `--showConfig`. Pacote final/dry-run não concluídos. Ajustes finais de carregamento tiveram typecheck, sem novo build; conferência completa fica pendente.
- Próximo passo do responsável: atualizar referência remota/revalidar versão, executar `npm test`, `npm run typecheck` e `npm run deploy -- --build-only`; revisar o diff, criar commit, enviar a branch e abrir PR. Não integrar com checks reprovados. Build isolado não publica.

## Migrações e produção

| Ambiente                 | Último estado confirmado                                                                                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 local da pasta normal | Consulta somente de esquema/histórico em 16/11 confirmou 0026–0029 aplicadas, sem birth_date/phone_country/phone_number.                                                                                        |
| Correção 0030            | Campos de perfil separados em 0030_local_account_profile.sql; preparada/testada, não aplicada pelo agente. Aplicação posterior pelo responsável não reconferida. Não reaplicar 0029 nem apagar histórico.       |
| Supabase/Resend          | Responsável informou configuração local/Worker, SMTP, domínio, templates/URLs/prazo concluídos; não reconferidos remotamente. Projeto Auth compartilhado local/produção aprovado; D1/R2 local continua emulado. |
| Produção                 | Nenhuma consulta, migração ou publicação pelo agente nesta entrega. Último registro anterior aponta v0.6.6; não confirma a versão hoje ativa.                                                                   |

## Limites e produção

Esta entrega não cria migração nem altera banco local/remoto, dependências, recursos Cloudflare ou configuração de autenticação. Nenhum push, PR, merge ou deploy realizado pelo agente. Versão publicada e migrações aplicadas em produção não foram reconferidas; build, tag ou merge não são prova de publicação. Pendências anteriores ficam na retomada preservada e não autorizam novo escopo.
