# Servidores (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Gestão de servidores escolares e corpo docente (`pmieducar.servidor`), funções e matrículas funcionais (`pmieducar.servidor_funcao`), alocações em unidades escolares e regime de jornada de trabalho (`pmieducar.servidor_alocacao`), habilitações curriculares e cursos lecionados (`pmieducar.servidor_disciplina`, `pmieducar.servidor_curso_ministra`), afastamentos temporários e licenças (`pmieducar.servidor_afastamento`), faltas e atrasos funcionais (`pmieducar.falta_atraso`), e formação acadêmica e pós-graduação docente para o Educacenso (`pmieducar.servidor_formacao`, `pmieducar.servidor_pos_graduacao`, `modules.educacenso_cod_docente`).
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.
> Rastreabilidade: `ieducar/intranet/educar_servidor_*`, `ieducar/intranet/educar_servidor_alocacao_*`, `ieducar/intranet/educar_falta_atraso_*`, `app/Models/Employee.php`, `app/Models/EmployeeAllocation.php`, `app/Models/EmployeeWithdrawal.php`, `app/Models/LegacyEmployeeRole.php`, `ieducar/modules/Api/Views/ServidorController.php`, `ieducar/lib/Portabilis/Business/Professor.php`.

---

## Recorte (evitar duplicação)

- A **unit `People`** cobre a identidade civil básica do cidadão em `cadastro.pessoa`, `cadastro.fisica` e `cadastro.documento`; esta unit detalha a extensão funcional do servidor público municipal na Educação (`pmieducar.servidor`).
- A **unit `Usuario`** cobre autenticação web, perfis e credenciais em `portal.funcionario` e `pmieducar.usuario`; esta unit detalha as funções pedagógicas, vínculos e lotações do servidor.
- A **unit `QuadroHorario`** consome a alocação e habilitação docente para compor a grade de aulas da turma (`pmieducar.quadro_horario_horarios`); esta unit detalha o cadastro administrativo da carga horária, dias e períodos.
- Alvo canônico SYSGOV: tabelas `core_employees`, `educa_teachers`, `educa_teacher_allocations`, `educa_teacher_qualifications`, `educa_teacher_withdrawals`, `educa_employee_absences`. 🟢

---

## Visão Geral

O módulo de Servidores do i-Educar administra a vida funcional de professores, diretores, coordenadores e funcionários administrativos das unidades escolares municipais.
A modelagem legada conecta a pessoa física (`cadastro.pessoa.idpes = pmieducar.servidor.cod_servidor`) a uma instituição mantenedora, permitindo múltiplas funções simultâneas (ex.: professor e coordenador) com matrículas funcionais independentes em `pmieducar.servidor_funcao`. A jornada de trabalho semanal do servidor é rateada entre alocações nas escolas (`pmieducar.servidor_alocacao`), detalhando carga horária em sala, horas de atividade extraclasse (`hora_atividade`) e horas complementares (`horas_excedentes`), respeitando os limites da Lei Federal nº 11.738/2008. Além da jornada, o módulo rastreia o registro de habilitações por disciplina (`servidor_disciplina`), histórico de afastamentos com sequenciador manual (`servidor_afastamento`), faltas/atrasos com justificativa e anexo (`falta_atraso`), e dados acadêmicos para exportação obrigatória ao Censo Escolar INEP. 🟢

---

## Responsabilidades

### Família 1 — Dados Cadastrais e Vida Funcional do Servidor (`Employee`, `educar_servidor_cad.php`)

- Cadastrar servidor estendendo o registro de pessoa física com carga horária global, grau de escolaridade (`ref_idesco`), situação de formação continuada e complementação pedagógica. 🟢 `app/Models/Employee.php:31-50`, `educar_servidor_cad.php:86-110`
- Associar uma ou mais funções administrativas ou docentes com matrículas funcionais distintas por instituição (`pmieducar.servidor_funcao`). 🟢 `app/Models/LegacyEmployeeRole.php:18-28`, `educar_servidor_cad.php:37-60`
- Gerenciar dados acadêmicos de graduação (`EmployeeGraduation`) e pós-graduação (`EmployeePosgraduate`), com validação de código INEP de curso e instituição superior. 🟢 `app/Models/Employee.php:145-158`, `educar_servidor_cad.php:67-72`
- Vincular código identificador único do docente no INEP para o Educacenso (`modules.educacenso_cod_docente`). 🟢 `app/Models/Employee.php:53-56`, `educar_servidor_cad.php:63-64`

