# Enrollments (i-Educar legado), Contratos

> Contratos externos observados no legado para a unit de matrículas e enturmações. Serve de entrada para o `openapi/` do modelo novo.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contrato de tela (legado MVC)

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| GET | `/matricula/{registration}/enturmar/{schoolClass}` | matrícula, turma | Página de enturmação | Exibe as enturmações ativas e as enturmações em outras turmas 🟢 `app/Http/Controllers/EnrollmentController.php:25-60` |
| GET | `/matricula/{registration}/remanejar/{schoolClass}` | matrícula, turma | Página de remanejamento | Exige a permissão de visualização de remanejamento 🟢 `EnrollmentController.php:114-139` |
| GET | `/enrollment-history/{id}` | matrícula | Página de histórico de enturmações | 🟢 `app/Http/Controllers/EnrollmentHistoryController.php:14-26` |
| GET | `/enrollment-inep/{enrollment}` | enturmação | Página de carga horária integralizada e matrícula INEP | 🟢 `app/Http/Controllers/EnrollmentInepController.php:14-23` |
| GET | `/enturmacao-em-lote/{schoolClass}` | turma | Página de enturmação em lote com as matrículas elegíveis 🟢 `app/Http/Controllers/BatchEnrollmentController.php:127-138` |
| GET | `/cancelar-enturmacao-em-lote/{schoolClass}` | turma | Página de desenturmação em lote 🟢 `BatchEnrollmentController.php:87-91` |
| GET | `/cancelar-matricula-em-lote/{schoolClass}` | turma | Página de cancelamento de matrícula em lote 🟢 `BatchEnrollmentController.php:208-214` |
| GET | `/intranet/educar_matricula_lst.php` | filtros | Listagem de matrículas 🟢 `routes/web.php:43-45` |
| GET | `/intranet/educar_matricula_turma_lst.php` | filtros | Listagem de enturmações 🟢 `routes/web.php:43-45` |

---

## 2. Contrato de escrita da enturmação

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| POST | `/matricula/{registration}/enturmar/{schoolClass}` | `enrollment_date` em `d/m/Y` | Redirecionamento para `/intranet/educar_matricula_det.php?cod_matricula={id}` com mensagem de sucesso ou de erro | 🟢 `app/Http/Controllers/EnrollmentController.php:93-106` |

| Campo | Validação | Mensagem |
|-------|-----------|----------|
| `enrollment_date` | obrigatório e no formato `d/m/Y` | `A data de enturmação é obrigatória.` e `A data de enturmação deve ser uma data válida.` 🟢 `app/Http/Requests/EnrollmentRequest.php:16-27` |
| `is_cancellation` | opcional | Quando presente, a rota executa a desenturmação em vez da enturmação 🟢 `EnrollmentController.php:71-95` |
| `enrollment_from_id` | obrigatório no remanejamento | Identificador da enturmação de origem 🟢 `EnrollmentController.php:160-165` |

### Exceções de domínio traduzidas ao usuário 🟢 `app/Exceptions/Enrollment/`

| Exceção | Gatilho | Origem |
|---------|---------|--------|
| `NoVacancyException` | Turma sem vaga e bloqueio ativo | `EnrollmentService.php:193-195` |
| `EnrollDateBeforeAcademicYearException` | Data anterior ao início do ano letivo sem autorização | `EnrollmentService.php:197-201` |
| `EnrollDateAfterAcademicYearException` | Data posterior ao fim do ano letivo | `EnrollmentService.php:203-205` |
| `PreviousEnrollDateException` | Data anterior à data de saída da última enturmação | `EnrollmentService.php:207-213` |
| `PreviousEnrollRegistrationDateException` | Data anterior à data de matrícula | `EnrollmentService.php:215-217` |
| `ExistsActiveEnrollmentSameTimeException` | Conflito de horário | `EnrollmentService.php:219-223` |
| `ExistsActiveEnrollmentException` | Enturmação duplicada na mesma turma | `EnrollmentService.php:225-232` |
| `CancellationDateBeforeAcademicYearException` | Cancelamento antes do início do ano letivo | `EnrollmentService.php:135-139` |
| `CancellationDateAfterAcademicYearException` | Cancelamento depois do fim do ano letivo | `EnrollmentService.php:141-143` |
| `PreviousCancellationDateException` | Cancelamento antes da data de entrada da enturmação | `EnrollmentService.php:145-147` |
| `PreviousEnrollCancellationDateException` | Cancelamento antes da data de matrícula | `EnrollmentService.php:149-151` |

---

