import { useCan } from '@/core/rbac/useCan';
import { MODULE_REGISTRY } from '@/config/moduleRegistry';
import { SUBMODULOS_EDUCACAO, type SubmoduloEducacao } from './submodulos';

/** Submódulos que o usuário pode abrir: módulo ativo no tenant e permissão de acesso (a mesma regra do menu). */
export function useSubmodulosPermitidos(): SubmoduloEducacao[] {
  const { can, hasModule } = useCan();
  return SUBMODULOS_EDUCACAO.filter((s) => {
    const def = MODULE_REGISTRY[s.alias];
    return !!def && hasModule(s.alias) && can(def.requiredPermission);
  });
}
