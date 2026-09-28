import React, { useState, useCallback, useMemo } from 'react';
import { Modal, Tabs, Button, StatusChip, Badge } from '@/components/ui';
import { Scale, Users, FileText, Clock, Edit3, Save } from 'lucide-react';
import { useAcao, ErroBox, Mono } from '../views/comum';
import { cemiteriosApi, formatarData } from '../api';
import type { Sucessao, EstadoSucessao } from '../api';
import { useSucessao } from '../hooks/useSucessao';
import {
  ESTADO_LABELS,
  ESTADO_BADGE_VARIANT,
  transicoesValidas,
} from '../hooks/useSucessaoTransicoes';
import { VIA_LABELS } from './sucessao.utils';
import HerdeirosTable from './HerdeirosTable';
import DocumentosList from './DocumentosList';
import HistoricoTimeline from './HistoricoTimeline';
import SucessaoActions from './SucessaoActions';

interface SucessaoDetailProps {
  sucessao: Sucessao;
  aberto: boolean;
  onFechar: () => void;
  onSucesso?: () => void;
}

const ABA_DADOS = 'dados';
const ABA_HERDEIROS = 'herdeiros';
const ABA_DOCUMENTOS = 'documentos';
const ABA_HISTORICO = 'historico';
const ABA_ACOES = 'acoes';

export const SucessaoDetail: React.FC<SucessaoDetailProps> = ({
  sucessao: _sucessao,
  aberto,
  onFechar,
  onSucesso,
}) => {
  const { dados: sucessao, carregando, erro, carregar } = useSucessao(aberto ? _sucessao.id : null);
  const { executar } = useAcao();
  const [abaAtiva, setAbaAtiva] = useState<string>(ABA_DADOS);

  const s = sucessao ?? _sucessao;

  const estaEditavel = !['sucedida', 'indeferida', 'arquivada'].includes(s.estado);

  React.useEffect(() => {
    if (aberto) {
      carregar();
    }
  }, [aberto, carregar]);

  const handleAction = useCallback(() => {
    carregar();
    onSucesso?.();
  }, [carregar, onSucesso]);

  const abas = [
    { key: ABA_DADOS, label: 'Dados do Processo' },
    { key: ABA_HERDEIROS, label: 'Herdeiros' },
    { key: ABA_DOCUMENTOS, label: 'Documentos' },
    { key: ABA_HISTORICO, label: 'Histórico' },
    { key: ABA_ACOES, label: 'Ações' },
  ];

  return (
    <Modal
      open={aberto}
      onClose={onFechar}
      title="Detalhe do Processo de Sucessão"
      description={s.processo_referencia ?? `Processo #${s.id}`}
      size="2xl"
      icon={<Scale className="h-5 w-5 text-primary" />}
      headerActions={
        <StatusChip
          label={ESTADO_LABELS[s.estado] ?? s.estado}
          variant={ESTADO_BADGE_VARIANT[s.estado] ?? 'neutral'}
        />
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onFechar}>
            Fechar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <ErroBox erro={erro} />

        <Tabs
          items={abas}
          value={abaAtiva}
          onChange={(k) => setAbaAtiva(k)}
        />

        {abaAtiva === ABA_DADOS && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Processo / Referência</label>
                <Mono className="mt-1 block font-medium text-foreground">
                  {s.processo_referencia ?? '—'}
                </Mono>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Via</label>
                <span className="mt-1 block text-sm text-foreground capitalize">
                  {VIA_LABELS[s.via as keyof typeof VIA_LABELS] ?? s.via}
                </span>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Data do Falecimento</label>
                <Mono className="mt-1 block font-mono tabular-nums text-foreground">
                  {formatarData(s.data_falecimento)}
                </Mono>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Data de Abertura</label>
                <Mono className="mt-1 block font-mono tabular-nums text-foreground">
                  {formatarData(s.created_at)}
                </Mono>
              </div>
            </div>

            {s.concessao && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Concessão</label>
                <div className="mt-1 p-3 rounded-lg bg-muted/20 border border-border">
                  <div className="flex gap-2">
                    <Mono className="font-bold text-foreground">{s.concessao.numero}</Mono>
                    <span className="text-xs text-muted-foreground">Jazigo: <Mono>{s.concessao.jazigo?.codigo ?? '—'}</Mono></span>
                  </div>
                  {s.concessao.concessionario && (
                    <div className="mt-1 text-sm text-foreground">
                      {s.concessao.concessionario.nome}
                    </div>
                  )}
                </div>
              </div>
            )}

            {s.parecer && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Parecer</label>
                <div className="mt-1 text-sm text-foreground bg-muted/20 rounded-lg p-3 border border-border">
                  {s.parecer}
                </div>
              </div>
            )}
          </div>
        )}

        {abaAtiva === ABA_HERDEIROS && s.id && (
          <HerdeirosTable sucessaoId={s.id} readonly={!estaEditavel} />
        )}

        {abaAtiva === ABA_DOCUMENTOS && s.id && (
          <DocumentosList sucessaoId={s.id} readonly={!estaEditavel} />
        )}

        {abaAtiva === ABA_HISTORICO && (
          <HistoricoTimeline historico={s.historico ?? []} />
        )}

        {abaAtiva === ABA_ACOES && (
          <SucessaoActions sucessao={s} onAction={handleAction} />
        )}
      </div>
    </Modal>
  );
};

export default SucessaoDetail;
