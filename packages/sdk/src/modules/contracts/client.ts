import type { ApiRequester, BaseModuleClient } from '../base';
import type { ApiContract, CreateContractInput, UpdateContractInput } from './types';

export class ContractsModuleClient implements BaseModuleClient {
  readonly moduleName = 'contracts';

  constructor(private readonly api: ApiRequester) {}

  async list(): Promise<ApiContract[]> {
    return this.api.request('/contracts');
  }

  async get(id: number): Promise<ApiContract> {
    return this.api.request(`/contracts/${id}`);
  }

  async create(input: CreateContractInput): Promise<ApiContract> {
    return this.api.request('/contracts', { method: 'POST', body: JSON.stringify(input) });
  }

  async update(id: number, input: UpdateContractInput): Promise<ApiContract> {
    return this.api.request(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }
}
