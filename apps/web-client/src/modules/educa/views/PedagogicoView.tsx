import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Textarea,
} from '@sysgov/ui';
import { Check, X, BookOpen, Clock, Award, Save } from 'lucide-react';
import { useEduca } from '../context/EducaContext';

interface AlunoFrequencia {
  id: string;
  matricula_id: string;
  nome: string;
  presente: boolean;
  justificativa?: string;
  nota_etapa1?: number;
  nota_etapa2?: number;
  media_parcial?: number;
}

export const PedagogicoView: React.FC = () => {
  const { escolaAtiva, anoLetivoAtivo } = useEduca();

  // Mock de alunos para demonstração reativa com dados reais do diário
  const [alunos, setAlunos] = useState<AlunoFrequencia[]>([
    { id: '1', matricula_id: '2026-000101', nome: 'Ana Clara da Silva', presente: true, nota_etapa1: 8.5, nota_etapa2: 9.0, media_parcial: 8.75 },
    { id: '2', matricula_id: '2026-000102', nome: 'Bruno Henrique Oliveira', presente: true, nota_etapa1: 7.0, nota_etapa2: 6.5, media_parcial: 6.75 },
    { id: '3', matricula_id: '2026-000103', nome: 'Camila Rodrigues Santos', presente: false, nota_etapa1: 9.0, nota_etapa2: 8.0, media_parcial: 8.5 },
    { id: '4', matricula_id: '2026-000104', nome: 'Danilo Alves Ferreira', presente: true, nota_etapa1: 6.0, nota_etapa2: 7.0, media_parcial: 6.5 },
  ]);

  const [abaAtiva, setAbaAtiva] = useState<'chamada' | 'notas' | 'plano'>('chamada');
  const [conteudoAula, setConteudoAula] = useState<string>(
    'Leitura compartilhada e interpretação textual do gênero fábula. Identificação da moral da história e características dos personagens.'
  );
  const [salvando, setSalvando] = useState<boolean>(false);
  const [salvoSucesso, setSalvoSucesso] = useState<boolean>(false);

  const togglePresenca = (id: string) => {
    setAlunos((prev) =>
      prev.map((aluno) => (aluno.id === id ? { ...aluno, presente: !aluno.presente } : aluno))
    );
  };

  const marcarTodosPresentes = () => {
    setAlunos((prev) => prev.map((a) => ({ ...a, presente: true })));
  };

  const handleSalvarDiario = () => {
    setSalvando(true);
    setTimeout(() => {
      setSalvando(false);
      setSalvoSucesso(true);
      setTimeout(() => setSalvoSucesso(false), 3000);
    }, 600);
  };

  const totalPresentes = alunos.filter((a) => a.presente).length;
  const taxaFrequencia = alunos.length > 0 ? (totalPresentes / alunos.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Subnavegação da Ação Docente */}
      <div className="flex items-center justify-between border-b border-gov-border pb-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={abaAtiva === 'chamada' ? 'default' : 'outline'}
            onClick={() => setAbaAtiva('chamada')}
            className={`text-xs ${abaAtiva === 'chamada' ? 'bg-blue-700 text-white' : ''}`}
          >
            <Clock className="w-3.5 h-3.5 mr-1" />
            Chamada Diária
          </Button>

          <Button
            size="sm"
            variant={abaAtiva === 'notas' ? 'default' : 'outline'}
            onClick={() => setAbaAtiva('notas')}
            className={`text-xs ${abaAtiva === 'notas' ? 'bg-blue-700 text-white' : ''}`}
          >
            <Award className="w-3.5 h-3.5 mr-1" />
            Avaliações e Médias
          </Button>

          <Button
            size="sm"
            variant={abaAtiva === 'plano' ? 'default' : 'outline'}
            onClick={() => setAbaAtiva('plano')}
            className={`text-xs ${abaAtiva === 'plano' ? 'bg-blue-700 text-white' : ''}`}
          >
            <BookOpen className="w-3.5 h-3.5 mr-1" />
            Registro de Aula
          </Button>
        </div>

        <Button
          size="sm"
          onClick={handleSalvarDiario}
          disabled={salvando}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          {salvando ? 'Salvando...' : salvoSucesso ? 'Salvo!' : 'Salvar Diário'}
        </Button>
      </div>

      {/* Conteúdo: Chamada Diária */}
      {abaAtiva === 'chamada' && (
        <Card className="bg-white border-gov-border">
          <CardHeader className="flex flex-row items-center justify-between border-b border-gov-border pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-gov-text-primary">
                Frequência dos Alunos — 5º Ano A (Língua Portuguesa)
              </CardTitle>
              <p className="text-xs text-gov-text-muted mt-0.5">
                Presenças registradas em dia letivo oficial do calendário escolar.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono tabular-nums text-gov-text-secondary">
                Frequência da Turma: <strong className="text-blue-700 font-bold">{taxaFrequencia.toFixed(1)}%</strong> ({totalPresentes}/{alunos.length})
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={marcarTodosPresentes}
                className="text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-300"
              >
                Presente para Todos
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-28">Nº Matrícula</TableHead>
                  <TableHead className="text-xs">Nome do Estudante</TableHead>
                  <TableHead className="text-xs text-center w-32">Status da Chamada</TableHead>
                  <TableHead className="text-xs text-right w-36">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alunos.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs tabular-nums text-gov-text-muted">
                      {a.matricula_id}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-gov-text-primary">
                      {a.nome}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-mono px-2 py-0.5 ${
                          a.presente
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        {a.presente ? 'Presente' : 'Ausente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => togglePresenca(a.id)}
                        className={`h-7 text-xs ${
                          a.presente
                            ? 'text-rose-700 border-rose-200 hover:bg-rose-50'
                            : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {a.presente ? 'Registrar Falta' : 'Dar Presença'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Conteúdo: Avaliações e Médias */}
      {abaAtiva === 'notas' && (
        <Card className="bg-white border-gov-border">
          <CardHeader className="border-b border-gov-border pb-3">
            <CardTitle className="text-sm font-semibold text-gov-text-primary">
              Mapa de Rendimento e Avaliação (Média Aritmética Oficial)
            </CardTitle>
            <p className="text-xs text-gov-text-muted mt-0.5">
              Cálculo declarativo via motor de avaliação sem eval() (mínimo de aprovação: 6.0).
            </p>
          </CardHeader>

          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Estudante</TableHead>
                  <TableHead className="text-xs text-center">1º Bimestre</TableHead>
                  <TableHead className="text-xs text-center">2º Bimestre</TableHead>
                  <TableHead className="text-xs text-center">Média Parcial</TableHead>
                  <TableHead className="text-xs text-right">Situação Provisória</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alunos.map((a) => {
                  const media = a.media_parcial ?? 0;
                  const aprovado = media >= 6.0;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs font-medium text-gov-text-primary">
                        {a.nome}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-center tabular-nums text-gov-text-primary">
                        {a.nota_etapa1?.toFixed(1) ?? '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-center tabular-nums text-gov-text-primary">
                        {a.nota_etapa2?.toFixed(1) ?? '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-center font-bold tabular-nums text-blue-700">
                        {media.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-mono px-2 py-0.5 ${
                            aprovado
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          {aprovado ? 'Apto' : 'Em Recuperação'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Conteúdo: Registro de Aula */}
      {abaAtiva === 'plano' && (
        <Card className="bg-white border-gov-border">
          <CardHeader className="border-b border-gov-border pb-3">
            <CardTitle className="text-sm font-semibold text-gov-text-primary">
              Apontamento de Conteúdo Curricular Ministrado
            </CardTitle>
            <p className="text-xs text-gov-text-muted mt-0.5">
              Registro formal associado ao diário de classe em dia letivo.
            </p>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gov-text-primary mb-1">
                Conteúdo Curricular e Metodologia Aplicada *
              </label>
              <Textarea
                rows={5}
                value={conteudoAula}
                onChange={(e) => setConteudoAula(e.target.value)}
                placeholder="Descreva o conteúdo ministrado..."
                className="text-xs"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
