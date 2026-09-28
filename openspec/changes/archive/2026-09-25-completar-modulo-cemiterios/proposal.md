# Proposal

## Why

A migração do acervo histórico do sistema Clipper (Central e Independência) para o SYSGOV já está concluída (9.834 jazigos, 15.584 concessões, 19.814 inumações). Uma lacuna ficou registrada, mas nunca implementada: as tabelas exclusivas de Independência (`OBA.DBF`/`TTT.DBF`). Além disso, a experiência da aba Inventário ainda não expõe de forma consistente os dados do sepultado em todos os pontos de contato — hoje a Plaqueta QR Code não traz nenhuma referência ao ocupante do jazigo, enquanto a Ficha Cadastral e o Drawer via "Ver no Mapa" já o fazem. Fechar essas duas frentes completa o módulo de Gestão de Cemitérios dentro do que é tecnicamente viável a partir dos dados do legado.

> **Nota de escopo**: a migração de usuários e permissões do legado (`PWUSUA.DBF`/`PWGRUPOS.DBF`/`PWTABELA.DBF`) foi avaliada e **abandonada** nesta mudança — o conteúdo binário dessas três tabelas está embaralhado/cifrado (100% dos campos, em 100% dos registros, nas três tabelas), um padrão consistente com biblioteca de proteção de senha do próprio Clipper. Decodificar exigiria engenharia reversa de uma cifra proprietária desconhecida (provavelmente a partir do executável `CONTROLE.EXE` original), sem garantia de sucesso — decisão do usuário foi não perseguir essa frente. Contas de usuário para essas necrópoles devem ser criadas manualmente no SYSGOV, sem vínculo com o cadastro legado.

## What Changes

- **Plaqueta QR Code (`ModalQrCodeJazigo`)**: passa a exibir o nome do(s) ocupante(s) atual(is) do jazigo (quando houver inumação confirmada) na pré-visualização e na impressão, mantendo o QR Code apontando apenas para o identificador do jazigo e a URL do portal (sem expor dado sensível do falecido no próprio código).
- **Ficha Cadastral (`ModalFichaCadastral`)**: já lista falecido, data de sepultamento e certidão por ocupante — auditoria confirma que o requisito atual está atendido; nenhuma mudança de comportamento é necessária aqui, apenas cobertura de teste equivalente à nova funcionalidade da Plaqueta.
- **"Ver no Mapa"**: já reaproveita o `DetalheJazigo` (mesmo Drawer do Inventário, com lista completa de ocupantes) ao clicar no marcador — auditoria confirma que o requisito atual está atendido; sem mudança de comportamento.
- **Migração de `OBA.DBF`/`TTT.DBF` (exclusivo de Independência)**: `TTT.DBF` tem a mesma estrutura de `LOTES.DBF`, mas com código de lote subdividido em letras (ex.: `001A`, `001B`) e processo/validade de concessão próprios — indício de subdivisão de gavetas/nichos dentro de um lote físico com concessão independente. `OBA.DBF` é um índice de ocupação equivalente ao `FALECIDO.DBF`, mas referenciando os lotes de `TTT.DBF`. **BREAKING** potencial no schema de jazigos caso confirmado que cada sub-lote precisa virar uma unidade de sepultamento própria (LACUNA 🔴 a validar em `design.md` antes da implementação).

## Capabilities

### New Capabilities
- `cemiterio/migracao-oba-independencia`: migração e preservação dos registros de sub-lotes (`TTT.DBF`) e índice de ocupação (`OBA.DBF`) exclusivos do Cemitério Independência.

### Modified Capabilities
- `cemiterio/inventario`: expande o requisito de emissão de Plaqueta QR Code (atualmente restrito a identificador do jazigo, necrópole, setor e capacidade) para incluir o nome do(s) ocupante(s) atuais na visualização e impressão.

## Impact

- **Backend (`apps/api/Modules/Cemiterios`)**: novas tabelas/migrations para sub-lotes e ocupação de sub-lotes de Independência (schema definido em `design.md`); nenhuma mudança em `OperacaoController`/`JazigoController` além do necessário para expor ocupantes na resposta de `GET /jazigos/{id}` (já expõe via `inumacoes`).
- **Frontend (`apps/web-client/src/modules/cemiterios`)**: `ModalQrCodeJazigo.tsx` passa a receber e renderizar `ocupantes` (mesmo tipo `Inumacao[]` já usado por `ModalFichaCadastral`/`InventarioView`).
- **Testes**: novo teste de backend para a migração de sub-lotes; novo teste de frontend para `ModalQrCodeJazigo` cobrindo exibição do ocupante; nenhum teste existente de `ModalFichaCadastral`/Mapa muda, pois o comportamento já está correto.
- **Dependências**: nenhuma nova dependência de pacote; usa a mesma infraestrutura de leitura DBF já implementada nesta sessão (`ClipperDbfReader`).
- **Escopo abandonado**: migração de usuários/permissões do legado — ver nota de escopo na seção Why.