### Família 2 — Lotação e Alocação Escolar (`EmployeeAllocation`, `educar_servidor_alocacao_cad.php`)

- Registrar a alocação do servidor em escolas municipais por ano letivo, turno/período, dia da semana, hora inicial e hora final. 🟢 `app/Models/EmployeeAllocation.php:28-50`, `educar_servidor_alocacao_cad.php:75-93`
- Ratear a jornada entre regência de classe (`carga_horaria`), hora-atividade pedagógica (`hora_atividade`) e horas extras contratuais (`horas_excedentes`). 🟢 `app/Models/EmployeeAllocation.php:45-46`, `educar_servidor_alocacao_cad.php:42-44`
- Travar a alocação quando a soma das horas alocadas no ano ultrapassar a carga horária contratual declarada no cadastro do servidor. 🟢 `educar_servidor_cad.php:133-150`, `educar_servidor_alocacao_cad.php:12-13`
- Registrar vínculo empregatício específico (Efetivo, Contrato Temporário, Comissionado) via `pmieducar.funcionario_vinculo`. 🟢 `app/Models/EmployeeAllocation.php:44`, `app/Models/LegacyBondType.php`

### Família 3 — Habilitação Curricular Docente (`pmieducar.servidor_disciplina`, `Professor.php`)

- Mapear quais componentes curriculares o professor está legalmente apto a lecionar na rede, discriminados por curso e função. 🟢 `app/Models/Employee.php:178-184`, `Portabilis_Business_Professor.php:306-341`
- Filtrar servidores disponíveis para alocação em turmas e diários com base na flag booleana `pmieducar.funcao.professor = 1`. 🟢 `Portabilis_Business_Professor.php:5-31`
- Validar se o servidor leciona em regime regular ou multi-seriado (`multi_seriado`). 🟢 `educar_servidor_cad.php:53-54`

### Família 4 — Afastamentos, Faltas e Ocorrências (`EmployeeWithdrawal`, `educar_falta_atraso_cad.php`)

- Cadastrar licenças médicas, maternidade, prêmio e afastamentos temporários com sequencial incremental manual por instituição. 🟢 `app/Models/EmployeeWithdrawal.php:23-33`, `EmployeeWithdrawal.php:62-64`
- Registrar faltas e atrasos diários com contagem de horas e minutos, flag de falta justificada e anexo comprobatório presignado via URL externa. 🟢 `educar_falta_atraso_cad.php:23-42`, `LegacyAbsenceDelay.php`
- Desativar alocações ativas durante o período de afastamento do servidor (`data_saida` e `data_retorno`). 🟢 `app/Models/EmployeeWithdrawal.php:30-31`, `educar_servidor_alocacao_cad.php:87-88`

---

## Regras de Negócio

