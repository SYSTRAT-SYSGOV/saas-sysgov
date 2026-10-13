# Spec: campanha

> Criada a partir da mudança `campanha-politica-fundacao` (Fase 1 — CRM de campanha política), arquivada em 2026-10-03.
> Fonte: apps/api/Modules/Campanha, apps/web-client/src/modules/campanha, docs/modules/campanha.md

## Purpose

CRM de campanha política no SYSGOV: campanhas por candidato com acesso por membro, base territorial pública
(IBGE/TSE) por UF, municípios trabalhados pela campanha, painel com mapa interativo e equipes de campo.

## Requirements

### Requirement: Permissões e perfis do módulo Campanha
O módulo SHALL declarar as permissões `campanha.view`, `campanha.gestao.manage` (campanhas, membros, candidato e
configuração), `campanha.municipios.manage` (dados do município na campanha), `campanha.equipes.manage`
(coordenadores, cabos eleitorais, prefeitos e vereadores), `campanha.eleitores.view` (ver os dados pessoais dos
eleitores captados), `campanha.eleitores.manage` (links de captação, exportação e exclusão de eleitores),
`campanha.demandas.manage` (demandas), `campanha.materiais.manage` (materiais e remessas), `campanha.financeiro.view`
(ver o livro-caixa e os comprovantes), `campanha.financeiro.manage` (lançar, alterar e excluir no livro-caixa),
`campanha.agenda.manage` (eventos, reuniões e visitas) e `campanha.pesquisas.manage` (pesquisas eleitorais), e
provisionar os perfis **Coordenação Geral de Campanha** (todas, acessa todas as campanhas do tenant),
**Coordenação de Campanha** (`view`, municípios, equipes, eleitores, demandas, materiais, agenda e pesquisas, sem o
financeiro, só nas campanhas de que é membro), **Financeiro de Campanha** (`view` e o financeiro, só nas campanhas
de que é membro) e **Consulta de Campanha** (`view`, sem dados pessoais de eleitores e sem o financeiro). Toda
autorização SHALL ser feita no servidor.

#### Scenario: Consulta não altera
- **WHEN** um usuário com o perfil Consulta de Campanha tenta mudar a situação de um município
- **THEN** o sistema responde 403

#### Scenario: Módulo não habilitado
- **WHEN** um usuário de um tenant sem o módulo Campanha habilitado chama qualquer rota do módulo
- **THEN** o sistema responde 403

#### Scenario: Consulta não vê dados pessoais de eleitores
- **WHEN** um usuário com o perfil Consulta de Campanha pede a lista de eleitores
- **THEN** o sistema responde 403, mas o painel mostra a ele os totais de eleitores captados e o mapa de calor

#### Scenario: Coordenação não vê o financeiro
- **WHEN** um usuário com o perfil Coordenação de Campanha pede o livro-caixa ou um comprovante financeiro
- **THEN** o sistema responde 403

#### Scenario: Perfil Financeiro lança
- **WHEN** um usuário com o perfil Financeiro de Campanha, membro da campanha, registra uma despesa
- **THEN** o lançamento é gravado, mas ele recebe 403 ao tentar alterar um município ou uma equipe

### Requirement: Campanhas e candidato
O tenant SHALL poder cadastrar várias campanhas (nome, ano da eleição, cargo, UF de atuação, meta global de votos e
status ativa/encerrada). Cada campanha SHALL ter um único candidato, identificado pelo CPF e ligado ao Cadastro de
Pessoas do tenant (a pessoa é encontrada ou criada pelo CPF), com nome de urna, partido, número, coligação, contatos,
redes sociais, biografia e votos/cargo da eleição anterior. O CPF SHALL ser válido e nunca SHALL ser devolvido
completo pela API. Campanha encerrada SHALL continuar consultável, mas não aceita alterações.

#### Scenario: Dois candidatos no mesmo tenant
- **WHEN** a Coordenação Geral cadastra a campanha "Deputado Estadual 2026" do candidato A e a campanha "Deputado
  Federal 2026" do candidato B
- **THEN** as duas campanhas existem no tenant, cada uma com seu candidato, seus municípios e suas equipes

#### Scenario: CPF inválido
- **WHEN** o candidato é cadastrado com um CPF de dígitos verificadores inválidos
- **THEN** o sistema recusa com mensagem de CPF inválido

