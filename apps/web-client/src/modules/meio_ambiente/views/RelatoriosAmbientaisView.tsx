import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Input, Select } from '@sysgov/ui';
import { Download, FileBarChart } from 'lucide-react';
import { ScreenState } from '@/components/ui/ScreenState';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  meioAmbienteApi,
  erroApi,
  type FormatoExportacaoRelatorio,
  type RelatorioAmbientalResumo,
  type TipoRelatorioAmbiental,
} from '../api';

const TIPOS_RELATORIO: { value: TipoRelatorioAmbiental; label: string }[] = [
  { value: 'rars', label: 'Relatório Anual de Resíduos Sólidos (RARS)' },
  { value: 'gee', label: 'Inventário de Emissões de GEE' },
];

const ROTULO_TIPO: Record<TipoRelatorioAmbiental, string> = {
  rars: 'RARS',
  gee: 'Inventário GEE',
};

const FORMATOS: FormatoExportacaoRelatorio[] = ['csv', 'json', 'pdf'];

/**
 * Geração e exportação dos relatórios ambientais obrigatórios. Cada geração é um
 * retrato congelado do exercício (o backend não recalcula na exportação) — por isso
 * a lista mostra o histórico de gerações, não um relatório "vivo" por exercício.
 */
export const RelatoriosAmbientaisView: React.FC = () => {
  const anoAnterior = new Date().getFullYear() - 1;

  const [relatorios, setRelatorios] = useState<RelatorioAmbientalResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tipo, setTipo] = useState<TipoRelatorioAmbiental>('rars');
  const [exercicio, setExercicio] = useState(String(anoAnterior));
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setRelatorios(await meioAmbienteApi.listarRelatoriosAmbientais());
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const gerar = async () => {
    setGerando(true);
    setErro(null);
    try {
      await meioAmbienteApi.gerarRelatorioAmbiental(tipo, Number(exercicio));
      await carregar();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setGerando(false);
    }
  };

  const exportar = async (relatorio: RelatorioAmbientalResumo, formato: FormatoExportacaoRelatorio) => {
    setErro(null);
    try {
      await meioAmbienteApi.exportarRelatorioAmbiental(relatorio, formato);
    } catch (e) {
      setErro(erroApi(e).mensagem);
    }
  };

  if (carregando) {
    return <ScreenState type="loading" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold"><FileBarChart className="h-4 w-4" /> Gerar Relatório Obrigatório</h3>

        {erro && <div className="mb-4 rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Relatório" value={tipo} onChange={(v) => setTipo(v as TipoRelatorioAmbiental)} options={TIPOS_RELATORIO} />
          <Input label="Exercício" type="number" value={exercicio} max={anoAnterior + 1} onChange={(e) => setExercicio(e.target.value)} />
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          O inventário de GEE é uma estimativa (IPCC Tier 1) a partir dos resíduos destinados a aterro e da área queimada
          registrados no módulo, com fatores de emissão de referência que devem ser validados pela equipe técnica.
        </p>

        <Button className="mt-4" onClick={gerar} disabled={gerando || exercicio === ''}>
          {gerando ? 'Gerando...' : 'Gerar Relatório'}
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 text-sm font-semibold">Relatórios Gerados</h3>

        {relatorios.length === 0 ? (
          <EmptyState icon={<FileBarChart className="h-8 w-8" />} title="Nenhum relatório gerado ainda" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">Relatório</th>
                <th>Exercício</th>
                <th>Gerado em</th>
                <th>Por</th>
                <th className="text-right">Exportar</th>
              </tr>
            </thead>
            <tbody>
              {relatorios.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2"><Badge variant="outline">{ROTULO_TIPO[r.tipo]}</Badge></td>
                  <td className="font-mono tabular-nums">{r.exercicio}</td>
                  <td className="font-mono tabular-nums">{new Date(r.gerado_em).toLocaleString('pt-BR')}</td>
                  <td>{r.gerado_por ?? '—'}</td>
                  <td>
                    <div className="flex justify-end gap-2">
                      {FORMATOS.map((formato) => (
                        <Button key={formato} size="sm" variant="outline" onClick={() => exportar(r, formato)} aria-label={`Exportar ${ROTULO_TIPO[r.tipo]} ${r.exercicio} em ${formato.toUpperCase()}`}>
                          <Download className="mr-1 h-3 w-3" />
                          {formato.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};

export default RelatoriosAmbientaisView;
