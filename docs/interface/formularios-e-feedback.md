# Componentes, formulários e feedback

Contrato atual. Leia somente ao alterar este assunto. [Escolher outra leitura](../README.md).

## Regras e implementação

### Ações no frontend

`shared/hooks/use-server-action.ts` é o executor único para login, logout, criação/edição de caixa, exclusão, doação, eventos e pedidos. Controla pending, trava síncrona, erro/campos, validação local, revalidação ao editar e foco. Validação com campos mapeados não abre modal; demais falhas usam ErrorModal. O ErrorModal central intercepta especificamente SESSION_EXPIRED com categoria unauthenticated e navega com router.replace para /login sem abrir diálogo; isso também cobre falhas da rota de comprovante. Não redirecionar por toda falha de autenticação: credenciais inválidas e expiração do acesso na tentativa de login permanecem no formulário de login.

Cada componente informa mensagem de conexão, IDs dos campos em ordem visual e callbacks. Somente a chamada remota é capturada; erro de callback local não deve virar falsa falha de conexão após sucesso. O catch do hook chama unstable_rethrow antes de tratar transporte, preservando os sinais de navegação do Next também no navegador: redirect de login/logout não abre ErrorModal. Não atualizar estado nem executar callbacks após desmontagem.

Sem retry, log técnico no navegador ou referência fictícia. Login limpa senha após falha de autenticação/servidor, preservando-a em erro de validação; formulários financeiros preservam dados. Formulários fornecem validate e validationKey ao hook: usam os mesmos validadores puros de inputs/ e presentBusinessFailure, sem duplicar regras. O hook valida no envio, foca o primeiro campo inválido e, após a tentativa, revalida localmente quando os valores mudam, sem chamada remota ou deslocamento de foco. O servidor sempre repete a validação antes de acessar dados. PageFailure e app/error.tsx atendem outros contextos. Busca/filtros são navegação; CopyButton usa API do navegador e não passa por esse hook.

## Fluxo e interação

### Ações e erros compartilhados

- useServerAction controla Server Actions: pending, trava imediata de duplicidade, erro/campos e foco ao fechar ErrorModal. Os componentes mantêm dados, confirmação de descarte e callbacks de sucesso.
- Validação com campos identificados aparece somente abaixo dos campos/grupos (FieldError compartilhado), sem abrir ErrorModal nem resumo genérico. No envio, focar o primeiro campo inválido na ordem visual; após essa tentativa, revalidar ao editar, removendo/atualizando erros imediatamente sem reenviar nem mover o foco. Reutilizar os validadores Zod da entrada, sem chamadas remotas por tecla. Falhas sem campo corrigível, conflitos, autenticação, conexão e erros inesperados continuam no ErrorModal.
- Campos e envio ficam bloqueados durante gravação; botão não muda de tamanho. Formulário não fecha/cancela enquanto envia. Um envio por vez.
- Erro conhecido das regras contém somente código/categoria e issues técnicas. Na fronteira, o catálogo em presentation/errors/present-business-failure.ts produz mensagem e fields para a interface. Falha interna mantém mensagem amigável e referência do servidor; detalhes técnicos ficam no logger. Falha de transporte não inventa referência nem garante que nada foi gravado.
- Cada operação tem mensagem de conexão adequada. Em gravação incerta, orientar conferir a lista antes de repetir. Sem repetição automática.
- Só a chamada remota é capturada pelo hook. Erros de callbacks locais não são reclassificados como falha de rede após sucesso. Resultado após desmontagem não atualiza estado nem executa callback.
- Validação local de doação reutiliza o schema Zod da entrada do use case, com tradução dos códigos pelo catálogo da apresentação, e integra a validação ao mesmo hook. A validação é repetida obrigatoriamente no servidor. No envio inválido, focar diretamente o primeiro campo na ordem visual; campos e dados financeiros permanecem.
- PageFailure representa consultas que falharam; app/error.tsx representa falhas inesperadas de renderização. Não mostrar 0 resultados para uma falha.
- Busca/filtros por navegação e CopyButton têm seus próprios donos; não são Server Actions nem usam outro executor genérico de gravação.

