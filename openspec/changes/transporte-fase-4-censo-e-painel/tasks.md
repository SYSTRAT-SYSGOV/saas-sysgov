# Tarefas — Transporte, Fase 4: Censo e painel

## 0. Antes de começar (entradas externas)
- [ ] 0.1 Obter o documento oficial do leiaute do Educacenso do ano do Censo (portal do Inep) e guardar a referência (ano, versão, data) em `docs/modules/transporte.md`
- [ ] 0.2 Mapear, campo a campo, o Registro 60: o que o Transporte preenche, o que vem do Escola e o que o leiaute permite deixar vazio (pergunta aberta 2)
- [ ] 0.3 Obter a aprovação dos campos de código Inep do aluno e da turma no Escola (D30) e das demais perguntas abertas

## 1. Backend — Escola (somente se 0.3 aprovado)
- [ ] 1.1 Migration `inep_id` (nulo) em `escola_alunos` e `inep` (nulo) em `escola_turmas`, com unicidade por tenant quando preenchidos
- [ ] 1.2 Edição nas telas do Escola e nos Resources; testes de isolamento e de unicidade

## 2. Backend — Censo
- [ ] 2.1 `CensoService::preValidar(ano)`: cinco pendências, aviso de turno, `approved`
- [ ] 2.2 Interface `LeiauteRegistro60` e a implementação do ano escolhido em 0.1, com campos, posições, delimitador e codificação do documento oficial
- [ ] 2.3 `CensoService::gerarArquivo(ano)`: linhas por alocação ativa, tipologias 1 a 11, anulação, campos de matrícula vazios onde permitido
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
- [ ] 3.6 Auditoria da geração e ausência de arquivo no armazenamento
- [ ] 3.7 Painel: vermelha, amarela no limite, sem veículo, vazio, ordem dos alertas
- [ ] 3.8 Permissões (403) e filtro da auditoria

## 4. Frontend
- [ ] 4.1 Aba Censo: seletor de ano, lista de pendências e avisos, botões Gerar arquivo do Educacenso e CSV de conferência (somem sem permissão)
- [ ] 4.2 Aba Painel: indicadores (`KpiCard`), lotação por rota com rótulo de texto, alertas
- [ ] 4.3 Aba Auditoria com filtros
- [ ] 4.4 SDK, `generate:registry`, typecheck e vitest

## 5. Entrega
- [ ] 5.1 phpunit, phpstan e front verdes; CI verde
- [ ] 5.2 Conferência no navegador; validar o arquivo gerado no ambiente de importação do Educacenso, se o órgão tiver acesso
- [ ] 5.3 PR pelo fork; mesclar só com autorização; rebuild de `api` e `web`
