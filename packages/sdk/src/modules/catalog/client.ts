import type { ApiRequester, BaseModuleClient } from '../base';
import type { ApiModule } from './types';

export class CatalogModuleClient implements BaseModuleClient {
  readonly moduleName = 'catalog';

  constructor(private readonly api: ApiRequester) {}

  async getCatalog(): Promise<{ data: ApiModule[] }> {
    return this.api.request('/admin/module-catalog/catalog');
  }

  async listModules(): Promise<{ data: ApiModule[] }> {
    return this.api.request('/admin/modules');
  }

  async toggleModule(tenantId: number, moduleId: number, enabled: boolean): Promise<{ enabled: boolean }> {
    return this.api.request(`/admin/tenants/${tenantId}/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  }
}
