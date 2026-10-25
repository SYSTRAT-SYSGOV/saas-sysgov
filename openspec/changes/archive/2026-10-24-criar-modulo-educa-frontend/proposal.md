# Proposal

## Why

Com a conclusão dos 7 submódulos do backend do SYS-Educa (`core`, `secretaria`, `pedagogico`, `servidores`, `educacenso`, `transporte` e `comunicacao`), a API do monólito oferece infraestrutura completa e testada. No entanto, o `apps/web-client` ainda não possui uma interface unificada para os gestores da Secretaria de Educação, diretores escolares, professores e famílias. Atualmente existem apenas módulos legados dispersos (`escola` e `pedagogico`) sem integração com os 5 pilares do SYSGOV (Pessoas MDM, OrgChart, Access, Client e Protocolo). É fundamental disponibilizar o frontend moderno do SYS-Educa, construído sob a arquitetura App Shell do `apps/web-client`, utilizando componentes oficiais de `@sysgov/ui` e a paleta GOV.BR azul.

## What Changes

- **Novo módulo de frontend em `apps/web-client/src/modules/educa/`**:
  - `EducaModule.tsx`: App Shell interno com navegação tabulada/hierárquica respeitando licenças ativas do tenant (`module-access:{alias}`).
  - **Aba Core (Gestão Acadêmica)**: Visualização e ciclo de vida de Anos Letivos, Grade Mensal do Calendário Escolar com status dos dias letivos e conformidade com a LDB (mínimo de 200 dias e 800 horas), Escolas, Turmas e Matrizes Curriculares BNCC.
  - **Aba Secretaria (Vida Escolar)**: Matrículas atômicas anuais, Ficha Cadastral do Aluno com integração ao componente `<PessoaPicker>` do MDM Pessoas, Enturmações com monitoramento visual de lotação/vagas e Transferências de alunos.
  - **Aba Pedagógico (Prática Docente)**: Diário de Classe com apontamento de conteúdo curricular, Chamada diária de frequência com abonos legais, e Lançamento de notas/conceitos com apuração automática de médias.
  - **Aba Servidores (Corpo Docente)**: Gestão de lotação docente por turma/matriz e medidor visual do cumprimento de 1/3 da jornada em horas-atividade (Lei do Piso 11.738/2008).
  - **Aba Educacenso (Conformidade INEP)**: Painel de auditoria de consistência cadastral com badges de impeditivos e avisos, e disparador de exportação e conciliação de arquivos INEP.
  - **Aba Transporte (Rotas e Alunos)**: Painel de rotas de transporte escolar, veículos, condutores e lista de alunos transportados.
  - **Aba Comunicação (Famílias e Ocorrências)**: Mural de comunicados oficiais com confirmação de leitura, registro de ocorrências disciplinares/pedagógicas e controle de ciência dos pais.
- **Integração de Rotas e Navegação**:
  - Registro de rotas em `apps/web-client/src/core/router/AppRouter.tsx` sob o prefixo `/educa` protegido por `ProtectedRoute` e `ModuleRouteGuard`.
  - Configuração no `moduleRegistry` para ativação dinâmica conforme o plano do município.
- **Tipografia e Padrões de Design**:
  - Exclusivamente componentes do `@sysgov/ui` (`Card`, `Button`, `Badge`, `Modal`, `Table`, `Tabs`, `KpiCard`, etc.).
  - Tipografia técnica estrita: `JetBrains Mono` (`font-mono tabular-nums`) para notas, percentuais de frequência, datas, códigos INEP, CPF e jornadas de trabalho.

## Capabilities

### New Capabilities

- `educa-frontend-shell`: Arquitetura do módulo frontend no web-client, navegação entre submódulos licenciados e filtros globais de contexto (escola ativa, ano letivo ativo).
- `educa-frontend-core`: Gestão de anos letivos, calendário interativo com validação visual da LDB, turmas e matrizes.
- `educa-frontend-secretaria`: Matrículas com PessoaPicker, enturmação visual e transferências.
- `educa-frontend-pedagogico`: Diário de classe, lista de chamada e grade de avaliações/médias.
- `educa-frontend-servidores`: Lotação docente com indicador visual do cumprimento da Lei do Piso.
- `educa-frontend-comunicacao-transporte`: Murais, ocorrências disciplinares e rotas de transporte escolar.

## Impact

- **Frontend (`apps/web-client`)**: Novo diretório `src/modules/educa` com componentes funcionais e páginas lazy-loaded.
- **UI & UX**: Aplicação rigorosa da paleta GOV.BR azul e componentes do `@sysgov/ui`, garantindo acessibilidade e conformidade governamental.
- **Dependências**: Reutiliza `@sysgov/ui`, `@sysgov/sdk` e ícones `lucide-react`.
