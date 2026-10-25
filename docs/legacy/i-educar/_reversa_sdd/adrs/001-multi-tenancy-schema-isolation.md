# ADR-001: Isolamento Multi-Tenant via Tenant-ID no MySQL 8.0/8.4+

> **Status:** 🟢 Aprovado / Decisão Arquitetural Consolidada  
> **Data:** 2026-10-12  
> **Autor:** Reversa Detective (`reversa-detective`) & Architect (`reversa-architect`)  
> **Contexto:** Plataforma SYSGOV — Modernização do i-Educar (`SYS-Educa`)

---

## 1. Contexto e Problema

O software legado i-Educar foi originalmente concebido para implantação on-premise em cada prefeitura municipal ou hospedagem single-tenant (PostgreSQL com esquemas monolíticos ou instâncias separadas por município). Na plataforma moderna SYSGOV, a solução deve operar como Software as a Service (SaaS) governamental unificado para múltiplos municípios (redes de ensino), garantindo:
1. Isolamento rigoroso de dados entre prefeituras diferentes (conformidade com a LGPD e sigilo de dados de menores de idade).
2. Eficiência de infraestrutura e custo operacional previsível em nuvem.
3. Capacidade de evolução e migração de banco de dados centralizada sem necessidade de rodar 50+ rotinas de migrations em dezenas de instâncias isoladas.
4. Compatibilidade com MySQL 8.0 e 8.4+ LTS (padrão institucional adotado pela SYSSTRAT / SYSGOV).

---

## 2. Decisão Arquitetural

Adotou-se o modelo **Multi-Tenancy Compartilhado com Discriminação por Coluna (`tenant_id CHAR(36) UUID`) e Isolamento Forçado via Software e Índices Compostos**:

1. **Chave Estrangeira Mandatória:** Todas as 94 tabelas de negócio do sistema possuem obrigatoriamente a coluna `tenant_id CHAR(36) NOT NULL`, referenciando a tabela mestre `tenants(id)`.
2. **Índices Compostos de Alta Performance:** Todos os índices únicos e de busca mais frequentes iniciam pela coluna `tenant_id` (ex.: `UNIQUE KEY uk_enrollments_student_year (tenant_id, student_id, academic_year_id)`).
3. **Escopo Global de Tenant (Tenant Global Scope):** No backend Laravel 13, todo Model Eloquent implementa a trait `BelongsToTenant`, que aplica automaticamente a cláusula `WHERE tenant_id = :active_tenant_id` em todas as consultas SQL geradas (`SELECT`, `UPDATE`, `DELETE`) e injeta o `tenant_id` da sessão nos comandos `INSERT`.
4. **Middleware de Resolução de Tenant:** A identificação do município ativo ocorre via subdomínio (`municipio.educa.sysgov.br`), header HTTP seguro (`X-Tenant-ID`) ou claim autenticada de token JWT / Gov.br.

---

## 3. Alternativas Consideradas

| Alternativa | Vantagens | Desvantagens / Motivo de Rejeição |
| :--- | :--- | :--- |
| **Banco de Dados Separado por Tenant** | Isolamento físico absoluto; backup independente por prefeitura. | Custo proibitivo de pooling de conexões; alta complexidade de manutenção de 100+ schemas/bancos; migrações lentas e propensas a falhas parciais. |
| **Schema Postgres por Tenant (`search_path`)** | Boa separação lógica nativa do PostgreSQL. | Incompatível com o requisito corporativo do SYSGOV de padronização em **MySQL 8.0/8.4+**; complexidade de migração e overhead de catálogo de tabelas. |
| **Multi-Tenancy por Coluna com Global Scope (Escolhida)** | Simplicidade operacional, migrações atômicas únicas, relatórios consolidados para consórcios intermunicipais, compatibilidade total com MySQL 8+. | Exige disciplina rígida de código e testes automatizados contra vazamento de tenant (mitigado pelo Global Scope e testes de regressão). |

---

## 4. Consequências

### Positivas:
- Infraestrutura altamente enxuta e escalável horizontalmente.
- Deploy e atualização de schema instantâneos para toda a base de clientes municipais.
- Criação de novos municípios em segundos via inserção cadastral, sem provisionamento de novos bancos.

### Negativas / Riscos Mitigados:
- Risco de consultas SQL nativas (`DB::raw`) esquecerem de filtrar `tenant_id`. *Mitigação:* Proibição de queries cruas em produção e auditoria estática por linters e testes automatizados de multi-tenancy.
- Tamanho das tabelas cresce mais rápido. *Mitigação:* Particionamento futuro por faixa de `tenant_id` ou ano letivo se o volume exceder 50 milhões de registros.
