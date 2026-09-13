

## PREFEITURA MUNICIPAL DE ARAUCÁRIA • SYSGOV
## PRD — MÓDULO DE AVALIAÇÃO DE
## DESEMPENHO
Documento de Requisitos de Produto para Gestão e Execução de Avaliações Funcionais
13 de setembro de 2026

- Controle do Documento
Este Documento de Requisitos de Produto (PRD) especifica integralmente as funcionalidades, regras negociais,
integrações e parâmetros técnicos do Módulo de Avaliação de Desempenho da plataforma SYSGOV, desenvolvido
para atender às particularidades do Poder Executivo da Prefeitura Municipal de Araucária/PR.
Autor: Equipe de Produto SYSGOV
## Versão: 1.0
Status: Aprovado para Desenvolvimento
1.1 Histórico de Revisões
Versão Data Autor Descrição das Alterações
0.1 10/08/2026 Equipe de Produto SYSGOV Estruturação preliminar dos
requisitos e consolidação das
Leis 1.704/2006 e
## 1.835/2008.
0.9 28/08/2026 Equipe de Produto SYSGOV Inclusão dos fluxos de CIT,
matriz de permissões e
critérios de cálculo de
progressão.
1.0 13/09/2026 Equipe de Produto SYSGOV Versão final homologada
para o ciclo de
desenvolvimento e
integração com o
ecossistema SYSGOV.




1.2 Registro de Aprovadores
Nome / Função Área / Representação Data de Aprovação
Gestão de Produto SYSGOV Engenharia e Arquitetura de Software 13/09/2026
Comissão Central de Avaliação de
## Desempenho
Secretaria Municipal de Gestão de
Pessoas (SMGP)
## 13/09/2026
Diretoria de Recursos Humanos Prefeitura Municipal de Araucária 13/09/2026

- Visão Geral do Produto
O Módulo de Avaliação de Desempenho do SYSGOV é o componente central para a gestão de competências,
apuração de mérito e suporte às progressões funcionais e promoções dos servidores públicos municipais da
Prefeitura de Araucária/PR. Projetado como um módulo nativo da plataforma corporativa SYSGOV, a solução elimina
controles descentralizados e implementa uma esteira totalmente digital, auditável e juridicamente fundamentada.
2.1 Posicionamento e Proposta de Valor
"Prover à Administração Pública de Araucária uma plataforma integrada, parametrizável e inviolável para apuração
do desempenho funcional, garantindo o cumprimento estrito das Leis Municipais nº 1.704/2006 e nº 1.835/2008, a
justiça meritocrática nas progressões de carreira e o fortalecimento da cultura de feedback fundamentado em
evidências."
2.2 Escopo do Produto
Dentro do Escopo (In Scope) Fora do Escopo (Out of Scope)
Gestão e parametrização de ciclos avaliativos para o Quadro
Geral e Quadro do Magistério (QPMA).
Processamento e emissão final da folha de pagamento
(atribuição do Módulo de Folha).
Formulários de Avaliação 90° e suporte ao canal de avaliação
pelo usuário do serviço público.
Gestão de concursos públicos e admissão de novos servidores.
Metodologia de Escala Gráfica configurável com ponderação
por fatores funcionais.
Processamento de aposentadorias e pensões previdenciárias.
Módulo operacional de Diário de Bordo fundamentado na
Técnica de Incidentes Críticos (CIT).
Instrução de Processos Administrativos Disciplinares (PAD)
externos ao ciclo avaliativo.
Cálculo automático de notas, consolidação de conceitos e
apuração de elegibilidade para progressão.
Gestão de benefícios sociais e consignações financeiras.
Fluxos de devolutiva, formalização de Planos de Melhoria de
Desempenho (PMD) e recursos administrativos.
Controle físico de ponto eletrônico biométrico (consumido via
integração de dados).


- Problema que o Módulo Resolve
O modelo histórico de condução das avaliações funcionais no âmbito municipal deparava-se com severos gargalos
operacionais e vulnerabilidades jurídicas decorrentes do uso intensivo de formulários físicos, planilhas dispersas e
controles paralelos:
● Descentralização e Perda de Prazos: Dificuldade crônica em monitorar a adesão aos ciclos avaliativos em
secretarias descentralizadas, gerando passivos funcionais e atrasos em progressões estatutárias.
● Falta de Evidências e Subjetividade: Ausência de registros contínuos ao longo do período avaliativo,
transformando a avaliação em um evento isolado suscetível a vieses de memória (efeito de recência) e
favorecimentos indevidos.
● Insegurança Jurídica: Risco de inconsistências na aplicação cumulativa de critérios previstos no art. 25 da Lei
Municipal nº 1.704/2006 e nos arts. 35 a 40 da Lei Municipal nº 1.835/2008.
● Sobrecarga Operacional do RH: Necessidade de consolidação manual de milhares de notas, conferência
individual de elegibilidade e cálculo de médias para instrução dos processos de progressão funcional.

