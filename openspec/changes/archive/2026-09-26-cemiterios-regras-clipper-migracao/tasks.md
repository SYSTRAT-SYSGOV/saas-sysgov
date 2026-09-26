# Tarefas de Implementação: Regras de Negócio do Clipper e Migração de Dados

## 1. Backend: Extensão do Schema e Models

- [x] 1.1 Criar migration Laravel para adicionar colunas `processo_administrativo` e `motivo_pendencia` em `concessions`; `titular_falecido`, `data_falecimento_titular` e `processo_inventario` em `concession_holders`; `gaveta_numero`, `coveiro_nome`, `pedreiro_nome`, `cartorio` e `medico` em `cemetery_burials`. Executar `php artisan migrate` e verificar schema.
- [x] 1.2 Atualizar models Eloquent `Concessao`, `Concessionario`, `Inumacao` e `Jazigo` com casts, properties e fillable correspondentes. Verificar integridade dos models com teste unitário.

## 2. Backend: Regras de Negócio e Serviços

- [x] 2.1 Implementar trava anti-sepultamento de terceiros em `OperacaoService::inumar()` quando o titular concessionário tiver flag `titular_falecido` ativa sem sucessão hereditária concluída, liberando apenas sepultamento do próprio titular ou autorização judicial. Criar teste de unidade PHPUnit validando o bloqueio e a liberação.
- [x] 2.2 Atualizar `ConcessaoService::conceder()` e `renovar()` para persistir e validar o campo `processo_administrativo`. Criar teste unitário garantindo persistência do número de processo municipal.

## 3. Backend: Comando de Migração ETL (Clipper -> SYSGOV)

- [x] 3.1 Criar o comando Artisan `MigrarClipperCommand` em `apps/api/Modules/Cemiterios/Console/MigrarClipperCommand.php` com suporte a `--dry-run`, `--tenant=`, `--path=` e `--necropole=all|01|02`.
- [x] 3.2 Implementar rotina de carga em lotes (chunks) dos CSVs de `exported_data` (Central e Independência): setores, jazigos (tipos 1 e 3), responsáveis, concessões com detecção automática do marcador `[FALECIDO]`, registros de óbito e inumações com gaveta, coveiro e pedreiro.
- [x] 3.3 Integrar o recálculo automático de ocupação física e estado dos jazigos via `JazigoEstadoService::recalcular()` ao final da carga. Testar o comando em modo `--dry-run` e verificar o relatório de contagem e consistência.

## 4. Frontend: Tipos e Visualização no web-client

- [x] 4.1 Atualizar `apps/web-client/src/modules/cemiterios/api.ts` com os novos campos nas interfaces `Concessao`, `Concessionario`, `Inumacao` e `Jazigo`.
- [x] 4.2 Atualizar `InventarioView.tsx` (Drawer de detalhes do jazigo) para exibir o número do Processo Administrativo em tipografia JetBrains Mono (`font-mono tabular-nums`) e o alerta visual destacado `⚠️ Titular Falecido — Sucessão Hereditária Pendente` com Badge oficial quando aplicável.
- [x] 4.3 Atualizar a lista de inumações no Drawer de Detalhes para exibir colunas/badges com identificação de Gaveta/Nicho (ex: "Gaveta 1"), Coveiro e Pedreiro.
- [x] 4.4 Atualizar `ModalFichaCadastral.tsx` para incluir o Processo Administrativo e anotações sucessórias para emissão com fé pública.
- [x] 4.5 Atualizar `ConcessoesView.tsx` e `OperacoesView.tsx` permitindo visualizar e filtrar concessões com titular falecido e número do processo.

## 5. Testes e Validação Completa

- [x] 5.1 Criar e executar testes unitários no Vitest para validação da renderização do alerta de titular falecido, processo administrativo e dados operacionais de inumação.
- [x] 5.2 Executar a suíte completa de testes do frontend `npm test -- --run src/modules/cemiterios` garantindo 100% de aprovação.
- [x] 5.3 Executar verificação estática de tipos `npx tsc --noEmit` garantindo zero erros de compilação TypeScript.
