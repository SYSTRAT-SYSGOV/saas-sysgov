# meio-ambiente/empreendimentos Specification

## Purpose
Cadastro mestre de empreendimentos e atividades potencialmente poluidoras sujeitas a licenciamento,
fiscalização, compensação ambiental e outorga de recursos hídricos, com localização georreferenciada e
responsável técnico habilitado, reaproveitado como referência pelas demais capacidades do módulo de Meio
Ambiente.

## Requirements

### Requirement: Cadastro de empreendimento sujeito a licenciamento ambiental
<!-- entities: Empreendimento -->

O sistema SHALL permitir o cadastro de empreendimentos de titularidade de pessoa física ou jurídica, com
atividade exercida, porte (pequeno, médio, grande) e localização georreferenciada (latitude/longitude),
vinculando o titular ao Cadastro Único Municipal (`Modules/Pessoas`) quando o titular for pessoa física já
cadastrada, ou armazenando CNPJ/razão social diretamente quando o titular for pessoa jurídica.

#### Scenario: Cadastro de empreendimento com titular pessoa física já no Cadastro Único
- **GIVEN** um usuário com permissão `meio_ambiente.empreendimentos.manage`
- **WHEN** `criarEmpreendimento()` recebe `titular_pessoa_id` existente no Cadastro Único, `atividade`, `porte = 'medio'`, `latitude` e `longitude`
- **THEN** o empreendimento é persistido com `tenant_id` do contexto atual, vínculo ao `titular_pessoa_id` e registro de auditoria criado

#### Scenario: Cadastro de empreendimento com titular pessoa jurídica
- **GIVEN** um usuário com permissão `meio_ambiente.empreendimentos.manage`
- **WHEN** `criarEmpreendimento()` recebe `cnpj` e `razao_social` válidos, sem `titular_pessoa_id`
- **THEN** o empreendimento é persistido com os dados de CNPJ/razão social e sem vínculo ao Cadastro Único de pessoa física

#### Scenario: Cadastro sem titular pessoa física nem CNPJ é rejeitado
- **WHEN** `criarEmpreendimento()` é chamado sem `titular_pessoa_id` e sem `cnpj`
- **THEN** lança `DomainException` "Empreendimento precisa de um titular pessoa física ou jurídica" e o controller responde HTTP 422

### Requirement: Responsável técnico habilitado
<!-- entities: ResponsavelTecnico -->

O sistema SHALL exigir o registro de um responsável técnico pelo empreendimento, com nome, número de
registro profissional (CREA ou CRBio) e vínculo opcional ao Cadastro Único Municipal quando a pessoa já
estiver cadastrada.

#### Scenario: Vínculo de responsável técnico com CREA
- **GIVEN** um empreendimento já cadastrado
- **WHEN** `vincularResponsavelTecnico()` recebe `nome`, `registro_profissional = 'CREA-PR 123456'` e `tipo_registro = 'CREA'`
- **THEN** o responsável técnico é persistido vinculado ao empreendimento

#### Scenario: Empreendimento sem responsável técnico não pode iniciar licenciamento
- **GIVEN** um empreendimento cadastrado sem responsável técnico vinculado
- **WHEN** um processo de licenciamento é aberto para esse empreendimento
- **THEN** lança `DomainException` "Responsável técnico obrigatório para licenciamento" e o controller responde HTTP 422

### Requirement: Consulta georreferenciada de empreendimentos
<!-- entities: Empreendimento -->

O sistema SHALL permitir a consulta de empreendimentos cadastrados em mapa interativo, filtrando por
atividade, porte e situação do licenciamento vigente.

#### Scenario: Consulta em mapa filtrando por atividade
- **GIVEN** 5 empreendimentos cadastrados, 2 deles com `atividade = 'agroindustria'`
- **WHEN** `listarParaMapa()` é chamado com filtro `atividade = 'agroindustria'`
- **THEN** retorna um GeoJSON contendo apenas os 2 empreendimentos filtrados, com suas coordenadas
