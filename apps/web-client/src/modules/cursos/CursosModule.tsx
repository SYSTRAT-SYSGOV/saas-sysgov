import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, BookOpen, Building2, FileBadge, FileImage, FileText, GraduationCap, Layers, Library, Palette, Presentation, UserCheck, Stamp } from 'lucide-react';
import { PageHeader, Tabs, type TabsItem } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { useTenant } from '@/core/tenant/useTenant';
import { CatalogoPage } from './pages/CatalogoPage';
import { MeusCursosPage } from './pages/MeusCursosPage';
import { MinhasTurmasPage } from './pages/MinhasTurmasPage';
import { GestaoCursosPage } from './pages/GestaoCursosPage';
import { CursoDetalhePage } from './pages/CursoDetalhePage';
import { TurmaDetalhePage } from './pages/TurmaDetalhePage';
import { FormacoesPage } from './pages/FormacoesPage';
import { CertificadosPage } from './pages/CertificadosPage';
import { ModelosCertificadoPage } from './pages/ModelosCertificadoPage';
import { AssinaturasPage } from './pages/AssinaturasPage';
import { FundosPage } from './pages/FundosPage';
import { TextosPage } from './pages/TextosPage';
import { EmpresasPage } from './pages/EmpresasPage';
import { ConstrutorCursoPage } from './pages/ConstrutorCursoPage';
import { InscricaoDetalhePage } from './pages/InscricaoDetalhePage';
import { TentativaPage } from './pages/TentativaPage';

export type AbaCursos = 'catalogo' | 'meus' | 'turmas' | 'cursos' | 'formacoes' | 'certificados' | 'modelos' | 'fundos' | 'textos' | 'empresas' | 'assinaturas' | 'construtor';

/**
 * Módulo Cursos e Formações. As abas aparecem conforme a permissão (a
 * autorização de verdade é sempre do backend). Telas de detalhe usam a
 * query string (?curso=, ?turma=, ?inscricao=) para permitir voltar e
 * compartilhar o link.
 */
export const CursosModule: React.FC = () => {
  const { can } = useCan();
  const { tenant } = useTenant();
  const [params, setParams] = useSearchParams();

  const administra = can('cursos.manage');
  const instrutor = can('cursos.instrutor');
  const participa = can('cursos.participar');

  const abas = useMemo(() => {
    const itens: TabsItem<AbaCursos>[] = [];
    if (participa) {
      itens.push({ key: 'catalogo', label: 'Catálogo', icon: <Library className="h-4 w-4" /> });
      itens.push({ key: 'meus', label: 'Meus cursos', icon: <UserCheck className="h-4 w-4" /> });
    }
    if (instrutor) itens.push({ key: 'turmas', label: 'Minhas turmas', icon: <Presentation className="h-4 w-4" /> });
    if (administra) {
      itens.push({ key: 'cursos', label: 'Cursos e eventos', icon: <BookOpen className="h-4 w-4" /> });
      itens.push({ key: 'formacoes', label: 'Formações', icon: <Layers className="h-4 w-4" /> });
      itens.push({ key: 'certificados', label: 'Certificados', icon: <Award className="h-4 w-4" /> });
      itens.push({ key: 'modelos', label: 'Modelos de certificado', icon: <FileBadge className="h-4 w-4" /> });
      itens.push({ key: 'fundos', label: 'Fundos', icon: <FileImage className="h-4 w-4" /> });
      itens.push({ key: 'textos', label: 'Textos', icon: <FileText className="h-4 w-4" /> });
      itens.push({ key: 'empresas', label: 'Empresas', icon: <Building2 className="h-4 w-4" /> });
      itens.push({ key: 'assinaturas', label: 'Assinaturas', icon: <Stamp className="h-4 w-4" /> });
      itens.push({ key: 'construtor', label: 'Construtor visual', icon: <Palette className="h-4 w-4" /> });
    }
    return itens;
  }, [administra, instrutor, participa]);

  const abaPedida = params.get('aba') as AbaCursos | null;
  const aba: AbaCursos | undefined = abas.find((a) => a.key === abaPedida)?.key ?? abas[0]?.key;

  const irPara = (novos: Record<string, string>) => setParams(novos);
  const voltar = () => irPara(aba ? { aba } : {});

  const cursoId = params.get('curso');
  const turmaId = params.get('turma');
  const inscricaoId = params.get('inscricao');
  const tentativaId = params.get('tentativa');

  // Responder a avaliação: abre por cima da inscrição e volta para ela.
  if (tentativaId) {
    return <TentativaPage tentativaId={Number(tentativaId)} onVoltar={() => irPara({ aba: aba ?? 'meus', ...(inscricaoId ? { inscricao: inscricaoId } : {}) })} />;
  }
  if (turmaId) {
    return <TurmaDetalhePage turmaId={Number(turmaId)} onVoltar={voltar} />;
  }
  if (cursoId) {
    return <CursoDetalhePage cursoId={Number(cursoId)} onVoltar={voltar} onAbrirTurma={(id) => irPara({ aba: aba ?? 'cursos', turma: String(id) })} />;
  }
  if (inscricaoId) {
    return (
      <InscricaoDetalhePage
        inscricaoId={Number(inscricaoId)}
        onVoltar={voltar}
        onAbrirTentativa={(id) => irPara({ aba: aba ?? 'meus', inscricao: inscricaoId, tentativa: String(id) })}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<GraduationCap className="h-6 w-6" />}
        title="Cursos e Formações"
        subtitle={`${tenant?.name ?? ''} — cursos, eventos, turmas, presença e certificados`}
      />

      {abas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Seu perfil não tem acesso a nenhuma área do módulo de Cursos.</p>
      ) : (
        <>
          <Tabs items={abas} value={aba as AbaCursos} onChange={(nova) => irPara({ aba: nova })} />

          {aba === 'catalogo' && <CatalogoPage onVerMeusCursos={() => irPara({ aba: 'meus' })} />}
          {aba === 'meus' && <MeusCursosPage onAbrirInscricao={(id) => irPara({ aba: 'meus', inscricao: String(id) })} />}
          {aba === 'turmas' && <MinhasTurmasPage onAbrirTurma={(id) => irPara({ aba: 'turmas', turma: String(id) })} />}
          {aba === 'cursos' && <GestaoCursosPage onAbrirCurso={(id) => irPara({ aba: 'cursos', curso: String(id) })} />}
          {aba === 'formacoes' && <FormacoesPage />}
          {aba === 'certificados' && <CertificadosPage />}
          {aba === 'modelos' && <ModelosCertificadoPage />}
          {aba === 'fundos' && <FundosPage />}
          {aba === 'textos' && <TextosPage />}
          {aba === 'empresas' && <EmpresasPage />}
          {aba === 'assinaturas' && <AssinaturasPage />}
          {aba === 'construtor' && <ConstrutorCursoPage />}
        </>
      )}
    </div>
  );
};

export default CursosModule;
