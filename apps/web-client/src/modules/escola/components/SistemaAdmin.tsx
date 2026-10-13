import React, { useState } from 'react';
import { School, CalendarDays, Pencil, Trash2, Database, Mail, Send, ImageIcon, Info } from 'lucide-react';

import { useArquivoAutenticado } from '@/hooks/useArquivoAutenticado';

import { escolaApi, erroApi, type Unidade } from '../api';
import { pedagogicoApi, type Cronograma } from '../../pedagogico/api';
import { useCarga } from '../useCarga';
import AdminModal, { inputCls, labelCls, btnPrimary, btnSecondary, EstadoCarga, type Toast } from './AdminModal';
import { ConfirmModal } from './AlunoModals';

type ModalState =
  | { kind: 'escola' }
  | { kind: 'cronograma'; item: Cronograma | null }
  | { kind: 'excluir'; item: Cronograma }
  | null;

const formatarData = (iso: string) => {
  const [a, m, d] = iso.split('-');
  return a && m && d ? `${d}/${m}/${a}` : '-';
};

// Situação calculada pela API (mesma regra do sistema original)
const SITUACAO: Record<Cronograma['situacao'], { label: string; cls: string }> = {
  arquivo: { label: 'Arquivo', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  agendado: { label: 'Agendado', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  ativo: { label: 'Ativo', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  encerrado: { label: 'Encerrado', cls: 'bg-red-50 text-red-600 border-red-200' },
};

interface SistemaAdminProps {
  onToast: Toast;
}

export const SistemaAdmin: React.FC<SistemaAdminProps> = ({ onToast }) => {
  const unidade = useCarga(escolaApi.unidade);
  const cronogramas = useCarga(pedagogicoApi.cronogramas);
  const [versaoLogo, setVersaoLogo] = useState(0);
  const { src: logo } = useArquivoAutenticado(unidade.dados?.tem_logo ? `${escolaApi.urlLogo}?v=${versaoLogo}` : null);
  const [modal, setModal] = useState<ModalState>(null);

  const excluirCronograma = async (c: Cronograma) => {
    try {
      await pedagogicoApi.excluirCronograma(c.id);
      onToast({ type: 'success', title: 'Data excluída', message: `Período do ${c.periodo}º trimestre de ${c.ano_letivo} removido.` });
    } catch (e) {
      onToast({ type: 'error', title: 'Não foi possível excluir', message: erroApi(e).mensagem });
    }
    setModal(null);
    await cronogramas.recarregar();
  };

  return (
    <div className="space-y-6">
      {/* Configurações da Unidade */}
      <section className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-indigo-600 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <School className="w-5 h-5" /> Configurações da Unidade
          </h2>
          <button
            onClick={() => setModal({ kind: 'escola' })}
            disabled={!unidade.dados}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Editar Dados da Escola
          </button>
        </div>
        {unidade.carregando || unidade.erro ? (
          <EstadoCarga carregando={unidade.carregando} erro={unidade.erro} onTentar={unidade.recarregar} />
        ) : (
          <div className="flex flex-wrap items-center gap-6">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
              {logo ? (
                <img src={logo} alt={`Logo ${unidade.dados?.nome ?? ''}`} className="max-w-full max-h-full object-contain" />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{unidade.dados?.nome}</h3>
              <p className="text-sm text-slate-500 mt-1">Este nome e logo aparecerão em todos os relatórios gerados por esta unidade.</p>
            </div>
          </div>
        )}
      </section>

      {/* Datas do Pré-Conselho */}
      <section className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-indigo-600 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <CalendarDays className="w-5 h-5" /> Datas do Pré-Conselho
          </h2>
          <button onClick={() => setModal({ kind: 'cronograma', item: null })} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500">
            Nova Data / Período
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <th className="px-3 py-3">Ano</th>
                <th className="px-3 py-3">Período</th>
                <th className="px-3 py-3">Início</th>
                <th className="px-3 py-3">Fim</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {cronogramas.carregando || cronogramas.erro ? (
                <tr><td colSpan={6}><EstadoCarga carregando={cronogramas.carregando} erro={cronogramas.erro} onTentar={cronogramas.recarregar} /></td></tr>
              ) : (cronogramas.dados ?? []).length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">Nenhuma data cadastrada.</td></tr>
              ) : (cronogramas.dados ?? []).map(c => {
                const st = SITUACAO[c.situacao];
                const rotulo = `${c.periodo}º Trimestre`;
                return (
                  <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-3 font-mono text-slate-700 dark:text-slate-300">{c.ano_letivo}</td>
                    <td className="px-3 py-3 font-bold text-slate-900 dark:text-white">{rotulo}</td>
                    <td className="px-3 py-3 font-mono text-slate-700 dark:text-slate-300">{formatarData(c.data_inicio)}</td>
                    <td className="px-3 py-3 font-mono text-slate-700 dark:text-slate-300">{formatarData(c.data_fim)}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-semibold ${st.cls}`}>
                        {c.situacao === 'arquivo' ? `Arquivo (${c.ano_letivo})` : st.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => setModal({ kind: 'cronograma', item: c })} title="Editar" aria-label={`Editar ${rotulo} de ${c.ano_letivo}`} className="w-9 h-7 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setModal({ kind: 'excluir', item: c })} title="Excluir" aria-label={`Excluir ${rotulo} de ${c.ano_letivo}`} className="w-9 h-7 rounded-lg flex items-center justify-center bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Backup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="flex flex-col items-center text-center p-8 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="w-14 h-14 rounded-full flex items-center justify-center bg-sky-100 text-sky-500 mb-5">
            <Database className="w-6 h-6" />
          </span>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Backup do Banco de Dados</h3>
          <p className="text-sm text-slate-500 mt-1">
            Os dados ficam no banco do servidor. O backup completo (todas as unidades e módulos) é gerado pela equipe
            técnica no servidor, com o comando <code className="font-mono">./sysgov.sh backup</code>.
          </p>
        </section>

        <section className="flex flex-col items-center text-center p-8 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
          <span className="w-14 h-14 rounded-full flex items-center justify-center bg-rose-100 text-rose-600 mb-5">
            <Mail className="w-6 h-6" />
          </span>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Backup por E-mail</h3>
          <p className="text-sm text-slate-500 mt-1 mb-6">Receba o arquivo de backup diretamente na sua caixa de entrada.</p>
          <input type="email" disabled placeholder="Seu e-mail..." className={`${inputCls} mb-3 disabled:opacity-60`} aria-label="E-mail para backup" />
          <button disabled className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-rose-600 text-white opacity-50 cursor-not-allowed">
            <Send className="w-4 h-4" /> Enviar por E-mail
          </button>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500 text-left">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Ainda não disponível: o envio de e-mail precisa ser implementado no servidor.
          </p>
        </section>
      </div>

      {modal?.kind === 'escola' && unidade.dados && (
        <EscolaFormModal
          unidade={unidade.dados}
          logoAtual={logo}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await unidade.recarregar();
            setVersaoLogo((v) => v + 1);
          }}
          onToast={onToast}
        />
      )}
      {modal?.kind === 'cronograma' && (
        <CronogramaFormModal
          item={modal.item}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await cronogramas.recarregar();
          }}
          onToast={onToast}
        />
      )}
      {modal?.kind === 'excluir' && (
        <ConfirmModal
          title="Excluir data?"
          message={`Excluir o período do ${modal.item.periodo}º trimestre de ${modal.item.ano_letivo}?`}
          confirmLabel="Sim, excluir"
          onConfirm={() => excluirCronograma(modal.item)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

// ─── Editar Dados da Escola (nome + logo) ──────────────────────────────

interface EscolaFormModalProps {
  unidade: Unidade;
  logoAtual: string | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onToast: Toast;
}

const EscolaFormModal: React.FC<EscolaFormModalProps> = ({ unidade, logoAtual, onClose, onSaved, onToast }) => {
  const [nome, setNome] = useState(unidade.nome);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(logoAtual);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const escolherLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setArquivo(file);
    setPrevia(file ? URL.createObjectURL(file) : logoAtual);
    setErro('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return setErro('Informe o nome da escola.');
    setSalvando(true);
    try {
      await escolaApi.salvarUnidade(nome.trim());
      if (arquivo) await escolaApi.enviarLogo(arquivo);
      onToast({ type: 'success', title: 'Dados da escola atualizados', message: `${nome.trim()} salva com sucesso.` });
      await onSaved();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AdminModal
      title="Editar Escola"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" form="form-escola" className={btnPrimary} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </>
      }
    >
      <form id="form-escola" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="esc-nome">Nome</label>
          <input id="esc-nome" className={inputCls} value={nome} onChange={e => { setNome(e.target.value); setErro(''); }} autoFocus required />
        </div>
        <div>
          <label className={labelCls} htmlFor="esc-logo">Logo (PNG, JPEG ou WEBP, até 2 MB)</label>
          <div className="flex items-center gap-3">
            {previa && <img src={previa} alt="" className="w-14 h-14 rounded-lg object-contain border border-slate-200 bg-white" />}
            <input id="esc-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={escolherLogo} className="text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-semibold" />
          </div>
        </div>
        {erro && <p role="alert" className="text-sm font-medium text-red-600">{erro}</p>}
      </form>
    </AdminModal>
  );
};

// ─── Nova / Editar Data do Pré-Conselho ────────────────────────────────

interface CronogramaFormModalProps {
  item: Cronograma | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onToast: Toast;
}

const CronogramaFormModal: React.FC<CronogramaFormModalProps> = ({ item, onClose, onSaved, onToast }) => {
  const [ano, setAno] = useState(String(item?.ano_letivo ?? new Date().getFullYear()));
  const [periodo, setPeriodo] = useState<number>(item?.periodo ?? 1);
  const [inicio, setInicio] = useState(item?.data_inicio || '');
  const [fim, setFim] = useState(item?.data_fim || '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const anoNum = parseInt(ano, 10);
    if (Number.isNaN(anoNum)) return setErro('Informe o ano letivo.');
    if (!inicio || !fim) return setErro('Informe as datas de início e fim.');
    if (fim < inicio) return setErro('A data de fim deve ser igual ou posterior à data de início.');
    setSalvando(true);
    try {
      await pedagogicoApi.salvarCronograma({ ano_letivo: anoNum, periodo, data_inicio: inicio, data_fim: fim }, item?.id);
      onToast({ type: 'success', title: item ? 'Data atualizada' : 'Data cadastrada', message: `Pré-conselho do ${periodo}º trimestre de ${anoNum} salvo.` });
      await onSaved();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AdminModal
      title={item ? 'Editar Cronograma' : 'Novo Cronograma'}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" form="form-cronograma" className={btnPrimary} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </>
      }
    >
      <form id="form-cronograma" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="cron-ano">Ano</label>
          <input id="cron-ano" type="number" min={2020} max={2100} className={`${inputCls} font-mono`} value={ano} onChange={e => { setAno(e.target.value); setErro(''); }} required />
        </div>
        <div>
          <label className={labelCls} htmlFor="cron-periodo">Período</label>
          <select id="cron-periodo" className={inputCls} value={periodo} onChange={e => setPeriodo(Number(e.target.value))}>
            {[1, 2, 3].map(p => <option key={p} value={p}>{p}º Trimestre</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="cron-inicio">Início</label>
            <input id="cron-inicio" type="date" className={inputCls} value={inicio} onChange={e => { setInicio(e.target.value); setErro(''); }} required />
          </div>
          <div>
            <label className={labelCls} htmlFor="cron-fim">Fim</label>
            <input id="cron-fim" type="date" min={inicio || undefined} className={inputCls} value={fim} onChange={e => { setFim(e.target.value); setErro(''); }} required />
          </div>
        </div>
        {erro && <p role="alert" className="text-sm font-medium text-red-600">{erro}</p>}
      </form>
    </AdminModal>
  );
};

export default SistemaAdmin;
