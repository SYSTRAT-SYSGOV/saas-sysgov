import { cpfValido, formatarCpf } from '@/lib/cpf';
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, X, ArrowLeftRight, Info, AlertTriangle, FileUp } from 'lucide-react';

import { useArquivoAutenticado } from '@/hooks/useArquivoAutenticado';

import { escolaApi, erroApi, type Aluno as AlunoPedagogico, type Contato as ContatoAluno, type SituacaoAluno as StatusAluno, type Turma as TurmaPedagogica } from '../api';
import { pedagogicoApi } from '../../pedagogico/api';
import AdminModal, { inputCls, labelCls, btnPrimary, btnSecondary, btnDanger, type Toast } from './AdminModal';

// ─── Novo / Editar Aluno ───────────────────────────────────────────────

interface AlunoFormModalProps {
  aluno: AlunoPedagogico | null;
  turmas: TurmaPedagogica[];
  escolaNome: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onToast: Toast;
}

// Redimensiona uma imagem no navegador (usado para prévias locais)
export function resizeImage(file: File, max = 240, type: 'image/jpeg' | 'image/png' = 'image/jpeg'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(type, 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const AlunoFormModal: React.FC<AlunoFormModalProps> = ({ aluno, turmas, onClose, onSaved, onToast }) => {
  const isEdit = aluno !== null;
  const [nome, setNome] = useState(aluno?.nome || '');
  const [cgm, setCgm] = useState(aluno?.cgm || '');
  // O CPF não volta da API (só mascarado): em branco na edição mantém o atual.
  const [cpf, setCpf] = useState('');
  const [numero, setNumero] = useState(aluno?.numero?.toString() || '');
  const [status, setStatus] = useState<StatusAluno>(aluno?.situacao || 'ativo');
  const [turmaId, setTurmaId] = useState(aluno?.turma?.id?.toString() || '');
  const [mae, setMae] = useState(aluno?.mae || '');
  const [pai, setPai] = useState(aluno?.pai || '');
  const [nascimento, setNascimento] = useState(aluno?.nascimento || '');
  const { src: fotoAtual } = useArquivoAutenticado(aluno?.tem_foto ? escolaApi.urlFoto(aluno.id) : null);
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [previaFoto, setPreviaFoto] = useState<string | null>(null);
  const foto = previaFoto ?? fotoAtual;
  const [contatos, setContatos] = useState<ContatoAluno[]>(
    aluno?.contatos?.length ? aluno.contatos : [{ telefone: '', descricao: '' }]
  );
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Remanejamento só faz sentido quando o aluno já existe e muda de situação
  const remanejando = status === 'remanejado' && isEdit && aluno!.situacao !== 'remanejado';

  const updateContato = (i: number, field: keyof ContatoAluno, value: string) =>
    setContatos(contatos.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setArquivoFoto(file);
    setPreviaFoto(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    const turma = turmas.find(t => t.id === Number(turmaId));
    if (!nome.trim()) return setErro('Informe o nome completo.');
    if (!turma) return setErro('Selecione a turma.');
    if (cpf.trim() && !cpfValido(cpf)) return setErro('CPF inválido.');
    if (remanejando && turma.id === aluno!.turma?.id) {
      return setErro('Para remanejar, selecione uma turma DIFERENTE da atual.');
    }

    const num = parseInt(numero, 10);
    // Remanejamento: a API registra a turma de origem e atribui o próximo número livre do destino.
    const payload = {
      nome: nome.trim(),
      cgm: cgm.trim() || null,
      ...(cpf.trim() ? { cpf: cpf.replace(/\D/g, '') } : {}),
      numero: remanejando || Number.isNaN(num) ? null : num,
      situacao: status,
      turma_id: turma.id,
      mae: mae.trim() || null,
      pai: pai.trim() || null,
      nascimento: nascimento || null,
      contatos: contatos.filter(c => c.telefone.trim()).map(c => ({ telefone: c.telefone.trim(), descricao: c.descricao?.trim() || null })),
    };

    setSalvando(true);
    try {
      const salvo = aluno ? await escolaApi.atualizarAluno(aluno.id, payload) : await escolaApi.criarAluno(payload);
      if (arquivoFoto) await escolaApi.enviarFoto(salvo.id, arquivoFoto);
      onToast({
        type: 'success',
        title: isEdit ? 'Aluno atualizado' : 'Aluno cadastrado',
        message: remanejando ? `${salvo.nome} remanejado para ${turma.nome}.` : `${salvo.nome} salvo com sucesso.`,
      });
      await onSaved();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AdminModal
      title={isEdit ? 'Editar Aluno' : 'Novo Aluno'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" form="form-aluno" className={btnPrimary} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </>
      }
    >
      <form id="form-aluno" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Nome Completo *</label>
            <input className={inputCls} value={nome} onChange={e => setNome(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className={labelCls}>CGM</label>
            <input className={`${inputCls} font-mono`} value={cgm} onChange={e => setCgm(e.target.value)} placeholder="Cadastro de Matrícula" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>CPF</label>
            <input
              className={`${inputCls} font-mono tabular-nums`}
              value={cpf}
              onChange={e => setCpf(formatarCpf(e.target.value))}
              inputMode="numeric"
              placeholder={aluno?.cpf_mascarado ?? '000.000.000-00'}
            />
          </div>
          <p className="sm:col-span-2 self-end text-xs text-slate-500 dark:text-slate-400">
            {aluno?.pessoa_id
              ? 'Ligado ao Cadastro de Pessoas: nome, nascimento, mãe e pai vêm do cadastro do município.'
              : 'Com CPF, o aluno é ligado ao Cadastro de Pessoas do município (opcional).'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Número do Aluno</label>
            <input type="number" min={1} className={inputCls} value={numero} onChange={e => setNumero(e.target.value)} disabled={remanejando} />
          </div>
          <div>
            <label className={labelCls}>Nascimento</label>
            <input type="date" className={inputCls} value={nascimento} onChange={e => setNascimento(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={status} onChange={e => setStatus(e.target.value as StatusAluno)}>
              <option value="ativo">Ativo</option>
              <option value="transferido">Transferido</option>
              <option value="remanejado">Remanejado</option>
            </select>
          </div>
        </div>

        <div className={remanejando ? 'p-3 rounded-lg border-2 border-sky-200 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-800' : ''}>
          <label className={`${labelCls} ${remanejando ? '!text-sky-700 dark:!text-sky-300 flex items-center gap-1' : ''}`}>
            {remanejando ? <><ArrowLeftRight className="w-3.5 h-3.5" /> TURMA DE DESTINO</> : 'Turma *'}
          </label>
          <select className={inputCls} value={turmaId} onChange={e => setTurmaId(e.target.value)} required>
            <option value="">Selecione...</option>
            {turmas.map(t => (
              <option key={t.id} value={t.id}>{t.nome} - {t.turno?.nome ?? '—'} ({t.ano_letivo})</option>
            ))}
          </select>
          {remanejando && (
            <p className="mt-2 text-xs text-sky-700 dark:text-sky-300 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              O aluno será movido para esta turma e receberá o próximo número disponível.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Mãe</label>
            <input className={inputCls} value={mae} onChange={e => setMae(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Pai</label>
            <input className={inputCls} value={pai} onChange={e => setPai(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Contatos (Telefone/WhatsApp)</label>
          <div className="space-y-2">
            {contatos.map((c, i) => (
              <div key={i} className="flex gap-2">
                <input className={`${inputCls} font-mono`} placeholder="Número" value={c.telefone} onChange={e => updateContato(i, 'telefone', e.target.value)} />
                <input className={inputCls} placeholder="Responsável" value={c.descricao ?? ''} onChange={e => updateContato(i, 'descricao', e.target.value)} />
                <button
                  type="button"
                  onClick={() => setContatos(contatos.filter((_, idx) => idx !== i))}
                  className="px-2.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
                  aria-label="Remover telefone"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setContatos([...contatos, { telefone: '', descricao: '' }])}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
          >
            <Plus className="w-4 h-4" /> Adicionar Telefone
          </button>
        </div>

        <div>
          <label className={labelCls}>Foto do Aluno</label>
          <div className="flex items-center gap-3">
            {foto && <img src={foto} alt="" className="w-14 h-14 rounded-xl object-cover border border-slate-200" />}
            <input type="file" accept="image/png,image/jpeg,image/webp" capture="environment" onChange={handleFoto} className="text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-semibold" />
          </div>
        </div>

        {erro && <p role="alert" className="text-sm font-medium text-red-600">{erro}</p>}
      </form>
    </AdminModal>
  );
};

// ─── Notas do Aluno (3 trimestres por matéria) ─────────────────────────

interface NotasAlunoModalProps {
  aluno: AlunoPedagogico;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onToast: Toast;
}

export const NotasAlunoModal: React.FC<NotasAlunoModalProps> = ({ aluno, onClose, onSaved, onToast }) => {
  const turmaId = aluno.turma?.id ?? null;
  const anoLetivo = aluno.turma?.ano_letivo ?? new Date().getFullYear();
  const [materias, setMaterias] = useState<{ id: number; nome: string }[]>([]);
  const [grades, setGrades] = useState<Record<number, Record<number, string>>>({});
  const [originais, setOriginais] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Matérias vinculadas à turma do aluno + boletim do ano letivo da turma.
  useEffect(() => {
    let ativo = true;
    Promise.all([escolaApi.turmas(), pedagogicoApi.boletim(aluno.id, anoLetivo)])
      .then(([turmas, notas]) => {
        if (!ativo) return;
        const turma = turmas.find(t => t.id === turmaId);
        setMaterias((turma?.materias ?? []).map(v => ({ id: v.materia_id, nome: v.materia ?? `Matéria ${v.materia_id}` })));
        const init: Record<number, Record<number, string>> = {};
        const orig: Record<string, string> = {};
        notas.forEach(n => {
          init[n.materia_id] = { ...(init[n.materia_id] || {}), [n.trimestre]: String(Number(n.nota)) };
          orig[`${n.materia_id}-${n.trimestre}`] = String(Number(n.nota));
        });
        setGrades(init);
        setOriginais(orig);
      })
      .catch(e => ativo && setErro(erroApi(e).mensagem))
      .finally(() => ativo && setCarregando(false));
    return () => { ativo = false; };
  }, [aluno.id, anoLetivo, turmaId]);

  const setNota = (mid: number, tri: number, v: string) =>
    setGrades({ ...grades, [mid]: { ...(grades[mid] || {}), [tri]: v } });

  const handleSave = async () => {
    if (turmaId === null) return setErro('O aluno está sem turma; vincule-o a uma turma para lançar notas.');
    const alteradas: { materia: number; tri: number; nota: number }[] = [];
    for (const m of materias) {
      for (const tri of [1, 2, 3]) {
        const raw = (grades[m.id]?.[tri] ?? '').trim().replace(',', '.');
        if (raw === '' || raw === originais[`${m.id}-${tri}`]) continue;
        const nota = Number(raw);
        if (Number.isNaN(nota) || nota < 0 || nota > 10) return setErro(`Nota inválida em ${m.nome} (${tri}º tri): use 0 a 10.`);
        alteradas.push({ materia: m.id, tri, nota: Math.round(nota * 10) / 10 });
      }
    }
    if (alteradas.length === 0) return onClose();
    setSalvando(true);
    setErro('');
    try {
      for (const a of alteradas) {
        await pedagogicoApi.lancarNotas({ turma_id: turmaId, materia_id: a.materia, ano_letivo: anoLetivo, trimestre: a.tri, notas: [{ aluno_id: aluno.id, nota: a.nota }] });
      }
      onToast({ type: 'success', title: 'Notas atualizadas', message: `${alteradas.length} nota(s) de ${aluno.nome} salvas.` });
      await onSaved();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AdminModal
      title={`Editar Notas — ${aluno.nome}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button onClick={handleSave} className={btnPrimary} disabled={salvando || carregando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </>
      }
    >
      {carregando && <p className="text-sm text-slate-500 mb-3">Carregando notas…</p>}
      {!carregando && materias.length === 0 && (
        <p className="text-sm text-slate-500 mb-3">Nenhuma matéria vinculada à turma do aluno. Vincule as matérias em Turmas → Editar.</p>
      )}
      {erro && <p role="alert" className="text-sm font-medium text-red-600 mb-3">{erro}</p>}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 items-center">
        <span className="text-xs font-bold uppercase text-slate-500">Matéria</span>
        {[1, 2, 3].map(t => (
          <span key={t} className="text-xs font-bold uppercase text-slate-500 text-center">{t}º Tri</span>
        ))}
        {materias.map(m => (
          <React.Fragment key={m.id}>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{m.nome}</span>
            {[1, 2, 3].map(tri => (
              <input
                key={tri}
                type="number"
                step="0.1"
                min={0}
                max={10}
                aria-label={`${m.nome} ${tri}º trimestre`}
                className={`${inputCls} text-center font-mono !px-1`}
                value={grades[m.id]?.[tri] ?? ''}
                onChange={e => setNota(m.id, tri, e.target.value)}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </AdminModal>
  );
};

// ─── Importação CSV (alunos ou notas) ─────────────────────────────────

interface ImportarCSVModalProps {
  tipo: 'alunos' | 'notas';
  onClose: () => void;
  onImported: () => void;
  onToast: Toast;
}

export const ImportarCSVModal: React.FC<ImportarCSVModalProps> = ({ tipo, onClose, onImported, onToast }) => {
  const [file, setFile] = useState<File | null>(null);
  const [resultado, setResultado] = useState<{ resumo: string[]; erros: string[] } | null>(null);
  const [processando, setProcessando] = useState(false);

  const cabecalho = tipo === 'alunos'
    ? 'NOME; CPF; CGM; TURMA; NUMERO; MAE; PAI; NASCIMENTO; CONTATO'
    : 'TURMA; NUMERO; MATERIA; TRIMESTRE; NOTA';

  const [erro, setErro] = useState('');
  const anoLetivo = new Date().getFullYear();

  const handleImport = async () => {
    if (!file) return;
    setProcessando(true);
    setErro('');
    try {
      if (tipo === 'alunos') {
        const r = await escolaApi.importarAlunos(file);
        const erros = r.rejeitadas.map(x => `Linha ${x.linha}: ${x.motivo}`);
        setResultado({ resumo: [`${r.criados} alunos novos importados.`, `${r.atualizados} cadastros existentes atualizados.`], erros });
        onToast({ type: erros.length ? 'warning' : 'success', title: 'Importação concluída', message: `${r.criados} novos, ${r.atualizados} atualizados.` });
      } else {
        const r = await pedagogicoApi.importarNotas(file, anoLetivo);
        const erros = r.rejeitadas.map(x => `Linha ${x.linha}: ${x.motivo}`);
        setResultado({ resumo: [`${r.importadas} notas importadas (ano letivo ${anoLetivo}).`], erros });
        onToast({ type: erros.length ? 'warning' : 'success', title: 'Importação concluída', message: `${r.importadas} notas importadas.` });
      }
      onImported();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <AdminModal
      title={tipo === 'alunos' ? 'Importar Alunos CSV' : 'Importar Notas (Trimestral)'}
      onClose={onClose}
      footer={
        resultado ? (
          <button onClick={onClose} className={btnPrimary}>Fechar</button>
        ) : (
          <>
            <button onClick={onClose} className={btnSecondary}>Cancelar</button>
            <button onClick={handleImport} disabled={!file || processando} className={btnPrimary}>
              {processando ? 'Importando...' : 'Iniciar Importação'}
            </button>
          </>
        )
      }
    >
      {resultado ? (
        <div className="space-y-3">
          {resultado.resumo.map(l => (
            <p key={l} className="text-sm font-semibold text-slate-800 dark:text-slate-200">{l}</p>
          ))}
          {resultado.erros.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-amber-700 mb-1">{resultado.erros.length} registros falharam:</p>
              <ul className="max-h-40 overflow-y-auto text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-0.5">
                {resultado.erros.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            O arquivo CSV deve conter os cabeçalhos abaixo (a ordem não importa, separador <code>;</code> ou <code>,</code>):
          </p>
          <code className="block text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-200 break-all">
            {cabecalho}
          </code>
          {tipo === 'alunos' && (
            <p className="text-xs text-slate-500">
              A turma deve existir com o mesmo nome. Alunos com o mesmo CPF, o mesmo CGM ou o mesmo nome na mesma turma são atualizados. Com CPF, o aluno é ligado ao Cadastro de Pessoas.
            </p>
          )}
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40">
            <FileUp className="w-7 h-7 text-indigo-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {file ? file.name : 'Selecione o arquivo CSV'}
            </span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
          {erro && <p role="alert" className="text-sm font-medium text-red-600">{erro}</p>}
        </div>
      )}
    </AdminModal>
  );
};

// ─── Limpar Turma (exclusão em massa com dupla confirmação) ────────────

interface LimparTurmaModalProps {
  turmas: TurmaPedagogica[];
  onClose: () => void;
  onDone: () => void | Promise<void>;
  onToast: Toast;
}

export const LimparTurmaModal: React.FC<LimparTurmaModalProps> = ({ turmas, onClose, onDone, onToast }) => {
  const [turmaId, setTurmaId] = useState('');
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [confirmacao, setConfirmacao] = useState('');
  const contagem = useMemo(() => {
    const map: Record<number, number> = {};
    turmas.forEach(t => { map[t.id] = t.total_alunos ?? 0; });
    return map;
  }, [turmas]);
  const turma = turmas.find(t => t.id === Number(turmaId));
  const [erro, setErro] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  const handleExcluir = async () => {
    if (!turma) return;
    setExcluindo(true);
    setErro('');
    try {
      const { excluidos } = await escolaApi.limparTurma(turma.id);
      onToast({ type: 'success', title: 'Turma limpa', message: `${excluidos} alunos removidos de ${turma.nome}.` });
      await onDone();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <AdminModal
      title="Excluir Alunos em Massa"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className={btnSecondary}>Cancelar</button>
          {etapa === 1 ? (
            <button onClick={() => setEtapa(2)} disabled={!turma} className={btnDanger}>EXCLUIR TUDO</button>
          ) : (
            <button onClick={handleExcluir} disabled={confirmacao !== 'EXCLUIR' || excluindo} className={btnDanger}>{excluindo ? 'Excluindo…' : 'Confirmar Exclusão'}</button>
          )}
        </>
      }
    >
      {etapa === 1 ? (
        <div className="space-y-4">
          <p className="text-sm text-red-600 flex gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span><strong>ATENÇÃO:</strong> esta ação excluirá TODOS os alunos da turma selecionada, incluindo suas notas. É irreversível.</span>
          </p>
          <div>
            <label className={labelCls}>Selecione a Turma para Limpar</label>
            <select className={inputCls} value={turmaId} onChange={e => setTurmaId(e.target.value)}>
              <option value="">Escolha a turma...</option>
              {turmas.map(t => (
                <option key={t.id} value={t.id}>{t.nome} ({contagem[t.id] || 0} alunos)</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            Digite <strong className="font-mono">EXCLUIR</strong> para confirmar a remoção de {contagem[turma!.id] || 0} alunos de <strong>{turma!.nome}</strong>:
          </p>
          <input className={`${inputCls} font-mono`} value={confirmacao} onChange={e => setConfirmacao(e.target.value)} autoFocus />
          {erro && <p role="alert" className="text-sm font-medium text-red-600">{erro}</p>}
        </div>
      )}
    </AdminModal>
  );
};

// ─── Confirmação genérica ─────────────────────────────────────────────

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, message, confirmLabel, onConfirm, onClose }) => (
  <AdminModal
    title={title}
    onClose={onClose}
    size="sm"
    footer={
      <>
        <button onClick={onClose} className={btnSecondary}>Cancelar</button>
        <button onClick={onConfirm} className={btnDanger}>{confirmLabel}</button>
      </>
    }
  >
    <p className="text-sm text-slate-700 dark:text-slate-200">{message}</p>
  </AdminModal>
);
