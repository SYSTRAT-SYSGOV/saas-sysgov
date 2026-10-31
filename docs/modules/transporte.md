# Módulo Transporte Escolar (`api/transporte`)

Frota, motoristas, empresas, rotas com itinerário, alunos transportados, importação por CSV, Censo (Registro 60) e painel de lotação. Requer os módulos Admin, Pessoas e Escola (`requires`).
Specs: `openspec/specs/transporte/spec.md` (consolidada) e as cinco changes arquivadas em `openspec/changes/archive/*transporte-fase-*`.
Origem: reescrita, para o SysGov, do projeto `sys-transporte` (Rust), adaptada à plataforma (multi-tenant, Cadastro de Pessoas, RBAC e auditoria).

- **Middlewares:** `auth:sanctum`, `tenant`, `bindings`, `module-access:transporte`. O Transporte é de **secretaria**: não usa `X-Escola-ID`; a escola da rota é só o destino.
- **Menu:** Gestão Setorial → Transporte Escolar (ícone `Truck`). Habilitar o módulo por tenant em `tenant_module` (`php artisan module:register Transporte` registra catálogo, permissões e menu).
- **Dado de criança:** alocações, arquivos do Censo e a observação da necessidade especial são dados pessoais sensíveis (LGPD). Ver "Privacidade".

## Permissões e perfis

| Permissão | Quem usa |
|---|---|
| `transporte.view` | Consulta (frota, rotas, alocações, painel) |
| `transporte.frota.manage` | Empresas, motoristas, veículos, vistorias; importar veículos e motoristas |
| `transporte.rotas.manage` | Paradas, rotas, itinerários; importar paradas |
| `transporte.alocacoes.manage` | Alocar, alterar e encerrar alunos; ver a ficha com a observação sensível |
| `transporte.alocacoes.override_capacity` | Alocar acima da capacidade do veículo (com justificativa) |
| `transporte.censo.export` | Pré-validação, arquivos do Censo e modelos de exportação |
| `transporte.audit` | Tela de auditoria do módulo |

Perfis (clonados por tenant a partir do tenant `systrat` pelo `ModuleRoleProvisioner`, semeados por `TransporteRbacSeeder`): **Coordenação** (`transporte_coordenacao`, todas), **Operador** (`transporte_operador`, tudo menos exceção de capacidade e auditoria) e **Consulta** (`transporte_consulta`, só `view`).

## Regras de negócio

- **Pessoas:** empresa é pessoa **jurídica** e motorista é pessoa **física** do Cadastro de Pessoas, ligados por CNPJ/CPF. Nada de cadastro paralelo.
- **Empresa:** `prestadora` ou `locadora`, sempre com contrato (número e vigência). Contrato vencido torna irregular o que depende dela.
- **Motorista:** só fica ativo se elegível (CTB, arts. 136 a 139): CNH D ou E válida, curso especializado e exame toxicológico em dia, mais de 21 anos. A elegibilidade é **calculada na leitura**, nunca gravada.
- **Veículo:** origem `propria` (sem empresa), `locada` (empresa locadora) ou `terceirizada` (empresa prestadora). Placa normalizada e única por tenant. A regularidade vem da vistoria de maior validade (o histórico nunca é apagado) e, nos não próprios, do contrato.
- **Alertas:** CNH, curso, toxicológico, vistoria e contrato: vencido é `critico`; a vencer em até 30 dias é `atencao`. Itens inativos não alertam.
- **Rota:** por escola de destino, ano letivo e turno. Ao trocar empresa, veículo ou motorista a API confere a regularidade (409 com o item). Rota já gravada que fica irregular depois **não é alterada**: aparece com o selo "Irregular" e os motivos.
- **Itinerário:** ordem única, parada não repetida, reordenação atômica. Parada com aluno ativo não sai do itinerário; parada em itinerário não é excluída (só inativada).
- **Alocação:** aluno **ativo**, com turma do ano letivo da rota, em parada do itinerário; uma ativa por aluno e rota. Capacidade conferida sob `lockForUpdate` na rota; rota sem veículo ou inativa não recebe aluno; contrato, vistoria e motorista são revalidados a cada alocação; necessidade especial exige veículo acessível. Acima da capacidade só com `override_capacity` e justificativa (auditada). O turno divergente da turma gera o aviso `turno_divergente` (não bloqueia).
- **Encerramento:** manual (data e motivo) ou automático quando o aluno vira transferido/remanejado ou é excluído (observer no model `Aluno`).
- **Ocupação:** verde até 80 %, amarelo até 100 %, vermelho acima; rota sem veículo é pendência.
- **Exclusão:** veículo, motorista e empresa em uso por rota não são excluídos (409); rota com alocação no histórico só é inativada.

