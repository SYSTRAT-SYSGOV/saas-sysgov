# Cadastro (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Descreve o **QUE** o subsistema de cadastro de aluno legado faz: o formulário de cadastro e edição do aluno e a API de gravação, com identidade e documentos da pessoa, pais e responsável, transporte, INEP, deficiências e transtornos, ficha médica, moradia, projetos, benefícios, histórico de altura e peso e desativação.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O subsistema Cadastro do i-Educar é a porta de entrada do estudante na rede: uma tela com o formulário completo do aluno (ieducar/modules/Cadastro/Views/AlunoController.php) e uma API de gravação que orquestra a persistência de uma dúzia de subsistemas em uma transação (ieducar/modules/Api/Views/AlunoController.php). 🟢 `ieducar/modules/Cadastro/` e `ieducar/modules/Api/Views/AlunoController.php`

Problema que resolve: consolidar a identidade da pessoa (nome social, documentos, nascimento), a estrutura familiar (pai, mãe, responsável e restrições judiciais), a ficha médica e socioeconômica do estudante, o transporte escolar, os códigos do Censo Educacenso e as deficiências com laudos, mantendo a unicidade de um aluno por pessoa e de um código INEP por aluno. 🟢

Observação estrutural: a unit é uma casca sobre o domínio de Pessoas. A entidade do aluno (`pmieducar.aluno`) referencia uma pessoa física (`cadastro.fisica`) e a maior parte dos subsistemas gravados (documentos, SUS, restrição judicial, deficiências) é da pessoa, e não do aluno. O `legacy-mapping.md` desta unit aponta para `People`, e as units `Transport` (1), `Educacenso` (2) e `Unification` (20) cobrem os temas afins. 🟢 `_reversa_sdd/Cadastro/legacy-mapping.md:3-13`

A gravação usa a classe legada `clsPmieducarAluno` e modelos Eloquent sobre as tabelas de apoio `modules.ficha_medica_aluno`, `modules.moradia_aluno`, `pmieducar.projeto_aluno`, `pmieducar.aluno_excluidos` e correlatas. 🟢

---

## Responsabilidades

