# Tarefas — Transporte, Fase 4: Censo e painel

## 0. Antes de começar (entradas externas)
- [ ] 0.1 Obter o documento oficial do leiaute do Educacenso do ano do Censo (portal do Inep) e guardar a referência (ano, versão, data) em `docs/modules/transporte.md`
- [ ] 0.2 Mapear, campo a campo, o Registro 60: o que o Transporte preenche, o que vem do Escola e o que o leiaute permite deixar vazio (pergunta aberta 2)
- [ ] 0.3 Responder as perguntas abertas restantes (alunos que deveriam usar transporte; campos de matrícula exigidos pelo leiaute; primeiro ano do Censo). A adição dos códigos Inep no Escola e de outros campos necessários já está **aprovada**

## 1. Backend — Escola (aprovado)
- [ ] 1.1 Migration `inep_id` (nulo) em `escola_alunos` e `inep` (nulo) em `escola_turmas`, com unicidade por tenant quando preenchidos
- [ ] 1.2 Edição nas telas do Escola e nos Resources; testes de isolamento e de unicidade
- [ ] 1.3 Acrescentar ao Escola, em migration própria e com teste, qualquer outro campo que o mapeamento da tarefa 0.2 mostrar necessário

## 2. Backend — Censo
- [ ] 2.1 `CensoService::preValidar(ano)`: cinco pendências, aviso de turno, `approved`
- [ ] 2.2 Interface `LeiauteRegistro60` e a implementação do ano escolhido em 0.1, com campos, posições, delimitador e codificação do documento oficial
- [ ] 2.3 `CensoService::gerarArquivo(ano)`: linhas por alocação ativa, tipologias 1 a 11, anulação, campos de matrícula vazios onde permitido
- [ ] 2.4a Catálogo declarativo de campos por leiaute (chave, rótulo, grupo, origem, obrigatório, sensível, formatação)
- [ ] 2.4b Migration `transporte_modelos_exportacao` (`tenant_id`, nome, leiaute/ano, campos, criado por; único por tenant e nome) e seeder do modelo padrão "Registro 60 completo"
- [ ] 2.4c `ModeloExportacaoService` (criar, editar, excluir, reaplicar com aviso de campos inexistentes) e aplicação da seleção na geração: vazio na posição no arquivo oficial, omitido no CSV
- [ ] 2.4d Pendência `campo_sem_dado` na pré-validação e confirmação de campo sensível
- [ ] 2.4 Arquivo de referência (golden file) montado a partir do exemplo oficial e teste de igualdade
- [ ] 2.5 CSV de conferência com neutralização de fórmula e minimização
- [ ] 2.6 Auditoria de cada geração (ano, tipo, linhas, versão do leiaute); arquivo não guardado no servidor
- [ ] 2.7 `PainelService` e endpoint de auditoria com filtros; Policies, Controllers, Resources e rotas

## 3. Backend — testes
- [ ] 3.1 Isolamento de tenant no Censo e no painel
- [ ] 3.2 Pendências: rota sem veículo, não adaptado, rural sem declaração, sem alocação ativa, sem código Inep, aviso de turno, sem pendências
- [ ] 3.3 Arquivo: ônibus municipal, ferroviário, encerrada fora, ano sem leiaute, igualdade com o arquivo de referência
- [ ] 3.4 Anulação: sem atendimento curricular, a distância, país `PY`, caso comum
- [ ] 3.5 CSV: injeção de fórmula, ausência de CPF e da observação
- [ ] 3.5b Seleção de campos: opcional desmarcado (vazio na posição), omitido no CSV, obrigatório travado, sensível com confirmação, observação de necessidade fora do catálogo, `campo_sem_dado`
- [ ] 3.5c Modelos: salvar e reaplicar, padrão não excluível (409), isolamento de tenant (404), modelo de outro ano com campos inexistentes
- [ ] 3.6 Auditoria da geração (com a lista de campos) e ausência de arquivo no armazenamento
- [ ] 3.7 Painel: vermelha, amarela no limite, sem veículo, vazio, ordem dos alertas
- [ ] 3.8 Permissões (403) e filtro da auditoria

## 4. Frontend
- [ ] 4.1 Aba Censo: seletor de ano, lista de pendências e avisos, botões Gerar arquivo do Educacenso e CSV de conferência (somem sem permissão)
- [ ] 4.1b Seletor de campos por grupo (marcar tudo, limpar, busca), obrigatórios travados com explicação, confirmação de campo sensível, salvar e escolher modelos
- [ ] 4.2 Aba Painel: indicadores (`KpiCard`), lotação por rota com rótulo de texto, alertas
- [ ] 4.3 Aba Auditoria com filtros
- [ ] 4.4 SDK, `generate:registry`, typecheck e vitest

## 5. Entrega
- [ ] 5.1 phpunit, phpstan e front verdes; CI verde
- [ ] 5.2 Conferência no navegador; validar o arquivo gerado no ambiente de importação do Educacenso, se o órgão tiver acesso
- [ ] 5.3 PR pelo fork; mesclar só com autorização; rebuild de `api` e `web`
