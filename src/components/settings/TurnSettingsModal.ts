import { TurnServerConfig } from '../../types/index.js';

export interface TurnModalOptions {
  initialConfig?: TurnServerConfig;
  onSave: (config: TurnServerConfig) => void;
}

export class TurnSettingsModal {
  private parentContainer: HTMLElement;
  private options: TurnModalOptions;
  private iceCheckingTimer: any = null;
  private isAlertVisible = false;

  constructor(container: HTMLElement, options: TurnModalOptions) {
    this.parentContainer = container;
    this.options = options;
  }

  /**
   * Addendum 1 Directive 5: Monitors ICE connection state.
   * If checking exceeds 5 seconds, triggers proactive alert prompting for TURN credentials.
   */
  monitorPeerConnection(pc: RTCPeerConnection): void {
    pc.addEventListener('iceconnectionstatechange', () => {
      if (pc.iceConnectionState === 'checking') {
        this.iceCheckingTimer = setTimeout(() => {
          if (pc.iceConnectionState === 'checking') {
            this.showSymmetricNatAlert();
          }
        }, 5000);
      } else {
        if (this.iceCheckingTimer) {
          clearTimeout(this.iceCheckingTimer);
          this.iceCheckingTimer = null;
        }
      }
    });
  }

  showSymmetricNatAlert(): void {
    if (this.isAlertVisible) return;
    this.isAlertVisible = true;

    const alertBanner = document.createElement('div');
    alertBanner.className = 'symmetric-nat-alert';
    alertBanner.innerHTML = `
      <div class="alert-content">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span><strong>Symmetric NAT Warning:</strong> Direct P2P swarm connection blocked (>5s ICE timeout). Please configure a custom TURN relay.</span>
        <button id="btn-open-turn-settings" class="btn-warning">Configure TURN</button>
      </div>
    `;

    this.parentContainer.prepend(alertBanner);

    alertBanner.querySelector('#btn-open-turn-settings')?.addEventListener('click', () => {
      this.openModal();
      alertBanner.remove();
      this.isAlertVisible = false;
    });
  }

  openModal(): void {
    const modalEl = document.createElement('div');
    modalEl.className = 'modal-backdrop';
    modalEl.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>P2P NAT Traversal &amp; TURN Credentials</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p class="desc">
            To bypass corporate firewalls or symmetric NATs, input credentials from Twilio Network Traversal or Metered.ca.
          </p>
          <div class="form-group">
            <label>TURN URLs (one per line)</label>
            <textarea id="turn-urls" rows="3" placeholder="turn:global.relay.metered.ca:80&#10;turn:global.relay.metered.ca:443?transport=tcp">${(this.options.initialConfig?.urls || []).join('\n')}</textarea>
          </div>
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="turn-user" value="${this.options.initialConfig?.username || ''}" placeholder="e.g. 7c34f0e..."/>
          </div>
          <div class="form-group">
            <label>Credential / Password</label>
            <input type="password" id="turn-pass" value="${this.options.initialConfig?.credential || ''}" placeholder="Password"/>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btn-cancel">Cancel</button>
          <button class="btn-primary" id="btn-save-turn">Save Credentials</button>
        </div>
      </div>
    `;

    this.parentContainer.appendChild(modalEl);

    const close = () => modalEl.remove();
    modalEl.querySelector('.modal-close')?.addEventListener('click', close);
    modalEl.querySelector('#btn-cancel')?.addEventListener('click', close);

    modalEl.querySelector('#btn-save-turn')?.addEventListener('click', () => {
      const urls = ((modalEl.querySelector('#turn-urls') as HTMLTextAreaElement).value || '')
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);
      const username = (modalEl.querySelector('#turn-user') as HTMLInputElement).value.trim();
      const credential = (modalEl.querySelector('#turn-pass') as HTMLInputElement).value.trim();

      const config: TurnServerConfig = {
        urls,
        username,
        credential,
      };

      this.options.onSave(config);
      close();
    });
  }
}
