import React, { useState } from 'react';
import { Button, Field, Input, Modal } from '@/components/ui';
import { FileCheck, Upload } from 'lucide-react';
import { cemiteriosApi, formatarData } from '../api';
import { ErroBox, Mono, useAcao, useDados } from '../views/comum';

interface HistoricoCredenciamentoOperadorProps {
  operadorId: number;
  readonly?: boolean;
}

/** Histórico de credenciamentos (alvarás) de um coveiro/pedreiro, com upload de novo alvará (spec: cadastro-operadores). */
export const HistoricoCredenciamentoOperador: React.FC<HistoricoCredenciamentoOperadorProps> = ({ operadorId, readonly = false }) => {
  const licencas = useDados(() => cemiteriosApi.licencasOperador(operadorId), [operadorId]);
  const { erro, enviando, executar } = useAcao();
  const [modalAberto, setModalAberto] = useState(false);
  const [numero, setNumero] = useState('');
  const [validade, setValidade] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);

  const credenciar = async () => {
    const resultado = await executar(() => cemiteriosApi.credenciarOperador(operadorId, { numero, validade }, arquivo));
    if (resultado !== null) {
      setModalAberto(false);
      setNumero('');
      setValidade('');
      setArquivo(null);
      await licencas.recarregar();
    }
  };

  return (
    <div className="space-y-4">
      <ErroBox erro={erro} />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Histórico de Credenciamentos</h3>
        {!readonly && (
          <Button size="sm" variant="outline" onClick={() => setModalAberto(true)}>
            <Upload className="h-4 w-4 mr-1" /> Novo Credenciamento
          </Button>
        )}
      </div>

      {licencas.carregando ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Carregando credenciamentos…</div>
      ) : (licencas.dados ?? []).length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Nenhum credenciamento registrado.</div>
      ) : (
        <div className="space-y-2">
          {(licencas.dados ?? []).map((lic) => (
            <div key={lic.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3">
                <FileCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Alvará {lic.numero}</span>
                    {lic.hash && <Mono className="text-xs text-muted-foreground">{lic.hash.slice(0, 8)}…</Mono>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Validade: <Mono>{formatarData(lic.validade)}</Mono> • Registrado em {formatarData(lic.created_at)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title="Novo Credenciamento"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button size="sm" onClick={credenciar} disabled={enviando || !numero || !validade}>
              {enviando ? 'Enviando…' : 'Registrar'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Número do Alvará" required>
            <Input aria-label="Número do Alvará" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </Field>
          <Field label="Validade" required>
            <Input aria-label="Validade" type="date" className="font-mono tabular-nums" value={validade} onChange={(e) => setValidade(e.target.value)} />
          </Field>
          <Field label="Arquivo do Alvará (opcional)">
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

export default HistoricoCredenciamentoOperador;
