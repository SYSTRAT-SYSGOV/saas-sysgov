# Design — Módulo Transporte (decisões comuns às cinco fases)

## Contexto

Referência funcional: `SYSTRAT-SYSGOV/sys-transporte` (leitura apenas). Stack de lá: Rust (Axum + SQLx), React + shadcn, MySQL 8, JWT próprio, single-tenant. Ele traz specs de negócio já escritas (`openspec/specs/*`, `Transport/*`) e 8 migrations MySQL. O que vale ser aproveitado é a **regra de negócio e o modelo de dados**; a pilha técnica não.

## Decisões

### D1. Reescrever em Laravel/React; o Rust não entra
O módulo é implementado como os demais: Laravel 13 (`nwidart/laravel-modules`), React 19 + `@sysgov/ui`. Não são portados: Axum/SQLx, JWT e refresh próprios, Argon2id, as tabelas `users/roles/permissions/refresh_tokens/audit_events`, o nginx/compose do projeto e a geração de tipos a partir do OpenAPI do Rust. No lugar entram Sanctum, o RBAC do Admin, o `AuditLogger` (`audit_logs`) e o `@sysgov/sdk`. As migrations, as specs e os testes do Carlos servem de roteiro de comportamento.

### D2. Nome, alias e permissões
Módulo `Transporte`, alias `transporte`, tabelas `transporte_*`, menu "Transporte Escolar" no grupo "GESTÃO SETORIAL". Permissões (definidas todas na Fase 1, para o seeder RBAC rodar uma vez):

| Permissão | Descrição |
|-----------|-----------|
| `transporte.view` | Consultar frota, rotas, alocações e painel |
| `transporte.frota.manage` | Gerir empresas, motoristas, veículos e vistorias |
| `transporte.rotas.manage` | Gerir paradas, rotas e itinerários |
| `transporte.alocacoes.manage` | Alocar e encerrar alunos em rotas |
| `transporte.alocacoes.override_capacity` | Alocar acima da capacidade, com justificativa |
| `transporte.censo.export` | Pré-validar e exportar o Registro 60 |
| `transporte.audit` | Consultar a auditoria do módulo |

Perfis: **Coordenação de Transporte** (todas), **Operador** (todas, menos `override_capacity` e `audit`) e **Consulta** (`view`).

### D3. Cadastro escolar: reaproveitar, não recriar
O Carlos criou `schools`, `students`, `guardians`, `academic_years` e `enrollments`. No SYSGOV isso já existe e **não é recriado**:

| Carlos | SYSGOV |
|--------|--------|
| `schools` (INEP) | `escola_escolas` (tem `inep`) |
| `students` + `guardians` | `escola_alunos` (+ `pessoa_id`) e `escola_aluno_contatos` |
| `academic_years` | `escola_turmas.ano_letivo` (inteiro) |
| `enrollments` (ativa) | `escola_alunos.situacao = 'ativo'` na turma do ano letivo |
| turno (enum) | `escola_turnos.nome` (texto livre por escola) |

Consequências:
- O **turno** da rota é um enum próprio do módulo (`manha`, `tarde`, `noite`, `integral`). A conferência com o turno do aluno é feita por nome normalizado do turno da turma; se não for possível resolver, a alocação não é bloqueada e fica com um aviso (detalhe na Fase 3).
- As três condições do Registro 60 que o Carlos pôs na matrícula (atendimento curricular, mediação didática, país de residência) **não existem** no Escola. Para não mexer no Escola, elas ficam na **alocação** (Fase 3), com padrões `true`, `presencial` e `BR`.
- Os módulos dependentes leem `escola_alunos` por escola (`EscolaAware`). O Transporte é de **secretaria**, não de escola; a Fase 3 deve ler alunos de várias escolas do mesmo modo que o Multiprofissional (tarefa de confirmação na Fase 3).

### D4. Pessoas: motorista é PF, empresa é PJ
- **Motorista** = `transporte_motoristas.pessoa_id` → pessoa física. CPF, nome e nascimento ficam no cadastro central; o módulo guarda só CNH, curso e toxicológico. A regra "mais de 21 anos" usa o nascimento da pessoa. Uma pessoa tem no máximo um registro de motorista por tenant.
- **Empresa** = `transporte_empresas.pessoa_id` → pessoa jurídica (CNPJ), com o representante legal em `pessoas.responsavel_id`. Não se cria vínculo novo em `PessoaVinculo`: os tipos `contratada`/`fornecedor` já existem e o papel é o próprio registro do módulo.
- **Frota própria, locada e terceirizada** (pergunta Q-10 do Carlos; decisão do usuário: a prefeitura pode ter frota própria e frota locada). A **origem** é do veículo: `propria` (da prefeitura, sem empresa e sem contrato), `locada` (alugada de uma empresa `locadora`) ou `terceirizada` (da empresa `prestadora` que presta o serviço). A empresa tem `tipo` `prestadora` ou `locadora`, e **sempre** contrato e vigência. O veículo locado herda o contrato da locadora. Motorista e rota podem existir sem empresa (motorista servidor da prefeitura).

### D5. Frota do Passeio fica separada
`passeio_veiculos` é por passeio, com mapa de assentos e dados de motorista em texto. O Transporte tem frota permanente com vistoria. São conceitos diferentes e **não são unificados**. Uma ponte opcional (vincular o veículo do passeio a um veículo do Transporte) é decisão da Fase 5.

