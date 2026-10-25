# Design — Servidores (i-Educar legado)

> Arquitetura de software, interfaces, fluxo de dados e decisões estruturais do módulo de Servidores e Corpo Docente.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades do Domínio Legado

- **`Employee` (`pmieducar.servidor`):** Registro funcional principal do colaborador público escolar. Chave primária `cod_servidor` vinculada 1:1 a `cadastro.pessoa(idpes)`. Campos principais: `carga_horaria` (int), `ref_idesco` (grau de escolaridade), `curso_formacao_continuada`, `multi_seriado` (booleano), `complementacao_pedagogica`, `tipo_ensino_medio_cursado`, `ativo` (tinyint).
- **`LegacyEmployeeRole` (`pmieducar.servidor_funcao`):** Atribuição de papel profissional ao servidor. PK `cod_servidor_funcao`. Campos: `ref_cod_servidor`, `ref_cod_funcao`, `matricula` (varchar), `ref_ref_cod_instituicao`. Permite N papéis por servidor.
- **`EmployeeAllocation` (`pmieducar.servidor_alocacao`):** Lotação semanal do servidor em unidade escolar. PK `cod_servidor_alocacao`. Campos: `ref_cod_servidor`, `ref_cod_escola`, `ano` (int), `periodo` (turno), `dia_semana` (1 a 7), `hora_inicial` (time), `hora_final` (time), `carga_horaria` (time/interval), `hora_atividade` (time), `horas_excedentes` (time), `ref_cod_funcionario_vinculo` (FK vínculo contratual), `data_admissao`, `data_saida`, `ativo`.
- **`EmployeeWithdrawal` (`pmieducar.servidor_afastamento`):** Histórico de licenças e suspensões temporárias de trabalho. Chave composta/lógica `(ref_cod_servidor, ref_ref_cod_instituicao, sequencial)`. Campos: `ref_cod_motivo_afastamento`, `data_saida` (date), `data_retorno` (date), `ativo`.
- **`LegacyDisciplineTeacher` (`pmieducar.servidor_disciplina`):** Habilitações pedagógicas curriculares. Campos: `ref_cod_servidor`, `ref_cod_disciplina`, `ref_cod_curso`, `ref_cod_funcao`.
- **`AbsenceDelay` (`pmieducar.falta_atraso`):** Ocorrências diárias de assiduidade. PK `cod_falta_atraso`. Campos: `ref_cod_servidor`, `ref_cod_escola`, `tipo` (falta/atraso), `data_falta_atraso` (date), `qtd_horas`, `qtd_min`, `justificada` (booleano).

### Endpoints HTTP e Telas Web

| Rota / Arquivo Legado | Método | Parâmetros Principais | Ação / Resposta |
|---|---|---|---|
| `intranet/educar_servidor_lst.php` | GET | `nm_servidor`, `ref_cod_instituicao`, `ref_cod_funcao` | Listagem paginada de servidores com filtros de função e situação funcional. |
| `intranet/educar_servidor_cad.php` | GET / POST | `cod_servidor`, `ref_idesco`, `carga_horaria`, `funcoes` | Cadastro e edição completa de dados do servidor, escolaridade e graduações. |
| `intranet/educar_servidor_det.php` | GET | `cod_servidor`, `ref_cod_instituicao` | Visualização detalhada da ficha do servidor, histórico de alocações e afastamentos. |
| `intranet/educar_servidor_alocacao_lst.php` | GET | `ref_cod_servidor`, `ref_cod_escola`, `ano` | Relação de alocações de horários e escolas do servidor no ano selecionado. |
| `intranet/educar_servidor_alocacao_cad.php` | GET / POST | `ref_cod_servidor`, `ref_cod_escola`, `hora_inicial`, `hora_final`, `hora_atividade` | Formulário para alocar professor na grade de horários de uma escola. |
| `intranet/educar_falta_atraso_cad.php` | GET / POST | `ref_cod_servidor`, `ref_cod_escola`, `tipo`, `data_falta_atraso`, `qtd_horas` | Registro de falta ou atraso com verificação e upload de atestado. |
| `modules/Api/Views/ServidorController.php` | GET `servidor-search` | `busca`, `instituicao_id`, `escola_id` | Pesquisa preditiva AJAX de servidores por nome ou CPF (retorna JSON). |
| `modules/Api/Views/ServidorController.php` | GET `dados-servidor` | `servidor_id` ou `cpf` | Dados consolidados do servidor incluindo código INEP e e-mail institucional. |
| `modules/Api/Views/ServidorController.php` | GET `servidores-disciplinas-turmas` | `instituicao_id`, `ano`, `escola` | Consulta em lote de vinculações docentes ativas nas turmas e disciplinas da escola. |

