import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  CheckCircle2,
  User,
  Briefcase,
  Contact,
  Pencil,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { Button, Modal, StatusChip, Field, Input, Select } from '@/components/ui';
import { TIPOS_VINCULO, pessoasApi, type Pessoa, type PessoaVinculo, type TipoVinculo } from '../api';
import { useVinculos } from '../hooks/useVinculos';
import { ErroBox, FormModal, Mono, useAcao, formatarData } from './comum';
import { SubEntidadesManager } from './SubEntidadesManager';

const opcoesVinculo = Object.entries(TIPOS_VINCULO).map(([value, label]) => ({ value, label }));

const opcoesSexo = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
  { value: 'Outro', label: 'Outro' },
];

const opcoesEstadoCivil = [
  { value: 'Solteiro(a)', label: 'Solteiro(a)' },
  { value: 'Casado(a)', label: 'Casado(a)' },
  { value: 'Divorciado(a)', label: 'Divorciado(a)' },
  { value: 'Viúvo(a)', label: 'Viúvo(a)' },
  { value: 'União Estável', label: 'União Estável' },
];

type AbaDetalhe = 'dados-civis' | 'vinculos' | 'sub-entidades';

interface PessoaDetailViewProps {
  pessoa: Pessoa;
  podeGerenciar: boolean;
  podePromover: boolean;
  podeExcluir: boolean;
  onFechar: () => void;
  onAtualizado: () => Promise<void>;
  onExcluido: () => Promise<void>;
  onPromover: () => void;
  onSalvarEdicaoCivil: (dados: Record<string, unknown>) => Promise<unknown>;
}

