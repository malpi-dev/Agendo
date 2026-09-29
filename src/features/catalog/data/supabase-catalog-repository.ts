import { DomainError } from '@/core/errors';
import type { AgendoSupabaseClient } from '@/core/supabase/client';
import { run } from '@/core/supabase/run';

import type { Business } from '../domain/business';
import type { CatalogRepository } from '../domain/catalog-repository';
import type { Professional } from '../domain/professional';
import type { Service } from '../domain/service';
import type { WorkingHours } from '../domain/working-hours';
import { toBusiness, toProfessional, toService, toWorkingHours } from './mappers';

const PROFESSIONAL_COLUMNS = '*, professional_services(service_id)';

export class SupabaseCatalogRepository implements CatalogRepository {
  constructor(private readonly client: AgendoSupabaseClient) {}

  async getBusiness(): Promise<Business> {
    const row = await run(() => this.client.from('business').select('*').single());
    return toBusiness(row);
  }

  async listServices(): Promise<Service[]> {
    const rows = await run(() =>
      this.client.from('services').select('*').eq('is_active', true).order('sort_order'),
    );
    return rows.map(toService);
  }

  async getService(id: string): Promise<Service> {
    const row = await run(() =>
      this.client.from('services').select('*').eq('id', id).maybeSingle(),
    );
    if (!row) throw new DomainError('notFound', 'Service not found');
    return toService(row);
  }

  async listProfessionals(serviceId?: string): Promise<Professional[]> {
    const rows = await run(() =>
      this.client.from('professionals').select(PROFESSIONAL_COLUMNS).eq('is_active', true),
    );
    const all = rows.map(toProfessional);
    return serviceId ? all.filter((p) => p.serviceIds.includes(serviceId)) : all;
  }

  async getProfessional(id: string): Promise<Professional> {
    const row = await run(() =>
      this.client.from('professionals').select(PROFESSIONAL_COLUMNS).eq('id', id).maybeSingle(),
    );
    if (!row) throw new DomainError('notFound', 'Professional not found');
    return toProfessional(row);
  }

  async getWorkingHours(professionalId: string): Promise<WorkingHours[]> {
    const rows = await run(() =>
      this.client
        .from('working_hours')
        .select('*')
        .eq('professional_id', professionalId)
        .order('weekday')
        .order('start_time'),
    );
    return rows.map(toWorkingHours);
  }
}
