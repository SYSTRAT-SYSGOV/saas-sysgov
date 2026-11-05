import { MODULE_REGISTRY } from './moduleRegistry';
import { SUBMODULOS_EDUCACAO, rotaPorAlias } from '@/modules/educacao/submodulos';

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
  const raiz = (r: string) => r.replace(/\/+$/, '');
  const rotaDoModulo = item.module && SUBMODULOS_EDUCACAO.some((s) => s.alias === item.module) ? rotaPorAlias(item.module) : `/${def?.routePath}`;
  if (def?.icon && (raiz(item.route) === raiz(rotaDoModulo) || raiz(item.route) === raiz(`/${def.routePath}`))) return def.icon;
  return item.icon;
}
