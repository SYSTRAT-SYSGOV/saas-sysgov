# Contratos — Servidores (i-Educar legado)

> Especificação formal dos contratos de tela, APIs HTTP, regras de validação, persistência, eventos de domínio, contratos do modelo canônico SYSGOV e enumerados.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contratos de Tela (UI / Formulários Web)

### Formulário de Cadastro de Servidor (`educar_servidor_cad.php`)

- `cod_servidor`: Obrigatório na edição, inteiro referenciando `cadastro.pessoa.idpes`.
- `ref_cod_instituicao`: Obrigatório, inteiro select choice das instituições ativas da rede.
- `ref_idesco`: Opcional, inteiro select choice do grau de escolaridade do servidor (`cadastro.escolaridade`).
- `carga_horaria`: Inteiro positivo, jornada semanal contratada em horas (ex.: 20, 30, 40).
- `curso_formacao_continuada`: Array de opções de formação continuada segundo catálogo INEP.
- `multi_seriado`: Booleano (0 ou 1), indica se o servidor atua em turmas multi-seriadas.
- `complementacao_pedagogica`: Booleano (0 ou 1), indica complementação pedagógica para docentes.
- `tipo_ensino_medio_cursado`: Enum numérico de modalidade do ensino médio cursado.
- `matricula[]`: Array de strings (tamanho 1 a 30 caracteres), uma por função vinculada.
- `ref_cod_funcao[]`: Array de inteiros, chaves das funções atribuídas ao servidor.

### Formulário de Alocação de Horários (`educar_servidor_alocacao_cad.php`)

- `ref_cod_servidor`: Obrigatório, chave do servidor a ser lotado.
- `ref_cod_escola`: Obrigatório, chave da unidade escolar municipal.
- `ano`: Obrigatório, ano letivo numérico (4 dígitos).
- `periodo`: Inteiro, identificador do turno escolar (matutino, vespertino, noturno, integral).
- `dia_semana`: Inteiro entre 1 (Domingo) e 7 (Sábado).
- `hora_inicial`: String formato `HH:MM`, horário de início das atividades.
- `hora_final`: String formato `HH:MM`, horário de encerramento das atividades.
- `hora_atividade`: String formato `HH:MM`, carga horária semanal destinada a planejamento.
- `horas_excedentes`: String formato `HH:MM`, horas adicionais além da jornada base.
- `ref_cod_funcionario_vinculo`: Inteiro, chave do vínculo funcional (efetivo, contratado).

---

## 2. Contratos de APIs REST / JSON

### `GET /module/Api/servidor-search`

**Request Query Parameters:**
```json
{
  "busca": "Carlos",
  "instituicao_id": 1,
  "escola_id": 12
}
```

**Response Payload (200 OK):**
```json
[
  {
    "id": 1042,
    "nome": "Carlos Alberto da Silva"
  }
]
```

### `GET /module/Api/dados-servidor`

**Request Query Parameters:**
```json
{
  "servidor_id": 1042,
  "cpf": "123.456.789-00"
}
```

**Response Payload (200 OK):**
```json
{
  "result": {
    "servidor_id": 1042,
    "nome": "Carlos Alberto da Silva",
    "cpf": "123.456.789-00",
    "ativo": 1,
    "inep": "123456789012",
    "email": "carlos.silva@educacao.gov.br",
    "updated_at": "2026-03-15 14:30:00"
  }
}
```

### `GET /module/Api/servidores-disciplinas-turmas`

**Request Query Parameters:**
```json
{
  "instituicao_id": 1,
  "ano": 2026,
  "escola": [12, 15],
  "modified": "2026-01-01"
}
```

**Response Payload (200 OK):**
```json
{
  "vinculos": [
    {
      "id": 501,
      "servidor_id": 1042,
      "turma_id": 88,
      "turno_id": 1,
      "permite_lancar_faltas_componente": 1,
      "disciplinas": [
        {
          "id": 14,
          "serie_id": 5,
          "tipo_nota": 1
        }
      ],
      "disciplinas_serie": {
        "5": [14]
      },
      "updated_at": "2026-02-10 08:00:00",
      "deleted_at": null
    }
  ]
}
```

---

## 3. Regras de Validação

- `EmployeeAllocationValidator`: A soma dos intervalos alocados na semana (`carga_horaria`) não pode ultrapassar o valor cadastrado em `pmieducar.servidor.carga_horaria`.
- `TimeRangeValidator`: `hora_final` deve ser estritamente posterior a `hora_inicial`.
- `InepCodeValidator`: Código docente INEP deve conter exatamente 12 caracteres numéricos sem pontuação.
- `BondActiveValidator`: Bloquear exclusão de `funcionario_vinculo` se houver contagem `COUNT(*) > 0` em `servidor_alocacao`.

