# Avaliacao (i-Educar legado), Fluxos

> Fluxos da unit de avaliação que não cabem no `design.md`.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Fluxo de lançamento de nota por componente

**Gatilho:** o docente abre a tela de lançamento de nota de um componente.

1. O serviço de boletim é instanciado com a matrícula e o usuário, e a regra de avaliação é resolvida. 🟢 `ieducar/modules/Avaliacao/Views/NotaController.php:32-38`
2. A etapa é lida da requisição e, quando ausente, é determinada pela quantidade de notas já lançadas do componente. 🟢 `NotaController.php:51-61`
3. A nota existente, a falta e o parecer da etapa são carregados. 🟢 `NotaController.php:63-68`
4. A lista de valores possíveis é montada a partir da tabela de arredondamento, com o nome do valor na nota numérica e o valor máximo com a descrição na nota conceitual. 🟢 `NotaController.php:82-95`
5. O campo de falta só é exibido com presença por componente, e o de parecer só com parecer por etapa e por componente. 🟢 `NotaController.php:96-102`
6. Na gravação, a nota é registrada e, conforme a regra, a falta e o parecer são registrados em seguida. 🟢 `NotaController.php:115-135`
7. O serviço persiste os lançamentos e recalcula as médias. 🟢 `ieducar/modules/Avaliacao/Service/Boletim.php:2581-2670`
8. A tela é devolvida ao boletim da matrícula, com a mensagem de sucesso. 🟢 `NotaController.php:24-31`

---

## 2. Fluxo de lançamento de falta

**Gatilho:** o docente abre a tela de lançamento de falta.

1. O serviço de boletim é instanciado e a regra de avaliação é resolvida. 🟢 `ieducar/modules/Avaliacao/Views/FaltaController.php:69`
2. A lista de valores é o intervalo de zero a cem. 🟢 `FaltaController.php:135`
3. Na gravação, a quantidade é obtida da requisição, com a ausência valendo zero. 🟢 `FaltaController.php:146-155`
4. A falta geral e a falta por componente são registradas conforme o tipo de presença da regra. 🟢 `FaltaController.php:156-165`
5. O serviço persiste e recalcula. 🟢 `FaltaController.php:167-180`

---

## 3. Fluxo de apuração da situação do estudante

**Gatilho:** o sistema apura o resultado do estudante ao fim da etapa.

1. A situação por componente é calculada a partir das notas lançadas e da média do componente. 🟢 `ieducar/modules/Avaliacao/Service/Boletim.php:936`
2. A situação por componente é calculada a partir das faltas, com a carga horária da série ou a soma do ciclo. 🟢 `Boletim.php:1214` e `:3471-3487`
3. As duas situações são combinadas, e a que for mais restritiva prevalece. 🟢 `Boletim.php:625`
4. A porcentagem de presença exigida pela regra é conferida. 🟢 `ieducar/modules/Avaliacao/Service/Boletim/RegraAvaliacao.php:193-196`
5. Quando a regra determina que o lançamento de frequência seja desconsiderado, a falta não interfere. 🟢 `RegraAvaliacao.php:309-312`
6. A situação final do estudante é produzida. 🟢 `Boletim.php:829`
7. A reprovação por dependência é avaliada, com a contagem de disciplinas reprovadas e o limite da regra. 🟢 `Boletim.php:3427-3468`

---

## 4. Fluxo de cálculo da recuperação paralela

**Gatilho:** a apuração encontra um componente com nota abaixo da média e com recuperação lançada.

1. A etapa de exame final é identificada e a recuperação é ignorada. 🟢 `Boletim.php:3396-3398`
2. A regra de avaliação é lida do cache de cinco minutos. 🟢 `Boletim.php:3400` e `:3381-3385`
3. Quando a regra é de recuperação em etapa específica, a nota original é preservada. 🟢 `Boletim.php:3402-3404`
4. Quando a regra é de média entre nota e recuperação, a média aritmética é calculada e passa pela regra de maior valor. 🟢 `Boletim.php:3408-3410` e `app/Services/StageScoreCalculationService.php:5-11`
5. Quando a regra é de soma de notas, o resultado é a soma quando há recuperação, e o dobro da nota quando não há. 🟢 `Boletim.php:3412-3414` e `StageScoreCalculationService.php:13-20`
6. Em qualquer outro caso, prevalece o maior valor entre a nota e a recuperação. 🟢 `Boletim.php:3416` e `StageScoreCalculationService.php:22-29`

