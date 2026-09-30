import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Diálogo de confirmação para ações destrutivas.
 *
 * A `detra-ng` já expõe `<ds-confirm-dialog>`, mas ele não permite marcar a
 * ação como destrutiva nem projetar conteúdo — aqui o corpo é livre (usado para
 * listar o que será perdido) e o botão de confirmação tem variante de perigo.
 */
@Component({
  selector: 'dwa-confirm',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="dwa-confirm__backdrop" (click)="onBackdrop()">
        <div
          class="dwa-confirm__card"
          role="alertdialog"
          aria-modal="true"
          [attr.aria-label]="title()"
          (click)="$event.stopPropagation()"
        >
          <div class="dwa-confirm__head">
            <span class="dwa-confirm__icon" [class.dwa-confirm__icon--danger]="danger()">
              <i [class]="icon()" aria-hidden="true"></i>
            </span>
            <div>
              <h2>{{ title() }}</h2>
              @if (message()) {
                <p>{{ message() }}</p>
              }
            </div>
          </div>

          <ng-content />

          <div class="dwa-confirm__actions">
            <button
              type="button"
              class="dwa-confirm__btn dwa-confirm__btn--ghost"
              [disabled]="loading()"
              (click)="cancel.emit()"
            >
              {{ cancelText() }}
            </button>
            <button
              type="button"
              class="dwa-confirm__btn"
              [class.dwa-confirm__btn--danger]="danger()"
              [class.dwa-confirm__btn--primary]="!danger()"
              [disabled]="loading() || confirmDisabled()"
              (click)="confirm.emit()"
            >
              @if (loading()) {
                <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
              }
              {{ loading() ? loadingText() : confirmText() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .dwa-confirm__backdrop {
        position: fixed;
        inset: 0;
        z-index: var(--dwa-z-modal, 1000);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        background: rgba(20, 16, 34, 0.55);
        backdrop-filter: blur(2px);
        animation: dwa-confirm-in 160ms ease both;
      }

      .dwa-confirm__card {
        width: 100%;
        max-width: 460px;
        display: grid;
        gap: 1.15rem;
        padding: 1.5rem;
        background: var(--dwa-surface, #ffffff);
        border-radius: var(--dwa-radius-lg, 20px);
        box-shadow: 0 24px 60px rgba(20, 16, 34, 0.3);
      }

      .dwa-confirm__head {
        display: flex;
        gap: 0.9rem;
        align-items: flex-start;
      }

      .dwa-confirm__icon {
        flex: 0 0 auto;
        width: 44px;
        height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 14px;
        background: var(--dwa-primary-soft, rgba(137, 111, 244, 0.12));
        color: var(--dwa-primary-strong, #5b44b0);
      }

      .dwa-confirm__icon--danger {
        background: var(--dwa-danger-soft, rgba(248, 113, 113, 0.14));
        color: var(--dwa-danger-strong, #b91c1c);
      }

      h2 {
        margin: 0 0 0.25rem;
        font-size: 1.1rem;
        font-weight: 800;
        color: var(--dwa-text, #2a2440);
      }

      p {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.5;
        color: var(--dwa-text-muted, #6b6483);
      }

      .dwa-confirm__actions {
        display: flex;
        gap: 0.65rem;
        justify-content: flex-end;
        flex-wrap: wrap;
      }

      .dwa-confirm__btn {
        min-height: 44px;
        padding: 0.6rem 1.15rem;
        border: 0;
        cursor: pointer;
        font-weight: 700;
        font-size: 0.92rem;
        border-radius: var(--dwa-radius-md, 14px);
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
      }

      .dwa-confirm__btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .dwa-confirm__btn--ghost {
        background: transparent;
        color: var(--dwa-text-muted, #6b6483);
      }

      .dwa-confirm__btn--ghost:hover:not(:disabled) {
        background: var(--dwa-surface-sunken, #f3f0fb);
      }

      .dwa-confirm__btn--primary {
        background: var(--dwa-primary, #896ff4);
        color: var(--dwa-on-primary, #ffffff);
      }

      .dwa-confirm__btn--danger {
        background: var(--dwa-danger, #dc2626);
        color: #ffffff;
      }

      @keyframes dwa-confirm-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @media (max-width: 520px) {
        .dwa-confirm__actions {
          flex-direction: column-reverse;
        }

        .dwa-confirm__btn {
          width: 100%;
          justify-content: center;
        }
      }
    `,
  ],
})
export class WebAuthConfirmComponent {
  readonly isOpen = input<boolean>(false);
  readonly title = input<string>('Confirmar ação');
  readonly message = input<string>('');
  readonly confirmText = input<string>('Confirmar');
  readonly cancelText = input<string>('Cancelar');
  readonly loadingText = input<string>('Processando…');
  readonly icon = input<string>('fa-solid fa-triangle-exclamation');
  readonly danger = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly confirmDisabled = input<boolean>(false);
  readonly closeOnBackdrop = input<boolean>(true);

  readonly confirm = output<void>();
  readonly cancel = output<void>();

  onBackdrop(): void {
    if (this.closeOnBackdrop() && !this.loading()) this.cancel.emit();
  }
}
