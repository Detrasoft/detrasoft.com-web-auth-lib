import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Estados de carregamento, vazio e erro das telas da lib.
 *
 * Mesmo motivo do `dwa-page-header`: reimplementado em vez de importado do
 * app hospedeiro, para a lib poder virar pacote npm.
 */
@Component({
  selector: 'dwa-state',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (mode()) {
      @case ('loading') {
        <section class="dwa-state" aria-busy="true" [attr.aria-label]="loadingLabel()">
          <span class="dwa-state__skeleton"></span>
          <span class="dwa-state__skeleton"></span>
          <span class="dwa-state__skeleton dwa-state__skeleton--short"></span>
        </section>
      }
      @case ('empty') {
        <section class="dwa-state dwa-state__box" aria-live="polite">
          @if (icon()) {
            <i class="dwa-state__icon" [class]="icon()" aria-hidden="true"></i>
          }
          <h2>{{ title() || 'Nenhum registro encontrado' }}</h2>
          @if (message()) {
            <p>{{ message() }}</p>
          }
          <ng-content select="[state-actions]" />
        </section>
      }
      @case ('error') {
        <section class="dwa-state dwa-state__box" role="alert">
          <i class="dwa-state__icon fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
          <h2>{{ title() || 'Não foi possível carregar esta área' }}</h2>
          @if (message()) {
            <p>{{ message() }}</p>
          }
          <button type="button" class="dwa-state__retry" (click)="retry.emit()">
            Tentar novamente
          </button>
        </section>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .dwa-state {
        display: grid;
        gap: 1rem;
        padding: 1.5rem;
        background: var(--dwa-surface, #ffffff);
        border-radius: var(--dwa-radius-lg, 20px);
        box-shadow: var(--dwa-shadow, 0 10px 30px rgba(42, 36, 64, 0.08));
      }

      .dwa-state__box {
        justify-items: center;
        text-align: center;
        padding: 2.5rem 1.5rem;
      }

      .dwa-state__icon {
        font-size: 1.75rem;
        color: var(--dwa-primary, #896ff4);
      }

      h2 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--dwa-text, #2a2440);
      }

      p {
        margin: 0;
        max-width: 46ch;
        font-size: 0.9rem;
        line-height: 1.5;
        color: var(--dwa-text-muted, #6b6483);
      }

      .dwa-state__skeleton {
        display: block;
        height: 1rem;
        border-radius: 999px;
        background: linear-gradient(
          90deg,
          var(--dwa-skeleton-from, #ece8f8) 0%,
          var(--dwa-skeleton-mid, #f7f5fd) 50%,
          var(--dwa-skeleton-to, #ece8f8) 100%
        );
        background-size: 200% 100%;
        animation: dwa-shimmer 1.3s linear infinite;
      }

      .dwa-state__skeleton--short {
        width: 60%;
      }

      .dwa-state__retry {
        justify-self: center;
        min-height: 44px;
        padding: 0.65rem 1.25rem;
        border: 0;
        cursor: pointer;
        font-weight: 700;
        border-radius: var(--dwa-radius-md, 14px);
        color: var(--dwa-on-primary, #ffffff);
        background: var(--dwa-primary, #896ff4);
      }

      @keyframes dwa-shimmer {
        from {
          background-position: 200% 0;
        }
        to {
          background-position: -200% 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .dwa-state__skeleton {
          animation: none;
        }
      }
    `,
  ],
})
export class WebAuthStateComponent {
  readonly mode = input<'loading' | 'empty' | 'error'>('loading');
  readonly title = input<string>('');
  readonly message = input<string>('');
  readonly icon = input<string>('');
  readonly loadingLabel = input<string>('Carregando');
  readonly retry = output<void>();
}
