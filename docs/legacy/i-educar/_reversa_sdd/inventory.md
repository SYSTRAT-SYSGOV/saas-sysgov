# Inventário Completo da Superfície — i-Educar

> Gerado pelo **Scout** (Reversa) em 2026-10-12
> Projeto: `portabilis/i-educar` | Versão: `2.12.0`

---

## 1. Visão Geral do Sistema

O **i-Educar** é um sistema abrangente de gestão escolar pública municipal, responsável pela administração acadêmica de redes municipais de ensino. O código atual apresenta uma coexistência de **três gerações arquiteturais**:

1. **Camada Legada Procedural (`ieducar/intranet` e `ieducar/lib`):**
   - Mais de 280 scripts PHP procedurais clássicos com geração direta de HTML, queries SQL concatenadas, inclusão de cabeçalhos via `funcoes.inc.php` e lógica de formulário monolítica.
2. **Camada de Módulos Históricos (`ieducar/modules`):**
   - Primeira tentativa de modularização (Cadastro, Avaliação, RegraAvaliacao, FormulaMedia, Educacenso, TabelaArredondamento).
3. **Camada Moderna Laravel / DDD (`app/` e `src/Modules/`):**
   - Aplicação baseada em Laravel com 263 modelos Eloquent, APIs REST (`routes/api.php`), filas Redis (`Horizon`), autenticação (`Sanctum`), testes (`Pest`) e arquitetura modular por domínio em `src/Modules/`.

---

## 2. Métricas de Código e Arquivos

| Extensão / Tecnologia | Quantidade de Arquivos | Papel / Descrição |
|-----------------------|------------------------|-------------------|
| `.php` | **3.033** | Código fonte backend (Controllers, Models, Services, Scripts legados) |
| `.sql` | **86** | Scripts DDL, triggers de banco, inserts de tabelas de domínio e views |
| `.js` | **83** | Scripts de comportamento de frontend (legado + moderno) |
| `.css` | **29** | Folhas de estilo (Gentelella, legado intranet, Tailwind) |
| `.yaml` / `.yml` | **160** | Configurações de CI/CD, OpenAPI e Docker |
| `.json` | **30** | Configurações de pacotes, schemas e metadados |
| **Arquivos de Teste** | **453** | Testes automatizados (Unitários e Features com Pest/PHPUnit) |
| **Modelos Eloquent** | **263** | Mapeamento relacional de tabelas de domínio educacional |

---

## 3. Estrutura de Diretórios e Papéis

```
i-educar/
├── app/                      # Camada de aplicação Laravel moderna
│   ├── Http/Controllers/     # 82 Controllers (Web, API, Auth, Educacenso)
│   ├── Models/               # 263 Modelos Eloquent
│   ├── Services/             # Serviços de regras de negócio
│   ├── Contracts/            # Interfaces de domínio
│   ├── Events/ & Listeners/  # Eventos de domínio (ex: matrículas, enturmações)
│   └── Jobs/                 # Filas assíncronas processadas pelo Horizon
├── src/                      # Arquitetura modular moderna (PSR-4: iEducar\)
│   ├── Modules/              # 17 Módulos de domínio DDD (AcademicYear, Enrollments, etc.)
│   ├── Reports/              # Emissão de relatórios e documentos oficiais
│   └── Legacy/               # Camada adaptadora entre o legado e o novo
├── ieducar/                  # Camada legada histórica
│   ├── intranet/             # 281 scripts procedurais e templates históricos
│   ├── lib/                  # Bibliotecas legadas (Portabilis, Core, etc.)
│   └── modules/              # 14 módulos históricos de avaliação e notas
├── database/                 # Persistência
│   ├── migrations/           # 23 migrations incrementais
│   ├── sqls/                 # Triggers, views, procedures e inserts de referência
│   └── seeders/              # Povoamento inicial e tabelas de parametrização
├── routes/                   # Definição de rotas (web.php, api.php, api_v2.php)
├── resources/                # Views Blade, templates e assets não compilados
├── public/                   # Raiz web HTTP (index.php, assets compilados pelo Vite)
├── tests/                    # 453 arquivos de teste automatizados (Pest / PHPUnit)
└── docker/                   # Ambiente de execução em contêineres (PHP 8.3-fpm, Nginx)
```

---

## 4. Módulos de Domínio Identificados

Os módulos identificados representam os pilares essenciais do negócio escolar que deverão ser mapeados e reconstruídos no SaaS **SYSGOV**:

| Módulo de Domínio | Localização | Responsabilidade de Negócio |
|-------------------|-------------|------------------------------|
| **`AcademicYear`** | `src/Modules/AcademicYear` | Calendário letivo, períodos, etapas, fechamento e abertura de ano |
| **`Enrollments`** | `src/Modules/Enrollments` | Ciclo de vida da matrícula: ativa, transferida, cancelada, reclassificada |
| **`SchoolClass`** | `src/Modules/SchoolClass` | Gestão de turmas, séries, enturmação, capacidade física e turnos |
| **`School`** | `src/Modules/School` | Cadastro de unidades escolares, dependências físicas, infraestrutura |
| **`People`** | `src/Modules/People` | Alunos, pais/responsáveis legais, dados civis, documentos e contatos |
| **`Servidores`** | `src/Modules/Servidores` | Quadro de professores, servidores, alocação de carga horária e funções |
| **`Avaliacao` & `RegraAvaliacao`** | `ieducar/modules/Avaliacao` | Fórmulas de cálculo de média, arredondamento, recuperação, faltas |
| **`Educacenso`** | `src/Modules/Educacenso` | Exportação/Importação e adequação às normas do Censo Escolar INEP |
| **`Transport`** | `src/Modules/Transport` | Transporte escolar: rotas, veículos, motoristas e alunos atendidos |
| **`HistoricoEscolar`** | `ieducar/modules/HistoricoEscolar` | Histórico acadêmico do aluno, equivalências e transferências |
| **`Reports`** | `src/Reports` | Boletins, atas de resultado final, declarações de transferência |
| **`Addressing`** | `src/Modules/Addressing` | Normalização de endereços, CEP, municípios e zonas (urbana/rural) |

---

## 5. Pontos de Entrada e Portas de Acesso

- **HTTP Web:** `public/index.php` (Laravel Router atendendo rotas em `routes/web.php` e roteando internamente para `ieducar/intranet/`).
- **REST APIs:** `routes/api.php` e `routes/api_v2.php` protegidas por Sanctum.
- **CLI / Cron Jobs:** `artisan` (comandos de fechamento de período, migração de dados, sincronização do censo e processamento de filas).
- **Filas e Workers:** `artisan horizon` monitorando filas no Redis.

---

## 6. Recomendação do Scout para Organização das Specs

- **Granularidade Sugerida:** `module`
- **Justificativa:** O sistema já possui separação de domínio bem delineada em `src/Modules/` e `ieducar/modules/`. Para a reconstrução dentro do **SYSGOV**, cada módulo de domínio do i-Educar deve virar um sub-módulo ou serviço desacoplado com sua própria API e modelo de dados.
