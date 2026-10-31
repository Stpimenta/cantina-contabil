# Publicações

Registro histórico: descrições, pendências, testes e percentuais de tráfego abaixo correspondem à data de cada entrega; não são regras atuais nem evidência de teste funcional recente. Contratos atuais ficam em ARCHITECTURE.md, DESIGN.md e UX-CONTRACT.md. Produção e alterações locais ainda não publicadas ficam em STATUS.md; migrações por ambiente em LOCAL.md. Não registrar trabalho local como release publicado.

## v0.6.3 — 28/10/2026

**Insumos discretos junto de Dinheiro e Pix no evento**

- Insumos deixa o grupo de métricas e acompanha Dinheiro/Pix com a mesma tipografia discreta: linha flexível no desktop e pares rótulo/valor no celular. Cálculo preservado.
- Build isolado Cloudflare/TypeScript, inspeção do pacote e dry-run aprovados. Sem migração ou teste funcional/navegador pelo agente.

Projeto/lockfile **0.6.3**. Tag **v0.6.3**, versão `59ffc4c2-247e-4ee4-99d9-bd52a99c08fc`, deployment `27a09605-57e2-4c7f-98b1-dc3d1d0c8609`, descrição e **100% do tráfego** confirmados por metadados.

## v0.6.2 — 28/10/2026

**Detalhes pelo card e total de compras de insumos no evento**

- Card de insumo abre o modal existente por clique/toque ou teclado, com link do caixa e ações independentes.
- Situação financeira mostra Insumos: compras ativas do evento pagas por qualquer caixa. Doações/excluídos não entram; ausência de compras mostra zero. Real/Pendente preservados, sem cálculo de lucro.
- Build isolado completo, TypeScript, inspeção do pacote e dry-run aprovados. Sem migração, alteração de recursos ou teste funcional/navegador pelo agente. Pendência de configuração de domínios permanece em STATUS.md.

Projeto/lockfile **0.6.2**. Tag **v0.6.2**, versão Cloudflare `ca2048ae-41ae-4bb0-bb53-610c0529604d`, deployment `9af21f5f-5ae2-487a-93e2-b53a1d4fb705`. Tag/descrição, bindings e **100% do tráfego** confirmados por metadados.

## v0.6.1 — 28/10/2026

**Logo MC e animação da marca no login**

- Monograma MC aprovado no Brand compartilhado de login/cabeçalho e nos ícones de aba/Apple; PNGs transparentes leves em public/brand, original escolhido em logos/. Propostas descartadas e README de logos removidos a pedido.
- Login com símbolo de 64px no PC e 52px no celular; texto de 24px/18px, revelação de 1s sem deslocar o formulário e respeitando movimento reduzido. Header compacto preservado.
- Build completo isolado, TypeScript, inspeção de pacote e dry-run aprovados antes do envio, sem .env/valores privados locais detectados. Bindings DB/RECEIPTS e Secret SESSION_SECRET preservados. Sem migração ou teste funcional/navegador pelo agente.
- O Wrangler reativou workers.dev/prévias por ausência das opções no arquivo. Consulta anterior ao término confirmou ambos desativados. A tentativa de restaurar essa configuração foi rejeitada pela revisão automática por falta de confirmação explícita do alcance; nenhuma restauração foi executada. Confirmação solicitada ao responsável, ainda pendente. Não confundir deploy concluído com configuração de domínios resolvida.

Projeto/lockfile **0.6.1**. Tag **v0.6.1**, descrição acima, versão Cloudflare `a9d5e6fd-a2e9-4628-8430-f7e95cf645a6`, deployment `3d5cb6c0-4d83-421e-a68f-d657cf79ad5d`. Tag/descrição, bindings e **100% do tráfego** confirmados por metadados.

## v0.6.0 — 28/10/2026

**Home financeira e refinamentos de interface e backend**

