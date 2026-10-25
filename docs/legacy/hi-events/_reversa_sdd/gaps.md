# Inventário de Lacunas e Incertezas (Gaps)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  
**Status**: Aberto  

---

## 1. Visão Geral

Este documento consolida as lacunas de informação identificadas pelo **Reviewer** durante a auditoria das especificações técnicas geradas. São pontos que dependem de confirmação dos mantenedores do produto ou alinhamento com a arquitetura de infraestrutura.

---

## 2. Lacunas por Severidade

### 2.1 Severidade Moderada 🟡 / 🔴

1. **Customização de Timeout de Reserva (`pedidos`)**:
   - **Descrição**: O código atualmente aplica 15 minutos como padrão para expiração de reservas (`OrderStatus::RESERVED`). Não foi identificado no código legado se a coluna `event_settings.reservation_timeout` já possui binding dinâmico implementado em produção.
   - **Impacto**: Moderado (pode exigir fallback de leitura no `OrderService`).
   - **Rastreabilidade**: [`questions.md#pergunta-1`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/questions.md)

2. **Moedas com Zero Decimais no Stripe (`pagamentos`)**:
   - **Descrição**: A integração com o Stripe trata todos os valores monetários multiplicando por 100 (centavos). Para moedas como Iene Japonês (`JPY`), o Stripe exige envio do valor nominal inteiro.
   - **Impacto**: Moderado para internacionalização global; nulo para operações em BRL, USD e EUR.
   - **Rastreabilidade**: [`questions.md#pergunta-2`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/questions.md)

3. **Política de Throttle para Desafio 2FA (`autenticacao-e-permissoes`)**:
   - **Descrição**: A regra de rate limit de segundo fator está anotada genericamente sem parâmetros explícitos de tempo de bloqueio.
   - **Impacto**: Segurança e experiência do usuário (prevenção contra brute-force em tokens de 6 dígitos).
   - **Rastreabilidade**: [`questions.md#pergunta-3`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/questions.md)

### 2.2 Severidade Cosmética 🟡

1. **Teto de Renderização de Assentos em Mapa SVG (`assentos-e-capacidade`)**:
   - **Descrição**: Em arenas com mais de 5.000 assentos, a renderização DOM completa de SVG no frontend pode degradar a performance de frames (FPS) em dispositivos móveis.
   - **Recomendação**: Avaliar virtualização ou renderização Canvas em mapas de grande porte no roadmap futuro.

---

## 3. Plano de Ação

- As lacunas moderadas estão catalogadas em [`questions.md`](file:///d:/SYSTRAT/hi.events/_reversa_sdd/questions.md) para decisão dos desenvolvedores ou gestores do projeto.
- Nenhuma lacuna impede o desenvolvimento ou a execução das tarefas fundamentais documentadas nas specs.