---

## 4. Contratos de Persistência (DDL / Tabelas Legadas)

```sql
-- pmieducar.servidor
CREATE TABLE pmieducar.servidor (
    cod_servidor INT PRIMARY KEY REFERENCES cadastro.pessoa(idpes),
    ref_idesco INT REFERENCES cadastro.escolaridade(idesco),
    carga_horaria INT,
    data_cadastro TIMESTAMP NOT NULL DEFAULT NOW(),
    data_exclusao TIMESTAMP,
    ativo SMALLINT NOT NULL DEFAULT 1,
    ref_cod_instituicao INT NOT NULL,
    pos_graduacao TEXT,
    curso_formacao_continuada TEXT,
    multi_seriado SMALLINT DEFAULT 0,
    tipo_ensino_medio_cursado INT,
    complementacao_pedagogica INT
);

-- pmieducar.servidor_funcao
CREATE TABLE pmieducar.servidor_funcao (
    cod_servidor_funcao SERIAL PRIMARY KEY,
    ref_cod_servidor INT NOT NULL REFERENCES pmieducar.servidor(cod_servidor),
    ref_cod_funcao INT NOT NULL REFERENCES pmieducar.funcao(cod_funcao),
    matricula VARCHAR(30),
    ref_ref_cod_instituicao INT NOT NULL
);

-- pmieducar.servidor_alocacao
CREATE TABLE pmieducar.servidor_alocacao (
    cod_servidor_alocacao SERIAL PRIMARY KEY,
    ref_cod_servidor INT NOT NULL REFERENCES pmieducar.servidor(cod_servidor),
    ref_cod_escola INT NOT NULL,
    ref_ref_cod_instituicao INT NOT NULL,
    carga_horaria INTERVAL,
    hora_inicial TIME,
    hora_final TIME,
    hora_atividade INTERVAL,
    horas_excedentes INTERVAL,
    periodo INT,
    dia_semana SMALLINT,
    ref_cod_funcionario_vinculo INT,
    ref_cod_servidor_funcao INT,
    ano INT NOT NULL,
    data_admissao DATE,
    data_saida DATE,
    ativo SMALLINT NOT NULL DEFAULT 1,
    ref_usuario_cad INT,
    ref_usuario_exc INT
);
```

---

## 5. Eventos de Domínio

- `EmployeeCreated`: Disparado após a persistência bem-sucedida do registro em `pmieducar.servidor`. 🟢 `educar_servidor_cad.php:3`
- `EmployeeAllocationUpdated`: Notifica a camada de Quadro de Horários sobre alterações na disponibilidade horária do professor. 🟡
- `EmployeeWithdrawalStarted`: Notifica as escolas de lotação para suspender a atribuição de aulas do professor afastado. 🟡

---

## 6. Contratos Planejados para o Modelo Novo (SYSGOV / TypeScript)

```typescript
export interface EducaEmployee {
  id: string; // UUID v7
  tenantId: string;
  personId: string;
  workloadWeeklyHours: number;
  schoolingDegreeId: string;
  inepCode: string | null;
  multiClassroom: boolean;
  pedagogicalComplement: boolean;
  active: boolean;
  roles: EducaEmployeeRole[];
  allocations?: EducaTeacherAllocation[];
}

export interface EducaTeacherAllocation {
  id: string; // UUID v7
  tenantId: string;
  employeeId: string;
  schoolId: string;
  academicYear: number;
  weekday: number; // 1-7
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  teachingMinutesWeekly: number;
  planningMinutesWeekly: number; // hora-atividade
  extraMinutesWeekly: number;
  bondTypeId: string;
  active: boolean;
}
```

---

## 7. Enumerados com Fonte

### Grau de Escolaridade (`cadastro.escolaridade`)
- `1`: Fundamental Incompleto
- `2`: Fundamental Completo
- `3`: Médio Incompleto
- `4`: Médio Completo (Normal/Magistério ou Geral)
- `5`: Superior Incompleto
- `6`: Superior Completo (Licenciatura / Bacharelado)
- `7`: Pós-graduação / Especialização
- `8`: Mestrado
- `9`: Doutorado

### Dias da Semana (`dia_semana` em `servidor_alocacao`)
- `1`: Domingo
- `2`: Segunda-feira
- `3`: Terça-feira
- `4`: Quarta-feira
- `5`: Quinta-feira
- `6`: Sexta-feira
- `7`: Sábado

### Tipo de Falta / Atraso (`AbsenceDelayType` em `falta_atraso`)
- `1`: Falta (dia integral ou período)
- `2`: Atraso (fração de horas/minutos)
