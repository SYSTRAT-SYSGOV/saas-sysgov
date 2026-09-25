import React, { useEffect, useState } from 'react';
import { Modal, Button, Badge } from '@sysgov/ui';
import { Printer, FileText, QrCode as QrIcon, ShieldCheck } from 'lucide-react';
import {
  cemiteriosApi,
  formatarData,
  type Jazigo,
  type Concessao,
  type Inumacao,
} from '../api';
import { gerarQrCodeDataUrl, gerarUrlConsultaJazigo } from '../qrcode.utils';

export interface ModalFichaCadastralProps {
  aberto: boolean;
  jazigo: Jazigo | null;
  concessao?: Concessao | null;
  ocupantes?: Inumacao[];
  onFechar: () => void;
}

export const ModalFichaCadastral: React.FC<ModalFichaCadastralProps> = ({
  aberto,
  jazigo,
  concessao: concessaoProp,
  ocupantes: ocupantesProp,
  onFechar,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [concessaoInterna, setConcessaoInterna] = useState<Concessao | null>(null);
  const [ocupantesInternos, setOcupantesInternos] = useState<Inumacao[]>([]);
  const [carregando, setCarregando] = useState(false);

  const concessao = concessaoProp !== undefined ? concessaoProp : concessaoInterna;
  const ocupantes = ocupantesProp !== undefined ? ocupantesProp : ocupantesInternos;

  const urlConsulta = jazigo
    ? gerarUrlConsultaJazigo({ id: jazigo.id, codigo: jazigo.codigo })
    : '';

  useEffect(() => {
    if (!jazigo || !aberto) {
      setQrDataUrl('');
      return;
    }

    let ativo = true;

    // Gerar QR Code
    gerarQrCodeDataUrl(urlConsulta, { largura: 200, margem: 1 })
      .then((url) => {
        if (ativo) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Erro ao gerar QR Code para ficha:', err);
      });

    // Se props não foram providas, buscar dados
    if (concessaoProp === undefined || ocupantesProp === undefined) {
      setCarregando(true);
      Promise.all([
        concessaoProp === undefined ? cemiteriosApi.concessoes({ plot_id: jazigo.id }) : null,
        ocupantesProp === undefined ? cemiteriosApi.inumacoes({ plot_id: jazigo.id }) : null,
      ])
        .then(([concRes, inumRes]) => {
          if (!ativo) return;
          if (concRes?.data?.[0]) setConcessaoInterna(concRes.data[0]);
          if (inumRes?.data) setOcupantesInternos(inumRes.data);
        })
        .finally(() => {
          if (ativo) setCarregando(false);
        });
    }

    return () => {
      ativo = false;
    };
  }, [jazigo, aberto, urlConsulta, concessaoProp, ocupantesProp]);

  const acionarImpressao = () => {
    window.print();
  };

  if (!jazigo) return null;

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #secao-ficha-cadastral-a4,
          #secao-ficha-cadastral-a4 * {
            visibility: visible !important;
          }
          #secao-ficha-cadastral-a4 {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 15mm 20mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .nao-imprimir {
            display: none !important;
          }
        }
      `}</style>

      <Modal
        open={aberto}
        onClose={onFechar}
        title="Ficha Cadastral da Unidade de Sepultamento"
        description="Documento cadastral oficial emitido para fiscalização, instrução processual e fé pública."
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4 py-2">
          {/* Documento Formatado A4 */}
          <div
            id="secao-ficha-cadastral-a4"
            className="border border-border bg-white text-black p-6 rounded-lg shadow-sm space-y-5 print:p-0 print:border-none print:shadow-none"
          >
            {/* Cabeçalho Oficial Municipal */}
            <div className="border-b-2 border-black pb-4 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] tracking-widest uppercase font-bold text-gray-700 block">
                  REPÚBLICA FEDERATIVA DO BRASIL · PODER EXECUTIVO MUNICIPAL
                </span>
                <h2 className="text-sm font-black uppercase tracking-wider text-gray-950">
                  SECRETARIA MUNICIPAL DE ADMINISTRAÇÃO E SERVIÇOS PÚBLICOS
                </h2>
                <p className="text-xs text-gray-600 font-medium">
                  Divisão de Gestão de Necrópoles e Serviços Funerários (SIGCM)
                </p>
                <h1 className="text-base font-extrabold text-gray-900 pt-2 uppercase tracking-wide">
                  Ficha Cadastral de Unidade de Sepultamento
                </h1>
              </div>

              {/* QR Code Autenticador no Cabeçalho */}
              <div className="text-center shrink-0 border border-gray-400 p-1.5 rounded bg-gray-50">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Autenticação ${jazigo.codigo}`}
                    className="w-20 h-20 object-contain mx-auto"
                  />
                ) : (
                  <QrIcon className="h-20 w-20 text-gray-400 animate-pulse" />
                )}
                <span className="text-[9px] font-mono block text-gray-600 pt-1 font-semibold">
                  Autenticidade
                </span>
              </div>
            </div>

            {/* 1. Identificação Geral da Necrópole */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider bg-gray-100 px-2 py-1 border-l-4 border-gray-800 text-gray-900">
                1. Identificação da Necrópole
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 text-xs">
                <div>
                  <span className="text-gray-500 block text-[11px]">Cemitério Municipal:</span>
                  <span className="font-semibold text-gray-900">{jazigo.cemiterio?.nome ?? '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Endereço:</span>
                  <span className="text-gray-800 truncate block">{jazigo.cemiterio?.endereco ?? 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Administrador Responsável:</span>
                  <span className="text-gray-800">{jazigo.cemiterio?.responsavel ?? 'Gabinete de Necrópoles'}</span>
                </div>
              </div>
            </div>

            {/* 2. Dados Físicos e Estruturais da Unidade */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider bg-gray-100 px-2 py-1 border-l-4 border-gray-800 text-gray-900">
                2. Características Físicas e Georreferenciamento
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2 text-xs">
                <div>
                  <span className="text-gray-500 block text-[11px]">Código da Unidade:</span>
                  <span className="font-mono font-bold text-gray-950 text-sm">{jazigo.codigo}</span>
                  {jazigo.codigo_legado && (
                    <span className="text-[10px] text-gray-500 block font-mono">
                      Legado: {jazigo.codigo_legado}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Setor / Quadra:</span>
                  <span className="font-mono font-semibold text-gray-800">{jazigo.setor?.codigo ?? '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Tipo de Estrutura:</span>
                  <span className="font-medium text-gray-800 capitalize">{jazigo.tipo.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Capacidade / Ocupação:</span>
                  <span className="font-mono font-bold text-gray-900">
                    {jazigo.ocupacao} de {jazigo.capacidade} gavetas
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Dimensões Físicas:</span>
                  <span className="font-mono font-medium text-gray-800">
                    {jazigo.comprimento_m ?? '—'} m × {jazigo.largura_m ?? '—'} m
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Área Superficial:</span>
                  <span className="font-mono font-medium text-gray-800">
                    {jazigo.comprimento_m && jazigo.largura_m
                      ? (jazigo.comprimento_m * jazigo.largura_m).toFixed(2)
                      : '—'}{' '}
                    m²
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 block text-[11px]">Georreferenciamento (Lat / Lng):</span>
                  <span className="font-mono text-gray-800 text-[11px]">
                    {jazigo.lat && jazigo.lng
                      ? `${jazigo.lat.toFixed(6)}, ${jazigo.lng.toFixed(6)}`
                      : 'Não georreferenciado'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Situação Jurídica e Titularidade de Concessão */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider bg-gray-100 px-2 py-1 border-l-4 border-gray-800 text-gray-900">
                3. Concessão de Uso e Titularidade
              </h3>
              {concessao ? (
                <div className="space-y-2 p-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <span className="text-gray-500 block text-[11px]">Termo de Concessão:</span>
                      <span className="font-mono font-bold text-gray-900">{concessao.numero}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Titular Concessionário:</span>
                      <span className="font-semibold text-gray-900">
                        {concessao.concessionario?.nome ?? '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Modalidade Jurídica:</span>
                      <span className="capitalize font-medium text-gray-800">{concessao.modalidade}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Período de Vigência:</span>
                      <span className="font-mono text-gray-800 text-[11px]">
                        {formatarData(concessao.inicio)} até{' '}
                        {concessao.termino ? formatarData(concessao.termino) : 'Perpétua'}
                      </span>
                    </div>
                    {concessao.processo_administrativo && (
                      <div className="col-span-2">
                        <span className="text-gray-500 block text-[11px]">Processo Administrativo:</span>
                        <span className="font-mono font-bold text-gray-900">
                          {concessao.processo_administrativo}
                        </span>
                      </div>
                    )}
                  </div>

                  {concessao.concessionario?.titular_falecido && (
                    <div className="rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                      <span className="font-bold block">
                        ⚠️ ALERTA REGULATÓRIO: Titular Falecido — Sucessão Hereditária Pendente
                      </span>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Falecimento registrado em{' '}
                        {concessao.concessionario.data_falecimento_titular
                          ? formatarData(concessao.concessionario.data_falecimento_titular)
                          : 'data não informada'}
                        . Qualquer novo sepultamento de terceiros requer regularização de sucessão por alvará judicial ou inventário
                        {concessao.concessionario.processo_inventario
                          ? ` (Processo: ${concessao.concessionario.processo_inventario})`
                          : ''}.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic p-2">
                  Unidade pública sem concessão individual outorgada (disponível para concessão ou cova pública).
                </p>
              )}
            </div>

            {/* 4. Restos Mortais Inumados na Unidade */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider bg-gray-100 px-2 py-1 border-l-4 border-gray-800 text-gray-900">
                4. Registros de Inumação (Falecidos Sepultados)
              </h3>
              {ocupantes.length > 0 ? (
                <div className="overflow-x-auto p-1">
                  <table className="w-full text-left text-xs border border-gray-200">
                    <thead className="bg-gray-100 text-gray-700 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="p-2 border-b border-gray-200">Gaveta</th>
                        <th className="p-2 border-b border-gray-200">Falecido</th>
                        <th className="p-2 border-b border-gray-200">Data Sepultamento</th>
                        <th className="p-2 border-b border-gray-200">Certidão de Óbito</th>
                        <th className="p-2 border-b border-gray-200">Ordem de Serviço</th>
                        <th className="p-2 border-b border-gray-200">Coveiro / Pedreiro</th>
                        <th className="p-2 border-b border-gray-200">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {ocupantes.map((oc) => (
                        <tr key={oc.id}>
                          <td className="p-2 font-mono font-semibold text-gray-900">
                            {oc.gaveta_numero ? `Gaveta ${oc.gaveta_numero}` : '—'}
                          </td>
                          <td className="p-2 font-medium text-gray-900">
                            {oc.falecido?.nome ?? 'Restos não identificados'}
                          </td>
                          <td className="p-2 font-mono text-gray-800">{formatarData(oc.sepultado_em)}</td>
                          <td className="p-2 font-mono text-gray-800">
                            {oc.falecido?.certidao_numero ?? '—'}
                            {oc.cartorio && <span className="block text-[10px] text-gray-500">Cartório: {oc.cartorio}</span>}
                          </td>
                          <td className="p-2 font-mono text-gray-800">
                            {oc.ordem_servico
                              ? `#${oc.ordem_servico.numero}/${oc.ordem_servico.ano}`
                              : '—'}
                          </td>
                          <td className="p-2 text-gray-700 text-[11px]">
                            {[oc.coveiro_nome ? `Cov: ${oc.coveiro_nome}` : null, oc.pedreiro_nome ? `Ped: ${oc.pedreiro_nome}` : null]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                          </td>
                          <td className="p-2 capitalize text-gray-700">{oc.situacao}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic p-2">
                  Nenhum registro de inumação ativo ou restos mortais sepultados nesta unidade.
                </p>
              )}
            </div>

            {/* 5. Termo de Autenticidade e Fé Pública */}
            <div className="pt-4 border-t-2 border-gray-800 flex items-end justify-between gap-4 text-[10px] text-gray-600">
              <div className="space-y-1">
                <p>
                  Certifico para os devidos fins que as informações constantes nesta ficha cadastral conferem
                  com os livros de registro e a base de dados oficial do município.
                </p>
                <p className="font-mono text-gray-700">
                  Emitido em: {new Date().toLocaleDateString('pt-BR')} às{' '}
                  {new Date().toLocaleTimeString('pt-BR')} · Sistema SIGCM
                </p>
              </div>
              <div className="text-center shrink-0 w-48 border-t border-gray-400 pt-1">
                <span className="block text-[10px] font-semibold text-gray-800 uppercase">
                  Responsável pelo Registro
                </span>
                <span className="block text-[9px] text-gray-500">Serviços Funerários Municipais</span>
              </div>
            </div>
          </div>

          {/* Barra de Ações do Modal */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={onFechar}>
              Fechar
            </Button>
            <Button size="sm" onClick={acionarImpressao} className="gap-1.5 font-medium">
              <Printer className="h-3.5 w-3.5" /> Imprimir Ficha Cadastral (A4)
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
