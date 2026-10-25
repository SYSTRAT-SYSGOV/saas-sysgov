# HistoricoEscolar (i-Educar legado), Design

> Como o subsistema de histórico escolar está estruturado no código legado, com os fluxos principais, as dependências, as decisões de design e os riscos.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades e componentes legados

| Componente | Papel | Fonte |
|----------|-------|-------|
| `educar_historico_escolar_cad` (clsCadastro) | Vida pregressa com disciplinas dinâmicas e cópia | 🟢 `ieducar/intranet/educar_historico_escolar_cad.php:89-430` |
| `educar_historico_escolar_det` / `_lst` | Detalhe com restrição e listagem por aluno | 🟢 `educar_historico_escolar_det.php:60-242`, `educar_historico_escolar_lst.php:90-138` |
| `ProcessamentoController` | Tela de processamento consolidado (processo 999613) | 🟢 `ieducar/modules/HistoricoEscolar/Views/ProcessamentoController.php:3-277` |
| `ProcessamentoApiController` | Backend do processamento, remoção e grades | 🟢 `ProcessamentoApiController.php:436-1118` |
| `SchoolHistoryService` | Sequencial, nome de escola, transferência automática e média geral | 🟢 `app/Services/SchoolHistoryService.php:13-158` |
| `LegacySchoolHistory` / `LegacySchoolHistoryDiscipline` | Modelos das duas tabelas | 🟢 `app/Models/**` |
| `SchoolHistoryStatus` | Códigos de situação (1–14) | 🟢 `app/Models/SchoolHistoryStatus.php:7-44` |
| `Avaliacao_Service_Boletim` | Fonte de notas, faltas, frequência e situação (unit `Avaliacao`) | 🟢 `ProcessamentoApiController.php:501-536` |
| `GlobalAverageService` + regra/tabela de arredondamento | Média geral com arredondamento (units `Avaliacao`, `TabelaArredondamento`) | 🟢 `SchoolHistoryService.php:66-88`, `:152-157` |
| `pmieducar.historico_grade_curso` | Grade de modelo impresso | 🟢 migração |

### Domínio

O domínio é o **assentamento oficial da trajetória**: cabeçalho por etapa com situação, frequência e assentamento notarial, linhas de disciplina com nota textual livre, tudo replicando a coluna do modelo impresso. As duas entradas (manual e processado) compartilham o mesmo formato, e a origem não é distinguível na base. 🟢 migrações e `ProcessamentoApiController.php:603-633`

### Endpoints HTTP legados

| Rota | Uso | Fonte |
|------|-----|-------|
| `educar_historico_escolar_lst.php?ref_cod_aluno=` | Listagem | 🟢 `educar_historico_escolar_lst.php:90-138` |
| `educar_historico_escolar_cad.php` | CRUD de vida pregressa (`copia` GET clona) | 🟢 `educar_historico_escolar_cad.php:115-119`, `:310-384` |
| `educar_historico_escolar_det.php` | Detalhe com regra de restrição | 🟢 `educar_historico_escolar_det.php:211-242` |
| `modules/historico-escolar` (processamento) | Tela de processamento | 🟢 `ProcessamentoController.php:7-9` |
| API do processamento (`get-matriculas`, `post-processamento`, `delete-historico/get-historico`, `dump-historicos`) | Lote por matrícula | 🟢 `ProcessamentoApiController.php:436-601` |
| `educar_transferencia_solicitacao_cad.php` | Gatilho da transferência automática | 🟢 `:263` |

### Funções e classes no nível de aplicação

