# Histórias de Usuário: Jornada de Compra e Credenciamento

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  
**Status**: Aprovado  

---

## 1. Visão Geral da Jornada

A jornada do comprador no Hi.Events abrange desde a descoberta da página pública do evento, seleção de lotes e assentos reservados, retenção atômica de inventário, pagamento seguro integrado via Stripe até a emissão do ingresso com QR Code e a validação física no portão de entrada.

---

## 2. Histórias de Usuário (User Stories)

### US-01: Seleção de Ingressos e Assentos Reservados 🟢
**Como** comprador de ingressos  
**Quero** visualizar a lista de lotes disponíveis e o mapa interativo de assentos  
**Para** escolher os melhores lugares para mim e meus acompanhantes  

#### Critérios de Aceitação (Gherkin):
```gherkin
Cenário: Seleção de lote geral sem assento numerado
  Dado que estou na página pública do evento "Festival de Música 2026"
  Quando seleciono 2 ingressos do lote "Pista Promocional"
  E clico em "Continuar para Pagamento"
  Então o sistema inicia o checkout e reserva 2 vagas temporárias por 15 minutos
  E exibe o cronômetro regressivo na tela

Cenário: Seleção de assento já reservado por outro usuário
  Dado que estou visualizando o mapa de assentos da "Platéia VIP"
  Quando clico no assento "C-14" que acabou de ser reservado por outro comprador
  Então o assento é exibido como indisponível (cor vermelha/bloqueado)
  E uma mensagem informa: "Este assento não está mais disponível. Por favor, selecione outro."
```

---

### US-02: Preenchimento Cadastral e Aplicação de Desconto 🟢
**Como** comprador  
**Quero** preencher meus dados cadastrais e aplicar um código promocional  
**Para** obter desconto na compra e direcionar os ingressos ao meu e-mail  

#### Critérios de Aceitação (Gherkin):
```gherkin
Cenário: Aplicação de cupom promocional válido
  Dado que o total do meu pedido é R$ 200,00
  Quando insiro o cupom "DESCONTO10" e clico em "Aplicar"
  Então o sistema valida que o cupom está ativo e dentro do limite de uso
  E o resumo do pedido exibe um desconto de R$ 20,00
  E o valor a pagar é recalculado para R$ 180,00

Cenário: Tentativa de envio com caracteres suspeitos no nome
  Dado que estou no formulário de checkout
  Quando preencho o campo de nome com "Carlos <script>alert(1)</script>"
  Então a validação PersonNameRule rejeita a submissão
  E exibe o erro: "O nome informado contém caracteres inválidos."
```

---

### US-03: Pagamento Seguro com Cartão via Stripe 🟢
**Como** comprador  
**Quero** realizar o pagamento utilizando meu cartão de crédito com segurança  
**Para** garantir imediatamente a compra dos meus ingressos  

#### Critérios de Aceitação (Gherkin):
```gherkin
Cenário: Pagamento aprovado com sucesso
  Dado que a intent de pagamento foi gerada no Stripe com o valor exato da ordem
  Quando insiro os dados válidos do cartão de crédito e confirmo a compra
  Então o Stripe processa a cobrança e autoriza a transação
  E o webhook de confirmação atualiza o pedido para COMPLETED
  E sou redirecionado para a tela de confirmação com os ingressos disponíveis para download

Cenário: Cartão recusado por falta de limite
  Dado que insiro um cartão de crédito com saldo insuficiente
  Quando clico em "Pagar Agora"
  Então o gateway retorna falha de cobrança
  E a tela exibe: "Transação não autorizada. Verifique os dados do cartão ou tente outro meio."
  E o pedido permanece no status RESERVED até que o cronômetro expire
```

---

### US-04: Recebimento do Ingresso com QR Code 🟢
**Como** participante do evento  
**Quero** receber meus ingressos em PDF por e-mail com QR Code individualizado  
**Para** apresentar no dia do evento sem necessidade de impressão  

#### Critérios de Aceitação (Gherkin):
```gherkin
Cenário: Envio assíncrono do e-mail com ingresso
  Dado que o pedido com 2 participantes foi concluído com sucesso
  Quando a transação de banco de dados é comitada (afterCommit)
  Então o sistema enfileira o e-mail de confirmação
  E o e-mail entregue contém links públicos seguros e os ingressos em anexo
  E cada ingresso possui um QR Code único vinculado ao ID do participante
```

---

### US-05: Check-in Presencial e Validação de Entrada 🟢
**Como** operador de bilheteria / recepcionista do evento  
**Quero** escanear o QR Code do participante com o leitor de check-in  
**Para** validar a entrada de forma rápida e segura  

#### Critérios de Aceitação (Gherkin):
```gherkin
Cenário: Participante faz check-in pela primeira vez
  Dado que o participante possui ingresso com status ACTIVE
  Quando o operador escaneia o QR Code no portão de entrada
  Então o sistema registra a presença na check_in_list com timestamp atual
  E o aplicativo exibe sinal verde: "Entrada Autorizada: Carlos Silva (VIP)"

Cenário: Tentativa de reaproveitamento do mesmo ingresso (Duplo Check-in)
  Dado que o participante já realizou check-in às 19:30
  Quando o mesmo QR Code é escaneado novamente às 19:35
  Então o sistema exibe alerta vermelho: "Atenção: Ingresso já utilizado às 19:30!"
  E a entrada é bloqueada
```

---

## 3. Casos de Borda e Resiliência (Edge Cases) 🟢

1. **Expiração do Timer Durante o Preenchimento do Cartão**:
   - Se o comprador demorar mais de 15 minutos na tela de checkout, o pedido é marcado como `ABANDONED`. Se a cobrança no Stripe for iniciada após a expiração, o webhook detecta a ordem abandonada e dispara automaticamente o estorno do valor pago.
2. **Mudança de Fuso Horário em Eventos Multi-Data**:
   - As datas e horários de exibição são sempre formatados no fuso horário do local do evento (`organizers.timezone`), evitando discrepâncias de calendário para participantes remotos.
3. **Falha de Rede no Disparo de Webhook**:
   - O Stripe reenvia webhooks com backoff exponencial. A verificação por `provider_intent_id` único no banco garante que reenvios não processem duplicatas nem emitam ingressos duplicados.
