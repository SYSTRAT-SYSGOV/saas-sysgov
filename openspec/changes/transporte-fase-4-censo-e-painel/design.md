# Design — Transporte, Fase 4: Censo e painel

As decisões comuns (D1 a D10) estão em `transporte-fase-1-fundacao-e-frota/design.md`.

## Decisões

### D25. Fonte dos dados do Registro 60
Uma linha por **alocação ativa** do ano letivo, juntando aluno (`escola_alunos`), escola (`escola_escolas`, com o Inep), rota, veículo e a alocação. Alocações encerradas não saem.

### D26. Declaração de transporte público e anulação
- `transporte_publico` = 1 quando há alocação ativa; 0 caso contrário.
- `poder_publico_responsavel` = valor da alocação (1, 2 ou 3).
- **Anulação** (campos de transporte público vazios) quando `atendimento_curricular` é falso, ou `mediacao_didatica` é `distancia`, ou `pais_residencia` ≠ `BR`. Essa é a regra do legado (`TransporteEscolarPublico`).
- Flags de tipologia: `van_kombi` (1), `microonibus` (2), `onibus` (3), `bicicleta` (4), `tracao_animal` (5), `outro` (6), `aquaviario_ate_5` (7), `aquaviario_5_15` (8), `aquaviario_15_35` (9), `aquaviario_acima_35` (10), `ferroviario` (11). Cada linha marca 1 na tipologia do veículo da rota e 0 nas demais. A anulação também zera as flags.

### D27. Pré-validação não bloqueia a exportação
`approved` é verdadeiro só sem **pendências**, mas a exportação funciona mesmo com pendência: o gestor decide. A pré-validação traz, por aluno, o tipo (`sem_alocacao_ativa`, `rota_sem_veiculo`, `rural_sem_declaracao`, `veiculo_nao_adaptado`), o detalhe e o aluno. O `turno_divergente` da Fase 3 é um **aviso**: aparece na lista, mas não impede `approved`.

O cadastro escolar não tem uma marca de "aluno que deveria usar transporte". Por isso `sem_alocacao_ativa` só se aplica a quem **já teve** alocação no ano e hoje não tem nenhuma ativa (ver pergunta aberta 1).

### D28. Minimização e segurança do CSV
Colunas: identificador do aluno, nome, escola, Inep da escola, ano letivo, turno, rota, placa, tipologia e as variáveis do Registro 60. **Sem** CPF, **sem** observação de necessidade especial, **sem** endereço. Células que começam com `=`, `+`, `-` ou `@` recebem um apóstrofo à frente (injeção de fórmula). A exportação exige `transporte.censo.export` e vai para a auditoria (quem, ano, quantidade de linhas). Codificação UTF-8 com BOM, separador `;`, para abrir certo no Excel brasileiro.

### D29. Painel
Dados calculados na hora (sem tabela nova): totais por contagem, ocupação média ponderada pela capacidade, lista de rotas por faixa (vermelhas primeiro), e o `AlertaService` da Fase 1. Rotas sem veículo aparecem como pendência.

### D30. Home do Cliente
Não muda. A home enxuta (`client-home`) continua com os quatro cartões fixos; o painel do Transporte vive dentro do módulo.

## Perguntas abertas desta fase (precisam de resposta antes de implementar)
1. Existe como saber, no cadastro escolar, quais alunos **deveriam** usar transporte (por exemplo, zona rural)? Se sim, a pendência `sem_alocacao_ativa` cobre todos eles; se não, cobre só quem já teve alocação.
2. O órgão precisa do arquivo no **layout oficial do Educacenso** (campos posicionais) ou o CSV do Registro 60 por variáveis basta? Isto muda a estimativa.