| Regra | Evidência | Confiança |
|---|---|---|
| Chave primária de servidor compartilha o `idpes` de `cadastro.pessoa` (`cod_servidor = idpes`), exigindo cadastro civil prévio de pessoa física. | 🟢 `app/Models/Employee.php:31-33`, `ieducar/modules/Api/Views/ServidorController.php:42` | 🟢 CONFIRMADO |
| Servidor pode possuir múltiplas funções ativas (`pmieducar.servidor_funcao`) com matrículas funcionais distintas na mesma instituição. | 🟢 `app/Models/LegacyEmployeeRole.php:23-27`, `educar_servidor_cad.php:57-60` | 🟢 CONFIRMADO |
| Identificação de professor é governada pela flag `pmieducar.funcao.professor = 1`; usuários sem essa atribuição não aparecem nas buscas de alocação de diário de classe. | 🟢 `Portabilis_Business_Professor.php:9-14`, `educar_servidor_det.php:390` | 🟢 CONFIRMADO |
| O teto semanal de horas alocadas por servidor não pode exceder a carga horária máxima cadastrada em `pmieducar.servidor.carga_horaria` (ou constante de segurança de 36h/40h). | 🟢 `educar_servidor_cad.php:133-146`, `educar_servidor_alocacao_cad.php:12` | 🟢 CONFIRMADO |
| Na alocação semanal docente, no mínimo 1/3 da jornada deve ser preservada para `hora_atividade` e até 2/3 para regência em sala. | 🟢 `_reversa_sdd/People/legacy-mapping.md:49-52`, `educar_servidor_alocacao_cad.php:42-44` | 🟢 CONFIRMADO |
| Afastamento gera sequencial numérico incremental calculado em runtime (`MAX(sequencial) + 1`) sob a chave composta `(ref_cod_servidor, ref_ref_cod_instituicao)`. | 🟢 `app/Models/EmployeeWithdrawal.php:62-64` | 🟢 CONFIRMADO |
| Alocações vencidas ou com `data_saida <= NOW()` são desconsideradas no cálculo da carga horária semanal alocada ativa. | 🟢 `educar_servidor_cad.php:143`, `app/Models/Employee.php:125` | 🟢 CONFIRMADO |
| Soft delete de servidor em cascata desativa alocações, mas deixa registros de `pmieducar.servidor_funcao` íntegros para auditoria histórica. | 🟢 `educar_servidor_cad.php:126-128`, `Employee.php:125` | 🟢 CONFIRMADO |
| O código docente INEP (`modules.educacenso_cod_docente`) possui validação estrita de 12 dígitos numéricos e unicidade por servidor. | 🟢 `ieducar/modules/Api/Views/ServidorController.php:282`, `educar_servidor_cad.php:63` | 🟢 CONFIRMADO |
| Exclusão de vínculo funcional (`pmieducar.funcionario_vinculo`) é terminantemente bloqueada se houver qualquer alocação escolar ativa atrelada a ele. | 🟢 `ieducar/intranet/funcionario_vinculo_cad.php:90` | 🟢 CONFIRMADO |

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|---|---|---|---|
| SRV-01 | Cadastro funcional de servidor vinculado a pessoa física existente com carga horária contratual e escolaridade. | Must | 🟢 `Employee.php:31-40` |
| SRV-02 | Atribuição de múltiplas funções funcionais com matrículas independentes por instituição. | Must | 🟢 `LegacyEmployeeRole.php:23-27` |
| SRV-03 | Alocação de servidor por escola, ano letivo, turno, dia da semana e faixa horária (início/fim). | Must | 🟢 `EmployeeAllocation.php:32-50` |
| SRV-04 | Separação explícita de horas de sala de aula, horas de atividade e horas excedentes no diário. | Must | 🟢 `educar_servidor_alocacao_cad.php:42-46` |
| SRV-05 | Cadastro de habilitações disciplinares (`servidor_disciplina`) vinculadas a curso e função docente. | Must | 🟢 `Employee.php:178-184` |
| SRV-06 | Registro de afastamentos com motivo catalogado, data de início, data de término e retorno previsto. | Must | 🟢 `EmployeeWithdrawal.php:25-33` |
| SRV-07 | Registro e controle de faltas e atrasos com justificativa formal e comprovante anexado. | Should | 🟢 `educar_falta_atraso_cad.php:25-35` |
| SRV-08 | Rastreabilidade acadêmica com cursos de graduação, ano de conclusão e pós-graduação para o Educacenso. | Must | 🟢 `EmployeeGraduationService.php`, `educar_servidor_cad.php:67-72` |
| SRV-09 | API REST para consulta de servidores por escola, disciplina, turma e status ativo/inativo. | Must | 🟢 `ServidorController.php:118-257` |
| SRV-10 | Trava impeditiva de alocação que exceda a carga horária semanal cadastrada do servidor. | Should | 🟢 `educar_servidor_cad.php:133-146` |

---

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência | Confiança |
|---|---|---|---|
| Integridade | `cod_servidor` deve obrigatoriamente referenciar registro ativo em `cadastro.pessoa`. | 🟢 `ServidorController.php:42` | 🟢 |
| Concorrência | Cálculo de `sequencial` em `servidor_afastamento` via `MAX()+1` sem locking gera risco de colisão em escritas paralelas. | 🟢 `EmployeeWithdrawal.php:63` | 🟡 |
| Segurança | Controle de acesso centralizado no processo AP `635` com nível de acesso institucional (7). | 🟢 `educar_servidor_cad.php:86-91` | 🟢 |
| Desempenho | Consulta de vínculos em lote executa `string_agg` com múltiplos joins sem paginação na API do servidor. | 🟢 `ServidorController.php:155-190` | 🟡 |
| LGPD | Dados de afastamento por motivo de saúde e faltas atestadas constituem dados pessoais sensíveis sem criptografia em repouso. | 🔴 Ausência de cifragem no DDL legado | 🔴 |