- Objetivos e Indicadores de Sucesso
4.1 Objetivos de Negócio e Usuário
● Conformidade Legal Rigorosa: Assegurar 100% de conformidade com os regimes estatutários municipais
(Leis 1.704/2006 e 1.835/2008, e Decreto nº 39.132/2023).
● Fundamentação por Evidências: Instrumentar os gestores com a metodologia CIT para sustentação técnica
de cada pontuação atribuída.
● Celeridade e Transparência: Reduzir o tempo de consolidação de ciclos e dar visibilidade ao servidor quanto
ao seu desempenho e carreira.
4.2 Indicadores-Chave de Desempenho (KPIs)
Indicador (KPI) Fórmula / Método de Medição Meta Estabelecida
Taxa de Conclusão do Ciclo (Avaliações concluídas e assinadas /
Total de avaliações abertas) × 100
≥ 98,0% dentro do prazo
Índice de Aderência ao CIT (Avaliações com ao menos 1 incidente
registrado / Total de avaliações) × 100
≥ 85,0% dos formulários
Tempo Médio de Consolidação Intervalo em dias entre o fechamento
da fase de notas e a homologação final
≤ 5 dias úteis
Taxa de Recursalidade Procedimental (Recursos fundamentados em vício
formal / Total de avaliados) × 100
≤ 2,0% dos servidores


