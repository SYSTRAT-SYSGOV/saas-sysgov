# Configuracao (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Descreve o **QUE** o subsistema de parametrização faz: manter as datas e obrigatoriedades da mantenedora, as configurações gerais de identidade e integração, o bloqueio de janela do ano letivo nos lançamentos do diário e o dicionário de parâmetros do sistema.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O subsistema Configuracao do i-Educar é disperso em **cinco fontes reais**: `pmieducar.instituicao` (datas e ~35 bandeiras de regras), `pmieducar.configuracoes_gerais` (identidade, rodapés, integração e bandeiras de comportamento), `pmieducar.bloqueio_ano_letivo` (janela única por instituição e ano), `public.settings` e `public.settings_categories` (dicionário chave-valor tipado do sistema) e ainda a bandeira escolar `pmieducar.escola.bloquear_lancamento_diario_anos_letivos_encerrados`, ausente do desenho do bastão. 🟢 `ieducar/intranet/educar_instituicao_cad.php`, `app/Models/LegacyInstitution.php`, `ieducar/intranet/educar_configuracoes_gerais.php`, `educar_bloqueio_ano_letivo_cad.php`, `app/Setting.php`, `app/Models/LegacyGeneralConfiguration.php`, `app/Models/LegacySchoolYearLock.php`

Problema que resolve: centralizar as regras de inserção, as datas de corte e o travamento administrativo sem código duplicado na rede, com a carga em cache no middleware de configuração. 🟢 `app/Http/Middleware/LoadSettings.php:19-67`

Achado estrutural do bastão vs. código: a janela do `bloqueio_ano_letivo` no legado é a janela **permitida** (fora dela o lançamento de notas é bloqueado), e não a janela de travamento descrita no desenho alvo. 🔴 `educar_bloqueio_ano_letivo_cad.php:70-71` e `ieducar/modules/Avaliacao/Views/DiarioApiController.php:54-69`

---

## Responsabilidades

- Manter a identidade, o endereço e as datas administrativas da mantenedora, com o processo 559. 🟢 `ieducar/intranet/educar_instituicao_cad.php:114-139` e `:171-184`
- Manter cerca de trinta e cinco bandeiras de regras: obrigatoriedades de documentos e telefone, restrições de histórico e de enturmação, componentes diferenciados por turma, bloqueio de matrícula fora da sequência e fora do período letivo, controle de espaço físico e atestados. 🟢 `educar_instituicao_cad.php:222-393`
- Manter as configurações gerais da instituição: rodapés, logomarca, redes sociais, integração com API externa com token em texto plano, bloqueio de cadastro de aluno, modelo do boletim do professor e emissão de atos, com o processo 999873 e o nível um. 🟢 `ieducar/intranet/educar_configuracoes_gerais.php:56-79` e `:81-272`
- Manter o dicionário de parâmetros do sistema em `public.settings`, tipado em texto, inteiro, decimal e booleano, agrupado por categorias, acessível somente ao administrador. 🟢 `app/Setting.php:8-25` e `app/Http/Controllers/SettingController.php:24-46`
- Gravar o dicionário pela tela de configurações com disparo do evento de atualização. 🟢 `SettingController.php:48-56`
- Bloquear o lançamento de notas do diário eletrônico fora da janela permitida da instituição e do ano. 🟢 `DiarioApiController.php:54-69`
- Bloquear a alteração do diário de anos letivos encerrados por bandeira da escola. 🟢 `DiarioApiController.php:45-52`
- Carregar as configurações do banco no `Config` da aplicação com cache nas duas chaves. 🟢 `LoadSettings.php:19-67` e `app/Services/CacheService.php:17-19`
- Manter o bloqueio do ano letivo por instituição e ano com o processo 21251. 🟢 `educar_bloqueio_ano_letivo_cad.php:24-72` e `:146-150`

---

## Regras de Negócio

### Janela do ano letivo (bloqueio)

