# Calendario (i-Educar legado), Fluxos

> Fluxos da unit de calendário escolar que completam os flows do `design.md`.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Fluxo de abertura da grade mensal

**Gatilho:** o usuário abre a listagem de calendários.

1. O nível de acesso é conferido, com a recusa acima do nível sete. 🟢 `ieducar/intranet/educar_calendario_ano_letivo_lst.php:45-64`
2. Os dados da navegação são carregados da sessão ou da requisição, com o mês e o ano correntes como valores padrão. 🟢 `educar_calendario_ano_letivo_lst.php:72-97`
3. A instituição do usuário é obtida quando não há seleção explícita. 🟢 `educar_calendario_ano_letivo_lst.php:99-105`
4. As seleções dinâmicas são incluídas com a configuração dos campos. 🟢 `educar_calendario_ano_letivo_lst.php:107-109`
5. A consulta dos calendários filtra por escola, identificador e ano conforme o nível. 🟢 `educar_calendario_ano_letivo_lst.php:111-138`
6. Sem calendário, a mensagem é devolvida, e o usuário é direcionado à escolha da escola. 🟢 `educar_calendario_ano_letivo_lst.php:140-158`

---

## 2. Fluxo de montagem da grade do mês

**Gatilho:** um calendário existe para a escola e a listagem entra na renderização do conteúdo.

1. A grade `MonthCalendar` é criada com a largura e a troca de ano permitida. 🟢 `educar_calendario_ano_letivo_lst.php:190-193`
2. Os fins de semana são coloridos de rosa. 🟢 `educar_calendario_ano_letivo_lst.php:194-197`
3. Os dias marcados do mês são consultados com o motivo e a descrição. 🟢 `educar_calendario_ano_letivo_lst.php:199-202`
4. Cada dia marcado recebe o tipo derivado do motivo e a lista de turmas marcadas. 🟢 `educar_calendario_ano_letivo_lst.php:226-259`
5. Os dias com motivo ganham a legenda por tipo, e os com descrição sem motivo ganham a descrição. 🟢 `educar_calendario_ano_letivo_lst.php:278-297`
6. Os dias antes do início e depois do término do ano letivo recebem a legenda de não letivos, com o mês de início e o de término por partes. 🟢 `educar_calendario_ano_letivo_lst.php:305-370`
7. As anotações do mês são consultadas e marcadas na grade. 🟢 `educar_calendario_ano_letivo_lst.php:377-384`

---

## 3. Fluxo de criação do cabeçalho do calendário

**Gatilho:** a marcação de cabeçalho é gravada para uma escola e ano.

1. A permissão do processo 620 com a soma de nível sete é conferida. 🟢 `ieducar/intranet/educar_calendario_ano_letivo_cad.php:109-110`
2. As datas de início e de término são derivadas das etapas do ano letivo da escola. 🟢 `educar_calendario_ano_letivo_cad.php:112-113`
3. Sem datas válidas, a gravação é recusada com o alerta em script. 🟢 `educar_calendario_ano_letivo_cad.php:162-164`
4. Com calendário existente para o ano e a escola, o registro é atualizado com o usuário de exclusão. 🟢 `educar_calendario_ano_letivo_cad.php:122-141`
5. Sem calendário, o registro é criado com o usuário de cadastro, e o redirecionamento devolve à listagem com a marcação da navegação. 🟢 `educar_calendario_ano_letivo_cad.php:142-158`

---

## 4. Fluxo de marcação de um dia (criação)

**Gatilho:** o usuário grava a marcação de um dia sem registro.

1. A permissão do processo 620 é conferida com o mesmo redirecionamento das anotações. 🟢 `ieducar/intranet/educar_calendario_dia_cad.php:222-230`
2. O dia é composto pelo calendário, pelo mês e pelo dia, com o motivo opcional, a descrição obrigatória e o usuário de cadastro. 🟢 `educar_calendario_dia_cad.php:232-240`
3. A gravação é executada duas vezes em sequência, sem rollback. 🟢 `educar_calendario_dia_cad.php:240-242` 🔴
4. As turmas marcadas são inseridas com a chave composta de calendário, ano, mês, dia e turma. 🟢 `educar_calendario_dia_cad.php:244-253`
5. Com o sucesso, o redirecionamento aponta para a listagem de anotações com o dia marcado. 🟢 `educar_calendario_dia_cad.php:255-268`

---

## 5. Fluxo de edição da marcação do dia

**Gatilho:** a marcação de um dia com registro é gravada.

