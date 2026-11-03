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
| `transporte.censo.importar` | Importar o arquivo do Educacenso e testar o leiaute de importação |
| `transporte.censo.leiaute` | Criar, alterar e excluir campos do leiaute de importação do Educacenso |
| `transporte.custos.ver` | Custo estimado das rotas e relatório de custos |
| `transporte.custos.parametros` | Alterar os parâmetros do cálculo de custo |
| `transporte.manutencao.ver` | Fornecedores, ordens de serviço, manutenções previstas e gastos |
| `transporte.manutencao.gerir` | Gerir fornecedores, ordens, previsões e a quilometragem dos veículos |
| `transporte.audit` | Tela de auditoria do módulo |

Perfis (clonados por tenant a partir do tenant `systrat` pelo `ModuleRoleProvisioner`, semeados por `TransporteRbacSeeder`): **Coordenação** (`transporte_coordenacao`, todas), **Operador** (`transporte_operador`, tudo menos exceção de capacidade, edição do leiaute de importação, parâmetros de custo e auditoria; a Consulta não vê manutenção) e **Consulta** (`transporte_consulta`, só `view`).

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
- **Fila:** as importações usam uma conexão própria (`TRANSPORTE_IMPORTACAO_CONEXAO`, fila `TRANSPORTE_IMPORTACAO_FILA`, padrão `importacoes`), sem mexer nos jobs dos outros módulos. Sem a variável vale a conexão padrão: com `sync` o job roda dentro da requisição de confirmação. Com a conexão `redis` e um worker (`php artisan queue:work redis --queue=importacoes --timeout=1800 --tries=1`), roda em segundo plano e a tela acompanha o andamento. O job tem limite de 30 min; o `REDIS_QUEUE_RETRY_AFTER` precisa ser maior (use 2100). Se o worker morrer ou estourar o tempo, a importação vira **falha** e o arquivo é apagado, em vez de ficar eternamente "na fila".

## Importação do arquivo do Educacenso

Lê o arquivo do Censo Escolar (texto separado por `|`, registros 00 escola, 20 turma, 30 pessoa e 60 matrícula) e **reconhece, entre os alunos já cadastrados no Escola, os que declaram transporte escolar público**. **A escola e o aluno precisam estar cadastrados: a importação não cria escola, turma nem aluno.** Quem não está cadastrado vira pendência.

- **Fluxo:** (opcional) **Testar leiaute** com o arquivo → **prévia** (nada é gravado) → **confirmação** → relatório. O arquivo só fica no servidor entre a prévia e o fim (confirmação, cancelamento ou falha) e é apagado.
- **Reconhecimento do aluno**, nesta ordem: código Inep (`escola_alunos.inep_id`); CPF (Pessoas); nome e data de nascimento, só se houver **um único** aluno igual na escola (pode ser desligado na confirmação). Vários candidatos → `aluno_ambiguo`. A escola é achada pelo `inep` e a turma pelo `inep` da turma (turma não cadastrada é só aviso).
- **O que é gravado:** o `inep_id` do aluno, **quando está vazio**, e os campos "extras" (`transporte_censo_extras`: CEP, localização, sexo, cor etc.). Nome, turma e demais dados do aluno **nunca** são alterados. Pendências e divergências: `escola_nao_cadastrada`, `aluno_nao_cadastrado`, `aluno_ambiguo`, `inep_divergente`, `cpf_divergente` (código Inep de aluno que tem outro CPF), `escola_divergente`, `matricula_sem_identificador`.
- **Para o Transporte:** o resumo informa quantos alunos declaram transporte no Censo e **ainda não têm alocação ativa**.
- **Leiaute configurável:** o de fábrica é o **Educacenso 2023** (`Censo/Importacao/Educacenso2023.php`). O Inep muda as colunas todo ano, então o órgão, com `transporte.censo.leiaute`, pode **alterar a coluna** de um campo, **desativar** ("excluir") um campo nativo (reversível: "restaurar padrão"), **criar** campos próprios (guardados como extras do aluno, da escola ou da turma), **duplicar** o leiaute para o ano seguinte e definir o padrão. Campos necessários para reconhecer o aluno ficam travados (só a coluna muda). Só o que difere da fábrica fica salvo (`transporte_censo_leiautes.campos`).
- **As posições de 2023 vieram do código do SETE, não de um arquivo real do Inep** (o órgão não tem o arquivo). Use o **Testar leiaute** com o primeiro arquivo real e ajuste as colunas. As colunas de deficiência **não** vêm ativas (dado de saúde de criança); podem ser criadas como campo sensível.
- **LGPD:** CPF, nome, nascimento, cor, CEP e e-mail são "sensíveis": mascarados no teste, nunca em listagem. O relatório e a auditoria guardam contagens, número de linha e códigos Inep, **sem CPF, nome ou filiação**.
- **Segurança:** leitura linha a linha; até 50 MB, 1.000.000 de linhas, 64 KB por linha, 400 colunas e 1.000 caracteres por campo; arquivo binário é recusado. Sem a fila própria das importações (ver Fila, acima) a confirmação roda dentro da requisição, então arquivos muito grandes pedem o worker.