- Perfis de Usuário e Matriz de Personas
Perfil de Usuário Papel e Responsabilidades Principais Dores / Necessidades
Servidor Avaliado Acompanha seu desempenho, registra
manifestações, assina formulários,
elabora PMD e interpõe recursos.
Necessita de transparência nos critérios,
clareza no feedback e acesso facilitado
aos registros de sua carreira.
Superior Imediato (Avaliador) Registra incidentes no CIT, preenche
avaliações 90°, conduz devolutivas e
pactua metas de melhoria.
Sofre com acúmulo de fichas manuais;
precisa de histórico contínuo para evitar
julgamentos puramente subjetivos.
Comissão de Avaliação Parametriza fatores, pesos e
formulários; monitora o ciclo; julga
recursos e homologa resultados finais.
Necessita de painel analítico
centralizado, bloqueio a fraudes de
prazo e rastreabilidade total de
retificações.
Gestão de Pessoas / RH Gera ciclos, valida elegibilidade,
consolida resultados e integra notas
com a progressão funcional e folha.
Demanda automatização no cálculo das
progressões de 10% (Lei 1.704/2006) e
progressões horizontais/verticais (Lei
## 1.835/2008).
Gestor da Secretaria Acompanha indicadores de
desempenho da pasta, visualiza mapas
de competência e identifica gargalos.
Precisa de relatórios executivos para
orientar programas de capacitação e
alocação de pessoal.
Administrador do Sistema Configura permissões de acesso,
auditoria, regras de autenticação e
manutenções de infraestrutura.
Requer trilhas de auditoria imutáveis e
gerenciamento granular de acessos em
conformidade com a LGPD.
Auditoria / Controle Interno Inspeciona a regularidade jurídica dos
processos avaliativos e apura
conformidade orçamentária (art. 38).
Demanda relatórios de auditoria com
carimbo de tempo, histórico de versões
e verificação de impedimentos.

## 6. Requisitos Funcionais
● RF-01: Gestão de Ciclos Avaliativos [Must Have] — O sistema deve permitir a criação, abertura, prorrogação
controlada e encerramento de ciclos avaliativos anuais ou periódicos, segmentando automaticamente os
servidores por carreira (Quadro Geral e QPMA). Critério de Aceite: Impedir abertura de múltiplos ciclos
ordinários sobrepostos para o mesmo vínculo funcional.
● RF-02: Parametrização de Fatores e Pesos [Must Have] — O sistema deve permitir a configuração modular
de fatores de avaliação, permitindo associar os critérios obrigatórios da Lei 1.704/2006 (art. 25, 'a' a 'h') e da
Lei 1.835/2008, com definição de pesos percentuais customizados por cargo. Critério de Aceite: A somatória
dos pesos configurados por formulário deve totalizar compulsoriamente 100%.
● RF-03: Configuração da Escala Gráfica [Must Have] — A ferramenta deve disponibilizar matriz de escala
gráfica com níveis de graduação configuráveis (ex.: Insuficiente, Regular, Bom, Muito Bom, Excelente) e

valores numéricos atrelados. Critério de Aceite: O sistema deve permitir que cada nível possua descrição
comportamental padrão parametrizada pela comissão.
● RF-04: Registro Contínuo do Diário de Bordo (CIT) [Must Have] — O sistema deve prover interface para o
superior imediato registrar fatos relevantes (positivos ou negativos) com data, descrição, fator associado e
evidências documentais anexas. Critério de Aceite: Cada registro no CIT deve gerar hash de auditoria e
carimbo de data/hora, impedindo exclusão retroativa após a homologação da nota.
● RF-05: Preenchimento de Avaliação 90° [Must Have] — O sistema deve apresentar formulário online para o
superior imediato pontuar cada fator do servidor avaliado, exibindo compulsoriamente os apontamentos do
CIT vinculados ao período. Critério de Aceite: Exigir justificativa textual obrigatória para notas situadas nos
extremos superior e inferior da escala gráfica.
● RF-06: Módulo de Avaliação pelo Usuário do Serviço [Should Have] — O sistema deve disponibilizar
funcionalidade de integração ou coleta de notas do usuário externo/cidadão para composição do fator
previsto no art. 25, alínea 'h', da Lei 1.704/2006. Critério de Aceite: Quando o cargo não possuir atendimento
direto ao público, o sistema deve redistribuir o peso deste fator conforme regra parametrizada.
● RF-07: Motor de Consolidação e Cálculo Automatizado [Must Have] — O sistema deve calcular médias
ponderadas, aplicar travas de desempate e converter pontuações em conceitos funcionais de forma
instantânea. Critério de Aceite: O motor de cálculo deve aplicar exatamente as fórmulas parametrizadas sem
desvios de arredondamento além de 2 casas decimais.
● RF-08: Gestão de Devolutiva e Assinatura Eletrônica [Must Have] — O sistema deve emitir o espelho de
avaliação para ciência do servidor avaliado, com suporte a assinatura eletrônica nativa do SYSGOV. Critério
de Aceite: Registro de data, hora e IP da assinatura, abrindo prazo automático para interposição de recurso
caso o servidor discorde do resultado.
● RF-09: Plano de Melhoria de Desempenho (PMD) [Should Have] — O sistema deve disponibilizar fluxo
estruturado para cadastro de plano de ação corretivo e capacitação quando o servidor atingir conceito
inferior ao mínimo estabelecido para progressão. Critério de Aceite: Vinculação do PMD ao próximo ciclo
avaliativo como fator de verificação de evolução funcional.
● RF-10: Módulo Recursal Administrativo [Must Have] — O sistema deve permitir ao servidor protocolar
recurso fundamentado contra a pontuação recebida, tramitando digitalmente para manifestação do
avaliador e julgamento da Comissão de Avaliação. Critério de Aceite: Bloqueio automático de envio de
recursos fora do prazo regulamentar parametrizado no ciclo.
● RF-11: Retificação e Reprocessamento Auditado [Must Have] — O sistema deve permitir à Comissão de
Avaliação retificar notas após julgamento recursal, mantendo a versão original e o histórico de alterações
integralmente registrados em trilha de auditoria. Critério de Aceite: Exigência de parecer motivado
obrigatório para qualquer reabertura ou alteração de notas consolidadas.
● RF-12: Painel de Indicadores e Relatórios Gerenciais [Must Have] — O sistema deve fornecer dashboards e
relatórios analíticos/sintéticos exportáveis (PDF e CSV) contendo taxas de conclusão, curvas de desempenho
e ranking para fins de desempate. Critério de Aceite: Filtros dinâmicos por secretaria, departamento, cargo,
carreira e ciclo avaliativo.
● RF-13: Verificação de Impedimentos e Conflitos de Interesse [Must Have] — O sistema deve identificar e
bloquear atribuições de avaliação entre cônjuges, companheiros ou parentes até o grau definido em
regulamento, alertando a comissão para redistribuição. Critério de Aceite: Bloqueio sistêmico na tela de
preenchimento caso detectado vínculo familiar cadastrado no módulo de RH.

## 7. Requisitos Não Funcionais

● RNF-01 (Desempenho e Latência): O tempo de resposta para carregamento de formulários e consolidação
de notas não deve exceder 1,5 segundos sob carga de até 5.000 usuários concorrentes.
● RNF-02 (Disponibilidade Operacional): A solução deve garantir índice de disponibilidade de 99,5% (uptime)
durante os períodos de vigência dos ciclos avaliativos.
● RNF-03 (Segurança e Criptografia): Todos os dados em trânsito devem trafegar sob protocolo TLS 1.3, com
dados em repouso (banco de dados) criptografados via padrão AES-256.
● RNF-04 (Conformidade com a LGPD): O sistema deve aplicar políticas de privacidade por padrão (Privacy by
Default), assegurando que notas e registros de incidentes sejam acessíveis estritamente aos envolvidos e
instâncias julgadoras.
● RNF-05 (Usabilidade e Acessibilidade): A interface deve obedecer às diretrizes do WCAG 2.1 (nível AA) e e-
MAG (Modelo de Acessibilidade em Governo Eletrônico), garantindo responsividade total em desktops e
dispositivos móveis.
● RNF-06 (Integridade e Trilha de Auditoria): Todas as transações (inserção, leitura, edição, assinatura,
deleção de rascunhos) devem gerar logs imutáveis armazenados em tabelas de auditoria protegidas contra
exclusão.
● RNF-07 (Backup e Recuperação): Rotinas de backup incremental a cada 6 horas e backup completo diário,
com RPO (Recovery Point Objective) ≤ 1 hora e RTO (Recovery Time Objective) ≤ 4 horas.

- Regras de Negócio Fundamentais
● RN-01 (Segregação de Carreiras): O sistema deve segregar estritamente as regras de avaliação conforme a
fundamentação estatutária: Quadro Geral (Lei Municipal nº 1.704/2006): Aplicação dos fatores do art. 25,
progressão horizontal por tempo e desempenho (10% entre referências R1 a R12, sendo 5% tempo + 5%
desempenho conforme arts. 22 a 24) e progressão vertical de 5% entre níveis (18 níveis).
● Quadro Próprio do Magistério - QPMA (Lei Municipal nº 1.835/2008): Aplicação das regras dos arts. 35 a 40
para Classes I, II, III e Professor Pedagogo, respeitando os regimes de 20h e 40h e a hora-atividade de
## 33,33%.
● RN-02 (Periodicidade e Composição do Ciclo Trienal): Para fins de aquisição de progressão no Quadro Geral,
o sistema deve consolidar o interstício de 3 anos constituído por 3 ciclos anuais consecutivos de avaliação
individual de desempenho.
● RN-03 (Fatores Estatutários Obrigatórios - Quadro Geral): O formulário padrão do Quadro Geral deve
contemplar obrigatoriamente as alíneas do art. 25 da Lei 1.704/2006:
● a) Assiduidade;
● b) Disciplina;
● c) Iniciativa;
● d) Responsabilidade;
● e) Cooperação;
● f) Qualidade do trabalho;
● g) Participação em programas de desenvolvimento;
● h) Avaliação pelo usuário do serviço.
● RN-04 (Nota Mínima de Elegibilidade): O servidor deve atingir pontuação mínima de 70% da pontuação
total possível (70,00 pontos em escala de 0 a 100) na média dos 3 ciclos anuais consolidados (NFC) para ser
classificado como apto à progressão funcional por mérito/desempenho. Ressalva: este percentual de 70%
constitui o valor padrão proposto pelo sistema, sendo integralmente configurável e parametrizável pela
Comissão Central de Avaliação de Desempenho antes da abertura formal de cada ciclo avaliativo.

