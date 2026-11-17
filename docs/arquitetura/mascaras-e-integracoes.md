# Máscaras e contratos de integração

Contrato atual. Leia somente ao alterar este assunto. [Escolher outra leitura](../README.md).

## Máscaras de entrada compartilhadas

- shared/masks/input-masks.ts é o dono das funções puras maskMoneyInput, formatMoneyInput, maskBrazilianDate, maskBrazilianPostalCode e maskBrazilianPhone. Não criar máscaras próprias em páginas, formulários ou use cases; novos formatos precisam ampliar os donos compartilhados conforme decisão aprovada.
- Todo campo editável de dinheiro usa components/ui/money-field.tsx, inclusive preço de produto, valor do pedido, parcela em dinheiro e doação. Esse componente reutiliza Field e centraliza digitação/colagem, bloqueio de letras/overflow, máscara por centavos e posicionamento do cursor. Exibição pt-BR com duas casas; o valor emitido/FormData é decimal sem separador de milhar.
- Datas usam components/ui/date-field.tsx e a máscara central dd/mm/aaaa; conversão/validação de calendário permanece em shared/dates/date-only.ts e o valor enviado é ISO.
- Parsing monetário e schemas ficam em shared/validation/money-input.ts e inputs/ da funcionalidade. A máscara não altera limites/regras: doação permanece estritamente positiva, pedidos/produtos permitem zero conforme os contratos. Dados vindos de outras entradas continuam sujeitos à validação no servidor.
- Valores somente para leitura usam formatCurrency/formatDateOnly/formatDateTime; não aplicar máscara de edição em saldos ou histórico.

## Respostas de APIs externas

Validar respostas com schemas Zod/safeParse na infraestrutura da integração; preservar formatos, limites, opcionais e normalizações existentes. Depois conferir identidade e regras semânticas explicitamente. Não usar cascatas de typeof/in ou casts para fingir validação; não enviar/logar ZodError, payloads externos, senhas ou tokens. Schemas de transporte/sessão ficam na infraestrutura de auth; regras puras de claims ficam no dono de identidade. HTTP/timeout/redirecionamento mantêm o contrato do adaptador, sem repetir escrita ou reenviar credenciais para outro host. Ver [validação e erros](validacao-e-erros.md) e o contrato específico da API.

CEP/telefone nacional com DDD usam BrazilianMaskedField e máscaras centrais, preservando cursor, colagem e exclusão. Regras de CEP/DDD continuam no Zod; ViaCEP é consulta separada em server/addresses, não parte da máscara nem persistência própria. [Entregas e endereços](../funcionalidades/entregas-e-enderecos.md).
