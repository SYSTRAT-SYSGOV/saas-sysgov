import React, { useEffect, useState } from 'react';
import { Card, CardContent, Button, Select } from '@sysgov/ui';
import type { SelectOption } from '@sysgov/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScreenState } from '@/components/ui/ScreenState';
import { requerimentosApi } from '../api';
import { BarChart3, Download } from 'lucide-react';

export const RelatoriosView: React.FC = () => {
  const [tipoRelatorio, setTipoRelatorio] = useState('quantitativo');
  const [dados, setDados] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        let res;
        switch (tipoRelatorio) {
          case 'tempo-medio':
            res = await requerimentosApi.getRelatorioTempoMedio();
            break;
          case 'cumprimento-prazos':
            res = await requerimentosApi.getRelatorioCumprimentoPrazos();
            break;
          default:
            res = await requerimentosApi.getRelatorioQuantitativo();
        }
        setDados(res.data);
      } catch {
        setDados(null);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [tipoRelatorio]);

  const tipoOptions: SelectOption[] = [
    { value: 'quantitativo', label: 'Quantitativo' },
    { value: 'tempo-medio', label: 'Tempo Médio de Tramitação' },
    { value: 'cumprimento-prazos', label: 'Cumprimento de Prazos' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BarChart3 className="h-6 w-6" />}
        title="Relatórios Gerenciais"
        subtitle="Indicadores e estatísticas de proposições e tramitações"
      />

      <div className="flex items-center gap-4">
        <div className="w-64">
          <Select
            value={tipoRelatorio}
            onChange={(val) => setTipoRelatorio(val)}
            options={tipoOptions}
          />
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" />
          Exportar
        </Button>
      </div>

      {loading ? (
        <ScreenState type="loading" title="Gerando relatório..." />
      ) : !dados ? (
        <ScreenState type="error" title="Erro" description="Não foi possível gerar o relatório." />
      ) : (
        <Card>
          <CardContent className="p-6">
            <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(dados, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};