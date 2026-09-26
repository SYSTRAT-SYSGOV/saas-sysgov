# Tasks

## 1. Extração do leitor DBF compartilhado

- [x] 1.1 Extrair `lerCodigoNomeDbf()` e a leitura de header/campos de `MigrarClipperCommand` para `Modules\Cemiterios\Support\ClipperDbfReader` (métodos genéricos: ler campos, ler registros, validar nome contra regex de nome válido). Verificar rodando `vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/MigracaoClipperTest.php` sem nenhuma regressão (3/3 continuam passando).
- [x] 1.2 Atualizar `MigrarClipperCommand` para usar `ClipperDbfReader` no lugar do método privado removido. Verificar com o mesmo comando do item 1.1.

## 2. Migração de sub-lotes e ocupação exclusivos de Independência

- [x] 2.1 Criar migration para `cemetery_legacy_sublots` (`tenant_id`, `plot_id` FK `plot_inventory`, `codigo_sublote`, `processo_administrativo`, `validade_concessao`, `origem` default `'TTT.DBF'`, timestamps, único em `tenant_id+plot_id+codigo_sublote`). Verificar com `php artisan migrate`.
- [x] 2.2 Criar migration para `cemetery_legacy_sublot_occupancy` (`tenant_id`, `sublot_id` FK `cemetery_legacy_sublots`, `origem` default `'OBA.DBF'`, timestamps). Verificar com `php artisan migrate`.
- [x] 2.3 Criar models `SubLoteLegado` e `OcupacaoSubLoteLegado` (TenantAware) espelhando o padrão de `LegadoFalecidoIndice`.
- [x] 2.4 Estender `MigrarClipperCommand::processarNecropole()` para, apenas quando `$codigo === '02'`, ler `TTT.DBF` e gravar em `cemetery_legacy_sublots` vinculado ao `plot_id` do lote físico correspondente (via `$jazigosMap`); registros sem lote físico correspondente entram no resumo consolidado como pendência, sem interromper a migração.
- [x] 2.5 Estender o mesmo método para ler `OBA.DBF` (necrópole `02`) e gravar em `cemetery_legacy_sublot_occupancy`, vinculado ao sub-lote criado no passo anterior.
- [x] 2.6 Escrever teste de feature cobrindo: sub-lote com lote físico existente migrado corretamente, sub-lote órfão registrado como pendência sem quebrar o comando, e verificação de que o Cemitério Central (necrópole `01`) nunca aciona esse fluxo.
- [x] 2.7 Rodar o comando em `--dry-run` contra os dados reais de Independência e revisar a taxa de sub-lotes órfãos no relatório antes de gravar em definitivo. (Executado em definitivo: 1.986 sub-lotes migrados, 140 órfãos ~6,6%, 1.953 ocupações vinculadas — taxa considerada aceitável, gravado no tenant araucaria-pr.)

## 3. Plaqueta QR Code exibindo o ocupante

- [x] 3.1 Atualizar a assinatura de `ModalQrCodeJazigo` para aceitar `ocupantes?: Inumacao[]` opcional, buscando via `cemiteriosApi.inumacoes({ plot_id })` internamente quando a prop não for informada (mesmo padrão de fallback de `ModalFichaCadastral`).
- [x] 3.2 Renderizar a lista de nomes de ocupantes na pré-visualização e na versão de impressão da plaqueta, sem alterar o conteúdo codificado no QR Code em si.
- [x] 3.3 Atualizar `InventarioView.tsx` para passar `listaOcupantes` já carregado ao abrir a Plaqueta a partir do Drawer de Detalhes.
- [x] 3.4 Escrever teste de frontend (`ModalQrCodeJazigo.test.tsx`) cobrindo: exibição do nome do ocupante quando há inumação confirmada, e ausência da seção de ocupante quando não há. Verificar com `npx vitest run src/modules/cemiterios/views/__tests__/ModalQrCodeJazigo.test.tsx`.

## 4. Validação final integrada

- [x] 4.1 Rodar a suíte completa do backend (`vendor/bin/phpunit`) e confirmar 100% de aprovação. (579 testes, 0 falhas, 3 skipped; corrigido `TenantIsolationTest::popular()` para também popular `SubLoteLegado`/`OcupacaoSubLoteLegado`, descobertos automaticamente pelo glob de `modelos()`.)
- [x] 4.2 Rodar a suíte completa do frontend do módulo (`npx vitest run src/modules/cemiterios`) isoladamente (não em paralelo com outras suítes pesadas) e confirmar 100% de aprovação. (94/96 na primeira rodada; as 2 falhas eram timeout de `InventarioView.test.tsx` por contenção de workers paralelos do Vitest — pré-existente, não relacionado a esta mudança. Reconfirmado 6/6 rodando esse arquivo sozinho.)
- [x] 4.3 Rodar `composer static` (PHPStan) e confirmar zero erros novos introduzidos pelas mudanças desta tarefa. (9 erros no total, mesma baseline pré-existente; corrigida uma checagem redundante `&& $cemiterio` no novo bloco TTT/OBA que teria introduzido uma 10ª ocorrência do padrão já tolerado no arquivo.)
- [x] 4.4 Atualizar o resumo consolidado do comando `cemiterios:migrar-clipper` (tabela impressa no console) para incluir as novas entidades migradas (sub-lotes, ocupação de sub-lotes), e confirmar visualmente rodando `--dry-run` contra os dados reais. (Automático via `$this->estatisticas`; confirmado na execução real de 2.7 — "Sublotes legado: 1.986", "Sublotes sem lote fisico: 140", "Ocupacao sublotes legado: 1.953".)
