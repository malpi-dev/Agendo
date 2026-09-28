export type UserRole = 'client' | 'admin';

export interface Profile {
  id: string;
  fullName: string;
  role: UserRole;
}