- Home com resumo Real/Pendente de todos os caixas ativos, acesso a Doações/Movimentações, gráfico de saldo real por caixa e próximos eventos. Painéis discretos e composição responsiva aprovados pelo responsável; sem novas fórmulas financeiras.
- Cabeçalhos/menu com identificação discreta, subtítulos explicativos ocultos abaixo de 600px e detalhes do evento reorganizados no celular. Insumos com ações à direita e doações com resumo caixa/valor/data/doador; detalhes da doação pelo nome. Observação/autoria/horários preservados nos detalhes/histórico. Filtro do histórico e fechamento da exclusão bloqueada de caixa corrigidos.
- Login/logout preservam sinais de navegação do Next, evitando modal indevido. Rede local no desenvolvimento com localhost preservado; configuração retorna novo objeto para evitar mutação de configuração congelada.
- Backend: contratos GestPV/sessão em Zod; removidas capturas genéricas em HTTP/JSON/R2 e consultas D1. Nove catches específicos permanecem para constraints conhecidas e token/cookie malformados; inesperados sobem ao executor central. Logger omite possíveis trechos de payload em SyntaxError. Assinatura do JWT externo permanece pendente.
- Deploy isolado: script compila em pasta temporária privada sem .env/credenciais/estado local, com ambiente limitado; verifica next-env vazio e ausência de arquivos privados/valores sensíveis conhecidos nos artefatos e bundle final Wrangler antes do envio. Build completo/TypeScript e dry-run aprovados, sem alterar o ambiente local aberto; dependências e .env originais preservados. Secret SESSION_SECRET já existente confirmado por nome antes/depois, sem acessar valor.
- Nenhuma nova migração ou alteração de dados. D1 remoto consultado em leitura: nenhuma migração pendente, mantendo 0022. Bindings DB/RECEIPTS e configuração de produção preservados. Não houve teste funcional/navegador pelo agente.
- README reorganizado com origem no GestPV, finalidade, funcionalidades disponíveis, visão futura, Cloudflare/Miniflare, inicialização e acesso. AGENTS/contratos consolidados para erros, composição de dependências e padrões visuais finais; propostas rejeitadas não viram padrões.

Projeto/lockfile **0.6.0**. Publicação via npm run deploy, tag **v0.6.0**, descrição acima. Endereço: https://cantina-contabil.devibpv3.workers.dev

Versão Cloudflare: `3a4be970-94d5-4dd9-a220-59e3bd737e26`. Tag/descrição e **100% do tráfego** confirmados por metadados. Deployment: `51a72a5e-5b10-4b8b-bcd6-dd5a305518f5`.

## v0.5.1 — 28/10/2026

**Doações editáveis, comprovantes de movimentações e ajustes responsivos**

- Doações com Editar/Excluir no menu compartilhado, formulário reutilizado, versão otimista, confirmação de exclusão lógica e recálculo sem saldo negativo. Histórico preserva criação, antes/depois, autoria e caixa anterior. Sem estorno bancário ou anexos de doação.
- Comprovantes opcionais em Movimentações: até 5 imagens/PDF de 5 MB cada, upload compartilhado, lista de anexos existentes/novos e remoção ao salvar. Consulta autenticada pelo mesmo R2 privado, imagem em modal e PDF para download; arquivos históricos preservados, sem nova infraestrutura.
- Nomes estáticos em Doações. Ações diretas Editar/Excluir usam ícones abaixo de 1024px e texto a partir disso; opções dos menus e confirmações mantêm texto.
- Migrações 0021/0022 aplicadas ao D1 remoto com autorização; nenhuma pendente. Ponto D1 Time Travel anterior: `00000031-00000000-00005112-e8571e9def2c99e11980b4aef3b2aadb`. quick_check aprovado e foreign_key_check sem ocorrências. Total de doações preservado em 262339 centavos, 2 snapshots iniciais e backfill sem inconsistências.
- Contagens de caixas (4), doações (2), eventos (1), pedidos (16) e insumos (4) iguais entre as consultas. Movimentações passaram de 1 para 2 entre as leituras; não se afirma igualdade dessa contagem nem a causa da diferença. As migrações não cadastram movimentações financeiras. Sem exportação local de registros ou dados fictícios.
- Projeto/lockfile 0.5.1. Publicação por npm run deploy com tag v0.5.1 e descrição acima. Build completo Cloudflare, incluindo TypeScript, aprovado; bindings e segredos preservados. Sem teste funcional, navegador ou servidor iniciado pelo agente.

