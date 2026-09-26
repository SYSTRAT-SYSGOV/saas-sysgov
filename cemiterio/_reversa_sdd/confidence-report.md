# Relatório de Confiança — cemiterio

> Gerado pelo Revisor em 2026-09-24. Revisão cruzada via Codex não disponível nesta sessão (plugin não conectado) — revisão feita apenas por este agente. Contagens excluem `_reversa_sdd/01-reconhecimento/`, `02-escavacao/`, `03-interpretacao/`, `04-geracao/`, `05-revisao/`, artefatos de uma sessão concorrente identificada durante a revisão (ver seção "Observação de Sessão Concorrente" abaixo).

---

## Resumo Geral

| Nível | Quantidade | Percentual |
|-------|-----------|------------|
| 🟢 CONFIRMADO | 120 | 41.1% |
| 🟡 INFERIDO   | 65  | 22.3% |
| 🔴 LACUNA     | 107 | 36.6% |
| **Total**     | 292 | 100% |

**Confiança geral:** 52.2% (soma de 🟢 + metade dos 🟡)

O percentual de 🔴 é alto porque este é um sistema legado real com lacunas genuínas (dados corrompidos na origem, decisões de negócio não documentadas, achados de segurança sem correção implementada) — a regra de ouro do framework ("quando houver dúvida, use o nível mais baixo") foi aplicada rigorosamente em vez de suavizar a incerteza.

---

## Por Spec

| Spec | 🟢 | 🟡 | 🔴 | Confiança |
|------|----|----|-----|-----------|
| `extracao-dbf/` | 14 | 4 | 6 | 67% |
| `schema-destino/` | 15 | 5 | 4 | 73% |
| `importacao-csv/` | 10 | 9 | 13 | 45% |
| `legado-cemiterio-central/` | 5 | 1 | 13 | 29% |
| `legado-cemiterio-independencia/` | 7 | 2 | 7 | 50% |
| `seguranca-usuarios-permissoes/` | 4 | 2 | 13 | 26% |
| Descoberta (`inventory.md`, `dependencies.md`, `code-analysis.md`, `data-dictionary.md`) | 20 | 10 | 15 | 56% |
| Domínio, Arquitetura e Globais (`domain.md`, `state-machines.md`, `permissions.md`, `adrs/`, `architecture.md`, `c4-*.md`, `erd-complete.md`, `traceability/`, `user-stories/`) | 45 | 32 | 36 | 54% |

**Leitura:** `seguranca-usuarios-permissoes` e `legado-cemiterio-central` têm a menor confiança — ambas concentram achados críticos de segurança e dados genuinamente corrompidos/perdidos na origem, não falhas de análise.

---

## Lacunas Pendentes 🔴

Ver `questions.md` para as 10 perguntas consolidadas que requerem validação humana. Resumo por severidade:

### Crítico (bloqueia decisão de arquitetura ou produção)
- Identidade entre cemitérios (Pergunta 1) — bloqueia ADR 0004, `importacao-csv` T-08/T-09, `seguranca-usuarios-permissoes` T-02
- Política de migração de senha (Pergunta 3) — bloqueia produção segura
- Mapeamento de `PW_PERMIS` (Pergunta 2) — risco de permissão incorreta

### Moderado (afeta qualidade do dado migrado, não bloqueia arquitetura)
- Correção do hardcode de coveiro/pedreiro (Pergunta 5)
- Dados corrompidos de `PEDREIRO.DBF` do Central (Pergunta 7)
- Propósito de `FALECIDO.DBF` (Pergunta 6)
- Assimetria `OBA`/`TTT` só em Independência (Pergunta 9)

### Cosmético/investigativo (não bloqueia nada)
- Motivo do abandono do OLEDB (Pergunta 4)
- Backups `.ARJ` do Central (Pergunta 8)
- Reconciliação `OBA`↔`lote` (Pergunta 10) — pode ser respondida por consulta técnica, não exige stakeholder humano

---

## Recomendações

- [ ] **Segurança:** priorizar resposta às Perguntas 1, 2 e 3 antes de qualquer deploy em produção — envolvem exposição de senha e controle de acesso.
- [ ] **`importacao-csv`:** menor confiança entre as units de código (45%) — concentra os dois achados críticos (hardcode incorreto, hash de senha) e vários gaps técnicos (idempotência, `O(n²)`).
- [ ] **`legado-cemiterio-central`/`seguranca-usuarios-permissoes`:** confiança abaixo de 30% — não é um problema de qualidade da extração, é reflexo de dado genuinamente corrompido/perdido na origem e de uma incompatibilidade de modelagem (ADR 0004) que precisa de decisão humana antes de prosseguir.
- [ ] Pergunta 10 pode ser respondida agora mesmo por uma consulta nos CSVs já extraídos (`OBA.csv` vs `LOTES.csv`), sem esperar por um stakeholder — considerar rodar essa validação técnica separadamente.

---

## Histórico de Reclassificações

| De | Para | Item | Evidência |
|----|------|------|-----------|
| — | — | Nenhuma reclassificação de confiança (🟢↔🟡↔🔴) foi necessária nesta revisão — as specs já foram geradas com a confiança correta desde a origem, verificada nesta passada. | — |
| Inconsistência corrigida | — | `traceability/code-spec-matrix.md`, linha `requirements.txt`: coluna "unit" e coluna "cobertura" estavam contraditórias (`n/a` + `🟢` juntos) | Corrigido para deixar claro que é coberto por `dependencies.md`, um documento transversal, não uma unit |

---

## Validação das Matrizes

- **`code-spec-matrix.md`:** completa — todos os arquivos de código/dados do kit de migração mapeados a alguma unit ou documento transversal. Únicas lacunas reais de cobertura: backups `.ARJ` (não analisados) e `CONTROLE.EXE` (binário não presente no projeto).
- **`spec-impact-matrix.md`:** reflete as dependências reais observadas no código (FKs entre tabelas, componentes do importador) — sem contradição encontrada com as units geradas depois dela.
- **Units vs. `surface.json.organization_suggestion.features`:** as 6 features sugeridas pelo Scout foram todas geradas como units. Nenhuma unit faltando.

---

## Observação de Sessão Concorrente

Durante esta revisão, foram encontradas as pastas `_reversa_sdd/01-reconhecimento/`, `02-escavacao/`, `03-interpretacao/`, `04-geracao/` e `05-revisao/`, com uma extração completa alternativa na estrutura antiga de pastas numeradas (não a `feature-folder` configurada em `.reversa/config.toml` para este projeto). O usuário confirmou que se trata de outra sessão sua rodando o Reversa neste mesmo projeto, concorrentemente a esta. Este relatório de confiança cobre **apenas** a linha de trabalho desta sessão (`extracao-dbf/`, `schema-destino/`, `importacao-csv/`, `legado-cemiterio-central/`, `legado-cemiterio-independencia/`, `seguranca-usuarios-permissoes/` + documentos transversais na raiz de `_reversa_sdd/`). As pastas numeradas não foram lidas, alteradas ou usadas como fonte nesta revisão. Recomenda-se, antes de considerar o projeto "pronto", reconciliar manualmente as duas linhas de extração (ou descartar uma delas) para evitar specs divergentes convivendo no mesmo `_reversa_sdd/`.