---

## Critérios de Aceitação

```gherkin
Cenário: Alocação semanal de professor dentro da carga horária contratual
  Dado que o servidor "Carlos Silva" possui carga horária contratual de 40 horas semanais
  E já possui 20 horas alocadas na Escola Municipal A no ano letivo 2026
  Quando o gestor alocar 15 horas semanais na Escola Municipal B para o mesmo ano
  Então a alocação deve ser confirmada com sucesso
  E o saldo de carga horária disponível do servidor deve ser atualizado para 5 horas semanais.

Cenário: Tentativa de alocação excedendo a carga horária máxima permitida
  Dado que o servidor possui 35 horas alocadas de um contrato de 40 horas
  Quando o gestor tentar cadastrar uma nova alocação de 10 horas semanais no mesmo ano letivo
  Então o sistema deve rejeitar a operação informando inconsistência de carga horária
  E nenhum registro deve ser inserido em pmieducar.servidor_alocacao.

Cenário: Afastamento temporário de servidor docente
  Dado que o docente titular possui alocações ativas em turmas da rede
  Quando for registrado um afastamento por licença médica com data de saída e retorno
  Então o sistema deve registrar o evento gerando sequencial único para o servidor
  E sinalizar o docente como afastado para permitir alocação de professor substituto no quadro de horários.
```

---

## Prioridade (MoSCoW)

| Item | Prioridade | Justificativa |
|---|---|---|
| Cadastro de Servidor e Funções | Must | Entidade mestra sem a qual nenhuma escola pode lotar docentes ou registrar aulas. |
| Alocação Escolar e Horas-Atividade | Must | Obrigação legal da Lei nº 11.738/2008 e base do dimensionamento da folha e turmas. |
| Habilitação Curricular Docente | Must | Essencial para consistência do diário de classe e atribuição de aulas no horário escolar. |
| Dados Acadêmicos para Educacenso | Must | Exigência regulatória anual do Ministério da Educação (MEC/INEP). |
| Afastamentos e Licenças | Should | Necessário para substituição de professores e auditoria de presença. |
| Faltas e Atrasos com Anexo | Should | Controle de assiduidade e impacto financeiro na vida funcional. |

---

## Rastreabilidade de Código

| Arquivo Legado | Classe / Função Principal | Escopo / Cobertura |
|---|---|---|
| `app/Models/Employee.php` | `Employee` (Eloquent Model) | Mapeamento da tabela `pmieducar.servidor`, relacionamentos com alocações, funções e formação. |
| `app/Models/EmployeeAllocation.php` | `EmployeeAllocation` | Mapeamento de `pmieducar.servidor_alocacao`, vínculo com escola, período e jornada. |
| `app/Models/LegacyEmployeeRole.php` | `LegacyEmployeeRole` | Mapeamento de `pmieducar.servidor_funcao` e matrícula funcional. |
| `app/Models/EmployeeWithdrawal.php` | `EmployeeWithdrawal` | Mapeamento de `pmieducar.servidor_afastamento` e geração de sequencial de licença. |
| `ieducar/intranet/educar_servidor_cad.php` | `clsCadastro` anônima | Formulário de inclusão/edição de servidor, formação, escolaridade e validações. |
| `ieducar/intranet/educar_servidor_alocacao_cad.php` | `clsCadastro` anônima | Formulário de alocação de grade horária semanal, escola e função do servidor. |
| `ieducar/intranet/educar_falta_atraso_cad.php` | `clsCadastro` anônima | Registro de faltas e atrasos com upload de comprovantes atestados. |
| `ieducar/modules/Api/Views/ServidorController.php` | `ServidorController` | API de busca, listagem com filtros, verificação de deficiências e sincronização. |
| `ieducar/lib/Portabilis/Business/Professor.php` | `Portabilis_Business_Professor` | Verificação de perfil docente, escolas de atuação e turmas lecionadas. |