---

## 5. Fluxo de promoção do estudante

**Gatilho:** a secretaria promove o estudante aprovado ao ano seguinte.

1. A situação apurada é conferida e a nova situação da matrícula é definida. 🟢 `ieducar/modules/Avaliacao/Service/Boletim.php:2715`
2. A série de destino é apurada pela matriz de progressão entre séries. 🟢 `app/Models/LegacyGradeSequence.php:27-30`
3. A matrícula do ano seguinte é criada na série de destino, com a enturmação correspondente. 🟢 `Boletim.php:2715-2809`
4. A situação da matrícula é alterada, propagando o efeito às enturmações e à nota do aluno. 🟢 `Boletim.php:2904` e `ieducar/modules/Api/Views/MatriculaController.php:682-721`

---

## 6. Fluxo de promoção disparada por serviço

**Gatilho:** o desfeito do abandono refaz a promoção do estudante.

1. O serviço monta uma requisição sintética com a matrícula, a instituição, o ano, a escola, o curso, a série e a turma da enturmação. 🟢 `app/Services/PromotionService.php:24-38`
2. A API de promoção legada é instanciada e recebe a requisição. 🟢 `PromotionService.php:39-41`
3. A promoção é executada. 🟢 `PromotionService.php:42-43`
4. Qualquer exceção da API legada é silenciada, e a falha de promoção não fica visível. 🟢 `PromotionService.php:44-46`

---

## 7. Fluxo de exclusão de lançamento

**Gatilho:** o docente tenta excluir uma nota, uma falta ou um parecer.

1. A verificação percorre as etapas anteriores à etapa do lançamento. 🟢 `ieducar/modules/Avaliacao/Service/Boletim.php:3171` e `:3285`
2. Havendo lançamento em etapa anterior, a exclusão é recusada, com a indicação da etapa problemática. 🟢 `Boletim.php:3171`
3. Não havendo lançamento anterior, o registro é removido e as médias são recalculadas. 🟢 `Boletim.php:3104` e `:3124` e `:3137`

---

## 8. Fluxo de arredondamento da nota

**Gatilho:** a nota é salva ou exibida.

1. O tipo de nota da regra é conferido, para saber se a nota é numérica ou conceitual. 🟢 `Boletim.php:2297-2307`
2. Para componente com nota conceitual, a tabela conceitual da regra é usada em vez da tabela numérica. 🟢 `Boletim.php:2309-2333`
3. O valor é procurado na tabela de arredondamento, pelo maior valor que o exceda. 🟢 `Boletim.php:2272-2295`
4. As casas decimais da regra definem o arredondamento final. 🟢 `ieducar/modules/Avaliacao/Service/Boletim/RegraAvaliacao.php:244-248`

---

## 9. Fluxos ausentes no legado

Os fluxos abaixo aparecem no desenho do modelo novo, em `_reversa_sdd/Avaliacao/legacy-mapping.md`, e não têm implementação correspondente no código lido. Devem ser tratados como requisito novo, e não como reimplementação. 🔴

- Motor de avaliação funcional e puro, com entrada e saída serializáveis e sem acesso a banco. 🔴
- Trilha de auditoria imutável de cada lançamento, com autor, instante, valor anterior, novo valor e justificativa. 🔴
- Justificativa obrigatória no lançamento, com catálogo de motivos como conselho de classe e revisão de prova. 🔴
- Diário de classe em aplicativo de Progressive Web App, com armazenamento local e sincronização idempotente. 🔴
- Sistema de alerta precoce, com notificação ao coordenador e à família por 15% de faltas ou por média abaixo da linha de corte. 🔴
- Reprocessamento de promoção com falha, em vez do silenciamento da exceção. 🔴
- Apuração sob demanda, sem persistência, para conferência e prévia. 🔴
