import { ApiMessage, ResponseNotification } from '../models/api-response.model';

/**
 * O backend Detrasoft devolve HTTP 2xx mesmo em erro de negócio — a falha vem
 * em `messages[].type === 'error'`. O caso concreto que exige isso: ao criar o
 * 3º usuário num workspace no plano Starter, o `UserCRUDService.beforeInsert`
 * responde **HTTP 201** com `user.starter_subscription_limit_reached` em
 * `messages`. Checar só o status HTTP daria o cadastro como bem-sucedido.
 */
export function hasApiErrors(messages?: ApiMessage[] | null): boolean {
  return !!messages?.some(message => message.type === 'error');
}

/** Primeira mensagem de erro legível, para exibir em toast. */
export function firstApiError(messages?: ApiMessage[] | null): string | null {
  const error = messages?.find(message => message.type === 'error');
  return error?.description?.trim() || null;
}

/** Todas as mensagens de erro concatenadas. */
export function allApiErrors(messages?: ApiMessage[] | null): string[] {
  return (messages ?? [])
    .filter(message => message.type === 'error')
    .map(message => message.description?.trim() ?? '')
    .filter(description => description.length > 0);
}

/**
 * Erro lançado quando a resposta traz erro de negócio apesar do status 2xx.
 * Carrega as mensagens originais para a UI decidir como apresentá-las.
 */
export class ApiBusinessError extends Error {
  constructor(
    message: string,
    readonly messages: ApiMessage[],
  ) {
    super(message);
    this.name = 'ApiBusinessError';
  }
}

/**
 * Valida o envelope e devolve `data`. Lança `ApiBusinessError` se houver erro
 * de negócio — assim o `error` do `subscribe` trata sucesso-com-erro e falha
 * de rede pelo mesmo caminho.
 */
export function unwrapNotification<T>(
  response: ResponseNotification<T>,
  fallbackMessage = 'Não foi possível concluir a operação.',
): T {
  if (hasApiErrors(response?.messages)) {
    throw new ApiBusinessError(
      firstApiError(response.messages) ?? response?.detail ?? fallbackMessage,
      response.messages ?? [],
    );
  }
  return response?.data as T;
}

/** Mensagem legível para qualquer erro (business, HttpErrorResponse ou Error). */
export function toReadableError(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (error instanceof ApiBusinessError) return error.message;

  const candidate = error as {
    error?: { detail?: string; title?: string; messages?: ApiMessage[] };
    message?: string;
    status?: number;
  };

  const fromMessages = firstApiError(candidate?.error?.messages);
  if (fromMessages) return fromMessages;
  if (candidate?.error?.detail) return candidate.error.detail;
  if (candidate?.error?.title) return candidate.error.title;
  if (candidate?.status === 0) return 'Sem conexão com o servidor. Verifique sua internet.';
  if (candidate?.status === 409) return 'Este e-mail já está sendo utilizado por outro usuário.';
  if (candidate?.status === 403) return 'Você não tem permissão para executar esta ação.';
  if (candidate?.message) return candidate.message;

  return fallback;
}
