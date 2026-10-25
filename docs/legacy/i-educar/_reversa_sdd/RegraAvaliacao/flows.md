# RegraAvaliacao (i-Educar legado), Fluxos

> Fluxos da unit de regras de avaliação que completam os flows do `design.md`.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Fluxo de listagem de regras

**Gatilho:** o usuário abre a listagem de regras de avaliação.

1. A listagem declara o processo 947 e o data mapper legado da regra. 🟢 `ieducar/modules/RegraAvaliacao/Views/IndexController.php:8-12`
2. O campo de ano dinâmico é renderizado, com o valor da requisição. 🟢 `IndexController.php:29-35`
3. O filtro de série carrega as séries ativas, ordenadas por nome, com a opção vazia inicial. 🟢 `IndexController.php:37-57`
4. A consulta Eloquent carrega as regras com os relacionamentos de fórmula de média e de recuperação. 🟢 `IndexController.php:71-75`
5. Os filtros de ano e de série são aplicados por existência de vínculo na tabela de série e ano. 🟢 `IndexController.php:76-85`
6. Cada linha é rotulada: o tipo de nota e o tipo de progressão são resolvidos pelos enumerados legados, e as fórmulas pelo relacionamento Eloquent. 🟢 `IndexController.php:87-94`
7. As médias são formatadas com duas casas decimais no padrão brasileiro. 🟢 `IndexController.php:90-91`

---

## 2. Fluxo de abertura do formulário de cadastro

**Gatilho:** o usuário acessa `module/RegraAvaliacao/edit` sem identificador.

1. O controlador declara o processo 947 e o nível de acesso institucional. 🟢 `EditController.php` (propriedades `_processoAp` e `_nivelAcessoOption`)
2. O recurso JavaScript da tela é registrado para montagem dinâmica dos campos. 🟢 `EditController.php:340-342`
3. O título é definido como "Cadastrar regra de avaliação". 🟢 `EditController.php:344-348`
4. O formulário é montado com o campo oculto de identificador vazio, a lista de instituições e os campos de configuração. 🟢 `EditController.php:354-384`

---

## 3. Fluxo de edição de regra existente

**Gatilho:** o usuário acessa `module/RegraAvaliacao/edit` com `id` e sem `copy`.

1. O título é definido como "Editar regra de avaliação". 🟢 `EditController.php:344-348`
2. Na gravação, a existência de `id > 0` sem `copy` localiza a entidade pelo data mapper. 🟢 `EditController.php:975-978`
3. Os campos de dados enviados são mesclados na entidade pelo `_formMap`. 🟢 `EditController.php:969-973` e `:1015-1016`

---

## 4. Fluxo de cópia da regra

**Gatilho:** o usuário aciona o botão "Copiar regra" na tela de detalhe, ou abre `edit?id={id}&copy=true`.

1. A tela de detalhe exibe o botão de cópia com o destino `edit?id={id}&copy=true`. 🟢 `ViewController.php:54`
2. O formulário é aberto com o título de cadastro e a ação `Novo`. 🟢 `EditController.php:344-348` e `:356-358`
3. Na gravação, como `id > 0` com `copy`, a entidade não é localizada, e é criada nova a partir dos dados do formulário. 🟢 `EditController.php:975` e `:1017-1018`
4. Por cada linha de recuperação a persistir, uma recuperação é recriada para o identificador da regra de origem, além da gravação da linha para a regra de destino. 🟢 `EditController.php:1094-1104`
5. Ao fim, os parâmetros de sucesso apontam para a nova regra gravada. 🟢 `EditController.php:1124-1126`

**Observação:** este comportamento é suspeito de acumular regras de recuperação duplicadas na regra de origem, pois as linhas são recriadas para a regra copiada, além das gravadas para a nova; requer verificação na base real. 🔴

---

## 5. Fluxo de gravação da regra

**Gatilho:** o usuário envia o formulário de cadastro ou edição.

1. O tipo de nota é conferido: com tipo 3, a tabela numérica recebe o valor do campo `tabelaArredondamentoNumero`; com demais tipos, a conceitual é anulada. 🟢 `EditController.php:963-967`
2. Os dados da requisição são filtrados pelo `_formMap`. 🟢 `EditController.php:969-973`
3. As caixas de seleção ausentes são fixadas em zero. 🟢 `EditController.php:980-1013`
4. A entidade é atualizada ou criada. 🟢 `EditController.php:1015-1019`
5. A compatibilidade de presença com a regra diferenciada é conferida, com recusa e mensagem na divergência. 🟢 `EditController.php:1021-1025`
6. A configuração de pontos é conferida pelo padrão `^(|\d+(,\d+)*)$`, com recusa e mensagem na divergência. 🟢 `EditController.php:1027-1031`
7. O validador do domínio é executado sobre a entidade, com recusa e agrupamento de mensagens na divergência. 🟢 `EditController.php:1033-1039`
8. As linhas de recuperação são preparadas: existentes são atualizadas, com exclusão marcada são excluídas, novas são criadas, e recuperações inválidas abortam a gravação. 🟢 `EditController.php:1041-1080`
9. A regra e as recuperações são gravadas em transação, com confirmação ao fim. 🟢 `EditController.php:1081-1116`
10. Na exceção, o rollback é executado e a mensagem "Erro no preenchimento do formulário. {mensagem}" é devolvida. 🟢 `EditController.php:1117-1122`

---

## 6. Fluxo de recusa por apuração de frequência incompatível

**Gatilho:** a regra inclusiva tem o tipo de presença divergente da regra diferenciada.

