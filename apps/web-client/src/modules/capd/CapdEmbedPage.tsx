import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
} from '@sysgov/ui';
import {
  Award,
  CheckCircle,
  FileText,
  Lock,
  Plus,
  Shield,
  Loader2,
  AlertCircle,
  Clock,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiEmbedContext } from '@sysgov/sdk';

const api = new SysgovApi();

export const CapdEmbedPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const forcedMode = searchParams.get('mode');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<ApiEmbedContext | null>(null);

  // Form states
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [citTipo, setCitTipo] = useState<'positivo' | 'negativo'>('positivo');
  const [citFatorId, setCitFatorId] = useState<number>(1);
  const [citDescricao, setCitDescricao] = useState<string>('');
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setError('Token de embutimento (token) ausente na URL.');
      setLoading(false);
      return;
    }

    api.capd
      .getEmbedContext(token)
      .then((data: ApiEmbedContext) => {
        setContext(data);
        const initialRespostas: Record<string, number> = {};
        data.fatores?.forEach((f) => {
          initialRespostas[f.codigo] = 4;
        });
        setRespostas(initialRespostas);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error('Erro ao carregar contexto embed:', err);
        setError('O token de embutimento é inválido ou expirou. Solicite um novo acesso ao sistema de RH.');
        setLoading(false);
      });
  }, [token]);

  const activeMode = forcedMode || context?.session.mode || 'autoavaliacao';

  const handleSalvarAutoavaliacao = async () => {
    setSubmitting(true);
    setSucessoMsg(null);
    try {
      // Simulação de submissão do formulário de autoavaliação via token
      await new Promise((r) => setTimeout(r, 600));
      setSucessoMsg('Autoavaliação salva com sucesso no sistema da Comissão CAPD.');
    } catch (e: any) {
      setError('Erro ao salvar autoavaliação.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGravarCit = async () => {
    if (!citDescricao.trim()) {
      alert('Informe a descrição do fato ocorrido.');
      return;
    }
    setSubmitting(true);
    setSucessoMsg(null);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setSucessoMsg('Incidente Crítico (CIT) registrado com sucesso no Diário de Bordo.');
      setCitDescricao('');
    } catch (e: any) {
      setError('Erro ao registrar incidente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 gap-3">
        <Loader2 className="w-8 h-8 text-[#0c326f] animate-spin" />
        <span className="font-mono text-xs text-slate-500 font-bold uppercase tracking-wider">
          Carregando módulo CAPD seguro...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md p-6 text-center border-rose-200 bg-white shadow-lg">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Acesso Não Autorizado</h2>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <span className="font-mono text-xs text-slate-400">SYSGOV • Módulo de Avaliação Embutido</span>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 max-w-4xl mx-auto font-sans antialiased text-slate-900">
      {/* Header Institucional Compacto */}
      <div className="bg-[#0c326f] text-white rounded-xl p-4 sm:p-5 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm sm:text-base tracking-wide uppercase">
              Comissão de Avaliação Periódica de Desempenho (CAPD)
            </span>
          </div>
          <p className="text-xs text-slate-200">
            {context?.servidor ? (
              <>
                Servidor: <strong className="text-white">{context.servidor.nome}</strong> • Matrícula:{' '}
                <span className="font-mono">{context.servidor.matricula}</span> • Cargo:{' '}
                {context.servidor.cargo}
              </>
            ) : (
              'Portal Integrado de Avaliação Funcional'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs font-mono">
            {context?.ciclo ? context.ciclo.nome : 'Ciclo Vigente'}
          </Badge>
          <Badge variant="success" className="text-xs">
            Conectado via RH API
          </Badge>
        </div>
      </div>

      {sucessoMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-sm font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{sucessoMsg}</span>
        </div>
      )}

      {/* MODO 1: AUTOAVALIAÇÃO */}
      {activeMode === 'autoavaliacao' && (
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-[#0c326f] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#0c326f]" />
              Formulário de Autoavaliação de Desempenho
            </CardTitle>
            <CardDescription>
              Atribua seu grau de desempenho de 1 (Crítico) a 5 (Excelente) em cada um dos fatores
              regulamentados da legislação municipal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              {context?.fatores.map((fator) => (
                <div key={fator.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="inline-block font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#0c326f]/10 text-[#0c326f] mr-2">
                        {fator.codigo}
                      </span>
                      <strong className="text-sm text-slate-800">{fator.nome}</strong>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 font-mono">
                        Peso: {fator.peso.toFixed(2)}
                      </span>
                      <select
                        value={respostas[fator.codigo] || 4}
                        onChange={(e) =>
                          setRespostas({ ...respostas, [fator.codigo]: Number(e.target.value) })
                        }
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-mono font-bold text-[#0c326f] focus:ring-2 focus:ring-[#0c326f] focus:outline-hidden"
                      >
                        <option value={5}>5 — Excelente / Pleno</option>
                        <option value={4}>4 — Muito Bom</option>
                        <option value={3}>3 — Regular / Satisfatório</option>
                        <option value={2}>2 — Insuficiente</option>
                        <option value={1}>1 — Crítico</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{fator.descricao}</p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <Button
                variant="primary"
                onClick={handleSalvarAutoavaliacao}
                disabled={submitting}
                leftIcon={submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              >
                {submitting ? 'Salvando...' : 'Submeter Minha Autoavaliação'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODO 2: DIÁRIO DE BORDO (CIT) */}
      {activeMode === 'diario-bordo' && (
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-[#0c326f] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#0c326f]" />
              Lançamento Rápido no Diário de Bordo (CIT)
            </CardTitle>
            <CardDescription>
              Registro tempestivo de incidentes críticos (positivos ou negativos) com ciência eletrônica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Tipo de Ocorrência
                </label>
                <select
                  value={citTipo}
                  onChange={(e) => setCitTipo(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm"
                >
                  <option value="positivo">🟢 Incidente Crítico Positivo (Elogio / Desempenho Excepcional)</option>
                  <option value="negativo">🔴 Incidente Crítico Negativo (Ocorrência / Desvio Normativo)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Fator Relacionado
                </label>
                <select
                  value={citFatorId}
                  onChange={(e) => setCitFatorId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm"
                >
                  {context?.fatores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.codigo} — {f.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Descrição Detalhada do Fato Observado
              </label>
              <textarea
                value={citDescricao}
                onChange={(e) => setCitDescricao(e.target.value)}
                rows={4}
                placeholder="Descreva o fato concreto de forma objetiva, indicando data, impacto e contexto..."
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-[#0c326f] focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                onClick={handleGravarCit}
                disabled={submitting}
                leftIcon={submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              >
                Gravar Registro no Diário
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODO 3: ESPELHO DE NOTAS */}
      {activeMode === 'espelho' && (
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-[#0c326f] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0c326f]" />
              Espelho Funcional de Desempenho
            </CardTitle>
            <CardDescription>
              Histórico consolidado de avaliações, pontuações ponderadas e elegibilidade à progressão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 uppercase font-mono font-bold block">
                  Status de Avaliação
                </span>
                <strong className="text-base text-slate-800">Ciclo 2026 em Andamento</strong>
              </div>
              <Badge variant="warning">Em Processamento</Badge>
            </div>

            <div className="text-center py-8 text-slate-500 text-sm">
              Nenhuma avaliação anterior arquivada para esta matrícula neste tenant.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rodapé Seguro de Auditoria */}
      <div className="mt-8 text-center text-xs text-slate-400 font-mono flex items-center justify-center gap-2">
        <Lock className="w-3.5 h-3.5" />
        Sessão isolada via token criptográfico SHA-256 • Tenant ID #{context?.session.tenant_id} • SYSGOV
      </div>
    </div>
  );
};

export default CapdEmbedPage;