## 3. Contrato das operações em lote

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| POST | `/enturmacao-em-lote/{schoolClass}` | `date` em `d/m/Y`, `registrations[]` | Página com `success` e `fails`, indexados por matrícula | 🟢 `app/Http/Controllers/BatchEnrollmentController.php:143-174` |
| POST | `/cancelar-enturmacao-em-lote/{schoolClass}` | `date` em `d/m/Y`, `enrollments[]` | Página com `success` e `fails`, indexados por enturmação | 🟢 `BatchEnrollmentController.php:99-122` |
| POST | `/cancelar-matricula-em-lote/{schoolClass}` | `registrations[]` | Página com `success` e `fails`, indexados por matrícula | 🟢 `BatchEnrollmentController.php:221-270` |

| Mensagem agregada | Condição | Texto |
|------------------|-----------|-------|
| Enturmação em lote com uma falha | Uma falha | `Não foi possível enturmar 1 aluno.` |
| Enturmação em lote com várias falhas | Mais de uma falha | `Não foi possível enturmar {n} alunos.` |
| Enturmação em lote com um sucesso | Um sucesso | `Foi enturmado 1 aluno.` |
| Enturmação em lote com vários sucessos | Mais de um sucesso | `Foram enturmados {n} alunos.` |
| Desenturmação em lote | Uma falha | `Não foi possível desenturmar 1 aluno.` |
| Desenturmação em lote | Várias falhas | `Não foi possível desenturmar {n} alunos.` |
| Desenturmação em lote | Um sucesso | `Foi desenturmado 1 aluno.` |
| Desenturmação em lote | Vários sucessos | `Foram desenturmados {n} alunos.` |
| Cancelamento em lote | Uma falha | `Não foi possível cancelar 1 matrícula.` |
| Cancelamento em lote | Várias falhas | `Não foi possível cancelar {n} matrículas.` |
| Cancelamento em lote | Um sucesso | `Foi cancelada 1 matrícula.` |
| Cancelamento em lote | Vários sucessos | `Foram canceladas {n} matrículas.` |

Fonte: `app/Http/Controllers/BatchEnrollmentController.php:311-362`. 🟢

| Mensagem por aluno | Contexto |
|--------------------|----------|
| `Aluno enturmado.` | Sucesso da enturmação em lote 🟢 `BatchEnrollmentController.php:160` |
| `Aluno desenturmado.` | Sucesso da desenturmação em lote 🟢 `BatchEnrollmentController.php:115` |
| `Matrícula cancelada.` | Sucesso do cancelamento em lote 🟢 `BatchEnrollmentController.php:248` |
| `Não foi possível cancelar a matrícula.` | Falha inesperada no cancelamento 🟢 `BatchEnrollmentController.php:254` |
| `A matrícula já está cancelada.` | Cancelamento de matrícula inativa 🟢 `app/Services/RegistrationService.php:308` |
| `Não foi possível desativar as enturmações da matrícula.` | Falha na desativação das enturmações 🟢 `RegistrationService.php:383` |
| `Não foi possível editar a "Última Matrícula da Sequência".` | Falha no reflagra da matrícula anterior 🟢 `RegistrationService.php:453` |
| `É necessário selecionar a turma de origem para o remanejamento.` | Remanejamento sem enturmação de origem 🟢 `app/Http/Controllers/EnrollmentController.php:162` |
| `Você não tem permissão para enturmar alunos.` | Falta de permissão de enturmação 🟢 `EnrollmentController.php:44` |
| `Você não tem permissão para desenturmar alunos.` | Falta de permissão de desenturmação 🟢 `EnrollmentController.php:41` |
| `Você não tem permissão para remanejar alunos.` | Falta de permissão de remanejamento 🟢 `EnrollmentController.php:124` |
| `A turma informada não pertence às escolas do usuário.` | Acesso a turma de outra escola 🟢 `BatchEnrollmentController.php:286` |

---

