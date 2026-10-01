import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, Users } from 'lucide-react';
import { Card, buttonVariants } from '@sysgov/ui';
import { ScreenState } from '@/components/ui';
import { sysgovApi, type CursoPublicoDetalhe } from '@sysgov/sdk';
import { formatarCargaHoraria, formatarData, MODALIDADE } from '../utils/formatos';
import { usePaginaOrgao } from '../utils/usePaginaOrgao';
import { PaginaPublicaLayout } from '../components/PaginaPublicaLayout';
import { TextoSeguro } from '../components/TextoSeguro';

/**
 * Página pública de um curso (design D7): capa, texto de divulgação (sanitizado no servidor) e
 * as turmas abertas a externos, com vagas restantes — nunca a capacidade total (D7/tarefa 3.3).
 */
export const CursoPublicoPage: React.FC = () => {
  const { orgao, slug } = useParams();
  const { carregando: carregandoPagina, pagina, naoEncontrado: orgaoNaoEncontrado } = usePaginaOrgao(orgao);
  const [curso, setCurso] = useState<CursoPublicoDetalhe | null>(null);
  const [carregandoCurso, setCarregandoCurso] = useState(true);
  const [cursoNaoEncontrado, setCursoNaoEncontrado] = useState(false);

  useEffect(() => {
    if (!orgao || !slug || orgaoNaoEncontrado) return;
    setCarregandoCurso(true);
    setCursoNaoEncontrado(false);
    sysgovApi.cursos
      .getCursoPublico(orgao, slug)
      .then(setCurso)
      .catch(() => setCursoNaoEncontrado(true))
      .finally(() => setCarregandoCurso(false));
  }, [orgao, slug, orgaoNaoEncontrado]);

  if (carregandoPagina) return <ScreenState type="loading" title="Carregando..." />;
  if (orgaoNaoEncontrado || !pagina) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gov-page p-6">
        <Card className="max-w-md p-6 text-center">
          <p className="font-bold text-gov-text-secondary">Página de inscrição não disponível para este órgão.</p>
        </Card>
      </div>
    );
  }

  return (
    <PaginaPublicaLayout pagina={pagina}>
      <Link to={`/inscricao/${encodeURIComponent(orgao ?? '')}`} className="text-sm text-gov-primary hover:underline">
        ← Voltar para os cursos
      </Link>

      {carregandoCurso ? (
        <ScreenState type="loading" title="Carregando curso..." />
      ) : cursoNaoEncontrado || !curso ? (
        <ScreenState type="error" title="Curso não encontrado" description="Ele pode ter sido despublicado ou o endereço está incorreto." />
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            {curso.capa_url && <img src={curso.capa_url} alt="" className="h-48 w-full object-cover" />}
            <div className="space-y-3 p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-foreground">{curso.titulo}</h2>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="font-mono tabular-nums">{formatarCargaHoraria(curso.carga_horaria_minutos)}</span>
              </p>
              {curso.texto_publico && <TextoSeguro html={curso.texto_publico} />}
            </div>
          </Card>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">Turmas abertas</h3>
            {curso.turmas.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">Nenhuma turma aberta a inscrição externa no momento.</p>
            ) : (
              curso.turmas.map((turma) => (
                <Card key={turma.id} className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{turma.nome}</span>
                    <span className="text-xs text-muted-foreground">{MODALIDADE[turma.modalidade]}</span>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="font-mono tabular-nums">
                      {formatarData(turma.data_inicio)} a {formatarData(turma.data_fim)}
                    </span>
                  </p>
                  {turma.local && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {turma.local}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {turma.vagas_restantes > 0 ? (
                      <span>
                        <span className="font-mono tabular-nums">{turma.vagas_restantes}</span> vagas restantes
                      </span>
                    ) : (
                      'Lotada'
                    )}
                  </p>
                </Card>
              ))
            )}
          </div>

          <Card className="flex flex-col items-center gap-2 p-4 text-center">
            <p className="text-sm text-gov-text-secondary">Para se inscrever, cadastre-se e confirme seu e-mail.</p>
            <Link to={`/inscricao/${encodeURIComponent(orgao ?? '')}/cadastro`} className={buttonVariants({ variant: 'primary' })}>
              Quero me cadastrar
            </Link>
          </Card>
        </>
      )}
    </PaginaPublicaLayout>
  );
};

export default CursoPublicoPage;
