# Cadastro (i-Educar legado), Design

> Como o subsistema de cadastro de aluno está estruturado no código legado, com os fluxos principais, as dependências, as decisões de design e os riscos.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades e componentes legados

| Componente | Papel | Fonte |
|----------|-------|-------|
| `AlunoController` (Cadastro/Views) | Formulário de cadastro e edição do aluno no framework Portabilis | 🟢 `ieducar/modules/Cadastro/Views/AlunoController.php:24-34` |
| `AlunoController` (Api/Views) | API de validação, gravação e consultas do aluno | 🟢 `ieducar/modules/Api/Views/AlunoController.php` |
| `clsPmieducarAluno` | Persistência do aluno pela camada legada | 🟢 `Api/Views/AlunoController.php:600` e `:682-687` |
| `clsModulesPessoaTransporte` | Transporte da pessoa (marcado para remoção) | 🟢 `Api/Views/AlunoController.php:1786-1799` |
| Modelos Eloquent do aluno | Ficha médica, moradia, benefícios, projetos, histórico e fotos | 🟢 `app/Models/LegacyStudent*.php` |
| `DeficiencyValidator`, `NisValidator`, `InepExamValidator`, `BirthCertificateValidator` | Validadores de domínio reutilizáveis | 🟢 `Api/Views/AlunoController.php:283-361` |
| `FileService` | Gravação de laudos e documentos | 🟢 `Api/Views/AlunoController.php:1901-1928` |

### Domínio

O domínio desta unit é o **cadastro do estudante**: a identidade da pessoa (compartilhada com o domínio de Pessoas) e a extensão escolar do aluno. A fronteira com as units vizinhas: a identidade e os documentos são da unit `People`; o transporte é da unit `Transport`; os códigos do Educacenso são da unit `Educacenso`; a unificação de alunos é da unit `Unification`. Esta unit cobre o formulário, a API de gravação e as consultas do aluno. 🟢 `_reversa_sdd/Cadastro/legacy-mapping.md:3-13`

### Endpoints HTTP legados

| Rota | Uso | Fonte |
|------|-----|-------|
| `intranet/educar_aluno_cad.php` (via `module/Cadastro/Aluno`) | Formulário de cadastro e edição | 🟢 `Cadastro/Views/AlunoController.php:297-316` |
| `intranet/educar_aluno_lst.php` | Listagem de alunos | 🟢 `ieducar/intranet/educar_aluno_lst.php` |
| `intranet/educar_aluno_det.php` | Detalhe do aluno | 🟢 `ieducar/intranet/educar_aluno_det.php` |
| `module/Api/Aluno/get` | Detalhe completo do aluno | 🟢 `Api/Views/AlunoController.php:1172-1285` |
| `module/Api/Aluno/post` | Criação do aluno | 🟢 `Api/Views/AlunoController.php:1709-1743` |
| `module/Api/Aluno/put` | Edição do aluno | 🟢 `Api/Views/AlunoController.php:1745-1777` |
| `module/Api/Aluno/delete` | Desativação do aluno | 🟢 `Api/Views/AlunoController.php:1822-1846` |
| `module/Api/Aluno/enable` | Reativação do aluno | 🟢 `Api/Views/AlunoController.php:1802-1820` |
| `module/Api/Aluno/search` | Busca por código e por nome | 🟢 `Api/Views/AlunoController.php:929-1078` |
| `module/Api/Aluno/getMatriculas` | Matrículas do aluno | 🟢 `Api/Views/AlunoController.php:1483-1587` |
| `module/Api/Aluno/getOcorrenciasDisciplinares` | Ocorrências disciplinares do aluno | 🟢 `Api/Views/AlunoController.php:830-902` |
| `module/Api/Aluno/getTodosAlunos` | Listagem completa com excluídos | 🟢 `Api/Views/AlunoController.php:1324-1427` |
| `module/Api/Aluno/getAlunosByGuardianCpf` | Alunos por CPF do responsável | 🟢 `Api/Views/AlunoController.php:1449-1482` |
| `module/Api/Aluno/getUnificacoes` | Dados de unificação (unit `Unification`) | 🟢 `Api/Views/AlunoController.php:2113-2219` |
| `module/Api/Aluno/getAlunosMatriculados` | Alunos matriculados para aplicativos de parceiros | 🟢 `Api/Views/AlunoController.php:2012-2095` |

