import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown = null;
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const rawResponse = exception.getResponse();
      const exceptionResponse =
        typeof rawResponse === 'object' && rawResponse !== null
          ? (rawResponse as Record<string, unknown>)
          : null;
      const responseMessage = exceptionResponse?.message;
      message = Array.isArray(responseMessage)
        ? responseMessage.map(String).join(', ')
        : typeof responseMessage === 'string'
          ? responseMessage
          : exception.message;
      errors = exceptionResponse?.errors ?? null;
      code =
        typeof exceptionResponse?.code === 'string'
          ? exceptionResponse.code
          : undefined;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(code && { code }),
      ...(errors !== null ? { errors } : {}),
    });
  }
}
