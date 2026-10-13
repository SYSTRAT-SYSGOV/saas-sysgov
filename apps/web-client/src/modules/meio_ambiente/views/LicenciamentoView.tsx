import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Dialog, Input, Select, Textarea } from '@sysgov/ui';
import { FileCheck, Plus } from 'lucide-react';
import { useCan } from '@/core/rbac/useCan';
import {
  meioAmbienteApi,
  erroApi,
  type Empreendimento,
  type FaseLicenciamento,
  type ProcessoLicenciamento,
  type ResultadoVistoriaTecnica,
} from '../api';

const FASES: { value: FaseLicenciamento; label: string }[] = [
  { value: 'LP', label: 'Licença Prévia (LP)' },
  { value: 'LI', label: 'Licença de Instalação (LI)' },
  { value: 'LO', label: 'Licença de Operação (LO)' },
  { value: 'renovacao', label: 'Renovação' },
  { value: 'correcao', label: 'Correção' },
];

const STATUS_BADGE: Record<ProcessoLicenciamento['status'], 'success' | 'warning' | 'danger'> = {
  em_analise: 'warning',
  deferido: 'success',
  indeferido: 'danger',
};

export const LicenciamentoView: React.FC = () => {
  const { can } = useCan();
  const podeGerenciar = can('meio_ambiente.licenciamento.manage');

  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [empreendimentoId, setEmpreendimentoId] = useState<number | null>(null);
  const [processos, setProcessos] = useState<ProcessoLicenciamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modalNovo, setModalNovo] = useState(false);
  const [detalheId, setDetalheId] = useState<number | null>(null);

  useEffect(() => {
    void meioAmbienteApi.listarEmpreendimentos({ per_page: 100 }).then((r) => {
      setEmpreendimentos(r.data);
      if (r.data.length > 0) setEmpreendimentoId(r.data[0].id);
    });
  }, []);

  const carregarProcessos = useCallback(async () => {
    if (empreendimentoId === null) return;
    setLoading(true);
    setErro(null);
    try {
      setProcessos(await meioAmbienteApi.listarProcessosLicenciamento(empreendimentoId));
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setLoading(false);
    }
  }, [empreendimentoId]);

  useEffect(() => {
    void carregarProcessos();
  }, [carregarProcessos]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="w-80">
          <Select
            label="Empreendimento"
            value={empreendimentoId}
            onChange={(v) => setEmpreendimentoId(Number(v))}
            options={empreendimentos.map((e) => ({ value: e.id, label: e.razao_social ?? e.titular_nome ?? `#${e.id}` }))}
          />
        </div>
        {podeGerenciar && empreendimentoId !== null && (
          <Button size="sm" onClick={() => setModalNovo(true)}>
            <Plus className="mr-1 h-4 w-4" /> Novo Processo
          </Button>
        )}
      </div>

      {erro && <div className="mb-4 rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}

      <div className="grid gap-3">
        {!loading && processos.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum processo de licenciamento para este empreendimento.</Card>
        )}
        {processos.map((p) => (
          <Card key={p.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-mono font-medium">{p.numero}</div>
              <div className="text-xs text-muted-foreground">
                {p.validade_em ? `Validade: ${p.validade_em}` : 'Sem validade definida'}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={STATUS_BADGE[p.status]}>{p.status}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setDetalheId(p.id)}>
                <FileCheck className="mr-1 h-4 w-4" /> Detalhes
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {modalNovo && empreendimentoId !== null && (
        <NovoProcessoModal
          empreendimentoId={empreendimentoId}
          onClose={() => setModalNovo(false)}
          onCriado={() => {
            setModalNovo(false);
            void carregarProcessos();
          }}
        />
      )}

      {detalheId !== null && (
        <DetalheProcessoModal
          processoId={detalheId}
          podeGerenciar={podeGerenciar}
          onClose={() => setDetalheId(null)}
          onAtualizado={() => void carregarProcessos()}
        />
      )}
    </div>
  );
};

const NovoProcessoModal: React.FC<{ empreendimentoId: number; onClose: () => void; onCriado: () => void }> = ({ empreendimentoId, onClose, onCriado }) => {
  const [fase, setFase] = useState<FaseLicenciamento>('LP');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await meioAmbienteApi.abrirProcessoLicenciamento(empreendimentoId, fase);
      onCriado();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Novo Processo de Licenciamento" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={salvando}>{salvando ? 'Abrindo...' : 'Abrir Processo'}</Button>
      </>
    }>
      <div className="space-y-4">
        {erro && <div className="rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}
        <Select label="Fase" value={fase} onChange={(v) => setFase(v as FaseLicenciamento)} options={FASES} />
      </div>
    </Dialog>
  );
};

const DetalheProcessoModal: React.FC<{ processoId: number; podeGerenciar: boolean; onClose: () => void; onAtualizado: () => void }> = ({ processoId, podeGerenciar, onClose, onAtualizado }) => {
  const [processo, setProcesso] = useState<ProcessoLicenciamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [acao, setAcao] = useState<'condicionante' | 'documento' | 'vistoria' | null>(null);
  const [novaCondicionante, setNovaCondicionante] = useState({ descricao: '', prazo: '' });
  const [novoDocumentoTipo, setNovoDocumentoTipo] = useState('EIA_RIMA');
  const [novoDocumentoArquivo, setNovoDocumentoArquivo] = useState<File | null>(null);
  const [vistoriaResultado, setVistoriaResultado] = useState<ResultadoVistoriaTecnica>('favoravel');
  const [vistoriaParecer, setVistoriaParecer] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setProcesso(await meioAmbienteApi.obterProcessoLicenciamento(processoId));
    } catch (e) {
      setErro(erroApi(e).mensagem);
    }
  }, [processoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const executar = async (fn: () => Promise<unknown>) => {
    setSalvando(true);
    setErro(null);
    try {
      await fn();
      await carregar();
      onAtualizado();
      setAcao(null);
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  if (processo === null) {
    return (
      <Dialog open onClose={onClose} title="Processo de Licenciamento">
        {erro ? <div className="text-sm text-rose-400">{erro}</div> : <div className="text-sm text-muted-foreground">Carregando...</div>}
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} title={`Processo ${processo.numero}`} size="lg" footer={
      podeGerenciar && processo.status === 'em_analise' ? (
        <Button onClick={() => executar(() => meioAmbienteApi.deferirProcessoLicenciamento(processo.id, justificativa || undefined))} disabled={salvando}>
          Deferir Processo
        </Button>
      ) : undefined
    }>
      <div className="space-y-5">
        {erro && <div className="rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Condicionantes</h4>
            {podeGerenciar && <Button variant="ghost" size="sm" onClick={() => setAcao('condicionante')}>+ Adicionar</Button>}
          </div>
          {(processo.condicionantes ?? []).length === 0 && <p className="text-xs text-muted-foreground">Nenhuma condicionante.</p>}
          {(processo.condicionantes ?? []).map((c) => (
            <div key={c.id} className="flex items-center justify-between border-t py-2 text-sm">
              <span>{c.descricao} — prazo {c.prazo}</span>
              <div className="flex items-center gap-2">
                <Badge variant={c.situacao === 'cumprida' ? 'success' : 'warning'}>{c.situacao}</Badge>
                {podeGerenciar && c.situacao === 'pendente' && (
                  <Button variant="ghost" size="sm" onClick={() => executar(() => meioAmbienteApi.cumprirCondicionante(c.id))}>Marcar cumprida</Button>
                )}
              </div>
            </div>
          ))}
          {acao === 'condicionante' && (
            <div className="mt-2 space-y-2 rounded-md border p-3">
              <Input label="Descrição" value={novaCondicionante.descricao} onChange={(e) => setNovaCondicionante((d) => ({ ...d, descricao: e.target.value }))} />
              <Input label="Prazo" type="date" value={novaCondicionante.prazo} onChange={(e) => setNovaCondicionante((d) => ({ ...d, prazo: e.target.value }))} />
              <Button size="sm" disabled={salvando} onClick={() => executar(() => meioAmbienteApi.registrarCondicionante(processo.id, novaCondicionante))}>Salvar</Button>
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Documentos</h4>
            {podeGerenciar && <Button variant="ghost" size="sm" onClick={() => setAcao('documento')}>+ Anexar</Button>}
          </div>
          {(processo.documentos ?? []).length === 0 && <p className="text-xs text-muted-foreground">Nenhum documento anexado.</p>}
          {(processo.documentos ?? []).map((d) => (
            <div key={d.id} className="border-t py-2 text-sm">{d.tipo} — anexado em {new Date(d.anexado_em).toLocaleDateString('pt-BR')}</div>
          ))}
          {acao === 'documento' && (
            <div className="mt-2 space-y-2 rounded-md border p-3">
              <Input label="Tipo do documento" value={novoDocumentoTipo} onChange={(e) => setNovoDocumentoTipo(e.target.value)} />
              <input type="file" onChange={(e) => setNovoDocumentoArquivo(e.target.files?.[0] ?? null)} />
              <Button size="sm" disabled={salvando} onClick={() => executar(() => meioAmbienteApi.anexarDocumentoLicenciamento(processo.id, novoDocumentoTipo, novoDocumentoArquivo))}>Salvar</Button>
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Vistoria Técnica</h4>
            {podeGerenciar && <Button variant="ghost" size="sm" onClick={() => setAcao('vistoria')}>+ Registrar</Button>}
          </div>
          {acao === 'vistoria' && (
            <div className="mt-2 space-y-2 rounded-md border p-3">
              <Select label="Resultado" value={vistoriaResultado} onChange={(v) => setVistoriaResultado(v as ResultadoVistoriaTecnica)} options={[
                { value: 'favoravel', label: 'Favorável' },
                { value: 'desfavoravel', label: 'Desfavorável' },
              ]} />
              <Textarea placeholder="Parecer (opcional)" value={vistoriaParecer} onChange={(e) => setVistoriaParecer(e.target.value)} />
              <Button size="sm" disabled={salvando} onClick={() => executar(() => meioAmbienteApi.registrarVistoriaTecnica(processo.id, { resultado: vistoriaResultado, parecer: vistoriaParecer || undefined }))}>Salvar</Button>
            </div>
          )}
          <div className="mt-2">
            <Textarea placeholder="Justificativa (necessária apenas se o último parecer for desfavorável)" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
          </div>
        </section>
      </div>
    </Dialog>
  );
};
