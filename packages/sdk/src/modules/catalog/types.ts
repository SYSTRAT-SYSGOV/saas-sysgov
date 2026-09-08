export interface ApiMenuItem {
  id: number | string;
  label: string;
  route: string;
  icon: string;
  permission?: string;
  order: number;
}

export interface ApiModule {
  id: number;
  name: string;
  alias: string;
  enabled: boolean;
  metadata?: Record<string, unknown>;
  description?: string;
  icon?: string;
  menu_label?: string;
  menu_order?: number;
  permissions?: string[];
  menu_items?: ApiMenuItem[];
}