### D6. "Vistoria" do Transporte não é o módulo Vistoria
O módulo `Vistoria` é de fiscalização/inspeção municipal (ordens de serviço, checklists). A vistoria semestral do DETRAN é uma tabela do próprio Transporte (`transporte_vistorias`). Não há dependência entre os dois.

### D7. Auditoria e integrações externas
Toda mutação passa pelo `AuditLogger`. Não há chamada externa em controller: a consulta de CEP continua no navegador (`pessoas/services/cep.ts`) e, se falhar, o endereço é digitado. O CEP **não** devolve coordenadas; as coordenadas são informadas no mapa ou digitadas (a geocodificação automática fica fora, e entraria pelo Outbox).

### D8. Valores monetários
O módulo não guarda valor em reais nas cinco fases (contrato só tem número e vigência). Se isso mudar, usar `App\Support\Money` com centavos inteiros.

### D9. Perguntas em aberto do Carlos que esta change já fecha (para aprovação)
| # | Pergunta | Decisão proposta |
|---|----------|------------------|
| Q-03 | Poder público responsável, valor 3 | Domínio completo do Registro 60: 1 estadual, 2 municipal, 3 compartilhado |
| Q-04 | Tipologia 11 (ferroviário) | Incluída nas tipologias do arquivo do Educacenso |
| Q-05 | Lotação bloqueia ou só avisa | Bloqueia desde o primeiro dia; exceção só com permissão e justificativa auditada (como no Carlos) |
| Q-10 | Contrato obrigatório para frota própria | Frota própria não tem empresa nem contrato; frota locada e terceirizada exigem empresa com contrato vigente (ver D4) |
| Q-11 | Prazos do curso e do toxicológico | O sistema **não calcula prazo**: guarda a data de vencimento informada |
| Q-13 | Rota com mais de uma escola | Uma escola de destino por rota (como no Carlos) |
| Q-14 | Tempo médio de deslocamento | Fora do escopo |

### D10. O que o Carlos não cobre e esta change também não cobre
- "Infração gravíssima nos últimos 12 meses" (CTB) — não há dado para checar; fica fora da elegibilidade.
- Conflito de veículo ou motorista em duas rotas no mesmo turno — não é bloqueado; entra como melhoria futura.

## Modelo de dados desta fase (todas as tabelas com `tenant_id` e índice composto iniciando por ele; exclusão lógica)

- `transporte_empresas`: `pessoa_id` (PJ), `tipo` (`prestadora|locadora`), `contrato_numero`, `vigencia_inicio`, `vigencia_fim` (os três obrigatórios), `ativa`, `observacoes`. Único `(tenant_id, pessoa_id)`.
- `transporte_motoristas`: `pessoa_id` (PF), `empresa_id` (nulo), `cnh_numero`, `cnh_categoria` (`D|E`), `cnh_primeira_habilitacao`, `cnh_validade`, `curso_certificado`, `curso_validade`, `toxicologico_data`, `toxicologico_validade`, `ativo`, `observacoes`. Único `(tenant_id, pessoa_id)` e `(tenant_id, cnh_numero)`.
- `transporte_veiculos`: `origem` (`propria|locada|terceirizada`), `empresa_id` (nulo só na origem `propria`), `motorista_padrao_id` (nulo), `descricao`, `placa` (normalizada), `renavam`, `chassi`, `marca_modelo`, `ano_fabricacao`, `ano_modelo`, `data_licenca`, `capacidade` (> 0), `tipo_rede` (`rural|urbana|mista`), `tipologia_inep` (1 a 11), `uso_exclusivo`, `acessivel`, `ativo`, `motivo_inativacao`, `observacoes`. Único `(tenant_id, placa)`.
- `transporte_vistorias`: `veiculo_id`, `data_vistoria`, `certificado`, `validade`, `observacoes`. A "última vistoria" do Carlos, desnormalizada no veículo, **não** é copiada: a regularidade vem da vistoria de maior validade.

## Regras de domínio (Services, não só validação de tela)

- **Elegibilidade do motorista**: CNH D ou E com validade futura, idade acima de 21 anos, curso com validade futura e toxicológico com validade futura. `elegivel` e a lista de motivos são calculados na leitura. Motorista inelegível pode ser cadastrado como **inativo**; ativar um inelegível retorna 422.
- **Contrato da empresa**: `vigencia_fim` no passado = contrato vencido. Um veículo `locado` ou `terceirizado` cuja empresa tem contrato vencido é **irregular**. Veículo `proprio` não depende de contrato.
- **Origem × empresa**: `propria` não aceita empresa; `locada` exige empresa `locadora`; `terceirizada` exige empresa `prestadora`. Combinação errada retorna 422.
- **Veículo regular**: ativo e com vistoria cuja `validade` não passou.
- **Alertas**: itens vencidos (críticos) e a vencer em até 30 dias (atenção), por tipo (`cnh`, `curso`, `toxicologico`, `vistoria`, `contrato`), com a data e o responsável pelo item.
- **Placa**: maiúsculas, sem hífen e espaços; aceita o formato antigo (`ABC1234`) e o Mercosul (`ABC1D23`).

## Riscos

- Cadastro de motorista depende de a pessoa já existir no Cadastro de Pessoas; o formulário usa o `PessoaPicker` com opção de cadastrar na hora.
- Pessoa jurídica só existe no Cadastro de Pessoas desde a evolução de PJ (já em produção, `pessoas.tipo`).
