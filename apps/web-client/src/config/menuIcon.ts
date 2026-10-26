import { MODULE_REGISTRY } from './moduleRegistry';

interface ItemDeMenu {
  icon?: string | null;
  module?: string | null;
  route: string;
}

/**
 * Nome do ícone de um item do menu. O item principal de um módulo (a rota do módulo) usa o ícone do registro, o mesmo
 * dos cards do dashboard: assim menu e cards nunca divergem, mesmo que a linha gravada no banco esteja desatualizada.
 * Os demais itens (subitens, atalhos) usam o ícone que veio da API.
 */
export function iconeDoItem(item: ItemDeMenu): string | null | undefined {
  const def = item.module ? MODULE_REGISTRY[item.module] : undefined;
  if (def?.icon && item.route.replace(/\/+$/, '') === `/${def.routePath}`.replace(/\/+$/, '')) return def.icon;
  return item.icon;
}
