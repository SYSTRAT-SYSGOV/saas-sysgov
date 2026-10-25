# Mapeamento do Legado: Cadastro Geral (`Cadastro`)

> Este módulo integra o domínio de Pessoas, Servidores e Unificação.
> O documento completo de especificações e mapeamento de engenharia reversa encontra-se em:
> [`_reversa_sdd/People/legacy-mapping.md`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/People/legacy-mapping.md)
> E o fluxo visual em:
> [`_reversa_sdd/flowcharts/people_students.md`](file:///d:/SYSTRAT/I-Educar/_reversa_sdd/flowcharts/people_students.md)

## Resumo da Fronteira com SYSGOV Core

- `cadastro.pessoa`, `cadastro.fisica`, `cadastro.documento` -> `App\Models\Person` (SYSGOV Core compartilhado).
- `cadastro.fisica_deficiencia` -> `educa_student_special_needs` (extensão escolar com laudos e AEE).
- `pmieducar.aluno` -> `educa_students` (extensão do aluno no módulo SYS-Educa).
