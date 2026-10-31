import type { ApplicationError } from "@/shared/errors/application-error";
import type {
  BusinessCode,
  BusinessFailure,
  ValidationIssue,
} from "@/shared/errors/business-failure";

const messages: Record<BusinessCode, string> = {
  DONATION_CHANGED:
    "Esta doação foi alterada ou excluída. Atualize a lista antes de tentar novamente.",
  DONATION_INSUFFICIENT_BALANCE:
    "Esta alteração deixaria um caixa com saldo negativo. Confira o saldo e os valores já utilizados.",
  INVALID_MOVEMENT_INPUT: "Confira os dados da movimentação.",
  MOVEMENT_CHANGED:
    "Esta movimentação foi alterada ou excluída. Atualize a lista antes de tentar novamente.",
  MOVEMENT_INSUFFICIENT_BALANCE:
    "Esta operação deixaria um caixa com saldo negativo. Confira o saldo e as movimentações já registradas.",
  INVALID_SUPPLY_INPUT: "Confira os dados do insumo e o comprovante.",
  SUPPLY_NOT_FOUND: "O insumo não foi encontrado.",
  SUPPLY_CHANGED:
    "Este insumo foi alterado. Atualize a lista antes de tentar novamente.",
  SUPPLY_REQUEST_CONFLICT:
    "Esta operação já foi utilizada. Confira os insumos antes de repetir.",
  SUPPLY_INSUFFICIENT_BALANCE:
    "O caixa escolhido não tem saldo real suficiente para esta compra.",
  EVENT_HAS_SUPPLIES: "Este evento possui insumos e não pode ser excluído.",
  RECEIPT_NOT_FOUND: "O comprovante não foi encontrado.",
  EVENT_HAS_ORDERS: "Este evento possui pedidos e não pode ser excluído.",
  INVALID_EVENT_INPUT: "Confira os dados do evento e dos produtos.",
  INVALID_ORDER_INPUT: "Confira os dados do pedido e o pagamento.",
  EVENT_NOT_FOUND: "O evento ou pedido não foi encontrado.",
  EVENT_CHANGED:
    "Os dados foram alterados por outra pessoa. Atualize a página antes de tentar novamente.",
  INVALID_ORDER_PRODUCT:
    "Um produto não está mais disponível. Atualize o evento e confira os itens.",
  EVENT_REQUEST_CONFLICT:
    "Esta operação já foi utilizada. Confira os registros antes de abrir um novo cadastro.",
  EVENT_BOX_LOCKED: "O caixa de um evento já cadastrado não pode ser trocado.",
  INVALID_CASH_BOX_INPUT: "Confira os dados do caixa.",
  SESSION_EXPIRED: "Sua sessão expirou. Entre novamente.",
  CASH_BOX_NOT_FOUND: "Este caixa não foi encontrado ou já foi excluído.",
  CASH_BOX_CHANGED:
    "Este caixa foi alterado por outra pessoa. Atualize a lista e confira os dados antes de tentar novamente.",
  CASH_BOX_NAME_EXISTS: "Já existe um caixa ativo com esse nome.",
  CASH_BOX_HAS_MOVEMENTS:
    "Este caixa possui registros financeiros ou eventos vinculados e não pode ser excluído.",
  INVALID_DONATION_REQUEST: "Reabra o formulário para cadastrar a doação.",
  DONATION_REQUEST_CONFLICT:
    "Esta operação já foi utilizada. Confira a lista e reabra o formulário para um novo cadastro.",
  CASH_BOX_UNAVAILABLE:
    "O caixa selecionado não está mais disponível. Atualize a lista.",
  AMOUNT_LIMIT: "O valor excede a precisão monetária suportada pelo sistema.",
  INVALID_FILTER: "Selecione um ano válido.",
  INVALID_DONATION_INPUT: "Confira os dados da doação.",
  INVALID_LOGIN_INPUT: "Confira os campos indicados para entrar.",
  LOGIN_SESSION_EXPIRED: "Seu acesso expirou. Entre novamente.",
  INVALID_CREDENTIALS:
    "E-mail ou senha incorretos. Confira os dados e tente novamente.",
  INVALID_AUTH_RESPONSE:
    "Não foi possível confirmar seu acesso. Entre novamente.",
  LOGIN_ACCESS_DENIED:
    "Seu perfil não tem acesso a este aplicativo. O acesso é permitido à tesouraria, administradores e root.",
  ACCESS_DENIED: "Seu perfil não tem permissão para esta operação.",
};
const issueMessages: Record<ValidationIssue, string> = {
  INVALID_MOVEMENT_RECEIPT:
    "Anexe até 5 arquivos JPEG, PNG, WebP ou PDF, de até 5 MB cada.",
  INVALID_MOVEMENT_DIRECTION: "Escolha Entrada ou Saída.",
  INVALID_MOVEMENT_REASON: "Informe a justificativa, com até 500 caracteres.",
  INVALID_SUPPLY_ICON: "Escolha um ícone para o insumo.",
  INVALID_SUPPLY_NAME: "Informe o nome do insumo, com até 100 caracteres.",
  INVALID_SUPPLY_AMOUNT:
    "Informe um valor válido. Compras exigem valor maior que zero.",
  INVALID_SUPPLY_SOURCE: "Escolha compra ou doação.",
  INVALID_SUPPLY_STATUS: "Escolha se o insumo doado está pendente ou recebido.",
  INVALID_RECEIPT:
    "Anexe até 5 arquivos JPEG, PNG, WebP ou PDF, de até 5 MB cada. Compras exigem ao menos um comprovante.",
  INVALID_EVENT_NAME: "Informe um nome com até 100 caracteres.",
  INVALID_EVENT_PRODUCTS:
    "Adicione produtos com nome, ícone e preço válido, sem repetir produtos.",
  INVALID_CUSTOMER_NAME: "Informe o nome da pessoa, com até 100 caracteres.",
  INVALID_ORDER_ITEMS:
    "Escolha ao menos um produto com quantidade inteira maior que zero.",
  INVALID_ORDER_TOTAL:
    "Informe um valor válido, inclusive zero para entrega gratuita.",
  INVALID_ORDER_PAYMENT:
    "Quando pago, dinheiro e Pix devem somar o valor do pedido. Quando pendente, não registre recebimentos.",
  INVALID_EMAIL: "Informe um e-mail válido.",
  INVALID_PASSWORD: "Informe sua senha.",
  INVALID_CASH_BOX_NAME: "Informe um nome com até 100 caracteres.",
  DESCRIPTION_TOO_LONG: "Use até 500 caracteres na descrição.",
  CASH_BOX_NAME_EXISTS: "Escolha outro nome.",
  CASH_BOX_UNAVAILABLE: "Selecione um caixa disponível.",
  AMOUNT_LIMIT: "Confira o valor informado.",
  CASH_BOX_REQUIRED: "Selecione o caixa de destino.",
  INVALID_AMOUNT:
    "Informe um valor maior que zero, com até duas casas decimais e sem separador de milhar.",
  INVALID_DATE: "Informe uma data válida no formato dd/mm/aaaa.",
  DONOR_NAME_TOO_LONG: "Use até 100 caracteres.",
  NOTE_TOO_LONG: "Use até 500 caracteres.",
};

// Shared by server entry boundaries and local validation; rules never import this mapper.
export function presentBusinessFailure(
  error: BusinessFailure,
): ApplicationError {
  return {
    code: error.code,
    category: error.category,
    message: messages[error.code],
    ...(error.issues
      ? {
          fields: Object.fromEntries(
            Object.entries(error.issues)
              .filter(
                (entry): entry is [string, ValidationIssue] =>
                  entry[1] !== undefined,
              )
              .map(([property, issue]) => [property, issueMessages[issue]]),
          ),
        }
      : {}),
  };
}
