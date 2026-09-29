import React, { useState } from 'react';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { AlertOctagon, ShieldAlert } from 'lucide-react';
import { cemiteriosApi, formatarData, type OperadorPenalidade } from '../api';
import { ErroBox, Mono, useAcao, useDados } from '../views/comum';

interface SancoesOperadorProps {
  operadorId: number;
  podeGerenciar: boolean;
}

const TIPO_LABELS: Record<OperadorPenalidade['tipo'], string> = {
  advertencia: 'Advertência',
  suspensao: 'Suspensão Temporária',
  descredenciamento: 'Descredenciamento',
};

const TIPO_OPTIONS = Object.entries(TIPO_LABELS).map(([value, label]) => ({ value, label }));

function sancaoVigente(s: OperadorPenalidade): boolean {
  if (s.tipo === 'descredenciamento') return true;
  const hoje = new Date().toISOString().slice(0, 10);
  return s.inicio <= hoje && (!s.fim || s.fim >= hoje);
}

/** Sanções administrativas de um coveiro/pedreiro: histórico e registro de nova sanção (spec: cadastro-operadores). */
export const SancoesOperador: React.FC<SancoesOperadorProps> = ({ operadorId, podeGerenciar }) => {
  const penalidades = useDados(() => cemiteriosApi.penalidadesOperador(operadorId), [operadorId]);
  const { erro, enviando, executar } = useAcao();
  const [modalAberto, setModalAberto] = useState(false);
  const [tipo, setTipo] = useState<OperadorPenalidade['tipo']>('advertencia');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [motivo, setMotivo] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);

  const sancionar = async () => {
    const resultado = await executar(() =>
      cemiteriosApi.sancionarOperador(operadorId, { tipo, inicio, fim: fim || undefined, motivo }, arquivo)
    );
    if (resultado !== null) {
      setModalAberto(false);
      setTipo('advertencia');
      setInicio('');
      setFim('');
      setMotivo('');
      setArquivo(null);
      await penalidades.recarregar();
    }
  };

  return (
    <div className="space-y-4">
      <ErroBox erro={erro} />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Sanções Administrativas</h3>
        {podeGerenciar && (
          <Button size="sm" variant="outline" onClick={() => setModalAberto(true)}>
            <ShieldAlert className="h-4 w-4 mr-1" /> Registrar Sanção
          </Button>
        )}
      </div>

      {penalidades.carregando ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Carregando sanções…</div>
      ) : (penalidades.dados ?? []).length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma sanção registrada.</div>
      ) : (
        <div className="space-y-2">
          {(penalidades.dados ?? []).map((s) => {
            const vigente = sancaoVigente(s);
            return (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-3">
                  <AlertOctagon className={`h-5 w-5 ${vigente ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{TIPO_LABELS[s.tipo]}</span>
                      {vigente && (
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                          Vigente
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <Mono>{formatarData(s.inicio)}</Mono>{s.fim ? <> até <Mono>{formatarData(s.fim)}</Mono></> : ''}
                    </div>
                    <div className="mt-1 text-xs text-foreground">{s.motivo}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title="Registrar Sanção Administrativa"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button size="sm" onClick={sancionar} disabled={enviando || !inicio || !motivo}>
              {enviando ? 'Enviando…' : 'Registrar'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Tipo de Sanção" required>
            <Select value={tipo} onChange={(v) => setTipo(v as OperadorPenalidade['tipo'])} options={TIPO_OPTIONS} placeholder="Selecione…" />
          </Field>
          <Field label="Início da Vigência" required>
            <Input aria-label="Início da Vigência" type="date" className="font-mono tabular-nums" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </Field>
          {tipo === 'suspensao' && (
            <Field label="Fim da Vigência" required>
              <Input aria-label="Fim da Vigência" type="date" className="font-mono tabular-nums" value={fim} onChange={(e) => setFim(e.target.value)} />
            </Field>
          )}
          <Field label="Motivo" required>
            <Textarea aria-label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
          </Field>
          <Field label="Anexo do Processo Administrativo (opcional)">
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:cursor-pointer"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
};

export default SancoesOperador;