1. A gravação recolhe o tipo de presença e o identificador da regra diferenciada. 🟢 `EditController.php:1021`
2. Sem regra diferenciada, a verificação é pulada. 🟢 `EditController.php:1138-1140`
3. A regra diferenciada é localizada pelos modelos Eloquent com busca obrigatória. 🟢 `EditController.php:1142`
4. Com o tipo de presença divergente, a gravação é recusada com a mensagem de apuração incompatível. 🟢 `EditController.php:1144-1148` e `:1022-1024`

---

## 7. Fluxo de recusa por configuração de pontos inválida

**Gatilho:** o campo `pontos` não casa com o padrão `^(|\d+(,\d+)*)$`.

1. O padrão admite vazio, ou uma lista de números separados por vírgula. 🟢 `EditController.php:1154-1156`
2. Com o padrão divergente, a gravação é recusada com a mensagem de configuração de pontos inválida. 🟢 `EditController.php:1027-1031`

---

## 8. Fluxo de recusa pelo validador do domínio

**Gatilho:** qualquer validação de coerência da regra falha.

1. O validador do módulo é instanciado e executado sobre a entidade. 🟢 `EditController.php:1033-1035`
2. As mensagens de erro são agrupadas com separador de quebra de linha em HTML, e a gravação é interrompida antes da transação. 🟢 `EditController.php:1036-1039`
3. Exemplos de recusa: nota máxima menor ou igual à mínima, presença fora do intervalo de 0 a 100, falta máxima menor ou igual à mínima. 🟢 `Validators/RegraAvaliacaoValidator.php`

---

## 9. Fluxo de gestão das recuperações por etapa

**Gatilho:** o formulário inclui linhas de recuperação de etapas específicas.

1. As recuperações enviadas são iteradas com a contagem por número de identificadores. 🟢 `EditController.php:1042-1045`
2. Com o identificador já existente na regra, a instância é recolhida e atualizada. 🟢 `EditController.php:1066-1067`
3. Com instância nova não vazia, a exclusão marcada com identificador numérico remove o registro, e sem exclusão a recuperação é enfileirada para inserção. 🟢 `EditController.php:1069-1078`
4. A etapa recuperada é uma string separada por `;`, com cada valor o número da etapa. 🟢 `RegraRecuperacao.php` e `app/Models/LegacyRemedialRule.php:31-34`
5. A recuperação é persistida pelo data mapper específico em transação com a regra. 🟢 `EditController.php:1105-1115`
6. A nota máxima da recuperação é a nota máxima geral da regra, exceto nas etapas específicas, em que vem da regra da etapa. 🟢 `Regra.php:281-290`

---

## 10. Fluxo de transação com rollback

**Gatilho:** qualquer falha na gravação da regra ou de suas recuperações.

1. A transação é aberta antes da gravação da regra. 🟢 `EditController.php:1081-1082`
2. A regra é gravada, e o identificador é recolhido da entidade persistida. 🟢 `EditController.php:1084-1090`
3. As recuperações enfileiradas são persistidas em sequência, com a recusa de recuperação inválida elevando exceção. 🟢 `EditController.php:1092-1115`
4. Na exceção, o rollback é executado e a mensagem de erro é composta com o texto da exceção. 🟢 `EditController.php:1117-1122`
5. Nenhuma alteração da regra e das recuperações fica persistida. 🟢 consequência do rollback

---

## 11. Fluxo de detalhamento da regra

**Gatilho:** o usuário abre `module/RegraAvaliacao/view?id={id}`.

1. O controlador declara o processo 947 e a tabela de campos exibidos. 🟢 `ViewController.php:18` e `:23-43`
2. O breadcrumb é definido, e o botão de cópia é adicionado. 🟢 `ViewController.php:48-55`
3. O valor da tabela de arredondamento é substituído por enlace à tela de detalhe da tabela. 🟢 `ViewController.php:60-70`
4. Os valores das fórmulas de média e de recuperação são substituídos por enlace às telas de detalhe das fórmulas. 🟢 `ViewController.php:72-82`

---

## 12. Fluxo de resolução da regra aplicável (consumo)

**Gatilho:** o motor de apuração precisa da regra de uma série em um ano letivo.

1. A turma resolve a regra pela série e pelo ano, com a regra diferenciada prevalecendo quando a escola a utiliza. 🟢 `app/Models/LegacySchoolClass.php:648-661`
2. A leitura da regra no boletim é feita por cache de cinco minutos, indexada pelo identificador da regra. 🟢 `ieducar/modules/Avaliacao/Service/Boletim.php:3377-3386`
3. A recuperação aplicável à etapa é resolvida pelas etapas recuperadas das regras de recuperação. 🟢 `Regra.php:264-273`

**Observação:** o cache de cinco minutos é mantido pelo consumidor, e não foi localizado nenhum mecanismo de invalidação no evento de alteração da configuração. 🔴

---

## 13. Fluxos ausentes no legado

Os fluxos abaixo aparecem no desenho do modelo novo, em `_reversa_sdd/RegraAvaliacao/legacy-mapping.md`, e não têm implementação correspondente no código lido. Devem ser tratados como requisito novo, e não como reimplementação. 🔴

- API REST JSON de manutenção de regras, fórmulas e tabelas, com autenticação e validação por tenant. 🔴
- Avaliador de fórmulas seguro por AST, com validação no cadastro e sem `eval`. 🔴
- Simulador de fórmulas e de regras, com entrada de notas e com devolução de média, conceito e situação. 🔴
- Trilha de auditoria das mudanças de regra, com autor, instante, valor anterior e novo valor. 🔴
- Proteção de exclusão de regra vinculada a séries, com indicação dos vínculos. 🔴
- Invalidação do cache da regra na alteração da configuração. 🔴
