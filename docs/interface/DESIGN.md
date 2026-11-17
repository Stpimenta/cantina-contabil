---
version: alpha
name: Ministério Contábil
description: Painel discreto para gestão de caixas e eventos, com terracota e fundos claros.
colors:
  primary: "#A9432E"
  secondary: "#C58B65"
  background: "#FAF7F2"
  surface: "#FFFFFF"
  text: "#35312D"
  border: "#E7DDD3"
typography:
  sans:
    fontFamily: "Manrope, system-ui, sans-serif"
rounded:
  control: "0.5rem"
  panel: "0.75rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  base: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  section: "3rem"
omitted:
  - section: components
    reason: Tokens e padrões globais ficam em src/app/globals.css; geometria e estados privados ficam no CSS Module do componente.
---

# Identidade visual, layout e responsividade

Contrato atual. Leia somente ao alterar este assunto. [Escolher outra leitura](../README.md).

## Direção

Ministério Contábil: painel discreto para caixas, doações, eventos e movimentações. Menos é mais: sem gradientes, decoração de fundo, cards estatísticos fictícios, excesso de bordas/botões ou informações redundantes. Usar conteúdo real e destacar saldo e ações necessárias.

Tema modernizado com terracota, superfícies claras e fundo quente. Manrope local, pesos 400/500/600. O dono dos valores é src/app/globals.css: cores semânticas, fontes/escala, espaçamento, dimensões, bordas, foco, z-index, movimento e disabled. Não copiar valores para temas paralelos.

## Preferências consolidadas

As correções do responsável estabelecem estes critérios; não são autorização para redesenhar telas fora do pedido.

- **Agrupar sem pesar:** um item deve ser percebido como uma unidade. Nos insumos, card branco com borda discreta, sem sombra; nos produtos do pedido, bloco de fundo suave. Não usar cards estatísticos fora da composição da Home explicitamente aprovada, bordas aninhadas ou aplicar cards a toda lista. Caixas, doações, eventos e histórico mantêm os donos atuais.
- **Pouca informação, bem organizada:** ícone junto do nome; valor destacado e origem/estado em plano secundário. Resumo não é ficha completa. Remover textos redundantes em vez de apenas aumentar gaps; não acrescentar informações técnicas/versões ao resumo cotidiano. Autoria permanece onde já foi aprovada, como na lista de doações e nos históricos.
- **Proporção pelo conteúdo:** nome/descrição têm largura flexível; ícone/X usam o espaço do controle; dinheiro não quebra. Não dividir em metades um campo longo e um botão pequeno. Não deixar item, ícone ou botão solto no centro de uma faixa vazia.
- **Hierarquia antes de espaço:** separar identificação, valores e informações cadastrais por grupos e títulos discretos. Aumentar somente o espaçamento não resolve informações com o mesmo peso ou sem relação clara. Cor forte identifica ação principal/seleção e danger nas exclusões diretas aprovadas; ações em menus continuam discretas.
- **Modal na medida:** altura natural, largura compartilhada adequada ao formulário. Formulários completos usam form; eventos, insumos e pedidos em etapas usam formCompact. Não maximizar modal curto nem manter altura fixa vazia; nome/textos longos em linha própria, campos curtos relacionados lado a lado quando aprovados.
- **Mobile é composição própria:** preservar leitura, não apenas empilhar tudo. Agrupar Valor/Ícone e Preço/Ícone/X nos contextos já aprovados, com 44px de toque. Reticências são visuais e preservam conteúdo completo acessível; valores, tamanho de arquivo e controles permanecem legíveis. Categorias podem rolar na própria faixa, nunca fazer a página inteira transbordar.
- **Desktop também precisa de revisão:** após qualquer ajuste mobile, conferir a largura e distribuição desktop e a faixa intermediária de 600–1023px. Não esticar botões pequenos nem reaproveitar colunas fixadas para uma disposição antiga.

## Revisão estática obrigatória da composição

Antes de encerrar alterações visuais, ler JSX/CSS e conferir os cenários abaixo. Isso não autoriza iniciar servidores, usar navegador, gerar screenshots ou recriar testes.

1. Celular abaixo de 600px; faixa de 600–767px; tablet de 768–1023px; notebook/PC a partir de 1024px. Considerar a largura disponível dentro do modal, não só a tela.
2. Nome curto/longo, um/vários itens, valor grande, compra/doação, pendente/recebido, arquivo longo com tamanho e erros abaixo dos campos, quando aplicáveis.
3. Item agrupado, alinhamento dos controles/rótulos, ausência de colunas vazias, nome com espaço proporcional e ações acessíveis. Não remover funções para resolver espaço sem decisão do responsável.
4. Ordem do DOM, teclado e primeiro erro coerentes com a leitura; ícones com nomes acessíveis; seleção de texto sem fechamento acidental; movimento reduzido respeitado.
5. Mudança feita no dono correto, tokens existentes, documentação atual sem contradições. Se a proposta exigir novo padrão, perguntar antes de implementá-lo; reutilizar o já aprovado não exige nova confirmação.

## Responsividade e ícones

Limites distintos por responsabilidade, sem generalizar um breakpoint para todos os controles:

| Largura            | Responsabilidade                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Abaixo de 600px    | mobileIcon padrão vira ícone; alvos de 44×44px. Ações Pedidos/Insumos/Histórico compactam mantendo texto; resumos truncam em uma linha. |
| A partir de 600px  | mobileIcon padrão mostra conteúdo completo; ações diretas Editar/Excluir ainda usam ícones até 1023px.                                  |
| Abaixo de 768px    | Drawer; busca ocupa a primeira linha e Filtros fica abaixo. PageHeader pode compactar ações.                                            |
| A partir de 768px  | Lateral recolhível e layout desktop, sem alterar os breakpoints dos controles.                                                          |
| A partir de 1024px | Editar/Excluir diretos mostram texto; form-grid usa duas colunas e modais form/formCompact ampliam para a largura aprovada.             |

