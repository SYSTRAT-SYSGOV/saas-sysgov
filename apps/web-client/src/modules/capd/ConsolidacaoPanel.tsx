import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@sysgov/ui';
import {
  Trophy,
  Download,
  PlayCircle,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  FileText,
  Users,
} from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';

const api = new SysgovApi();

interface ServidorNfc {
  servidor_id: number;
  nome: string;
  matricula: string;
  notas_ciclos: Record<string, string>;
  nfc: string | null;
  conceito: string | null;
  elegivel: boolean;
}

interface RankingItem extends ServidorNfc {
  posicao: number;
  data_admissao?: string;
  data_nascimento?: string;
}

interface NfcResponse {
  ciclo_id: number;
  nota_corte: string;
  total: number;
  aptos: number;
  inaptos: number;
  servidores: ServidorNfc[];
}

interface RankingResponse {
  ciclo_id: number;
  nota_corte: string;
  total: number;
  ranking: RankingItem[];
}

interface CicloOpcao {
  id: number;
  nome: string;
  ano_competencia: number;
  status: string;
}

const CONCEITO_COLOR: Record<string, string> = {
  Excelente:   'text-emerald-400',
  Bom:         'text-indigo-400',
  Regular:     'text-amber-400',
  Insuficiente:'text-rose-400',
};

