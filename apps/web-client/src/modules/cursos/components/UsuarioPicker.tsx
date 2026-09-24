import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@sysgov/ui';
import { SearchInput } from '@/components/ui';
import { sysgovApi, type InstrutorResumo } from '@sysgov/sdk';

interface Props {
  label: string;
  selecionados: InstrutorResumo[];
  onChange: (usuarios: InstrutorResumo[]) => void;
  /** Um só usuário (ex.: inscrição direta). */
  unico?: boolean;
}

/** Busca e seleção de usuários ativos do órgão (instrutores, inscrição direta). */
export const UsuarioPicker: React.FC<Props> = ({ label, selecionados, onChange, unico = false }) => {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<InstrutorResumo[]>([]);

  useEffect(() => {
    if (busca.trim().length < 2) {
      setResultados([]);
      return;
    }
    let ativo = true;
    sysgovApi.cursos
      .buscarUsuarios(busca)
      .then((r) => ativo && setResultados(r))
      .catch(() => ativo && setResultados([]));
    return () => {
      ativo = false;
    };
  }, [busca]);

  const escolher = (u: InstrutorResumo) => {
    onChange(unico ? [u] : [...selecionados.filter((s) => s.id !== u.id), u]);
    setBusca('');
  };

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      {selecionados.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selecionados.map((u) => (
            <li key={u.id} className="flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs text-foreground">
              {u.name}
              <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remover ${u.name}`} onClick={() => onChange(selecionados.filter((s) => s.id !== u.id))}>
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <SearchInput value={busca} onChange={setBusca} placeholder="Buscar por nome ou e-mail (mín. 2 letras)" debounce={250} />
      {resultados.length > 0 && (
        <ul className="max-h-48 overflow-y-auto rounded-lg border border-border">
          {resultados.map((u) => (
            <li key={u.id}>
              <Button type="button" variant="ghost" className="w-full justify-start" onClick={() => escolher(u)}>
                <span className="text-sm">{u.name}</span>
                <span className="text-xs text-muted-foreground">{u.email}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UsuarioPicker;
