# Legado — Cemitério Central

> Gerado pelo Redator em 2026-09-24. Fonte: `code-analysis.md`, `data-dictionary.md`, `inventory.md`. Esta unit documenta uma **fonte de dados legada** (não um componente de código), código legado `'01'`.

## Visão Geral
Conjunto de 15 arquivos `.DBF`/`.NTX` (formato Clipper/dBase, encoding `cp850`) que armazenam todos os dados operacionais do cemitério Central: sepultamentos, responsáveis, lotes, segurança e log de erros. É uma das duas fontes de origem da migração (a outra é Independência).

## O que esses dados cobrem
- Sepultamentos e responsáveis (`DADOS.DBF`, `RESPONSA.DBF`, `FALECIDO.DBF`)
- Estrutura física (`LOTES.DBF`)
- Segurança/RBAC própria desta unidade (`PWUSUA.DBF`, `PWGRUPOS.DBF`, `PWTABELA.DBF`)
- Log de erros da aplicação Clipper (`ERROS.DBF`)
- Cadastro de coveiros/pedreiros (`FUNCIONA.DBF`, `PEDREIRO.DBF`)
- Configuração de estação de trabalho, fora do escopo de migração (`PRINTERS.DBF`)
- Backups históricos compactados em `.ARJ` (2009–2011), em `Cemiterio Central/backup/`

## Regras de Negócio
- Isolamento total dos dados de Independência — pastas separadas, sem cruzamento (RN004, `domain.md`) 🟢
- `FALECIDO.DBF` é apenas índice de ocupação `(cemitério, quadra, lote)`, não fonte de verdade de óbito (RN008) 🟢
- `PEDREIRO.DBF` do Central tem dados genuinamente corrompidos nos códigos 2–4 (nomes/RG com lixo binário) — diferente do caso de `FUNCIONA`/`PEDREIRO`, aqui a corrupção está no próprio arquivo DBF, não é um artefato da extração 🔴

## Requisitos Funcionais (características esperadas dos dados)

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Preservar a volumetria original na extração | Must | Contagens batem com `EXTRACTION_SUMMARY.txt` (6.951 falecidos, 4.332 responsáveis, 2.398 lotes) |
| RF-02 | Preservar nomes de campo reais mesmo com bytes corrompidos | Should | Ver achado de recuperação por leitura de bytes brutos em `extracao-dbf/design.md` |
| RF-03 | Identificar corretamente `PRINTERS.DBF` como fora de escopo | Must | Não migrado para o schema alvo |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Integridade de dados | 3 de 15 tabelas têm nomes de campo corrompidos ou dados corrompidos no próprio DBF | `code-analysis.md`, módulo `legado-cemiterio-central` | 🔴 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado o conjunto completo de .DBF do Central
Quando a extração é executada corretamente (após correção do print/logging, ver extracao-dbf)
Então todas as 15 tabelas geram CSV, incluindo FUNCIONA/PEDREIRO com nomes reais

Dado que PEDREIRO.DBF tem códigos 2-4 corrompidos no próprio arquivo
Quando a extração lê esses registros
Então os valores permanecem corrompidos (não é um problema de encoding recuperável, é perda de dado na origem)
```

## Prioridade (MoSCoW)
| Item | MoSCoW | Justificativa |
|---|---|---|
| Extração completa das 15 tabelas | Must | Base de toda a migração do Central |
| Recuperação de `FUNCIONA.DBF` via bytes brutos | Should | Corrige RN012, mas não é o único cemitério afetado |
| Investigar `PEDREIRO.DBF` códigos corrompidos | Could | Dado genuinamente perdido na origem, sem solução via engenharia reversa |
| Migrar backups `.ARJ` (2009-2011) | Won't (a menos que solicitado) | Fora do escopo de migração de dados operacionais atuais |

## Rastreabilidade de Código
| Arquivo | Cobertura |
|---|---|
| `Cemiterio Central/*.DBF` (15 tabelas) | 🟢 |
| `Cemiterio Central/*.NTX` (índices) | 🟡 não analisados — só o `.DBF` é lido pelo pipeline |
| `Cemiterio Central/backup/*.ARJ` | 🔴 não analisado, propósito atual desconhecido |
