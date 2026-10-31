# Design — Transporte, Fase 4: Censo e painel

As decisões comuns (D1 a D10) estão em `transporte-fase-1-fundacao-e-frota/design.md`.

## Decisões

### D25. Fonte dos dados do Registro 60
Uma linha por **alocação ativa** do ano letivo, juntando aluno (`escola_alunos`), escola (`escola_escolas`, com o Inep), turma, rota, veículo e a alocação. Alocações encerradas não saem.

### D26. Declaração de transporte público e anulação
- Transporte público = 1 quando há alocação ativa; 0 caso contrário.
- Poder público responsável = valor da alocação (1 estadual, 2 municipal, 3 compartilhado).
- **Anulação** (campos de transporte público vazios e tipologias zeradas) quando `atendimento_curricular` é falso, ou `mediacao_didatica` é `distancia`, ou `pais_residencia` ≠ `BR`. É a regra do legado (`TransporteEscolarPublico`).
- Tipologias: van/kombi (1), microônibus (2), ônibus (3), bicicleta (4), tração animal (5), outro (6), aquaviário até 5 (7), de 5 a 15 (8), de 15 a 35 (9), acima de 35 (10) e ferroviário (11). Marca-se a tipologia do veículo da rota.

### D27. Pré-validação não bloqueia a geração
`approved` é verdadeiro só sem **pendências**, mas o arquivo pode ser gerado mesmo com pendência: o gestor decide. Pendências: `sem_alocacao_ativa`, `rota_sem_veiculo`, `rural_sem_declaracao`, `veiculo_nao_adaptado` e `sem_codigo_inep`. O `turno_divergente` da Fase 3 é um **aviso** e não impede `approved`. O cadastro escolar não tem marca de "aluno que deveria usar transporte"; por isso `sem_alocacao_ativa` só vale para quem **já teve** alocação no ano e hoje não tem nenhuma ativa.

### D28. Leiaute oficial do Educacenso (decisão do usuário)
O arquivo segue o **leiaute oficial vigente do Inep** para o ano do Censo, e não um formato próprio. Regras:
- O leiaute é um **documento externo** que muda de ano para ano. Ele é implementado como uma classe `LeiauteRegistro60` por ano (`Leiaute2026`, ...), com a lista de campos, posições, tamanhos, obrigatoriedade, delimitador e codificação **copiados do documento oficial**. Nada disso é presumido neste design.
- Cada leiaute tem um teste com arquivo de referência ("golden file") montado a partir do exemplo do próprio documento do Inep.
- O mesmo código de domínio (D26) alimenta qualquer ano; só a serialização muda.
- Troca de ano = nova classe de leiaute e novos testes, sem tocar nas regras.

### D29. O Registro 60 é de matrícula, não só de transporte
No Educacenso, o transporte escolar é parte do registro de **matrícula do aluno**, que tem também campos de turma, etapa e outros que pertencem ao Escola/Pedagógico. O SysGov **não tem hoje nenhuma exportação do Educacenso**. Para esta fase, o Transporte gera as linhas do Registro 60 preenchendo os campos que ele possui (identificação da escola, do aluno e da turma, transporte público, poder público e tipologias) e deixa os demais **vazios, como o leiaute permitir**, de modo que o arquivo possa ser **complementado** pelo módulo que vier a ter os demais campos. Se o leiaute exigir esses campos como obrigatórios, a Fase 4 não consegue entregar um arquivo de importação completo sozinha, e isso deve ser tratado antes de começar (pergunta aberta 2).

### D30. Códigos Inep do aluno e da turma
O leiaute identifica aluno, turma e matrícula por códigos do Inep e do sistema próprio. O cadastro escolar tem o Inep da **escola**, mas **não** tem o código Inep do aluno nem o da turma. Proposta, que precisa de aprovação: acrescentar `inep_id` (nulo) em `escola_alunos` e `inep` (nulo) em `escola_turmas`, com edição na tela do Escola e importação opcional. Sem o código, a linha ganha a pendência `sem_codigo_inep` e o campo sai vazio. O identificador interno do SysGov continua servindo como "código no sistema próprio".

### D31. CSV de conferência
Além do arquivo oficial, um CSV de conferência (UTF-8 com BOM, `;`) com aluno, escola, turno, rota, placa, tipologia e as variáveis de transporte, para o gestor revisar. **Sem** CPF, **sem** endereço e **sem** a observação de necessidade especial. Células iniciadas por `=`, `+`, `-` ou `@` recebem um apóstrofo (injeção de fórmula).

### D32. Auditoria e permissão da geração
A pré-validação e a geração (arquivo oficial e CSV) exigem `transporte.censo.export` e vão para o `audit_logs` (usuário, ano, tipo de arquivo, quantidade de linhas e versão do leiaute). O arquivo oficial contém dados de crianças, por isso é gerado sob demanda e **não é guardado** no servidor.

### D33. Painel
Dados calculados na hora (sem tabela nova): totais por contagem, ocupação média ponderada pela capacidade, lista de rotas por faixa (vermelhas primeiro), rotas sem veículo como pendência e o `AlertaService` da Fase 1.

### D34. Home do Cliente
Não muda. A home enxuta (`client-home`) continua com os quatro cartões fixos; o painel do Transporte vive dentro do módulo.

## Perguntas abertas desta fase (precisam de resposta antes de implementar)
1. Existe como saber, no cadastro escolar, quais alunos **deveriam** usar transporte (por exemplo, zona rural)? Se sim, `sem_alocacao_ativa` cobre todos eles.
2. O leiaute oficial do ano exige os campos de matrícula que o Transporte não possui? Se sim, quem vai fornecê-los (módulo Escola/Pedagógico) e a Fase 4 entrega o arquivo parcial, ou o escopo cresce?
3. Aprovar a adição dos campos de código Inep do aluno e da turma no Escola (D30).
4. Qual é o primeiro ano de Censo que o órgão precisa atender? Define qual leiaute implementar primeiro.
