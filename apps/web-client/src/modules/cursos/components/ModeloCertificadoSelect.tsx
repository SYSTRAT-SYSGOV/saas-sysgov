import React, { useEffect, useState } from 'react';
import { Select } from '@sysgov/ui';
import { sysgovApi, type ModeloCertificado } from '@sysgov/sdk';

// O Select do Radix não aceita item com valor vazio, então "sem modelo" usa um valor fixo.
const PADRAO_DO_ORGAO = 'padrao';

interface Props {
  value: number | null;
  onChange: (modeloId: number | null) => void;
}

/** Escolha do modelo de certificado do curso ou da formação; sem escolha vale o padrão do órgão. */
export const ModeloCertificadoSelect: React.FC<Props> = ({ value, onChange }) => {
  const [modelos, setModelos] = useState<ModeloCertificado[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    Promise.resolve()
      .then(() => sysgovApi.cursos.listarModelos())
      .then((r) => ativo && setModelos(r.modelos))
      .catch(() => ativo && setModelos([]))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  const padrao = modelos.find((m) => m.padrao);

  return (
    <Select
      label="Modelo de certificado"
      value={value === null ? PADRAO_DO_ORGAO : value}
      onChange={(v) => onChange(v === PADRAO_DO_ORGAO ? null : Number(v))}
      loading={carregando}
      options={[
        { value: PADRAO_DO_ORGAO, label: 'Padrão do órgão', hint: padrao ? padrao.nome : 'Nenhum modelo padrão cadastrado' },
        ...modelos.map((m) => ({ value: m.id, label: m.nome, hint: m.padrao ? 'Padrão do órgão' : undefined })),
      ]}
    />
  );
};

export default ModeloCertificadoSelect;
