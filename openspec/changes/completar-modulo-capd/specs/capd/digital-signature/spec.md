# Spec Delta

## Purpose

Integração com a infraestrutura de chaves públicas (ICP-Brasil) para garantir a validade jurídica de assinaturas digitais em atas de comissão e homologações de ciclo.

## ADDED Requirements

### Requirement: Assinatura de Atas via ICP-Brasil
O sistema SHALL integrar-se a um PSC (Prestador de Serviço de Confiança) para validar e processar assinaturas digitais em formato PAdES ou XAdES.

#### Scenario: Assinatura bem-sucedida de ata
- **WHEN** o membro da comissão faz o upload do arquivo assinado ou assina via portal integrado
- **THEN** o sistema valida a cadeia de certificados e registra o timestamp da assinatura no banco de dados

#### Scenario: Rejeição de assinatura inválida
- **WHEN** o certificado digital estiver expirado ou revogado no momento da validação
- **THEN** o sistema rejeita o documento e notifica o usuário sobre a invalidade do certificado

### Requirement: Selo de Validade Jurídica
Cada documento assinado SHALL possuir um identificador único de transação do PSC para verificação externa.

#### Scenario: Verificação de autenticidade
- **WHEN** um auditor acessa a ata homologada
- **THEN** o sistema exibe o link de validação do PSC e o status de conformidade da assinatura
