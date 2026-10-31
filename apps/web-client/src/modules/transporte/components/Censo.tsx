import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, ListChecks, Save, Search, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardContent, ConfirmDialog, Input, Select, Switch } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { mensagemDeErro, transporteApi, type CampoCenso, type ModeloExportacao, type Opcoes, type PreValidacao } from '../api';
import { ROTULO_GRUPO_CENSO, ROTULO_AVISO, ROTULO_PENDENCIA, rotuloDe } from '../formato';

const NENHUM = '0';

/** Entrega o arquivo ao navegador; o servidor não guarda cópia. */
function entregar(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Censo (Registro 60): campos a exportar, modelos, pré-validação e arquivos. Hoje no leiaute básico em CSV. */
export const Censo: React.FC<{ opcoes: Opcoes; avisar: Toast }> = ({ opcoes, avisar }) => {
  const leiautes = useCarga(() => transporteApi.leiautes(), []);
  const modelos = useCarga(() => transporteApi.modelos(), []);
  const [ano, setAno] = useState(String(opcoes.anos_letivos[0] ?? new Date().getFullYear()));
  const [escolhidos, setEscolhidos] = useState<Set<string> | null>(null);
  const [confirmados, setConfirmados] = useState<Set<string>>(new Set());
  const [pedindo, setPedindo] = useState<CampoCenso | null>(null);
  const [busca, setBusca] = useState('');
  const [modeloId, setModeloId] = useState(NENHUM);
  const [nomeModelo, setNomeModelo] = useState('');
  const [resultado, setResultado] = useState<PreValidacao | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const leiaute = leiautes.dados?.[0] ?? null;
  const campos = leiaute?.campos ?? [];

  // Primeira seleção: o modelo padrão do tenant (campos não sensíveis).
  useEffect(() => {
    if (escolhidos !== null || !modelos.dados) return;
    const padrao = modelos.dados.find((m) => m.padrao);
    if (padrao) { setEscolhidos(new Set(padrao.campos)); setModeloId(String(padrao.id)); }
  }, [modelos.dados, escolhidos]);

  const marcados = useMemo(() => {
    const m = new Set(escolhidos ?? []);
    campos.filter((c) => c.obrigatorio).forEach((c) => m.add(c.chave));
    return m;
  }, [escolhidos, campos]);

  const alternar = (campo: CampoCenso) => {
    if (campo.obrigatorio) {
      avisar({ type: 'info', title: 'Campo obrigatório', message: `"${campo.rotulo}" é exigido pelo leiaute e não pode ser desmarcado.` });
      return;
    }
    if (marcados.has(campo.chave)) {
      setEscolhidos((e) => { const n = new Set(e); n.delete(campo.chave); return n; });
      setConfirmados((c) => { const n = new Set(c); n.delete(campo.chave); return n; });
    } else if (campo.sensivel) {
      setPedindo(campo);
    } else {
      setEscolhidos((e) => new Set(e).add(campo.chave));
    }
  };

  const corpo = () => ({
    ano_letivo: Number(ano),
    leiaute: leiaute?.chave,
    campos: [...marcados],
    confirmar_sensiveis: [...confirmados].filter((c) => marcados.has(c)),
  });

  const executar = async (acao: () => Promise<void>) => {
    setOcupado(true);
    try { await acao(); } catch (e) { avisar({ type: 'error', title: 'Censo', message: mensagemDeErro(e) }); } finally { setOcupado(false); }
  };

  const aplicarModelo = async (id: string) => {
    setModeloId(id);
    if (id === NENHUM || !leiaute) return;
    await executar(async () => {
      const r = await transporteApi.aplicarModelo(Number(id), leiaute.chave);
      setEscolhidos(new Set(r.campos));
      setConfirmados(new Set());
      if (r.ignorados.length > 0) {
        avisar({ type: 'info', title: 'Modelo', message: `O leiaute não tem estes campos do modelo, que foram ignorados: ${r.ignorados.join(', ')}.` });
      }
    });
  };

  const salvarModelo = () => executar(async () => {
    if (!leiaute || !nomeModelo.trim()) { avisar({ type: 'error', title: 'Modelo', message: 'Dê um nome ao modelo.' }); return; }
    const salvo = await transporteApi.salvarModelo(null, { nome: nomeModelo.trim(), leiaute: leiaute.chave, campos: [...marcados] });
    setNomeModelo('');
    setModeloId(String(salvo.id));
    avisar({ type: 'success', title: 'Modelo', message: `Modelo "${salvo.nome}" salvo.` });
    await modelos.recarregar();
  });

  const excluirModelo = (m: ModeloExportacao) => executar(async () => {
    await transporteApi.excluirModelo(m.id);
    setModeloId(NENHUM);
    avisar({ type: 'success', title: 'Modelo', message: `Modelo "${m.nome}" excluído.` });
    await modelos.recarregar();
  });

  const preValidar = () => executar(async () => { setResultado(await transporteApi.preValidar(corpo())); });

  const baixar = (tipo: 'arquivo' | 'conferencia') => executar(async () => {
    const { blob, nome } = await transporteApi.baixarCenso(tipo, corpo());
    entregar(blob, nome);
    avisar({ type: 'success', title: 'Censo', message: `Arquivo "${nome}" gerado. O servidor não guarda cópia.` });
  });

  const modeloAtual = modelos.dados?.find((m) => String(m.id) === modeloId) ?? null;
  const filtrados = campos.filter((c) => c.rotulo.toLowerCase().includes(busca.toLowerCase()) || c.chave.includes(busca.toLowerCase()));
  const grupos = ['identificacao', 'matricula', 'transporte'].map((g) => ({ grupo: g, campos: filtrados.filter((c) => c.grupo === g) })).filter((g) => g.campos.length > 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40"><Select label="Ano letivo" value={ano} onChange={setAno} options={opcoes.anos_letivos.map((a) => ({ value: String(a), label: String(a) }))} /></div>
            <p className="text-sm text-muted-foreground">Leiaute: <strong className="text-foreground">{leiaute?.nome ?? '…'}</strong></p>
          </div>
          {leiaute && (
            <p role="note" className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              {leiaute.descricao} Este não é o leiaute oficial do Inep: ele será adequado ao Educacenso quando o órgão obtiver o documento do ano do Censo.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-sm font-semibold">Campos a exportar</h2>
            <div className="flex flex-wrap items-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEscolhidos(new Set(campos.filter((c) => !c.sensivel).map((c) => c.chave)))}>Marcar todos (sem sensíveis)</Button>
              <Button variant="outline" size="sm" onClick={() => { setEscolhidos(new Set()); setConfirmados(new Set()); }}>Limpar</Button>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Input label="Buscar campo" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <Search className="mb-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <EstadoCarga carregando={leiautes.carregando && !leiautes.dados} erro={leiautes.erro} onTentar={() => void leiautes.recarregar()} />
          {grupos.map((g) => (
            <fieldset key={g.grupo} className="space-y-1">
              <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-foreground/70">{ROTULO_GRUPO_CENSO[g.grupo]}</legend>
              <div className="grid gap-1 sm:grid-cols-2">
                {g.campos.map((c) => (
                  <label key={c.chave} className="flex cursor-pointer items-start gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50">
                    <input type="checkbox" className="mt-1" checked={marcados.has(c.chave)} onChange={() => alternar(c)} aria-describedby={`dica-${c.chave}`} />
                    <span>
                      {c.rotulo}
                      <span id={`dica-${c.chave}`} className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                        {c.obrigatorio && <Badge variant="secondary">exigido pelo leiaute</Badge>}
                        {c.sensivel && <Badge variant="destructive">sensível</Badge>}
                        {!c.confere && <Badge variant="outline">só no arquivo</Badge>}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">Modelos de exportação</h2>
          <EstadoCarga carregando={modelos.carregando && !modelos.dados} erro={modelos.erro} onTentar={() => void modelos.recarregar()} />
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-72">
              <Select label="Modelo" value={modeloId} onChange={(v) => void aplicarModelo(v)}
                options={[{ value: NENHUM, label: 'Seleção atual' }, ...(modelos.dados ?? []).map((m) => ({ value: String(m.id), label: m.padrao ? `${m.nome} (padrão)` : m.nome }))]} />
            </div>
            {modeloAtual && !modeloAtual.padrao && <Button variant="outline" onClick={() => void excluirModelo(modeloAtual)} disabled={ocupado}><Trash2 className="mr-1 h-4 w-4" />Excluir modelo</Button>}
            <div className="w-64"><Input label="Salvar a seleção como" value={nomeModelo} maxLength={100} onChange={(e) => setNomeModelo(e.target.value)} /></div>
            <Button variant="outline" onClick={() => void salvarModelo()} disabled={ocupado}><Save className="mr-1 h-4 w-4" />Salvar modelo</Button>
          </div>
          <p className="text-xs text-muted-foreground">O modelo padrão tem todos os campos não sensíveis e não pode ser alterado nem excluído. Campos sensíveis pedem confirmação a cada seleção.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void preValidar()} disabled={ocupado || !leiaute}><ListChecks className="mr-1 h-4 w-4" />Pré-validar</Button>
            <Button onClick={() => void baixar('arquivo')} disabled={ocupado || !leiaute}><Download className="mr-1 h-4 w-4" />Gerar arquivo do Censo</Button>
            <Button variant="outline" onClick={() => void baixar('conferencia')} disabled={ocupado || !leiaute}><FileSpreadsheet className="mr-1 h-4 w-4" />CSV de conferência</Button>
          </div>
          {resultado && <ResultadoPreValidacao r={resultado} />}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pedindo !== null}
        onClose={() => setPedindo(null)}
        title="Campo sensível"
        description={`"${pedindo?.rotulo ?? ''}" é dado sensível. Ele sairá no arquivo, a escolha fica registrada na auditoria e o arquivo contém dados de crianças. Confirmar?`}
        confirmLabel="Confirmar e incluir"
        requireReason={false}
        onConfirm={() => {
          const campo = pedindo;
          setPedindo(null);
          if (campo) {
            setEscolhidos((e) => new Set(e).add(campo.chave));
            setConfirmados((c) => new Set(c).add(campo.chave));
          }
        }}
      />
    </div>
  );
};

const ResultadoPreValidacao: React.FC<{ r: PreValidacao }> = ({ r }) => (
  <div className="space-y-3" role="region" aria-label="Resultado da pré-validação">
    <p className="flex flex-wrap items-center gap-2 text-sm">
      {r.approved ? <Badge variant="outline">Sem pendências</Badge> : <Badge variant="destructive">{r.pendencias.length} pendência(s)</Badge>}
      <span className="text-muted-foreground">{r.total_linhas} linha(s) no arquivo de {r.ano_letivo}. A geração do arquivo não fica bloqueada por pendências.</span>
    </p>
    {r.campos_ignorados.length > 0 && <p className="text-xs text-muted-foreground">Campos ignorados (o leiaute não os tem): {r.campos_ignorados.join(', ')}.</p>}
    {r.pendencias.length > 0 && (
      <ul className="space-y-1 text-sm">
        {r.pendencias.map((p, i) => (
          <li key={`${p.tipo}-${p.aluno_id ?? p.campo}-${i}`} className="rounded border border-destructive/30 bg-destructive/10 px-3 py-1.5">
            <strong>{rotuloDe(ROTULO_PENDENCIA, p.tipo)}</strong>
            {p.aluno && <span>: {p.aluno}{p.rota ? ` (rota ${p.rota})` : ''}</span>}
            {p.rotulo && <span>: {p.rotulo}</span>}
          </li>
        ))}
      </ul>
    )}
    {r.avisos.length > 0 && (
      <ul className="space-y-1 text-sm">
        {r.avisos.map((a, i) => (
          <li key={`${a.tipo}-${a.aluno_id}-${i}`} className="rounded border border-border bg-muted/40 px-3 py-1.5">
            <strong>Aviso:</strong> {rotuloDe(ROTULO_AVISO, a.tipo)}: {a.aluno}{a.rota ? ` (rota ${a.rota})` : ''}
          </li>
        ))}
      </ul>
    )}
  </div>
);
