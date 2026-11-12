import type { PostalAddress } from "../models/postal-address.model";
export interface PostalAddressRepository {
  findByPostalCode(postalCode: string): Promise<PostalAddress | null>;
}
