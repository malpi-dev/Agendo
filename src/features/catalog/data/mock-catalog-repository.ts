import { DomainError } from '@/core/errors';
import type { MockDb } from '@/features/demo/data/mock-db';

import type { Business } from '../domain/business';
import type { CatalogRepository } from '../domain/catalog-repository';
import type { Professional } from '../domain/professional';
import type { Service } from '../domain/service';
import type { WorkingHours } from '../domain/working-hours';

const cloneProfessional = (p: Professional): Professional => ({
  ...p,
  serviceIds: [...p.serviceIds],
});

export class MockCatalogRepository implements CatalogRepository {
  constructor(private readonly db: MockDb) {}

  async getBusiness(): Promise<Business> {
    await this.db.delay();
    return { ...this.db.business };
  }

  async listServices(): Promise<Service[]> {
    await this.db.delay();
    return this.db.services
      .filter((s) => s.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({ ...s }));
  }

  async getService(id: string): Promise<Service> {
    await this.db.delay();
    const service = this.db.services.find((s) => s.id === id);
    if (!service) throw new DomainError('notFound');
    return { ...service };
  }

  async listProfessionals(serviceId?: string): Promise<Professional[]> {
    await this.db.delay();
    return this.db.professionals
      .filter((p) => p.isActive && (!serviceId || p.serviceIds.includes(serviceId)))
      .map(cloneProfessional);
  }

  async getProfessional(id: string): Promise<Professional> {
    await this.db.delay();
    const professional = this.db.professionals.find((p) => p.id === id);
    if (!professional) throw new DomainError('notFound');
    return cloneProfessional(professional);
  }

  async getWorkingHours(professionalId: string): Promise<WorkingHours[]> {
    await this.db.delay();
    return this.db.workingHours
      .filter((h) => h.professionalId === professionalId)
      .map((h) => ({ ...h }));
  }
}
