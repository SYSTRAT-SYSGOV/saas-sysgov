# Legado — Cemitério Central, Perguntas Pendentes

> Lacunas 🔴 que requerem validação humana.

## Q1 — `FALECIDO.DBF` tinha algum propósito além de índice de ocupação?
Todos os campos de `FALECIDO.DBF` são subconjunto de `DADOS.DBF`, e nenhum script de importação o lê. Mas pode ter sido usado pela aplicação Clipper original para navegação rápida (cache de índice) — algo que não aparece nos scripts de migração analisados.

**Por que importa:** se confirmado que era só um índice técnico, é seguro descartá-lo definitivamente. Se tinha outro uso, pode haver comportamento a preservar no sistema novo.

**Quem pode responder:** um operador que usava o sistema Clipper original no dia a dia.

## Q2 — `PEDREIRO.DBF` códigos 2-4: existe registro em papel para reconstrução manual?
Os dados estão corrompidos no próprio arquivo DBF (não é um problema de encoding recuperável). Nomes aparecem como `'�'`, `'3324'`, `'21'`, RG com lixo tipo `'45MKMJKM1,2'`.

**Por que importa:** decide se esses 3 sepultamentos ficam com `pedreiro_id` nulo/placeholder permanentemente, ou se há como reconstruir a informação de outra fonte.

**Quem pode responder:** administração do cemitério, que pode ter registros físicos anteriores à digitalização.

## Q3 — Os backups `.ARJ` (2009-2011) em `Cemiterio Central/backup/` são relevantes para a migração?
Não foram analisados nesta extração.

**Por que importa:** podem conter dados históricos de um estado anterior do sistema, úteis para reconciliação ou auditoria — ou podem ser puramente arquivo morto sem valor.

**Quem pode responder:** dono do projeto de migração, que decide se vale investir tempo em analisar backups de mais de 10 anos.
