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
import { formatarCpfCnpj } from './ModalDetalheJazigo';

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
        size="full"
        className="sm:max-w-[96vw] lg:max-w-[96vw] max-w-[96vw] w-[96vw] max-h-[96vh] h-[96vh] overflow-y-auto"
      >
        <div className="space-y-3 py-1">
          {/* Documento Formatado A4 / Grid de Alta Densidade no Modal */}
          <div
            id="secao-ficha-cadastral-a4"
            className="w-full border border-border bg-white text-black p-5 sm:p-6 lg:p-8 rounded-lg shadow-sm space-y-4 print:p-0 print:border-none print:shadow-none"
          >
            {/* Cabeçalho Oficial Municipal */}
            <div className="border-b-2 border-black pb-2.5 flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[9px] tracking-widest uppercase font-bold text-gray-700 block">
                  REPÚBLICA FEDERATIVA DO BRASIL · PODER EXECUTIVO MUNICIPAL
                </span>
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-gray-950">
                  SECRETARIA MUNICIPAL DE ADMINISTRAÇÃO E SERVIÇOS PÚBLICOS
                </h2>
                <p className="text-[11px] text-gray-600 font-medium">
                  Divisão de Gestão de Necrópoles e Serviços Funerários (SIGCM)
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <h1 className="text-sm sm:text-base font-extrabold text-gray-900 uppercase tracking-wide">
                    Ficha Cadastral de Unidade de Sepultamento
                  </h1>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-gray-100 rounded border border-gray-300">
                    {jazigo.codigo}
                  </span>
                </div>
              </div>

              {/* QR Code Autenticador no Cabeçalho */}
              <div className="text-center shrink-0 border border-gray-400 p-1 rounded bg-gray-50 flex flex-col items-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Autenticação ${jazigo.codigo}`}
                    className="w-16 h-16 sm:w-18 sm:h-18 object-contain"
                  />
                ) : (
                  <QrIcon className="h-16 w-16 sm:h-18 sm:w-18 text-gray-400 animate-pulse" />
                )}
                <span className="text-[8px] font-mono block text-gray-600 font-semibold uppercase tracking-wider">
                  Fé Pública / QR
                </span>
              </div>
            </div>

            {/* Grid Superior de 2 Colunas: Dados Físicos/Necrópole (Esq) e Concessão/Titularidade (Dir) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Coluna 1: Identificação da Necrópole & Dados Físicos */}
              <div className="space-y-2.5">
                {/* 1. Necrópole */}
                <div className="border border-gray-200 rounded p-2 bg-gray-50/50">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider border-b border-gray-200 pb-1 mb-1.5 text-gray-900 flex items-center justify-between">
                    <span>1. Identificação da Necrópole</span>
                    <span className="text-[10px] text-gray-500 font-normal">Cemitério Municipal</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="col-span-1">
                      <span className="text-gray-500 block text-[10px]">Cemitério:</span>
                      <span className="font-semibold text-gray-900 text-[11px] block truncate">
                        {jazigo.cemiterio?.nome ?? '—'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500 block text-[10px]">Endereço / Localidade:</span>
                      <span className="text-gray-800 text-[11px] block truncate">
                        {jazigo.cemiterio?.endereco ?? 'Não informado'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Características Físicas da Unidade */}
                <div className="border border-gray-200 rounded p-2 bg-gray-50/50">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider border-b border-gray-200 pb-1 mb-1.5 text-gray-900 flex items-center justify-between">
                    <span>2. Características Físicas & Georreferenciamento</span>
                    <span className="text-[10px] font-mono text-gray-600 font-semibold">{jazigo.codigo}</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500 block text-[10px]">Setor / Quadra:</span>
                      <span className="font-mono font-semibold text-gray-800 text-[11px]">
                        {jazigo.setor?.codigo ?? '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Tipo de Estrutura:</span>
                      <span className="font-medium text-gray-800 capitalize text-[11px]">
                        {jazigo.tipo.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Capacidade / Ocupação:</span>
                      <span className="font-mono font-bold text-gray-900 text-[11px]">
                        {jazigo.ocupacao} de {jazigo.capacidade} gavetas
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Dimensões (C × L):</span>
                      <span className="font-mono font-medium text-gray-800 text-[11px]">
                        {jazigo.comprimento_m ?? '—'} m × {jazigo.largura_m ?? '—'} m
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Área Superficial:</span>
                      <span className="font-mono font-medium text-gray-800 text-[11px]">
                        {jazigo.comprimento_m && jazigo.largura_m
                          ? (jazigo.comprimento_m * jazigo.largura_m).toFixed(2)
                          : '—'}{' '}
                        m²
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Coordenadas GPS:</span>
                      <span className="font-mono text-gray-800 text-[10px] block truncate" title={jazigo.lat && jazigo.lng ? `${jazigo.lat}, ${jazigo.lng}` : 'Sem GPS'}>
                        {jazigo.lat && jazigo.lng
                          ? `${jazigo.lat.toFixed(5)}, ${jazigo.lng.toFixed(5)}`
                          : 'Não georref.'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna 2: Situação Jurídica e Titularidade de Concessão */}
              <div className="border border-gray-200 rounded p-2 bg-gray-50/50 flex flex-col justify-between">
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider border-b border-gray-200 pb-1 mb-1.5 text-gray-900 flex items-center justify-between">
                    <span>3. Concessão de Uso & Titularidade</span>
                    <span className="text-[10px] font-mono text-gray-600">
                      {concessao ? `Termo #${concessao.numero}` : 'Pública'}
                    </span>
                  </h3>
                  {concessao ? (
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-500 block text-[10px]">Termo de Concessão:</span>
                          <span className="font-mono font-bold text-gray-900 text-[11px]">
                            {concessao.numero}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[10px]">Modalidade Jurídica:</span>
                          <span className="capitalize font-semibold text-gray-800 text-[11px]">
                            {concessao.modalidade}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500 block text-[10px]">Titular Concessionário:</span>
                          <span className="font-bold text-gray-950 text-[12px] block">
                            {concessao.concessionario?.nome ?? '—'}
                          </span>
                          {concessao.concessionario && (
                            <span className="text-[10px] font-mono text-gray-700 font-semibold block">
                              CPF/CNPJ: {concessao.concessionario.documento
                                ? formatarCpfCnpj(concessao.concessionario.documento)
                                : (concessao.concessionario.documento_mascarado || '—')}
                            </span>
                          )}
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500 block text-[10px]">Endereço Completo do Titular:</span>
                          <span className="text-gray-800 text-[11px] block">
                            {concessao.concessionario?.endereco || 'Não informado'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[10px]">Telefone de Contato:</span>
                          <span className="font-mono text-gray-800 text-[11px] block">
                            {concessao.concessionario?.telefone || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[10px]">E-mail:</span>
                          <span className="text-gray-800 text-[11px] block truncate" title={concessao.concessionario?.email || ''}>
                            {concessao.concessionario?.email || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[10px]">Período de Vigência:</span>
                          <span className="font-mono text-gray-800 text-[11px] block">
                            {formatarData(concessao.inicio)} até{' '}
                            {concessao.termino ? formatarData(concessao.termino) : 'Perpétua'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[10px]">Processo Administrativo:</span>
                          <span className="font-mono font-bold text-gray-900 text-[11px] block">
                            {concessao.processo_administrativo || '—'}
                          </span>
                        </div>
                      </div>

                      {concessao.concessionario?.titular_falecido && (
                        <div className="rounded border border-amber-300 bg-amber-50 p-1.5 text-xs text-amber-900">
                          <span className="font-bold block text-[11px]">
                            ⚠️ ALERTA: Titular Falecido — Sucessão Pendente
                          </span>
                          <p className="text-[10px] text-amber-800 mt-0.5 leading-tight">
                            Óbito em{' '}
                            {concessao.concessionario.data_falecimento_titular
                              ? formatarData(concessao.concessionario.data_falecimento_titular)
                              : 'data não informada'}
                            . Novos sepultamentos exigem formalização do inventário
                            {concessao.concessionario.processo_inventario
                              ? ` (Proc. ${concessao.concessionario.processo_inventario})`
                              : ''}.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-gray-500 italic bg-gray-100/60 rounded">
                      Unidade sem concessão individual outorgada (cova pública ou disponível para outorga).
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Restos Mortais Inumados na Unidade */}
            <div className="space-y-1">
              <h3 className="text-[11px] font-bold uppercase tracking-wider bg-gray-100 px-2 py-1 border-l-4 border-gray-800 text-gray-900 flex items-center justify-between">
                <span>4. Registros de Inumação (Falecidos Sepultados na Sepultura)</span>
                <span className="font-mono text-[10px] text-gray-600 font-semibold">
                  {ocupantes.length} inumado(s)
                </span>
              </h3>
              {ocupantes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-gray-200">
                    <thead className="bg-gray-100 text-gray-700 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="p-1.5 border-b border-gray-200">Posição / Gaveta</th>
                        <th className="p-1.5 border-b border-gray-200">Nome do Falecido</th>
                        <th className="p-1.5 border-b border-gray-200 font-mono">Data Sepultamento</th>
                        <th className="p-1.5 border-b border-gray-200 font-mono">Certidão de Óbito & Cartório</th>
                        <th className="p-1.5 border-b border-gray-200">Médico Atestante</th>
                        <th className="p-1.5 border-b border-gray-200 font-mono">Ordem de Serviço</th>
                        <th className="p-1.5 border-b border-gray-200">Operadores & Livro</th>
                        <th className="p-1.5 border-b border-gray-200">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {ocupantes.map((oc) => (
                        <tr key={oc.id} className="hover:bg-gray-50/50">
                          <td className="p-1.5 font-mono font-semibold text-gray-900 text-[11px]">
                            {oc.gaveta_numero ? `Gaveta ${oc.gaveta_numero}` : 'Geral'}
                          </td>
                          <td className="p-1.5 text-gray-900 text-[11px]">
                            <span className="font-bold block">{oc.falecido?.nome ?? 'Restos não identificados'}</span>
                            {(oc.falecido?.nascimento || oc.falecido?.falecimento) && (
                              <span className="text-[10px] text-gray-500 block font-mono">
                                {oc.falecido.nascimento ? `Nasc: ${formatarData(oc.falecido.nascimento)} · ` : ''}
                                {oc.falecido.falecimento ? `Óbito: ${formatarData(oc.falecido.falecimento)}` : ''}
                                {oc.falecido.idade_obito != null ? ` (${oc.falecido.idade_obito} a)` : ''}
                              </span>
                            )}
                          </td>
                          <td className="p-1.5 font-mono text-gray-800 text-[11px]">
                            {formatarData(oc.sepultado_em)}
                          </td>
                          <td className="p-1.5 text-gray-800 text-[11px]">
                            <span className="font-mono block">{oc.falecido?.certidao_numero ?? '—'}</span>
                            {(oc.falecido?.certidao_cartorio || oc.cartorio) && (
                              <span className="text-[10px] text-gray-500 block truncate" title={oc.falecido?.certidao_cartorio || oc.cartorio || ''}>
                                {oc.falecido?.certidao_cartorio || oc.cartorio}
                              </span>
                            )}
                          </td>
                          <td className="p-1.5 text-gray-800 text-[11px]">
                            <span className="block truncate" title={oc.medico || 'Não informado'}>
                              {oc.medico || '—'}
                            </span>
                          </td>
                          <td className="p-1.5 font-mono text-gray-800 text-[11px]">
                            {oc.ordem_servico
                              ? `#${oc.ordem_servico.numero}/${oc.ordem_servico.ano}`
                              : '—'}
                          </td>
                          <td className="p-1.5 text-gray-700 text-[10px]">
                            <span className="block">
                              {[oc.coveiro_nome ? `Cov: ${oc.coveiro_nome}` : null, oc.pedreiro_nome ? `Ped: ${oc.pedreiro_nome}` : null]
                                .filter(Boolean)
                                .join(' · ') || '—'}
                            </span>
                            {oc.livro_referencia && (
                              <span className="text-[9px] text-gray-500 block truncate font-mono" title={oc.livro_referencia}>
                                {oc.livro_referencia}
                              </span>
                            )}
                          </td>
                          <td className="p-1.5 capitalize text-gray-700 text-[11px]">
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px]">
                              {oc.situacao}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic p-2 bg-gray-50 rounded border border-dashed border-gray-200">
                  Nenhum registro de inumação ativo ou restos mortais sepultados nesta unidade.
                </p>
              )}
            </div>

            {/* 5. Termo de Autenticidade e Fé Pública */}
            <div className="pt-2 border-t-2 border-gray-800 flex items-end justify-between gap-4 text-[10px] text-gray-600">
              <div className="space-y-0.5">
                <p>
                  Certifico para os devidos fins que as informações constantes nesta ficha cadastral conferem
                  com os livros de registro e a base de dados oficial do município.
                </p>
                <p className="font-mono text-gray-700">
                  Emitido em: {new Date().toLocaleDateString('pt-BR')} às{' '}
                  {new Date().toLocaleTimeString('pt-BR')} · Sistema SIGCM
                </p>
              </div>
              <div className="text-center shrink-0 w-44 border-t border-gray-400 pt-1">
                <span className="block text-[9px] font-semibold text-gray-800 uppercase">
                  Responsável pelo Registro
                </span>
                <span className="block text-[8px] text-gray-500">Serviços Funerários Municipais</span>
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