- Renderizar o formulário de cadastro e edição do aluno, com processo 578 e nível de acesso de somente escola. 🟢 `ieducar/modules/Cadastro/Views/AlunoController.php:28-36`
- Delegar a criação e a edição à API: os métodos `_initNovo()` e `_initEditar()` devolvem `false`, e o formulário só monta os campos. 🟢 `Cadastro/Views/AlunoController.php:306-314`
- Carregar a pessoa pelo identificador, pela query `person` ou pelo código do aluno, com os documentos da pessoa. 🟢 `Cadastro/Views/AlunoController.php:328-342`
- Validar a existência da pessoa física, do responsável, do benefício e do conjunto de tipos de responsável e de transporte. 🟢 `Api/Views/AlunoController.php:44-110`
- Impedir mais de um aluno por pessoa, com a mensagem: "Já existe um aluno cadastrado para a pessoa {id}." 🟢 `Api/Views/AlunoController.php:112-123`
- Impedir a duplicidade do código INEP entre alunos ativos, com a mensagem de código INEP já cadastrado. 🟢 `Api/Views/AlunoController.php:125-147`
- Impedir a duplicidade do código da rede estadual entre alunos ativos, com tamanho mínimo vindo da configuração da instituição. 🟢 `Api/Views/AlunoController.php:149-182`
- Validar o código INEP com doze dígitos que não começam com zero. 🟢 `Api/Views/AlunoController.php:200-211`
- Validar o CPF quando a instituição exige (`obrigar_cpf`), exceto para pessoas de nacionalidade estrangeira. 🟢 `Api/Views/AlunoController.php:245-272`
- Validar as deficiências e os transtornos pelo `DeficiencyValidator`, com substituição pelos códigos do Educacenso. 🟢 `Api/Views/AlunoController.php:277-292` e `:2264-2299`
- Validar a certidão de nascimento no formato novo contra a data de nascimento. 🟢 `Api/Views/AlunoController.php:297-314`
- Validar o NIS pelo `NisValidator`, os recursos tecnológicos com exclusividade da opção "Nenhum" e os recursos da prova INEP pelo `InepExamValidator` com deficiências e transtornos. 🟢 `Api/Views/AlunoController.php:319-370`
- Gravar o aluno pela classe legada, com máscara automática do código da rede estadual, tipo de responsável convertido, analfabeto com semântica invertida e a foto validada. 🟢 `Api/Views/AlunoController.php:596-690`
- Gravar o pai e a mãe na pessoa física, recusando a mesma pessoa para os dois, com as restrições judiciais. 🟢 `Api/Views/AlunoController.php:1588-1608`
- Atualizar o responsável conforme o tipo, inclusive a restrição judicial do responsável selecionado. 🟢 `Api/Views/AlunoController.php:549-580`
- Gravar a ficha médica com vinte e quatro campos booleanos de "S"/"N" e os descritivos. 🟢 `Api/Views/AlunoController.php:436-476`
- Gravar a moradia com bens e saneamento, a renda normalizada e os recursos tecnológicos em JSON. 🟢 `Api/Views/AlunoController.php:478-515`
- Recriar o código do Educacenso do aluno, destruir e recriar quando o código INEP existe. 🟢 `Api/Views/AlunoController.php:525-546`
- Substituir os benefícios e os projetos por exclusão e inserção, com as validações de projeto (mesmo projeto, data de inclusão posterior ao desligamento anterior e turno da matrícula). 🟢 `Api/Views/AlunoController.php:1617-1629` e `:1636-1684`
- Substituir o histórico de altura e peso por exclusão e inserção. 🟢 `Api/Views/AlunoController.php:1686-1707`
- Gravar documentos da pessoa, o número do SUS, os laudos pelo serviço de arquivos e a foto, com exclusão da foto marcada. 🟢 `Api/Views/AlunoController.php:428-434` e `:1901-1988` e `:1856-1876`
- Gravar o transporte da pessoa, marcado para remoção futura no código legado. 🟢 `Api/Views/AlunoController.php:1779-1800`
- Expor a busca por aluno por código e por nome, com o nome social normalmente exibido com o nome de registro. 🟢 `Api/Views/AlunoController.php:929-1078`
- Expor a listagem completa de todos os alunos de escolas e ano, incluindo os excluídos com a marca de exclusão. 🟢 `Api/Views/AlunoController.php:1324-1427`
- Expor as matrículas do aluno, as ocorrências disciplinares visíveis aos pais, os alunos de responsáveis por CPF e o detalhe completo. 🟢 `Api/Views/AlunoController.php:1483-1587` e `:830-902` e `:1449-1482` e `:1172-1285`
- Desativar o aluno (exclusão lógica) e reativá-lo, com bloqueio para alunos com matrícula ativa. 🟢 `Api/Views/AlunoController.php:1802-1846`
- Fornecer os dados de unificação de alunos para o módulo de unificação. 🟢 `Api/Views/AlunoController.php:2113-2219` e `_reversa_sdd/Unification/` (unit 20)

---

## Regras de Negócio