● RN-05 (Critérios Legais de Desempate - Art. 39 da Lei 1.704/2006): Havendo empate na classificação para
progressão funcional limitada pela disponibilidade orçamentária (art. 38), o sistema deve aplicar
sucessivamente a seguinte ordem legal: Maior pontuação na média das avaliações de desempenho do
período;
● Maior tempo de serviço público municipal em Araucária;
● Maior idade civil.
● RN-06 (Bloqueio Temporal Estrito): Encerrado o prazo regulamentar do ciclo definido no cronograma da
Comissão, o sistema deve bloquear automaticamente qualquer inserção de notas ou incidentes, admitindo
alterações apenas mediante despacho fundamentado da Comissão.
● RN-07 (Impedimento Legal de Avaliador): É expressamente vedado ao superior imediato avaliar servidores
que sejam cônjuges, companheiros ou parentes consanguíneos/afins até o 3º grau, cabendo redistribuição
automática para o superior hierárquico imediato.
● RN-08 (Gratificação por Tempo de Serviço): O sistema deve registrar para fins cadastrais o cômputo dos
quinquênios (5% por quinquênio conforme art. 17 da Lei 1.704/2006), mantendo este cálculo segregado das
notas de desempenho.

- Fluxos Principais de Uso
9.1 Fluxo 1: Configuração do Ciclo pela Comissão
- A Comissão de Avaliação acessa o painel de governança no SYSGOV.
- Define o período do ciclo (ano-base), prazo de preenchimento, prazos recursais e vincula os quadros
funcionais aplicáveis.
- Configura a matriz de fatores, pesos e modelo de escala gráfica aplicável para cada carreira/cargo.
- Homologa o ciclo, disparando as rotinas automáticas de vinculação de avaliadores e avaliados.
9.2 Fluxo 2: Registro Contínuo no Diário de Bordo (CIT)
- Durante o decorrer do ano avaliativo, o Superior Imediato acessa o painel da sua equipe.
- Seleciona o servidor avaliado e clica em Novo Registro CIT.
- Insere a data do fato, seleciona o tipo (Positivo ou A desdobrar/Negativo), vincula ao fator correspondente
(ex.: Qualidade do Trabalho), redige a descrição fática e anexa documentos comprobatórios.
- Salva o registro, que recebe hash criptográfico de inviolabilidade.
9.3 Fluxo 3: Abertura e Preenchimento da Avaliação 90°
- Aberta a janela de avaliação, o Superior Imediato recebe notificação no SYSGOV.
- Ao abrir o formulário do servidor, o sistema projeta em painel lateral todos os apontamentos do CIT
registrados ao longo do período.
- O avaliador atribui os níveis na Escala Gráfica para cada fator estatutário.
- O sistema valida se notas extremas possuem justificativa descritiva.
- O avaliador revisa o parecer consolidado e submete a avaliação.
9.4 Fluxo 4: Devolutiva, Ciência e Assinatura
- O servidor avaliado recebe notificação de avaliação concluída.
- O Superior Imediato agenda e realiza a sessão presencial/virtual de devolutiva.

