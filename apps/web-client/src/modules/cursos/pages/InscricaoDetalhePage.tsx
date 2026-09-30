import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, UserCheck } from 'lucide-react';
import { Button, Card } from '@sysgov/ui';
import { PageHeader, ScreenState, StatusChip } from '@/components/ui';
import { sysgovApi, type InscricaoDetalhe, type RespostaInscricao } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { ConteudoInscricaoSection } from '../components/ConteudoInscricaoSection';
import { SITUACAO_AULA, STATUS_INSCRICAO, formatarData, formatarDataHora, formatarHora, formatarPercentual, formatarValorResposta } from '../utils/formatos';

interface Props {
  inscricaoId: number;
  onVoltar: () => void;
  onAbrirTentativa: (tentativaId: number) => void;
}

/** Frequência, materiais e avaliações do participante numa turma. */
export const InscricaoDetalhePage: React.FC<Props> = ({ inscricaoId, onVoltar, onAbrirTentativa }) => {
  const [inscricao, setInscricao] = useState<InscricaoDetalhe | null>(null);
  const [respostas, setRespostas] = useState<RespostaInscricao[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const [detalhe, respostasFormulario] = await Promise.all([sysgovApi.cursos.getInscricao(inscricaoId), sysgovApi.cursos.getRespostasInscricao(inscricaoId)]);
      setInscricao(detalhe);
      setRespostas(respostasFormulario);
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar a inscrição.'));
    }
  }, [inscricaoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (erro) return <ScreenState type="error" title="Erro ao carregar" description={erro} actionLabel="Tentar novamente" onAction={carregar} />;
  if (!inscricao) return <ScreenState type="loading" title="Carregando frequência..." />;

  const status = STATUS_INSCRICAO[inscricao.status];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<UserCheck className="h-6 w-6" />}
        title={inscricao.turma.curso.titulo}
        subtitle={`${inscricao.turma.nome} · ${formatarData(inscricao.turma.data_inicio)} a ${formatarData(inscricao.turma.data_fim)}`}
        actions={
          <Button variant="outline" onClick={onVoltar}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        }
      />

      <Card className="flex flex-wrap items-center gap-6 p-4">
        <div>
          <p className="text-xs text-muted-foreground">Situação</p>
          <StatusChip label={inscricao.posicao_fila ? `${status.label} (${inscricao.posicao_fila}º)` : status.label} variant={status.variant} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Frequência até agora</p>
          <p className="font-mono text-lg font-semibold tabular-nums text-foreground">{formatarPercentual(inscricao.frequencia.percentual)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Presenças</p>
          <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
            {inscricao.frequencia.presencas}/{inscricao.frequencia.aulas}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Mínimo para certificado</p>
          <p className="font-mono text-lg font-semibold tabular-nums text-foreground">{inscricao.turma.curso.frequencia_minima ?? '—'}%</p>
        </div>
      </Card>

      <Card className="p-0">
        {inscricao.aulas.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhuma aula agendada ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {inscricao.aulas.map((a) => (
              <li key={a.agendamento_id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{a.aula}</p>
                  <p className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatarDataHora(a.inicio)} – {formatarHora(a.fim)}
                  </p>
                </div>
                <StatusChip label={SITUACAO_AULA[a.situacao].label} variant={SITUACAO_AULA[a.situacao].variant} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {respostas.length > 0 && (
        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-semibold text-foreground">Respostas do formulário de inscrição</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            {respostas.map((r) => (
              <div key={r.id}>
                <dt className="text-xs text-muted-foreground">{r.rotulo}</dt>
                <dd className="text-sm text-foreground">{formatarValorResposta(r)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      <ConteudoInscricaoSection inscricaoId={inscricao.id} onAbrirTentativa={onAbrirTentativa} />
    </div>
  );
};

export default InscricaoDetalhePage;
