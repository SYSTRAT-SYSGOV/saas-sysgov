import React from 'react';
import { Modal, Badge } from '@/components/ui';
import { History } from 'lucide-react';
import { cemiteriosApi, type Concessao } from '../api';
import { ErroBox, Mono, useDados } from './comum';

const ACAO_LABEL: Record<string, string> = {
  'concessao.created': 'Concessão criada',
  'concessao.renovada': 'Concessão renovada',
  'concessao.renunciada': 'Concessão renunciada',
};

export interface DrawerHistoricoConcessaoProps {
  concessao: Concessao | null;
  onFechar: () => void;
}

/** Histórico auditável de uma concessão, lido de `audit_logs` (cemiterio/concessoes-gestao). */
export const DrawerHistoricoConcessao: React.FC<DrawerHistoricoConcessaoProps> = ({ concessao, onFechar }) => {
  const historico = useDados(
    () => (concessao ? cemiteriosApi.historicoConcessao(concessao.id) : Promise.resolve(null)),
    [concessao?.id]
  );

  return (
    <Modal open={concessao !== null} onClose={onFechar} title={`Histórico — Concessão ${concessao?.numero ?? ''}`} size="md">
      <div className="space-y-2">
        <ErroBox erro={historico.erro} />
        {historico.carregando ? (
          <p className="text-xs text-muted-foreground">Carregando histórico…</p>
        ) : (historico.dados?.data.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhum evento de auditoria registrado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {historico.dados?.data.map((evento) => (
              <li key={evento.id} className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/20 p-2.5 text-xs">
                <History className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">{ACAO_LABEL[evento.action] ?? evento.action}</Badge>
                    <Mono className="text-[10px] text-muted-foreground">{new Date(evento.created_at).toLocaleString('pt-BR')}</Mono>
                  </div>
                  {evento.user_id && <span className="text-[10px] text-muted-foreground">Usuário #{evento.user_id}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};