Identificador de processo: 578, nível de acesso SOMENTE_ESCOLA. 🟢 `Cadastro/Views/AlunoController.php:32-34`

### Funções e classes no nível de aplicação

| Método | Papel | Fonte |
|--------|-------|-------|
| `AlunoController::canPost()` / `canPut()` | Porta de validação das gravações | 🟢 `Api/Views/AlunoController.php:222-232` |
| `AlunoController::commonValidate()` | Bloco comum de validações do aluno | 🟢 `Api/Views/AlunoController.php:234-243` |
| `AlunoController::createOrUpdateAluno()` | Gravação do registro do aluno | 🟢 `Api/Views/AlunoController.php:596-690` |
| `AlunoController::saveParents()` | Gravação do pai e da mãe na pessoa física | 🟢 `Api/Views/AlunoController.php:1588-1608` |
| `AlunoController::updateResponsavel()` | Responsável conforme o tipo | 🟢 `Api/Views/AlunoController.php:549-580` |
| `AlunoController::updateDeficiencias()` | Sincronização de deficiências e transtornos | 🟢 `Api/Views/AlunoController.php:582-594` |
| `AlunoController::createOrUpdateFichaMedica()` | Ficha médica | 🟢 `Api/Views/AlunoController.php:436-476` |
| `AlunoController::createOrUpdateMoradia()` | Moradia e socioeconômico | 🟢 `Api/Views/AlunoController.php:478-515` |
| `AlunoController::createUpdateOrDestroyEducacensoAluno()` | Código do Educacenso | 🟢 `Api/Views/AlunoController.php:525-546` |
| `AlunoController::updateBeneficios()` | Benefícios e exclusão + inserção | 🟢 `Api/Views/AlunoController.php:1617-1629` |
| `AlunoController::saveProjetos()` | Projetos com validações | 🟢 `Api/Views/AlunoController.php:1636-1684` |
| `AlunoController::saveHistoricoAlturaPeso()` | Histórico de altura e peso | 🟢 `Api/Views/AlunoController.php:1686-1707` |
| `AlunoController::createOrUpdateDocumentos()` | Documentos da pessoa | 🟢 `Api/Views/AlunoController.php:1929-1975` |
| `AlunoController::createOrUpdateLaudos()` | Laudos pelo serviço de arquivos | 🟢 `Api/Views/AlunoController.php:1901-1928` |
| `AlunoController::savePhoto()` e `validatePhoto()` | Foto da pessoa | 🟢 `Api/Views/AlunoController.php:1856-1900` |
| `AlunoController::delete()` / `enable()` | Desativação e reativação | 🟢 `Api/Views/AlunoController.php:1802-1846` |
| `AlunoController::replaceByEducacensoDeficiencies()` | Conversão dos códigos de deficiência | 🟢 `Api/Views/AlunoController.php:2264-2299` |

---

## Fluxo Principal

**Cadastrar ou editar um aluno.**

1. O usuário abre o formulário pelo processo 578, com identificador do aluno ou com a pessoa informada. 🟢 `Cadastro/Views/AlunoController.php:297-342`
2. O formulário carrega a pessoa, os documentos e as configurações da instituição (justificativa obrigatória) e monta cada seção. 🟢 `Cadastro/Views/AlunoController.php:316-1330`
3. O envio acontece para a API: `post` na criação, `put` na edição. 🟢 `Api/Views/AlunoController.php:1709` e `:1745`
4. Na gravação, a transação é aberta (criação) ou após a gravação dos pais (edição), e o bloco comum de validações é executado. 🟢 `Api/Views/AlunoController.php:1712` e `:1754` e `:234-243`
5. O aluno é gravado pela classe legada, com máscara do código estadual e com o autor autenticado. 🟢 `Api/Views/AlunoController.php:596-690`
6. Os pais, o responsável, o SUS, o Educacenso, as deficiências, a ficha médica, a moradia, os projetos, o histórico, o transporte, os documentos, a pessoa e os laudos são gravados em sequência. 🟢 `Api/Views/AlunoController.php:1720-1733` e `:1756-1768`
7. A transação é confirmada e o identificador do aluno é devolvido à tela. 🟢 `Api/Views/AlunoController.php:1739` e `:1776`