#### Scenario: Campanha encerrada
- **WHEN** um usuário tenta alterar a meta de um município de uma campanha encerrada
- **THEN** o sistema responde 422 informando que a campanha está encerrada

### Requirement: Campanha de trabalho e acesso por membro
Toda rota de dados de campanha SHALL operar sobre uma campanha de trabalho, informada a cada requisição. O usuário
SHALL acessar apenas as campanhas de que é membro, salvo quem tem a Coordenação Geral (todas as do tenant). Os
membros SHALL ser escolhidos entre os usuários do tenant (Usuários & Acessos). Todo registro de campanha SHALL
pertencer a uma única campanha e nunca SHALL aparecer em outra.

#### Scenario: Usuário fora da campanha
- **WHEN** um coordenador membro só da campanha A pede os municípios da campanha B
- **THEN** o sistema responde 403

#### Scenario: Dados não cruzam campanhas
- **WHEN** a campanha A marca Curitiba como "consolidado" com meta de 5.000 votos
- **THEN** Curitiba na campanha B continua com a sua própria situação e meta

#### Scenario: Campanha de outro tenant
- **WHEN** a requisição informa uma campanha de outro tenant
- **THEN** o sistema responde como inexistente

### Requirement: Base territorial pública por UF
O sistema SHALL manter, por UF e compartilhada entre os tenants (só leitura para eles), a base de municípios com
código IBGE, nome, mesorregião, região intermediária e imediata, população estimada (com o ano de referência),
eleitorado, quantidade de zonas e de seções (com o ano de referência), prefeito e vice eleitos com partido e a
malha geográfica de cada município. A base SHALL ser carregada e atualizada por importação das fontes abertas
oficiais (IBGE e TSE), sem digitação, registrando a data da última atualização e os municípios que não puderam
ser associados entre as fontes. Atualizar a base SHALL não apagar nem alterar os dados que as campanhas registraram
sobre os municípios.

#### Scenario: Paraná carregado
- **WHEN** a importação do Paraná termina
- **THEN** a base tem os 399 municípios do PR, cada um com código IBGE, população, eleitorado e malha

#### Scenario: Atualização preserva a campanha
- **WHEN** a base do PR é importada de novo com a população atualizada
- **THEN** a população muda e a situação, a meta e o coordenador de cada município nas campanhas continuam iguais

#### Scenario: Município sem correspondência no TSE
- **WHEN** um município do IBGE não é encontrado nos dados do TSE durante a importação
- **THEN** ele fica na base sem eleitorado e aparece no relatório da importação como não associado

### Requirement: Municípios na campanha
Cada campanha SHALL trabalhar com todos os municípios da sua UF, com, por município: situação política
(`sem_atuacao`, `em_andamento`, `consolidado`, `prioritario`, `risco`; padrão `sem_atuacao`), meta de votos,
votos na eleição anterior, coordenador responsável (da própria campanha), potencial eleitoral, histórico e
observações. A lista SHALL permitir filtrar por situação, região e coordenador e buscar pelo nome.

#### Scenario: Município sem dados da campanha
- **WHEN** a campanha nunca registrou nada sobre um município
- **THEN** ele aparece como "sem atuação", meta zero e sem coordenador

#### Scenario: Coordenador de outra campanha
- **WHEN** a requisição atribui ao município um coordenador cadastrado em outra campanha
- **THEN** o sistema recusa com erro de validação

### Requirement: Mapa interativo da campanha
O painel SHALL exibir o mapa dos municípios da UF da campanha com três camadas selecionáveis:
**Situação Política** (cor da situação), **Apoio de Prefeito** (aliado, neutro, oposição ou sem informação) e
**Meta de Votos** (faixas de meta configuradas; meta zero como "sem meta"). Cada camada SHALL ter legenda. Ao
passar o mouse, o mapa SHALL mostrar o nome do município e os dados da camada (situação e coordenador; prefeito,
vice e relação; meta e coordenador). Ao clicar, SHALL abrir a ficha do município. O mapa SHALL refletir os dados
gravados, sem precisar recarregar a página depois de uma alteração feita na ficha.

#### Scenario: Camada de meta por faixas
- **WHEN** as faixas são "até 100", "até 250" e "acima de 250" e Londrina tem meta de 300 votos
- **THEN** na camada Meta de Votos Londrina aparece com a cor da faixa "acima de 250"