Endereço: https://cantina-contabil.devibpv3.workers.dev

Versão Cloudflare: `b7fee836-af19-4c37-8df6-c7d7017f7741`. Tag/descrição e **100% do tráfego** confirmados por metadados. Deployment: `4eb22f07-f204-4d0d-8766-54b825044126`.

## v0.5.0 — 28/10/2026

**Ministério Contábil com movimentações e ajustes no celular**

- Nome público Ministério Contábil no cabeçalho, login, boas-vindas e títulos do navegador; endereço, cookies e identificadores técnicos preservados.
- Menu Movimentações com registro, consulta, edição e exclusão lógica de entradas/saídas: caixa, valor positivo, data e justificativa obrigatória. Efeito imediato no real, bloqueio de saldo negativo inclusive ao editar/excluir entradas utilizadas, versão otimista e histórico/autoria preservados. Guardas atômicas no banco e cálculos de caixa/insumos integrados.
- Lista com separadores e três pontos compartilhados para Detalhes/Editar/Excluir; formulário responsivo reutiliza componentes aprovados. Histórico do caixa mostra antes/depois, incluindo registros excluídos e caixa anterior quando corrigido.
- Pedidos/Insumos/Histórico no detalhe do evento ficam em três colunas iguais abaixo de 600px, com espaçamento menor e Button compactOnMobile compartilhado, texto mantido e alvo mínimo de 44px.
- Migração 0020 aplicada ao D1 remoto com autorização antes do deploy; nenhuma pendente. Ponto anterior D1 Time Travel: 0000002d-00000000-00005112-b3c78418a12a89d5c7c1a608f5afc1e3. quick_check ok, referências sem ocorrências e contagens/totais agregados conferidos preservados; novas tabelas vazias após migração. Sem dados fictícios, exportação de registros ou envio do estado local.
- Publicação via npm run deploy, tag v0.5.0, descrição em português e projeto/lockfile 0.5.0. Build completo Cloudflare/TypeScript aprovado. D1/RECEIPTS e configuração de segredos preservados. Sem teste funcional, navegador ou servidor iniciado pelo agente.

Endereço: https://cantina-contabil.devibpv3.workers.dev

Versão Cloudflare: `bfc38309-1998-4ac8-a3f9-d830bf66e62f`. Tag/descrição e tráfego de 100% confirmados por metadados.

## v0.4.2 — 28/10/2026

**Comprovantes múltiplos, doadores e melhorias nas buscas e pedidos**

- Insumos com até 5 comprovantes JPEG/PNG/WebP/PDF de 5 MB cada; anexos existentes e novos na edição, remoção individual pelo X e consulta privada por anexo. Upload sequencial e envelope de 26 MB, sem chunks; sem teste de carga.
- Nome opcional de quem doou (até 100 caracteres) no formulário, card, detalhes e novos snapshots de insumos doados.
- Pix como primeira opção e forma inicial dos novos pedidos; edição preserva forma existente. Pedidos com filtro Todos/Pendentes/Pagos, ordem de nome A–Z antes da paginação e observação truncada responsivamente.
- Busca automática compartilhada após 350 ms de pausa em Caixas/Doações/Eventos/Pedidos; mantém filtros e digitação durante carregamento. Correções do foco e da borda sob o botão X.
- Resumo do evento apresenta Dinheiro/Pix dos pedidos pagos ativos discretamente. Gastos/lucro e Movimentações não fazem parte desta entrega; decisões continuam pendentes em STATUS.md.
- Migrações 0018/0019 aplicadas ao D1 remoto com autorização; nenhuma pendente. Ponto anterior D1 Time Travel: 00000028-00000000-00005112-55c7cef9e1476e512a0299f3fcbf2f9b. quick_check ok, referências sem ocorrências; contagens/totais agregados de caixas, doações, eventos, pedidos, insumos e auditoria de insumos preservados; conversão dos comprovantes sem inconsistências. Sem exportar registros de produção.
- Publicação via npm run deploy, tag v0.4.2 e descrição em português; versão do projeto/lockfile 0.4.2. Build Cloudflare completo/TypeScript aprovado. Bindings D1/R2 e configuração de segredos preservados. Sem teste funcional, navegador ou servidor iniciado pelo agente.

