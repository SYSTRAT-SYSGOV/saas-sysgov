import React, { useState } from 'react';
import { BarChart3, FolderOpen } from 'lucide-react';
import { Card, CardContent, Select, Tabs, TabsContent, TabsList, TabsTrigger } from '@sysgov/ui';
import { useCan } from '@/core/rbac/useCan';
import { Avisos, useAvisos } from '../escola/components/Avisos';
import { usePortfolio } from './usePortfolio';
import { ListaAlunos } from './components/ListaAlunos';
import { CabecalhoAluno } from './components/CabecalhoAluno';
import { LinhaDoTempo } from './components/LinhaDoTempo';
import { PainelDesempenho } from './components/PainelDesempenho';

const anoAtual = new Date().getFullYear();
const ANOS = [anoAtual + 1, anoAtual, anoAtual - 1, anoAtual - 2].map((a) => ({ value: a, label: String(a) }));
const TRIMESTRES = [
  { value: 0, label: 'Ano todo' },
  { value: 1, label: '1º trimestre' },
  { value: 2, label: '2º trimestre' },
  { value: 3, label: '3º trimestre' },
];

/** Portfólio Digital sobre o Cadastro Escolar (change criar-modulo-portfolio). */
export const ModuloPortfolioMain: React.FC = () => {
  const p = usePortfolio();
  const { avisos, avisar } = useAvisos();
  const { canAny } = useCan();
  const podeLancar = canAny(['portfolio.manage', 'portfolio.professor']);
  const [aba, setAba] = useState('trabalhos');
  const aluno = p.alunos.find((a) => a.id === p.alunoId) ?? null;
  const turma = p.turmas.find((t) => t.id === p.turmaId);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="text-xl font-semibold flex items-center gap-2 mr-auto"><FolderOpen className="h-5 w-5" /> Portfólio Digital</h1>
        <Select label="Ano letivo" value={p.periodo.ano} options={ANOS} onChange={(v) => p.setPeriodo({ ano: Number(v), trimestre: null })} />
        <Select label="Período" value={p.periodo.trimestre ?? 0} options={TRIMESTRES} onChange={(v) => p.setPeriodo({ ...p.periodo, trimestre: Number(v) || null })} />
        <Select
          label="Turma"
          value={p.turmaId}
          options={p.turmas.map((t) => ({ value: t.id, label: `${t.nome} (${t.alunos})` }))}
          onChange={(v) => p.setTurmaId(Number(v))}
          emptyText="Nenhuma turma disponível"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Card><CardContent className="p-3">
          <ListaAlunos alunos={p.alunos} selecionado={p.alunoId} onSelecionar={p.setAlunoId} carregando={p.carregandoAlunos} />
        </CardContent></Card>

        <Card className="min-w-0"><CardContent className="p-4 flex flex-col gap-4">
          {!aluno && <p className="text-sm text-muted-foreground">Selecione um aluno para ver o portfólio.</p>}
          {aluno && (
            <>
              <CabecalhoAluno aluno={aluno} turma={turma?.nome ?? ''} periodo={p.periodo} avisar={avisar} />
              <Tabs value={aba} onValueChange={setAba}>
                <TabsList>
                  <TabsTrigger value="trabalhos"><FolderOpen className="h-4 w-4 mr-1" /> Trabalhos</TabsTrigger>
                  <TabsTrigger value="desempenho"><BarChart3 className="h-4 w-4 mr-1" /> Desempenho</TabsTrigger>
                </TabsList>
                <TabsContent value="trabalhos">
                  {p.turmaId !== null && <LinhaDoTempo alunoId={aluno.id} turmaId={p.turmaId} periodo={p.periodo} avisar={avisar} aoAlterar={p.recarregarAlunos} podeLancar={podeLancar} />}
                </TabsContent>
                <TabsContent value="desempenho"><PainelDesempenho alunoId={aluno.id} periodo={p.periodo} /></TabsContent>
              </Tabs>
            </>
          )}
        </CardContent></Card>
      </div>
      <Avisos avisos={avisos} />
    </div>
  );
};

export default ModuloPortfolioMain;