- O bloqueio é único por instituição e ano, com a chave primária composta, e guarda somente `data_inicio` e `data_fim`. 🟢 migração `2020_01_01_110000_create_pmieducar_bloqueio_ano_letivo_table.php:18-26`
- Os rótulos da tela declaram a janela como "Data inicial permitida" e "Data final permitida". 🟢 `educar_bloqueio_ano_letivo_cad.php:70-71`
- O consumidor bloqueia o lançamento de notas quando a data atual está **fora** da janela, com a mensagem "O lançamento de notas nessa instituição está bloqueado nesta data.". 🟢 `DiarioApiController.php:59-69`
- A única aplicação registrada do bloqueio é o lançamento de notas do diário eletrônico; matrículas, históricos e movimentações não são travados por esta tabela. 🔴 busca de consumo (única referência de leitura fora das telas em `DiarioApiController.php:54`)
- Não há prorrogação, exceção por operador, escopo por escola ou por operação na implementação legada. 🔴
- O nível de acesso do cadastro do bloqueio é três, com o processo 21251. 🟢 `educar_bloqueio_ano_letivo_cad.php:32`

### Datas da mantenedora

- A data base de matrícula é dia e mês e controla a distorção idade e série e as inscrições no Pré-matrícula, equivalendo ao corte etário da Resolução CNE. 🟢 `educar_instituicao_cad.php:250-262`
- A data de fechamento, em dia e mês, bloqueia novas matrículas nas turmas após a data. 🟢 `educar_instituicao_cad.php:274-286`
- A data de expiração da reserva de vaga indefere automaticamente as reservas em espera. 🟢 `educar_instituicao_cad.php:263-273`
- As datas base de deslocamento e de troca de sala governam apenas a ordenação de alunos em relatórios, e não bloqueiam operações. 🟢 `educar_instituicao_cad.php:228-249`
- A data de referência do Educacenso limita as matrículas enviadas ao Censo. 🟢 `educar_instituicao_cad.php:287-297`

### Bandeiras da mantenedora

- As obrigatoriedades de documento e CPF e telefone de pessoa física são bandeiras da instituição. 🟢 `educar_instituicao_cad.php:223-225` e `:388-393`
- A reclassificação na educação infantil e no primeiro ano do ensino fundamental pode ser proibida conforme a LDB art. 31 e a Resolução CNE/CEB, com o aviso na tela. 🟢 `educar_instituicao_cad.php:357-363`
- As restrições de histórico, enturmação múltipla, sequência de série, vínculos de professor e lançamentos de etapas anteriores são bandeiras da instituição. 🟢 `educar_instituicao_cad.php:299-304` e `:322-379`
- O parâmetro de componentes diferenciados por turma vive aqui e é consumido pela tela da turma da unit Agendada anteriormente. 🟢 `educar_instituicao_cad.php:341-345`
- A exigência de laudo médico, citada no bastão como parâmetro da instituição, pertence **ao domínio de deficiências** na tabela `pmieducar.deficiencia`. 🔴 `app/Models/LegacyDeficiency.php:28` e `ieducar/intranet/educar_deficiencia_cad.php:99`
- A quantidade máxima de dependências, citada no bastão como coluna da instituição, não existe em `pmieducar.instituicao`; o controle de dependência vive nas regras de avaliação. 🔴 busca

### Configurações gerais da instituição

- A tabela é um a um com a instituição pela chave `ref_cod_instituicao`. 🟢 migração `configuracoes_gerais:45-47` e `LegacyGeneralConfiguration.php:20-24`
- A gravação do token de integração é em texto plano na coluna `token_novo_educacao`. 🟢 `educar_configuracoes_gerais.php:142-148`
- O modelo do boletim do professor vem de um contrato de relatórios do professor. 🟢 `educar_configuracoes_gerais.php:173-180`
- Os valores das bandeiras de ato autorizativo, credenciamento, atestados e bloqueio de cadastro são booleanos com padrão falso. 🟢 migração `configuracoes_gerais:33-37`
- As padronizações de rodapé do login e dos externos vêm com os textos padrão da comunidade i-Educar. 🟢 migração `configuracoes_gerais:24-29`

### Dicionário de parâmetros do sistema

