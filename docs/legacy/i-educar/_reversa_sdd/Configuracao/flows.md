# Configuracao (i-Educar legado), Fluxos

> Fluxos da unit de parametrização que completam os fluxos do `design.md`.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Fluxo de carga das configurações na requisição

**Gatilho:** qualquer requisição HTTP passa pelo middleware de configuração.

1. O dicionário de `public.settings` é resgatado em cache pela chave `settings.all` e injetado em `Config`. 🟢 `app/Http/Middleware/LoadSettings.php:58-62`
2. A configuração geral da instituição ativa é resgatada em cache pela chave `settings.general_configuration` e injetada como `legacy.config`. 🟢 `LoadSettings.php:21-29` e `app/Services/CacheService.php:17-19`
3. As credenciais da conexão do banco do controle são injetadas em chaves legadas. 🟢 `LoadSettings.php:37-48`
4. A requisição prossegue com a leitura pontilhada das configurações pelos consumidores. 🟢

## 2. Fluxo do lançamento de notas com o bloqueio do ano letivo

**Gatilho:** a API do diário recebe um lançamento de notas.

1. A escola e o ano letivo são consultados, e o ano encerrado com a bandeira escolar ligada recusa a alteração com a mensagem da escola. 🟢 `ieducar/modules/Avaliacao/Views/DiarioApiController.php:40-52`
2. O bloqueio da instituicao e do ano é consultado pela chave composta. 🟢 `DiarioApiController.php:54-57`
3. Com o bloqueio existente, a data atual é comparada com a janela permitida; fora da janela, o lançamento é recusado com a mensagem de bloqueio. 🟢 `DiarioApiController.php:59-69`
4. Dentro da janela, a verificação é aprovada e o lançamento prossegue. 🟢 `DiarioApiController.php:71`
5. Apenas o lançamento de notas atravessa esta verificação neste controlador; frequência, plano de aula, matrícula e histórico não consultam a janela no legado. 🔴 busca de consumo

## 3. Fluxo de gravação do bloqueio do ano letivo

**Gatilho:** o administrador grava o bloqueio pela tela do curso com o processo 21251.

1. O registro pela instituição e o ano é consultado para decidir entre criação e edição. 🟢 `ieducar/intranet/educar_bloqueio_ano_letivo_cad.php:34-53`
2. A tela apresenta a instituição, o ano e as duas datas declaradas como permitidas. 🟢 `:67-72`
3. Na criação, as datas convertidas são aceitas somente com instituição e ano numéricos e datas válidas em texto, e o registro é criado. 🟢 `:74-99`
4. Na edição, a janela é atualizada pela chave composta. 🟢 `:101-123`
5. Na exclusão, o registro é apagado pela chave composta sem verificação de vínculos. 🟢 `:125-144`

## 4. Fluxo de gravação das configurações gerais

**Gatilho:** o operador de nível um grava as configurações gerais.

1. A entrada exige nível um e o processo 999873, com a instituição resolvida pelo operador. 🟢 `ieducar/intranet/educar_configuracoes_gerais.php:56-72`
2. O registro um a um da instituição ativa é carregado e os atributos espelhados na tela. 🟢 `:81-107`
3. As cerca de vinte entradas do formulário apresentam caixas, textos, seleções e rodapés. 🟢 `:108-272`
4. Na gravação, as caixas são convertidas para um ou zero e o registro é reescrito. 🟢 `:274-277`

## 5. Fluxo de gravação do dicionário de parâmetros

**Gatilho:** o administrador salva a tela de configurações do sistema.

1. A entrada exige administrador; os demais recebem erro de permissão. 🟢 `app/Http/Controllers/SettingController.php:31-33`
2. As categorias com as respectivas configurações são apresentadas em ordem. 🟢 `:35-40`
3. Na gravação, cada chave da requisição atualiza o registro com o id correspondente, sem lista de permissões nem validação de tipo no servidor. 🟡 `:48-52`
4. O evento de configurações atualizadas é disparado, e o redirecionamento com a mensagem de sucesso acontece. 🟢 `:52-56`
5. O cache do dicionário é recarregado na próxima requisição pelo invalidamento do serviço. 🟡 `app/Services/CacheService.php`

## 6. Fluxo de edição da mantenedora

**Gatilho:** o operador edita a instituição com o processo 559.

1. O registro é carregado por `clsPmieducarInstituicao::detalhe` e todos os atributos espelham a tela. 🟢 `ieducar/intranet/educar_instituicao_cad.php:124-137`
2. As bandeiras do banco são convertidas para booleano com `dbBool`. 🟢 `:143-166`
3. O formulário é montado por seções: identidade, datas, históricos, reserva de vaga, relatórios e processos escolares. 🟢 `:171-399`
4. Na gravação, a edição via classe legada aplica os atributos, e volta para a listagem em caso de sucesso. 🟡 `:401-408`

## 7. Fluxos ausentes no legado

Os fluxos abaixo aparecem no desenho do modelo novo e não têm implementação correspondente no código lido. Devem ser tratados como requisito novo. 🔴

- Bloqueio por tipo de operação (notas, frequência, plano, matrícula, histórico) com escopo por rede, etapa ou escola. 🔴
- Tolerância retroativa por lançamento. 🔴
- Prorrogação auditada por operador, turma e componente com protocolo e validade. 🔴
- Criptografia de parâmetros sensíveis no dicionário. 🔴
- Validação de tipo e lista de permissões na gravação do dicionário. 🔴
- Auditoria dos parâmetros com autor e valor anterior. 🔴
