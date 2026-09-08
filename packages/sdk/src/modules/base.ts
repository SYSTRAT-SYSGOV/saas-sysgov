export interface BaseModuleClient {
  readonly moduleName: string;
}

export type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

export interface ApiRequester {
  request<T>(path: string, options?: RequestOptions): Promise<T>;
}