### Texto das confirmações de exclusão

Padrão aprovado em 11/11/2026 para caixas, doações, eventos, pedidos, insumos e movimentações: título Excluir [tipo]? e corpo único O histórico será preservado., sem repetir a pergunta, nomes/valores ou explicações financeiras no corpo. A mensagem pertence ao ConfirmationModal compartilhado. Preservar Cancelar e Excluir [tipo] com texto, foco inicial em Cancelar, bloqueio durante envio e tratamento de falhas existente. As regras de exclusão lógica, vínculos, saldo e auditoria continuam sendo verificadas no servidor; simplificar a mensagem não altera essas regras. Confirmação de descarte de formulário permanece específica.

### Seletores padronizados

- SelectField é único: options value/label/disabled e onValueChange. Sem select/option HTML ou dropdown particular por tela.
- Lista suspensa abaixo do campo; escolher fecha e devolve foco. Clique fora fecha sem roubar foco. Escape fecha só a lista, preservando o modal pai. Tab mantém navegação natural.
- Setas navegam habilitados, Home/End vão aos extremos, Enter/Espaço escolhem e digitação procura o início do rótulo. Combobox/listbox anunciam rótulo, estado, opção ativa/selecionada e erro.
- Disabled e fieldset desabilitado são respeitados. Lista longa rola por dentro; opção longa quebra linha, valor fechado pode truncar. Em navegadores com âncoras, popover não é recortado pelo modal; fallback mantém a mesma lista abaixo no fluxo.
- Hidden input preserva name/FormData. Atualizar o valor antes de emitir input para FilterForm. Não simular ChangeEvent nativo nem adicionar roteamento ao seletor.

### Quantidades inteiras

Nova entrada de estoque usa QuantityStepper compartilhado: −/input number/+ compactos, mínimo 1 e limite de inteiro seguro. O Field appearance="quantityStepper" centraliza o número e oculta setas nativas duplicadas; botões são os compartilhados de 44px. Correções nas linhas usam Field appearance="quantityNative": input number centralizado em largura compacta, digitação e setas nativas. Mínimo 1 para entrada nova e 0 para correção, step inteiro, limite de inteiro seguro, nome acessível e erro associado. Servidor valida quantidade/versão e estoque. Correção ocorre nos campos dos lançamentos como rascunho, com Salvar alterações único no rodapé, sem botões de ação por linha ou modal adicional; ver [Produtos recorrentes](../funcionalidades/produtos-recorrentes.md).

### Datas, feedback e acessibilidade

- Datas visíveis dd/mm/aaaa; auditoria também HH:mm em America/Sao_Paulo. DateField usa máscara/teclado numérico e valida calendário, enviando YYYY-MM-DD. Não usar input date nativo que varia de idioma.
- Toda data editável usa DateField com calendário compartilhado em português: botão abre Modal, inicialmente no mês da data válida ou de hoje em America/Sao_Paulo. Navegação mensal e por teclado é fornecida pelo DayPicker; escolher um dia ou Hoje atualiza o campo e fecha. Escape/cancelar preserva o valor e encerra apenas o calendário, devolvendo foco ao botão. Digitação manual continua disponível e Zod permanece obrigatório no servidor.
- Sucesso somente no ToastProvider: uma mensagem por vez no superior direito, dispensável, 3s com pausa por foco/ponteiro. Verde para success, amarelo warning, vermelho critical; gravidade explícita, não inferida do texto. Critical anuncia assertivamente; os demais educadamente.
- Entrada/saída de toast usa --duration-fast (120ms), respeitando reduced-motion. Conteúdo de rota aparece diretamente após skeleton/mínimo, sem animação, conforme carregamento-e-estados.md. Não substituir erros por toast.
- Modais padronizados com título, Escape, foco/restauração e rolagem interna. O diálogo usa flex em coluna com cabeçalho/rodapé sem encolhimento e corpo flex:0 1 auto, min-height:0 e overflow-y:auto, limitado ao viewport dinâmico; o corpo rola até o último campo sem cortar as ações no mobile. Clique no fundo só fecha quando o gesto primário começa e termina fora do painel, sem texto selecionado; seleção/cópia, arraste de dentro para fora e cancelamento do ponteiro não solicitam descarte. Texto e referência podem ser selecionados/copiados; Copiar erro copia mensagem/referência e mantém geometria entre estados.
- Controles semânticos, foco visível, mensagens associadas e sem overflow horizontal em telas pequenas. Não afirmar teste em Android físico ou todos os fluxos só por ter compilado.

