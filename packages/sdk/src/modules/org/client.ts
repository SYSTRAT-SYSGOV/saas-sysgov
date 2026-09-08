import type { ApiRequester, BaseModuleClient } from '../base';
import type {
  CreateOrgUnitInput,
  LinkOrgUnitUserInput,
  MoveOrgUnitInput,
  OrgExportData,
  OrgScopeSummary,
  OrgUnit,
  OrgUnitTreeNode,
  OrgUnitUserLink,
  UpdateOrgUnitInput,
} from './types';

export class OrgModuleClient implements BaseModuleClient {
  readonly moduleName = 'org';

  constructor(private readonly api: ApiRequester) {}

  async getTree(): Promise<{ data: OrgUnitTreeNode[] }> {
    return this.api.request('/org/tree');
  }

  async listUnits(params?: { type?: string; active?: boolean }): Promise<{ data: OrgUnit[] }> {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.active !== undefined) query.set('active', String(params.active));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.api.request(`/org/units${qs}`);
  }

  async getUnit(id: number): Promise<{ data: OrgUnit }> {
    return this.api.request(`/org/units/${id}`);
  }

  async createUnit(input: CreateOrgUnitInput): Promise<{ data: OrgUnit }> {
    return this.api.request('/org/units', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateUnit(id: number, input: UpdateOrgUnitInput): Promise<{ data: OrgUnit }> {
    return this.api.request(`/org/units/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async deleteUnit(id: number, reason?: string): Promise<{ message: string }> {
    return this.api.request(`/org/units/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
  }

  async moveUnit(id: number, input: MoveOrgUnitInput): Promise<{ data: OrgUnit }> {
    return this.api.request(`/org/units/${id}/move`, { method: 'PATCH', body: JSON.stringify(input) });
  }

  async linkUser(orgUnitId: number, input: LinkOrgUnitUserInput): Promise<{ data: OrgUnitUserLink }> {
    return this.api.request(`/org/units/${orgUnitId}/users`, { method: 'POST', body: JSON.stringify(input) });
  }

  async unlinkUser(orgUnitId: number, userId: number): Promise<{ message: string }> {
    return this.api.request(`/org/units/${orgUnitId}/users/${userId}`, { method: 'DELETE' });
  }

  async getScope(): Promise<{ data: OrgScopeSummary }> {
    return this.api.request('/org/scope');
  }

  async exportData(): Promise<OrgExportData> {
    return this.api.request('/org/export');
  }

  async importData(data: OrgExportData): Promise<{ message: string; imported: { units: number; links: number } }> {
    return this.api.request('/org/import', { method: 'POST', body: JSON.stringify(data) });
  }
}
