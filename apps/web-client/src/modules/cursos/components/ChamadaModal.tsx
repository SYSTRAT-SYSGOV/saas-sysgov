import React, { useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Button, Modal, Switch } from '@sysgov/ui';
import { ScreenState } from '@/components/ui';
import { sysgovApi, type AulaAgendamento, type ItemChamada } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { formatarDataHora } from '../utils/formatos';
import { ErroFormulario } from './ErroFormulario';

interface Props {
  agendamento: AulaAgendamento | null;
  somenteLeitura?: boolean;
  onClose: () => void;
}

/** Lista de chamada de uma aula: presença/falta de cada inscrição confirmada. */
export const ChamadaModal: React.FC<Props> = ({ agendamento, somenteLeitura = false, onClose }) => {
  const [itens, setItens] = useState<ItemChamada[] | null>(null);
  const [marcacao, setMarcacao] = useState<Record<number, boolean>>({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (!agendamento) return;
    setItens(null);
    setErro(null);
    setSalvo(false);
    sysgovApi.cursos
      .getChamada(agendamento.id)
      .then((r) => {
        setItens(r.chamada);
        setMarcacao(Object.fromEntries(r.chamada.map((i) => [i.inscricao_id, i.presente ?? false])));
      })
      .catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível carregar a chamada.')));
  }, [agendamento]);

  const salvar = async () => {
    if (!agendamento || !itens) return;
    setSalvando(true);
    setErro(null);
    setSalvo(false);
    try {
      const r = await sysgovApi.cursos.registrarChamada(
        agendamento.id,
        itens.map((i) => ({ inscricao_id: i.inscricao_id, presente: marcacao[i.inscricao_id] ?? false })),
      );
      setItens(r.chamada);
      setSalvo(true);
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível salvar a chamada.'));
    } finally {
      setSalvando(false);
    }
  };

  const presentes = Object.values(marcacao).filter(Boolean).length;

  return (
    <Modal
      open={agendamento !== null}
      onClose={onClose}
      title={`Chamada — ${agendamento?.aula?.titulo ?? ''}`}
      icon={<ClipboardCheck className="h-5 w-5" />}
      size="lg"
      footer={
        !somenteLeitura && itens && itens.length > 0 ? (
          <div className="flex w-full items-center justify-between">
            <span className="text-sm text-muted-foreground">
              <span className="font-mono tabular-nums">{presentes}</span> de <span className="font-mono tabular-nums">{itens.length}</span> presentes
              {salvo && <span className="ml-2 text-status-success">· chamada salva</span>}
            </span>
            <Button onClick={salvar} isLoading={salvando}>
              Salvar chamada
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-3">
        {agendamento && <p className="font-mono text-xs tabular-nums text-muted-foreground">{formatarDataHora(agendamento.inicio)}</p>}
        <ErroFormulario mensagem={erro} />
        {!itens && !erro && <ScreenState type="loading" title="Carregando chamada..." />}
        {itens && itens.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma inscrição confirmada nesta turma.</p>}
        {itens && itens.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {itens.map((i) => (
              <li key={i.inscricao_id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div>
                  <p className="text-sm text-foreground">{i.participante}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.email}
                    {i.origem === 'qr_code' && ' · check-in por QR'}
                  </p>
                </div>
                <Switch
                  checked={marcacao[i.inscricao_id] ?? false}
                  disabled={somenteLeitura}
                  onCheckedChange={(v) => setMarcacao((m) => ({ ...m, [i.inscricao_id]: v }))}
                  label={`Presença de ${i.participante}`}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};

export default ChamadaModal;
