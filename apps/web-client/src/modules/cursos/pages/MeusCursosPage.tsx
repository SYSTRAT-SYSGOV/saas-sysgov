import React, { useCallback, useEffect, useState } from 'react';
import { Award, Download } from 'lucide-react';
import { Button, Card } from '@sysgov/ui';
import { ConfirmDialog, EmptyState, ScreenState, StatusChip } from '@/components/ui';
import { sysgovApi, type Certificado, type MinhaInscricao } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { STATUS_INSCRICAO, baixarBlob, formatarData, formatarPercentual } from '../utils/formatos';

interface Props {
  onAbrirInscricao: (id: number) => void;
}

/** Área do participante: inscrições, frequência e certificados. */
export const MeusCursosPage: React.FC<Props> = ({ onAbrirInscricao }) => {
  const [inscricoes, setInscricoes] = useState<MinhaInscricao[]>([]);
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<MinhaInscricao | null>(null);
  const [baixando, setBaixando] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [i, c] = await Promise.all([sysgovApi.cursos.minhasInscricoes(), sysgovApi.cursos.meusCertificados()]);
      setInscricoes(i);
      setCertificados(c);
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar seus cursos.'));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const confirmarCancelamento = async (motivo: string) => {
    if (!cancelando) return;
    setAviso(null);
    try {
      await sysgovApi.cursos.cancelarInscricao(cancelando.id, motivo || undefined);
      await carregar();
    } catch (e) {
      setAviso(getApiErrorMessage(e, 'Não foi possível cancelar a inscrição.'));
    } finally {
      setCancelando(null);
    }
  };

  const baixar = async (certificado: Certificado) => {
    setBaixando(certificado.id);
    setAviso(null);
    try {
      baixarBlob(await sysgovApi.cursos.baixarCertificado(certificado.id), `certificado-${certificado.codigo}.pdf`);
    } catch (e) {
      setAviso(getApiErrorMessage(e, 'Não foi possível baixar o certificado.'));
    } finally {
      setBaixando(null);
    }
  };

  if (carregando) return <ScreenState type="loading" title="Carregando seus cursos..." />;
  if (erro) return <ScreenState type="error" title="Erro ao carregar" description={erro} actionLabel="Tentar novamente" onAction={carregar} />;

  return (
    <div className="space-y-6">
      {aviso && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{aviso}</div>}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Minhas inscrições</h2>
        {inscricoes.length === 0 ? (
          <EmptyState title="Você ainda não se inscreveu em nenhuma turma" description="Veja as turmas abertas na aba Catálogo." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {inscricoes.map((i) => {
              const status = STATUS_INSCRICAO[i.status];
              const podeCancelar = ['pendente', 'confirmada', 'lista_espera'].includes(i.status) && i.turma.status === 'aberta';
              return (
                <Card key={i.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{i.turma.curso.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.turma.nome} · <span className="font-mono tabular-nums">{formatarData(i.turma.data_inicio)} a {formatarData(i.turma.data_fim)}</span>
                      </p>
                    </div>
                    <StatusChip label={i.posicao_fila ? `${status.label} (${i.posicao_fila}º)` : status.label} variant={status.variant} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Frequência:{' '}
                    <span className="font-mono tabular-nums text-foreground">
                      {formatarPercentual(i.frequencia_apurada ?? i.frequencia.percentual)}
                    </span>{' '}
                    ({i.frequencia.presencas} de {i.frequencia.aulas} aulas realizadas)
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => onAbrirInscricao(i.id)}>
                      Ver frequência
                    </Button>
                    {podeCancelar && (
                      <Button size="sm" variant="ghost" onClick={() => setCancelando(i)}>
                        Cancelar inscrição
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Meus certificados</h2>
        {certificados.length === 0 ? (
          <EmptyState icon={<Award className="h-8 w-8" />} title="Nenhum certificado emitido ainda" description="O certificado é emitido quando a turma é encerrada e você atinge a frequência mínima." />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {certificados.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.curso}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono tabular-nums">{c.codigo}</span> · {c.carga_horaria} · emitido em{' '}
                    <span className="font-mono tabular-nums">{formatarData(c.emitido_em)}</span>
                  </p>
                </div>
                {c.revogado_em ? (
                  <StatusChip label="Revogado" variant="danger" />
                ) : (
                  <Button size="sm" variant="outline" onClick={() => baixar(c)} isLoading={baixando === c.id}>
                    <Download className="h-4 w-4" /> Baixar PDF
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={cancelando !== null}
        onClose={() => setCancelando(null)}
        onConfirm={confirmarCancelamento}
        title="Cancelar inscrição"
        description={`Cancelar sua inscrição em "${cancelando?.turma.curso.titulo ?? ''}"? Se a turma tiver lista de espera, sua vaga passa para o próximo da fila.`}
        confirmLabel="Cancelar inscrição"
        cancelLabel="Voltar"
        destructive
        requireReason={false}
        reasonPlaceholder="Motivo (opcional)"
      />
    </div>
  );
};

export default MeusCursosPage;