1. A permissão do processo 620 é conferida. 🟢 `educar_calendario_dia_cad.php:275-283`
2. O registro do dia é localizado pelo calendário, pelo mês e pelo dia, e o motivo e a descrição são atualizados. 🟢 `educar_calendario_dia_cad.php:285-295`
3. As turmas da requisição são compostas como inserções. 🟢 `educar_calendario_dia_cad.php:300-311`
4. As turmas persistidas são consultadas, e a diferença e a interseção são computadas. 🟢 `educar_calendario_dia_cad.php:313-325`
5. As turmas fora da requisição são apagadas, e as novas inseridas, com as já marcadas mantidas. 🟢 `educar_calendario_dia_cad.php:327-336`
6. Com o sucesso, o redirecionamento aponta para a listagem de anotações. 🟢 `educar_calendario_dia_cad.php:338-351`

---

## 6. Fluxo de exclusão da marcação do dia

**Gatilho:** a exclusão do dia é acionada na marcação.

1. A permissão de exclusão do processo 620 é conferida. 🟢 `educar_calendario_dia_cad.php:358-366`
2. O registro do dia é apagado, e as turmas marcadas com o dia se mantêm na tabela sem o dia referido. 🟢 `educar_calendario_dia_cad.php:368-375` 🔴

---

## 7. Fluxo de criação de anotação

**Gatilho:** o usuário grava anotação para um dia.

1. A existência do calendário é conferida, com o redirecionamento sem calendário. 🟢 `ieducar/intranet/educar_calendario_anotacao_cad.php:49-53` e `educar_calendario_anotacao_lst.php:50-58`
2. Sem registro do dia, o dia é criado com a descrição vazia e o usuário de cadastro. 🟢 `educar_calendario_anotacao_cad.php:97-113`
3. A anotação é criada com o nome, a descrição e o usuário. 🟢 `educar_calendario_anotacao_cad.php:115-120`
4. O vínculo entre o dia e a anotação é criado com o dia, o mês e o calendário. 🟢 `educar_calendario_anotacao_cad.php:121-130`
5. A criação do dia pela anotação não é auditada em código. 🔴

---

## 8. Fluxo de edição e exclusão de anotação

**Gatilho:** o usuário editou ou excluiu a anotação.

1. Na edição, o nome e a descrição são substituídos com o usuário de exclusão. 🟢 `educar_calendario_anotacao_cad.php:144-159`
2. Na exclusão, apenas a anotação é apagada, com o vínculo dependendo da exclusão em cascata do modelo. 🔴 `educar_calendario_anotacao_cad.php:167-174`
3. O redirecionamento devolve à listagem de anotações do dia. 🟢 `educar_calendario_anotacao_cad.php:152-154`

---

## 9. Fluxo de manutenção dos motivos

**Gatilho:** o usuário grava um motivo de dia.

1. O motivo é gravado com a escola, a sigla, a descrição, o tipo e o nome. 🟢 `ieducar/intranet/educar_calendario_dia_motivo_cad.php:88-108`
2. Na edição, os campos são atualizados sem a troca de escola. 🟢 `educar_calendario_dia_motivo_cad.php:110-129`
3. Na exclusão, o motivo é apagado sem verificação de vínculos com dias. 🔴 `educar_calendario_dia_motivo_cad.php:131-144`

---

## 10. Fluxo da listagem de anotações do dia

**Gatilho:** o usuário abre a listagem de anotações de um dia.

1. O calendário, o ano, o mês e o dia são exigidos, com a existência do calendário conferida. 🟢 `ieducar/intranet/educar_calendario_anotacao_lst.php:43-69`
2. O estado de navegação das marcações do dia fica em sessão. 🟢 `educar_calendario_anotacao_lst.php:61-66`
3. A listagem é paginada em vinte por página, com o nome e a descrição nas linhas. 🟢 `educar_calendario_anotacao_lst.php:77-102`
4. Com a permissão, os botões de nova anotação, de marcação de dia e de calendário ficam disponíveis. 🟢 `educar_calendario_anotacao_lst.php:103-109`

---

## 11. Fluxos ausentes no legado

Os fluxos abaixo aparecem no desenho do modelo novo e não têm implementação correspondente no código lido. Devem ser tratados como requisito novo, e não como reimplementação. 🔴

- Publicação do calendário com a rejeição de menos de 200 dias letivos e apresentação do diagnóstico. 🔴
- Bloqueio de lançamento de frequência e de conteúdo no diário de classe em dias não letivos. 🔴
- Calendário padrão da rede com escola nula e importação atômica para as escolas. 🔴
- Auditoria das marcações e das trocas de motivo. 🔴
- Consulta dos compromissos com público-alvo e notificações. 🔴