- O servidor acessa o formulário preenchido, visualiza notas, pareceres e registros de CIT.
- O servidor manifesta sua concordância ou discordância motivada e assina eletronicamente.
- Caso discorde, o sistema disponibiliza o botão Interpor Recurso Administrativo, iniciando a contagem do
prazo recursal.
9.5 Fluxo 5: Consolidação, Julgamento e Encerramento
- A Comissão de Avaliação audita as avaliações concluídas e julga eventuais recursos impetrados.
- O motor de cálculo processa a nota final consolidada de cada servidor.
- O sistema cruza os resultados com os requisitos de tempo de serviço e emite o Relatório Final de
Elegibilidade para Progressão.
- A lista final é homologada pela SMGP e transmitida digitalmente para o Módulo de Progressão Funcional e
Folha de Pagamento.
9.6 Fluxo 6: Recurso Administrativo contra a Avaliação
- Interposição do Recurso pelo Servidor: Caso discorde da pontuação ou justificativa no momento da
devolutiva/ciência, o servidor clica em Interpor Recurso Administrativo e formula sua petição fundamentada
no SYSGOV dentro do prazo regulamentar (padrão sugerido de 10 dias úteis a contar da data de
assinatura/ciência eletrônica, parametrizável pela Comissão Central). O servidor deve apontar os
itens/fatores contestados e anexar contraprovas documentais.
- Bloqueio Automático Temporal: Expirado o prazo configurado, o sistema bloqueia automaticamente a
submissão de novos recursos (conforme RF-10), admitindo apenas visualização dos status anteriores.
- Notificação e Manifestação do Avaliador (Contrarrazões): O sistema protocola o recurso com carimbo de
tempo, altera o status da avaliação para RECORRIDA e notifica automaticamente o Superior Imediato
(avaliador) para manifestação. O avaliador dispõe de prazo regulamentar (padrão sugerido de 5 dias úteis)
para registrar suas contrarrazões técnicas e manter ou rever a pontuação preliminar.
- Instrução e Julgamento pela Comissão Central de Avaliação: O processo recursal é distribuído à Comissão
de Avaliação. O colegiado analisa as razões do servidor, os registros do Diário de Bordo (CIT), a manifestação
do gestor e eventuais pareceres complementares. A Comissão pode converter o julgamento em diligência
para requisitar informações adicionais.
- Decisão Colegiada e Retificação Auditada: A Comissão profere decisão fundamentada podendo: Indeferir o
recurso, mantendo integralmente a avaliação original;
- Deferir integralmente ou retificar parcialmente a nota atribuída em um ou mais fatores.Havendo alteração
de nota, o sistema aciona a rotina de reprocessamento auditado (RF-11), exigindo o registro formal do
parecer motivado da Comissão e gerando novo hash de integridade, mantendo intacto o histórico da nota
original para fins de auditoria.
- Ciência da Decisão e Esgotamento da Instância Administrativa: O resultado do julgamento é publicado
digitalmente na área do servidor e do gestor, exigindo nova ciência eletrônica. Esgotada a instância recursal
ordinária no âmbito da Comissão Central, o sistema emite notificação formal ao servidor contendo o extrato
da decisão e orientações sobre eventuais vias administrativas superiores previstas no regime jurídico
municipal.




- Parametrizações Disponíveis para a Comissão de Avaliação
Parâmetro de Configuração Descrição Técnica Exemplo de Aplicação Prática
Estrutura de Fatores Habilidade de cadastrar, ativar, inativar
e agrupar fatores por cargo ou carreira.
Inclusão de fator de Mediação
Pedagógica exclusivo para o QPMA (Lei
## 1.835/2008).
Pesos Ponderados Definição do peso percentual de cada
fator na composição da nota final (Soma
## = 100%).
Assiduidade peso 15%, Qualidade do
Trabalho peso 25%, Avaliação pelo
Usuário peso 10%.
Níveis da Escala Gráfica Configuração da quantidade de níveis (3
a 5), rótulos, conceitos e faixas de
pontuação.
1: Insuficiente (0-20 pts), 2: Regular (21-
50 pts), 3: Bom (51-80 pts), 4: Excelente
(81-100 pts).
Cronograma do Ciclo Fixação de datas de corte para registro
de CIT, preenchimento, devolutiva e
recursos.
Preenchimento: 01/10 a 31/10;
Devolutiva: 01/11 a 15/11; Recursos:
16/11 a 25/11.
Redistribuição de Fator Regra de repasse proporcional de peso
para cargos sem atendimento ao público
direto (art. 25, 'h').
O peso de 10% da Avaliação pelo
Usuário é redistribuído igualmente
entre Qualidade e Responsabilidade.
Templates de Notificação Personalização dos modelos de e-mail e
alertas no painel do servidor para cada
etapa.
Disparo de aviso automático D-5 e D-1
antes do encerramento da fase de
avaliação.

- Estrutura de Campos e Dados do Sistema
11.1 Registro do Diário de Bordo (CIT)
● id_incidente: Identificador único (UUID).
● id_servidor_avaliado: Chave estrangeira do servidor avaliado.
● id_superior_avaliador: Chave estrangeira do gestor que realizou o registro.
● data_ocorrencia_fato: Data da ocorrência do incidente crítico (DD/MM/AAAA).
● tipo_incidente: Enumerador [POSITIVO, A_DESDOBRAR_NEGATIVO].
● id_fator_vinculado: Fator estatutário correspondente (Lei 1.704/2006 ou 1.835/2008).
● descricao_circunstanciada: Texto detalhado descrevendo o fato observável (máx. 2.000 caracteres).
● url_anexo_evidencia: Link seguro para documentação comprobatória anexada.
● hash_integridade: Assinatura criptográfica do registro (SHA-256).
11.2 Formulário de Avaliação Funcional 90°
● id_formulario_avaliacao: Identificador único da avaliação funcional.
● id_ciclo_avaliativo: Referência ao ciclo anual/período vigente.

● id_vinculo_servidor: Matrícula, cargo, carreira, secretaria e lotação do avaliado.
● itens_avaliacao: Array contendo [id_fator, pontuacao_atribuida, justificativa_obrigatoria].
● nota_final_calculada: Média ponderada calculada pelo motor de regras.
● conceito_atingido: Conceito nominal correspondente.
● parecer_descritivo_gestor: Considerações finais do superior imediato.
● manifestacao_servidor: Texto de ciência/concordância ou apontamento de recurso.
● status_avaliacao: Enumerador [RASCUNHO, SUBMETIDA, EM_DEVOLUTIVA, CONCLUIDA, RECORRIDA].
11.3 Exemplo Preenchido do Formulário de Avaliação 90° (Quadro Geral)
Abaixo é demonstrado um exemplo prático e completo de preenchimento de formulário de Avaliação 90° para um
servidor fictício enquadrado no Quadro Geral (Lei Municipal nº 1.704/2006), avaliado pelo seu superior hierárquico
imediato mediante a Escala Gráfica de 5 Níveis: Insuficiente (0 a 20 pts), Regular (21 a 50 pts), Bom (51 a 80 pts),
Muito Bom (81 a 90 pts) e Excelente (91 a 100 pts).
Dados Cadastrais do Vínculo Avaliado:
## Servidor Avaliado: Carlos Eduardo Silveira • Matrícula: 48.921-0
Cargo Efetivo: Auxiliar Administrativo • Carreira: Quadro Geral (Lei nº 1.704/2006)
Lotação: Departamento de Protocolo e Arquivo — Secretaria Municipal de Administração (SMAD)
Superior Avaliador: Mariana Fernandes Ramos (Diretora de Departamento / Matrícula 32.105-8)
Ciclo Avaliativo: Ciclo Ordinário Anual 2026 (Ano-Base 2025/2026)
Fator de Avaliação
(Art. 25 - Lei 1.704/06)
Peso (Wi) Nível Atribuído Pontuação (Pi) Justificativa Técnica
do Avaliador
(Evidências / CIT)
a) Assiduidade 15% Excelente 96,00 Cumprimento integral
da jornada de trabalho
sem faltas
injustificadas ou
atrasos reiterados
durante o ciclo
avaliativo. Registro
biométrico 100%
regular.
b) Disciplina 10% Muito Bom 88,00 Respeito rigoroso às
normas estatutárias,
ordens de serviço e
prazos internos do
departamento.
Conduta exemplar no
relacionamento
interpessoal com a
equipe.
c) Iniciativa 15% Bom 78,00 Propôs a
reorganização dos
arquivos digitais de
processos antigos no
sistema, agilizando a