#### Scenario: Prefeito sem relação registrada
- **WHEN** a campanha não registrou a relação com o prefeito de um município
- **THEN** na camada Apoio de Prefeito o município aparece como "sem informação", com o nome do prefeito eleito na dica

#### Scenario: Clique abre a ficha
- **WHEN** o usuário clica em Rio Branco do Ivaí no mapa
- **THEN** abre a ficha de Rio Branco do Ivaí da campanha de trabalho

### Requirement: Ficha do município
A ficha SHALL reunir os dados públicos (IBGE/TSE, só leitura), os dados do município na campanha (editáveis por
quem tem `campanha.municipios.manage`), o prefeito e a relação com a campanha, os vereadores, os cabos eleitorais e
o coordenador. Os indicadores do painel SHALL contar municípios por situação, coordenadores, cabos eleitorais,
prefeitos aliados e vereadores aliados da campanha.

#### Scenario: Alterar a situação na ficha
- **WHEN** a Coordenação de Campanha muda a situação de Ponta Grossa para "prioritário" na ficha
- **THEN** a alteração é gravada com auditoria e Ponta Grossa aparece com a cor de "prioritário" no mapa

### Requirement: Coordenadores e cabos eleitorais
A campanha SHALL cadastrar coordenadores (estadual, regional ou municipal, com município ou região de atuação,
meta de votos e contatos) e cabos eleitorais (município, bairro, coordenador, votos estimados, área de atuação,
disponibilidade, veículo próprio, ajuda de custo em centavos, chave Pix e contatos). Pessoas com CPF SHALL ser
ligadas ao Cadastro de Pessoas; o CPF nunca SHALL ser devolvido completo. Excluir SHALL ser lógico; coordenador com
municípios ou cabos vinculados SHALL ter os vínculos desfeitos antes de sair.

#### Scenario: Cabo no município de outra UF
- **WHEN** a requisição cadastra um cabo eleitoral num município fora da UF da campanha
- **THEN** o sistema recusa com erro de validação

#### Scenario: Excluir coordenador com vínculos
- **WHEN** a requisição exclui um coordenador responsável por três municípios
- **THEN** o sistema recusa informando os municípios vinculados

### Requirement: Prefeitos e vereadores
A campanha SHALL registrar, por município, a relação com o prefeito (`aliado`, `neutro`, `oposicao`), a influência
(alta, média, baixa), contatos e observações — o nome, o vice e o partido vêm da base pública. A campanha SHALL
cadastrar vereadores por município (nome, partido, número, contatos, aliado, votos estimados, dobradinha e apoios
declarados a outros cargos). Os indicadores de "aliados" SHALL contar só os marcados como aliados.

#### Scenario: Prefeito aliado no mapa
- **WHEN** a campanha registra o prefeito de Maringá como aliado
- **THEN** Maringá aparece como "aliado" na camada Apoio de Prefeito e soma nos prefeitos aliados do painel

### Requirement: Configuração das cores e faixas
A campanha SHALL configurar a cor de cada situação política e até nove limites de faixa de meta de votos, em ordem
crescente, cada faixa com sua cor (a última faixa vale acima do último limite). Limites fora de ordem SHALL ser
recusados.

#### Scenario: Faixas fora de ordem
- **WHEN** a configuração informa os limites 250 e depois 100
- **THEN** o sistema recusa informando que os limites devem ser crescentes

### Requirement: Isolamento e auditoria do módulo Campanha
Todo dado de campanha SHALL pertencer a um tenant e a uma campanha; registros de outro tenant ou de outra campanha
SHALL responder como inexistentes. Toda alteração SHALL ser registrada na auditoria (antes/depois, usuário, IP) e
publicar um evento de domínio.

#### Scenario: Registro de outra campanha pela URL
- **WHEN** um usuário da campanha A pede pela URL um cabo eleitoral da campanha B
- **THEN** o sistema responde 404

### Requirement: Links de captação de eleitores
A campanha SHALL gerar links de captação, cada um ligado a um coordenador ou cabo eleitoral da própria campanha, com
um código público imprevisível, um QR Code e um cartão para impressão. O link SHALL poder ser desativado; link
desativado ou de campanha encerrada SHALL recusar novos cadastros. A tela SHALL mostrar quantos eleitores cada link
captou.