| Método | Papel | Fonte |
|--------|-------|-------|
| `Novo()` / `Editar()` / `Excluir()` (cad) | Gravação transacional, com disciplinas apagadas e recriadas | 🟢 `educar_historico_escolar_cad.php:310-384` |
| `buildHistoricoAttributes()` | Formata frequência (vírgula→ponto) e normaliza faltas globalizadas | 🟢 `:386-416` |
| `createDisciplines()` | Linhas com tipo_base, ordem e carga | 🟢 `:418-430` |
| `getNextSequencial()` / `getSchoolName()` (serviço) | Movimento de registro e nome de escola (mantendo dataset de complemento) | 🟢 `SchoolHistoryService.php:90-105` |
| `gerarHistoricoTransferencia()` | Criação automática de histórico de transferência | 🟢 `SchoolHistoryService.php:19-64` |
| `insertGlobalAverage()` | Linha "Média Geral" com arredondamento | 🟢 `SchoolHistoryService.php:66-88` |
| `postProcessamento()` | Lote individual com cria/reprocesso | 🟢 `ProcessamentoApiController.php:549-601` |
| `deleteHistorico()` | Remoção lógica com autor e data | 🟢 `ProcessamentoApiController.php:436-467` |
| `getSituacaoMatricula()` / `getPercentualFrequencia()` | Fonte boletim vs manual | 🟢 `:501-536` |

---

## Fluxo Principal

**Processamento consolidado de uma matrícula.**

1. O operador abre o processamento (processo 999613) com ano, instituição, escola, curso, série, turma e matrícula opcionais. 🟢 `ProcessamentoController.php:37-55`
2. O formulário exige dias letivos, grade curso, percentual, situação, disciplinas, notas e faltas, cada one com fonte (boletim, manual, AP). 🟢 `ProcessamentoController.php:86-235`
3. A grade lista as matrículas (com opção "somente dependências") e o operador processa um a um. 🟢 `ProcessamentoController.php:57-66` e `ProcessamentoApiController.php:997`
4. O backend abre transação, busca aluno e dados da matrícula e da escola, decide criação (próximo sequencial) ou reprocessamento (sequencial existente). 🟢 `ProcessamentoApiController.php:554-587`
5. O cabeçalho é gravado com situação, frequência, cargas, assentamentos e posição; as disciplinas são apagadas e recriadas do boletim ou manuais. 🟢 `ProcessamentoApiController.php:603-633` e `:682-684`
6. A média geral (se pedida) é inserida linha única com arredondamento da regra; a resposta devolve a situação e o link do histórico. 🟢 `ProcessamentoApiController.php:857` e `:594-599`

---

## Fluxos Alternativos

- **Vida pregressa:** cadastro com escola da rede ou externa (indicador de fora do município, país, município por busca), situação filtrada, assentamento livre, disciplinas em tabela dinâmica com dependência por linha. 🟢 `educar_historico_escolar_cad.php:145-308`
- **Copia:** o parâmetro GET `copia` abre o formulário para clone, ocultando ação de excluir. 🟡 `educar_historico_escolar_cad.php:115-119`
- **Transferência automática:** bandeira da instituição dispara a criação com situação Tran, grade curída derivada do nome do curso e disciplinas sem notas. 🟢 `SchoolHistoryService.php:19-64`
- **Restrição:** a bandeira da instituição restringe a edição aos usuários da escola da última matrícula ou níveis 1/2, e só para registros com origem de vida pregressa. 🟢 `educar_historico_escolar_det.php:211-242`
- **Remoção:** cabeçalho lógico com autor/data, disciplinas físicas. 🟢 `educar_historico_escolar_cad.php:366-384` e `ProcessamentoApiController.php:436-467`
- **Unificação de alunos:** os históricos e as linhas são transferidos para o aluno vencedor (unit `Unification`). 🟢 `ieducar/lib/App/Unificacao/Aluno.php:24-76`

---

## Dependências

| Dependência | Uso | Direção | Fonte |
|-------------|-----|---------|-------|
| `Avaliacao` (boletim) | Notas, faltas, frequência e situação do boletim | Saída | 🟢 `ProcessamentoApiController.php:501-547` |
| `RegraAvaliacao` / `TabelaArredondamento` | Regime de faltas globalizadas, arredondamento da média | Saída | 🟢 `SchoolHistoryService.php:152-157` |
| `Configuracao` (instituicao) | `controlar_posicao_historicos`, `restringir_historico_escolar`, `gerar_historico_transferencia` | Saída | 🟢 `ProcessamentoController.php:270-277`, `educar_historico_escolar_det.php:215`, `SchoolHistoryService.php:107-113` |
| `People`/`Enrollments` | Aluno, matrícula, enturmação | Saída | 🟢 `getAlunoIdByMatriculaId` e `getDadosMatricula` |
| `ComponenteCurricular` | Componentes, áreas de conhecimento, tipobase | Saída | 🟢 `educar_historico_escolar_cad.php:276` |
| `Unification` (unit futura) | Movimentação de históricos na unificação | Referência | 🟢 `Aluno.php:24-76` |
| `Reports` (unit futura) | Documento timbrado e relatórios | Consumidor | 🟡 |
| `Educacenso` | Nenhum consumo direto identificado | — | 🔴 |

