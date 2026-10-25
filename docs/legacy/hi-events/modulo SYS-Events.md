# OpenSpec Proposal: Módulo SYS-Events (SYSGOV)

Você é o Arquiteto de Software Líder do projeto SYSGOV. Sua missão é criar a proposta formal de especificação (OpenSpec / SDD Proposal) para o novo módulo **SYS-Events**, utilizando como blueprint arquitetural e de domínio a engenharia reversa extraída em `_reversa_sdd/`.

---

## 1. Visão Geral do Módulo
- **Nome do Módulo**: `SYS-Events`
- **Ecossistema**: SYSGOV (Plataforma de Governança, Gestão e Serviços)
- **Propósito**: Gestão ponta a ponta de eventos institucionais, congressos, audiências públicas, cursos e conferências, atendendo tanto **órgãos governamentais** quanto **entidades privadas**, dispondo de um portal público para visualização e inscrição em eventos gratuitos e pagos.

---

## 2. Pilares de Negócio e Requisitos-Chave

### 2.1 Multi-Tenant Híbrido (Público & Privado)
- **Órgãos Governamentais**: Secretarias, prefeituras, autarquias, câmaras e tribunais (com brasão, CNPJ público, termos de LGPD pública).
- **Entidades Privadas**: Empresas, fundações, sindicatos e organizadores privados parceiros.
- **Isolamento de Dados**: Segregação estrita por `tenant_id` / `organization_id`, garantindo que participantes, dados financeiros e configurações não vazem entre órgãos/empresas.

### 2.2 Portal Público de Eventos (`SYS-Events Portal`)
- Vitrine institucional com catálogo responsivo de eventos abertos e em destaque.
- Filtros por: Órgão/Empresa realizadora, Categoria, Modalidade (Presencial, Online ou Híbrido), Data e Localização.
- Página dedicada de cada evento (Landing Page) com descrição purificada (sem scripts maliciosos), programação, palestrantes, mapa do local e formulário de inscrição em etapas.

### 2.3 Modalidades de Inscrição e Pagamento
1. **Eventos Gratuitos**:
   - Inscrição direta com validação de CPF/CNPJ ou e-mail.
   - Questionários personalizados (campos customizados, ex: cargo, lotação, restrições alimentares).
   - Emissão imediata de comprovante de inscrição e bilhete com QR Code.
2. **Eventos Pagos**:
   - **Fluxo Governamental**: Integração com guias oficiais de arrecadação (GRU/DAM/DAE) e PagTesouro / PIX Cobrança Oficial.
   - **Fluxo Privado**: Cartão de Crédito, Boleto Bancário e PIX Dinâmico (gateways como Stripe ou provedores nacionais).
   - Retenção temporária de vaga com contagem regressiva durante o checkout (`RESERVED` com timeout de 15 minutos).

### 2.4 Credenciamento, Check-in e Pós-Evento
- Emissão de ingressos/credenciais com QR Code seguro e token único.
- Módulo de portaria/recepção (Check-in rápido via leitor óptico ou câmera).
- Emissão automática de certificados de participação com validação pública por código autenticador.

---

## 3. Diretrizes Técnicas Obrigatórias (Baseadas em `_reversa_sdd/`)

Ao elaborar a especificação e o código do SYS-Events, obedeça rigorosamente aos padrões validados no blueprint do Hi.Events:

1. **Invariante de Ocorrências e Datas**:
   - **PROIBIDO** armazenar `start_date` e `end_date` diretamente na tabela principal de eventos.
   - **OBRIGATÓRIO** usar a entidade `event_occurrences` vinculada ao evento, permitindo eventos multi-data, recorrentes ou em múltiplos turnos sem quebrar o modelo.
2. **Capacidade Atômica e Status Derivados**:
   - O status `SOLD_OUT` (Esgotado) **NUNCA** deve ser gravado em tabela estática nem mantido por cronjob reconciliador. Deve ser derivado em runtime comparando a capacidade nominal da ocorrência com a soma de inscrições ativas e reservas em andamento.
3. **Bloqueio Concorrente de Vagas**:
   - Inscrições em andamento entram no estado `RESERVED` com timer de expiração. Em caso de abandono de checkout, o cancelamento libera o inventário imediatamente.
4. **Segurança e RBAC**:
   - Verificações de acesso no backend devem checar permissões atômicas (ex: `Permission::VIEW_FINANCIALS`, `Permission::EDIT`), nunca nomes literais de papéis (`Role`).
   - Dados financeiros e relatórios de arrecadação devem ser ocultados (`null`) para operadores que não possuam a permissão explícita de finanças.
5. **Defesa Anti-Spam e Higienização**:
   - Sanitização obrigatória de HTML nas descrições de eventos (`HtmlPurifier`).
   - Validação de nomes de participantes contra scripts e injeções (`PersonNameRule`).
   - Disparo de e-mails de confirmação amarrado exclusivamente ao commit do banco de dados (`afterCommit`).

---

## 4. Estrutura de Entrega Esperada no OpenSpec

Gere os artefatos da proposta na seguinte estrutura de pastas dentro do SYSGOV:

```text
_openspec/sys-events/
├── proposal.md            # Sumário executivo, objetivos de negócio e escopo funcional
├── requirements.md        # Requisitos funcionais (Must, Should, Could) e regras de negócio
├── data-architecture.md   # Schema de banco de dados (tabelas, chaves e relacionamentos)
├── state-machines.md      # Máquinas de estado de Inscrições, Eventos e Pagamentos
├── api-contracts.md       # Endpoints REST públicos e administrativos
└── tasks.md               # Backlog de tarefas executáveis para implementação
