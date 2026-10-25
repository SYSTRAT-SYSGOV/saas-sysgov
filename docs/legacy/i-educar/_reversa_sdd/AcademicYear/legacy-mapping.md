# Mapeamento do Legado — Módulo AcademicYear

> Gerado pelo Reversa Archaeologist em 2026-10-12

---

## 1. Arquivos Principais e Linhas Chave

| Arquivo Legado | Responsabilidade | Linhas Relevantes |
|---|---|---|
| [`app/Services/AcademicYearService.php`](file:///d:/SYSTRAT/I-Educar/app/Services/AcademicYearService.php) | Camada de serviço, regras de negócio, ciclo de vida e cópia de dados | L1-L1443 |
| [`app/Models/LegacySchoolAcademicYear.php`](file:///d:/SYSTRAT/I-Educar/app/Models/LegacySchoolAcademicYear.php) | Eloquent Model da tabela `pmieducar.escola_ano_letivo` | L1-L120 |
| [`app/Models/LegacyAcademicYearStage.php`](file:///d:/SYSTRAT/I-Educar/app/Models/LegacyAcademicYearStage.php) | Eloquent Model de etapas (`pmieducar.escola_ano_letivo_modulo`) | L1-L95 |
| [`app/Models/LegacySchoolYearLock.php`](file:///d:/SYSTRAT/I-Educar/app/Models/LegacySchoolYearLock.php) | Eloquent Model de travamentos (`pmieducar.escola_ano_letivo_travamento`) | L1-L70 |
| [`app/Http/Controllers/Api/Resource/SchoolAcademicYear/ResourceSchoolAcademicYearController.php`](file:///d:/SYSTRAT/I-Educar/app/Http/Controllers/Api/Resource/SchoolAcademicYear/ResourceSchoolAcademicYearController.php) | Controlador REST da API de Ano Letivo | L1-L210 |
| [`ieducar/intranet/educar_ano_letivo_modulo_cad.php`](file:///d:/SYSTRAT/I-Educar/ieducar/intranet/educar_ano_letivo_modulo_cad.php) | Tela procedural legada de cadastro de etapas e módulos | L1-L350 |

---

## 2. Pontos Críticos para Reconstrução no SYSGOV

1. **Abstração do Array PostgreSQL (`smallint[]`):**
   - No legado: Uso de colunas `anos_letivos::smallint[]` nas tabelas `pmieducar.escola_curso`, `pmieducar.escola_serie`, etc.
   - Para o SaaS **SYSGOV**: Deve ser normalizado para uma tabela associativa relacional pura (ex: `school_course_academic_years`) ou JSONB indexado, garantindo portabilidade entre SGBDs e suporte multi-tenant sem depender de particularidades de arrays legados do Postgres.
2. **Bloqueio de Fechamento com Matrículas Ativas:**
   - Regra estrita: Nenhuma escola pode fechar o ano letivo se houver qualquer aluno sem situação final definida (aprovado, reprovado, transferido). Essa regra deve ser preservada rigorosamente na arquitetura do SYSGOV.
3. **Mecanismo de Travamento de Etapas para Diário:**
   - O professor só pode alterar notas da etapa até a data de travamento configurada na escola (`LegacySchoolYearLock`).
