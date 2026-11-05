import React from 'react';
import { Link } from 'react-router-dom';
import { getIcon } from '@/config/iconMap';
import { MODULE_REGISTRY } from '@/config/moduleRegistry';
import { rotaDoSubmodulo } from './submodulos';
import { useSubmodulosPermitidos } from './useSubmodulosPermitidos';

/** Página inicial da Educação: lista só os submódulos que o usuário pode abrir. */
export const EducacaoHome: React.FC = () => {
  const submodulos = useSubmodulosPermitidos();

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-xl font-bold text-gov-text-primary">Educação</h1>
        <p className="text-sm text-muted-foreground">Cadastro escolar, vida pedagógica, eventos e transporte escolar.</p>
      </header>
      {submodulos.length === 0 ? (
        <p role="status" className="rounded-md border border-border p-4 text-sm text-muted-foreground">
          Você não tem acesso a nenhum submódulo da Educação. Peça a quem administra o sistema.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {submodulos.map((s) => {
            const Icone = getIcon(MODULE_REGISTRY[s.alias]?.icon);
            return (
              <li key={s.alias}>
                <Link to={rotaDoSubmodulo(s)} className="flex h-full gap-3 rounded-lg border border-border bg-white p-4 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2">
                  <Icone className="mt-0.5 h-6 w-6 shrink-0 text-[#0c326f]" aria-hidden="true" />
                  <span>
                    <strong className="block text-base">{s.rotulo}</strong>
                    <span className="text-sm text-muted-foreground">{s.descricao}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default EducacaoHome;
