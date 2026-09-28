export interface Professional {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string | null;
  isActive: boolean;
  serviceIds: string[];
}
