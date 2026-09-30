import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Card } from '@sysgov/ui';
import { ScreenState } from '@/components/ui';
import { sysgovApi, type CatalogoPublicoCurso } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { formatarCargaHoraria } from '../utils/formatos';
import { usePaginaOrgao } from '../utils/usePaginaOrgao';
import { PaginaPublicaLayout } from '../components/PaginaPublicaLayout';

/**
 * Página pública do órgão (design D7): identidade, texto de boas-vindas e a oferta de cursos com
 * turma aberta a participantes externos. Sem login — quem quiser se inscrever segue para o
 * cadastro (ou entra, se já tiver conta).
 */
export const CatalogoOrgaoPage: React.FC = () => {
  const { orgao } = useParams();
  const { carregando: carregandoPagina, pagina, naoEncontrado } = usePaginaOrgao(orgao);
  const [cursos, setCursos] = useState<CatalogoPublicoCurso[]>([]);
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!orgao || naoEncontrado) return;
    setCarregandoCatalogo(true);
    sysgovApi.cursos
      .listarCatalogoPublico(orgao)
      .then(setCursos)
      .catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível carregar a oferta de cursos.')))
      .finally(() => setCarregandoCatalogo(false));
  }, [orgao, naoEncontrado]);

  if (carregandoPagina) return <ScreenState type="loading" title="Carregando..." />;
  if (naoEncontrado || !pagina) {
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
      {pagina.boas_vindas && <p className="text-sm text-gov-text-secondary">{pagina.boas_vindas}</p>}

      {carregandoCatalogo ? (
        <ScreenState type="loading" title="Carregando cursos..." />
      ) : erro ? (
        <Card className="p-4 text-sm text-destructive" role="alert">
          {erro}
        </Card>
      ) : cursos.length === 0 ? (
        <ScreenState type="empty" title="Nenhuma inscrição aberta no momento" description="Volte mais tarde para conferir novas turmas." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cursos.map((curso) => (
            <Link key={curso.slug} to={`/inscricao/${encodeURIComponent(orgao ?? '')}/cursos/${encodeURIComponent(curso.slug)}`}>
              <Card className="h-full overflow-hidden p-0 transition-shadow hover:shadow-md">
                {curso.capa_url && <img src={curso.capa_url} alt="" className="h-32 w-full object-cover" />}
                <div className="space-y-2 p-4">
                  <h3 className="text-base font-semibold text-foreground">{curso.titulo}</h3>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-mono tabular-nums">{formatarCargaHoraria(curso.carga_horaria_minutos)}</span>
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <p className="text-center text-sm text-gov-text-muted">
        Já tem cadastro?{' '}
        <Link to="/login" className="font-medium text-gov-primary hover:underline">
          Entrar
        </Link>
      </p>
    </PaginaPublicaLayout>
  );
};

export default CatalogoOrgaoPage;
