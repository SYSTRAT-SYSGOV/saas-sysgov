# Tasks: Revisão do Inventário, Eliminação do Scroll Horizontal e Saneamento de Importação

## 1. Ajustes no Backend (Consultas e Eager Loading)

- [x] 1.1 Otimizar o relacionamento `concessoes` em `JazigoController.php` para filtrar exclusivamente concessões com `situacao = 'vigente'`, ordenando por ID decrescente e verificar que concessões inativas não são retornadas como cotitulares.
- [x] 1.2 Otimizar o relacionamento `inumacoes` em `JazigoController.php` para filtrar por `situacao = 'confirmada'`, ordenando por `sepultado_em` decrescente e verificar que sepultamentos cancelados não entram na listagem.
- [x] 1.3 Adicionar método ou accessor para sanitização de falecidos não identificados ou legados sentinelas no model `Falecido` ou serializer da API e verificar resposta JSON.

## 2. Comando Artisan de Reconciliação Cadastral

- [x] 2.1 Criar o comando `Modules/Cemiterios/Console/ReconciliarInventarioCommand.php` (`cemiterios:reconciliar-inventario`) com suporte a `--tenant`, `--dry-run` e `--necropole`.
- [x] 2.2 Implementar rotina de re-sincronização de contagem real de inumações confirmadas para a coluna `ocupacao` de `plot_inventory` e verificar consistência com o banco.
- [x] 2.3 Implementar reavaliação canônica do campo `estado` (`capacidade_maxima`, `ocupado`, `concedido`, `disponivel`, preservando `manutencao`) e verificar log de transição.
- [x] 2.4 Implementar detecção e sinalização de registros sentinelas órfãos com quadra/lote zerados (`0000`) e opção de arquivamento seguro (`soft delete`).
- [x] 2.5 Registrar o comando no `CemiteriosServiceProvider.php` e verificar listagem em `php artisan list cemiterios`.

## 3. Blindagem da Importação Legada (Clipper)

- [x] 3.1 Atualizar `MigrarClipperCommand.php` para descartar linhas de `LOTES.csv` com `QUADRA === '0000'` e `LOTE === '0000'` ou valores vazios e verificar que jazigos sentinelas não são criados.
- [x] 3.2 Aperfeiçoar o tratamento de falecidos sentinelas em `DADOS.csv`, marcando `revisao_pendente = true` quando o nome for equivalente a "NAO CONSTA FALECIDO" ou "SEM NOME".
- [x] 3.3 Adicionar trava anti-duplicação de concessões vigentes para o mesmo titular na mesma sepultura durante a carga.

## 4. Frontend: Responsividade e Eliminação do Scroll Horizontal

- [x] 4.1 Consolidar as colunas `Código` e `Setor/Quadra` em uma única coluna integrada de **Topografia & Localização** em `InventarioView.tsx`, com código em JetBrains Mono e quadra/setor como subtítulo secundário.
- [x] 4.2 Consolidar as colunas `Tipo` e `Dimensões (m)` em **Tipo & Dimensões**, exibindo dimensões métricas apenas quando preenchidas e eliminando a coluna autônoma de dimensões.
- [x] 4.3 Ajustar a coluna **Titular / Concessão** para exibir apenas o titular da concessão vigente e contabilizar exclusivamente cotitulares ativos no badge `(+N)`.
- [x] 4.4 Compactar a coluna de **Ações** para um botão `Ver` direto de alta densidade e menu de ações complementares (QR Code, Ficha Cadastral), reduzindo a largura ocupada.
- [x] 4.5 Ajustar as larguras das colunas e containers do `DataTable` para garantir que a soma não exceda a largura do layout principal, eliminando o scroll horizontal em resoluções desktop padrão (>= 1280px).

## 5. Frontend: Higienização Visual e Importador Assistido

- [x] 5.1 Adicionar tratamento visual na coluna de sepultados para exibir *Sem identificação nominal (Histórico)* em tom atenuado quando o nome for sentinela legado, preservando a data de sepultamento e acesso aos detalhes.
- [x] 5.2 Garantir sincronismo visual perfeito entre a barra de progresso de ocupação de gavetas e o badge de estado (`Disponível`, `Concedido`, `Ocupado`, `Capacidade Máxima`).
- [x] 5.3 Revisar e validar o componente `ModalImportadorJazigos.tsx`, assegurando validação de duplicatas de código em tempo real e tratamento de erros por linha.

## 6. Verificação e Testes

- [x] 6.1 Atualizar e rodar os testes unitários do frontend em `apps/web-client/src/modules/cemiterios/views/__tests__/InventarioView.test.tsx` e verificar aprovação com `npm test`.
- [x] 6.2 Executar testes de integração do módulo de Cemitérios no backend com `php artisan test --filter=Jazigo` e verificar 100% de testes verdes.
- [x] 6.3 Testar visualmente a tabela com diferentes larguras de janela e confirmar ausência de overflow horizontal indesejado.
