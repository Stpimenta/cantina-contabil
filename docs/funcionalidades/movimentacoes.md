# Movimentações — contrato da área

Contrato atual. Leia somente ao alterar este assunto. [Escolher outra leitura](../README.md).

## Regras e implementação

### Movimentações manuais

- Funcionalidade em server/movements, com models, inputs Zod, contratos de repository, infraestrutura Drizzle/D1 e um use case por operação; interface em presentation/movements e rota /movements. Admin/operador com consulta geral e gravações limitadas aos caixas concedidos, executeOperation/handleFailure/logger e validação independente de Actions.
- Caixa ativo, Entrada/Saída, valor positivo em centavos, data civil e justificativa obrigatória até 500 caracteres. Entrada registra rendimentos/aportes; saída registra retirada/despesa justificada. Efeito imediato no real, sem pendência, sem duplicar doações/pedidos/insumos, sem forma de pagamento; até 5 comprovantes opcionais por registro, conforme a seção abaixo.
- Registrar, consultar, editar e excluir. Cadastro idempotente por UUID/fingerprint normalizado e autoria; edição/exclusão por versão otimista. Correção pode alterar caixa/tipo/valor/data/justificativa; ao mudar de caixa, verificar ambos os saldos. Isso é correção do registro, não uma transferência pareada ou integração bancária.
- Saldo final negativo nunca é aceito nas operações de movimentações: cadastro, edição e exclusão verificam o efeito em cada caixa afetado, inclusive redução/exclusão de entrada cujo valor já tenha sido usado. Verificação no use case com BigInt e novamente no D1 de forma atômica com gravação/auditoria. Limite monetário seguro preservado. As regras já aprovadas de correções de pedidos/insumos não são ampliadas silenciosamente.
- Exclusão lógica confirmada remove o efeito financeiro e a linha da lista, preservando dados, criação, autoria/data de alteração/exclusão e snapshots. Registro excluído é imutável; DELETE físico é bloqueado. Caixa com qualquer movimentação preservada não pode ser excluído.
- Migração 0020_cash_movements.sql cria cash_movements e cash_movement_audit, índices e triggers. Não altera registros existentes; adapta as guardas de saldo suficiente dos insumos para considerar entradas/saídas manuais e adiciona proteção de precisão financeira às gravações relacionadas. Auditoria não pode ser atualizada/apagada. Drizzle representa tabelas da funcionalidade, sem novo framework, dependência ou serviço.
- Histórico do caixa une auditoria de movimentações com prefixo movement_, autoria, horário técnico e snapshots antes/depois. Entradas/Saídas consideram tipo atual e anterior nas correções; mudança de caixa preserva acesso no histórico de ambos. Não somar a auditoria ao saldo. Lista de movimentações tem 15 itens, ordenada por data civil/criação/ID decrescentes, sem pesquisa/filtros extras neste bloco.

### Comprovantes de movimentações

- MovementReceipt guarda id/key/type/size; receipts_json integra a mesma versão de Movement. Comprovante é opcional tanto para entrada quanto saída. Limites e metadados Zod compartilhados em shared/receipts/receipt-input.ts: até 5 JPEG/PNG/WebP/PDF de até 5 MB, entre mantidos e novos. Assinatura/hash em shared/receipts/receipt-content.ts; os adaptadores anteriores de insumos preservam compatibilidade.
- Create/UpdateMovementUseCase recebem Files reais separados, substituem metadados do cliente pelos arquivos e validam antes do armazenamento. Edição resolve retainedReceiptIds somente nos anexos atuais, verifica versão/quantidade combinada e conserva referências mantidas. Conteúdo/hash e gravações são sequenciais; R2ReceiptRepository e binding RECEIPTS existentes, prefixo movements/id/hash. Sem novo bucket/segredo/dependência, Base64 ou chunks; bodySizeLimit=26mb permanece suficiente para o envelope aprovado, sem alegar teste de carga.
- Objeto é salvo antes da atualização D1; as regras de resultado incerto/órfãos também se aplicam. Remover no X só persiste ao salvar e objetos anteriores não são apagados. Exclusão lógica preserva recibos e snapshots.
- GetMovementReceiptUseCase valida sessão/perfil, UUIDs, movimentação ativa e vínculo do receiptId; rota /movements/[id]/receipt entrega imagem privada ou PDF attachment, no-store/nosniff/CSP restritiva. Navegador recebe somente id/type/size, nunca key. ReceiptLink compartilhado abre ImagePreviewModal ou download; SupplyReceipt adapta a URL de insumos sem duplicar visualizador.
- Migração 0022_movement_receipts.sql acrescenta lista vazia aos registros existentes sem alterar dados/auditorias anteriores; valida até 5 referências e tipos/tamanhos/IDs únicos, inclui receipts/receiptCount nos novos snapshots e preserva a lista na exclusão. Histórico do caixa remove receipts privados antes de enviar à interface, mantendo a contagem.