## 4. Contrato da API de matrícula (legado AJAX)

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| GET | `/module/Api/Matricula?matricula` | `id` | Objeto com a matrícula e suas enturmações 🟢 `ieducar/modules/Api/Views/MatriculaController.php:282-287` |
| GET | `/module/Api/Matricula?matriculas` | filtros de aluno e escola | Lista de matrículas 🟢 `MatriculaController.php:289-297` |
| GET | `/module/Api/Matricula?matriculas-escola` | `escola`, `ano` | Lista de matrículas da escola 🟢 `MatriculaController.php:308-362` |
| GET | `/module/Api/Matricula?matricula-transferida` | `aluno` | Matrículas transferidas do aluno 🟢 `MatriculaController.php:122-171` |
| GET | `/module/Api/Matricula?movimentacao-enturmacao` | `ano`, `escola[]`, `modified` | `{ "enturmacoes": [...] }` 🟢 `MatriculaController.php:364-495` |
| GET | `/module/Api/Matricula?enturmacoes-excluidas` | `ano`, `escola` | Enturmações excluídas 🟢 `MatriculaController.php:927-961` |
| GET | `/module/Api/Matricula?busca-ativa` | `ano`, `escola` | Registros de busca ativa 🟢 `MatriculaController.php:968-1008` |
| GET | `/module/Api/Matricula?frequencia` | `id` | `{ "frequencia": 0 }` 🟢 `MatriculaController.php:497-504` |
| GET | `/module/Api/Matricula?matriculas-dependencia` | `ano`, `escola` | `{ "matriculas": [...] }` 🟢 `MatriculaController.php:801-862` |
| GET | `/module/Api/Matricula?dispensa-disciplina` | `matricula_id` | Dispensa de disciplina da matrícula 🟢 `MatriculaController.php:864-925` |
| GET | `/module/Api/Matricula?matricula-search` | `tipo`, `valor` | Resultado da busca de matrícula 🟢 `MatriculaController.php:1020-1021` |
| POST | `/module/Api/Matricula?data-entrada` | `matricula_id`, `data_entrada` em `d/m/Y` | Mensagem de sucesso ou de erro 🟢 `MatriculaController.php:624-636` |
| POST | `/module/Api/Matricula?data-saida` | `matricula_id`, `data_saida` em `d/m/Y` | Mensagem de sucesso ou de erro 🟢 `MatriculaController.php:638-666` |
| POST | `/module/Api/Matricula?situacao` | `matricula_id`, `nova_situacao` | Mensagem de sucesso 🟢 `MatriculaController.php:668-754` |
| DELETE | `/module/Api/Matricula?abandono` | `id` | Mensagem de sucesso 🟢 `MatriculaController.php:520-585` |
| DELETE | `/module/Api/Matricula?reclassificacao` | `id` | `{ "aluno_id": 123 }` 🟢 `MatriculaController.php:587-603` |
| DELETE | `/module/Api/Matricula?saidaEscola` | `id` | Mensagem de sucesso 🟢 `MatriculaController.php:506-518` |

### Atributos da linha de movimentação de enturmação 🟢 `MatriculaController.php:475-491`

| Campo | Tipo | Significado |
|-------|------|-------------|
| `id` | inteiro | Identificador da enturmação |
| `matricula_id` | inteiro | Matrícula da enturmação |
| `turma_id` | inteiro | Turma da enturmação |
| `sequencial` | inteiro | Sequencial de cadastro da enturmação |
| `sequencial_fechamento` | inteiro | Posição de chamada na ordem de fechamento |
| `remanejado_mesma_turma` | booleano | Indica remanejamento para a mesma turma |
| `data_entrada` | data | Data de enturmação |
| `data_saida` | data | Data de exclusão, ou de cancelamento da matrícula |
| `apresentar_fora_da_data` | booleano | Indica apresentação posterior à data base da instituição |
| `turno_id` | inteiro | Turno da enturmação |
| `serie_id` | inteiro | Série da matrícula |
| `updated_at` | data e hora | Instante da última alteração |
| `deleted_at` | data e hora | Instante da exclusão lógica |

---

## 5. Contrato de atualização dos dados de Censo da enturmação

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| POST | `/enrollment-inep/{enrollment}` | `carga_horaria_integralizada`, `matricula_inep`, `desconsiderar_educacenso` | Redirecionamento para `enrollments.enrollment-history` | 🟢 `app/Http/Controllers/EnrollmentInepController.php:25-46` |

| Campo | Regra de gravação | Fonte |
|-------|-------------------|-------|
| `carga_horaria_integralizada` | Gravado apenas quando a turma permite carga integralizada e o valor é numérico entre 0 e 9999; caso contrário, gravado como nulo | `EnrollmentInepController.php:28-33` |
| `desconsiderar_educacenso` | Gravado como booleano conforme a presença do campo na requisição | `EnrollmentInepController.php:39` |
| `matricula_inep` | Gravado na tabela de matrícula INEP apenas quando o valor é numérico; caso contrário, gravado como nulo | `EnrollmentInepController.php:41-45` |

---

## 6. Contrato de domínio das situações da matrícula

| Valor | Situação | Rótulo na matrícula | Rótulo na enturmação | Final | Inativa |
|-------|----------|--------------------|----------------------|-------|---------|
| 1 | Aprovado | Aprovado | Aprovado | Sim | Não |
| 2 | Retido | Retido | Reprovado | Sim | Não |
| 3 | Cursando | Cursando | Cursando | Não | Não |
| 4 | Transferido | Transferido | Transferido | Não | Sim |
| 5 | Reclassificado | Reclassificado | Reclassificado | Não | Não |
| 6 | Deixou de Frequentar | Deixou de Frequentar | Deixou de Frequentar | Não | Sim |
| 7 | Em exame | Em exame | Em exame | Não | Não |
| 8 | Aprovado após exame | Aprovado após exame | Aprovado após exame | Sim | Não |
| 10 | Aprovado sem exame | Aprovado sem exame | Aprovado sem exame | Não | Não |
| 11 | Pré-matrícula | Pré-matrícula | Pré-matrícula | Não | Não |
| 12 | Aprovado com dependência | Aprovado com dependência | Aprovado com dependência | Sim | Não |
| 13 | Aprovado pelo conselho | Aprovado pelo conselho | Aprovado pelo conselho | Sim | Não |
| 14 | Reprovado por faltas | Reprovado por faltas | Reprovado por faltas | Sim | Não |
| 15 | Falecido | Falecido | Falecido | Não | Sim |

