import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { EDUCACAO_BASE, rotaDoSubmodulo } from './submodulos';
import { useSubmodulosPermitidos } from './useSubmodulosPermitidos';

/** Envolve a tela de um submódulo com a barra para trocar de submódulo sem voltar ao menu. */
export const EducacaoShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const submodulos = useSubmodulosPermitidos();

  return (
    <div>
      <nav aria-label="Submódulos da Educação" className="border-b border-border bg-white">
        <ul className="flex gap-1 overflow-x-auto px-4 py-2">
          <li className="shrink-0">
            <NavLink to={EDUCACAO_BASE} end className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2">
              Educação
            </NavLink>
          </li>
          {submodulos.map((s) => (
            <li key={s.alias} className="shrink-0">
              <NavLink
                to={rotaDoSubmodulo(s)}
                className={({ isActive }) => cn(
                  'inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2',
                  isActive ? 'bg-[#E8F0FE] text-[#0c326f]' : 'text-[#1B1B1B] hover:bg-muted',
                )}
              >
                {s.rotulo}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  );
};

export default EducacaoShell;
