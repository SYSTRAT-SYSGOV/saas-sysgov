# Configuracao (i-Educar legado), Contratos

> Contratos externos observados no legado para a unit de parametrização. Serve de entrada para o `openapi/` do modelo novo.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contrato de tela: parâmetros da mantenedora (processo 559)

| Elemento | Formato | Observação |
|----------|---------|------------|
| Identidade | Nome, CEP, logradouro, número, complemento, bairro, cidade, UF, responsável, telefones | 🟢 `ieducar/intranet/educar_instituicao_cad.php:177-192` |
| Coordenador de transporte | Busca de pessoa | 🟢 `:194-201` |
| Órgão regional de ensino | Lista dependente da UF (Educacenso) | 🟢 `:203-220` |
| Datas | Base de deslocamento (AAAA-MM-DD), troca de sala (AAAA-MM-DD), base de matrícula (dd/mm), expiração de reserva (AAAA-MM-DD), fechamento de turmas (dd/mm), referência do Educacenso (AAAA-MM-DD) | 🟢 `:227-297` |
| Bandeiras de regras | Cerca de trinta e cinco caixas de seleção em cinco seções (gerais, datas, históricos, reserva de vaga, relatórios, processos escolares) | 🟢 `:222-393` |
| Permissão | Processo 559 com soma de nível três | 🟢 `:120` |
| Gravação | Por `clsPmieducarInstituicao` na edição; sem criação de mantenedoras novas pela tela | 🟢 `:401-408` |

---

## 2. Contrato de tela: configurações gerais (processo 999873)

| Elemento | Formato | Observação |
|----------|---------|------------|
| Acesso | Nível um obrigatório na entrada | 🟢 `educar_configuracoes_gerais.php:60-64` |
| Bandeiras | Relacionamento pós-venda, bloqueio de cadastro de alunos, atestados, atos autorizativos e de criação | 🟢 `:108-131` |
| Integração | URL e token do "Novo Educação" em texto plano | 🟢 `:133-148` |
| Comportamento | Mostrar código INEP, justificativa de documentação, tamanho mínimo da rede estadual, modelo do boletim do professor | 🟢 `:150-180` |
| Identidade | URL de cadastro de usuários, ativo no i-Educar, mensagens de suspensão, logomarca, nome da entidade | 🟢 `:182-220` |
| Rodapés e redes | Rodapés de login, externo e interno, Facebook, Twitter, LinkedIn | 🟢 `:222-271` |
| Persistência | Registro um a um pela chave `ref_cod_instituicao` | 🟢 `LegacyGeneralConfiguration` e migração |

---

## 3. Contrato de tela: bloqueio do ano letivo (processo 21251)

| Elemento | Formato | Observação |
|----------|---------|------------|
| Chave | Instituição + ano (composta) | 🟢 migração `bloqueio_ano_letivo:25-26` |
| Campos | Instituição e ano dinâmicos, data inicial e final **permitidas** | 🟢 `educar_bloqueio_ano_letivo_cad.php:67-72` |
| CRUD | Criação, edição por chave composta e exclusão direta | 🟢 `:74-144` |
| Consumo | Bloqueio do lançamento de notas fora da janela | 🟢 `DiarioApiController.php:54-69` |

---

## 4. Contrato de tela: configurações do sistema (`public.settings`)

| Elemento | Formato | Observação |
|----------|---------|------------|
| Acesso | Somente administrador | 🟢 `SettingController.php:31-33` |
| Categorias | Agrupamento com as configurações ordenadas por descrição e chave | 🟢 `SettingController.php:35-40` |
| Tipos | Texto, decimal, inteiro e booleano, com dica e limite | 🟢 `app/Setting.php:14-25` |
| Gravação | Iteração das chaves do POST acertando cada registro por id, com evento de atualização | 🟡 `SettingController.php:48-56` |
| Limitações | Sem tipo criptografado nem isolamento de tenant | 🟢 `app/Setting.php` |

---

## 5. Contrato de persistência

| Tabela legada | Chave | Colunas relevantes | Fonte |
|---------------|-------|--------------------|-------|
| `pmieducar.instituicao` | `cod_instituicao` | nome, endereço, responsável, órgão regional, datas administrativas, bandeiras de regras | 🟢 `app/Models/LegacyInstitution.php:55-88` |
| `pmieducar.configuracoes_gerais` | `ref_cod_instituicao` | vinte e quatro colunas (identidade, rodapés, integração, bandeiras) | 🟢 migração `configuracoes_gerais:18-47` |
| `pmieducar.bloqueio_ano_letivo` | instituição + ano | `data_inicio`, `data_fim` (janela permitida) | 🟢 migração `bloqueio_ano_letivo:18-26` |
| `public.settings` | `key` (por categoria) | `key`, `value`, `type`, `description`, `setting_category_id`, `hint`, `maxlength` | 🟢 `app/Setting.php:14-25` |
| `public.settings_categories` | `id` | nome da categoria | 🟢 `app/SettingCategory.php` (consumido no controlador) |
| `pmieducar.escola.bloquear_lancamento_diario_anos_letivos_encerrados` | por escola | bandeira de diários encerrados | 🟢 `DiarioApiController.php:48-52` |
| `pmieducar.deficiencia.exigir_laudo_medico` | por deficiência | exigência de laudo (fora da unit) | 🟢 `app/Models/LegacyDeficiency.php:28` |

---

## 6. Contratos planejados para o modelo novo

Derivados de `_reversa_sdd/Configuracao/legacy-mapping.md`:

### Endpoints REST (prefixo `/api/v1/educa/configuration`)

| Método | Caminho | Deriva de |
|--------|---------|-----------|
| GET/PUT | `/network-configuration` | Parâmetros da mantenedora 🟢 `educar_instituicao_cad.php` |
| GET/POST | `/calendar-locks` | Bloqueios por operação e escopo 🔴 `_reversa_sdd/Configuracao/legacy-mapping.md:106-146` |
| PUT | `/calendar-locks/{id}` | Ativação e alteração da janela 🔴 |
| POST | `/calendar-locks/{id}/exceptions` | Concessão de prorrogação auditável 🔴 `:149-187` |
| POST | `/lock-exceptions/{id}/revoke` | Revogação com motivo 🔴 |
| GET/POST | `/system-parameters` | Dicionário tipado por tenant 🔴 `:190-211` |
| GET | `/diario/pre-check` | Verificação de bloqueio equivalente ao `DiarioApiController` 🟢 `DiarioApiController.php:40-72` |

### Tipos TypeScript (`packages/sdk/src/types/educa/configuration.ts`)

Tipos previstos já no bastão: `CalendarOperationType` (cinco operações), `LockScopeType` (rede, etapa, escola), `SystemParamDataType` (seis tipos, com `ENCRYPTED`), `NetworkConfigurationDTO`, `CalendarLockDTO`, `LockExceptionDTO`, `SystemParameterDTO`. 🟢 `_reversa_sdd/Configuracao/legacy-mapping.md:463-566`

### De/para das tabelas

`pmieducar.instituicao` vai a `educa_network_configurations` **mais** a bandeira escolar por escola; `pmieducar.configuracoes_gerais` vai ao dicionário e à identidade por tenant, com os tokens cifrados; `pmieducar.bloqueio_ano_letivo` a `educa_calendar_locks` com a inversão da janela; `public.settings` a `educa_system_parameters`. 🔴 (decisões da inversão e da cifragem pendentes)