Fonte: `app/Models/RegistrationStatus.php:8-71` e `app/Models/RegistrationStatus.php:73-90`. A divergência de rótulo no valor 2 é intencional no legado: a matrícula usa Retido e a enturmação usa Reprovado. 🟢

---

## 7. Contrato dos parâmetros institucionais

| Parâmetro | Formato | Uso | Fonte |
|-----------|---------|-----|-------|
| `data_base_remanejamento` | mês e dia | Data base do remanejamento, composta com o ano da enturmação | 🟢 `app/Services/RelocationDate/RelocationDateService.php:16-35` |
| `data_base_transferencia` | data | Data base da transferência, comparada com a data de exclusão da enturmação | 🟢 `ieducar/modules/Api/Views/MatriculaController.php:400-409` |
| `data_fechamento` | mês e dia | Data de fechamento da instituição, que define o corte da ordenação de chamada | 🟢 `ieducar/intranet/include/services/matricula/SequencialEnturmacao.php:305-319` |
| `allow_registration_out_academic_year` | booleano | Autoriza enturmação e cancelamento fora do ano letivo | 🟢 `app/Services/EnrollmentService.php:136` e `:198` |
| `is_mandatory_censo_fields` | booleano | Exige os campos obrigatórios do Censo Escolar, o que ativa a verificação de conflito de horário | 🟢 `app/Services/EnrollmentService.php:219` |
| `bloquear_enturmacao_sem_vagas` | booleano | Bloqueia a enturmação quando a turma não tem vaga | 🟢 `app/Services/EnrollmentService.php:193` |

---

## 8. Contrato planejado para o modelo novo

Endpoints previstos em `_reversa_sdd/Enrollments/legacy-mapping.md`, seção 5, a derivar do contrato legado acima:

| Método | Caminho | Deriva de |
|--------|---------|-----------|
| GET | `/api/v1/educa/registrations` | listagem de matrículas 🟢 `ieducar/modules/Api/Views/MatriculaController.php:289-362` |
| POST | `/api/v1/educa/registrations` | criação de matrícula 🟢 `app/Services/RegistrationService.php:86-131` |
| GET | `/api/v1/educa/registrations/{id}` | detalhe da matrícula e histórico de enturmações 🟢 `app/Http/Controllers/EnrollmentHistoryController.php:14-26` |
| PUT | `/api/v1/educa/registrations/{id}/status` | alteração da situação 🟢 `MatriculaController.php:668-754` |
| POST | `/api/v1/educa/registrations/{id}/cancel` | cancelamento da matrícula 🟢 `app/Services/RegistrationService.php:305-326` |
| POST | `/api/v1/educa/enrollments` | enturmação 🟢 `app/Services/EnrollmentService.php:187-246` |
| DELETE | `/api/v1/educa/enrollments/{id}` | desenturmação 🟢 `EnrollmentService.php:131-177` |
| POST | `/api/v1/educa/enrollments/{id}/relocate` | remanejamento 🟢 `app/Http/Controllers/EnrollmentController.php:146-199` |
| POST | `/api/v1/educa/enrollments/school-classes/{classId}/reorder` | reordenação da chamada 🟢 `EnrollmentService.php:374-392` |
| POST | `/api/v1/educa/registrations/batch/enroll` | enturmação em lote 🟢 `app/Http/Controllers/BatchEnrollmentController.php:143-174` |
| POST | `/api/v1/educa/registrations/batch/cancel` | cancelamento de matrícula em lote 🟢 `BatchEnrollmentController.php:221-270` |
| POST | `/api/v1/educa/transfers/requests` | solicitação de transferência 🟢 `app/Services/RegistrationService.php:184-195` |
| POST | `/api/v1/educa/transfers/requests/{id}/accept` | aceitação da transferência com portabilidade de notas, ausente no legado 🔴 |
| POST | `/api/v1/educa/registrations/{id}/reclassify` | registro da reclassificação 🟢 `ieducar/intranet/educar_matricula_reclassificar_cad.php` |
| GET | `/api/v1/educa/enrollments/movements` | movimentação de enturmação 🟢 `MatriculaController.php:364-495` |