## Censo (Registro 60)

- Uma linha por **alocação ativa** do ano letivo. Anulação (transporte e poder público vazios, tipologias 0) sem atendimento curricular, com mediação a distância ou residência fora do Brasil. As onze tipologias do Censo, com a do veículo da rota marcada.
- **Leiaute provisório:** o órgão não obteve o documento do leiaute oficial do Educacenso. Hoje existe o **leiaute básico em CSV** (`basico-1`, `;`, UTF-8 com BOM), atrás da interface `Leiaute`. O leiaute oficial entra como mais uma implementação (`Censo/Leiautes.php`) sem tocar nas regras. **O arquivo gerado NÃO é o do Inep e não serve para importar no Educacenso.**
- **Campos:** catálogo declarativo (`Censo/LeiauteBasico.php`). Obrigatórios travados; não escolhido sai vazio na posição no arquivo e é omitido no CSV de conferência; sensíveis (CPF, necessidade de transporte adaptado) pedem confirmação e vão para a auditoria. A observação da necessidade especial **não existe** no catálogo.
- **Modelos de exportação** por tenant; o padrão "Registro 60 completo" (campos não sensíveis) não é alterado nem excluído.
- **Pré-validação** (não bloqueia a geração): `sem_alocacao_ativa`, `rota_sem_veiculo`, `rural_sem_declaracao`, `veiculo_nao_adaptado`, `sem_codigo_inep`, `campo_sem_dado`; aviso `turno_divergente`.
- **Códigos Inep:** `escola_alunos.inep_id` e `escola_turmas.inep` (opcionais, únicos por tenant), editáveis nas telas do Escola. O Inep da escola já existia.
- O arquivo é gerado **sob demanda e não é guardado** no servidor; cada geração é auditada (usuário, ano, tipo, linhas, leiaute e campos).

## Importação por CSV

Veículos, motoristas e paradas. Fluxo: **prévia** (nada é gravado) → **confirmação** → **fila** (`ProcessarImportacaoJob`) → relatório. Cada linha passa pelos mesmos Services do cadastro manual (numa transação desfeita na prévia). Linhas com erro não impedem as válidas; reenvio do mesmo arquivo não duplica.

- **Veículos:** `origem`, `placa`, `descricao`, `capacidade`, `tipo_rede`, `tipologia_inep` obrigatórios; `cnpj_empresa` para locada/terceirizada (empresa já cadastrada). Placa existente é divergência (o veículo não é alterado).
- **Motoristas:** ligados pelo **CPF** a pessoa já existente (a importação **não cria pessoas**); `pessoa_nao_encontrada`, `cpf_invalido`, `cpf_repetido`; categoria diferente de D/E é divergência; motorista inelegível também.
- **Paradas:** coordenadas em par; parada repetida (nome + logradouro + número) é ignorada com aviso.
- **Segurança:** extensão `csv`/`txt`, até 2 MB e 5.000 linhas, conteúdo de texto, células lidas como texto (nunca fórmula). O arquivo só fica no servidor entre a prévia e o fim do processamento. A auditoria guarda quem importou, o arquivo e os totais.
- **Fila:** em produção `QUEUE_CONNECTION=sync` (sem worker): o job roda dentro da requisição de confirmação. Com um worker, roda em segundo plano e a tela acompanha o andamento.

## Rotas da API