localização de
documentos físicos
requisitados pela
## Procuradoria Geral.
d) Responsabilidade 15% Excelente 95,00 Guarda diligente e
rigorosa dos livros de
registro e processos
físicos sob custódia do
setor; zero extravio ou
avarias em
documentos no
período (CIT Positivo
## #1042).
e) Cooperação 10% Muito Bom 85,00 Prontidão constante
em apoiar colegas
durante picos de
atendimento e
triagem de
correspondências no
protocolo geral,
promovendo
integração no setor.
f) Qualidade do
## Trabalho
20% Muito Bom 90,00 Elaboração e autuação
de processos sem
erros de indexação;
conferência minuciosa
de metadados e
distribuição correta às
secretarias de destino.
g) Participação em
Programas de
## Desenvolvimento
5% Excelente 100,00 Conclusão integral
com aproveitamento
superior a 90% no
curso corporativo
Gestão de
Documentos Digitais e
LGPD no Setor Público
ofertado pela Escola
de Governo.
h) Avaliação pelo
Usuário do Serviço
10% Muito Bom 86,00 Índice de satisfação de
92% apurado nas
pesquisas de balcão e
totens de
atendimento ao
munícipe direcionadas
ao guichê de
protocolo.
Memória de Cálculo e Conceito Consolidado do Ciclo

Nc = (96 × 0,15) + (88 × 0,10) + (78 × 0,15) + (95 × 0,15) + (85 × 0,10) + (90 × 0,20) + (100 × 0,05) + (86 × 0,10)
Nc = 14,40 + 8,80 + 11,70 + 14,25 + 8,50 + 18,00 + 5,00 + 8,60 = 89,25 pontos
● Nota do Ciclo (Nc):89,25 pontos
● Conceito Resultante:Bom (B)(Faixa de 75,00 a 89,99 pontos)
● Situação Parcial para Progressão:Apto(Pontuação superior à nota mínima de corte de 70,00 pontos / RN-04)
Parecer Descritivo do Gestor Imediato
"O servidor Carlos Eduardo Silveira demonstrou elevado rigor técnico e comprometimento com as rotinas do
Departamento de Protocolo. Destaca-se sua iniciativa voluntária na padronização dos fluxos de arquivamento digital
e seu excelente relacionamento com os cidadãos e secretarias municipais. Recomenda-se para o próximo ciclo o
aprofundamento na liderança de projetos de automação de processos."
Avaliador: Mariana Fernandes Ramos • Data da Avaliação: 15/10/2026 • Status: Assinado Eletronicamente
Manifestação do Servidor Avaliado
"Declaro ciência integral da avaliação funcional realizada pela chefia imediata e dos apontamentos efetuados no
Diário de Bordo. Concordo com as pontuações e ponderações atribuídas aos fatores avaliados, reafirmando meu
compromisso de manter o padrão de excelência nas atividades de atendimento ao público e gestão documental do
## Município."
Servidor: Carlos Eduardo Silveira • Data da Ciência: 18/10/2026 • Manifestação: Concordância / Sem Recurso