- Orientação: Breadcrumbs compartilhado mantém o caminho e acrescenta Voltar à direita nos detalhes de caixas/eventos e nas páginas de pedidos/insumos. Voltar navega ao último ancestral com link: lista de caixas/eventos ou detalhe do evento, conforme a página; não depende do histórico do navegador. Páginas principais não mostram esse controle. Durante o carregamento, ele fica desabilitado na mesma posição. Ancestrais são links, último item identifica a página atual; nomes longos quebram. Cabeçalho explicita Detalhes do evento/caixa ou Pedidos + Evento: nome. Adicionar/editar pedidos continua em modal, preservando busca/página após sucesso e confirmação de descarte.

- Formulários de criação/edição aproveitam largura maior no notebook/PC e agrupam campos relacionados em duas colunas a partir de 1024px. Abaixo disso, seguem em uma coluna na mesma ordem de leitura. Modal tem altura natural e rolagem interna quando necessária; erros, máscaras, bloqueio de envio e confirmação de descarte permanecem no padrão compartilhado.

## Composição visual

### CSS e medidas

- globals.css: tokens comentados, reset/base acessível, scrollbar, reduced-motion e utilitários realmente compartilhados.
- Componentes: <componente>.module.css junto ao TSX; telas: page.module.css somente para estrutura privada aprovada. Não criar arquivos vazios nem importar todos os módulos no global.
- Tokens em margens/paddings/gaps; escala 4/8/12/16/24/32/48px. Não usar medidas avulsas, inline styles ou sobrescrever a aparência interna de Button/Field/Modal pelo pai.
- Conteúdo centralizado até 768px. Título, ações, busca e lista pertencem a esse bloco. Busca voltou à largura anterior: --search-width referencia --content-width, sem limite de 672px.
- Controles: 44px; large: 52px; ícones: 20px. Raios: 8px controles, 12px painéis; busca usa --radius-pill. Modal padrão: até 480px; a partir de 1024px de tela, até 528px pelo mesmo token global --modal-width. Login: até 384px.
- Formulários de criação/edição de caixas, doações, pedidos e movimentações usam Modal size="form": largura até 896px (--modal-width-form) a partir de 1024px, altura natural conforme conteúdo e rolagem interna limitada ao viewport; rodapé permanece na base do modal. Eventos, insumos e pedidos com entregas usam size="formCompact", até 704px (--modal-width-form-compact), conforme seção própria. Em telas menores, manter largura padrão. size="wide" permanece uma capacidade de altura fixa para contextos explicitamente aprovados, não o padrão de formulários.
- Cabeçalho 72px, lateral 240px, drawer até 288px. A partir de 768px, botão lateral centralizado na borda recolhe/reabre o menu: Button primary iconOnly de 44px, terracota e seta branca, usando --z-header. Fechado, permanece na borda esquerda; abaixo de 768px, permanece somente o controle do cabeçalho/drawer. O documento rola; modais longos têm rolagem interna. Scrollbar global e visível.
- Camadas globais base/header/popover/modal; popovers/dialogs usam também a top layer. Não corrigir problemas com z-index arbitrário. Sombra somente em overlays.
- Dentro do Modal, corpo rolável usa --z-modal-content e cabeçalho/rodapé usam --z-modal-chrome, definidos em globals.css e relativos ao contexto do diálogo. Cabeçalho/rodapé têm fundo --color-surface; rodapé reserva --space-4 acima das ações para não encostar nos controles recortados pela rolagem. Não criar z-index local numérico ou sobrescrita por formulário.

