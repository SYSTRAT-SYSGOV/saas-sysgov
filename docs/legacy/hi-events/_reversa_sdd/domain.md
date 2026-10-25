# Domínio e Regras de Negócio Implícitas (Domain & Business Rules)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  

---

## 1. Glossário e Linguagem Ubíqua

- **Event (Evento)**: Entidade agregadora de configurações, organizadores e ocorrências. 🟢
- **Event Occurrence (Ocorrência do Evento)**: Instância real de data e horário em que o evento ocorre (`event_occurrences`). Datas do evento residem exclusivamente aqui (`events.start_date`/`end_date` são colunas legadas intocáveis). 🟢
- **Product (Produto / Ingresso)**: Item comercializável associado a um evento, possuindo controle de capacidade e precificação. 🟢
- **Order (Pedido)**: Agrupamento transacional de itens adquiridos por um comprador. 🟢
- **Attendee (Participante)**: Portador final de um bilhete emitido. Um pedido com 3 ingressos gera 3 registros de `Attendee`. 🟢
- **Seat Claim (Alocação de Assento)**: Vínculo físico entre um assento específico no mapa de lugares e uma ordem/ingresso. 🟢
- **Box Office (Bilheteria / Ponto de Venda)**: Terminal presencial para emissão direta de ingressos e check-in. 🟢
- **Affiliate (Afiliado)**: Canal parceiro que recebe comissão ou rastreamento sobre vendas concluídas. 🟢

---

## 2. Regras de Negócio Implícitas e Invariantes

### 2.1 Gestão de Pedidos e Vendas
1. **Conclusão de Venda e Efeitos Colaterais** 🟢:
   - Uso de códigos promocionais (`promo_codes`), acúmulo de volume de vendas de produtos (`products.sales_volume`) e contadores de afiliados são alterados **estritamente quando o pedido é concluído** (`isOrderCompleted()`).
   - Pedidos cancelados ou estornados devem decrementar os contadores correspondentes com salvaguarda de existência (`decrementEach`).

2. **Assentos Reservados e Alocações** 🟢:
   - Qualquer fluxo que venda um ingresso deve garantir a reivindicação do assento correspondente (`claimSeat`) ou recusar produtos marcados como sentados caso não haja seleção.
   - Qualquer cancelamento, estorno ou expiração de ingresso libera imediatamente o assento (`releaseClaim`).

3. **Status Derivados (Non-stored / Calculated Statuses)** 🟢:
   - Os status de ocorrência `SOLD_OUT`, travas de lotes de ingressos (`markLockedTiers`) e estados de assento `HELD`/`SOLD`/`BLOCKED` são computados em tempo de execução com base no estado das ordens e capacidades. Não existem tabelas de sincronização ou cronjobs reconciliadores gravando esses status no banco.

### 2.2 Segurança, Permissões e Integridade
1. **Segregação Financeira** 🟢:
   - Valores monetários e estatísticas agregadas de vendas são estritamente ocultados (`FinancialStatsRedactor`) se o usuário autenticado não possuir a permissão `VIEW_FINANCIALS`.
2. **Escopo de Acesso a Entidades Filhas** 🟢:
   - Todo lookup de IDs filhos (preço, produto, ingresso, template de e-mail) deve ser explicitamente escopado pelo ID do pai (organizador ou evento) já autorizado. Um mismatch deve retornar imediatamente 404/422 antes de qualquer gravação.
3. **Prevenção contra Abuso e Spam** 🟢:
   - Textos digitados por usuários que possam ser disparados em e-mails passam por validações anti-spam (`PersonNameRule`, `EventSpamCheckDispatchService`).
   - O nome fornecido no cadastro nunca é exibido sem sanitização e e-mails não confirmados não recebem conteúdo aberto.
