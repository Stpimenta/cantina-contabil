export interface Credentials {
  gmail: string;
  senha: string;
}
export interface AuthRepository {
  login(credentials: Credentials): Promise<string>;
}
