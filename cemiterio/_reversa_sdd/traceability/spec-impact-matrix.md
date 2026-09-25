# Spec Impact Matrix

> Gerado pelo Arquiteto em 2026-09-24. Mapeia qual componente do kit de migração impacta quais tabelas/specs, para orientar o Redator e futuras mudanças de código.

| Componente | Impacta (tabelas/artefatos) | Impacta (specs) | Risco de mudança |
|---|---|---|---|
| `export_all_dbfs.py` (`read_dbf_full`) | Todos os CSVs em `exported_data/` | `domain.md` (RN006 datas especiais), `data-dictionary.md` | 🔴 Alto — qualquer mudança na conversão de tipo/encoding afeta todas as 13 tabelas a jusante |
| `export_all_dbfs.py` (encoding/print console) | Existência dos CSVs de `FUNCIONA`/`PEDREIRO`/tabelas de sequência | RN012 (`domain.md`), ADR 0004 | 🔴 Alto — corrigir o `print()`/`logging` destrava dados reais de coveiro/pedreiro, invalidando o hardcode atual |
| `import_csv_to_db.py` (`import_cemiterios`...`import_permissoes`) | `cemiterio`, `tipo_lote`, `funcionario`, `pedreiro`, `usuario_grupo`, `usuario`, `permissao` | `permissions.md`, ADR 0004 | 🟡 Médio — tabelas de referência, mudança propaga para todas as tabelas dependentes por FK |
| `import_csv_to_db.py` (`import_quadras`/`import_lotes`) | `quadra`, `lote` | `state-machines.md` (Lote/Jazigo), `erd-complete.md` | 🟡 Médio |
| `import_csv_to_db.py` (`import_falecidos`) | `falecido` | `domain.md` (RN001, RN002, RN006, RN009), `state-machines.md` (Sepultamento) | 🔴 Alto — entidade central do domínio |
| `import_csv_to_db.py` (`import_responsaveis`) | `responsavel` | `domain.md` (RN007), `state-machines.md` (Responsável) | 🟡 Médio — risco conhecido de duplicação (sem `UNIQUE`) |
| `import_csv_to_db.py` (`import_oba`/`import_historico`) | `lote_oba`, `lote_historico_validade` | `domain.md` (RN010) | 🟢 Baixo — escopo restrito a Independência |
| `postgresql_schema.sql` / `mysql_schema.sql` | Todas as 13 tabelas | `erd-complete.md`, `architecture.md` (dívidas técnicas) | 🔴 Alto — qualquer alteração de schema exige atualizar os dois DDLs em paralelo (risco de divergência, já observado — ver `code-analysis.md`) |
| `usuario.senha_hash` (lógica de hash) | `usuario` | `permissions.md` (SEC-001, SEC-002), ADR 0002 | 🔴 Alto — segurança, requer plano de migração de hash antes de produção |

## Como usar esta matriz

Ao planejar uma mudança (correção de bug, evolução, migração), localizar a linha do componente afetado e verificar todas as specs/tabelas na mesma linha antes de implementar — evita quebrar uma regra de negócio documentada em `domain.md`/`state-machines.md`/`permissions.md` sem perceber.
