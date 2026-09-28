import type { Business } from './business';
import type { Professional } from './professional';
import type { Service } from './service';
import type { WorkingHours } from './working-hours';

export interface CatalogRepository {
  getBusiness(): Promise<Business>;
  /** Active services only, sorted by sortOrder. */
  listServices(): Promise<Service[]>;
  /** @throws DomainError('notFound') */
  getService(id: string): Promise<Service>;
  /** Active professionals offering the service. */
  listProfessionals(serviceId: string): Promise<Professional[]>;
  /** @throws DomainError('notFound') */
  getProfessional(id: string): Promise<Professional>;
  getWorkingHours(professionalId: string): Promise<WorkingHours[]>;
}