Endereço: https://cantina-contabil.devibpv3.workers.dev

Versão Cloudflare: `d55be52a-daa1-4fe5-ab4e-1c7e3aeb6049`. Tag/descrição e tráfego de 100% confirmados por consulta de metadados.

## v0.4.1 — 27/10/2026

**Descrição nos insumos e ajustes de navegação e resumos**

- Descrição opcional de até 500 caracteres em insumos: cadastro/edição, detalhes e snapshots do histórico; permite agrupar os itens de uma nota em uma compra com valor total/comprovante único.
- Migração 0017 aplicada ao D1 remoto antes da publicação; nenhuma pendente. Ponto anterior D1 Time Travel: 00000019-00000000-00005112-76508cafaf066140f614d228124a96bb. quick_check ok e foreign_key_check sem ocorrências; contagens e totais agregados conferidos permaneceram iguais. Nenhum dado fictício criado ou exportação local de produção executada.
- Transição de páginas mantém conteúdo visível desde o primeiro frame e somente movimento sutil; não há espera artificial. Descrições da lista de Caixas têm uma linha no celular e até duas nas demais telas, com reticências e texto completo nos detalhes.
- Publicação autorizada por npm run deploy, tag/descrição em português e versão 0.4.1 no projeto/lockfile. Build Cloudflare completo, incluindo TypeScript, aprovado. D1/R2 privados e segredo de sessão preservados. Sem testes funcionais/navegador pelo agente.

Endereço: https://cantina-contabil.devibpv3.workers.dev

Versão Cloudflare: `78d85c90-acb3-4042-9b26-48e05638acc8`. Tag/descrição confirmadas e publicação ativa com 100% do tráfego.

## v0.4.0 — 27/10/2026

**Eventos, pedidos e insumos com comprovantes privados**

- Publicação autorizada pelo responsável, executada por npm run deploy com tag e descrição em português; versão do projeto/lockfile atualizada para 0.4.0.
- Eventos/produtos, pedidos com pagamento dinheiro/Pix/misto e valor ajustável, saldos real/pendente, unidades vendidas, histórico e exclusão lógica.
- Insumos com compra de qualquer caixa ou doação, detalhes/edição/exclusão lógica e recálculo de saldos; arquivos JPEG/PNG/WebP/PDF privados e imagem em modal.
- Arquitetura por funcionalidade, Drizzle e Zod, erros centralizados, validação inline, máscaras monetárias, calendário e ajustes responsivos/minimalistas. Sessão de até 2 horas e redirecionamento ao login ao expirar.
- Bucket cantina-contabil-receipts criado pelo responsável; binding RECEIPTS configurado em wrangler.jsonc e confirmado na publicação. Acesso r2.dev desativado. Ambiente local continua emulado e separado; dados/comprovantes locais não foram enviados à produção.
- Migrações 0004–0016 aplicadas ao D1 remoto antes da publicação; nenhuma migração pendente. Ponto D1 Time Travel anterior: 00000011-00000000-00005112-17bd168d3c0f15521a793620b252f4c4. Integridade e referências aprovadas; contagens anteriores de caixas/auditorias e total de doações mantidos. Nenhum registro fictício criado.
- Exportação completa do D1 para arquivo local recusada pela revisão automática; não executada. Proteção usa o ponto de recuperação mantido na Cloudflare, sem baixar registros de produção.
- Build completo para Cloudflare, incluindo TypeScript, aprovado durante o deploy. Sem testes funcionais ou navegador pelo agente. Assinatura do JWT externo e reconciliação de objetos órfãos continuam pendentes conforme ARCHITECTURE.md.