- Regras de Cálculo, Consolidação e Encerramento
A nota final de cada ciclo individual de avaliação funcional (Nc) é apurada pela média ponderada das pontuações
atribuídas a cada um dos k fatores estatutários parametrizados:
Nc = Σ (Pi × Wi), para i = 1 até k
Onde Pi representa a pontuação normalizada obtida no fator i (na escala de 0 a 100 pontos) e Wi representa o peso
percentual do respectivo fator, obedecendo à restrição estrutural:
Σ Wi = 1,00 (100%), para i = 1 até k
Para fins de apuração da progressão funcional trienal no Quadro Geral (Lei nº 1.704/2006), o sistema calcula a Nota
Final Consolidada (NFC) pela média aritmética simples dos 3 ciclos anuais consecutivos que integram o interstício:
NFC = (Nc1 + Nc2 + Nc3) / 3
Faixa de Pontuação (NFC) Conceito Atribuído Efeito na Carreira (Lei 1.704/2006)
90,00 a 100,00 pontos Excelente (E) Apto à progressão funcional por
desempenho.
75,00 a 89,99 pontos Bom (B) Apto à progressão funcional por
desempenho.
60,00 a 74,99 pontos Regular (R) Submetido a Plano de Melhoria de
Desempenho (PMD).
Abaixo de 60,00 pontos Insuficiente (I) Inapto à progressão funcional por
desempenho; PMD obrigatório.

Nota Operacional e Regulatória: As faixas de pontuação e conceitos apresentados acima (Excelente: 90,00 a 100,00;
Bom: 75,00 a 89,99; Regular: 60,00 a 74,99; Insuficiente: abaixo de 60,00) representam o padrão proposto pelo
sistema, sendo plenamente configuráveis e parametrizáveis pela Comissão Central de Avaliação de Desempenho no
painel administrativo do SYSGOV antes da abertura do ciclo. Conforme estipulado na RN-04, a nota mínima de corte
proposta para elegibilidade à progressão funcional por mérito/desempenho é de 70,00 pontos na média consolidada
(NFC) do triênio avaliativo.

- Metodologia do Diário de Bordo / Técnica de Incidentes Críticos
## (CIT)
A incorporação da Técnica de Incidentes Críticos (CIT) no SYSGOV tem por escopo eliminar a subjetividade pura e
mitigar distorções comuns no processo avaliativo (tais como erro de recência, tendência central e efeito de halo). O
Diário de Bordo funciona de forma contínua e assíncrona ao longo de todo o período avaliativo:
● Fatos Observáveis: Todo registro deve reportar uma ação concreta e observável desempenhada pelo
servidor, sendo vedados julgamentos adjetivos desprovidos de contextualização fática.
● Painel Integrado ao Formulário: No momento em que o avaliador pontua a Escala Gráfica, o sistema projeta
uma linha do tempo com os registros CIT vinculados àquele fator específico, fundamentando a pontuação.
● Transparência e Acompanhamento: O servidor visualiza no seu portal os apontamentos efetuados pelo
gestor, viabilizando o alinhamento de expectativas antes da reunião formal de devolutiva.

- Matriz de Permissões e Governança
## Ação Operacional
no Sistema
Servidor Avaliador Comissão RH / Gestão Admin
Visualizar próprio
espelho de
avaliação e notas
## SIM SIM SIM SIM SIM
## Registrar
incidentes no CIT
da equipe
subordinada
## NÃO SIM NÃO NÃO SIM
Preencher e
submeter
formulário de
avaliação 90°
## NÃO SIM NÃO NÃO SIM
## Cadastrar
parâmetros,
fatores, pesos e
ciclos
## NÃO NÃO SIM NÃO SIM

Julgar recursos
administrativos e
alterar notas
## NÃO NÃO SIM NÃO NÃO
Exportar listas de
progressão para
folha de
pagamento
## NÃO NÃO NÃO SIM SIM
Acessar trilhas
completas de
auditoria de
sistema
## NÃO NÃO NÃO NÃO SIM

- Relatórios, Indicadores e Auditoria
15.1 Relatórios Nativos da Plataforma
● Relatório de Aderência do Ciclo: Demonstra a evolução do preenchimento por secretaria e departamento,
destacando gestores pendentes.
● Espelho Funcional Individual: Documento oficial em PDF contendo o histórico consolidado de avaliações,
notas por fator, registros CIT e assinaturas.
● Relatório de Classificação para Progressão: Listagem ordenada de servidores por nota, aplicando
rigorosamente os critérios de desempate do art. 39 da Lei 1.704/2006.
15.2 Rastreabilidade e Auditoria
O módulo mantém trilha de auditoria completa em conformidade com as exigências do Controle Interno e Tribunal
de Contas, registrando:
- Identificação do usuário (login, CPF e matrícula);
- Endereço IP de origem e identificador do dispositivo;
- Carimbo de tempo atômico (UTC-3);
- Estado anterior e estado posterior de qualquer dado alterado;
- Justificativa formal inserida em casos de retificação de notas pós-homologação.

- Arquitetura de Integrações no Ecossistema SYSGOV
Módulo Integrado Direção do Fluxo Dados e Eventos Trafegados
Cadastro de Servidores (RH) Entrada → Avaliação Dados cadastrais, cargo, carreira, data
de admissão, chefia imediata e lotação
funcional.