export const PessoaDetailView: React.FC<PessoaDetailViewProps> = ({
  pessoa,
  podeGerenciar,
  podePromover,
  podeExcluir,
  onFechar,
  onAtualizado,
  onExcluido,
  onPromover,
  onSalvarEdicaoCivil,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<AbaDetalhe>('dados-civis');
  const [modalEditarCivil, setModalEditarCivil] = useState(false);
  const [modalVinculo, setModalVinculo] = useState(false);
  const [vinculoEncerrando, setVinculoEncerrando] = useState<PessoaVinculo | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const [cpfRevelado, setCpfRevelado] = useState<string | null>(pessoa.cpf_desmascarado ?? null);
  const [revelandoCpf, setRevelandoCpf] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const alternarRevelacaoCpf = async () => {
    if (cpfRevelado) {
      setCpfRevelado(null);
      return;
    }
    setRevelandoCpf(true);
    try {
      const res = await pessoasApi.auditarAcessoSensivel(pessoa.id);
      setCpfRevelado(res.cpf);
    } catch {
      // Ignora falha de autorização
    } finally {
      setRevelandoCpf(false);
    }
  };

  const copiarCpf = async () => {
    const valor = cpfRevelado || pessoa.cpf_mascarado;
    await navigator.clipboard.writeText(valor);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const { erro: erroAcao, executar } = useAcao();
  const {
    enviando: enviandoVinculo,
    erro: erroVinculo,
    adicionarVinculo,
    encerrarVinculo,
  } = useVinculos(onAtualizado);

  const [formCivil, setFormCivil] = useState({
    nome: '',
    nome_social: '',
    data_nascimento: '',
    sexo: '',
    nome_mae: '',
    nome_pai: '',
    estado_civil: '',
    nacionalidade: '',
    naturalidade: '',
    nis: '',
    falecido: false,
    data_falecimento: '',
    certidao_obito_numero: '',
    cartorio_obito: '',
    observacao_obito: '',
  });

  const abrirEditarCivil = () => {
    setFormCivil({
      nome: pessoa.nome,
      nome_social: pessoa.nome_social ?? '',
      data_nascimento: pessoa.data_nascimento ?? '',
      sexo: pessoa.sexo ?? '',
      nome_mae: pessoa.nome_mae ?? '',
      nome_pai: pessoa.nome_pai ?? '',
      estado_civil: pessoa.estado_civil ?? '',
      nacionalidade: pessoa.nacionalidade ?? 'Brasileira',
      naturalidade: pessoa.naturalidade ?? '',
      nis: pessoa.nis ?? '',
      falecido: Boolean(pessoa.falecido || pessoa.status === 'falecido'),
      data_falecimento: pessoa.data_falecimento ?? '',
      certidao_obito_numero: pessoa.certidao_obito_numero ?? '',
      cartorio_obito: pessoa.cartorio_obito ?? '',
      observacao_obito: pessoa.observacao_obito ?? '',
    });
    setModalEditarCivil(true);
  };

  const salvarCivil = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await executar(() => onSalvarEdicaoCivil(formCivil));
    if (res) {
      setModalEditarCivil(false);
      await onAtualizado();
    }
  };

  const vinculosAtivos = (pessoa.vinculos ?? []).filter((v) => !v.fim);
  const possuiVinculosAtivos = vinculosAtivos.length > 0;

  const abas = [
    { id: 'dados-civis' as AbaDetalhe, label: 'Identificação & Filiação', icon: User },
    {
      id: 'vinculos' as AbaDetalhe,
      label: `Vínculos Funcionais (${pessoa.vinculos?.length ?? 0})`,
      icon: Briefcase,
    },
    {
      id: 'sub-entidades' as AbaDetalhe,
      label: `Documentos, Endereços e Contatos`,
      icon: Contact,
    },
  ];

  return (
    <>
      <Modal
        open
        onClose={onFechar}
        title={pessoa.nome}
        description={`CPF ${cpfRevelado ?? pessoa.cpf_mascarado} • Situação cadastral: ${pessoa.status.toUpperCase()}${pessoa.falecido || pessoa.status === 'falecido' ? ' • FALECIDO(A)' : ''}`}
        size="2xl"
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <div>
              {podeExcluir && !confirmandoExclusao && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirmandoExclusao(true)}
                  disabled={possuiVinculosAtivos}
                  title={
                    possuiVinculosAtivos
                      ? 'Pessoas com vínculos funcionais ativos não podem ser excluídas.'
                      : 'Excluir registro da pessoa'
                  }
                >
                  Excluir pessoa
                </Button>
              )}
              {podeExcluir && confirmandoExclusao && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-destructive font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Confirmar exclusão permanente?
                  </span>
                  <Button size="xs" variant="outline" onClick={() => setConfirmandoExclusao(false)}>
                    Cancelar
                  </Button>
                  <Button size="xs" variant="destructive" onClick={() => void onExcluido()}>
                    Confirmar
                  </Button>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={onFechar}>
              Fechar
            </Button>
          </div>
        }
      >
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          <ErroBox erro={erroAcao ?? erroVinculo} />

          {/* BARRA DE NAVEGAÇÃO ENTRE ABAS */}
          <div className="flex items-center gap-2 border-b border-border pb-1">
            {abas.map((aba) => {
              const Icone = aba.icon;
              const ativa = abaAtiva === aba.id;
              return (
                <button
                  key={aba.id}
                  type="button"
                  onClick={() => setAbaAtiva(aba.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-md border-b-2 transition-all ${
                    ativa
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <Icone className="h-4 w-4" />
                  <span>{aba.label}</span>
                </button>
              );
            })}
          </div>

          {/* ABA 1: DADOS CIVIS E FILIAÇÃO */}
          {abaAtiva === 'dados-civis' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Identificação Civil e Registro Geral</h3>
                  <p className="text-xs text-muted-foreground">
                    Dados primários de filiação e documentação civil nacional.
                  </p>
                </div>
                {podeGerenciar && (
                  <Button size="sm" variant="outline" onClick={abrirEditarCivil}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar dados civis
                  </Button>
                )}
              </div>

              {/* CARD DESTAQUE CPF & PRIVACIDADE LGPD */}
              <div className="rounded-lg border border-border/80 bg-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Cadastro de Pessoa Física (CPF)
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Mono className="text-base font-bold text-foreground">
                        {cpfRevelado ? cpfRevelado : pessoa.cpf_mascarado}
                      </Mono>
                      {pessoa.pode_desmascarar && (
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          onClick={() => void alternarRevelacaoCpf()}
                          disabled={revelandoCpf}
                          className="h-7 px-2 text-xs flex items-center gap-1 text-primary hover:text-primary-dark"
                          title={cpfRevelado ? 'Ocultar CPF completo' : 'Revelar CPF completo (Auditado LGPD)'}
                        >
                          {cpfRevelado ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          <span>{revelandoCpf ? 'Carregando...' : cpfRevelado ? 'Ocultar' : 'Revelar (Admin)'}</span>
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={() => void copiarCpf()}
                        className="h-7 px-2 text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        title="Copiar CPF"
                      >
                        {copiado ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiado ? 'Copiado!' : 'Copiar'}</span>
                      </Button>
                    </div>
                  </div>
                  {pessoa.pode_desmascarar ? (
                    <div className="text-[11px] flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium shrink-0 self-start sm:self-auto">
                      <ShieldCheck className="h-4 w-4" /> Visualização administrativa completa autorizada
                    </div>
                  ) : (
                    <div className="text-[11px] flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-1.5 rounded-full font-medium shrink-0 self-start sm:self-auto">
                      <ShieldAlert className="h-4 w-4" /> Mascaramento de privacidade LGPD ativo
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-border/80 bg-muted/10 p-3.5">
                  <div className="text-xs text-muted-foreground">Nome Social</div>
                  <div className="mt-1 text-sm font-medium text-foreground">{pessoa.nome_social || '—'}</div>
                </div>

                <div className="rounded-lg border border-border/80 bg-muted/10 p-3.5">
                  <div className="text-xs text-muted-foreground">Data de Nascimento</div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    {pessoa.data_nascimento ? <Mono>{formatarData(pessoa.data_nascimento)}</Mono> : '—'}
                  </div>
                </div>

                <div className="rounded-lg border border-border/80 bg-muted/10 p-3.5">
                  <div className="text-xs text-muted-foreground">Sexo / Gênero</div>
                  <div className="mt-1 text-sm font-medium text-foreground">{pessoa.sexo || '—'}</div>
                </div>

                <div className="rounded-lg border border-border/80 bg-muted/10 p-3.5">
                  <div className="text-xs text-muted-foreground">Estado Civil</div>
                  <div className="mt-1 text-sm font-medium text-foreground">{pessoa.estado_civil || '—'}</div>
                </div>

                <div className="rounded-lg border border-border/80 bg-muted/10 p-3.5">
                  <div className="text-xs text-muted-foreground">Nacionalidade</div>
                  <div className="mt-1 text-sm font-medium text-foreground">{pessoa.nacionalidade || '—'}</div>
                </div>

                <div className="rounded-lg border border-border/80 bg-muted/10 p-3.5">
                  <div className="text-xs text-muted-foreground">Naturalidade</div>
                  <div className="mt-1 text-sm font-medium text-foreground">{pessoa.naturalidade || '—'}</div>
                </div>

                <div className="rounded-lg border border-border/80 bg-muted/10 p-3.5">
                  <div className="text-xs text-muted-foreground">Nome da Mãe</div>
                  <div className="mt-1 text-sm font-medium text-foreground">{pessoa.nome_mae || '—'}</div>
                </div>

                <div className="rounded-lg border border-border/80 bg-muted/10 p-3.5">
                  <div className="text-xs text-muted-foreground">Nome do Pai</div>
                  <div className="mt-1 text-sm font-medium text-foreground">{pessoa.nome_pai || '—'}</div>
                </div>

                <div className="rounded-lg border border-border/80 bg-muted/10 p-3.5">
                  <div className="text-xs text-muted-foreground">NIS (PIS/PASEP/NIT)</div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    {pessoa.nis ? <Mono>{pessoa.nis}</Mono> : '—'}
                  </div>
                </div>
              </div>

              {/* SITUAÇÃO VITAL / ÓBITO */}
              <div className="rounded-lg border border-border/80 bg-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Situação Vital
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {pessoa.falecido || pessoa.status === 'falecido' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700">
                          Falecido(a)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Cidadão(ã) Ativo / Sem Registro de Óbito
                        </span>
                      )}
                      {pessoa.data_falecimento && (
                        <span className="text-xs text-muted-foreground">
                          Falecimento em: <Mono className="font-semibold text-foreground">{formatarData(pessoa.data_falecimento)}</Mono>
                        </span>
                      )}
                    </div>
                  </div>
                  {pessoa.certidao_obito_numero && (
                    <div className="text-xs text-muted-foreground">
                      Certidão de Óbito: <Mono className="text-foreground">{pessoa.certidao_obito_numero}</Mono>
                      {pessoa.cartorio_obito ? ` • ${pessoa.cartorio_obito}` : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* CONTA DE ACESSO */}
              <div className="flex items-center justify-between rounded-lg border border-border/80 bg-card p-4">
                <div>
                  <h4 className="text-sm font-semibold">Conta de Acesso ao Sistema</h4>
                  <p className="text-xs text-muted-foreground">
                    Credencial para acesso aos módulos administrativos do SYSGOV.
                  </p>
                </div>
                <div>
                  {pessoa.usuario ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="h-4 w-4" /> Usuário ativo no sistema
                    </div>
                  ) : podePromover ? (
                    <Button size="sm" onClick={onPromover}>
                      <ShieldCheck className="mr-1.5 h-4 w-4" /> Promover a usuário
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem credencial vinculada</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: VÍNCULOS MUNICIPAIS */}
          {abaAtiva === 'vinculos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Relações Jurídico-Funcionais com o Município</h3>
                  <p className="text-xs text-muted-foreground">
                    Histórico de vínculos como servidor de carreira, comissionado, estagiário, munícipe ou contribuinte.
                  </p>
                </div>
                {podeGerenciar && (
                  <Button size="sm" variant="outline" onClick={() => setModalVinculo(true)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar vínculo
                  </Button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {(pessoa.vinculos ?? []).map((v) => {
                  const isAtivo = !v.fim;
                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-lg border border-border/80 bg-card p-4 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">
                            {TIPOS_VINCULO[v.tipo_vinculo]}
                          </span>
                          <StatusChip
                            label={isAtivo ? 'Vigente' : 'Encerrado'}
                            variant={isAtivo ? 'success' : 'neutral'}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {v.matricula && (
                            <div>
                              Matrícula: <Mono className="font-semibold text-foreground">{v.matricula}</Mono>
                            </div>
                          )}
                          <div>
                            Início: {v.inicio ? <Mono>{formatarData(v.inicio)}</Mono> : 'Não informado'}
                            {v.fim && (
                              <span>
                                {' '}
                                • Término: <Mono>{formatarData(v.fim)}</Mono>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {podeGerenciar && isAtivo && (
                        <Button size="xs" variant="outline" onClick={() => setVinculoEncerrando(v)}>
                          Encerrar
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {(pessoa.vinculos ?? []).length === 0 && (
                <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  Nenhum vínculo funcional cadastrado para esta pessoa.
                </div>
              )}
            </div>
          )}

          {/* ABA 3: SUB-ENTIDADES */}
          {abaAtiva === 'sub-entidades' && (
            <SubEntidadesManager pessoa={pessoa} podeGerenciar={podeGerenciar} onAtualizado={onAtualizado} />
          )}
        </div>
      </Modal>

      {/* MODAL ADICIONAR VÍNCULO (SIZE LG) */}
      <FormModal
        aberto={modalVinculo}
        titulo="Adicionar vínculo funcional"
        onFechar={() => setModalVinculo(false)}
        campos={[
          {
            nome: 'tipo_vinculo',
            rotulo: 'Tipo de vínculo',
            tipo: 'select',
            obrigatorio: true,
            opcoes: opcoesVinculo,
          },
          { nome: 'matricula', rotulo: 'Matrícula funcional', mono: true },
          { nome: 'inicio', rotulo: 'Data de início', tipo: 'date' },
        ]}
        onEnviar={async (v) => {
          await adicionarVinculo(pessoa.id, v as { tipo_vinculo: TipoVinculo; matricula?: string; inicio?: string });
          setModalVinculo(false);
        }}
      />

      {/* MODAL ENCERRAR VÍNCULO (SIZE MD) */}
      <FormModal
        aberto={vinculoEncerrando !== null}
        titulo="Encerrar vínculo funcional"
        rotuloEnviar="Confirmar encerramento"
        onFechar={() => setVinculoEncerrando(null)}
        campos={[
          {
            nome: 'fim',
            rotulo: 'Data de término',
            tipo: 'date',
            dica: 'Deixe em branco para registrar a data atual de encerramento.',
          },
        ]}
        onEnviar={async (v) => {
          if (!vinculoEncerrando) return;
          await encerrarVinculo(pessoa.id, vinculoEncerrando.id, v.fim ? String(v.fim) : undefined);
          setVinculoEncerrando(null);
        }}
      />

      {/* MODAL EDITAR DADOS CIVIS (SIZE 2XL - ESPAÇOSO E SEM SCROLL) */}
      <Modal
        open={modalEditarCivil}
        onClose={() => setModalEditarCivil(false)}
        title="Editar dados civis e filiação"
        description="Alterações refletem no cadastro único de pessoa física (MDM)."
        size="2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setModalEditarCivil(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="form-editar-civil">
              Salvar Alterações
            </Button>
          </div>
        }
      >
        <form id="form-editar-civil" onSubmit={salvarCivil} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="Nome Completo" required>
                <Input
                  value={formCivil.nome}
                  onChange={(e) => setFormCivil({ ...formCivil, nome: e.target.value })}
                  required
                />
              </Field>
            </div>

            <div>
              <Field label="Nome Social">
                <Input
                  value={formCivil.nome_social}
                  onChange={(e) => setFormCivil({ ...formCivil, nome_social: e.target.value })}
                />
              </Field>
            </div>

            <div>
              <Field label="Data de Nascimento">
                <Input
                  type="date"
                  className="font-mono tabular-nums"
                  value={formCivil.data_nascimento}
                  onChange={(e) => setFormCivil({ ...formCivil, data_nascimento: e.target.value })}
                />
              </Field>
            </div>

            <div>
              <Field label="Sexo">
                <Select
                  value={formCivil.sexo || null}
                  onChange={(v) => setFormCivil({ ...formCivil, sexo: String(v ?? '') })}
                  options={opcoesSexo}
                  placeholder="Selecione o sexo"
                />
              </Field>
            </div>

            <div>
              <Field label="Estado Civil">
                <Select
                  value={formCivil.estado_civil || null}
                  onChange={(v) => setFormCivil({ ...formCivil, estado_civil: String(v ?? '') })}
                  options={opcoesEstadoCivil}
                  placeholder="Selecione o estado civil"
                />
              </Field>
            </div>

            <div>
              <Field label="Nacionalidade">
                <Input
                  value={formCivil.nacionalidade}
                  onChange={(e) => setFormCivil({ ...formCivil, nacionalidade: e.target.value })}
                />
              </Field>
            </div>

            <div>
              <Field label="Naturalidade (Cidade/UF)">
                <Input
                  value={formCivil.naturalidade}
                  onChange={(e) => setFormCivil({ ...formCivil, naturalidade: e.target.value })}
                />
              </Field>
            </div>

            <div>
              <Field label="Nome da Mãe">
                <Input
                  value={formCivil.nome_mae}
                  onChange={(e) => setFormCivil({ ...formCivil, nome_mae: e.target.value })}
                />
              </Field>
            </div>

            <div>
              <Field label="Nome do Pai">
                <Input
                  value={formCivil.nome_pai}
                  onChange={(e) => setFormCivil({ ...formCivil, nome_pai: e.target.value })}
                />
              </Field>
            </div>

            <div>
              <Field label="NIS (PIS/PASEP/NIT)">
                <Input
                  className="font-mono tabular-nums"
                  value={formCivil.nis}
                  onChange={(e) => setFormCivil({ ...formCivil, nis: e.target.value })}
                />
              </Field>
            </div>

            <div className="sm:col-span-2 lg:col-span-3 pt-3 border-t border-border">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Situação Vital / Óbito
              </h4>
              <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={formCivil.falecido}
                    onChange={(e) => setFormCivil({ ...formCivil, falecido: e.target.checked })}
                    className="rounded border-input text-primary focus:ring-primary/30"
                  />
                  <span>Pessoa Falecida (Registro de Óbito)</span>
                </label>

                {formCivil.falecido && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-3 border-t border-border/50">
                    <div>
                      <Field label="Data do Falecimento" required>
                        <Input
                          type="date"
                          className="font-mono tabular-nums"
                          value={formCivil.data_falecimento}
                          onChange={(e) => setFormCivil({ ...formCivil, data_falecimento: e.target.value })}
                          required={formCivil.falecido}
                        />
                      </Field>
                    </div>
                    <div>
                      <Field label="Nº Certidão de Óbito">
                        <Input
                          className="font-mono tabular-nums"
                          placeholder="Número da certidão"
                          value={formCivil.certidao_obito_numero}
                          onChange={(e) => setFormCivil({ ...formCivil, certidao_obito_numero: e.target.value })}
                        />
                      </Field>
                    </div>
                    <div>
                      <Field label="Cartório de Registro Civil">
                        <Input
                          placeholder="Ofício de Registro"
                          value={formCivil.cartorio_obito}
                          onChange={(e) => setFormCivil({ ...formCivil, cartorio_obito: e.target.value })}
                        />
                      </Field>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default PessoaDetailView;
