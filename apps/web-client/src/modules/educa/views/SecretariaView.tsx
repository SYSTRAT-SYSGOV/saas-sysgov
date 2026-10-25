import React, { useState, useEffect } from 'react';
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
  Modal,
  PessoaPicker,
  Input,
} from '@sysgov/ui';
import { UserCheck, UserPlus, ArrowRightLeft, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useEduca } from '../context/EducaContext';
import { apiClient } from '@/core/api/client';

interface MatriculaItem {
  id: string;
  codigo_matricula: string;
  aluno_nome: string;
  aluno_cpf?: string;
  turma_nome?: string;
  status: string;
  data_matricula: string;
}

export const SecretariaView: React.FC = () => {
  const { escolaAtiva, anoLetivoAtivo } = useEduca();
  const [matriculas, setMatriculas] = useState<MatriculaItem[]>([]);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [modalAberta, setModalAberta] = useState<boolean>(false);

  // Form State para Nova Matrícula
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState<string | number | null>(null);
  const [responsavelSelecionadoId, setResponsavelSelecionadoId] = useState<string | number | null>(null);
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const carregarMatriculas = () => {
    if (!escolaAtiva) return;
    setCarregando(true);
    apiClient
      .get('/educa/secretaria/matriculas', {
        params: { school_id: escolaAtiva.id, ano: anoLetivoAtivo },
      })
      .then((res) => {
        if (res.data?.data) {
          setMatriculas(res.data.data);
        }
      })
      .catch(() => {
        setMatriculas([]);
      })
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregarMatriculas();
  }, [escolaAtiva, anoLetivoAtivo]);

  const handleSalvarMatricula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alunoSelecionadoId || !escolaAtiva) return;

    setSalvando(true);
    try {
      await apiClient.post('/educa/secretaria/matriculas', {
        aluno_pessoa_id: alunoSelecionadoId,
        responsavel_pessoa_id: responsavelSelecionadoId,
        school_id: escolaAtiva.id,
        turma_id: turmaSelecionadaId || undefined,
        ano: anoLetivoAtivo,
      });

      setMensagemSucesso('Matrícula homologada com sucesso e número oficial gerado!');
      setModalAberta(false);
      setAlunoSelecionadoId(null);
      setResponsavelSelecionadoId(null);
      carregarMatriculas();
    } catch {
      // tratamento de erro
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      {mensagemSucesso && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-md flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{mensagemSucesso}</span>
          </div>
          <button onClick={() => setMensagemSucesso(null)} className="text-emerald-600 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Cabeçalho da Secretaria */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-lg border border-gov-border">
        <div>
          <h2 className="text-base font-semibold text-gov-text-primary flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-700" />
            Secretaria Escolar e Matrículas Ativas
          </h2>
          <p className="text-xs text-gov-text-muted mt-0.5">
            Cadastros integrados ao MDM Pessoas sem duplicidade de cidadãos.
          </p>
        </div>

        <Button
          onClick={() => setModalAberta(true)}
          className="bg-blue-700 hover:bg-blue-800 text-white gap-2 text-xs"
        >
          <UserPlus className="w-4 h-4" />
          Nova Matrícula
        </Button>
      </div>

      {/* Lista de Alunos e Matrículas */}
      <Card className="bg-white border-gov-border">
        <CardContent className="pt-4">
          {carregando ? (
            <div className="py-8 text-center text-xs text-gov-text-muted font-mono animate-pulse">
              Carregando registros de matrícula...
            </div>
          ) : matriculas.length === 0 ? (
            <div className="py-8 text-center text-xs text-gov-text-muted">
              Nenhuma matrícula registrada na unidade ativa para este período letivo.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Matrícula (Código)</TableHead>
                  <TableHead className="text-xs">Estudante (Pessoa MDM)</TableHead>
                  <TableHead className="text-xs">CPF</TableHead>
                  <TableHead className="text-xs">Turma</TableHead>
                  <TableHead className="text-xs">Data Matrícula</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matriculas.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs font-semibold tabular-nums text-gov-text-primary">
                      {m.codigo_matricula}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-gov-text-primary">
                      {m.aluno_nome}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gov-text-muted tabular-nums">
                      {m.aluno_cpf || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-gov-text-secondary">
                      {m.turma_nome || <span className="text-amber-600 font-medium">Não enturmado</span>}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gov-text-muted tabular-nums">
                      {m.data_matricula}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-mono px-1.5 py-0 ${
                          m.status === 'ativa'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-gray-50 text-gray-700 border-gray-300'
                        }`}
                      >
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-700 hover:text-blue-900">
                        Histórico
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Nova Matrícula com PessoaPicker */}
      <Modal
        open={modalAberta}
        onOpenChange={setModalAberta}
        title="Homologação de Nova Matrícula Escolar"
        description="Vincule o estudante e responsável legal cadastrados na base canônica de Pessoas do Município."
      >
        <form onSubmit={handleSalvarMatricula} className="space-y-4 pt-2">
          {/* Aluno - PessoaPicker */}
          <div>
            <label className="block text-xs font-semibold text-gov-text-primary mb-1">
              Estudante (Cadastro Único de Pessoas) *
            </label>
            <PessoaPicker
              value={alunoSelecionadoId ? Number(alunoSelecionadoId) : null}
              onChange={(pessoaId) => setAlunoSelecionadoId(pessoaId)}
              placeholder="Buscar estudante pelo nome ou CPF..."
            />
            <span className="text-[11px] text-gov-text-muted mt-0.5 block">
              Consumo canônico do MDM Pessoas sem duplicação de dados.
            </span>
          </div>

          {/* Responsável Legal - PessoaPicker */}
          <div>
            <label className="block text-xs font-semibold text-gov-text-primary mb-1">
              Responsável Legal / Pedagógico *
            </label>
            <PessoaPicker
              value={responsavelSelecionadoId ? Number(responsavelSelecionadoId) : null}
              onChange={(pessoaId) => setResponsavelSelecionadoId(pessoaId)}
              placeholder="Buscar responsável pelo nome ou CPF..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gov-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalAberta(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={salvando || !alunoSelecionadoId}
              className="bg-blue-700 hover:bg-blue-800 text-white"
            >
              {salvando ? 'Processando Matrícula...' : 'Confirmar e Homologar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