- A tela de cadastro pertence ao processo 578, com nível de acesso de somente escola. 🟢 `Cadastro/Views/AlunoController.php:32-34`
- A criação e a edição do aluno são sempre pela API; o controlador de formulário devolve `false` nos métodos de abertura. 🟢 `Cadastro/Views/AlunoController.php:306-314`
- A justificativa para a falta de documentação é obrigatória quando a instituição ativa exige (`justificativa_falta_documentacao_obrigatorio`). 🟢 `Cadastro/Views/AlunoController.php:320-326`
- O campo de alfabetizado é omitido por configuração global (`legacy.app.alunos.nao_apresentar_campo_alfabetizado`), e a semântica do campo gravado é invertida: marcado como alfabetizado grava `analfabeto = 0`. 🟢 `Api/Views/AlunoController.php:632-634`
- O tipo de responsável admite quatro valores na requisição ('mae', 'pai', 'outra_pessoa', 'pai_mae') e é convertido para as letras da base ('m', 'p', 'r', 'a'). 🟢 `Api/Views/AlunoController.php:82-92` e `:598` e `:637`
- O tipo de transporte admite três valores: 'nenhum', 'municipal', 'estadual'. 🟢 `Api/Views/AlunoController.php:100-110`
- O identificador da pessoa do aluno não muda após a criação. 🟢 `Api/Views/AlunoController.php:627-630`
- O código da rede estadual é normalizado para maiúsculas sem pontos e hífen antes da máscara, e ganha máscara `XXX.XXX.XXX` ou `XXX.XXX.XXX-X` conforme tem menos de dez dígitos ou dez. 🟢 `Api/Views/AlunoController.php:603-614`
- O usuário de mudança do registro é sempre o usuário autenticado (`ref_usuario_exc = Auth::id()`). 🟢 `Api/Views/AlunoController.php:638`
- Os recursos da prova INEP são gravados como array literal do PostgreSQL conforme a lista de recursos marcados. 🟢 `Api/Views/AlunoController.php:640-647`
- Os veículos do transporte escolar são gravados como lista separada por vírgula dos marcados. 🟢 `Api/Views/AlunoController.php:651-657`
- A pessoa da mãe e do pai é uma pessoa física existente, e a mesma pessoa não pode ser pai e mãe ao mesmo tempo. 🟢 `Api/Views/AlunoController.php:1588-1608`
- Quando o responsável é o pai ou a mãe, o identificador vem do vínculo da própria pessoa, e não do campo da requisição. 🟢 `Api/Views/AlunoController.php:558-574`
- A restrição judicial do responsável selecionado é registrada em `cadastro.fisica` junto com as restrições do pai e da mãe. 🟢 `Api/Views/AlunoController.php:569-574` e `:1601-1607`
- As deficiências e os transtornos são sincronizados no vínculo da pessoa, e os códigos alterados recebem `updated_at` atualizado. 🟢 `Api/Views/AlunoController.php:582-594`
- O CPF só é exigido quando a instituição tem `obrigar_cpf`, e pessoas de nacionalidade estrangeira dispensam a validação. 🟢 `Api/Views/AlunoController.php:245-272`
- As fórmulas booleanas da ficha médica são gravadas como "S" ou "N" conforme a caixa marcada. 🟢 `Api/Views/AlunoController.php:471-473`
- A renda da moradia é normalizada por expressão regular, removendo qualquer caractere que não seja dígito, com vírgula convertida em ponto. 🟢 `Api/Views/AlunoController.php:501`
- O projeto exige data de inclusão e turno numéricos, recusa o mesmo projeto ativo duplicado, recusa inclusão anterior ao desligamento anterior e recusa o turno em que o aluno estuda. 🟢 `Api/Views/AlunoController.php:1648-1681` e `:402-421`
- A pessoa do transporte é gravada apenas quando a classe legada existe, marcada como TODO de remoção futura. 🟢 `Api/Views/AlunoController.php:1779-1800`
- A exclusão do aluno só ocorre sem matrícula ativa, com a mensagem: "O cadastro não pode ser removido, pois existem matrículas vinculadas." 🟢 `Api/Views/AlunoController.php:1822-1846`
- A exclusão da foto é identificada pela caixa `file_delete`, e a foto é enviada pelo controlador de fotos com aviso de falha por script na página. 🟢 `Api/Views/AlunoController.php:1856-1876`
- As ocorrências disciplinares consultadas pelos responsáveis observam somente as visíveis aos pais (`visivel_pais = 1`). 🟢 `Api/Views/AlunoController.php:879-882`
- A pesquisa por nome exibe o nome social com o nome de registro quando existir: "{nome social} - Nome de registro: {nome}". 🟢 `Api/Views/AlunoController.php:940-944`
- A listagem completa inclui os alunos excluídos por união com a tabela `pmieducar.aluno_excluidos`, com a coluna de exclusão. 🟢 `Api/Views/AlunoController.php:1324-1427`
- As consultas interpolam valores da requisição em SQL: o `id` do aluno em `Cadastro/Views/AlunoController.php:336` e as escolas em `Api/Views/AlunoController.php:881` e `:1380` e `:1404`. 🟢
- Não existe trilha de auditoria das mudanças do cadastro do aluno, e além do `ref_usuario_exc` não há registro de autor dos subsistemas de apoio. 🔴

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O sistema deve cadastrar e editar o aluno por formulário com identidade, documentos, família, transporte, INEP, deficiências, ficha médica, moradia, projetos e benefícios. | Must | Dado um formulário válido, quando gravado, então o aluno e todos os subsistemas ficam persistidos em uma transação. |
| RF-02 | O sistema deve permitir um único aluno por pessoa física, com a mensagem de aluno já cadastrado. | Must | Dado uma pessoa com aluno ativo, quando novo aluno for gravado, então a gravação é recusada. |
| RF-03 | O sistema deve validar a unicidade do código INEP e do código da rede estadual entre alunos ativos. | Must | Dado um código INEP de outro aluno, quando gravado, então a gravação é recusada com o código do aluno conflito. |
| RF-04 | O sistema deve validar o código INEP com doze dígitos que não começam com zero. | Must | Dado um código INEP de onze dígitos, quando gravado, então a gravação é recusada. |
| RF-05 | O sistema deve aplicar a máscara automática ao código da rede estadual, com três blocos de três dígitos e mais o dígito final com hífen quando há dez dígitos. | Must | Dado o código "1234567890", quando gravado, então fica "123.456.789-0". |
| RF-06 | O sistema deve exigir CPF válido quando a instituição configurar, exceto para pessoas de nacionalidade estrangeira. | Must | Dado um CPF inválido e instituição com exigência, quando gravado, então a gravação é recusada. |
| RF-07 | O sistema deve gravar o pai e a mãe como pessoas físicas existentes e recusar a mesma pessoa para os dois papéis. | Must | Dado a mesma pessoa para pai e mãe, quando gravado, então a gravação é interrompida. |
| RF-08 | O sistema deve gravar o responsável conforme o tipo, com a restrição judicial registrada na pessoa física. | Must | Dado o tipo de responsável "mãe" com restrição judicial marcada, quando gravado, então a restrição fica registrada. |
| RF-09 | O sistema deve sincronizar as deficiências e os transtornos da pessoa, marcando os códigos alterados com atualização. | Must | Dado a troca de deficiências, quando gravado, então a sincronização reflete o novo conjunto. |
| RF-10 | O sistema deve gravar a ficha médica com os booleanos de "S"/"N" e os descritivos. | Must | Dado a ficha médica preenchida, quando gravada, então os campos booleanos e descritivos ficam persistidos. |
| RF-11 | O sistema deve gravar a moradia com bens, saneamento, renda normalizada e recursos tecnológicos em JSON. | Must | Dado a moradia preenchida, quando gravada, então os bens marcados são gravados, e a renda fica normalizada. |
| RF-12 | O sistema deve gravar e recriar o código do Educacenso do aluno conforme a presença do código INEP. | Must | Dado um código INEP informado, quando gravado, então o vínculo do Educacenso é recriado; sem código, é destruído. |
| RF-13 | O sistema deve substituir os benefícios do aluno por exclusão e inserção. | Must | Dado dois benefícios marcados, quando gravados, então os anteriores são substituídos pelos dois. |
| RF-14 | O sistema deve gravar os projetos com validação de turno da matrícula, unicidade do projeto ativo e data de inclusão posterior ao desligamento anterior. | Must | Dado um projeto no turno da matrícula, quando gravado, então a gravação é recusada com a mensagem de turno. |
| RF-15 | O sistema deve gravar o histórico de altura e peso por exclusão e inserção. | Should | Dado três medições, quando gravadas, então os registros anteriores são substituídos pelas três. |
| RF-16 | O sistema deve gravar os documentos da pessoa, o número do SUS, os laudos e a foto, com exclusão da foto marcada. | Must | Dado a troca de documentos e a foto, quando gravadas, então os documentos e a foto ficam atualizados. |
| RF-17 | O sistema deve desativar o aluno sem matrículas ativas e reativá-lo, registrando o autor. | Must | Dado um aluno com matrícula ativa, quando desativado, então a desativação é recusada. |
| RF-18 | O sistema deve buscar alunos por código e por nome, com o nome social exibido com o nome de registro. | Must | Dado um nome social preenchido, quando o aluno é buscado, então a exibição traz "nome social - Nome de registro: nome civil". |
| RF-19 | O sistema deve listar todos os alunos das escolas e ano, incluindo os excluídos com a marca de exclusão. | Must | Dado um aluno desativado, quando a listagem completa é consultada, então ele aparece com a data de exclusão. |
| RF-20 | O sistema deve consultar as matrículas do aluno e as ocorrências disciplinares visíveis aos pais. | Must | Dado uma ocorrência não visível aos pais, quando consultada pelos responsáveis, então não é devolvida. |
| RF-21 | O sistema deve consultar os alunos de um CPF de responsável, com conferência do vínculo de guardião. | Should | Dado um CPF de responsável, quando consultado, então a lista devolve somente os alunos de vínculo confirmado. |
| RF-22 | O sistema deve rejeitar a gravação de valores da requisição interpolados diretamente em SQL, com consultas preparadas. | Must | Dado uma requisição com valor malicioso no campo de escolas, quando consultada, então a consulta não executa conteúdo injetado. 🔴 |

