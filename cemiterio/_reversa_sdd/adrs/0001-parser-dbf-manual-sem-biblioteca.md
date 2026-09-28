# ADR 0001 — Parser DBF manual, sem biblioteca externa

**Status:** Aceito (implementado) 🟢
**Contexto:** Retroativo — reconstruído a partir de código, sem histórico Git disponível.

## Decisão
A extração dos arquivos `.DBF` (dBase III/IV) é feita por um parser binário escrito à mão (`export_all_dbfs.py`), lendo header, descritores de campo e registros byte a byte, sem depender de uma biblioteca de terceiros para o formato DBF (não há entrada correspondente em `requirements.txt`).

## Evidência
- `read_dbf_full()` implementa manualmente a leitura do header (32 bytes), descritores de campo (blocos de 32 bytes) e registros, incluindo tratamento explícito do byte de exclusão física (`0x2A`).
- Existe uma tentativa alternativa via driver OLEDB (`read_dbf.ps1`, `Microsoft.Jet.OLEDB.4.0`), abandonada em favor do parser Python.

## Motivação inferida
🟡 Prováveis motivos (não confirmados por documentação): o driver Jet/OLEDB é 32-bit e pode não estar disponível em ambientes 64-bit modernos; um parser custom dá controle total sobre encoding (`cp850`) e casos especiais (datas `'1111-11-11'`, flags de exclusão) sem depender de comportamento de biblioteca externa.

## Consequência observada
Duas implementações divergentes do mesmo parser coexistem no projeto (`export_all_dbfs.py` para produção, `extract_data.py` para amostragem) com formatação de data diferente — risco de inconsistência entre scripts se um for atualizado sem o outro.
