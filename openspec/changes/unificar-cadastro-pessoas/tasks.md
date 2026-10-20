# Tasks

## 1. Modelo de dados do cadastro central (Fase 0)

- [x] 1.1 Criar migration que torna `documento` e `documento_hash` anuláveis apenas para `tipo = fisica` e adiciona `documento_pendente` (boolean, índice `[tenant_id, documento_pendente]`), com backfill `false`. Verificar: `php artisan migrate` e `migrate:rollback` limpos em banco com dados; teste de migration confirma que os registros existentes não mudam.
- [x] 1.2 Ajustar `Pessoa` (cast, `boot`, escopos e acessores) para tratar documento nulo sem gerar hash, expor `documento_pendente` e manter a unicidade só para documentos informados. Verificar: teste unitário com duas pessoas pendentes no mesmo tenant (aceitas) e CPF repetido (rejeitado).
- [x] 1.3 Criar tabela `pessoas_divergencias` (módulo, tabela e registro de origem, campo, valor do módulo, valor do MDM, estado, decisão, usuário, datas) com índice por tenant, módulo e estado. Verificar: migration aplica e reverte; teste de isolamento por tenant.

## 2. Regras de negócio e validação (Fase 0)

- [x] 2.1 Atualizar `StorePessoaRequest`/`UpdatePessoaRequest`: física pode omitir CPF (vira pendente), exige nome e data de nascimento quando pendente, e exige `responsavel_id` (pessoa física do tenant) para menor de 18 anos pendente. Verificar: testes de feature para cada cenário da spec `pessoas` (menor sem responsável, responsável de outro tenant, responsável jurídico).
- [x] 2.2 Implementar a regularização do documento (preenche CPF, limpa o estado, mantém `pessoa_id`, vínculos e referências) e a recusa quando o CPF pertence a outra pessoa, devolvendo a pessoa existente. Verificar: testes de feature dos dois cenários de regularização, com auditoria registrada.
- [x] 2.3 Implementar a mesclagem de duas pessoas físicas (mantém uma, reaponta as referências dos módulos, soft-delete da outra, auditoria). Verificar: teste de feature que cria referências em dois módulos, mescla e confere o reapontamento e o histórico.
- [x] 2.4 Centralizar a validação de CPF/CNPJ no `Documento` do Pessoas e fazer `Support/Documento` de Campanha e Inservível delegarem integralmente a ele (removendo as regras próprias). Verificar: testes existentes dos dois módulos continuam verdes; teste novo compara o resultado entre módulos para CPF com e sem máscara.

## 3. Contrato de consumo para os módulos (Fase 0)

- [x] 3.1 Estender `ResolucaoPessoaService` com a resolução sem documento (cria pessoa pendente, só completa campos vazios, audita a origem) e a sugestão de pessoa existente por nome e data de nascimento antes de criar. Verificar: testes de serviço de criação, de completar campos vazios sem sobrescrever e de sugestão de duplicidade.
- [x] 3.2 Generalizar o padrão de gravação civil do `AlunoPessoaService` em um serviço reutilizável do MDM para que edições de dado civil feitas em módulos sejam gravadas na pessoa com origem auditada. Verificar: teste de feature de edição a partir de um módulo conferindo a pessoa e o registro de auditoria.
- [x] 3.3 Atualizar `PessoaResource`, a busca compacta, a exportação e a importação para pessoa pendente (sem documento e sem dado de menor em listagens e seletores). Verificar: testes de feature confirmando que o seletor compacto devolve nome e indicador de pendência, sem documento, nascimento ou filiação.

## 4. Conciliação e relatório de adoção (Fase 0)

- [x] 4.1 Criar o comando base de conciliação (`pessoas:conciliar {modulo} --dry-run`) com resolução por documento, criação de pessoa pendente, preenchimento de campos vazios e gravação de divergências; idempotente. Verificar: teste executa duas vezes sobre os mesmos registros e confirma que a segunda não cria pessoa nem altera registro.
- [x] 4.2 Criar o fluxo de revisão de divergências (listar por módulo, escolher o valor que prevalece, auditar) na API com permissão específica. Verificar: testes de feature de listagem, resolução com valor do módulo e com valor do MDM, e acesso negado sem permissão.
- [x] 4.3 Criar o relatório de adoção por módulo (vinculados, sem vínculo, pendentes, divergências abertas) para administradores da plataforma, apenas com totais. Verificar: teste de feature confere os totais e a ausência de dados civis individuais.
- [x] 4.4 Criar a trava de remoção de colunas duplicadas (bloqueia se houver registro sem pessoa ou divergência aberta), reutilizável pelas fases dos módulos. Verificar: testes dos cenários "módulo com divergências abertas" e "módulo conciliado".

## 5. Interface compartilhada (Fase 0)

- [x] 5.1 Atualizar `PessoaFormModal` e `PessoaPicker` (`@sysgov/ui`) e o SDK (`@sysgov/sdk`) para cadastro sem CPF (nome, nascimento, responsável para menor), sugestão de pessoa existente e indicador visual de documento pendente. Verificar: testes de componente (Vitest) e `tsc --noEmit` limpos.
- [x] 5.2 Na ficha da pessoa, adicionar a ação de regularizar documento, a mesclagem e o aviso de documento pendente. Verificar: teste de componente do fluxo de regularização (CPF novo, CPF de outra pessoa com mesclagem, sem permissão de mesclar, CPF inválido).
- [x] 5.3 Criar a tela de revisão de divergências e o painel de adoção no módulo Pessoas do web-client (aba "Conciliação", visível para quem tem `cadastros.pessoas.divergencias.manage`), pois os dados são do tenant e a permissão é do módulo. Verificar: testes de componente (adoção só com totais, divergência com os dois valores, resolução com confirmação, estados vazios).

## 6. Planejamento das fases por módulo

- [x] 6.1 Criar as changes das Fases 1 a 5 com `openspec new change` e `proposal.md` resumido (Escola, Capd, Cemitérios/Campanha/Cursos/Multiprofissional, Inservível/Passeio/Procurement, remoção das colunas), referenciando esta change. Verificar: `openspec list` mostra as cinco changes e `openspec validate` passa em cada uma.
- [ ] 6.2 Executar a conciliação em `--dry-run` sobre os dados de produção (Escola e Capd) e anexar o relatório à change da Fase 1. Verificar: relatório gerado sem escrita no banco (contagem de `pessoas` igual antes e depois).

## 7. Validação final da Fase 0

- [ ] 7.1 Rodar a suíte completa do backend (testes de Pessoas e de todos os módulos), PHPStan e a suíte do web-client e do `@sysgov/ui`. Verificar: CI do PR verde.
- [ ] 7.2 Validar manualmente em homologação: cadastro rápido de menor sem CPF a partir do módulo Escola, regularização posterior, mesclagem de duplicidade, aba Conciliação e conferência visual da ficha, do selo "Documento pendente" e do modal conforme o DESIGN_SYSTEM. Verificar: roteiro executado e registrado no PR.