#### Scenario: Link desativado
- **WHEN** um eleitor abre o formulário por um link que a coordenação desativou
- **THEN** o formulário informa que o link não está mais ativo e não aceita o cadastro

#### Scenario: Responsável de outra campanha
- **WHEN** a requisição cria um link para um cabo eleitoral de outra campanha
- **THEN** o sistema recusa com erro de validação

### Requirement: Cadastro público de eleitor com consentimento LGPD
O formulário aberto pelo link SHALL funcionar sem login e mostrar o candidato, quem indicou e o termo de privacidade
da campanha (finalidade, base legal, contato do encarregado e direitos do titular). Ele SHALL pedir nome, município
(da UF da campanha) e bairro; zona, seção, WhatsApp, data de nascimento, principal demanda e a localização do
aparelho SHALL ser opcionais. O cadastro SHALL exigir o aceite explícito do termo (caixa não marcada por padrão) e
SHALL guardar a prova do consentimento: versão do termo, data e hora, IP e navegador. Um segundo cadastro com o mesmo
WhatsApp na mesma campanha SHALL atualizar o anterior em vez de duplicar. O formulário SHALL ter limite de envios por
IP e proteção contra robôs. O formulário nunca SHALL devolver dados de outros eleitores.

#### Scenario: Cadastro sem aceite
- **WHEN** o eleitor envia o formulário sem marcar o consentimento
- **THEN** o sistema recusa e nada é gravado

#### Scenario: Cadastro com localização
- **WHEN** o eleitor permite a localização, aceita o termo e envia
- **THEN** o cadastro fica na campanha do link, com o responsável que indicou, a prova do consentimento e o ponto no mapa de calor

#### Scenario: Mesmo WhatsApp
- **WHEN** o mesmo WhatsApp é cadastrado de novo pelo formulário da mesma campanha
- **THEN** o cadastro existente é atualizado e o total de eleitores não aumenta

#### Scenario: Excesso de envios
- **WHEN** o mesmo IP envia mais cadastros do que o limite por minuto
- **THEN** o sistema responde 429

### Requirement: Base de eleitores com acesso restrito
O painel SHALL listar os eleitores captados da campanha de trabalho com filtros por município, bairro, responsável e
período, só para quem tem `campanha.eleitores.view`. A exportação em CSV e a exclusão a pedido do titular SHALL
exigir `campanha.eleitores.manage` e SHALL ser registradas na auditoria. A exclusão a pedido SHALL apagar
definitivamente os dados do eleitor. Os indicadores agregados (total, por município, por responsável) SHALL estar
disponíveis com `campanha.view`.

#### Scenario: Exportação auditada
- **WHEN** a Coordenação Geral exporta os eleitores da campanha
- **THEN** recebe o CSV e a exportação fica registrada na auditoria com o usuário e a quantidade de registros

#### Scenario: Exclusão a pedido do titular
- **WHEN** a coordenação exclui um eleitor a pedido dele
- **THEN** o registro é apagado definitivamente, sai do mapa de calor e a exclusão fica na auditoria sem os dados pessoais

### Requirement: Anonimização dos eleitores após o encerramento da campanha
Ao encerrar a campanha, o sistema SHALL registrar a data de encerramento. Passado o prazo de retenção da campanha
(padrão 90 dias, configurável), uma rotina diária SHALL anonimizar os eleitores dela: nome, WhatsApp, data de
nascimento, demanda escrita, IP e navegador SHALL ser apagados; município, bairro, zona, seção, data do cadastro e o
ponto do mapa de calor (com precisão reduzida) SHALL permanecer para estatística. Reabrir a campanha antes do prazo
SHALL cancelar a anonimização. Excluir a campanha SHALL apagar definitivamente os eleitores dela; eleitores que ainda
estejam guardados de uma campanha excluída SHALL ser anonimizados pela rotina diária.

#### Scenario: Prazo vencido
- **WHEN** a rotina roda 91 dias depois do encerramento de uma campanha com prazo de 90 dias
- **THEN** os eleitores dela ficam sem nome, WhatsApp e nascimento, e o total por município continua o mesmo

#### Scenario: Ainda no prazo
- **WHEN** a rotina roda 30 dias depois do encerramento
- **THEN** nada é anonimizado e a exportação continua disponível

#### Scenario: Campanha excluída
- **WHEN** a Coordenação Geral exclui uma campanha que tem eleitores captados
- **THEN** os eleitores dela são apagados definitivamente e a exclusão fica na auditoria com a quantidade

