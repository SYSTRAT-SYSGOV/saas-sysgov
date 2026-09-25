# Design

## Context

Ver `proposal.md` (seção Why) para a motivação. Contexto técnico relevante que molda as decisões abaixo:

- `ClipperDbfReader` (`apps/api/Modules/Cemiterios/Support/ClipperDbfReader.php`, extraído de `MigrarClipperCommand` nesta mudança) é um parser DBF genérico (campos `C`/`N`, corrigido para o bug de terminador nulo no nome do campo) reutilizado para `FUNCIONA.DBF`/`PEDREIRO.DBF`. É a base natural para os novos leitores de `TTT.DBF`/`OBA.DBF`.
- `PWUSUA.DBF`/`PWGRUPOS.DBF`/`PWTABELA.DBF` (tabelas de usuários/permissões) foram investigadas e **descartadas do escopo**: seu conteúdo binário está embaralhado/cifrado em 100% dos campos e registros — não é um problema de parsing corrigível como o de `FUNCIONA`/`PEDREIRO`, é uma cifra proprietária desconhecida. Ver nota de escopo em `proposal.md`.
- `TTT.DBF` tem a mesma estrutura de `LOTES.DBF` (`CEMITERIO`, `QUADRA`, `LOTE`, `TIPO`, `GAVETA`, `PROCESSO`, `VALIDADE`), mas o campo `LOTE` é subdividido em letra (`001A`, `001B`, `002B`...) e cada sub-lote tem seu próprio `PROCESSO`/`VALIDADE` de concessão — evidência de subdivisão de gavetas/nichos com concessão jurídica independente dentro do mesmo lote físico.
- `OBA.DBF` tem apenas `(CEMITERIO, QUADRA, LOTE)` — mesmo formato de índice de ocupação que `FALECIDO.DBF`, mas com ~2% de órfãos ao reconciliar contra `LOTES.DBF` (validado nesta sessão) — o que sugere que parte dos seus registros referencia os sub-lotes de `TTT.DBF`, não `LOTES.DBF` diretamente.
- `ModalQrCodeJazigo.tsx` hoje não recebe nem usa `Inumacao[]`; `ModalFichaCadastral.tsx` já recebe `ocupantes?: Inumacao[]` e usa o mesmo padrão de prop que a Plaqueta precisa adotar.

## Goals / Non-Goals

**Goals:**
- Reutilizar o parser DBF já corrigido e extraído nesta sessão (`ClipperDbfReader`) para os novos arquivos de origem (`TTT.DBF`, `OBA.DBF`), sem duplicar lógica de leitura binária.
- Manter os comandos de migração idempotentes (re-execução segura), seguindo o padrão `firstOrCreate` já estabelecido em `MigrarClipperCommand`.
- Adicionar a exibição de ocupante na Plaqueta QR Code com a menor mudança possível de contrato (mesma prop `ocupantes?: Inumacao[]` que `ModalFichaCadastral` já usa).

**Non-Goals:**
- Não migrar usuários/permissões do legado (`PWUSUA.DBF`/`PW_PERMIS`) — escopo abandonado, ver `proposal.md`.
- Não migrar a UI/tela administrativa do sistema Clipper (`CONTROLE.EXE`) — só dados.
- Não transformar automaticamente cada sub-lote de `TTT.DBF` em uma unidade de sepultamento (`Jazigo`) própria — a tabela de sub-lotes é um registro de auditoria/complemento do lote físico existente, não uma nova hierarquia de inventário. Promover sub-lotes a jazigos de primeira classe é uma decisão de produto fora do escopo desta mudança (ver Open Questions).

## Decisions

### 1. Nova tabela `cemetery_legacy_sublots` para `TTT.DBF` (não reaproveitar `plot_inventory`)
Um sub-lote de `TTT.DBF` tem processo/validade de concessão próprios, mas não tem dimensões físicas, GIS ou capacidade — não é um jazigo completo. Criar uma tabela dedicada (`tenant_id`, `plot_id` FK para o lote físico em `plot_inventory`, `codigo_sublote`, `processo_administrativo`, `validade_concessao`, `origem` default `'TTT.DBF'`) evita forçar um sub-lote dentro do schema de `Jazigo`, que exigiria campos nullable espúrios (comprimento, largura, GIS) que nunca se aplicam a um sub-lote. Alternativa considerada: adicionar `sublote` como coluna em `plot_inventory` — descartada porque um lote físico pode ter múltiplos sub-lotes (`001A`, `001B`), violando a cardinalidade 1:1 de uma coluna simples.

### 2. `OBA.DBF` vai para uma tabela de auditoria própria (`cemetery_legacy_sublot_occupancy`), não para `cemetery_legacy_deceased_lots`
Embora estruturalmente idêntico ao índice já criado para `FALECIDO.DBF` nesta sessão, `OBA.DBF` referencia sub-lotes (`TTT.DBF`), não lotes físicos diretos — misturar as duas semânticas na mesma tabela tornaria a FK ambígua (ora apontando para `plot_inventory`, ora para `cemetery_legacy_sublots`). Uma tabela separada com FK exclusiva para `cemetery_legacy_sublots` mantém a integridade referencial explícita.

### 3. Plaqueta QR Code recebe `ocupantes?: Inumacao[]` opcional, buscado com o mesmo padrão de `ModalFichaCadastral`
Em vez de duplicar a chamada `cemiteriosApi.inumacoes({ plot_id })`, o componente pai (`InventarioView`) já tem `listaOcupantes` carregado quando o Drawer está aberto — a Plaqueta aberta a partir do Drawer recebe a prop diretamente; quando aberta direto da listagem (sem Drawer aberto), o próprio `ModalQrCodeJazigo` busca sob demanda (mesmo padrão de fallback interno que `ModalFichaCadastral` já usa em `ocupantesProp === undefined`).

## Risks / Trade-offs

- [Promover sub-lotes de `TTT.DBF` para jazigos de primeira classe pode ser a expectativa real do usuário, não uma tabela de auditoria] → Mitigação: ver Open Questions — decisão de produto adiada, não decidida por suposição.

## Migration Plan

1. Extrair `ClipperDbfReader` de `MigrarClipperCommand` (concluído nesta mudança), com teste de regressão garantindo que `cemiterios:migrar-clipper` continua idêntico após a extração.
2. Criar migrations: `cemetery_legacy_sublots`, `cemetery_legacy_sublot_occupancy`.
3. Estender `MigrarClipperCommand` para ler `TTT.DBF`/`OBA.DBF` de Independência (arquivo específico da necrópole `02`, sem afetar o processamento do Central).
4. Atualizar `ModalQrCodeJazigo.tsx` e `InventarioView.tsx` para passar `ocupantes`.
5. Rodar o comando primeiro em `--dry-run` contra os dados reais antes de gravar em definitivo, seguindo o mesmo processo desta sessão.

Rollback: cada tabela nova é aditiva (não altera nenhuma tabela existente); reverter é um `migrate:rollback` das migrations desta mudança, sem impacto nos dados já migrados nesta sessão (jazigos, concessões, inumações).

## Open Questions

- Sub-lotes de `TTT.DBF` deveriam virar jazigos pesquisáveis/filtráveis no Inventário (unidade de sepultamento de primeira classe), ou permanecem só como metadado de auditoria do lote físico? Não muda a spec desta mudança (que já assume "metadado"), mas muda o escopo de uma eventual mudança futura — decisão de produto, não técnica.
