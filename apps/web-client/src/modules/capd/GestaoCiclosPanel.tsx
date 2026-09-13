import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Modal,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@sysgov/ui';
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  ShieldAlert,
  ArrowRight,
  Settings,
  Users,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiCiclo } from '@sysgov/sdk';

const api = new SysgovApi();

export const GestaoCiclosPanel: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [ciclos, setCiclos] = useState<ApiCiclo[]>([]);
  const [selectedCiclo, setSelectedCiclo] = useState<ApiCiclo | null>(null);

  // Modal de abertura de ciclo
  const [showModalNovoCiclo, setShowModalNovoCiclo] = useState<boolean>(false);
  const [formAno, setFormAno] = useState<number>(new Date().getFullYear());
  const [formNome, setFormNome] = useState<string>('');
  const [formDataInicio, setFormDataInicio] = useState<string>(`${new Date().getFullYear()}-01-01`);
  const [formDataFim, setFormDataFim] = useState<string>(`${new Date().getFullYear()}-12-31`);
  const [formDataLimitePreenchimento, setFormDataLimitePreenchimento] = useState<string>('');
  const [formDataLimiteRecurso, setFormDataLimiteRecurso] = useState<string>('');
  const [formEtapa, setFormEtapa] = useState<number>(1);
  const [saving, setSaving] = useState<boolean>(false);

  // Modal de Elegibilidade
  const [showModalElegibilidade, setShowModalElegibilidade] = useState<boolean>(false);
  const [elegibilidadeData, setElegibilidadeData] = useState<any>(null);
  const [loadingElegibilidade, setLoadingElegibilidade] = useState<boolean>(false);

  const fetchCiclos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.capd.listCiclos();
      setCiclos(data);
      if (!selectedCiclo && data.length > 0) {
        setSelectedCiclo(data[0]);
      }
    } catch (e) {
      console.error('Erro ao carregar ciclos:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedCiclo]);

  useEffect(() => {
    fetchCiclos();
  }, [fetchCiclos]);

  const handleCriarCiclo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.capd.createCiclo({
        ano_competencia: formAno,
        ano_referencia: formAno,
        nome: formNome || `Ciclo de Avaliação de Desempenho ${formAno}`,
        data_inicio: formDataInicio,
        data_fim: formDataFim,
        data_inicio_avaliacao: formDataInicio,
        data_fim_avaliacao: formDataFim,
        data_limite_preenchimento: formDataLimitePreenchimento || undefined,
        data_limite_recurso: formDataLimiteRecurso || undefined,
        etapa_cadencia: formEtapa,
        cadencia_automatica: true,
        status: 'aberto',
      });
      setShowModalNovoCiclo(false);
      await fetchCiclos();
    } catch (err: any) {
      alert(`Erro ao criar ciclo: ${err.message || 'Falha na requisição'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEncerrarCiclo = async (ciclo: ApiCiclo, abrirProximo: boolean) => {
    const confirmMsg = abrirProximo
      ? `Confirma o encerramento do Ciclo ${ciclo.nome} e a abertura imediata do ciclo seguinte de 12 meses?`
      : `Confirma o encerramento do Ciclo ${ciclo.nome}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.capd.encerrarCiclo(ciclo.id, abrirProximo);
      await fetchCiclos();
    } catch (err: any) {
      alert(`Não foi possível encerrar o ciclo: ${err.message || 'Verifique pendências'}`);
    }
  };

  const handleVerElegibilidade = async (ciclo: ApiCiclo) => {
    setSelectedCiclo(ciclo);
    setShowModalElegibilidade(true);
    setLoadingElegibilidade(true);
    try {
      const res = await api.capd.getElegibilidadeCiclo(ciclo.id);
      setElegibilidadeData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingElegibilidade(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Topo com botão de abertura ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Gestão de Ciclos de Avaliação (Cadência de 12 Meses)
          </h2>
          <p className="text-sm text-slate-500">
            Triênio probatório de 3 avaliações em 3 anos com parametrização de prazos e elegibilidade
          </p>
        </div>

        <Button
          variant="default"
          onClick={() => {
            const nextAno = ciclos.length > 0 ? (ciclos[0].ano_competencia || 2026) + 1 : new Date().getFullYear();
            setFormAno(nextAno);
            setFormNome(`Ciclo de Desempenho ${nextAno}`);
            setFormDataInicio(`${nextAno}-01-01`);
            setFormDataFim(`${nextAno}-12-31`);
            setShowModalNovoCiclo(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Abrir Novo Ciclo
        </Button>
      </div>

      {/* ── Lista de Ciclos Cadastrados ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ciclos.map((ciclo) => {
          const ano = ciclo.ano_competencia || ciclo.ano_referencia;
          const isAtivo = ciclo.status !== 'encerrado';

          return (
            <Card
              key={ciclo.id}
              className={`border transition-all ${
                isAtivo ? 'border-blue-300 shadow-md bg-white' : 'border-slate-200 bg-slate-50/60 opacity-85'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`font-mono text-xs uppercase ${
                      ciclo.status === 'homologado'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : isAtivo
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-slate-100 text-slate-600 border-slate-300'
                    }`}
                  >
                    {ciclo.status}
                  </Badge>

                  <span className="text-xs text-slate-500 font-mono">
                    Etapa {ciclo.etapa_cadencia || 1} de 3
                  </span>
                </div>

                <CardTitle className="text-lg font-bold text-slate-900 mt-2">
                  {ciclo.nome}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 font-mono tabular-nums">
                  Ano de Competência: {ano}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 text-sm">
                <div className="space-y-1.5 py-2 border-y border-slate-100 font-mono text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Período Vigência:</span>
                    <span className="font-semibold text-slate-800">
                      {ciclo.data_inicio || ciclo.data_inicio_avaliacao} até {ciclo.data_fim || ciclo.data_fim_avaliacao}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Limite Preenchimento:</span>
                    <span className="font-semibold text-amber-700">
                      {ciclo.data_limite_preenchimento || 'Definido no regulamento'}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Limite Recursal:</span>
                    <span className="font-semibold text-indigo-700">
                      {ciclo.data_limite_recurso}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => handleVerElegibilidade(ciclo)}
                  >
                    <Users className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                    Consultar Elegibilidade & Bloqueios
                  </Button>

                  {isAtivo && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-amber-300 hover:bg-amber-50 text-amber-800"
                        onClick={() => handleEncerrarCiclo(ciclo, false)}
                      >
                        Encerrar
                      </Button>

                      <Button
                        size="sm"
                        variant="default"
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleEncerrarCiclo(ciclo, true)}
                      >
                        Encerrar & Abrir N+1
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Modal: Abertura de Novo Ciclo ────────────────────────────── */}
      <Modal
        open={showModalNovoCiclo}
        onClose={() => setShowModalNovoCiclo(false)}
        title="Abertura de Novo Ciclo de 12 Meses"
      >
        <form onSubmit={handleCriarCiclo} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Ciclo
            </label>
            <Input
              value={formNome}
              onChange={(e) => setFormNome(e.target.value)}
              placeholder="Ex.: Ciclo de Avaliação de Desempenho 2027"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ano de Competência
              </label>
              <Input
                type="number"
                value={formAno}
                onChange={(e) => setFormAno(Number(e.target.value))}
                className="font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Etapa do Triênio
              </label>
              <Input
                type="number"
                min={1}
                max={3}
                value={formEtapa}
                onChange={(e) => setFormEtapa(Number(e.target.value))}
                className="font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data de Início
              </label>
              <Input
                type="date"
                value={formDataInicio}
                onChange={(e) => setFormDataInicio(e.target.value)}
                className="font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data de Término
              </label>
              <Input
                type="date"
                value={formDataFim}
                onChange={(e) => setFormDataFim(e.target.value)}
                className="font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prazo Preenchimento (Opcional)
              </label>
              <Input
                type="date"
                value={formDataLimitePreenchimento}
                onChange={(e) => setFormDataLimitePreenchimento(e.target.value)}
                className="font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prazo Limite para Recursos
              </label>
              <Input
                type="date"
                value={formDataLimiteRecurso}
                onChange={(e) => setFormDataLimiteRecurso(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModalNovoCiclo(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? 'Criando...' : 'Confirmar e Abrir Ciclo'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Consulta de Elegibilidade & Bloqueios ─────────────── */}
      <Modal
        open={showModalElegibilidade}
        onClose={() => setShowModalElegibilidade(false)}
        title={`Elegibilidade no ${selectedCiclo?.nome || 'Ciclo'}`}
      >
        {loadingElegibilidade ? (
          <div className="text-center py-8 text-slate-400">
            Carregando verificação de elegibilidade e bloqueios legais...
          </div>
        ) : elegibilidadeData ? (
          <div className="space-y-4">
            <div className="flex gap-4 p-3 bg-slate-50 rounded border border-slate-200 text-xs font-mono">
              <div>
                Total Analisados: <span className="font-bold">{elegibilidadeData.total_analisados}</span>
              </div>
              <div>
                Elegíveis: <span className="font-bold text-emerald-600">{elegibilidadeData.total_elegiveis}</span>
              </div>
              <div>
                Bloqueados: <span className="font-bold text-red-600">{elegibilidadeData.total_bloqueados}</span>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servidor</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Motivo / Bloqueio Legal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {elegibilidadeData.servidores?.map((s: any) => (
                    <TableRow key={s.servidor_id}>
                      <TableCell className="font-medium text-xs">
                        {s.nome_completo}
                        <div className="text-slate-400 font-mono">{s.matricula}</div>
                      </TableCell>
                      <TableCell>
                        {s.elegivel ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                            Apto
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            Bloqueado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {s.bloqueios?.length > 0 ? (
                          <span className="text-red-600">{s.bloqueios.join('; ')}</span>
                        ) : s.avisos?.length > 0 ? (
                          <span className="text-amber-600">{s.avisos.join('; ')}</span>
                        ) : (
                          <span className="text-slate-400">Sem impedimentos identificados</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
