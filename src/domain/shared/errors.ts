// Error carrying an HTTP-like status. Thrown by gateways, shown by the UI through `message`.
export class AppError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : 'Something went wrong.';