- Scrollbar horizontal usa altura global --space-1, mantendo trilho/cores compartilhados; sem barras próprias por tela.
- Modal compartilhado abre com foco programático no título, sem contorno no título nem destaque automático no X. O X mantém alvo de 44px e foco visível ao navegar por teclado; confirmações preservam o foco explícito em Cancelar.
- Modal compartilhado distingue clique intencional no fundo de seleção/arraste: início e fim fora do painel, sem seleção de texto. Mover o mouse ou copiar não fecha nem solicita descarte.

### Donos canônicos

| Capacidade    | Dono                                                                                     | Contrato visual                                                                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Botões        | components/ui/button.tsx + button.module.css                                             | primary/neutral/ghost/danger; standard/large; iconOnly; mobileIcon/iconBreakpoint; compactOnMobile; shape search. Links de ação usam buttonClassName.                |
| Campos        | field.tsx, textarea-field.tsx + field.module.css                                         | Label, valor, erro e foco; DateField e MoneyField reutilizam essa base.                                                                                              |
| Seletores     | select-field.tsx + select-field.module.css                                               | Lista suspensa própria, não select/option HTML.                                                                                                                      |
| Modais        | components/modals/modal.tsx + modal.module.css                                           | Uma base para título, fechar, corpo e rodapé; cada finalidade tem componente próprio.                                                                                |
| Busca         | search-form.tsx + search-form.module.css                                                 | Campo arredondado e lupa integrada em terracota; limpar busca no campo.                                                                                              |
| Filtros       | filter-form.tsx, DonationFiltersModal e OrderFilters                                     | Histórico automático com reverter; filtros de doações/pedidos com aplicação explícita.                                                                               |
| Listas        | record-list/record-row/record-title globais                                              | Listas de caixas/doações/eventos/pedidos/movimentações com separadores; insumos segue composição própria abaixo. record-row-centered alinha nome do caixa com saldo. |
| Menu de ações | components/ui/record-actions-menu.tsx + module                                           | Três pontos com Detalhes opcional, Editar/Excluir, teclado/foco e top layer compartilhados.                                                                          |
| Paginação     | pagination.tsx + pagination.module.css                                                   | Anterior/Próxima, página e contagem; quebra no celular.                                                                                                              |
| Saldo         | CashBoxBalance e balance-value                                                           | Real e pendente, inclusive zero, em caixas/eventos; variante prominent nos detalhes.                                                                                 |
| Notificações  | ToastProvider                                                                            | Um toast por vez, superior direito e compacto, sem sombra.                                                                                                           |
| Skeleton      | components/ui/skeleton.tsx + skeleton.module.css; RouteLoading/loading.tsx; HomeOverview | Estrutura final visível, apenas dados pendentes substituídos; mínimo central de 300ms em PageTransition.                                                             |
| Vazio         | SectionFeedback + SectionIllustration; public/illustrations/empty-states/*.svg           | Cena SVG autoral do setor e frase curta, centralizadas; nunca reutilizar como indicador de espera.                                                                   |
| Layout        | AppShell, Navigation, Brand, PageHeader                                                  | CSS privado de cada dono; AppShell persistente. Brand usa Ministério Contábil; identificadores técnicos e URL permanecem preservados.                                |

### Seletores

- SelectField é único no app. Opções value/label/disabled, valor controlado ou defaultValue e onValueChange. Preservar erro, foco, disabled e FormData.
- Campo neutral e opções ghost usam Button; seleção tem check e destaque semântico. A lista segue largura do campo, com rolagem interna e --select-list-height (18rem).
- Lista abaixo do campo, com Popover API e âncora CSS implícita. Pode inverter se faltar espaço. Top layer evita recorte pelo modal; sem coordenadas inline.
- Fallback sem âncoras/popover: mesma lista abaixo do campo no fluxo, dentro da rolagem do modal. Não voltar ao seletor do sistema nem abrir outro modal para escolher.
- Setas, Home/End, Enter/Espaço, digitação e Escape seguem o contrato de acessibilidade. Não criar variante por tela ou nova biblioteca sem aprovação.
- Referência: [Popover e âncora implícita](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using).

### Feedback e movimento

- Sucesso usa ToastProvider, nunca texto avulso no cabeçalho/URL. Canto superior direito, largura pelo conteúdo até 384px, fonte pequena, sem sombra, borda lateral semântica.
- success verde (--color-success), warning amarelo (--color-warning), critical vermelho (--color-danger). Uma mensagem por vez; 3s, pausa por foco/ponteiro e fechamento manual.
- Entrada/saída com opacidade e deslocamento de 8px em --duration-fast (120ms). Fechamento manual também anima. Respeitar reduced-motion.
- Validação de campos não abre modal: usar error de Field/MoneyField/DateField/SelectField/TextareaField. FieldError compartilha a mesma aparência para erro específico de grupo (por exemplo, lista sem produtos), logo abaixo do controle/grupo e com vínculo acessível. Não mostrar resumos genéricos acima de listas ou duplicar erros de linhas no grupo. Erros atualizam ao editar após a tentativa de envio. Demais falhas continuam no ErrorModal.
- Produtos do evento são opcionais, com título Produtos (opcional). Linhas adicionadas exigem nome e preço válido (inclusive zero); mostrar somente Informe o nome do produto no nome e Informe um preço válido no preço. Ícone inválido usa erro próprio no seletor. Não repetir orientação genérica de produtos nos campos; erro de grupo fica restrito à estrutura/duplicidade da lista, sem mencionar limite numérico.
- Erros gerais continuam em ErrorModal; referência selecionável e CopyButton para copiar mensagem/referência. PageFailure/fallback têm os seus contextos, sem padrões visuais paralelos.
- Menu/drawer tem movimento curto; no desktop recolhe sem overlay. X do drawer usa compensação de margem no dono Modal para alinhamento óptico, preservando o toque de 44px.

### Formulários responsivos

- Padrão compartilhado: form-grid em globals.css, duas colunas iguais a partir de 1024px e uma coluna abaixo disso, com --space-6, alinhamento pelo topo e min-width:0. Não inventar colunas por tela nem alterar aparência interna dos campos. Exceções já aprovadas de produtos e insumos usam geometria privada nos CSS Modules donos, descrita nas seções específicas.
- Agrupar campos pelo espaço e função, sem preencher colunas mecanicamente: nome principal e textos longos têm linha própria; caixa e data podem compartilhar linha. Preservar ordem de leitura/teclado. form-full ocupa a linha inteira para conteúdo longo quando necessário. Listas de produtos e observações continuam com espaço adequado, sem forçar todos os campos em duas colunas.
- Aplicação atual: doações agrupam caixa/valor e data/doador, observação em linha inteira; eventos deixam nome, caixa e descrição em linhas inteiras, com data/entregas lado a lado; produtos usam linha compacta com ícone, nome, preço e X; pedidos agrupam valor/pagamento e forma/parcela em dinheiro; movimentações agrupam Caixa/Data e Tipo/Valor, com justificativa em linha própria. Caixa mantém nome/descrição em linhas próprias, pois é um formulário curto.
- Reutilizar Modal size="form" (formCompact para eventos, insumos e pedidos em etapas) e os campos compartilhados. Login, confirmações, calendário e seletores não ganham largura de formulário automaticamente. Preservar erros abaixo dos campos, máscaras, estado de envio e recuperação de foco na ordem visual.

### Linguagem das confirmações de exclusão

Usar a pergunta curta Excluir [tipo]? como título e somente O histórico será preservado. no corpo, pelo texto compartilhado do ConfirmationModal. Sem repetir pergunta, nomes, valores ou explicações adicionais. Manter composição, Cancelar/Excluir com texto e foco existentes; confirmações de descarte não mudam.

Tema/tokens/base e padrões reutilizados em app/globals.css; CSS Modules ao lado de cada dono. SelectField usa lista própria com options serializáveis, valor e onValueChange; hidden input mantém FormData e o evento input do filtro automático. Contratos completos em [DESIGN.md](DESIGN.md) e [UX.md](UX.md).
