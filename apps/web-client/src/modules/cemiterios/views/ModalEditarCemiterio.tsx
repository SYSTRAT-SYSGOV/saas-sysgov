import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  LocateFixed,
  Save,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  ClipboardPaste,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { Button, Card, Input, Modal, Select } from '@/components/ui';
import { cemiteriosApi, erroApi, type ErroApi, type Parque } from '../api';
import { useCemiteriosContext } from '../CemiteriosContext';

interface ModalEditarCemiterioProps {
  aberto: boolean;
  onFechar: () => void;
  parque: Parque | null;
  onSalvo?: () => void;
}

const OPCOES_TIPO_GESTAO = [
  { value: 'municipal', label: 'Municipal' },
  { value: 'publico', label: 'Público' },
  { value: 'tradicional', label: 'Tradicional' },
  { value: 'parque', label: 'Parque / Jardim' },
  { value: 'distrital', label: 'Distrital' },
  { value: 'privado', label: 'Privado / Particular' },
  { value: 'outro', label: 'Outro / Concessão' },
];

export const ModalEditarCemiterio: React.FC<ModalEditarCemiterioProps> = ({
  aberto,
  onFechar,
  parque,
  onSalvo,
}) => {
  const { recarregarCemiterios } = useCemiteriosContext();

  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [tipo, setTipo] = useState('municipal');
  const [situacao, setSituacao] = useState('ativo');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [portariaLat, setPortariaLat] = useState('');
  const [portariaLng, setPortariaLng] = useState('');

  // Estados de apoio e feedback
  const [colarRapidoCentro, setColarRapidoCentro] = useState('');
  const [colarRapidoPortaria, setColarRapidoPortaria] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [capturandoGps, setCapturandoGps] = useState<'centro' | 'portaria' | null>(null);
  const [msgSucesso, setMsgSucesso] = useState<string | null>(null);
  const [erro, setErro] = useState<ErroApi | null>(null);

  useEffect(() => {
    if (parque) {
      setCodigo(parque.codigo ?? '');
      setNome(parque.nome ?? '');
      setEndereco(parque.endereco ?? '');
      setResponsavel(parque.responsavel ?? '');
      const tipoNormalizado = parque.tipo ? parque.tipo.toLowerCase().trim() : 'municipal';
      setTipo(tipoNormalizado);
      setSituacao(parque.situacao ? parque.situacao.toLowerCase().trim() : 'ativo');
      setLat(parque.lat != null ? String(parque.lat) : '');
      setLng(parque.lng != null ? String(parque.lng) : '');
      setPortariaLat(parque.portaria_lat != null ? String(parque.portaria_lat) : '');
      setPortariaLng(parque.portaria_lng != null ? String(parque.portaria_lng) : '');
      setColarRapidoCentro('');
      setColarRapidoPortaria('');
      setErro(null);
      setMsgSucesso(null);
    }
  }, [parque, aberto]);

  const opcoesTipo = React.useMemo(() => {
    const lista = [...OPCOES_TIPO_GESTAO];
    if (tipo && !lista.some((opt) => opt.value === tipo)) {
      lista.push({ value: tipo, label: tipo.charAt(0).toUpperCase() + tipo.slice(1) });
    }
    return lista;
  }, [tipo]);

  if (!parque) return null;

  // Analisador inteligente de coordenadas (aceita formatos do Google Maps, OpenStreetMap, etc.)
  const parseCoordenadas = (texto: string): { lat: string; lng: string } | null => {
    if (!texto.trim()) return null;
    const limpo = texto.replace(/[°º]/g, '').trim();
    const partes = limpo.split(/[,;\s]+/).filter(Boolean);
    if (partes.length >= 2) {
      const latVal = parseFloat(partes[0]);
      const lngVal = parseFloat(partes[1]);
      if (!isNaN(latVal) && !isNaN(lngVal) && latVal >= -90 && latVal <= 90 && lngVal >= -180 && lngVal <= 180) {
        return { lat: String(latVal), lng: String(lngVal) };
      }
    }
    return null;
  };

  const lidarPasteInput = (e: React.ClipboardEvent<HTMLInputElement>, destino: 'centro' | 'portaria') => {
    const textoColado = e.clipboardData.getData('text');
    const coords = parseCoordenadas(textoColado);
    if (coords) {
      e.preventDefault();
      if (destino === 'centro') {
        setLat(coords.lat);
        setLng(coords.lng);
      } else {
        setPortariaLat(coords.lat);
        setPortariaLng(coords.lng);
      }
    }
  };

  const aplicarColarRapido = (destino: 'centro' | 'portaria') => {
    const texto = destino === 'centro' ? colarRapidoCentro : colarRapidoPortaria;
    const coords = parseCoordenadas(texto);
    if (coords) {
      if (destino === 'centro') {
        setLat(coords.lat);
        setLng(coords.lng);
        setColarRapidoCentro('');
      } else {
        setPortariaLat(coords.lat);
        setPortariaLng(coords.lng);
        setColarRapidoPortaria('');
      }
    } else {
      setErro({
        status: 400,
        mensagem: 'Formato de coordenadas inválido. Exemplo esperado: -25.4284, -49.2733',
      });
    }
  };

  const copiarCentroParaPortaria = () => {
    if (lat && lng) {
      setPortariaLat(lat);
      setPortariaLng(lng);
    }
  };

  const capturarGps = (tipoAlvo: 'centro' | 'portaria') => {
    if (!navigator.geolocation) {
      setErro({ status: 400, mensagem: 'Geolocalização não suportada neste navegador.' });
      return;
    }

    setCapturandoGps(tipoAlvo);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude.toFixed(7);
        const longitude = pos.coords.longitude.toFixed(7);
        if (tipoAlvo === 'centro') {
          setLat(latitude);
          setLng(longitude);
        } else {
          setPortariaLat(latitude);
          setPortariaLng(longitude);
        }
        setCapturandoGps(null);
      },
      () => {
        setCapturandoGps(null);
        setErro({ status: 400, mensagem: 'Não foi possível ler as coordenadas GPS. Verifique a permissão do navegador.' });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !codigo.trim()) {
      setErro({ status: 422, mensagem: 'Nome e código são obrigatórios.' });
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      const dados: Partial<Parque> = {
        codigo: codigo.trim(),
        nome: nome.trim(),
        endereco: endereco.trim() || null,
        responsavel: responsavel.trim() || null,
        tipo,
        situacao,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        portaria_lat: portariaLat ? parseFloat(portariaLat) : null,
        portaria_lng: portariaLng ? parseFloat(portariaLng) : null,
      };

      await cemiteriosApi.atualizarParque(parque.id, dados);
      await recarregarCemiterios();

      setMsgSucesso('Dados e coordenadas da necrópole atualizados com sucesso!');
      onSalvo?.();
      setTimeout(() => {
        onFechar();
      }, 1200);
    } catch (err) {
      setErro(erroApi(err));
    } finally {
      setSalvando(false);
    }
  };

  const temCoordenadasCentrais = lat.trim() !== '' && lng.trim() !== '';
  const temPortaria = portariaLat.trim() !== '' && portariaLng.trim() !== '';

  return (
    <Modal
      open={aberto}
      onOpenChange={(open) => !open && onFechar()}
      size="2xl"
      icon={<Building2 className="h-5 w-5 text-primary" />}
      title={`Editar Necrópole — ${parque.nome}`}
      description="Atualize dados cadastrais, situação operacional e coordenadas geográficas georreferenciadas (GIS) para o mapa e traçado de rotas."
      footer={
        <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-xs">
            {temCoordenadasCentrais ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Georreferenciamento central ativo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Coordenadas centrais não configuradas
              </span>
            )}
            {temPortaria && (
              <span className="hidden sm:inline-flex items-center gap-1 text-muted-foreground">
                • <Compass className="h-3.5 w-3.5 text-primary" /> Portaria definida
              </span>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onFechar} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-editar-cemiterio"
              variant="default"
              size="sm"
              disabled={salvando}
              className="gap-1.5 min-w-[140px]"
            >
              {salvando ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <form id="form-editar-cemiterio" onSubmit={salvar} className="space-y-6">
        {msgSucesso && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium animate-in fade-in-50">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{msgSucesso}</span>
          </div>
        )}

        {erro && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive animate-in fade-in-50">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{erro.mensagem}</span>
          </div>
        )}

        {/* ── Grid Principal de 2 Colunas ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ═══ Coluna 1: Dados Cadastrais & Operacionais ═══ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-border">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Identificação e Operação</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Código da Necrópole *
                </label>
                <Input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="ex: CEM-01"
                  className="font-mono text-xs font-semibold uppercase tracking-wider"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Situação Operacional
                </label>
                <Select
                  value={situacao}
                  onChange={setSituacao}
                  options={[
                    { value: 'ativo', label: 'Ativo / Em Operação' },
                    { value: 'inativo', label: 'Inativo / Desativado' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Nome Oficial do Cemitério *
              </label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="ex: Cemitério Municipal Central"
                className="text-xs font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Tipo de Gestão
                </label>
                <Select
                  value={tipo}
                  onChange={setTipo}
                  options={opcoesTipo}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Administrador / Responsável
                </label>
                <Input
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  placeholder="Nome do gestor ou zelador"
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Endereço Completo
              </label>
              <Input
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, número, bairro, cidade - UF, CEP"
                className="text-xs"
              />
            </div>

            <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-[11px] text-muted-foreground flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                As alterações cadastrais são versionadas e registradas na trilha de auditoria do município.
              </span>
            </div>
          </div>

          {/* ═══ Coluna 2: Georreferenciamento Geodésico (GIS) ═══ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-border">
              <Compass className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Georreferenciamento Geodésico (GIS)</h3>
            </div>

            {/* ── Coordenadas Centrais ── */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground leading-none">
                      Coordenadas Centrais (Ponto do Mapa)
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Centro do polígono para foco automático na visualização GIS
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => capturarGps('centro')}
                  disabled={capturandoGps !== null}
                  className="h-8 text-xs gap-1.5 shrink-0"
                >
                  {capturandoGps === 'centro' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LocateFixed className="h-3.5 w-3.5 text-primary" />
                  )}
                  <span>Capturar GPS</span>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Latitude Central
                  </label>
                  <Input
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    onPaste={(e) => lidarPasteInput(e, 'centro')}
                    placeholder="-25.4284000"
                    className="font-mono text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Longitude Central
                  </label>
                  <Input
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    onPaste={(e) => lidarPasteInput(e, 'centro')}
                    placeholder="-49.2733000"
                    className="font-mono text-xs tabular-nums"
                  />
                </div>
              </div>

              {/* Colagem Rápida Inteligente */}
              <div className="flex items-center gap-2 pt-1 border-t border-dashed border-border/80">
                <div className="relative flex-1">
                  <Input
                    value={colarRapidoCentro}
                    onChange={(e) => setColarRapidoCentro(e.target.value)}
                    placeholder="Colar par do Google Maps (ex: -25.4284, -49.2733)"
                    className="font-mono text-[11px] h-7 pr-8"
                  />
                  <ClipboardPaste className="absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => aplicarColarRapido('centro')}
                  className="h-7 text-[11px] px-2.5"
                >
                  Aplicar
                </Button>
              </div>
            </div>

            {/* ── Coordenadas da Portaria / Acesso ── */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Navigation className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground leading-none">
                      Portaria / Portão Principal (Como Chegar)
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Destino de navegação GPS para Google Maps, Waze e QR Code
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {temCoordenadasCentrais && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={copiarCentroParaPortaria}
                      title="Copiar coordenadas do centro para a portaria"
                      className="h-8 text-[11px] px-2 gap-1 text-muted-foreground"
                    >
                      <Copy className="h-3 w-3" />
                      <span className="hidden sm:inline">Copiar do Centro</span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => capturarGps('portaria')}
                    disabled={capturandoGps !== null}
                    className="h-8 text-xs gap-1.5"
                  >
                    {capturandoGps === 'portaria' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <LocateFixed className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <span>GPS Portaria</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Latitude da Portaria
                  </label>
                  <Input
                    value={portariaLat}
                    onChange={(e) => setPortariaLat(e.target.value)}
                    onPaste={(e) => lidarPasteInput(e, 'portaria')}
                    placeholder="-25.4280000"
                    className="font-mono text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Longitude da Portaria
                  </label>
                  <Input
                    value={portariaLng}
                    onChange={(e) => setPortariaLng(e.target.value)}
                    onPaste={(e) => lidarPasteInput(e, 'portaria')}
                    placeholder="-49.2730000"
                    className="font-mono text-xs tabular-nums"
                  />
                </div>
              </div>

              {/* Colagem Rápida para Portaria */}
              <div className="flex items-center gap-2 pt-1 border-t border-dashed border-border/80">
                <div className="relative flex-1">
                  <Input
                    value={colarRapidoPortaria}
                    onChange={(e) => setColarRapidoPortaria(e.target.value)}
                    placeholder="Colar par da Portaria (ex: -25.4280, -49.2730)"
                    className="font-mono text-[11px] h-7 pr-8"
                  />
                  <ClipboardPaste className="absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => aplicarColarRapido('portaria')}
                  className="h-7 text-[11px] px-2.5"
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