---

## Fluxo Principal

```
1. Consulta de Pessoa Física Prévia:
   [Gestor] -> Seleciona cidadão previamente cadastrado no módulo People (cadastro.pessoa / cadastro.fisica).

2. Cadastro Funcional do Servidor:
   [educar_servidor_cad.php] -> Insere/atualiza registro em pmieducar.servidor com carga horária máxima.
   -> Insere linhas em pmieducar.servidor_funcao vinculando as funções com suas respectivas matrículas.
   -> Grava formações acadêmicas e pós-graduações para atendimento do Educacenso.

3. Alocação Escolar Semanal:
   [educar_servidor_alocacao_cad.php] -> Seleciona a escola, ano letivo e vínculo de trabalho.
   -> Informa dias da semana, horários de início e fim da regência em sala de aula.
   -> Informa carga horária de hora-atividade e horas excedentes.
   -> Sistema valida: (Carga Alocada Acumulada + Nova Carga) <= Carga Horária Contratual.
   -> Insere registro em pmieducar.servidor_alocacao.

4. Habilitação e Lotação em Turmas:
   -> Servidor com funcao.professor = 1 fica habilitado para ministrar disciplinas da matriz.
   -> Quadro de horários consome a alocação para encaixar as aulas nos períodos da turma.
```

---

## Fluxos Alternativos

- **Afastamento Temporário (Licença / Suspensão):**
  1. Gestor acessa formulário de afastamento informando motivo, data de início e previsão de retorno.
  2. Sistema gera sequencial incremental `MAX(sequencial) + 1` sob a instituição.
  3. Enquanto `data_saida <= NOW() < data_retorno`, a alocação do servidor é considerada suspensa para fins de regência em sala, liberando a vaga para professor substituto.
- **Registro de Falta / Atraso Funcional:**
  1. Unidade escolar registra falta injustificada ou justificada informando a quantidade de horas e minutos.
  2. Se houver atestado médico, o arquivo é transmitido ao storage de arquivos com URL presignada.
  3. Registro computa na ficha funcional e relatórios de assiduidade do servidor.
- **Exclusão Lógica de Servidor (Inativação):**
  1. Operação de exclusão seta `ativo = 0` e `data_exclusao = NOW()` em `pmieducar.servidor`.
  2. Alocações ativas são encerradas com `ativo = 0`, mas os registros de funções e histórico acadêmico permanecem preservados para relatórios de censo de anos anteriores.

---

## Dependências

| Módulo / Camada | Dependência | Tipo de Relação |
|---|---|---|
| `People` (`cadastro.pessoa`, `fisica`) | Dados biográficos, CPF, RG, data de nascimento e endereço civil. | Obrigatória (Chave estrangeira física) |
| `Usuario` (`portal.funcionario`) | Conta de login, senha criptografada e permissões no sistema web. | Opcional (apenas servidores com acesso ao sistema) |
| `School` (`pmieducar.escola`) | Unidade municipal onde o servidor exerce a jornada semanal. | Obrigatória para alocação |
| `ComponenteCurricular` (`disciplina`) | Matéria lecionada pelo docente (`servidor_disciplina`). | Obrigatória para atribuição de aulas |
| `Educacenso` (`educacenso_cod_docente`) | Código docente INEP para transmissão do Censo Escolar. | Regulamentar federal |
| `QuadroHorario` | Montagem da grade semanal de horários da turma escolar. | Consumidora direta da alocação |