### Requirement: Camada de mapa de calor
O mapa do painel SHALL oferecer a camada **Mapa de calor (eleitores)**, que mostra a concentração dos eleitores
captados com localização, sobre a malha dos municípios da UF. Os pontos enviados ao navegador SHALL ter as coordenadas
arredondadas e nenhum dado pessoal. Um mapa de ruas SHALL poder ser ligado pelo usuário; sem ele, nenhuma requisição
SHALL ir a servidores de mapa externos.

#### Scenario: Pontos sem dado pessoal
- **WHEN** o painel pede os pontos do mapa de calor
- **THEN** recebe só latitude e longitude arredondadas (e o peso), sem nome, WhatsApp ou identificador do eleitor

### Requirement: Demandas da campanha
A campanha SHALL registrar demandas por município, com solicitante, categoria (saúde, infraestrutura, segurança,
educação, emenda parlamentar, ofício, outra), prioridade (alta, média, baixa), responsável entre os membros da
campanha, prazo, status (`pendente`, `em_andamento`, `concluida`) e descrição/histórico. A demanda escrita por um
eleitor no formulário SHALL poder ser transformada em demanda, ligada a ele. A lista SHALL filtrar por município,
status, prioridade e responsável e destacar as atrasadas.

#### Scenario: Demanda vinda do formulário
- **WHEN** a coordenação transforma em demanda o pedido escrito por um eleitor de Londrina
- **THEN** a demanda nasce pendente em Londrina, com o eleitor como solicitante e o texto do pedido

#### Scenario: Responsável fora da campanha
- **WHEN** a requisição atribui a demanda a um usuário que não é membro da campanha nem da coordenação geral
- **THEN** o sistema recusa com erro de validação

### Requirement: Materiais de campanha e estoque
A campanha SHALL cadastrar materiais com tipo (santinho, folder, adesivo, bandeira, praguinha, cartaz, banner, faixa,
cavalete, perfurado, jornal, revista, envelope, camiseta, boné, caneta, brinde, outro), nome, fornecedor/gráfica,
unidade de medida, quantidade produzida, valor total do lote em centavos (o valor unitário é calculado), peso e
volume unitários, observações e imagem.
O estoque SHALL ser a quantidade produzida menos as remessas registradas. Ao cadastrar o material, a coordenação SHALL
poder pedir o lançamento automático da despesa (valor total do lote) no livro-caixa, o que exige também a
permissão do financeiro.

#### Scenario: Estoque após remessas
- **WHEN** um material com 10.000 unidades produzidas recebe remessas de 3.000 e 2.500
- **THEN** o estoque mostrado é 4.500

#### Scenario: Despesa automática
- **WHEN** a Coordenação Geral cadastra 5.000 adesivos por R$ 1.500,00 pedindo o lançamento no financeiro
- **THEN** o livro-caixa ganha uma despesa de R$ 1.500,00 na categoria Publicidade e gráfica, ligada ao material

#### Scenario: Despesa automática sem permissão do financeiro
- **WHEN** um usuário da Coordenação de Campanha cadastra um material pedindo o lançamento no financeiro
- **THEN** o sistema recusa com erro de validação e nada é gravado

### Requirement: Logística de distribuição
A campanha SHALL registrar remessas de material para um município da UF, com coordenador ou cabo eleitoral da
campanha (opcionais), quantidade, data de envio, transportadora, motorista, veículo e placa, previsão de entrega e
observações. A remessa SHALL ser recusada se a quantidade passar do estoque. A entrega SHALL poder ser confirmada com
quem recebeu, a data e uma foto. Excluir uma remessa SHALL devolver a quantidade ao estoque.

#### Scenario: Remessa acima do estoque
- **WHEN** a requisição envia 6.000 unidades de um material com estoque de 4.500
- **THEN** o sistema recusa com erro de validação e o estoque não muda

#### Scenario: Entrega confirmada
- **WHEN** a coordenação confirma a entrega de uma remessa em Londrina informando quem recebeu e a foto
- **THEN** a remessa aparece como entregue, com a foto disponível para quem tem a permissão de materiais

