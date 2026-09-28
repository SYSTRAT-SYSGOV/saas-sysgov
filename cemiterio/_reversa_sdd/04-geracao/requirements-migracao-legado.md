# Requirements: migração legada idempotente de necrópoles

> Identificador: `001-migracao-legado`
> Data: `2026-09-24`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

O sistema deve disponibilizar um comando CLI de migração para importar os acervos DBF/CSV dos cemitérios Central e Independência para o modelo relacional multi-tenant do SYSGOV. A carga deve ser idempotente, transacional, isolada por tenant, executável em modo de simulação e capaz de preservar a localização histórica, os dados do falecido, a inumação e a equipe operacional.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|---|---|---|
| `_reversa_sdd/01-reconhecimento/modelo-dados.md#tabelas-principais` | `DADOS`, `LOTES`, `RESPONSA` e `FALECIDO` formam o núcleo operacional | 🟢 |
| `_reversa_sdd/01-reconhecimento/scripts-analise.md#import_csv_to_db-py` | O importador atual já usa batch, cache e upsert, mas não possui dry-run nem isolamento transacional por tenant | 🟢 |
| `_reversa_sdd/02-escavacao/modulos-detalhados.md#modulo-4-equipe-operacional` | `COD_FUNCQ` e `COD_PEDQ` devem resolver coveiro e pedreiro históricos | 🟢 |
| `_reversa_sdd/03-interpretacao/regras-negocio.md#rn004-isolamento-por-cemiterio-multi-tenancy` | Central e Independência são tenants lógicos separados | 🟢 |
| Spec `cemiterio/migracao-legado` | Exige Artisan `cemiterios:migrar-clipper`, `--dry-run`, LGPD, lotes transacionais e recálculo de ocupação | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---|---|---|
| Administrador de migração | Executar carga inicial ou repetição segura | Seleciona tenant, necrópole, fonte e modo definitivo ou simulação |
| Operador de validação | Conferir integridade antes da persistência | Executa dry-run e analisa contagens, órfãos e inconsistências |
| Auditor/LGPD | Verificar tratamento de dados pessoais | Confere máscara/criptografia de CPF, RG, endereço e contatos |
| Equipe operacional | Preservar histórico de campo | Confere vínculo de coveiro e pedreiro em cada inumação histórica |

## 4. Regras de negócio novas ou alteradas

1. **RN-M01:** A migração deve ser idempotente por chave natural composta de tenant, cemitério legado, quadra, lote e item. 🟢
   - Tipo: nova.
2. **RN-M02:** O modo `--dry-run` não pode abrir transações de escrita nem alterar dados no banco de destino. 🟢
   - Tipo: nova.
3. **RN-M03:** A carga definitiva deve persistir em lotes transacionais; falha em um lote deve fazer rollback do lote sem contaminar lotes anteriores já confirmados. 🟡
   - Tipo: nova.
4. **RN-M04:** Cada execução deve ser isolada por tenant/necrópole; chaves e filtros de origem, quadra, lote e item. 🟢
   - Origem no legado: `_reversa_sdd/03-interpretacao/regras-negocio.md#rn004-isolamento-por-cemiterio`
5. 🟢
6. **RN-M05:** Campos sensíveis devem ser mascarar/criptografar dados sensíveis devem ser mascarar/criptografar dados sensíveis. 🟢
   - Tipo: nova.
7. **RN-M07:** Após a carga, o estado físico e a ocupação de cada jazigo devem ser recalculados a partir dos sepultamentos históricos importados. 🟢
   - Tipo: nova.
8. **RN-M08:** Registros com chave estrangeira, quadra, lote e item devem ser preservados como dados históricos e não como cadastros operacionais correntes. 🟡
9. **RN-M09:** Registros de falecidos e responsáveis devem ser mascarar/criptografar dados sensíveis devem ser mascarar/criptografar/criptografar/criptografar/criptografar/criptografar dados sensíveis. 🟢
   - Tipo: nova.