| Método | Rota | Permissão |
|---|---|---|
| GET | `/opcoes` | view (listas de apoio e permissões do usuário) |
| GET | `/alertas`, `/painel?ano_letivo=` | view |
| GET | `/auditoria` (`acao`, `de`, `ate`, `usuario`, `usuario_id`) | audit |
| GET/POST/PUT/DELETE | `/empresas`, `/motoristas`, `/veiculos` | view / frota.manage |
| GET/POST | `/veiculos/{id}/vistorias` | view / frota.manage |
| GET/POST/PUT/DELETE | `/paradas` | view / rotas.manage |
| GET/POST/PUT/DELETE | `/rotas`, `/rotas/{id}` | view / rotas.manage |
| GET/POST/PUT/DELETE | `/rotas/{rota}/itinerario` (`PUT` sem parada reordena) | view / rotas.manage |
| GET | `/rotas/{rota}/alunos` (`?encerradas=1`), `/rotas/{rota}/alunos/busca?q=`, `/rotas/{rota}/alunos/{alocacao}` (ficha) | view (busca: alocacoes.manage) |
| POST/PUT | `/rotas/{rota}/alunos`, `/rotas/{rota}/alunos/{alocacao}`, `POST .../encerrar` | alocacoes.manage |
| GET | `/censo/leiautes` | censo.export |
| POST | `/censo/pre-validacao`, `/censo/arquivo`, `/censo/conferencia` | censo.export |
| GET/POST/PUT/DELETE | `/censo/modelos`, `GET /censo/modelos/{id}/aplicar` | censo.export |
| GET | `/importacoes/modelo/{tipo}` | frota.manage / rotas.manage |
| POST | `/importacoes/{tipo}/previa`, `/importacoes/{id}/confirmar` | idem |
| GET/DELETE | `/importacoes/{id}` | idem |

Erros de regra: `409` (conflito: placa/CNH repetida, capacidade, regularidade, item em uso) e `422` (dado inválido). O corpo é `{"error": "..."}`.

## Telas (`apps/web-client/src/modules/transporte`)

Painel · Rotas (itinerário e mapa Leaflet, alunos da rota com ocupação) · Paradas · Veículos (vistorias) · Motoristas · Empresas · Censo · Auditoria. Escritas com `@sysgov/ui`. Importar CSV nas telas de Veículos, Motoristas e Paradas. A ocupação e a irregularidade aparecem sempre com **texto**, não só com cor.

## Privacidade (LGPD)

- A observação da necessidade especial de uma criança é dado de saúde: só na ficha da alocação, para quem tem `alocacoes.manage`, com a leitura auditada; **nunca** em listagem, exportação ou no `audit_logs` (que guarda só `[informada]`).
- O CSV de conferência não tem CPF, endereço nem a observação; células iniciadas por `=`, `+`, `-` ou `@` recebem apóstrofo.
- Documentos de pessoas saem sempre mascarados.

## Dados de demonstração

```
php artisan db:seed --force --class='Modules\Transporte\Database\Seeders\TransporteDadosDemonstracaoSeeder'
```

Depende do Cadastro Escolar (`EscolaDadosDemonstracaoSeeder`). Idempotente (não roda se o tenant já tem rotas). Cria 3 empresas, 4 motoristas, 5 veículos (vistorias vigentes, a vencer e vencida), 12 paradas na região de Curitiba, 4 rotas e as alocações que deixam rotas verde, amarela e vermelha (esta por exceção de capacidade autorizada). Passa pelos Services do módulo e **não cria usuários nem senhas**. Em produção, só com backup e autorização.

## Limites conhecidos e pendências

- O arquivo do Censo é o leiaute **básico provisório**, não o do Inep (ver Censo). Faltam o mapeamento campo a campo do Registro 60 e a definição dos campos de matrícula obrigatórios.
- O cadastro escolar não diz quais alunos **deveriam** usar transporte; por isso `sem_alocacao_ativa` só vale para quem já teve alocação no ano.
- Um aluno pode estar em mais de uma rota (ida e volta em rotas distintas). Se o órgão quiser uma só por aluno, é regra a acrescentar.
- O mapa usa linha reta entre as paradas e tiles do OpenStreetMap; não há roteirização viária nem geocodificação automática. A escola não tem coordenadas no cadastro, então não é marcador.
- A frota do módulo **Passeio** (`passeio_veiculos`) é separada; a ponte opcional com o Transporte foi descartada (decisão D33).
- Migração automática de dados do i-Educar está fora do escopo.
- A importação dos códigos Inep do aluno e da turma por CSV não foi feita (edição pela tela do Escola).
- Conferência no navegador das telas (tarefa 5.2 de cada fase) pendente: depende de login.
- Concorrência de alocação: o `lockForUpdate` só é exercitado no MySQL; os testes (SQLite) cobrem a regra, não a corrida.
