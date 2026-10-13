import React from 'react';
import { escolaApi } from '../api';
import { useCarga } from '../useCarga';
import { EstadoCarga, type Toast } from './AdminModal';
import { EquipeCargo } from './EquipeCargo';

/** Equipe gestora da unidade (D17): diretor, diretores auxiliares e secretaria. As pedagogas ficam no Corpo Docente. */
export const EquipeAdmin: React.FC<{ onToast: Toast }> = ({ onToast }) => {
  const carga = useCarga(escolaApi.equipe);
  const equipe = carga.dados ?? [];
  const doCargo = (cargo: string) => equipe.filter((m) => m.cargo === cargo);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Equipe Gestora</h2>
        <p className="text-sm text-slate-500">Nomes usados na ata do conselho de classe. As pedagogas são cadastradas no Corpo Docente do Pedagógico.</p>
      </div>
      {(carga.carregando && !carga.dados) || carga.erro ? (
        <EstadoCarga carregando={carga.carregando} erro={carga.erro} onTentar={carga.recarregar} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <EquipeCargo titulo="Diretor" cargo="diretor" unico membros={doCargo('diretor')} onToast={onToast} onAlterado={carga.recarregar} />
          <EquipeCargo titulo="Diretores auxiliares" cargo="diretor_auxiliar" membros={doCargo('diretor_auxiliar')} onToast={onToast} onAlterado={carga.recarregar} />
          <EquipeCargo titulo="Secretaria" cargo="secretaria" membros={doCargo('secretaria')} onToast={onToast} onAlterado={carga.recarregar} />
        </div>
      )}
    </div>
  );
};

export default EquipeAdmin;