- O parâmetro tem chave, valor, tipo em texto, inteiro, decimal ou booleano, descrição, categoria e dica, sem tipo criptografado. 🟢 `app/Setting.php:14-25`
- A gravação percorre todas as chaves da requisição e atualiza cada registro sem lista de permissões nem validação de tipo no servidor. 🟡 `SettingController.php:48-56`
- O acesso à tela é restrito ao administrador, com retorno de erro para os demais. 🟢 `SettingController.php:31-33`
- A atualização dispara o evento de configurações atualizadas. 🟢 `SettingController.php:52`
- O middleware carrega as configurações do banco para o `Config` e a configuração geral da instituição ativa, com cache pelas chaves `settings.all` e `settings.general_configuration`. 🟢 `LoadSettings.php:19-64` e `CacheService.php:17-19`
- Não há isolamento por tenant na tabela `settings` do legado. 🟡 `app/Setting.php` (sem coluna de instituição)

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RC-01 | O sistema deve manter a identidade e as datas administrativas da mantenedora, com as datas de corte e fechamento em dia e mês. | Must | Dado uma mantenedora com corte 31/03, quando gravada, então o corte fica referido para a distorção idade e série. |
| RC-02 | O sistema deve manter as cerca de trinta e cinco bandeiras de regras da mantenedora, com os efeitos aplicados nas unidades consumidoras. | Must | Dado um parâmetro ligado de histórico restrito, quando um operador de outra escola edita o histórico, então a edição é recusada. |
| RC-03 | O sistema deve manter as configurações gerais da instituição com identidade, rodapés, integração e bandeiras de comportamento. | Must | Dado um rodapé alterado, quando o portal é aberto, então o rodapé novo aparece. |
| RC-04 | O sistema deve manter o dicionário de parâmetros tipado por categoria com acesso de administrador. | Must | Dado um usuário não administrador, quando a tela é aberta, então o acesso é recusado. |
| RC-05 | O sistema deve travar o lançamento de notas fora da janela permitida da instituição e do ano. | Must | Dado uma janela de 1/1 a 31/12 do ano, quando o lançamento é feito na data limite, então o lançamento é aceito. 🟢 |
| RC-06 | O sistema deve travar operações por tipo, escopo de rede, etapa ou escola, com tolerância retroativa. | Should | Dado um bloqueio de frequência por rede, quando o lançamento retroativo de quatro dias é tentado, então o lançamento é recusado com três dias de tolerância. 🔴 |
| RC-07 | O sistema deve conceder exceções de prazo por operador, turma e componente, com protocolo, justificativa e validade. | Should | Dado um professor com licença, quando a exceção é concedida, então ele lança notas até o vencimento sem abrir a rede. 🔴 |
| RC-08 | O sistema deve registrar o bloqueio na base real como janela permitida, e a migração deve inverter a semântica para a janela de travamento. | Must | Dado um registro do legado com 1/1 a 31/12, quando migrado, então o bloqueio do modelo novo cobre os períodos fora dessa janela, preservado o rótulo original de janela permitida. 🔴 |
| RC-09 | O sistema deve travar a alteração do diário de anos letivos encerrados por bandeira da escola. | Must | Dado a bandeira ligada e o ano encerrado, quando o diário é alterado, então a alteração é recusada com a mensagem. 🟢 |
| RC-10 | O sistema deve carregar as configurações do banco com cache e invalidação na gravação. | Should | Dado um parâmetro gravado, quando há leitura em seguida, então o valor novo é devolvido. 🟢 |
| RC-11 | O sistema deve criptografar os parâmetros sensíveis (tokens de integração). | Should | Dado um token gravado, quando a tabela é aberta, então o valor está cifrado. 🔴 (texto plano no legado) |
| RC-12 | O sistema deve validar os tipos e as listas de permissões na gravação do dicionário de parâmetros. | Should | Dado um POST com chave inexistente, quando gravado, então a entrada ignorada é recusada. 🟡 |
| RC-13 | O sistema deve ter a unificação das quatro fontes do legado no dicionário da mantenedora. | Should | Dado os quatro registros, quando migrados, então os parâmetros somem sem perda de semântica. 🔴 |
| RC-14 | O sistema deve manter a bandeira escolar de bloqueio de diários encerrados, ausente do desenho do bastão. | Must | Dado a migração, quando executada, então a bandeira migra para o modelo por escola. 🔴 |

