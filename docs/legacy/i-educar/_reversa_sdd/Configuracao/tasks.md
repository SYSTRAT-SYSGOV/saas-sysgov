# Configuracao (i-Educar legado), Tarefas

> Tarefas de recriação do subsistema de parametrização no modelo novo, com a origem no legado e o critério de pronto de cada uma.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Pré-requisitos

- Estratégia de tenant definida (ADR-001), pois `instituicao` vira tenant e `settings` ganha isolamento. 🟢 `_reversa_sdd/adrs/001-multi-tenancy-schema-isolation.md`
- Modelo de escolas (unit `School`) para a bandeira escolar de diários encerrados. 🟢 `_reversa_sdd/School/`
- Modelo do ano letivo e do diário (units `AcademicYear` e `DiarioClasse`) para o motor de bloqueios e o consumidor de notas. 🟡
- Decisão documentada da inversão de semântica da janela do bloqueio (permitida no legado → travada no alvo). 🔴
- Decisão sobre a permanência dos parâmetros de deficiência e das regras de avaliação em suas units, fora da mantenedora. 🟡

---

## Tarefas

| ID | Tarefa | Origem no legado | Critério de pronto | Confiança |
|----|--------|------------------|--------------------|-----------|
| T-01 | Criar `educa_network_configurations` com identidade, atos oficiais, corte etário e obrigatoriedades cadastrais | `_reversa_sdd/Configuracao/legacy-mapping.md:54-103` | CRUD por tenant com a unicidade | 🟢 |
| T-02 | Mapear as datas da mantenedora: corte etário (`data_base_matricula`), fechamento de turmas (`data_fechamento`), expiração de reserva, descrição e Referência do Educacenso | `educar_instituicao_cad.php:250-297` 🟢 | Datas com os efeitos equivalentes | 🟢 |
| T-03 | Migrar as datas de deslocamento e de troca de sala como regras de apresentação de relatórios (não de bloqueio) | `educar_instituicao_cad.php:228-249` 🟢 | Semântica de apresentação preservada | 🟢 |
| T-04 | Criar `educa_calendar_locks` com operação tipada, escopo, janela de travamento e tolerância retroativa, com a **inversão declarada** da janela do legado | `_reversa_sdd/Configuracao/legacy-mapping.md:106-146` e `educar_bloqueio_ano_letivo_cad.php:70-71` 🔴 | Migração com a inversão documentada e testada | 🔴 |
| T-05 | Criar `educa_lock_exceptions` com protocolo, justificativa, validade e revogação | `_reversa_sdd/Configuracao/legacy-mapping.md:149-187` 🔴 | Concessão e revogação auditáveis | 🔴 |
| T-06 | Criar `educa_system_parameters` tipado com criptografia dos valores sensíveis | `_reversa_sdd/Configuracao/legacy-mapping.md:190-211` 🔴 | Tipos validados e `ENCRYPTED` cifrado | 🔴 |
| T-07 | Implementar o interceptor de bloqueios por operação com cache e exceções | `_reversa_sdd/Configuracao/legacy-mapping.md:241-380` | Exceção lançada e exceção de prazo aceita | 🟡 |
| T-08 | Lançar o bloqueio de notas no mesmo ponto do `DiarioApiController` (paridade do único consumidor real) | `DiarioApiController.php:54-69` 🟢 | Mesma mensagem equivalente | 🟢 |
| T-09 | Implementar os cinco tipos de operação no consumidor correto, incluindo matrícula, histórico e plano de aula (novos no legado) | `DiarioApiController.php` e busca 🔴 | Cada consumo travado | 🔴 |
| T-10 | Implementar a bandeira escolar de bloqueio de diários encerrados no modelo por escola | `DiarioApiController.php:48-52` 🔴 | Paridade da verificação | 🟢 |
| T-11 | Migrar as cerca de trinta e cinco bandeiras da mantenedora para o dicionário da mantenedora ou para as units de domínio | `educar_instituicao_cad.php:222-393` 🟢 | Cada bandeira com efeito referido | 🟢 |
| T-12 | Migrar as configurações gerais (rodapés, logomarca, redes sociais, integração com token) para o modelo por tenant, com cifração do token | `educar_configuracoes_gerais.php` e `LegacyGeneralConfiguration.php` 🟢 | Rodapés equivalentes e token cifrado | 🟢 |
| T-13 | Migrar `public.settings` para `educa_system_parameters` com tipagem e categoria | `app/Setting.php:14-25` 🟢 | Dicionário completo sem perda de chave | 🟢 |
| T-14 | Implementar lista de permissões e validação de tipo na gravação do dicionário | `SettingController.php:48-56` 🟡 | Chave inexistente recusada | 🟡 |
| T-15 | Implementar a carga das configurações em cache por tenant com invalidação na gravação | `LoadSettings.php:19-67` 🟢 | Cache efetivo e recarga atômica | 🟢 |
| T-16 | Implementar a trilha de auditoria dos parâmetros (autor, instante, valor anterior e novo) | ausente no legado 🔴 | Trilha consultável | 🔴 |

