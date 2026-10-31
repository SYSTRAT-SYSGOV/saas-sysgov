# Tarefas — Transporte, Fase 4: Censo e painel

> **Decisão do usuário (31/10/2026):** o órgão não conseguiu o documento do leiaute oficial do Educacenso. A Fase 4 entrega um **leiaute básico em CSV** (`basico-1`), provisório, atrás da interface `Leiaute`; o leiaute oficial entra depois como mais uma implementação (D28), sem tocar nas regras. Por isso as tarefas 0.1 a 0.3 e a 2.2 ficam adiadas, e o "arquivo de referência" (2.4) vira um teste de estrutura do leiaute básico. O ano é o **ano letivo** dos dados, não escolhe leiaute.

## 0. Antes de começar (entradas externas)
- [ ] 0.1 (adiado) Obter o documento oficial do leiaute do Educacenso do ano do Censo (portal do Inep) e guardar a referência (ano, versão, data) em `docs/modules/transporte.md`
- [ ] 0.2 (adiado) Mapear, campo a campo, o Registro 60: o que o Transporte preenche, o que vem do Escola e o que o leiaute permite deixar vazio (pergunta aberta 2)
- [ ] 0.3 (adiado) Responder as perguntas abertas restantes (alunos que deveriam usar transporte; campos de matrícula exigidos pelo leiaute; primeiro ano do Censo). A adição dos códigos Inep no Escola e de outros campos necessários já está **aprovada**

## 1. Backend — Escola (aprovado)
- [x] 1.1 Migration `inep_id` (nulo) em `escola_alunos` e `inep` (nulo) em `escola_turmas`, com unicidade por tenant quando preenchidos
- [x] 1.2 Edição nas telas do Escola e nos Resources; testes de isolamento e de unicidade
- [x] 1.3 (nenhum outro campo foi necessário no leiaute básico) Acrescentar ao Escola, em migration própria e com teste, qualquer outro campo que o mapeamento da tarefa 0.2 mostrar necessário

## 2. Backend — Censo
- [x] 2.1 `CensoService::preValidar(ano)`: cinco pendências, aviso de turno, `approved`
- [ ] 2.2 (adiado: leiaute oficial) Interface `LeiauteRegistro60` e a implementação do ano escolhido em 0.1, com campos, posições, delimitador e codificação do documento oficial
- [x] 2.3 `CensoService::gerarArquivo(ano)`: linhas por alocação ativa, tipologias 1 a 11, anulação, campos de matrícula vazios onde permitido
- [x] 2.4a Catálogo declarativo de campos por leiaute (chave, rótulo, grupo, origem, obrigatório, sensível, formatação)
- [x] 2.4b Migration `transporte_modelos_exportacao` (`tenant_id`, nome, leiaute/ano, campos, criado por; único por tenant e nome) e seeder do modelo padrão "Registro 60 completo"
- [x] 2.4c `ModeloExportacaoService` (criar, editar, excluir, reaplicar com aviso de campos inexistentes) e aplicação da seleção na geração: vazio na posição no arquivo oficial, omitido no CSV
- [x] 2.4d Pendência `campo_sem_dado` na pré-validação e confirmação de campo sensível
- [x] 2.4 Teste de estrutura do leiaute básico (colunas, ordem e posições fixas com campo desmarcado). O arquivo de referência oficial fica para o leiaute do Educacenso
- [x] 2.5 CSV de conferência com neutralização de fórmula e minimização
- [x] 2.6 Auditoria de cada geração (ano, tipo, linhas, versão do leiaute); arquivo não guardado no servidor
- [x] 2.7 `PainelService` e endpoint de auditoria com filtros; Policies, Controllers, Resources e rotas

## 3. Backend — testes
- [x] 3.1 Isolamento de tenant no Censo e no painel
- [x] 3.2 Pendências: rota sem veículo, não adaptado, rural sem declaração, sem alocação ativa, sem código Inep, aviso de turno, sem pendências
- [x] 3.3 Arquivo: ônibus municipal, ferroviário, encerrada fora, ano sem leiaute, igualdade com o arquivo de referência
- [x] 3.4 Anulação: sem atendimento curricular, a distância, país `PY`, caso comum
- [x] 3.5 CSV: injeção de fórmula, ausência de CPF e da observação
- [x] 3.5b Seleção de campos: opcional desmarcado (vazio na posição), omitido no CSV, obrigatório travado, sensível com confirmação, observação de necessidade fora do catálogo, `campo_sem_dado`
- [x] 3.5c Modelos: salvar e reaplicar, padrão não excluível (409), isolamento de tenant (404), modelo de outro ano com campos inexistentes
- [x] 3.6 Auditoria da geração (com a lista de campos) e ausência de arquivo no armazenamento
- [x] 3.7 Painel: vermelha, amarela no limite, sem veículo, vazio, ordem dos alertas
- [x] 3.8 Permissões (403) e filtro da auditoria

## 4. Frontend
- [x] 4.1 Aba Censo: seletor de ano, lista de pendências e avisos, botões Gerar arquivo do Educacenso e CSV de conferência (somem sem permissão)
- [x] 4.1b Seletor de campos por grupo (marcar tudo, limpar, busca), obrigatórios travados com explicação, confirmação de campo sensível, salvar e escolher modelos
- [x] 4.2 Aba Painel: indicadores (`KpiCard`), lotação por rota com rótulo de texto, alertas
- [x] 4.3 Aba Auditoria com filtros
- [x] 4.4 SDK, `generate:registry`, typecheck e vitest

## 5. Entrega
- [x] 5.1 phpunit, phpstan e front verdes; CI verde
- [ ] 5.2 Conferência no navegador; validar o arquivo gerado no ambiente de importação do Educacenso, se o órgão tiver acesso
- [ ] 5.3 PR pelo fork; mesclar só com autorização; rebuild de `api` e `web`

## 6. Acréscimos e desvios
- [x] 6.1 Interface `Leiaute` + `Leiautes` (registro) e `LeiauteBasico`; `Campo` declarativo (obrigatório, sensível, "só no arquivo")
- [x] 6.2 Pendência `campo_sem_dado` não se aplica a `transporte_publico` (vazio por regra, na anulação) nem aos códigos Inep (que têm `sem_codigo_inep`)
- [x] 6.3 O modelo padrão é criado na primeira consulta do tenant e traz os campos **não sensíveis**; sensíveis pedem confirmação a cada geração
- [x] 6.4 CPF e a flag de necessidade especial são sensíveis; o CPF nunca sai no CSV de conferência; a observação da necessidade não existe no catálogo
- [x] 6.5 Auditoria com filtros de período e de usuário (nome ou id) além da ação
- [x] 6.6 A aba "Visão geral" virou "Painel" (indicadores, lotação e alertas); a tabela de alertas foi extraída para `TabelaAlertas`
- [ ] 6.7 Escola: campo "Código Inep" nas telas de aluno e de turma (feito); importação opcional do código fica para a Fase 5