---

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência no código | Confiança |
|------|-----------|---------------------|-----------|
| Segurança | A tela exige a permissão do processo 578 e nível de acesso de somente escola. | `Cadastro/Views/AlunoController.php:32-34` | 🟢 |
| Segurança | Há interpolação direta de valores da requisição em SQL em três consultas da API e em uma do formulário. | `Cadastro/Views/AlunoController.php:336` e `Api/Views/AlunoController.php:881` e `:1380` e `:1404` | 🟢 |
| Segurança | A API devolve script de página por `echo` no erro de foto (`<script>alert(...)`). | `Api/Views/AlunoController.php:1869` | 🟢 |
| Integridade | A gravação do aluno e dos subsistemas ocorre em transação única, com confirmação ao fim. | `Api/Views/AlunoController.php:1712-1739` e `:1754-1774` | 🟢 |
| Integridade | Na criação, a falha do gravador de pais devolve a resposta sem rollback, deixando a transação aberta. | `Api/Views/AlunoController.php:1716-1718` | 🟢 |
| Integridade | A gravação de moradia descarta os campos nulos, e campos limpos permanecem com o valor antigo. | `Api/Views/AlunoController.php:508-514` | 🟢 |
| Desempenho | A listagem completa faz união de duas consultas amplas com a tabela de excluídos. | `Api/Views/AlunoController.php:1387-1427` | 🟡 |
| Manutenibilidade | O transporte da pessoa é manutenção marcada como TODO de remoção futura. | `Api/Views/AlunoController.php:1779-1800` | 🟢 |
| Usabilidade | O formulário é um documento único com seções por assunto, com o envio de validações pela API. | `Cadastro/Views/AlunoController.php:316-1330` | 🟡 |
| Observabilidade | As falhas são devolvidas como mensagens de texto na resposta da API, com mensagens de projeto sem indicação de campo, e não há log estruturado. | `Api/Views/AlunoController.php:1655-1681` | 🟢 |
| Multi-tenancy | O legado opera em base municipal única; o modelo novo isola por `tenant_id`, e a pessoa é compartilhada com o núcleo SYSGOV. | `_reversa_sdd/Cadastro/legacy-mapping.md:11-13` | 🟡 |

