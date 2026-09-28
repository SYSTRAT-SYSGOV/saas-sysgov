import React, { useState } from 'react';
import { Download, FileJson, Globe2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { cemiteriosApi } from '../api';

interface BotaoExportacaoGisProps {
  parkId?: number | null;
  nomeCemiterio?: string | null;
}

export const BotaoExportacaoGis: React.FC<BotaoExportacaoGisProps> = ({
  parkId,
  nomeCemiterio,
}) => {
  const [exportando, setExportando] = useState<string | null>(null);

  const baixar = async (formato: 'geojson' | 'kml') => {
    if (!parkId) return;

    try {
      setExportando(formato);
      const dados = await cemiteriosApi.exportarGis(parkId, formato);

      const mimeType = formato === 'kml' ? 'application/vnd.google-earth.kml+xml' : 'application/geo+json';
      const conteudo = typeof dados === 'string' ? dados : JSON.stringify(dados, null, 2);
      const blob = new Blob([conteudo], { type: `${mimeType};charset=utf-8` });

      const link = document.createElement('a');
      const dataHora = new Date().toISOString().slice(0, 10);
      const slug = (nomeCemiterio ?? `cemiterio-${parkId}`).toLowerCase().replace(/[^a-z0-9]/g, '_');
      link.href = URL.createObjectURL(blob);
      link.download = `${slug}_${dataHora}.${formato}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch {
      // Erro tratado pelo axios interceptor ou tela
    } finally {
      setExportando(null);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-foreground">
        <Download className="h-4 w-4 text-primary" />
        <span>Exportação Cartográfica (QGIS)</span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Exporte as geometrias e atributos da necrópole ativa para integração com setores de engenharia municipal.
      </p>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          disabled={!parkId || exportando !== null}
          onClick={() => void baixar('geojson')}
          className="h-8 gap-1.5 text-xs justify-start"
          title="Exportar em formato GeoJSON para QGIS ou ArcGIS"
        >
          {exportando === 'geojson' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <FileJson className="h-3.5 w-3.5 text-emerald-500" />
          )}
          <span>GeoJSON</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={!parkId || exportando !== null}
          onClick={() => void baixar('kml')}
          className="h-8 gap-1.5 text-xs justify-start"
          title="Exportar em formato KML para Google Earth"
        >
          {exportando === 'kml' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <Globe2 className="h-3.5 w-3.5 text-cyan-500" />
          )}
          <span>KML (Earth)</span>
        </Button>
      </div>
    </div>
  );
};
