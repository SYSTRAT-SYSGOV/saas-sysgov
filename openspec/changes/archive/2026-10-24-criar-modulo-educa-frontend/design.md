# Design: Frontend do Módulo SYS-Educa (web-client)

## Contexto & Objetivos

Com a finalização de todas as regras de negócio e endpoints REST da API do SYS-Educa no backend Laravel, o objetivo desta change é construir a interface do usuário unificada em `apps/web-client/src/modules/educa/`. A aplicação deve oferecer uma experiência coesa e responsiva para a gestão educacional pública, seguindo estritamente as diretrizes de design do repositório:
1. **Componentes `@sysgov/ui`**: Todo e qualquer componente visual (`Card`, `Button`, `Modal`, `Badge`, `Table`, `Tabs`, `Input`, `Select`, `KpiCard`) deve ser importado de `@sysgov/ui`.
2. **Paleta GOV.BR Azul**: Conforme documentado no `AGENTS.md § 4`, o `apps/web-client` opera na paleta GOV.BR azul (`#004085`, `#002f6c`, `#e8f4fd`), mapeando as variáveis semânticas do `@sysgov/ui`.
3. **Tipografia Técnica**: Todo dado quantitativo (dias letivos, horas, percentuais, notas, CPF, códigos INEP, número de matrícula) DEVE usar `JetBrains Mono` (`font-mono tabular-nums`).
4. **Isolamento e Licenciamento**: As abas e recursos do módulo refletem os direitos do plano contratado (`educa`, `educa-secretaria`, `educa-pedagogico`, `educa-servidores`, `educa-educacenso`, `educa-transporte`, `educa-comunicacao`).

---

## Decisões Arquiteturais (ADRs)

### D-01: Arquitetura em App Shell Interno com Lazy Loading
- **Decisão**: Criar o ponto de entrada `EducaModule.tsx` utilizando `Tabs` do `@sysgov/ui` para alternar entre os submódulos, carregando os painéis pesados via `React.lazy` e `Suspense`.
- **Justificativa**: Evita sobrecarregar o bundle inicial do `apps/web-client`, garantindo carregamento rápido e navegação fluida.

### D-02: Seletor Global de Contexto (Escola e Ano Letivo)
- **Decisão**: Um cabeçalho de contexto integrado no topo do módulo armazena no estado do módulo a escola ativa e o ano letivo selecionado.
- **Justificativa**: Permite que todas as abas (calendário, turmas, matrículas, chamada do professor) sincronizem automaticamente o escopo escolar sem que o operador precise selecionar a escola repetidamente a cada clique.

### D-03: Consumo Canônico do MDM Pessoas via `<PessoaPicker>`
- **Decisão**: Todos os formulários de cadastro e vinculação de alunos, responsáveis legais, professores e condutores de transporte devem consumir o componente `<PessoaPicker>` compartilhado.
- **Justificativa**: Garante a regra inegociável do SYSGOV de não duplicar cadastros de cidadãos e servidores em tabelas municipais avulsas.

---

## Estrutura de Diretórios e Componentes

```text
apps/web-client/src/modules/educa/
├── index.ts                           # Ponto de exportação do módulo
├── EducaModule.tsx                    # Componente principal / App Shell interno
├── context/
│   └── EducaContext.tsx               # Contexto com escola_id ativa e ano_letivo_id
├── components/
│   ├── EducaHeader.tsx                # Cabeçalho com seletores de contexto e KPIs rápidos
│   ├── LdbComplianceBadge.tsx         # Indicador visual de 200 dias / 800 horas (LDB)
│   └── PisoDocenteMeter.tsx           # Medidor da proporção de 1/3 de hora-atividade
└── views/
    ├── CoreView.tsx                   # Calendário, Anos Letivos, Escolas e Turmas
    ├── SecretariaView.tsx             # Matrículas (PessoaPicker), Enturmação e Vagas
    ├── PedagogicoView.tsx             # Diário de Classe, Chamada e Notas
    ├── ServidoresView.tsx             # Quadro Docente, Lotação e Afastamentos
    ├── EducacensoView.tsx             # Painel de Auditoria e Exportação INEP
    ├── TransporteView.tsx             # Rotas, Veículos e Alunos
    └── ComunicacaoView.tsx            # Avisos, Confirmação de Leitura e Ocorrências
```

---

## Integração de Rotas (`AppRouter.tsx`)

A rota `/educa/*` é adicionada ao roteador com lazy loading:
```tsx
const EducaModule = React.lazy(() => import('@/modules/educa/EducaModule'));

// Rota protegida por autenticação e licença do módulo base 'educa'
<Route
  path="/educa/*"
  element={
    <ProtectedRoute>
      <ModuleRouteGuard moduleId="educa">
        <EducaModule />
      </ModuleRouteGuard>
    </ProtectedRoute>
  }
/>
```
