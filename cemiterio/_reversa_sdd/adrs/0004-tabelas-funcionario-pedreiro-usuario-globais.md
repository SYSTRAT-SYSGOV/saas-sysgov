# ADR 0004 — Funcionario, pedreiro e usuario modelados como tabelas globais (sem isolamento por cemitério)

**Status:** Aceito (implementado), porém identificado como incompatibilidade de modelagem 🔴
**Contexto:** Retroativo — reconstruído a partir de código, sem histórico Git disponível.

## Decisão
No schema alvo (`postgresql_schema.sql`/`mysql_schema.sql`), as tabelas `funcionario`, `pedreiro`, `usuario` e `usuario_grupo` não têm coluna `cemiterio_id` — são tratadas como um domínio único e compartilhado entre os dois cemitérios.

## Evidência
- `import_funcionarios`/`import_pedreiros`/`import_usuarios`/`import_grupos_usuarios` são chamados uma única vez (fora do loop por cemitério) em `run_full_import()`, diferente de `import_quadras`/`import_lotes`/`import_falecidos`/`import_responsaveis`, que rodam por cemitério.
- No legado, porém, `FUNCIONA.DBF`, `PEDREIRO.DBF` e `PWUSUA.DBF` existem **separadamente dentro de cada pasta de cemitério**, com numeração de código própria e não coincidente (confirmado por leitura direta dos bytes: código `4` no Central é uma pessoa diferente do código `4`, se existisse, em Independência).

## Motivação inferida
🟡 Provável simplificação inicial de modelagem, talvez assumindo (incorretamente) que coveiros/pedreiros/usuários seriam os mesmos indivíduos compartilhados entre as duas unidades, ou que o volume pequeno (poucos registros por cemitério) não justificaria replicar a dimensão `cemiterio_id` nessas tabelas.

## Consequência observada
Isso é uma incompatibilidade real entre o modelo de dados do legado (identidade por cemitério) e o modelo alvo (identidade global), não apenas uma simplificação cosmética:
- Hoje está mascarada porque o importador usa uma lista hardcoded incorreta de funcionários/pedreiros (ver `domain.md` RN012), então a colisão de código nunca chegou a se manifestar nos dados carregados.
- Ao corrigir o hardcode (ler os dados reais do DBF), a colisão de código entre unidades se tornará um problema de integridade referencial ativo: `coveiro_id`/`pedreiro_id` de um sepultamento pode apontar para a pessoa errada.
- O mesmo problema estrutural afeta `usuario`/`usuario_grupo` (ver `permissions.md`, SEC-003).

## Ação recomendada
Antes de corrigir a lista hardcoded de funcionários/pedreiros (RN012), decidir e implementar uma de duas estratégias: (a) adicionar `cemiterio_id` a `funcionario`/`pedreiro`/`usuario`/`usuario_grupo` e tornar a PK composta por cemitério, preservando o isolamento do legado; ou (b) confirmar com o usuário que a unificação é intencional e definir uma regra de deduplicação/merge explícita para códigos coincidentes.
