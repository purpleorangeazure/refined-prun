export interface Config {
  fallbackToCX?: boolean;
  contLocation?: string;
  skip?: boolean;
  orderMode: UserData.ActionData['orderMode'];
}
