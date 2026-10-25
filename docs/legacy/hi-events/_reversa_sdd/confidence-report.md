# Relatório de Confiança — Hi.Events

> Gerado pelo Revisor em 2026-10-24  
> Avaliação crítica de consistência, conformidade com código legado e precisão de especificações.

---

## 1. Resumo Geral

| Nível | Quantidade | Percentual |
|---|:---:|:---:|
| 🟢 **CONFIRMADO** | 90 | 87.4% |
| 🟡 **INFERIDO** | 10 | 9.7% |
| 🔴 **LACUNA** | 3 | 2.9% |
| **Total** | **103** | **100%** |

**Confiança Geral da Análise:** **92.2%**  
*(Cálculo: `[90 + (10 × 0.5)] / 103 × 100 = 92.2%`)*

---

## 2. Indicadores por Unidade de Especificação

| Unidade de Especificação | 🟢 Confirmado | 🟡 Inferido | 🔴 Lacuna | Índice de Confiança |
|---|:---:|:---:|:---:|:---:|
| [`pedidos/`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/pedidos/) | 18 | 2 | 1 | 90.5% |
| [`pagamentos/`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/pagamentos/) | 16 | 2 | 1 | 89.5% |
| [`assentos-e-capacidade/`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/assentos-e-capacidade/) | 15 | 2 | 0 | 94.1% |
| [`autenticacao-e-permissoes/`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/autenticacao-e-permissoes/) | 17 | 1 | 1 | 92.1% |
| **Arquitetura & Globais** | 24 | 3 | 0 | 94.4% |

---

## 3. Principais Lacunas Identificadas (🔴)

Itens que requerem validação e estão listados para decisão humana em [`questions.md`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/questions.md):

1. **`pedidos`**: Parametrização dinâmica do tempo de expiração de reservas por evento versus constante fixa de 15 minutos.
2. **`pagamentos`**: Tratamento de moedas zero-decimal (ex: JPY) no Stripe Connect.
3. **`autenticacao-e-permissoes`**: Configuração exata do rate limit para desafios de segundo fator (2FA TOTP).

---

## 4. Recomendações e Diretrizes para o Ciclo Forward

1. **Garantia de Não-Regressão em Assentos**:
   - Manter a regra absoluta de não gravar status de assento `SOLD_OUT` ou `HELD`/`SOLD`/`BLOCKED` em tabelas estáticas de sincronização.
2. **Isolamento de Estado em SSR**:
   - Manter o uso rigoroso de `AsyncLocalStorage` no frontend React, sem registrar dados em variáveis de módulo globais no Node.js.
3. **Verificação de Acesso em Testes**:
   - Toda nova rota de API criada deve ser cadastrada na suíte `AccessCoverageTest` para garantir 100% de cobertura de permissões.

---

## 5. Histórico de Reclassificações

| De | Para | Afirmação | Evidência no Código |
|:---:|:---:|---|---|
| 🟡 | 🟢 | Status `SOLD_OUT` é exclusivamente calculado em tempo de execução | `backend/app/Services/Domain/Event/` (ausência de colunas em migrations) |
| 🟡 | 🟢 | Proibição de regras `distinct` do Laravel em validações | `UpdateEventSeatMapBandProductsRequest.php:withValidator()` |
| 🟡 | 🟢 | E-mails transacionais dependem de commit de banco de dados | `BaseMail.php:afterCommit()` |
| 🟡 | 🟢 | Permissões no frontend usam `useAccess()`, nunca `me.role` | `frontend/src/hooks/useAccess.ts` |