---

## Decisões de Design Identificadas

| Decisão | Evidência | Confiança |
|---------|-----------|-----------|
| Duas entradas (manual e processado) sobre o mesmo modelo, sem tipo distinto na base (`origem` sempre 1). | `ProcessamentoApiController.php:620`, `educar_historico_escolar_cad.php:401` | 🟢 |
| Chave funcional (aluno, sequencial) com sequencial máximo + 1. | `SchoolHistoryService.php:102-105` | 🟢 |
| Nota como texto livre (255), com agenda numérica apenas na interface (campo monetário). | migração e `: substituted` | 🟢 |
| Assentamento notarial textual (registro/livro/folha), sem vínculo com domínio temporal. | migração | 🟢 |
| As fontes dos dados são opcionais por campo, herdando do boletim sob demanda. | `ProcessamentoController.php` | 🟢 |
| Processamento sob demanda, sem fechamento automático do calendário. | tela/busca | 🔴 |
| Média geral como linha de disciplina fantasma com arredondamento da regra. | `SchoolHistoryService.php:66-88` | 🟢 |
| Histórico de transferência alimentado pela bandeira institucional no momento da transferência. | `SchoolHistoryService.php:19-64` | 🟢 |
| Restrição de edição por vínculo de escola, aplicada na tela de detalhe. | `educar_historico_escolar_det.php:211-242` | 🟢 |
| Exclusão lógica do cabeçalho e física das disciplinas (assimetria). | `educar_historico_escolar_cad.php:373-380` | 🟡 |

---

## Estado Interno

- `aprovado` guarda o código de situação; `frequencia` o percentual em decimal; `import` marca registros importados. 🟢 migração
- As disciplinas são textualmente dependentes do histórico pelo trio (aluno, sequencial cabeçalho, sequencial linha); `historico_escolar_id` é vínculo tardio populado. 🟢 migrações de 2026
- O sequencial não pode ser editado; duplicações na cópia recebem próximo. 🟡

---

## Observabilidade

- Sem trilha de auditoria de notas do histórico (autor e valor anterior); apenas ref_usuario_cad/exc no cabeçalho. 🟡
- Mensagens de erro do processamento expõem o detalhe da exceção ao usuário. 🟡 `ProcessamentoApiController.php:591`
- Nenhum registro de processamento em lote (quem processou as turmas). 🔴

---

## Riscos e Lacunas

| Risco | Descrição | Evidência | Confiança |
|-------|-----------|-----------|-----------|
| SQL com interpolação na bandeira de restrição | Parâmetros da tela em SQL direto na tela de detalhe. | `educar_historico_escolar_det.php:215-224` | 🔴 |
| Origem indistinta | `origem` sempre 1 nas duas entradas; o bastão separa system/manual na migração sem base fiel. | `ProcessamentoApiController.php:620` | 🟡 |
| `data_exclusao` estampada em updates ativos | Reprocessamento e edição gravam data de exclusão com o registro ativo; analise extra ou espúrio. | `ProcessamentoApiController.php:581-584` | 🟡 |
| Derividade da grade por substring "8" | Nome do curso com "8" define séries vs anos na transferência. | `SchoolHistoryService.php:28` | 🟡 |
| Exclusão assimétrica | Cabeçalho lógico, disciplinas apagadas; perda de histórico das linhas na exclusão. | `educar_historico_escolar_cad.php:373-380` | 🟡 |
| Fechamento manual | O bastão chama de "consolidação anual permanente"; o legado processa sob demanda, com freqüência e situação escolhidas à mão. | busca | 🔴 |
| Nota textual | Comparação/estatística de notas depende de interpretação do texto ("AP"). | migração | 🟡 |