10. **RN-M10:** A equipe operacional deve ser vinculada por códigos legados válidos; códigos ausentes ou inválidos devem gerar relatório de exceção sem violar FK. 🟢
    - Tipo: nova.

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|---|---|---|---|---|
| RF-01 | Disponibilizar comando Artisan `cemiterios:migrar-clipper`. | Must | `php artisan list` exibe o comando e `--help` documenta opções. | 🟢 |
| RF-02 | Aceitar tenant/necrópole de destino e caminho da fonte. | Must | Execução com tenant Central ou Independência processa apenas a fonte selecionada. | 🟢 |
| RF-03 | Implementar `--dry-run. | Must | Relatório final sem INSERT/UPDATE/DELETE no banco. | 🟢
| RF-04 | Validar integridade de dados sensíveis. | Must | CPF, RG, endereço, telefone e celular não são persistidos em claro; política configurável e auditável. | 🟢 |
| RF-05 | Processar setores, quadras, jazigos, concessionários, concessões, falecidos e sepultamentos na ordem correta. | Must | Todas as entidades são carregadas respeitando dependências e FKs. | 🟢 |
| RF-06 | Mapear `DADOS.csv` e `FALECIDO.csv` para `deceased_records` e `cemetery_burials`. | Must | Cada registro válido possui registro correspondente e rastreabilidade do legado. | 🟢 |
| RF-07 | Preservar gaveta, data de sepultamento, certidão, médico, cartório, coveiro e pedreiro. | Must | Campos históricos estão disponíveis na inumação e no falecido. | 🟢 |
| RF-08 | Recalcular ocupação e estado físico dos jazigos. | Must | Contagem de ocupação e estado final são consistentes com sepultamentos ativos. | 🟢 |
| RF-09 | Emitir relatório de execução com contagens, erros, órfãos e duplicidades. | Must | Relatório contém totais por entidade, falhas e resumo de idempotência. | 🟢 |
| RF-10 | Tratar registros duplicados, órfãos e códigos operacionais desconhecidos sem abortar inadvertidamente. | Should | Exceções são registradas e continuam ou falham conforme política configurada. | 🟡 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|---|---|---|---|
| Segurança | Aplicar LGPD a dados pessoais sensíveis. | Spec e dados `RESPONSA`/`DADOS` contêm CPF, RG, endereço e contatos. | 🟢 |
| Confiabilidade | Idempotência e rollback por lote. | Reexecução não pode duplicar nem deixar carga parcial inconsistente. | 🟢 |
| Desempenho | Processar grandes arquivos em lotes. | `DADOS.csv` possui 21.857 registros consolidados; lotes configuráveis. | 🟢 |
| Observabilidade | Log estruturado e relatório final. | Necessário para auditoria de migração e correção de exceções. | 🟡 |
| Isolamento | Separar tenants e necrópoles. | Modelo multi-tenant e duas bases legadas físicas. | 🟢 |
| Recuperação | Permitir retomada após falha. | Lotes transacionais e estado de execução rastreável. | 🟡 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Execução em modo de simulação
  Dado que existem arquivos legados válidos para um tenant
  Quando o administrador executa "cemiterios:migrar-clipper --dry-run"
  Então o sistema analisa integridade, valida chaves estrangeiras e emite relatório
   E não grava dados no banco de dados

Cenário: Execução definitiva idempotente
  Dado que uma primeira carga foi concluída
  Quando o administrador executa novamente o comando para o mesmo tenant
  Então nenhum registro é duplicado e as entidades existentes são reconciliadas

Cenário: Sepultamento histórico com equipe operacional
  Dado um falecido com códigos de coveiro e pedreiro válidos
  Quando a inumação histórica é persistida
  Então a inumação referencia os nomes correspondentes sem violar chave estrangeira

Cenário: Falha em lote
  Dado um lote com um registro inválido
  Quando a carga definitiva encontra a inconsistência
  Então o lote sofre rollback e o relatório registra a causa sem corromper lotes anteriores

Cenário: Proteção LGPD
  Dado um responsável com CPF, RG, endereço e telefone
  Quando a carga é persistida
  Então os campos sensíveis são mascarados ou criptografados conforme a política ativa
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|---|---|---|
| RF-01 a RF-09 | Must | Compõem o contrato mínimo de migração segura e auditável |
| RF-10 | Should | Melhora resiliência, mas pode ser tratado por política de falha |
| RNF de segurança | Must | Exigência legal e explícita do spec |
| RNF de observabilidade | Should | Necessário para operação, mas não altera o resultado funcional |

## 9. Esclarecimentos

> Nenhuma sessão de dúvidas registrada ainda. Rode `/reversa-clarify.

## 10. Lacunas

- 🔴 [DÚVIDA] O destino SYSGOV já possui as tabelas `deceased_records` e `cemetery_burials`, ou elas precisam ser criadas por migração de schema?
- 🔴 [DÚVIDA] Qual algoritmo de criptografia/mascaramento e política de retenção devem ser usados para CPF, RG, endereço e contatos?
- 🔴 [DÚVIDA] Como devem ser tratadas as inconsistências de capacidade encontradas nos dados legados (por exemplo, lotes e item.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|---|---|---|
| 2026-09-24 | Versão inicial baseada no spec e na extração reversa | reversa |