---

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência no código | Confiança |
|------|-----------|---------------------|-----------|
| Segurança | A gravação do dicionário percorre todas as chaves do POST sem lista de permissões nem validação de tipo no servidor. | `SettingController.php:48-56` | 🟡 |
| Segurança | O token de integração e os parâmetros do dicionário são gravados em texto plano, sem suporte a tipo cifrado. | `Setting.php:14-25` | 🟢 |
| Performance | As configurações gerais e do dicionário são carregadas por middleware com cache nas duas chaves. | `LoadSettings.php:19-64` | 🟢 |
| Integridade | O bloqueio do ano letivo tem chave composta por instituição e ano, com crud direto sem confirmação de vínculos. | `educar_bloqueio_ano_letivo_cad.php:74-144` | 🟢 |
| Integridade | A única aplicação do bloqueio é o lançamento de notas, e os demais módulos não consultam a janela. | busca de consumo | 🔴 |
| Multi-tenancy | A tabela `settings` é global sem isolamento por tenant, e a configuração geral e a de bloqueio são por instituição. | `Setting.php` e migração `bloqueio` | 🟢 |
| Observabilidade | Sem trilha de auditoria das trocas de parâmetros; o evento de atualização existe, mas sem registro de autor e valor anterior. | `SettingController.php:52` | 🟡 |
| Usabilidade | As datas de deslocamento e de troca de sala são nomes diferentes dos das colunas do banco. | `educar_instituicao_cad.php:228-249` | 🟢 |

---

## Critérios de Aceitação

```gherkin
Dado um bloqueio de ano letivo com janela permitida de 15/1 a 15/12
Quando o professor tenta lançar notas em 19/12
Então o lançamento é recusado com a mensagem de bloqueio 🟢

Dado um bloqueio com a janela do ano todo
Quando a migração executa
Então o registro é transformado com a inversão declarada de janela 🔴

Dado um usuário não administrador
Quando a tela de configurações do sistema é aberta
Então o acesso é recusado

Dado um parâmetro tipado booleano
Quando gravado com o valor "sim"
Então a leitura devolve o booleano

Dado o parâmetro institucional de componentes diferenciados por turma
Quando ligado
Então a tela da turma apresenta a diferenciação (unit ComponenteCurricular)

Dado um lançamento de notas em ano letivo encerrado com a bandeira escolar ligada
Quando gravado
Então a gravação é recusada com a mensagem de ano encerrado

Dado uma exceção de prazo concedida a um professor com protocolo e validade
Quando ele lança notas após a janela e antes do vencimento
Então o lançamento é aceito 🔴
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Datas e bandeiras da mantenedora | Must | Base de todo o comportamento |
| Configurações gerais de identidade e integração | Must | Identidade e integrações da rede |
| Dicionário tipado de parâmetros | Must | Substitui `public.settings` |
| Bloqueio de notas fora da janela | Must | Paridade com a única trava real do legado |
| Bloqueio por operação e escopo com tolerância | Should | Novo motor aplicado (desenho do bastão) 🔴 |
| Exceções de prazo auditáveis | Should | Governança do professor 🔴 |
| Inversão da semântica da janela na migração | Must | Transformação da semântica (janela permitida no legado → janela de travamento no alvo) 🔴 |
| Criptografia de parâmetros sensíveis | Should | Segurança de tokens 🔴 |
| Validação e lista de permissões na gravação do dicionário | Should | Defesa da tela de configurações 🔴 |
| Bandeira escolar de diários encerrados | Must | Fonte de configuração real omitida no bastão 🔴 |

---

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `ieducar/intranet/educar_instituicao_cad.php` | Parâmetros e datas da mantenedora (processo 559) | 🟢 |
| `ieducar/intranet/educar_configuracoes_gerais.php` | Configurações gerais (processo 999873) | 🟢 |
| `ieducar/intranet/educar_configuracoes_index.php` | Índice do menu configurações | 🟡 |
| `ieducar/intranet/educar_bloqueio_ano_letivo_cad.php` / `_det` / `_lst` | CRUD do bloqueio (processo 21251) | 🟢 |
| `app/Models/LegacySchoolYearLock.php` | `pmieducar.bloqueio_ano_letivo` | 🟢 |
| `app/Models/LegacyGeneralConfiguration.php` | `pmieducar.configuracoes_gerais` | 🟢 |
| `app/Models/LegacyInstitution.php` | `pmieducar.instituicao` | 🟢 |
| `app/Setting.php` | `public.settings` tipado | 🟢 |
| `app/Http/Controllers/SettingController.php` | Tela de configurações do sistema | 🟢 |
| `app/Http/Middleware/LoadSettings.php` | Carga em cache das configurações | 🟢 |
| `app/Services/CacheService.php` | Chaves de cache | 🟢 |
| `ieducar/modules/Avaliacao/Views/DiarioApiController.php` | Único consumidor do bloqueio | 🟢 |
| `app/Models/LegacyDeficiency.php` | Laudo médico por deficiência | 🟢 |
| `app/Models/Builder/LegacySchoolYearLockBuilder.php` | Filtros por instituição e ano | 🟢 |