export const ConsolidacaoPanel: React.FC = () => {
  const [ciclos, setCiclos]             = useState<CicloOpcao[]>([]);
  const [cicloId, setCicloId]           = useState<number | null>(null);
  const [nfcData, setNfcData]           = useState<NfcResponse | null>(null);
  const [rankingData, setRankingData]   = useState<RankingResponse | null>(null);
  const [aba, setAba]                   = useState<'nfc' | 'ranking'>('nfc');
  const [loading, setLoading]           = useState(false);
  const [processando, setProcessando]   = useState(false);
  const [erro, setErro]                 = useState<string | null>(null);
  const [sucesso, setSucesso]           = useState<string | null>(null);

  const carregarCiclos = useCallback(async () => {
    try {
      const resp = await api.get<CicloOpcao[]>('/capd/ciclos');
      setCiclos(resp.data ?? []);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { carregarCiclos(); }, [carregarCiclos]);

  const carregarNfc = useCallback(async () => {
    if (!cicloId) return;
    setLoading(true);
    setErro(null);
    setNfcData(null);
    setRankingData(null);
    try {
      const [nfcResp, rkResp] = await Promise.all([
        api.get<NfcResponse>(`/capd/consolidacao/${cicloId}/nfc`),
        api.get<RankingResponse>(`/capd/consolidacao/${cicloId}/ranking`),
      ]);
      setNfcData(nfcResp.data);
      setRankingData(rkResp.data);
    } catch {
      setErro('Não foi possível calcular as NFCs. Verifique se o ciclo possui avaliações concluídas.');
    } finally {
      setLoading(false);
    }
  }, [cicloId]);

  const processarConsolidacao = async () => {
    if (!cicloId) return;
    setProcessando(true);
    setErro(null);
    try {
      const resp = await api.post<any>(`/capd/consolidacao/${cicloId}/processar`, {});
      setSucesso(resp.data?.message ?? 'Consolidação realizada com sucesso!');
      carregarNfc();
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao processar consolidação.');
    } finally {
      setProcessando(false);
    }
  };

  const exportarPdf = () => {
    if (!cicloId) return;
    window.open(`/api/capd/consolidacao/${cicloId}/exportar-pdf`, '_blank');
  };

  const cicloOptions = ciclos.map(c => ({
    value: String(c.id),
    label: `${c.nome} (${c.ano_competencia})`,
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Consolidação NFC Trienal e Ranking
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Nota Final Consolidada (RN-02) e Ranking de Progressão com desempate legal (RN-05)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            options={[{ value: '', label: 'Selecione o ciclo...' }, ...cicloOptions]}
            value={String(cicloId ?? '')}
            onChange={v => { setCicloId(v ? Number(v) : null); setNfcData(null); setRankingData(null); }}
            placeholder="Selecione o ciclo"
            className="w-60 text-xs"
          />
          <Button variant="ghost" size="sm" onClick={carregarNfc} disabled={!cicloId || loading}>
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {erro && (
        <div className="flex items-start gap-2 bg-rose-950/50 border border-rose-500/30 rounded-lg p-3 text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}
      {sucesso && (
        <div className="flex items-start gap-2 bg-emerald-950/50 border border-emerald-500/30 rounded-lg p-3 text-emerald-300 text-xs">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{sucesso}</span>
        </div>
      )}

      {!cicloId && (
        <div className="text-center py-12 bg-[#152244] rounded-xl border border-[#1a2a52]">
          <Trophy className="w-10 h-10 mx-auto mb-3 text-slate-500" />
          <p className="text-slate-400 text-sm">Selecione um ciclo para calcular a NFC trienal.</p>
        </div>
      )}

      {cicloId && loading && (
        <div className="text-slate-400 text-sm text-center py-8">Calculando NFCs...</div>
      )}

      {/* KPIs */}
      {nfcData && !loading && (
        <>
          {/* Cards KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-[#152244] border-[#1a2a52]">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-3 h-3 text-indigo-400" />
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">Total</span>
                </div>
                <span className="font-mono text-xl font-bold text-white">{nfcData.total}</span>
              </CardContent>
            </Card>
            <Card className="bg-emerald-950/30 border-emerald-500/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400/70 uppercase tracking-wide">Aptos</span>
                </div>
                <span className="font-mono text-xl font-bold text-emerald-400">{nfcData.aptos}</span>
              </CardContent>
            </Card>
            <Card className="bg-rose-950/30 border-rose-500/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span className="text-[10px] text-rose-400/70 uppercase tracking-wide">Inaptos</span>
                </div>
                <span className="font-mono text-xl font-bold text-rose-400">{nfcData.inaptos}</span>
              </CardContent>
            </Card>
            <Card className="bg-amber-950/30 border-amber-500/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] text-amber-400/70 uppercase tracking-wide">Nota de Corte</span>
                </div>
                <span className="font-mono text-xl font-bold text-amber-400">{nfcData.nota_corte}</span>
              </CardContent>
            </Card>
          </div>

          {/* Ações */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={exportarPdf}>
              <Download className="w-3 h-3 mr-1" /> Exportar PDF
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={processarConsolidacao}
              disabled={processando}
            >
              <PlayCircle className="w-3 h-3 mr-1" />
              {processando ? 'Processando...' : 'Processar Consolidação e Gerar PMDs'}
            </Button>
          </div>

          {/* Abas NFC / Ranking */}
          <div className="flex gap-1 bg-[#101a3a] rounded-lg p-1 w-fit">
            {(['nfc', 'ranking'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setAba(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  aba === tab
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'nfc' ? 'Notas por Servidor' : 'Ranking Progressão'}
              </button>
            ))}
          </div>

          {/* Tabela NFC */}
          {aba === 'nfc' && (
            <Card className="bg-[#152244] border-[#1a2a52]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Matrícula</TableHead>
                    <TableHead className="text-xs">Servidor</TableHead>
                    <TableHead className="text-xs">Notas por Ciclo</TableHead>
                    <TableHead className="text-xs text-center">NFC</TableHead>
                    <TableHead className="text-xs text-center">Conceito</TableHead>
                    <TableHead className="text-xs text-center">Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nfcData.servidores.map(srv => (
                    <TableRow key={srv.servidor_id}>
                      <TableCell className="font-mono text-xs text-slate-400">{srv.matricula}</TableCell>
                      <TableCell className="text-xs">{srv.nome}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-300">
                        {Object.entries(srv.notas_ciclos).map(([ano, nota]) => (
                          <span key={ano} className="mr-2">{ano}: <strong>{nota}</strong></span>
                        ))}
                        {Object.keys(srv.notas_ciclos).length === 0 && <span className="text-slate-500">—</span>}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold">
                        <span className={srv.nfc ? (srv.elegivel ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-500'}>
                          {srv.nfc ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xs font-medium ${CONCEITO_COLOR[srv.conceito ?? ''] ?? 'text-slate-400'}`}>
                          {srv.conceito ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {srv.nfc ? (
                          <Badge variant={srv.elegivel ? 'default' : 'outline'} className="text-[10px]">
                            {srv.elegivel ? 'Apto' : 'Inapto'}
                          </Badge>
                        ) : (
                          <span className="text-slate-500 text-xs">Sem nota</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Tabela Ranking */}
          {aba === 'ranking' && rankingData && (
            <Card className="bg-[#152244] border-[#1a2a52]">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">
                  Ordenado por: (1) Maior NFC · (2) Maior tempo de serviço · (3) Maior idade — art. 39, Lei 1.704/2006
                </CardDescription>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs text-center">Posição</TableHead>
                    <TableHead className="text-xs">Matrícula</TableHead>
                    <TableHead className="text-xs">Servidor</TableHead>
                    <TableHead className="text-xs text-center">NFC</TableHead>
                    <TableHead className="text-xs text-center">Conceito</TableHead>
                    <TableHead className="text-xs">Admissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankingData.ranking.map(item => (
                    <TableRow key={item.servidor_id}>
                      <TableCell className="text-center">
                        <span className={`font-mono font-bold text-sm ${
                          item.posicao === 1 ? 'text-amber-400' :
                          item.posicao === 2 ? 'text-slate-300' :
                          item.posicao === 3 ? 'text-amber-600' : 'text-slate-400'
                        }`}>{item.posicao}°</span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-400">{item.matricula}</TableCell>
                      <TableCell className="text-xs">{item.nome}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-emerald-400">
                        {item.nfc}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xs ${CONCEITO_COLOR[item.conceito ?? ''] ?? 'text-slate-400'}`}>
                          {item.conceito}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-400">
                        {item.data_admissao
                          ? new Date(item.data_admissao).toLocaleDateString('pt-BR')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ConsolidacaoPanel;