Crédito: o formato dos registros e as regras de leitura se baseiam no **SETE** (UFG/CECATE, https://github.com/marcosroriz/sete), licença **MIT**, Copyright (c) Marcos Roriz. Nenhum código foi copiado; a lógica foi reimplementada.

## Custos (estimativa)

Custo estimado de cada rota, por mês, por ano, por km e por aluno, a partir de **parâmetros que o órgão informa por ano**. **É uma estimativa: o modelo (estilo FNDE/GEIPOT, como o SETE o aplica) não foi conferido com a planilha oficial**, que o órgão não tem. Serve para comparar rotas e acompanhar contratos, não como valor oficial. As fórmulas estão em `Custo/CalculadoraCustoRota.php` (função pura, com casos conferidos à mão em `CustosTest`) e podem ser ajustadas quando houver referência.

- **Modal:** vem da tipologia do veículo da rota (7 a 10 = aquaviário; os demais, rodoviário). Rota sem veículo não tem cálculo.
- **Fixo mensal:** pessoal (salário × coeficiente de utilização × (1 + encargos)), administrativo, depreciação (soma dos dígitos dos anos, com valor residual; usa o ano de fabricação do veículo), remuneração do capital (capital médio × taxa) e seguro; no aquaviário, também manutenção. **Variável por km:** combustível, lubrificantes e, no rodoviário, rodagem e peças.
- **Calendário:** dias letivos por mês (20), meses letivos (10), viagens por dia (2, ida e volta) e meses de custo fixo (12) são parâmetros. O **km da rota é o de um percurso**. Custo do mês = fixo + variável × km do mês; custo do ano = fixo × 12 + variável × km do ano.
- **Parâmetros:** catálogo fixo (`Custo/Parametros.php`); o órgão edita valores por ano e pode copiar de um ano para outro. **Não há valor de referência para salário, preço ou consumo**: até serem informados, a rota aparece como **incompleta**, com a lista do que falta (nunca zero). Só as constantes do calendário vêm preenchidas.
- **Por aluno:** divide pelos alunos com alocação ativa; rota sem alunos tem custo por aluno **indefinido**, não zero.
- **Contratado × estimado:** rota com veículo locado ou terceirizado aceita o **custo contratado por mês**; a tela mostra a diferença e sinaliza quando passa do limite (parâmetro, padrão 10 %). Veículo próprio não tem custo contratado (422).
- **Características do trecho:** porteira, mata-burro, colchete, atoleiro e ponte rústica, no cadastro da rota e como filtro. São informativas: **não entram na fórmula**.
- **Simulação:** a consulta da rota aceita `simular[chave]=valor` e calcula com o valor trocado, sem salvar.
- **Relatório:** por rota, por escola e por empresa (só rotas completas entram nos totais) e CSV com neutralização de fórmula, auditado.

## Manutenção e fornecedores

- **Fornecedores** da frota (mecânica, combustível, seguro, peças, outros), sobre o Cadastro de Pessoas (pessoa jurídica pelo CNPJ). Não são as empresas de transporte: a mesma pessoa pode ser as duas. Fornecedor com ordem de serviço **não é excluído**, só inativado (409); fornecedor inativo não recebe ordem.
- **Ordens de serviço** por veículo (tipo, descrição, fornecedor opcional, abertura, conclusão, km, valor). Fluxo: **aberta → concluída ou cancelada**. Concluída ou cancelada **não é mais editada** (409): para corrigir, abre-se outra ordem. Concluir exige data não anterior à abertura e não futura, e quilometragem **não menor** que a do veículo; se maior, atualiza o hodômetro.
- **Veículo em manutenção:** enquanto há ordem aberta, o veículo aparece "em manutenção" e salvar uma rota com ele devolve `avisos` (a tela mostra um aviso). Isso **não impede** nada e **não torna a rota irregular**.
- **Manutenção prevista** por data, por quilometragem ou por ambas (exige ao menos uma). Gera alerta de **atenção** a 30 dias ou 500 km e **crítico** quando vencida, na tabela de alertas do Painel. O alerta por km depende do hodômetro do veículo estar atualizado. **Converter** abre uma ordem preventiva e marca a previsão como convertida; cancelar tira o alerta.
- **Quilometragem:** `km_atual` do veículo, atualizada pelas ordens ou na aba Manutenção. Reduzir exige confirmação ("correção do hodômetro") e a auditoria guarda o valor anterior e o novo.
- **Gastos do ano** (só ordens concluídas) por veículo, fornecedor e tipo; CSV das ordens do ano com neutralização de fórmula, auditado. O **histórico por veículo** (todas as ordens, com o total das concluídas) abre pelo ícone de histórico na aba Quilometragem e também está na API.
- **Fora de escopo:** abastecimento, anexos (nota fiscal), garagem georreferenciada.

## Rotas da API

| Método | Rota | Permissão |
|---|---|---|
| GET | `/opcoes` | view (listas de apoio e permissões do usuário) |
| GET | `/alertas`, `/painel?ano_letivo=` | view (o resumo de custo só vem com `custos.ver` e com um ano escolhido) |
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
| GET/POST | `/censo/importacao/leiautes` (POST duplica) | censo.importar ou censo.leiaute / censo.leiaute |
| GET/PUT/DELETE | `/censo/importacao/leiautes/{id}`; `POST .../restaurar`, `.../padrao` | idem / censo.leiaute |
| POST | `/censo/importacao/testar`, `/censo/importacao/previa` (arquivo, `leiaute_id`) | censo.importar |
| GET/PUT | `/custos/parametros?ano=` (PUT: `ano`, `valores`; vazio apaga) | custos.ver / custos.parametros |
| POST | `/custos/parametros/copiar` (`de`, `para`, `sobrescrever`) | custos.parametros |
| GET | `/custos/rotas?ano=`, `/custos/rotas/{rota}` (`simular[chave]=`) | custos.ver |
| GET | `/custos/relatorio?ano=`, `/custos/relatorio/csv?ano=` (`escola_id`, `empresa_id`, `modal`) | custos.ver |
| GET/POST/PUT/DELETE | `/fornecedores` | manutencao.ver / manutencao.gerir |
| GET/POST/PUT | `/ordens-servico` (`veiculo_id`, `status`, `ano`), `POST .../{id}/concluir`, `.../cancelar` | idem |
| GET/POST | `/manutencoes-previstas` (`status`), `POST .../{id}/cancelar`, `.../converter` | idem |
| PUT | `/veiculos/{id}/quilometragem` (`km`, `confirmar_reducao`) | manutencao.gerir |
| GET | `/veiculos/{id}/manutencao`, `/manutencao/gastos?ano=`, `/manutencao/gastos/csv?ano=` | manutencao.ver |
| GET | `/importacoes/modelo/{tipo}` | frota.manage / rotas.manage |
| POST | `/importacoes/{tipo}/previa`, `/importacoes/{id}/confirmar` (Censo: `casar_por_nome`) | idem (Censo: censo.importar) |
| GET/DELETE | `/importacoes/{id}` | idem |

Erros de regra: `409` (conflito: placa/CNH repetida, capacidade, regularidade, item em uso) e `422` (dado inválido). O corpo é `{"error": "..."}`.

## Telas (`apps/web-client/src/modules/transporte`)

Painel · Rotas (itinerário e mapa Leaflet, alunos da rota com ocupação) · Paradas · Veículos (vistorias) · Motoristas · Empresas · Manutenção (ordens de serviço, manutenção prevista, quilometragem, fornecedores e gastos) · Custos (custo das rotas, parâmetros e relatório) · Censo (Exportar, Importar do Educacenso e Leiaute de importação, conforme a permissão) · Auditoria. Escritas com `@sysgov/ui`. Importar CSV nas telas de Veículos, Motoristas e Paradas. A ocupação e a irregularidade aparecem sempre com **texto**, não só com cor.

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
- O código Inep da turma ainda só entra pela tela do Escola; o do aluno também pode ser preenchido pela importação do Educacenso.
- Os custos não foram conferidos com a planilha oficial (ver Custos).
- A manutenção não cobre abastecimento nem anexos de nota fiscal.
- O mapeamento das colunas do Educacenso 2023 não foi conferido com arquivo real (ver Importação do arquivo do Educacenso).
- Conferência no navegador das telas (tarefa 5.2 de cada fase) pendente: depende de login.
- Concorrência de alocação: o `lockForUpdate` só é exercitado no MySQL; os testes (SQLite) cobrem a regra, não a corrida.
