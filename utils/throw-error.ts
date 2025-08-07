export class TAppError extends Error {
  public readonly status_code: number;
  public readonly is_operational: boolean;

  constructor(message: string, status_code: number = 500, is_operational: boolean = true) {
    super(message);
    this.status_code = status_code;
    this.is_operational = is_operational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const throw_error = ({ message, status_code = 500 }: { message: string; status_code?: number }): never => {
  throw new TAppError(message, status_code);
};

export const is_operational_error = (error: Error): boolean => {
  if (error instanceof TAppError) {
    return error.is_operational;
  }
  return false;
}; 