export interface User {
  id: number;
  name: string;
  email: string;
  birthDate?: string | null;
  phoneCountry?: string | null;
  phoneNumber?: string | null;
}
