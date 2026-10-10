import React, { useEffect, useState } from 'react';
import { Check, Pencil, Trash2, UserPlus, X } from 'lucide-react';
import { escolaApi, erroApi, type CargoEquipe, type MembroEquipe, type PessoaResumo } from '../api';
import { inputCls, btnPrimary, btnSecondary, type Toast } from './AdminModal';
import { ConfirmModal } from './AlunoModals';

interface EquipeCargoProps {
  titulo: string;
  cargo: CargoEquipe;
  /** Cargo com uma só pessoa (diretor): esconde o cadastro quando já há alguém. */
  unico?: boolean;
  membros: MembroEquipe[];
  onToast: Toast;
  onAlterado: () => Promise<void>;
}

/** Lista de nomes de um cargo da equipe gestora (D17): adicionar, renomear e excluir. */
export const EquipeCargo: React.FC<EquipeCargoProps> = ({ titulo, cargo, unico = false, membros, onToast, onAlterado }) => {
  const [novo, setNovo] = useState('');
  const [editando, setEditando] = useState<{ id: number; nome: string } | null>(null);
  const [excluir, setExcluir] = useState<MembroEquipe | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [sugestoes, setSugestoes] = useState<PessoaResumo[]>([]);

  // Sugestões do Cadastro de Pessoas enquanto digita (nome com 3+ letras ou CPF completo).
  useEffect(() => {
    const termo = novo.trim();
    if (termo.length < 3) {
      setSugestoes([]);
      return;
    }
    let cancelado = false;
    const t = window.setTimeout(() => {
      escolaApi.buscarPessoas(termo).then((r) => !cancelado && setSugestoes(r)).catch(() => !cancelado && setSugestoes([]));
    }, 300);
    return () => {
      cancelado = true;
      window.clearTimeout(t);
    };
  }, [novo]);

  const adicionarPessoa = async (p: PessoaResumo) => {
    setSalvando(true);
    try {
      await escolaApi.salvarMembroEquipe(null, { pessoa_id: p.id, cargo });
      setNovo('');
      setSugestoes([]);
      await onAlterado();
    } catch (e) {
      onToast({ type: 'error', title: 'Não foi possível salvar', message: erroApi(e).mensagem });
    } finally {
      setSalvando(false);
    }
  };

  const salvar = async (id: number | null, nome: string) => {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      await escolaApi.salvarMembroEquipe(id, id ? { nome: nome.trim() } : { nome: nome.trim(), cargo });
      setNovo('');
      setEditando(null);
      await onAlterado();
    } catch (e) {
      onToast({ type: 'error', title: 'Não foi possível salvar', message: erroApi(e).mensagem });
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (m: MembroEquipe) => {
    try {
      await escolaApi.excluirMembroEquipe(m.id);
      setExcluir(null);
      await onAlterado();
    } catch (e) {
      setExcluir(null);
      onToast({ type: 'error', title: 'Não foi possível excluir', message: erroApi(e).mensagem });
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{titulo}</h3>
      {membros.length === 0 && <p className="text-sm text-slate-500">Nenhum nome cadastrado.</p>}
      <ul className="space-y-2">
        {membros.map((m) => (
          <li key={m.id} className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
            {editando?.id === m.id ? (
              <>
                <input className={inputCls} value={editando.nome} onChange={(e) => setEditando({ id: m.id, nome: e.target.value })} maxLength={200} aria-label={`Nome de ${m.nome}`} />
                <button className={btnPrimary} disabled={salvando} onClick={() => void salvar(m.id, editando.nome)} aria-label="Salvar nome"><Check className="w-4 h-4" /></button>
                <button className={btnSecondary} onClick={() => setEditando(null)} aria-label="Cancelar"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white">
                  {m.nome}
                  {m.pessoa_id ? <span className="ml-2 text-[11px] font-normal text-emerald-600">Cadastro de Pessoas</span> : null}
                </span>
                <button className="p-1.5 text-slate-500 hover:text-indigo-600" onClick={() => setEditando({ id: m.id, nome: m.nome })} aria-label={`Renomear ${m.nome}`}><Pencil className="w-4 h-4" /></button>
                <button className="p-1.5 text-slate-500 hover:text-rose-600" onClick={() => setExcluir(m)} aria-label={`Excluir ${m.nome}`}><Trash2 className="w-4 h-4" /></button>
              </>
            )}
          </li>
        ))}
      </ul>
      {!(unico && membros.length > 0) && (
        <div className="flex gap-2">
          <input className={inputCls} placeholder="Nome completo" value={novo} onChange={(e) => setNovo(e.target.value)} maxLength={200}
            onKeyDown={(e) => { if (e.key === 'Enter') void salvar(null, novo); }} />
          <button className={btnPrimary} disabled={salvando || !novo.trim()} onClick={() => void salvar(null, novo)}>
            <UserPlus className="w-4 h-4" /> Adicionar
          </button>
        </div>
      )}
      {!(unico && membros.length > 0) && sugestoes.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-slate-200 dark:border-slate-700 p-2" aria-label="Pessoas encontradas no Cadastro de Pessoas">
          {sugestoes.map((p) => (
            <li key={p.id}>
              <button type="button" disabled={salvando} onClick={() => void adicionarPessoa(p)}
                className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm hover:bg-indigo-50 dark:hover:bg-slate-800">
                <span>{p.nome}</span>
                <span className="font-mono text-xs tabular-nums text-slate-500">{p.cpf_mascarado}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {excluir && (
        <ConfirmModal
          title="Excluir da equipe"
          message={`Remover ${excluir.nome} de ${titulo.toLowerCase()}? Atas já gravadas não mudam.`}
          confirmLabel="Excluir"
          onConfirm={() => void remover(excluir)}
          onClose={() => setExcluir(null)}
        />
      )}
    </section>
  );
};

export default EquipeCargo;
