import React, { useState } from 'react';
import { Download, FileUp } from 'lucide-react';

import AdminModal, { inputCls, labelCls, btnPrimary, btnSecondary } from '../../escola/components/AdminModal';
import type { ResultadoImportacaoNotas } from '../api';
import { modeloNotasCsv } from '../services/modeloNotasCsv';
import type { AlunoPedagogico, Materia, TurmaPedagogica } from '../types/pedagogico';

interface ImportarNotasModalProps {
  turmas: TurmaPedagogica[];
  materias: Materia[];
  alunos: AlunoPedagogico[];
  /** Turma/matéria abertas na tela, sugeridas para o modelo. */
  turmaInicial?: TurmaPedagogica | null;
  materiaInicial?: Materia | null;
  /** Envia o CSV; devolve o resultado ou null quando a API recusou o arquivo (o erro já foi avisado). */
  onImportar: (arquivo: File) => Promise<ResultadoImportacaoNotas | null>;
  onClose: () => void;
}

export const ImportarNotasModal: React.FC<ImportarNotasModalProps> = ({
  turmas, materias, alunos, turmaInicial, materiaInicial, onImportar, onClose,
}) => {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacaoNotas | null>(null);

  // Modelo pré-preenchido
  const [turmaId, setTurmaId] = useState<number | ''>(turmaInicial?.id ?? turmas[0]?.id ?? '');
  const [materiaId, setMateriaId] = useState<number | ''>(materiaInicial?.id ?? '');
  const [trimestre, setTrimestre] = useState<1 | 2 | 3>(1);
  const turmaModelo = turmas.find(t => t.id === turmaId) ?? null;
  const vinculadas = new Set((turmaModelo?.materias ?? []).map(v => v.materia_id));
  const materiasDaTurma = materias.filter(m => vinculadas.has(m.id));

  const baixarModelo = () => {
    if (!turmaModelo) return;
    const csv = modeloNotasCsv(turmaModelo, materias, alunos, trimestre, materiaId === '' ? undefined : materiaId);
    // BOM para o Excel reconhecer os acentos
    const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `Notas_${turmaModelo.nome}_${trimestre}tri.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importar = async () => {
    if (!arquivo) return;
    setEnviando(true);
    const r = await onImportar(arquivo);
    setEnviando(false);
    if (r) setResultado(r);
  };

  return (
    <AdminModal
      title="Importar Notas (CSV)"
      onClose={onClose}
      size="md"
      footer={
        resultado ? (
          <button onClick={onClose} className={btnPrimary}>Fechar</button>
        ) : (
          <>
            <button onClick={onClose} className={btnSecondary}>Cancelar</button>
            <button onClick={() => void importar()} disabled={!arquivo || enviando} className={btnPrimary}>
              {enviando ? 'Importando…' : 'Importar'}
            </button>
          </>
        )
      }
    >
      {resultado ? (
        <div className="space-y-3 text-sm">
          <p className="font-semibold text-slate-800 dark:text-slate-200">{resultado.importadas} notas importadas.</p>
          {resultado.rejeitadas.length > 0 ? (
            <>
              <p className="text-red-600 font-medium">{resultado.rejeitadas.length} linhas não foram importadas:</p>
              <ul className="max-h-60 overflow-y-auto rounded-lg border border-red-200 dark:border-red-900/60 divide-y divide-red-100 dark:divide-red-900/40 text-xs">
                {resultado.rejeitadas.map(r => (
                  <li key={r.linha} className="px-3 py-1.5 text-slate-700 dark:text-slate-300">
                    <span className="font-mono font-bold">Linha {r.linha}:</span> {r.motivo}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-slate-500">Nenhuma linha rejeitada.</p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <p>
              Colunas: <code className="font-mono text-xs">TURMA;NUMERO;MATERIA;TRIMESTRE;NOTA</code> (separador ponto e vírgula ou vírgula).
            </p>
            <p>
              NUMERO é o número de chamada do aluno. A nota vai de 0 a 10 com uma casa decimal (8,5 ou 8.5). Linha com a NOTA em branco é
              ignorada. Nota já lançada é substituída. A matéria precisa estar vinculada à turma.
            </p>
          </div>

          <fieldset className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <legend className="px-1 text-xs font-bold text-slate-500 uppercase tracking-wider">Baixar modelo preenchido</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls} htmlFor="modelo-turma">Turma</label>
                <select
                  id="modelo-turma"
                  className={inputCls}
                  value={turmaId}
                  onChange={e => { setTurmaId(e.target.value ? Number(e.target.value) : ''); setMateriaId(''); }}
                >
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} ({t.turno_nome})</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="modelo-materia">Matéria</label>
                <select id="modelo-materia" className={inputCls} value={materiaId} onChange={e => setMateriaId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Todas da turma</option>
                  {materiasDaTurma.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="modelo-trimestre">Trimestre</label>
                <select id="modelo-trimestre" className={inputCls} value={trimestre} onChange={e => setTrimestre(Number(e.target.value) as 1 | 2 | 3)}>
                  <option value={1}>1º</option>
                  <option value={2}>2º</option>
                  <option value={3}>3º</option>
                </select>
              </div>
            </div>
            {turmaModelo && materiasDaTurma.length === 0 && (
              <p className="text-xs text-amber-600">Esta turma não tem matérias vinculadas. Vincule no cadastro da turma.</p>
            )}
            <button type="button" onClick={baixarModelo} disabled={!turmaModelo || materiasDaTurma.length === 0} className={btnSecondary}>
              <Download className="w-4 h-4 inline -mt-0.5 mr-1" /> Baixar modelo
            </button>
          </fieldset>

          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20">
            <FileUp className="w-7 h-7 text-indigo-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{arquivo ? arquivo.name : 'Selecione o arquivo CSV'}</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={e => setArquivo(e.target.files?.[0] || null)} />
          </label>
        </div>
      )}
    </AdminModal>
  );
};

export default ImportarNotasModal;