Endereço: https://cantina-contabil.devibpv3.workers.dev

Versão Cloudflare: `f43d089e-573c-4a51-92e9-d5d787e0d98f`. Tag/descrição confirmadas por consulta à versão e publicação ativa com 100% do tráfego.

## v0.3.1 — 26/10/2026

**Padronizar datas em dia, mês e ano**

- Datas visíveis em dd/mm/aaaa, com ano de quatro dígitos; auditoria mantém horário.
- Campo compartilhado com máscara de data em Doações, sem variação de ordem por idioma do dispositivo.
- Formatação de nascimento centralizada; armazenamento de datas preservado.

Versão Cloudflare: `ad4b0bb2-4e80-489f-88d1-08b4522a90d8`.

## v0.3.0 — 26/10/2026

**Doações por caixa, saldo calculado e histórico filtrado**

- Cadastro de doações recebidas, com caixa, valor, data, doador e observação.
- Menu Doações com filtros por caixa e ano e paginação.
- Saldo calculado das entradas no D1; proteção contra repetição da operação e exclusão de caixa com doações.
- Histórico com Eventos, Entradas e Saídas; botão centralizado abaixo de Criado por e um pouco maior.
- Anexos adiados pelo responsável; sem R2 nesta entrega. Sem edição/exclusão de doações ou lançamentos de saída.

Versão Cloudflare: `6956c460-bc53-4c7a-8008-767f639259e0`.

## v0.2.7 — 25/10/2026

**Exibir saldo na lista e nos detalhes dos caixas**

- Saldo visível junto de cada caixa na listagem e em destaque antes da descrição nos detalhes.
- R$ 0,00 exibido nesta fase sem movimentações; componente e formatação compartilhados.
- Nenhuma tabela financeira, edição manual de saldo ou alteração dos registros existentes.

Versão Cloudflare: `b534f0a4-93c7-4ee9-aff4-187140e345c6`.

## v0.2.6 — 25/10/2026

**Centralizar conteúdo e alinhar busca e ações**

- Bloco compartilhado centralizado de até 768px para título, ações, busca, lista e paginação.
- Busca acompanha a largura do conjunto; Novo caixa alinhado ao limite do mesmo bloco.
- Ajuste nos tokens globais, sem exceções por página.

Versão Cloudflare: `a306ba6d-cc03-4a09-a47f-1abd619bc7c7`.

## v0.2.5 — 25/10/2026

**Exibir orientação da busca dentro do campo**

- Orientação da busca como placeholder, sem rótulo externo visível.
- Label associado preservado para leitores de tela no componente compartilhado.

Versão Cloudflare: `31e8f2f3-ce9b-430c-94c7-5eac2dd2b62d`.

## v0.2.4 — 25/10/2026

**Limitar largura da busca no computador**

- SearchForm com largura máxima global de 576px, alinhado à esquerda e adaptável ao celular.
- Sem estilos exclusivos de página; padrão registrado em DESIGN.md.

Versão Cloudflare: `f4592ec4-e89a-4945-9f48-f5e82772a738`.

## v0.2.3 — 25/10/2026

**Notificações centralizadas e histórico em modal**

- Toast compartilhado para criar, editar e excluir, sem confirmações soltas no cabeçalho nem status na URL.
- Histórico paginado no modal padrão, mantendo autor, datas e detalhes das alterações.
- Criado por mostra somente o nome; removidas Última alteração e datas da lista. Dados de auditoria preservados.
- Saldo real/previsto e lançamentos financeiros dependem da confirmação do responsável; não foram inventados valores.

Versão Cloudflare: `fc5eb302-6efd-4f59-9bd3-ed41089945b1`.

## v0.2.2 — 25/10/2026

**Simplificar aviso de lista vazia em Caixas**

- Lista vazia e busca sem resultados exibem somente “0 resultados”, sem explicações redundantes.
- Padrão de minimalismo registrado na documentação.

