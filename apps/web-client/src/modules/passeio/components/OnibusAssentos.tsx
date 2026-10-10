import React, { useState } from 'react';
import { Bus, Pencil, Plus, Printer, Trash2, Wand2 } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Modal, Select, cn } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { passeioApi, type DadosVeiculo, type MapaAssentos, type Veiculo } from '../api';
import { CAPACIDADES_COMUNS, distribuir, semAssento } from '../formato';
import type { PropsAba } from '../ModuloPasseioMain';

type Clique = { veiculo: Veiculo; numero: number; ocupante: MapaAssentos['ocupados'][number] | null };

/** Veículos do passeio e mapa de assentos: clique no lugar livre para sentar um aluno, no ocupado para liberar. */
export const OnibusAssentos: React.FC<PropsAba> = ({ ativo, dados, recarregar, avisar, permissoes, irPara }) => {
  const [veiculo, setVeiculo] = useState<Veiculo | 'novo' | null>(null);
  const [excluir, setExcluir] = useState<Veiculo | null>(null);
  const [clique, setClique] = useState<Clique | null>(null);
  const [distribuindo, setDistribuindo] = useState(false);
  const pendentes = semAssento(dados.inscricoes, dados.mapas);
  const plano = distribuir(dados.inscricoes, dados.veiculos, dados.mapas);

  const executar = async (acao: () => Promise<unknown>, falha: string) => {
    try {
      await acao();
      await recarregar();
    } catch (e) {
      avisar({ type: 'error', title: falha, message: erroApi(e).mensagem });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-mono tabular-nums">{dados.indicadores.assentos_ocupados}</span> de <span className="font-mono tabular-nums">{dados.indicadores.alunos_que_vao}</span> alunos que vão já têm assento ·
            capacidade da frota <span className="font-mono tabular-nums">{dados.indicadores.capacidade_total}</span>
            {pendentes.length > 0 && <> · <strong className="text-foreground">{pendentes.length} sem assento</strong></>}
          </p>
          {permissoes.frota && (
            <div className="flex gap-2">
              <Button variant="outline" leftIcon={<Wand2 className="h-4 w-4" />} disabled={plano.length === 0} onClick={() => setDistribuindo(true)}>Distribuir automaticamente</Button>
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setVeiculo('novo')}>Novo veículo</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {dados.veiculos.length === 0 ? (
        <EmptyState icon={<Bus className="h-8 w-8" />} title="Nenhum veículo neste passeio" description="Cadastre os ônibus locados para marcar os assentos e imprimir as listas de embarque." />
      ) : (
        dados.veiculos.map((v) => {
          const mapa = dados.mapas.find((m) => m.veiculo_id === v.id) ?? { veiculo_id: v.id, capacidade: v.capacidade, ocupados: [] };
          const porNumero = new Map(mapa.ocupados.map((o) => [o.numero, o]));
          return (
            <Card key={v.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {v.cor && <span className="inline-block h-3 w-3 rounded-full border border-border" style={{ backgroundColor: v.cor }} aria-hidden />}
                    {v.identificacao}
                    <span className="font-mono text-sm font-normal tabular-nums text-muted-foreground">{v.placa ? `${v.placa} · ` : ''}{mapa.ocupados.length}/{v.capacidade}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Button size="sm" variant="outline" leftIcon={<Printer className="h-4 w-4" />} aria-label={`Imprimir lista do ${v.identificacao}`} onClick={() => irPara('relatorios', { relatorio: 'manifesto', onibus: String(v.id) })}>Imprimir lista</Button>
                    {permissoes.frota && (
                      <>
                        <Button size="icon-sm" variant="ghost" aria-label={`Editar ${v.identificacao}`} onClick={() => setVeiculo(v)}><Pencil /></Button>
                        <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${v.identificacao}`} onClick={() => setExcluir(v)}><Trash2 /></Button>
                      </>
                    )}
                  </span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">Motorista: {v.motorista ?? 'a definir'}{v.telefone ? ` · ${v.telefone}` : ''}</p>
              </CardHeader>
              <CardContent>
                {/* Dois lugares, corredor, dois lugares — como no ônibus. */}
                <div className="grid max-w-xl grid-cols-[1fr_1fr_1.25rem_1fr_1fr] gap-1.5" role="group" aria-label={`Assentos do ${v.identificacao}`}>
                  {Array.from({ length: v.capacidade }, (_, k) => k + 1).map((n) => {
                    const ocupante = porNumero.get(n) ?? null;
                    const posicao = (n - 1) % 4;
                    return (
                      <React.Fragment key={n}>
                        {posicao === 2 && <span aria-hidden />}
                        <Button
                          size="sm"
                          variant={ocupante ? 'primary' : 'outline'}
                          className={cn('h-auto min-h-12 flex-col gap-0 px-1 py-1 text-xs', !permissoes.frota && 'pointer-events-none')}
                          title={ocupante ? `${ocupante.aluno ?? ''} — ${ocupante.turma ?? ''}` : 'Livre'}
                          aria-label={ocupante ? `Assento ${n}: ${ocupante.aluno}` : `Assento ${n}: livre`}
                          onClick={() => permissoes.frota && setClique({ veiculo: v, numero: n, ocupante })}
                        >
                          <span className="font-mono font-bold tabular-nums">{String(n).padStart(2, '0')}</span>
                          <span className="w-full truncate">{ocupante ? ocupante.aluno?.split(' ')[0] : 'livre'}</span>
                        </Button>
                      </React.Fragment>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      <VeiculoModal veiculo={veiculo} passeioId={ativo.id} onFechar={() => setVeiculo(null)} onSalvo={async (nome) => { setVeiculo(null); avisar({ type: 'success', title: 'Veículo salvo', message: nome }); await recarregar(); }} />
      <AssentoModal
        clique={clique}
        candidatos={pendentes}
        onFechar={() => setClique(null)}
        onOcupar={async (alunoId) => {
          if (!clique) return;
          await executar(() => passeioApi.ocuparAssento(clique.veiculo.id, clique.numero, alunoId), 'Não foi possível marcar o assento');
          setClique(null);
        }}
        onLiberar={async () => {
          if (!clique) return;
          await executar(() => passeioApi.liberarAssento(clique.veiculo.id, clique.numero), 'Não foi possível liberar o assento');
          setClique(null);
        }}
      />
      <ConfirmarModal
        aberto={excluir !== null}
        titulo="Excluir veículo"
        mensagem={<>Excluir <strong>{excluir?.identificacao}</strong>? Os assentos marcados nele ficam livres.</>}
        rotuloConfirmar="Excluir"
        perigo
        onFechar={() => setExcluir(null)}
        onConfirmar={() => executar(() => passeioApi.excluirVeiculo((excluir as Veiculo).id), 'Não foi possível excluir o veículo')}
      />
      <ConfirmarModal
        aberto={distribuindo}
        titulo="Distribuir automaticamente"
        mensagem={<>Sentar <strong>{plano.length}</strong> aluno(s) sem assento nos lugares livres, mantendo as turmas juntas.{pendentes.length > plano.length && <> Faltam lugares para <strong>{pendentes.length - plano.length}</strong> aluno(s).</>} Assentos já marcados não mudam.</>}
        rotuloConfirmar="Distribuir"
        onFechar={() => setDistribuindo(false)}
        onConfirmar={async () => {
          let feitos = 0;
          try {
            for (const p of plano) {
              await passeioApi.ocuparAssento(p.veiculoId, p.numero, p.alunoId);
              feitos++;
            }
            avisar({ type: 'success', title: 'Assentos distribuídos', message: `${feitos} aluno(s) sentados.` });
          } catch (e) {
            avisar({ type: 'error', title: `Distribuição parou em ${feitos} aluno(s)`, message: erroApi(e).mensagem });
          } finally {
            await recarregar();
          }
        }}
      />
    </div>
  );
};

const AssentoModal: React.FC<{
  clique: Clique | null;
  candidatos: PropsAba['dados']['inscricoes'];
  onFechar: () => void;
  onOcupar: (alunoId: number) => Promise<void>;
  onLiberar: () => Promise<void>;
}> = ({ clique, candidatos, onFechar, onOcupar, onLiberar }) => {
  const [alunoId, setAlunoId] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const agir = async (acao: () => Promise<void>) => {
    setEnviando(true);
    try {
      await acao();
    } finally {
      setEnviando(false);
      setAlunoId(null);
    }
  };
  const titulo = clique ? `${clique.veiculo.identificacao} — assento ${clique.numero}` : '';
  return (
    <Modal
      open={clique !== null}
      onClose={onFechar}
      title={titulo}
      icon={<Bus className="h-5 w-5" />}
      size="md"
      footer={clique?.ocupante
        ? <><Button variant="outline" onClick={onFechar} disabled={enviando}>Fechar</Button><Button variant="destructive" isLoading={enviando} onClick={() => void agir(onLiberar)}>Liberar assento</Button></>
        : <><Button variant="outline" onClick={onFechar} disabled={enviando}>Cancelar</Button><Button isLoading={enviando} disabled={alunoId === null} onClick={() => alunoId !== null && void agir(() => onOcupar(alunoId))}>Marcar assento</Button></>}
    >
      {clique?.ocupante ? (
        <p className="text-sm">Ocupado por <strong>{clique.ocupante.aluno}</strong>{clique.ocupante.turma ? ` (${clique.ocupante.turma})` : ''}.</p>
      ) : (
        <Select
          label="Aluno"
          value={alunoId}
          placeholder={candidatos.length ? 'Escolha um aluno sem assento' : 'Todos os alunos que vão já têm assento'}
          onChange={(v) => setAlunoId(Number(v))}
          options={candidatos.map((i) => ({ value: i.aluno_id, label: `${i.aluno?.nome ?? 'Aluno'} — ${i.aluno?.turma?.nome ?? 'sem turma'}` }))}
          disabled={candidatos.length === 0}
        />
      )}
    </Modal>
  );
};

const VAZIO: DadosVeiculo = { identificacao: '', placa: null, motorista: null, telefone: null, capacidade: 46, cor: null };

const VeiculoModal: React.FC<{ veiculo: Veiculo | 'novo' | null; passeioId: number; onFechar: () => void; onSalvo: (nome: string) => Promise<void> }> = ({ veiculo, passeioId, onFechar, onSalvo }) => {
  const [form, setForm] = useState<DadosVeiculo>(VAZIO);
  const [atual, setAtual] = useState<Veiculo | 'novo' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  if (veiculo !== atual) {
    setAtual(veiculo);
    setForm(veiculo && veiculo !== 'novo' ? { identificacao: veiculo.identificacao, placa: veiculo.placa, motorista: veiculo.motorista, telefone: veiculo.telefone, capacidade: veiculo.capacidade, cor: veiculo.cor } : VAZIO);
    setErro(null);
  }
  const texto = (campo: keyof DadosVeiculo) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSalvando(true);
    setErro(null);
    const dados = { ...form, placa: form.placa?.trim() || null, motorista: form.motorista?.trim() || null, telefone: form.telefone?.trim() || null, cor: form.cor || null, capacidade: Number(form.capacidade) };
    try {
      if (veiculo === 'novo') await passeioApi.criarVeiculo(passeioId, dados);
      else if (veiculo) await passeioApi.atualizarVeiculo(veiculo.id, dados);
      await onSalvo(dados.identificacao);
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      open={veiculo !== null}
      onClose={onFechar}
      title={veiculo === 'novo' ? 'Novo veículo' : 'Editar veículo'}
      icon={<Bus className="h-5 w-5" />}
      size="lg"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button type="submit" form="form-veiculo" isLoading={salvando}>Salvar</Button></>}
    >
      <form id="form-veiculo" onSubmit={salvar} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
          <Input label="Identificação *" placeholder="Ex.: Ônibus 01" value={form.identificacao} onChange={texto('identificacao')} required maxLength={150} />
          <Input label="Placa" value={form.placa ?? ''} onChange={texto('placa')} maxLength={10} className="font-mono uppercase tabular-nums" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Motorista" value={form.motorista ?? ''} onChange={texto('motorista')} maxLength={200} />
          <Input label="Telefone do motorista" value={form.telefone ?? ''} onChange={texto('telefone')} maxLength={30} className="font-mono tabular-nums" />
        </div>
        <div className="grid items-end gap-3 sm:grid-cols-[10rem_1fr_8rem]">
          <Input label="Lugares *" type="number" min={1} max={100} value={form.capacidade} onChange={(e) => setForm((f) => ({ ...f, capacidade: Number(e.target.value) }))} required className="font-mono tabular-nums" />
          <div className="flex flex-wrap gap-1" aria-label="Capacidades comuns">
            {CAPACIDADES_COMUNS.map((c) => (
              <Button key={c} type="button" size="xs" variant={form.capacidade === c ? 'primary' : 'outline'} onClick={() => setForm((f) => ({ ...f, capacidade: c }))} className="font-mono tabular-nums">{c}</Button>
            ))}
          </div>
          <Input label="Cor" type="color" value={form.cor ?? '#1351b4'} onChange={texto('cor')} />
        </div>
        {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
};