Módulo de Progressão Funcional Avaliação → Saída Conceitos finais homologados,
pontuação consolidada e parecer de
aptidão para concessão da
referência/nível.
Módulo de Folha de Pagamento Avaliação → Saída Sinalização de concessão de progressão
de 10% (Lei 1.704/2006) ou progressão
horizontal/vertical (Lei 1.835/2008).
Assinatura Eletrônica SYSGOV Bidirecional Envio de documentos para assinatura
digital e retorno de certificados com
carimbo de tempo.
Portal da Transparência / e-SIC Avaliação → Saída Publicação de relatórios estatísticos e
quantitativos desprovidos de dados
pessoais sensíveis (LGPD).

- Segurança, Conformidade e LGPD
O tratamento de dados funcionais no âmbito do módulo obedece rigorosamente às diretrizes da Lei Geral de
Proteção de Dados (Lei nº 13.709/2018), fundamentando-se no cumprimento de obrigação legal e execução de
políticas públicas pelo Município:
● Segregação de Visibilidade: Nenhum servidor terá acesso às notas ou apontamentos de terceiros, com
exceção dos gestores imediatos devidamente investidos na hierarquia e dos membros da Comissão Central.
● Criptografia e Proteção de Dados: Dados armazenados de natureza subjetiva (justificativas, notas e
incidentes de diário de bordo) possuem proteção criptográfica em nível de coluna de banco de dados.
● Retenção Documental: Os registros das avaliações de desempenho permanecem armazenados de forma
perene no repositório funcional do servidor para fins de comprovação histórica perante os órgãos de
fiscalização e previdência.

- Critérios de Homologação e Aceite
● CA-01 (Cálculo Ponderado): O sistema deve executar o cálculo exato da média ponderada dos fatores
configurados, gerando divergência zero em baterias de testes com dados sintéticos.
● CA-02 (Bloqueio Automático de Prazos): O sistema deve encerrar a submissão de formulários pontualmente
no horário limite configurado no cronograma do ciclo, convertendo o status de avaliações não preenchidas
para pendente.
● CA-03 (Imutabilidade do Histórico): Qualquer retificação de nota realizada após julgamento de recurso deve
manter intacta a versão anterior no banco de dados, permitindo a recomposição histórica do fluxo.
● CA-04 (Diferenciação Estatutária): O sistema deve aplicar exclusivamente os fatores e regras da Lei
1.704/2006 para o Quadro Geral e as diretrizes da Lei 1.835/2008 para o Quadro do Magistério, rejeitando
associações cruzadas indevidas.


- Matriz de Riscos e Premissas
19.1 Matriz de Análise de Riscos
Descrição do Risco Prob. Imp. Estratégia de Mitigação
Resistência dos gestores no
preenchimento contínuo do
## CIT.
Média Alto Disponibilização de interface
simplificada e realização de
capacitação obrigatória pela
## SMGP.
Inconsistência na hierarquia
de chefias no módulo de RH.
Alta Alto Execução de rotina de
homologação prévia das
relações chefia-subordinado
antes da abertura do ciclo.
Sobrecarga de acessos no
último dia do prazo
avaliativo.
Alta Médio Arquitetura elástica em
nuvem e alertas
automatizados de
preenchimento antecipado
## (D-10, D-5, D-1).
Interposição massiva de
recursos por falta de
fundamentação.
Média Médio Exigência de preenchimento
de evidências e justificativas
no momento da avaliação
para fundamentar as notas.
19.2 Premissas e Dependências de Projeto
● Premissa 1: A Comissão Central de Avaliação de Desempenho definirá formalmente os fatores, pesos e
prazos antes do início do desenvolvimento dos formulários específicos.
● Premissa 2: A base de dados do módulo de RH da Prefeitura de Araucária estará saneada e integrada via API
antes da homologação final deste módulo.
● Dependência 1: Disponibilidade do serviço central de autenticação unificada e assinatura eletrônica do
## SYSGOV.

## 20. Apêndice
20.1 Glossário Técnico e Negocial
● Avaliação 90°: Metodologia de avaliação vertical direta em que o servidor é avaliado exclusivamente pelo
seu superior hierárquico imediato.
● Escala Gráfica: Método quantitativo que dispõe fatores funcionais em linhas e graus de desempenho em
colunas graduadas.
● CIT (Critical Incident Technique): Técnica estruturada de observação de comportamentos extremos (críticos)
altamente eficazes ou ineficazes no ambiente de trabalho.

● Plano de Melhoria de Desempenho (PMD): Instrumento formal de alinhamento com ações de capacitação
para servidores que obtiverem conceitos inferiores à média.
● Interstício: Período mínimo de efetivo exercício exigido em lei para que o servidor possa concorrer à
progressão funcional.
## 20.2 Referências Normativas
● Lei Municipal nº 1.704/2006 — Dispõe sobre o Plano de Cargos, Carreiras e Vencimentos do Quadro Geral
do Município de Araucária/PR.
● Lei Municipal nº 1.835/2008 — Dispõe sobre o Plano de Carreira e Remuneração do Magistério Público
Municipal de Araucária/PR.
● Decreto Municipal nº 39.132/2023 — Regulamenta os procedimentos e comissões de avaliação de
desempenho funcional no Poder Executivo Municipal.
● Lei Federal nº 13.709/2018 (LGPD) — Lei Geral de Proteção de Dados Pessoais.

Documento elaborado em 13 de setembro de 2026. As especificações técnicas contidas neste PRD refletem os
requisitos da Prefeitura Municipal de Araucária/PR para o ecossistema SYSGOV.