---

## Fluxos Alternativos

- **Recusa por validação:** qualquer falha do bloco comum, da unicidade ou do formatador adiciona mensagem e impede a gravação. 🟢 `Api/Views/AlunoController.php:222-232` e `:234-243`
- **Falha na gravação dos pais:** devolve resposta vazia na criação com a transação aberta, e entra antes da transação na edição. 🟢 `Api/Views/AlunoController.php:1716-1718` e `:1750-1752`.
- **Desativação:** acionada sem matrícula ativa, marca o registro como inativo com o autor; com matrícula ativa devolve a mensagem de bloqueio. 🟢 `Api/Views/AlunoController.php:1822-1846`
- **Reativação:** marca o registro como ativo outra vez. 🟢 `Api/Views/AlunoController.php:1802-1820`
- **Foto inválida ou não salva:** interrompe a gravação do aluno ou avisa por script na página. 🟢 `Api/Views/AlunoController.php:662-666` e `:1856-1876`
- **Projetos com violações:** os projetos voltam com mensagens específicas e os registros válidos se mantêm gravados, sem exceção. 🟢 `Api/Views/AlunoController.php:1655-1681`
- **Pesquisa por texto e por código:** devolve nomes de exibição com nome social e os alunos com e sem matrícula, conforme escola informada. 🟢 `Api/Views/AlunoController.php:929-1078`
- **Consulta por CPF de responsável:** a consulta devolve os alunos com o vínculo conferido do guardião. 🟢 `Api/Views/AlunoController.php:1427-1482`

---

## Dependências

| Dependência | Uso | Direção | Fonte |
|-------------|-----|---------|-------|
| Cadastro de pessoa física (`cadastro.fisica`, `cadastro.pessoa`, `cadastro.documento`) | Gravação de responsáveis, SUS, restrições judiciais e documentos | Saída | 🟢 `_reversa_sdd/People/legacy-mapping.md` |
| `ieducar/modules/Transport/` | Transporte do aluno e da pessoa | Saída | 🟢 `Api/Views/AlunoController.php:100-110` e `:1779-1800` |
| `ieducar/modules/Educacenso/` | Códigos INEP e validadores do censo | Saída | 🟢 `Api/Views/AlunoController.php:200-211` e `:2264-2299` |
| Modelos de deficiência e de transtornos | Sincronização do vínculo da pessoa | Saída | 🟢 `Api/Views/AlunoController.php:277-292` e `:582-594` |
| `pmieducar.matricula` | Bloqueio de desativação, ocorrências e matrículas | Saída | 🟢 `Api/Views/AlunoController.php:1848-1853` |
| Configurações da instituição | Justificativa obrigatória, tamanho mínimo do código estadual, exigência de CPF | Saída | 🟢 `Cadastro/Views/AlunoController.php:320-326` e `Api/Views/AlunoController.php:161-163` e `:252-258` |
| Arquivos | Foto e laudos | Saída | 🟢 `Api/Views/AlunoController.php:1856-1928` |
| Banco de dados | `pmieducar.aluno`, `pmieducar.aluno_excluidos`, `modules.ficha_medica_aluno`, `modules.moradia_aluno`, `pmieducar.projeto_aluno`, `modules.educacenso_cod_aluno` e correlatas | Saída | 🟢 saída: de cada gravação |

---

## Decisões de Design Identificadas