Versão Cloudflare: `bad4bc9c-9f36-41d0-abae-70e38b41090c`.

## v0.2.1 — 25/10/2026

**Menu animado e lateral recolhível no computador**

- Botão de menu disponível no computador e no celular.
- Lateral recolhível com expansão do conteúdo; drawer móvel com animação de abertura e fechamento.
- Movimento reduzido respeitado; navegação oculta sem acesso por teclado.
- Verificação limitada à compilação e publicação, conforme preferência do responsável.

Versão Cloudflare: `b563f1d0-dd8b-4e6f-a5bd-afb22798043e`.

## v0.2.0 — 25/10/2026

**Cadastro de caixas com histórico e exclusão lógica**

- Menu Caixas, lista com busca e paginação, criação, consulta e edição.
- D1 com schemas e migrações separados para caixas e auditoria; SQL parametrizado nos repositories.
- Autoria e datas, histórico de alterações, nomes ativos únicos e proteção contra edições concorrentes.
- Exclusão lógica com confirmação e preservação do registro e do histórico.
- Componentes e estilos compartilhados, com verificação em celular e 30 testes aprovados.
- Página publicada conferida em leitura com sessão autenticada e acesso ao D1. Nenhum dado fictício foi cadastrado na produção.

Versão Cloudflare: `396340fa-8c16-4333-a077-2df504e83345`.

Doações, eventos, saídas e transferências permanecem para a próxima etapa.

## v0.1.3 — 25/10/2026

**Exibir nascimento e telefone em Meus dados**

- GET do próprio perfil agora conserva nascimento e telefone com código do país, conforme aprovação.
- Modal existente apresenta nascimento em dd/mm/aaaa e Não informado para campos ausentes.
- Sessão preserva os novos campos; sessões antigas requerem sair e entrar novamente para buscá-los.
- 22 testes, compilação e verificação móvel com dados fictícios concluídos.

Versão Cloudflare: `f7d7ac40-4e6a-4225-97e4-f360fad12fd2`.

## v0.1.2 — 25/10/2026

**Corrigir compatibilidade do login e perfil com Workers**

- Corrigida a falha de conexão causada por `redirect: "error"`, opção não implementada pelo runtime Workers.
- Login e consulta do perfil usam `redirect: "manual"`; respostas 3xx continuam rejeitadas sem reenviar senha ou Bearer para outro destino.
- 20 testes, formatação e compilação para Cloudflare aprovados. Login real ainda depende de conferência do responsável com sua própria conta.

Versão Cloudflare: `7c5b3ce6-b487-49f5-8e2c-ed5639149563`.

## v0.1.1 — 25/10/2026

**Permitir copiar mensagens e referências dos modais de erro**

- Corpo dos modais permite seleção de texto e menu de cópia em telas de toque.
- Referência de erro usa seleção integral.
- Botão compartilhado Copiar erro copia a mensagem e a referência, com confirmação e tamanho estável entre estados.
- Compilação, TypeScript, formatação e auditoria estática de UI aprovados. No endereço publicado, a validação de campos vazios abriu o modal e o botão confirmou Copiado; nenhuma chamada de login à API externa foi feita nesse teste.

Versão Cloudflare: `92fbe31a-24b1-4e46-9dab-d65ebc1be397`.

## v0.1.0 — 25/10/2026

**Login, sessão e dashboard inicial**

- Login integrado à API existente e consulta do próprio perfil com Bearer.
- Acesso restrito a root, admin e tesouraria; sessão assinada e logout.
- Dashboard Home, header com opções do usuário e navegação lateral/hambúrguer.
- Componentes, modais, tokens globais e tratamento de erros compartilhados.
- Interface responsiva, sem elementos decorativos ou indicadores fictícios.

Endereço: https://cantina-contabil.devibpv3.workers.dev

Versão Cloudflare: `300f3f9f-e591-49e6-aa2b-18c35b2f95ab`.

Tag e mensagem confirmadas por consulta à versão publicada. Nenhum D1 ou R2 foi provisionado.