- Padrão para ações com ícone inequívoco: compactar só a apresentação, nunca retirar a funcionalidade ou inventar um botão menor. Implementar pelo mobileIcon de Button, sem duplicar componentes ou usar regras por tela.
- Ações diretas Editar/Excluir em caixas, eventos e pedidos usam iconBreakpoint="tablet" do Button: ícones abaixo de 1024px, conteúdo completo a partir de 1024px; editar neutral e excluir danger com lixeira. Novo caixa e outras criações mantêm mobileIcon padrão de 600px. Menus de três pontos não mudam: gatilho iconOnly e opções com ícone/texto em todas as telas; confirmação de exclusão mantém rótulo completo.
- PageHeader compactActionsOnMobile mantém título e ações na mesma linha, com espaço flexível para nomes longos. Não deixar Novo caixa cair abaixo do cabeçalho no celular.
- Filtros de Doações permanece com ícone e texto, inclusive no celular, na linha abaixo da busca. A seta externa de limpeza foi revertida; não recolocá-la.

## Identificação discreta das seções

Cabeçalhos PageHeader separam identificação e conteúdo com linha inferior discreta e espaçamento compartilhado. Caixas, Doações, Eventos e Movimentações usam o mesmo ícone da navegação junto do título; detalhes de caixa/evento preservam essa identificação. Textos curtos contextualizam as listagens a partir de 600px. Abaixo de 600px, subtítulos explicativos de Home/Caixas/Doações/Eventos/Movimentações são ocultos por hideDescriptionOnMobile no PageHeader compartilhado. Contexto de Evento: nome em Pedidos/Insumos e identificação de detalhes permanecem visíveis; não ocultar conteúdo cadastral ou descrições dos registros. Título pode quebrar e ações preservam os controles e breakpoints aprovados. Menu ativo permanece sem preenchimento, com texto/ícone terracota e traço lateral curto de 2px (token --focus-width), além de aria-current. Hover usa somente o fundo quente claro; não combinar bloco preenchido e barra grossa para indicar seleção. Tema único, densidade e listas existentes permanecem; não há cores por seção.

## Marca

Monograma MC (opção 1 escolhida pelo responsável) em terracota, transparente, nos PNGs de public/brand. Brand compartilhado exibe símbolo ao lado de Ministério Contábil no cabeçalho e no login; ícone decorativo com alt vazio evita repetir o nome. Símbolo de 32px nas telas maiores e 24px abaixo de 600px, texto de 18px/14px respectivamente. Nome pode quebrar entre palavras se necessário para preservar botões de 44px e evitar overflow; ordem de leitura permanece Ministério Contábil. Ícone da aba 32px e Apple 180px declarados nos metadados da raiz, sem texto dentro do favicon. No login, Brand variant=login amplia símbolo para 64px/texto 24px (52px/18px abaixo de 600px). Nome é revelado uma vez em 1s com steps/clip-path, por --duration-brand global, mantendo a largura reservada e formulário utilizável desde o início. Movimento reduzido desativa a animação pela regra global; o texto completo permanece no DOM. Header mantém a variante compacta, sem animação.

logos/ conserva apenas o original transparente do MC aprovado; versões otimizadas de uso ficam em public/brand. Não manter propostas rejeitadas, cópias derivadas ou README na pasta logos/.

## Menu do usuário

Meus dados usa o Modal compartilhado com lista de definição contendo somente Nome, E-mail e Perfil de acesso, nessa ordem, e Fechar no rodapé. Sem telefone ou nascimento; composição e responsividade compartilhadas preservadas.

Menu do usuário: popover compacto à direita, separado do cabeçalho por space-2, superfície branca, borda/radius-panel e shadow-overlay compartilhados. Nome completo acima de Meus dados/Sair em coluna, sem iniciais. Não substituir por iniciais, painel integrado ao cabeçalho ou faixa de largura total no celular. Identidade discreta somente no nome em terracota e linha inferior fina separando as ações; posição, largura e disposição originais preservadas. No celular mantém largura limitada ao viewport e afastamento lateral space-4; desktop usa space-6. Controles de 44px e Popover API preservados.

## Acessibilidade e consistência

Interface em pt-BR, foco visível, navegação por teclado, texto selecionável nos modais, contraste/estados sem depender só de cor e sem overflow horizontal em telas pequenas. Não usar alert/confirm/prompt para o produto.

Novas cores, dimensões, padrões ou exceções precisam de aprovação. O pai controla posicionamento; o componente controla sua aparência. Não alterar a identidade visual para introduzir uma funcionalidade.

## Orientação entre telas

Breadcrumbs compartilhado em components/layout mantém o caminho e inclui Voltar com seta para a esquerda, alinhado à direita na mesma faixa, nos detalhes: Home / Eventos / nome e Home / Eventos / nome / Pedidos; caixas seguem Home / Caixas / nome. Links ancestrais e página atual com aria-current, separadores discretos e quebra para nomes longos. Voltar reutiliza buttonClassName ghost, texto em todas as larguras e alvo de 44px; nav flexível com min-width:0 e ação sem encolhimento. Pedidos/Insumos voltam ao evento, detalhes de caixas/eventos às respectivas listas. Fallback reserva o controle desabilitado. Páginas principais não recebem Voltar. Preservar título legível e contexto: detalhes mostram Detalhes do evento/caixa, Pedidos mostra Evento: nome. Identidade continua minimalista, sem cores ou painéis exclusivos por página.