## Fluxo e interação

### Movimentações

- Menu principal Movimentações abre /movements, com PageHeader, contexto Entradas e saídas dos caixas, Nova movimentação e lista simples com separadores, sem cards novos. Paginação padrão de 15; ordem de data da movimentação/criação/ID decrescentes. Sem busca ou filtro não solicitado.
- Cada linha mostra Entrada/Saída e valor, link do caixa/data e justificativa resumida (uma linha no celular, até duas nas demais telas). Três pontos compartilhados RecordActionsMenu disponibilizam Detalhes, Editar e Excluir em todas as larguras; comportamento/foco igual ao menu aprovado em insumos. Texto completo e autoria/datas nos detalhes.
- Criar/editar reutiliza Modal size=form, SelectField Caixa/Tipo, MoneyField, DateField e TextareaField de justificativa obrigatória até 500 caracteres. Caixa/Data e Tipo/Valor lado a lado a partir de 1024px; justificativa em linha própria. Abaixo disso empilham. Entrada é o tipo inicial; valor vazio e data inicial de hoje em America/Sao_Paulo. Sem forma de pagamento; comprovantes opcionais ficam abaixo da justificativa.
- Sucesso fecha, mostra toast e atualiza lista/saldos/históricos. Validação inline/foco/revalidação pelo useServerAction com o mesmo Zod do servidor. Erros sem campo corrigível, concorrência ou saldo insuficiente usam ErrorModal e preservam formulário. Envio trava campos e fechamento; dados alterados exigem confirmação de descarte.
- Exclusão exige confirmação curta no padrão compartilhado; exclusão lógica recalcula saldo preservando histórico. Qualquer operação de movimentação que resulte em saldo real negativo é bloqueada, incluindo excluir/reduzir entrada já utilizada e correção entre caixas. Sem pendência ou devolução bancária automática.
- Histórico do caixa mostra Movimentação registrada/atualizada/excluída em duas linhas com autor; detalhes apresentam antes/depois completos e data técnica. Filtros Entradas/Saídas incluem o tipo anterior quando houver correção. Excluídas saem da lista/saldo, permanecendo no histórico.
- Comprovantes opcionais em entrada/saída: FileUploadField compartilhado, clique ou arraste, até 5 imagens JPEG/PNG/WebP/PDF de 5 MB cada. Edição carrega salvos abaixo do upload, permite acrescentar e remover por X; nomes truncam, tamanho permanece legível e tudo fica bloqueado durante envio. Cancelar não grava remoções. Detalhes lista os anexos atuais para abrir imagens no modal do app/baixar PDF. Listagem resumida não ganha informação ou card adicional; histórico mostra contagem, mantendo referências privadas no servidor.

Na página Insumos, a linha discreta Total em compras fica entre o cabeçalho e a lista e mostra o total de compras ativas vinculadas ao evento, independentemente do caixa pagador. Doações materiais e registros excluídos ficam fora; sem compras, R$ 0,00. Não calcular lucro nem descontar esse indicador de Real/Pendente.

## Composição visual

### Movimentações

Reutiliza lista com separadores, PageHeader e paginação, sem nova variante de card/tema. Cabeçalho Nova movimentação vira + apenas abaixo de 600px via mobileIcon. Tipo/valor são principais; caixa/data e justificativa são secundários. Justificativa trunca em uma linha no celular e até duas nas demais telas, mantendo detalhes completos. Ações ficam em RecordActionsMenu compartilhado com insumos: três pontos, Detalhes/Editar/Excluir, mesmo teclado/foco, tokens e z-index globais.

Formulário segue Modal size=form e form-grid: Caixa/Data, depois Tipo/Valor no desktop a partir de 1024px, justificativa de largura inteira. Mobile/notebook abaixo desse limite empilham. Comprovantes opcionais usam o FileUploadField já aprovado abaixo da justificativa, em linha inteira, com lista de anexos e X; Detalhes usa ReceiptLink compartilhado. Sem estilo exclusivo de controle, calendário, máscara, upload ou modal. Detalhes e snapshots do histórico usam pares rótulo/valor e tipografia compartilhados; nenhuma informação financeira adicional ou gráfico.
