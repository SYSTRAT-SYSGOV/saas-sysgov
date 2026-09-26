import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Clock, MapPin, Users } from 'lucide-react';
import { Button, Card } from '@sysgov/ui';
import { ScreenState, SearchInput, StatusChip } from '@/components/ui';
import { sysgovApi, type CatalogoCurso, type CatalogoTurma } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { MODALIDADE, STATUS_INSCRICAO, TIPO_CURSO, formatarCargaHoraria, formatarData } from '../utils/formatos';

interface Props {
  onVerMeusCursos: () => void;
}

/** Catálogo do participante: cursos publicados com as turmas abertas. */
export const CatalogoPage: React.FC<Props> = ({ onVerMeusCursos }) => {
  const [cursos, setCursos] = useState<CatalogoCurso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [inscrevendo, setInscrevendo] = useState<number | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setCursos(await sysgovApi.cursos.listarCatalogo({ busca }));
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar o catálogo.'));
    } finally {
      setCarregando(false);
    }
  }, [busca]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const inscrever = async (turma: CatalogoTurma) => {
    setInscrevendo(turma.id);
    setAviso(null);
    try {
      const inscricao = await sysgovApi.cursos.inscrever(turma.id);
      const mensagens: Record<string, string> = {
        confirmada: 'Inscrição confirmada!',
        pendente: 'Inscrição enviada: aguardando aprovação do Administrador.',
        lista_espera: 'A turma está lotada: você entrou na lista de espera e será avisado se abrir vaga.',
      };
      setAviso({ tipo: 'sucesso', texto: mensagens[inscricao.status] ?? 'Inscrição registrada.' });
      await carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: getApiErrorMessage(e, 'Não foi possível concluir a inscrição.') });
    } finally {
      setInscrevendo(null);
    }
  };

  if (carregando && cursos.length === 0) return <ScreenState type="loading" title="Carregando catálogo..." />;
  if (erro) return <ScreenState type="error" title="Erro ao carregar" description={erro} actionLabel="Tentar novamente" onAction={carregar} />;

  return (
    <div className="space-y-4">
      <SearchInput value={busca} onChange={setBusca} placeholder="Buscar curso ou evento..." />

      {aviso && (
        <div
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm ${aviso.tipo === 'sucesso' ? 'border-status-success-border bg-status-success-bg text-status-success' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}
        >
          {aviso.texto}{' '}
          {aviso.tipo === 'sucesso' && (
            <Button variant="link" size="xs" onClick={onVerMeusCursos}>
              Ver meus cursos
            </Button>
          )}
        </div>
      )}

      {cursos.length === 0 ? (
        <ScreenState type="empty" title="Nenhum curso publicado" description="Quando houver cursos ou eventos com inscrições abertas, eles aparecem aqui." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cursos.map((curso) => (
            <Card key={curso.id} className="overflow-hidden p-0">
              {curso.capa_url && <img src={curso.capa_url} alt="" className="h-36 w-full object-cover" />}
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-foreground">{curso.titulo}</h3>
                  <StatusChip label={TIPO_CURSO[curso.tipo]} variant={curso.tipo === 'evento' ? 'info' : 'primary'} />
                </div>
                {curso.descricao && <p className="line-clamp-3 text-sm text-muted-foreground">{curso.descricao}</p>}
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-mono tabular-nums">{formatarCargaHoraria(curso.carga_horaria_minutos)}</span>
                  · frequência mínima <span className="font-mono tabular-nums">{curso.frequencia_minima}%</span>
                </p>

                {curso.turmas.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground">Nenhuma turma aberta no momento.</p>
                ) : (
                  <ul className="space-y-2">
                    {curso.turmas.map((turma) => (
                      <li key={turma.id} className="rounded-lg border border-border p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">{turma.nome}</span>
                          <span className="text-xs text-muted-foreground">{MODALIDADE[turma.modalidade]}</span>
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span className="font-mono tabular-nums">{formatarData(turma.data_inicio)} a {formatarData(turma.data_fim)}</span>
                        </p>
                        {turma.local && (
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" /> {turma.local}
                          </p>
                        )}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            {turma.vagas_restantes > 0 ? (
                              <span><span className="font-mono tabular-nums">{turma.vagas_restantes}</span> vagas restantes</span>
                            ) : (
                              <span>Lotada — lista de espera</span>
                            )}
                          </span>
                          {turma.minha_inscricao ? (
                            <StatusChip
                              label={
                                turma.minha_inscricao.posicao_fila
                                  ? `${STATUS_INSCRICAO[turma.minha_inscricao.status].label} (${turma.minha_inscricao.posicao_fila}º)`
                                  : STATUS_INSCRICAO[turma.minha_inscricao.status].label
                              }
                              variant={STATUS_INSCRICAO[turma.minha_inscricao.status].variant}
                            />
                          ) : turma.inscricoes_abertas ? (
                            <Button size="sm" onClick={() => inscrever(turma)} isLoading={inscrevendo === turma.id}>
                              {turma.vagas_restantes > 0 ? 'Inscrever-me' : 'Entrar na fila'}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Inscrições de {formatarData(turma.inscricoes_inicio)} a {formatarData(turma.inscricoes_fim)}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CatalogoPage;