| Decisão | Evidência | Confiança |
|---------|-----------|-----------|
| A gravação do aluno é toda concentrada em uma API única, e o formulário só acumula campos e envia tudo de uma vez. | `Api/Views/AlunoController.php:1709-1777` | 🟢 |
| Os subsistemas de apoio são substituídos por exclusão e inserção, e não comparados: benefícios, projetos, histórico, Educacenso. | `Api/Views/AlunoController.php:1617-1629` e `:1636-1690` | 🟢 |
| A classe legada e os modelos Eloquent coexistem na mesma transação: o aluno pela classe, o resto pelos modelos. | `Api/Views/AlunoController.php:600` e `:475` | 🟢 |
| A semântica da caixa de alfabetizado é invertida na gravação, com a omissão do campo controlada por configuração. | `Api/Views/AlunoController.php:632-634` | 🟢 |
| A justificativa obrigatória vem da configuração da instituição, e a exigência é aplicada pela requisição. | `Cadastro/Views/AlunoController.php:320-326` | 🟢 |
| A mesma pessoa não pode ser pai e mãe, e o responsável pode ser o próprio pai ou a mãe. | `Api/Views/AlunoController.php:1593-1597` e `:558-574` | 🟢 |
| A desativação é exclusão lógica, com a tabela de excluídos para consultas históricas. | `Api/Views/AlunoController.php:1822-1846` e `:1389-1427` | 🟢 |
| O nome social prevalece na exibição, com o nome civil como contexto. | `Api/Views/AlunoController.php:940-944` | 🟢 |
| A validação de foto é feita antes da gravação do aluno, e a falha interrompe o fluxo. | `Api/Views/AlunoController.php:659-669` | 🟢 |

---

## Estado Interno

- Doze propriedades públicas do formulário mantêm estado de tela (foto, rotas de transporte, renda, restrições judiciais). 🟢 `Cadastro/Views/AlunoController.php:38-60`
- A requisição carrega todas as seções de uma vez (identidade, família, transporte, INEP, deficiências, ficha médica, moradia, projetos, histórico). 🟢 `Api/Views/AlunoController.php:44-370`
- A resposta da API devolve `['id' => ...]` nas gravações. 🟢 `Api/Views/AlunoController.php:1742` e `:1776`
- Não há estado de sessão no fluxo de gravação, além da autenticação. 🟡

---

## Observabilidade

- Não há log estruturado de gravação do aluno. 🔴
- As falhas são devolvidas como mensagens de texto na resposta da API, com mensagens de projeto sem indicação de campo ou de número da linha. 🟢 `Api/Views/AlunoController.php:1655-1681`
- Não há métricas nem trilha de auditoria das mudanças do cadastro do aluno. 🔴

---

## Riscos e Lacunas

| Risco | Descrição | Evidência | Confiança |
|-------|-----------|-----------|-----------|
| Injeção SQL | A consulta da ocorrência obedece às escolas com interpolação direta de `{$escola}` e `{$where}` da requisição; o `id` do aluno também é interpolado na consulta da pessoa do formulário. | `Api/Views/AlunoController.php:881` e `:1380` e `:1404` e `Cadastro/Views/AlunoController.php:336` | 🟢 |
| Transação aberta | Na criação, a falha de `saveParents` devolve a resposta sem rollback, deixando a transação aberta na conexão, e o commit se mantém mesmo com falha. | `Api/Views/AlunoController.php:1712-1739` | 🟢 |
| Dados obsoletos na moradia | A gravação descarta campos nulos, e os valores limpos no formulário permanecem na base. | `Api/Views/AlunoController.php:508-514` | 🟢 |
| Gravação parcial de projetos | Os projetos são apagados e regravados com mensagens de erro sem exceção, e a transação permanece confirmada com gravação parcial. | `Api/Views/AlunoController.php:1638-1683` | 🟢 |
| Script na resposta| O erro de foto devolve `<script>alert(...)` na resposta da API. | `Api/Views/AlunoController.php:1869` | 🟢 |
| Sem trilha de auditoria | As mudanças do cadastro não são registradas com autor, instante e valores anteriores. | ausência de evidência no código lido | 🔴 |
| Campos de apresentação | A extensão dos campos da ficha médica e da moradia depende de confirmação com a área de saúde pública para o modelo novo. | `Api/Views/AlunoController.php:436-515` | 🟡 |