---

## Decisões de Design Identificadas

| Decisão | Evidência no Código | Confiança |
|---|---|---|
| Chave primária compartilhada entre `servidor` e `pessoa` (`cod_servidor = idpes`), impedindo duplicidade estrutural de cadastro civil. | 🟢 `Employee.php:33`, `ServidorController.php:42` | 🟢 CONFIRMADO |
| Separação estrita entre "Servidor" (vida funcional) e "Usuário" (credencial de acesso ao sistema), permitindo servidores sem login (ex.: merendeiras). | 🟢 `portal.funcionario` vs `pmieducar.servidor` | 🟢 CONFIRMADO |
| Rateio formal da jornada semanal entre regência de classe e hora-atividade pedagógica (`hora_atividade`), espelhando a Lei do Piso Nacional. | 🟢 `servidor_alocacao.hora_atividade`, `EmployeeAllocation.php:45` | 🟢 CONFIRMADO |
| Vínculo de funções associado a matrícula funcional própria em tabela intermediária (`servidor_funcao`), permitindo acúmulo legal de cargos. | 🟢 `pmieducar.servidor_funcao`, `LegacyEmployeeRole.php` | 🟢 CONFIRMADO |
| Sequenciador numérico de afastamento gerado em aplicação (`MAX()+1`) em vez de chave primária composta automática ou sequence do PostgreSQL. | 🟢 `EmployeeWithdrawal.php:63` | 🟢 CONFIRMADO |

---

## Estado Interno

- **`pmieducar.servidor.ativo`:** `1` (servidor em exercício ativo), `0` (desativado/exonerado da rede).
- **`pmieducar.servidor_alocacao.ativo`:** `1` (alocação vigente no ano corrente), `0` (alocação encerrada ou transferida de escola).
- **`pmieducar.servidor_afastamento.ativo`:** `1` (afastamento vigente ou histórico ativo), `0` (cancelado administrativamente).
- **`pmieducar.falta_atraso.justificada`:** `1` (falta amparada por atestado/lei), `0` (falta injustificada com desconto em folha).

---

## Observabilidade

- Ações de criação e alteração em `EmployeeAllocation` herdam a trait `HasLegacyUserAction`, registrando o usuário criador em `ref_usuario_cad` e o usuário de exclusão em `ref_usuario_exc`. 🟢 `EmployeeAllocation.php:24-50`
- O controller de API `ServidorController` expõe campo computado de auditoria `greatest(p.data_rev::timestamp(0), s.updated_at)` para possibilitar sincronização diferencial de bases satélites. 🟢 `ServidorController.php:100-106`
- Falhas de validação de carga horária emitem avisos diretos na sessão do formulário (`$this->messenger->append`), sem logging estruturado em arquivo específico de eventos funcionais. 🟡

---

## Riscos e Lacunas

- 🔴 **Concorrência no cálculo de afastamento:** O uso de `MAX(sequencial) + 1` no evento `creating` do Eloquent sem bloqueio pessimista de linha (`SELECT FOR UPDATE`) propicia colisão de chaves se dois usuários registrarem afastamento simultâneo para o mesmo servidor.
- 🔴 **Ausência de trilha de auditoria para substituição docente:** Quando um professor titular entra em licença, o sistema permite alocar um professor substituto sobrescrevendo campos pontuais, sem histórico auditável de quem ministrou cada aula em cada dia do período.
- 🟡 **Injeção de parâmetros em consultas dinâmicas de API:** O método `getServidoresDisciplinasTurmas` interpola variáveis como `$escola` e `$ano` diretamente na string SQL (`WHERE t.ref_ref_cod_escola in ({$escola})`), dependendo exclusivamente do tratamento no request para prevenir injeção.
