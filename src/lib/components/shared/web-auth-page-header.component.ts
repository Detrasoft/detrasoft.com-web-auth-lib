import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';

/**
 * Cabeçalho das telas da lib.
 *
 * Reimplementa o visual do cabeçalho de ajustes do app hospedeiro em vez de
 * importá-lo: uma lib publicável não pode depender de `src/app/`. A aparência
 * acompanha o hospedeiro pelos tokens `--dwa-*`, que ele redireciona para o
 * próprio design system (ver THEMING.md).
 */
@Component({
  selector: 'dwa-page-header',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="dwa-header">
      <div class="dwa-header__head">
        @if (backLink()) {
          <button type="button" class="dwa-header__back" (click)="back()" [attr.aria-label]="backLabel()">
            <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
          </button>
        }
        <div class="dwa-header__copy">
          @if (eyebrow()) {
            <span class="dwa-header__eyebrow">{{ eyebrow() }}</span>
          }
          <h1>{{ title() }}</h1>
        </div>
        @if (hasActions()) {
          <div class="dwa-header__actions">
            <ng-content select="[header-actions]" />
          </div>
        }
      </div>
      @if (description()) {
        <p class="dwa-header__desc">{{ description() }}</p>
      }
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .dwa-header {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
        padding: 1.25rem 1.5rem;
        background: var(--dwa-surface, #ffffff);
        border-radius: var(--dwa-radius-lg, 20px);
        box-shadow: var(--dwa-shadow, 0 10px 30px rgba(42, 36, 64, 0.08));
      }

      .dwa-header__head {
        display: flex;
        align-items: center;
        gap: 0.85rem;
      }

      .dwa-header__back {
        flex: 0 0 auto;
        width: 40px;
        height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        cursor: pointer;
        border-radius: 12px;
        background: var(--dwa-primary-soft, rgba(137, 111, 244, 0.1));
        color: var(--dwa-primary-strong, #5b44b0);
        transition: transform var(--dwa-transition, 180ms ease);
      }

      .dwa-header__back:hover {
        transform: translateX(-2px);
      }

      .dwa-header__copy {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-width: 0;
      }

      .dwa-header__eyebrow {
        font-size: 0.76rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--dwa-primary-strong, #5b44b0);
      }

      h1 {
        margin: 0;
        font-size: clamp(1.35rem, 4vw, 2.2rem);
        font-weight: 800;
        line-height: 1.15;
        color: var(--dwa-text, #2a2440);
      }

      .dwa-header__actions {
        margin-left: auto;
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .dwa-header__desc {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.5;
        color: var(--dwa-text-muted, #6b6483);
      }

      @media (max-width: 767px) {
        .dwa-header {
          padding: 1rem 0.85rem;
          border-radius: var(--dwa-radius-md, 16px);
        }

        .dwa-header__back {
          width: 36px;
          height: 36px;
        }
      }
    `,
  ],
})
export class WebAuthPageHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly eyebrow = input<string>('');
  readonly backLink = input<string>('');
  readonly backLabel = input<string>('Voltar');
  readonly hasActions = input<boolean>(false);

  private readonly location = inject(Location);
  private readonly router = inject(Router);

  back(): void {
    if (history.length > 1) {
      this.location.back();
      return;
    }
    const target = this.backLink();
    if (target) void this.router.navigateByUrl(target);
  }
}