---

## Tarefas de Teste

| ID | Teste | Origem no legado | Critério de pronto | Confiança |
|----|-------|------------------|--------------------|-----------|
| TT-01 | Lançamento de notas bloqueado fora da janela permitida do legado | `DiarioApiController.php:54-69` 🟢 | Mensagem equivalente | 🟢 |
| TT-02 | Lançamento de notas aceito dentro da janela | `DiarioApiController.php:59-71` 🟢 | Aceito | 🟢 |
| TT-03 | Inversão da janela na migração valida os períodos bloqueados | `educar_bloqueio_ano_letivo_cad.php:70-71` 🔴 | Blocos equivalentes após a conversão | 🔴 |
| TT-04 | Exceção de prazo aceita o lançamento e expira na validade | `_reversa_sdd/Configuracao/legacy-mapping.md:311-349` 🔴 | Aceito até expirar e recusado depois | 🔴 |
| TT-05 | Anos letivos encerrados recusados com a bandeira escolar ligada | `DiarioApiController.php:48-52` 🟢 | Recusa com a mensagem | 🟢 |
| TT-06 | Dicionário recusa chave inexistente e valor fora do tipo | `SettingController.php:48-56` 🟡 | Recusa | 🟡 |
| TT-07 | Carga das configurações acerta cache e recarga após gravação | `LoadSettings.php` 🟢 | Uma única consulta por requisição | 🟢 |
| TT-08 | Parâmetro cifrado não aparece em texto plano na base | `_reversa_sdd/Configuracao/legacy-mapping.md:47` 🔴 | Valor cifrado | 🔴 |

---

## Tarefas de Migração de Dados

| ID | Tarefa | Origem no legado | Critério de pronto | Confiança |
|----|--------|------------------|--------------------|-----------|
| TM-01 | Migrar `pmieducar.instituicao` para `educa_network_configurations` com o corte etário extraído de `data_base_matricula` | `_reversa_sdd/Configuracao/legacy-mapping.md:220-227` e `educar_instituicao_cad.php:250-262` 🟢 | Datas e bandeiras preservadas | 🟢 |
| TM-02 | Migrar `pmieducar.bloqueio_ano_letivo` para `educa_calendar_locks` com a inversão da janela e a operação do tipo `GRADE_POSTING` | `_reversa_sdd/Configuracao/legacy-mapping.md:233` 🔴 | Blocos equivalentes por ano | 🔴 |
| TM-03 | Migrar `pmieducar.configuracoes_gerais` para o dicionário ou para a rede, com os tokens cifrados | `LegacyGeneralConfiguration.php` 🟢 | Sem perda de configuração | 🟢 |
| TM-04 | Migrar `public.settings` por categorias com a tipagem declarada | `app/Setting.php` 🟢 | Contagens batem por categoria | 🟢 |
| TM-05 | Migrar a bandeira escolar de diários encerrados para o modelo por escola | `DiarioApiController.php:48` 🔴 | Bandeira preservada por escola | 🔴 |
| TM-06 | Corrigir o desenho do bastão nas colunas inexistentes: laudo (deficiência) e dependência (regras de avaliação) | `LegacyDeficiency.php:28` e busca 🔴 | Contrato revisado | 🔴 |
| TM-07 | Relatar as chaves de `settings` sem categoria ou obsoletas para o descarte | `app/Setting.php` 🟡 | Relatório curado | 🟡 |

---

## Ordem Sugerida

1. T-01 e T-02 e T-03 (mantenedora)
2. T-04 e T-05 e T-06 (tabelas de bloqueio e dicionário)
3. T-07 e T-08 e T-09 e T-10 (interceptor e consumidores)
4. T-12 e T-13 e T-14 (configurações e dicionário)
5. T-11 (bandeiras da mantenedora)
6. T-15 e T-16 (cache e auditoria)
7. TM-01 a TM-07 (migração)

**Bloqueios:**

- T-01 bloqueia T-11 e TM-01.
- T-04 depende do ano letivo (unit `AcademicYear`) e das escolas (unit `School`).
- T-08 e T-09 dependem do diário (unit `DiarioClasse`).
- TM-02 depende da decisão da inversão de semântica (T-04).

---

## Lacunas Pendentes (🔴 e 🟡)

- Inversão da semântica da janela exige decisão e teste de migração. 🔴
- Bloqueio legado aplicado somente a notas; os outros quatro tipos de operação são novos. 🔴
- Sem exceção, prorrogação ou auditoria no legado. 🔴
- Token e dicionário sem cifragem no legado. 🔴
- Tela do dicionário sem lista de permissões na gravação. 🟡
- Bastão cita colunas inexistentes (laudo, dependência, `data_corte_etario` como nome real; os nomes realmente usados são `data_base_matricula`, `data_fechamento` e afins). 🔴
- Bandeira escolar de diários encerrados fora do desenho do bastão. 🔴