### Requirement: Livro-caixa com os campos da prestação de contas
A campanha SHALL registrar lançamentos de **receita** e **despesa** com categoria, valor em centavos, data, forma de
pagamento (PIX, transferência, dinheiro, cartão, cheque, estimável), centro de custo (um município da UF ou a
campanha geral), nome e CPF/CNPJ do doador ou fornecedor (validado), origem do recurso (recursos próprios, pessoa
física, partido político, FEFC, Fundo Partidário, financiamento coletivo, outros), número do recibo eleitoral (nas
receitas), tipo e número do documento fiscal (nas despesas) e observações. O painel do financeiro SHALL mostrar
receitas, despesas e saldo, com totais por categoria, origem do recurso e município, e filtros por período, tipo,
categoria, origem e município. A exportação em planilha (CSV) SHALL trazer os campos da prestação de contas e SHALL
ficar registrada na auditoria. O sistema não gera o arquivo do SPCE.

#### Scenario: Saldo
- **WHEN** a campanha tem R$ 50.000,00 em receitas e R$ 32.450,75 em despesas
- **THEN** o painel do financeiro mostra saldo de R$ 17.549,25, calculado em centavos

#### Scenario: CPF/CNPJ inválido
- **WHEN** a requisição registra uma doação de pessoa física com CPF inválido
- **THEN** o sistema recusa com erro de validação

#### Scenario: Exportação para a prestação de contas
- **WHEN** o Financeiro de Campanha exporta os lançamentos de setembro
- **THEN** recebe o CSV com data, tipo, categoria, origem do recurso, nome e CPF/CNPJ, recibo ou documento fiscal,
  forma de pagamento e valor, e a exportação fica na auditoria

### Requirement: Comprovantes anexados
Lançamentos financeiros, materiais (imagem) e entregas de remessa (foto) SHALL aceitar um arquivo PDF ou imagem de
até 10 MB, guardado em armazenamento privado. O arquivo SHALL ser baixado só por quem tem a permissão do recurso
(financeiro para comprovantes; materiais para imagens e fotos), pela própria API; nunca por um endereço público.

#### Scenario: Comprovante protegido
- **WHEN** um usuário sem `campanha.financeiro.view` pede o comprovante de uma despesa
- **THEN** o sistema responde 403

#### Scenario: Tipo de arquivo recusado
- **WHEN** a requisição anexa um arquivo executável a uma despesa
- **THEN** o sistema recusa com erro de validação

### Requirement: Agenda de eventos, reuniões e visitas
A campanha SHALL registrar **eventos** (nome, município, local, data e hora, responsável entre os membros, público
estimado e presente, observações), **reuniões** (título, município, local, data e hora, participantes, ata,
pendências, responsável e prazo das pendências) e **visitas de campo** (liderança visitada, município, bairro, data,
assunto, resultado e encaminhamento). A agenda SHALL filtrar por período, município e tipo e destacar as reuniões com
pendências vencidas. O painel SHALL mostrar os próximos compromissos. O encaminhamento de uma visita SHALL poder virar
uma demanda pendente no município da visita, com a liderança como solicitante.

#### Scenario: Visita vira demanda
- **WHEN** a coordenação transforma em demanda o encaminhamento de uma visita à associação de moradores de Maringá
- **THEN** a demanda nasce pendente em Maringá, com a associação como solicitante e o texto do encaminhamento

#### Scenario: Próximos compromissos
- **WHEN** a campanha tem um evento amanhã e uma reunião daqui a três dias
- **THEN** o painel lista os dois em ordem de data

### Requirement: Pesquisas eleitorais
A campanha SHALL registrar pesquisas **internas** e **externas** com instituto, data de divulgação, abrangência
(estadual ou um município da UF), margem de erro, tamanho da amostra, número de registro no TSE (opcional) e
**resultados estruturados** (nome, partido e percentual de cada candidato, marcando o candidato da campanha). Os
percentuais SHALL estar entre 0 e 100 e a soma não SHALL passar de 100. A tela SHALL mostrar o gráfico da evolução do
candidato da campanha ao longo das pesquisas, por abrangência.

#### Scenario: Soma acima de 100
- **WHEN** a requisição registra uma pesquisa cujos percentuais somam 104%
- **THEN** o sistema recusa com erro de validação

#### Scenario: Evolução do candidato
- **WHEN** há três pesquisas estaduais com o candidato da campanha em 8%, 11% e 14%
- **THEN** o gráfico mostra a evolução na ordem das datas
