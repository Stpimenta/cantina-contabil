// Provider identity only. Business authorship and permissions belong to D1.
export interface AccountIdentity {
  subject: string;
  email: string;
  emailConfirmed: boolean;
}
