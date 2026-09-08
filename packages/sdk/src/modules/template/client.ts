import type { ApiRequester, BaseModuleClient } from '../base';
import type { CreateExampleModuleItemInput, ExampleModuleItem, UpdateExampleModuleItemInput } from './types';

export class ExampleModuleClient implements BaseModuleClient {
  readonly moduleName = 'example';

  constructor(private readonly api: ApiRequester) {}

  async list(): Promise<{ data: ExampleModuleItem[] }> {
    return this.api.request(`/${this.moduleName}`);
  }

  async get(id: number): Promise<{ data: ExampleModuleItem }> {
    return this.api.request(`/${this.moduleName}/${id}`);
  }

  async create(input: CreateExampleModuleItemInput): Promise<{ data: ExampleModuleItem }> {
    return this.api.request(`/${this.moduleName}`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async update(id: number, input: UpdateExampleModuleItemInput): Promise<{ data: ExampleModuleItem }> {
    return this.api.request(`/${this.moduleName}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async delete(id: number): Promise<{ deleted: boolean }> {
    return this.api.request(`/${this.moduleName}/${id}`, {
      method: 'DELETE',
    });
  }
}
