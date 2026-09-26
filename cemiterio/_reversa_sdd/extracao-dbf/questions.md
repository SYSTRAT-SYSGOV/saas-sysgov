# Extração DBF, Perguntas Pendentes

> Lacunas 🔴 que requerem validação humana antes de considerar esta unit totalmente especificada.

## Q1 — Por que a tentativa via OLEDB foi abandonada?
`read_dbf.ps1` implementa uma leitura alternativa de `.DBF` via `Microsoft.Jet.OLEDB.4.0`, mas não é usada no fluxo de produção (`export_all_dbfs.py` é quem roda de fato). O motivo do abandono não está documentado em nenhum artefato disponível.

**Por que importa:** se o motivo for uma limitação de ambiente (driver 32-bit indisponível em runtime 64-bit), isso é permanente e não deve ser reconsiderado. Se for só uma preferência de implementação, pode haver razão para reavaliar em outro ambiente.

**Quem pode responder:** quem escreveu ou decidiu abandonar `read_dbf.ps1` originalmente.

## Q2 — Vale a pena corrigir o `print()`/`logging` para recuperar dados reais de coveiro/pedreiro?
Hoje a extração falha silenciosamente (via `UnicodeEncodeError`) para `FUNCIONA.DBF`/`PEDREIRO.DBF`/tabelas de sequência/`PRINTERS.DBF`, e o importador usa uma lista hardcoded como consequência. Os dados reais são recuperáveis lendo os bytes brutos diretamente (confirmado em `code-analysis.md`).

**Por que importa:** corrigir isso muda o comportamento de produção — os nomes reais de funcionários/pedreiros substituiriam o hardcode atual, e isso pode impactar relatórios/históricos já gerados com os dados placeholder.

**Quem pode responder:** dono do produto/operação dos cemitérios, que sabe se os nomes reais de coveiros/pedreiros são relevantes para o sistema novo.
