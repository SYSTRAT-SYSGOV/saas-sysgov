import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import type { Opcoes } from '../api';
import { Censo } from './Censo';
import { CensoImportar } from './CensoImportar';
import { LeiauteImportacaoTela } from './LeiauteImportacao';

/** Censo: exportação do Registro 60, importação do arquivo do Educacenso e o leiaute dessa importação. */
export const CensoAbas: React.FC<{ opcoes: Opcoes; avisar: Toast }> = ({ opcoes, avisar }) => {
  const p = opcoes.permissoes;
  const abas = [
    { id: 'exportar', rotulo: 'Exportar', visivel: p.exportar_censo },
    { id: 'importar', rotulo: 'Importar do Educacenso', visivel: p.importar_censo },
    { id: 'leiaute', rotulo: 'Leiaute de importação', visivel: p.configurar_leiaute_censo },
  ].filter((a) => a.visivel);
  // Só uma aba: sem barra, como era antes.
  if (abas.length === 1) {
    return abas[0].id === 'exportar' ? <Censo opcoes={opcoes} avisar={avisar} /> : abas[0].id === 'importar' ? <CensoImportar avisar={avisar} /> : <LeiauteImportacaoTela avisar={avisar} />;
  }
  return (
    <Tabs defaultValue={abas[0].id}>
      <TabsList>{abas.map((a) => <TabsTrigger key={a.id} value={a.id}>{a.rotulo}</TabsTrigger>)}</TabsList>
      {p.exportar_censo && <TabsContent value="exportar"><Censo opcoes={opcoes} avisar={avisar} /></TabsContent>}
      {p.importar_censo && <TabsContent value="importar"><CensoImportar avisar={avisar} /></TabsContent>}
      {p.configurar_leiaute_censo && <TabsContent value="leiaute"><LeiauteImportacaoTela avisar={avisar} /></TabsContent>}
    </Tabs>
  );
};
