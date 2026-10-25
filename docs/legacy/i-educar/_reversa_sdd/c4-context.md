# Modelo C4 — Nível 1: Diagrama de Contexto de Sistema (System Context)

> **Documento Gerado pelo Agente Architect (`reversa-architect`) — Reversa Framework**  
> **Sistema:** SYSGOV — Gestão Educacional Municipal (`SYS-Educa`)  
> **Padrão:** C4 Model (Context Level) com Mermaid  
> **Status de Confiança:** 🟢 CONFIRMADO

---

## 1. Visão Geral do Contexto

O **SYS-Educa** é a plataforma governamental multi-tenant central de gestão escolar dos municípios atendidos pelo ecossistema **SYSGOV**. Ele conecta todos os atores da comunidade escolar (Secretaria de Educação, Gestores Escolares, Docentes, Alunos, Responsáveis e Operadores de Transporte) e interage com sistemas governamentais federais (MEC/INEP, Gov.br, e-Social), bancos e gateways de comunicação.

---

## 2. Diagrama de Contexto (Mermaid)

```mermaid
C4Context
    title Diagrama de Contexto — SYSGOV: SYS-Educa (Gestão Educacional Municipal)

    Person(semed, "Gestor SEMED", "Secretaria Municipal de Educação: define matrizes, calendários e exporta o Censo.")
    Person(diretor, "Direção / Secretaria", "Diretor e Secretário Escolar: gerencia turmas, matrículas e emite documentos.")
    Person(professor, "Professor", "Corpo Docente: lança diário de classe, frequências, conteúdos e notas.")
    Person(responsavel, "Aluno / Responsável", "Cidadão: acompanha boletim, faltas, cardápio escolar e comunicados.")
    Person(motorista, "Operador de Transporte", "Motoristas e fiscais: acompanham rotas, paradas e alunos embarcados.")

    Enterprise_Boundary(b0, "Ecossistema Governamental Municipal (SYSGOV)") {
        System(sys_educa, "SYS-Educa", "Plataforma central SaaS multi-tenant para gestão pedagógica, acadêmica e administrativa da rede de ensino.")
        System(sys_tributario, "SYS-Tributos / Finanças", "Sistema de arrecadação municipal e controle orçamentário do FUNDEB.")
        System(sys_protocolo, "SYS-Protocolo", "Sistema municipal de processos administrativos e ouvidoria.")
    }

    Enterprise_Boundary(b1, "Sistemas Governamentais Federais & Externos") {
        System_Ext(inep_censo, "MEC / INEP Educacenso", "Coleta anual estatística da Educação Básica e repasse do FUNDEB.")
        System_Ext(gov_br, "Identidade Digital Gov.br", "Provedor federal OIDC de autenticação de cidadãos com nível Prata/Ouro.")
        System_Ext(receita_cpf, "Receita Federal / CPF", "Validação e consulta cadastral de CPF de alunos e servidores.")
        System_Ext(banco_boleto, "Febraban / Bancos", "Emissão de guias de taxas administrativas e certidões.")
        System_Ext(gateway_msg, "Gateway Omnichannel (SMS / WhatsApp)", "Disparo de avisos imediatos de ausência escolar e comunicados.")
    }

    Rel(semed, sys_educa, "Parametriza rede, monitora metas e exporta arquivos do Censo", "HTTPS / Web")
    Rel(diretor, sys_educa, "Gerencia matrículas, turmas e emite atas de resultados", "HTTPS / Web")
    Rel(professor, sys_educa, "Registra frequência e aulas ministradas no diário eletrônico", "HTTPS / PWA Mobile")
    Rel(responsavel, sys_educa, "Consulta boletim, horários e notificações escolares", "HTTPS / PWA Cidadão")
    Rel(motorista, sys_educa, "Consulta itinerário e lista de passageiros por ponto", "HTTPS / Mobile")

    Rel(sys_educa, inep_censo, "Exporta arquivos de matrícula (Fase 1) e situação do aluno (Fase 2)", "TXT Layout INEP / API")
    Rel(sys_educa, gov_br, "Autentica cidadãos via OpenID Connect", "OAuth2 / OIDC")
    Rel(sys_educa, receita_cpf, "Valida autenticidade e situação cadastral do CPF", "REST API")
    Rel(sys_educa, sys_tributario, "Envia dados consolidados para comprovação de aplicação do FUNDEB", "Internal gRPC / REST")
    Rel(sys_educa, sys_protocolo, "Integra protocolos de solicitação de vagas e recursos de notas", "Internal REST")
    Rel(sys_educa, gateway_msg, "Dispara alertas de falta e comunicados urgentes", "REST API / Webhooks")
```

---

## 3. Descrição das Fronteiras e Relacionamentos

1. **Atores Internos da Educação:**
   - **Gestor SEMED / Diretor / Secretário / Coordenador:** Acessam a suíte completa de gestão administrativa e relatórios com autenticação forte e controle de escopo.
   - **Professor:** Utiliza interface simplificada e rápida (focada em mobile/tablet em sala de aula) para lançamento do diário sem dependência de internet permanente (suporte a sincronização).
   - **Cidadão (Aluno / Responsável):** Acesso com conta Gov.br para verificação de boletim, histórico e comunicados em tempo real.

2. **Integrações de Alto Impacto:**
   - **Educacenso INEP:** Ponto mais sensível de conformidade nacional. O arquivo gerado precisa ser 100% aderente ao layout exigido pelo governo federal.
   - **Gov.br:** Elimina a necessidade de criação de senhas adicionais para os pais e unifica a identidade do cidadão aos demais serviços municipais do SYSGOV.
   - **Gateway Omnichannel:** Transforma o sistema escolar em ferramenta proativa de combate à evasão escolar e ao abandono.
