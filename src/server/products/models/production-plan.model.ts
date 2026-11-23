export interface ProductionPlanItem {
  scenarios?: ProductionScenario[];
  productId: string;
  name: string;
  pending: number;
  physical: number;
  toProduce: number;
}

export interface ProductionScenario {
  value: string;
  label: string;
  pending: number;
  physical: number;
  toProduce: number;
}
