# Tasks

## 1. Vínculo do aluno com a pessoa (backend)

- [x] 1.1 `AlunoPessoaService`: aluno sem CPF passa a criar pessoa com documento pendente (`resolverSemDocumento`), com responsável para menor e sugestão de pessoa semelhante antes de criar; informar o CPF depois regulariza a mesma pessoa (`pessoa_id` preservado). Verificar: `AlunoPessoaTest` (cadastro sem CPF, menor sem responsável, semelhante com `confirmar_novo`, regularização, edição de nascimento gravada na pessoa).
- [x] 1.2 `SalvarAlunoRequest`/`AlunoService`: aceitar `responsavel_id` e `confirmar_novo`; edição de aluno legado sem pessoa e sem responsável informado não é bloqueada (segue sem pessoa até a conciliação). Verificar: `AlunoTest` e `CalendarioAuditoriaTest` (remanejamento e troca de turma).
- [x] 1.3 Importação CSV: linha sem CPF coincidente com pessoa existente não é gravada e vem em `possiveis_duplicidades` (reenvio com `confirmar_duplicidades`); aluno sem nascimento ou responsável é gravado sem pessoa e vem em `sem_pessoa`. Verificar: `test_csv_sem_cpf_lista_possivel_duplicidade_e_aluno_sem_pessoa`.

## 2. Conciliação dos alunos existentes

- [x] 2.1 Adaptador `ConciliacaoAlunos` registrado no `ConciliacaoRegistry` (`pessoas:conciliar escola`). Verificar: `ConciliacaoAlunosTest` (dry-run não grava, reexecução idempotente, divergência sem sobrescrever a pessoa).

## 3. Frontend

- [x] 3.1 Formulário do aluno: escolher o responsável (busca no cadastro de pessoas) quando não há CPF, exibir a pessoa semelhante com "cadastrar mesmo assim". Verificar: `AlunoFormModal.test.tsx`.
- [x] 3.2 Importação CSV: listar possíveis duplicidades com confirmação e avisar os alunos sem pessoa. Verificar: `tsc --noEmit` limpo e suíte do web-client.

## 4. Validação

- [x] 4.1 Suítes do backend (Escola, Pessoas, Pedagógico, Passeio, Portfolio, Formatura), PHPStan e web-client verdes.
- [ ] 4.2 Dry-run em produção (`pessoas:conciliar escola --dry-run`) depois do deploy da Fase 0 e desta fase; decidir o destino dos alunos de demonstração que saem como `sem_responsavel`.
- [ ] 4.3 Validação manual em homologação (cadastro sem CPF com responsável, regularização, importação CSV) e conferência visual do formulário conforme DESIGN_SYSTEM.