---

## Critérios de Aceitação

```gherkin
Dado uma pessoa física com aluno ativo
Quando um novo aluno for gravado para a mesma pessoa
Então a gravação é recusada com a mensagem de aluno já cadastrado

Dado um código INEP já usado por outro aluno ativo
Quando gravado
Então a gravação é recusada com o código do aluno em conflito

Dado um código INEP com onze dígitos
Quando gravado
Então a gravação é recusada pela regra do formato

Dado um CPF inválido com instituição exigindo CPF
Quando gravado
Então a gravação é recusada com a mensagem de CPF inválido

Dado a mesma pessoa indicada como pai e mãe
Quando gravado
Então a gravação dos pais é interrompida com a mensagem

Dado um projeto com turno igual ao da matrícula ativa
Quando gravado
Então a gravação é recusada com a mensagem de turno

Dado um projeto já ativo duplicado
Quando gravado
Então a gravação é recusada com a mensagem de projeto duplicado

Dado a ficha médica com campos booleanos e descritivos
Quando gravada
Então os booleanos ficam "S" ou "N" e os descritivos são persistidos

Dado a moradia com campos limpos de valor anterior
Quando gravada
Então há registro de advertência sobre o mecanismo que descarta nulos 🔴

Dado um aluno com matrícula ativa
Quando desativado
Então a desativação é recusada com a mensagem de matrículas vinculadas

Dado um aluno sem matrícula ativa
Quando desativado
Então o registro fica inativo com o autor registrado

Dado um formulário com a caixa de exclusão de foto marcada
Quando gravado
Então a foto da pessoa é excluída

Dado um nome social preenchido
Quando o aluno é buscado por nome
Então a exibição traz o nome social com o nome de registro

Dado uma ocorrência disciplinar não visível aos pais
Quando a ocorrência é consultada
Então ela não é devolvida

Dado uma requisição com conteúdo malicioso nos campos interpolados em SQL
Quando a consulta é executada
Então nenhum conteúdo injetado é executado 🔴
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Formulário de cadastro completo do aluno | Must | Porta de entrada do estudante |
| Unicidade de aluno por pessoa, de INEP e de código estadual | Must | Integridade da identidade |
| Gravação transacional de todos os subsistemas | Must | Coerência do cadastro |
| Gravação de pais, responsável e restrições judiciais | Must | Estrutura familiar com impacto legal |
| Deficiências, ficha médica e laudos | Must | Regulatório da inclusão |
| Desativação com bloqueio de matrícula ativa | Must | Preservação da história do aluno |
| Consultas: matrículas, ocorrências, detalhe, busca | Must | Consumo das telas e apps |
| Documentos, SUS e foto | Must | Identificação do estudante |
| Projetos, benefícios e histórico de altura e peso | Should | Campos de apoio socioeconômico |
| Correção das interpolações SQL | Must | Vulnerabilidade crítica 🔴 |
| Correção da transação sem rollback na criação | Must | Integridade da base 🔴 |
| Correção da moradia que descarta nulos | Should | Coerência dos dados socioeconômicos 🟡 |
| Remoção do transporte da pessoa (TODO) | Should | Dívida técnica declarada no legado |
| Audiência de mudanças do cadastro | Should | Ausente no legado e previsto no modelo novo 🔴 |
| Nome social com nome de registro | Must | Direito de identidade do estudante |

> Prioridade inferida pelo papel do cadastro como porta de entrada e pelo impacto regulatório e legal dos campos.

---

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `ieducar/modules/Cadastro/Views/AlunoController.php` | Formulário de cadastro e edição do aluno | 🟢 |
| `ieducar/intranet/educar_aluno_lst.php` | Listagem de alunos | 🟢 |
| `ieducar/intranet/educar_aluno_det.php` | Detalhe do aluno | 🟢 |
| `ieducar/intranet/educar_aluno_beneficio_lst.php` | Listagem de benefícios | 🟢 |
| `ieducar/intranet/educar_aluno_beneficio_det.php` | Detalhe do benefício | 🟢 |
| `ieducar/intranet/educar_aluno_beneficio_cad.php` | Cadastro do benefício | 🟢 |
| `ieducar/modules/Api/Views/AlunoController.php` | API de gravação e consultas do aluno | 🟢 |
| `app/Models/LegacyStudent.php` | Modelo eloquente do aluno | 🟢 |
| `app/Models/LegacyDocument.php` | Modelo dos documentos da pessoa | 🟢 |
| `app/Models/LegacyIndividual.php` | Modelo dos dados físicos da pessoa | 🟢 |
| `app/Models/LegacyStudentMedicalRecord.php` | Modelo da ficha médica | 🟢 |
| `app/Models/LegacyStudentBenefit.php` | Modelo dos benefícios | 🟢 |
| `app/Models/LegacyStudentProject.php` | Modelo dos projetos | 🟢 |
| `app/Models/LegacyStudentHistoricalHeightWeight.php` | Modelo do histórico de altura e peso | 🟢 |
| `app/Models/LegacyIndividualPicture.php` | Modelo da foto da pessoa | 🟢 |
| `app/Models/LegacyGeneralConfiguration.php` | Configurações gerais da instituição | 🟢 |
| `app/Models/TransportationProvider.php` | Enum do prestador do transporte | 🟢 |
| `app/Services/FileService.php` | Serviço de gravação de arquivos com laudos | 🟢 |
| `app/Http/Controllers/Api/StudentController.php` | Atualização da inscrição estadual | 🟢 |
| `clsPmieducarAluno` (classe legada) | Persistência do aluno | 🟢 |
| `clsModulesPessoaTransporte` (classe legada) | Transporte da pessoa | 🟢 |
| `pmieducar.aluno` | Tabela do aluno | 🟢 |
| `pmieducar.aluno_excluidos` | Tabela de alunos excluídos | 🟢 |
| `cadastro.fisica` | Tabela física da pessoa | 🟢 |
| `modules.ficha_medica_aluno` | Tabela da ficha médica | 🟢 |
| `modules.moradia_aluno` | Tabela da moradia | 🟢 |
| `_reversa_sdd/Cadastro/legacy-mapping.md` | Desenho de migração para o modelo novo | 🟢 |
