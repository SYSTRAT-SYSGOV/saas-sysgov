# Design Técnico: Sucessão Hereditária e Gestão de Operadores

## Contexto

Conforme fundamentado em `proposal.md`, a base de dados do módulo de cemitérios dispõe agora de acervo integralmente migrado, com histórico de mais de 80 concessões em que o titular faleceu e centenas de inumações registradas com nomes de coveiros e pedreiros. A trava de segurança que bloqueia inumações nesses jazigos já está ativa no backend (`OperacaoService::inumar`). O objetivo deste design é detalhar a arquitetura das entidades de sucessão hereditária e de credenciamento operacional, garantindo aderência estrita aos contratos de arquitetura do SYSGOV (`AGENTS.md`, `TenantAware`, `AuditLogger` e `@sysgov/ui`).

## Metas e Não-Metas (Goals / Non-Goals)

**Metas (Goals):**
- Prover modelo de dados seguro para a tramitação de sucessão hereditária, com controle de autos processuais, documentação probatória e destravamento atômico da concessão.
- Prover cadastro unificado de operadores (`coveiro` e `pedreiro`) com histórico de inumações e obras vinculadas.
- Criar telas responsivas em `apps/web-client` utilizando 100% de componentes do design system `@sysgov/ui` e exibição de dados técnicos e documentos em `JetBrains Mono` (`font-mono tabular-nums`).
- Garantir rastreabilidade de fé pública por meio da emissão em PDF/A4 do Termo Oficial de Transferência de Concessão.

**Não-Metas (Non-Goals):**
- Automatizar integração com cartórios de notas ou TJPR (o processo é instruído no município pelo operador anexando certidões e números de processo).
- Cobrança financeira de emolumentos cartorários (fora do escopo deste módulo; emolumentos municipais são emitidos pelo DAM/Tributário).

## Decisões Técnicas de Arquitetura (Decisions)

### 1. Modelo de Dados de Sucessão Hereditária
- **Decisão**: Criar as tabelas `cemetery_succession_processes` e `cemetery_succession_heirs`.
  - `cemetery_succession_processes`: `id`, `tenant_id`, `concession_id`, `numero_processo`, `tipo_documento` (inventario_judicial, inventario_extrajudicial, alvara_judicial, outro), `vara_ou_cartorio`, `situacao` (em_analise, deferido, indeferido, cancelado), `despacho_fundamentacao`, `novo_titular_id`, `termo_numero`, `deferido_em`, `deferido_por_id`, timestamps e soft deletes.
  - `cemetery_succession_heirs`: `id`, `tenant_id`, `process_id`, `nome`, `documento`, `parentesco` (conjuge, filho, neto, irmao, outro), `titular_indicado` (boolean), `telefone`, `email`.
- **Alternativa Considerada**: Atualizar diretamente a tabela `concessions` sem histórico de processo. Rejeitada, pois violaria a fé pública e a exigência de prestação de contas aos herdeiros e órgãos de controle (TCE/Ministério Público).

### 2. Destravamento Atômico da Concessão e Auditoria
- **Decisão**: A conclusão da sucessão é executada dentro de uma `DB::transaction()` no `SucessaoService`. Ao deferir o processo:
  1. Cria ou vincula o `Concessionario` correspondente ao herdeiro indicado.
  2. Atualiza a `Concessao`: `holder_id = $novoTitular->id`, `pendencia_regularizacao = false`, `motivo_pendencia = null`.
  3. Gera número do termo sequencial formatado: `TERMO-SUC-{ano}-{id}`.
  4. Dispara registro de auditoria via `AuditLogger::log()`.
- **Alternativa Considerada**: Permitir destravamento manual via toggle na concessão. Rejeitada por risco de fraude e quebra de conformidade jurídica.

### 3. Modelo de Operadores (`cemetery_operators`)
- **Decisão**: Criar a tabela `cemetery_operators` com `id`, `tenant_id`, `nome`, `tipo` (`coveiro` ou `pedreiro`), `cpf_cnpj`, `documento_hash`, `matricula_funcional` (para servidores), `alvara_numero` (para pedreiros), `alvara_validade`, `telefone`, `situacao` (`ativo`, `suspenso`, `inativo`), timestamps e soft deletes.
- **Relacionamento com Inumações**: O campo `coveiro_nome` e `pedreiro_nome` da tabela `cemetery_burials` pode ser cruzado tanto por string histórica quanto por relacionamento opcional `operator_id`.

### 4. Interface Web (`apps/web-client`)
- **Decisão**: Incorporar duas novas abas no módulo de Cemitérios:
  - `"sucessao"`: Listagem de processos e concessões com pendência de regularização. Exibe contadores no topo, tabela estilizada com `@sysgov/ui` e modal de tramitação/deferimento.
  - `"operadores"`: Gestão de coveiros e pedreiros, filtro por tipo e status de alvará, e Drawer lateral para histórico de sepultamentos e obras.
- **Tipografia e Estilo**: Todo documento (CPF, CNPJ, Matrícula, Processo, Alvará, Termo, Datas) DEVE usar a classe `font-mono tabular-nums` (`JetBrains Mono`). Cores seguem o padrão GOV.BR azul / Dark Navy.

## Riscos e Mitigações (Risks / Trade-offs)

- **[Risco] Disputa entre herdeiros concorrentes pela titularidade do jazigo**  
  → *Mitigação*: O sistema exige a inserção obrigatória do número do processo administrativo/judicial e fundamentação do despacho no deferimento, salvaguardando a responsabilidade do servidor público.
- **[Risco] Pedreiro executando obra com alvará vencido**  
  → *Mitigação*: Alerta visual com badge âmbar/vermelho em qualquer tentativa de vinculação de pedreiro com alvará expirado.

## Plano de Migração e Rollback

- Executar migration `add_sucessao_and_operadores_tables.php`.
- Em caso de necessidade de rollback, executar `php artisan migrate:rollback` isolado para o módulo.
