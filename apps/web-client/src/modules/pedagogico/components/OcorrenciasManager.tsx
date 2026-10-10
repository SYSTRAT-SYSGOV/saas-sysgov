import React, { useState } from 'react';
import {
  AlertTriangle,
  Plus,
  Search,
  ShieldAlert,
  X
} from 'lucide-react';
import { OcorrenciaPedagogica, AlunoPedagogico, SeveridadeOcorrencia } from '../types/pedagogico';

interface OcorrenciasManagerProps {
  ocorrencias: OcorrenciaPedagogica[];
  alunos: AlunoPedagogico[];
  onSaveOcorrencia: (data: Partial<OcorrenciaPedagogica>) => void;
  onToast: (toast: { type: string; title: string; message: string }) => void;
}

export const OcorrenciasManager: React.FC<OcorrenciasManagerProps> = ({
  ocorrencias,
  alunos,
  onSaveOcorrencia,
  onToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severidadeFilter, setSeveridadeFilter] = useState<string>('todas');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formAlunoId, setFormAlunoId] = useState<number>(alunos[0]?.id || 101);
  const [categoria, setCategoria] = useState('Pedagógica');
  const [descricao, setDescricao] = useState('');
  const [severidade, setSeveridade] = useState<SeveridadeOcorrencia>('Média');
  const [registradoPor, setRegistradoPor] = useState('Equipe Pedagógica');

  const filtered = ocorrencias.filter(o => {
    const matchesSearch = o.aluno_nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.categoria.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.descricao.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSev = severidadeFilter === 'todas' || o.severidade === severidadeFilter;
    return matchesSearch && matchesSev;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const alunoObj = alunos.find(a => a.id === Number(formAlunoId));

    onSaveOcorrencia({
      aluno_id: Number(formAlunoId),
      aluno_nome: alunoObj?.nome || 'Aluno Desconhecido',
      turma_nome: alunoObj?.turma_nome || '6º Ano A',
      categoria,
      descricao,
      data: new Date().toISOString().split('T')[0],
      severidade,
      registrado_por: registradoPor
    });

    onToast({
      type: 'success',
      title: 'Ocorrência Registrada!',
      message: `Registro adicionado ao histórico de ${alunoObj?.nome}.`
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            Ocorrências Pedagógicas & Disciplinares
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Registro diário de observações, alertas de conduta e atitudes pedagógicas
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-all shadow-sm active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Registrar Ocorrência
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por aluno, categoria ou descrição..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>

        <select
          value={severidadeFilter}
          onChange={e => setSeveridadeFilter(e.target.value)}
          className="px-4 py-2 rounded-xl text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-700 dark:text-slate-200"
        >
          <option value="todas">Todas as Severidades</option>
          <option value="Baixa">Severidade Baixa</option>
          <option value="Média">Severidade Média</option>
          <option value="Alta">Severidade Alta</option>
          <option value="Crítica">Severidade Crítica</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length > 0 ? (
          filtered.map(item => (
            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-rose-500/30 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-bold text-sm text-slate-900 dark:text-white block">{item.aluno_nome}</span>
                  <span className="text-xs text-slate-500">{item.turma_nome} • {item.data}</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                  item.severidade === 'Crítica' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                  item.severidade === 'Alta' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                  item.severidade === 'Média' ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' :
                  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {item.severidade}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">{item.categoria}</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{item.descricao}</p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Registrado por: {item.registrado_por || 'Pedagogia'}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <ShieldAlert className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Nenhuma ocorrência encontrada.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Nova Ocorrência Pedagógica
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-xs text-slate-700 dark:text-slate-300 mb-1">Aluno</label>
                <select
                  value={formAlunoId}
                  onChange={e => setFormAlunoId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                >
                  {alunos.map(a => (
                    <option key={a.id} value={a.id}>{a.nome} ({a.turma_nome})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-xs text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                  <select
                    value={categoria}
                    onChange={e => setCategoria(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="Pedagógica">Pedagógica</option>
                    <option value="Conversas Paralelas">Conversas Paralelas</option>
                    <option value="Tarefa Não Entregue">Tarefa Não Entregue</option>
                    <option value="Conflito Verbal">Conflito Verbal</option>
                    <option value="Falta Injustificada">Falta Injustificada</option>
                    <option value="Atitude Exemplar">Atitude Exemplar (+)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-xs text-slate-700 dark:text-slate-300 mb-1">Severidade</label>
                  <select
                    value={severidade}
                    onChange={e => setSeveridade(e.target.value as SeveridadeOcorrencia)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Crítica">Crítica</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-xs text-slate-700 dark:text-slate-300 mb-1">Descrição do Ocorrido</label>
                <textarea
                  rows={4}
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Relate com clareza o fato observado..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 font-semibold text-white shadow-sm"
                >
                  Salvar Ocorrência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OcorrenciasManager;
