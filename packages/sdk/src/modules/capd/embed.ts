/**
 * Web Component & Script de Injeção de Terceiros — @sysgov/capd-widget
 *
 * Permite que sistemas legados de RH, Intranets ou portais municipais (ex: Prefeitura de Araucária)
 * injetem o Módulo CAPD diretamente em suas páginas com 1 tag HTML:
 *
 * <sysgov-capd-widget
 *   api-url="https://api.sysgov.com.br/api"
 *   tenant="araucaria"
 *   token="eyJhbGciOi..."
 *   servidor-id="123"
 *   mode="avaliacao">
 * </sysgov-capd-widget>
 */

export class SysgovCapdWidget extends HTMLElement {
  static get observedAttributes() {
    return ['api-url', 'tenant', 'token', 'servidor-id', 'ciclo-id', 'mode'];
  }

  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  private render() {
    const apiUrl = this.getAttribute('api-url') || 'http://localhost:8000/api';
    const tenant = this.getAttribute('tenant') || '';
    const token = this.getAttribute('token') || '';
    const servidorId = this.getAttribute('servidor-id') || '';
    const cicloId = this.getAttribute('ciclo-id') || '';
    const mode = this.getAttribute('mode') || 'dashboard';

    this.shadow.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #0a1128;
          color: #f8fafc;
          border-radius: 12px;
          border: 1px solid #1a2a52;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
        }
        .widget-header {
          background: #101a3a;
          padding: 14px 20px;
          border-bottom: 1px solid #1a2a52;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .widget-title {
          font-size: 14px;
          font-weight: 700;
          color: #10b981;
          display: flex;
          align-items: center;
          gap: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .widget-badge {
          font-size: 11px;
          font-family: "JetBrains Mono", monospace;
          background: #152244;
          color: #06b6d4;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid #1a2a52;
        }
        .widget-body {
          padding: 20px;
          min-height: 200px;
        }
        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 150px;
          color: #94a3b8;
          font-size: 13px;
        }
        .nfd-card {
          background: #152244;
          border: 1px solid #1a2a52;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          margin-bottom: 16px;
        }
        .nfd-score {
          font-family: "JetBrains Mono", monospace;
          font-size: 36px;
          font-weight: 800;
          color: #10b981;
          line-height: 1;
          margin-top: 8px;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #10b981;
          color: #0a1128;
          font-weight: 600;
          font-size: 13px;
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          width: 100%;
          text-decoration: none;
        }
        .btn:hover {
          background: #059669;
        }
      </style>

      <div class="widget-header">
        <div class="widget-title">
          <span>🏛️ CAPD — SYSGOV</span>
        </div>
        <div class="widget-badge">${tenant || 'Conectado'}</div>
      </div>

      <div class="widget-body">
        <div class="nfd-card">
          <div style="font-size: 12px; color: #94a3b8;">Desempenho Periódico Oficial</div>
          <div class="nfd-score" id="score-display">--.--</div>
          <div id="status-label" style="font-size: 11px; margin-top: 6px; color: #64748b;">Consultando API...</div>
        </div>

        <button class="btn" id="open-portal-btn">Acessar Painel Completo</button>
      </div>
    `;

    this.initWidgetLogic(apiUrl, tenant, token, servidorId, cicloId);
  }

  private async initWidgetLogic(apiUrl: string, tenant: string, token: string, servidorId: string, cicloId: string) {
    const scoreDisplay = this.shadow.getElementById('score-display');
    const statusLabel = this.shadow.getElementById('status-label');
    const openBtn = this.shadow.getElementById('open-portal-btn');

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        window.open(`/capd?servidor=${servidorId}`, '_blank');
      });
    }

    if (!token && !apiUrl) return;

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (tenant) headers['X-Tenant-Slug'] = tenant;

      const res = await fetch(`${apiUrl}/capd/dashboard/metricas`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (scoreDisplay && data.avaliacoes?.media_nfd) {
          scoreDisplay.textContent = data.avaliacoes.media_nfd;
        }
        if (statusLabel) {
          statusLabel.textContent = `Taxa de Elegibilidade: ${data.avaliacoes?.taxa_elegivel || 0}%`;
          statusLabel.style.color = '#10b981';
        }
      }
    } catch (e) {
      if (statusLabel) {
        statusLabel.textContent = 'Modo de visualização rápida ativo';
      }
    }
  }
}

if (typeof window !== 'undefined' && !customElements.get('sysgov-capd-widget')) {
  customElements.define('sysgov-capd-widget', SysgovCapdWidget);
}
