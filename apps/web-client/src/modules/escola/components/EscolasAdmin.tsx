import React, { useCallback, useEffect, useState } from 'react';
import { ImagePlus, Pencil, Plus, School } from 'lucide-react';
import { Button, Card, Input, Modal, Select, Switch } from '@sysgov/ui';
import { ScreenState } from '@/components/ui';
import { erroApi, escolaApi, type Escola } from '../api';
import type { Toast } from './AdminModal';

interface Unidade {
  id: number;
  name: string;
  code: string;
  type: string;
  level: number;
}

interface EscolasAdminProps {
  onToast: Toast;
}

/**
 * Escolas do órgão (várias por prefeitura). Cada escola é ligada a uma unidade do organograma:
 * quem tem acesso a essa unidade (ou a uma acima dela, como a Secretaria de Educação) em
 * Usuários & Acessos enxerga a escola nos módulos de educação.
 */
export const EscolasAdmin: React.FC<EscolasAdminProps> = ({ onToast }) => {
  const [escolas, setEscolas] = useState<Escola[] | null>(null);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [edicao, setEdicao] = useState<Escola | null | undefined>(undefined);

  const carregar = useCallback(async () => {
    try {
      const [lista, uni] = await Promise.all([
        escolaApi.escolas(),
        escolaApi.unidadesOrganograma(),
      ]);
      setEscolas(lista);
      setUnidades(uni);
    } catch (e) {
      onToast({ type: 'error', title: 'Escolas não carregadas', message: erroApi(e).mensagem });
      setEscolas([]);
    }
  }, [onToast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const alternarAtiva = async (escola: Escola) => {
    try {
      await escolaApi.atualizarEscola(escola.id, { ativa: !escola.ativa });
      await carregar();
    } catch (e) {
      onToast({ type: 'error', title: 'Não foi possível alterar', message: erroApi(e).mensagem });
    }
  };

  if (escolas === null) return <ScreenState type="loading" title="Carregando escolas..." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Escolas do órgão</h2>
          <p className="text-sm text-muted-foreground">O acesso de cada usuário segue a unidade do organograma ligada à escola.</p>
        </div>
        <Button onClick={() => setEdicao(null)}>
          <Plus className="h-4 w-4" /> Nova escola
        </Button>
      </div>

      {escolas.length === 0 ? (
        <ScreenState type="empty" title="Nenhuma escola cadastrada" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {escolas.map((e) => (
            <Card key={e.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <School className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{e.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.org_unit ? `${e.org_unit.name} (${e.org_unit.code})` : 'Sem unidade do organograma — acessível a todos com acesso ao módulo'}
                    </p>
                    {e.inep && <p className="font-mono text-xs tabular-nums text-muted-foreground">INEP {e.inep}</p>}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  {e.ativa ? 'Ativa' : 'Inativa'}
                  <Switch checked={e.ativa} onCheckedChange={() => void alternarAtiva(e)} />
                </label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEdicao(e)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {edicao !== undefined && (
        <EscolaForm
          escola={edicao}
          unidades={unidades}
          onClose={() => setEdicao(undefined)}
          onSalvo={async () => {
            setEdicao(undefined);
            await carregar();
            onToast({ type: 'success', title: 'Escola salva', message: 'Os dados da escola foram atualizados.' });
          }}
          onToast={onToast}
        />
      )}
    </div>
  );
};

interface EscolaFormProps {
  escola: Escola | null;
  unidades: Unidade[];
  onClose: () => void;
  onSalvo: () => Promise<void>;
  onToast: Toast;
}

const EscolaForm: React.FC<EscolaFormProps> = ({ escola, unidades, onClose, onSalvo, onToast }) => {
  const [nome, setNome] = useState(escola?.nome ?? '');
  const [inep, setInep] = useState(escola?.inep ?? '');
  const [orgUnitId, setOrgUnitId] = useState<number | null>(escola?.org_unit_id ?? null);
  const [logo, setLogo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (nome.trim() === '' || orgUnitId === null) {
      onToast({ type: 'warning', title: 'Campos obrigatórios', message: 'Informe o nome e a unidade do organograma.' });
      return;
    }
    setSalvando(true);
    try {
      const dados = { nome: nome.trim(), inep: inep.trim() || null, org_unit_id: orgUnitId };
      const salva = escola ? await escolaApi.atualizarEscola(escola.id, dados) : await escolaApi.criarEscola(dados);
      if (logo) await escolaApi.enviarLogoEscola(salva.id, logo);
      await onSalvo();
    } catch (e) {
      onToast({ type: 'error', title: 'Escola não salva', message: erroApi(e).mensagem });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={escola ? 'Editar escola' : 'Nova escola'}
      icon={<School className="h-5 w-5 text-primary" />}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void salvar()} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Nome da escola *</span>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Escola Municipal ..." />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Código INEP</span>
          <Input value={inep} onChange={(e) => setInep(e.target.value)} className="font-mono tabular-nums" placeholder="Opcional" />
        </label>
        <Select
          label="Unidade do organograma *"
          value={orgUnitId}
          onChange={(v) => setOrgUnitId(Number(v))}
          placeholder="Escolha a unidade da escola"
          options={unidades.map((u) => ({ value: u.id, label: `${' '.repeat(Math.max(0, u.level - 1) * 2)}${u.name} (${u.code})` }))}
        />
        <p className="text-xs text-muted-foreground">
          Crie a unidade da escola no Organograma (por exemplo, abaixo da Secretaria de Educação) antes de cadastrá-la aqui.
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <ImagePlus className="h-4 w-4 text-primary" />
          <span>{logo ? logo.name : 'Logo da escola (PNG, JPEG ou WEBP, até 2 MB)'}</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
        </label>
      </div>
    </Modal>
  );
};

export default EscolasAdmin;
