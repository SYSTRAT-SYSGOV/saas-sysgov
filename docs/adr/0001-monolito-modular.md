# ADR 0001: Monólito modular

**Status:** aceito

O SYSGOV usa Laravel como unidade de implantação e `nwidart/laravel-modules` para fronteiras explícitas. Microserviços ficam adiados até existir necessidade comprovada de escala, isolamento operacional ou ciclo de release independente. A decisão reduz custo de operação sem bloquear extração futura.
