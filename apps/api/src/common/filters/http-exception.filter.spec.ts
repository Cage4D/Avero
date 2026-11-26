import {
    ConflictException,
    HttpStatus,
    Logger,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { ApiErrorDto } from '@common/dto';
import { USER_EXISTS } from '@common/enums/auth';
import { RepoError } from '@common/errors/repo.error';
import { HttpExceptionFilter } from './http-exception.filter';

const respond = (exception: unknown) => {
    const json = jest.fn((body: ApiErrorDto) => body);
    const status = jest.fn(() => ({ json }));
    new HttpExceptionFilter().catch(
        exception,
        new ExecutionContextHost([{}, { status }]),
    );
    const [[body]] = json.mock.calls;
    return { status, body };
};

describe('HttpExceptionFilter', () => {
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
        errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
        errorSpy.mockRestore();
    });

    it('answers with exactly the error shape the Go backend sends', () => {
        const { status, body } = respond(new ConflictException(USER_EXISTS));

        expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
        expect(body).toEqual({
            statusCode: HttpStatus.CONFLICT,
            message: USER_EXISTS,
            error: 'Conflict',
            timestamp: body.timestamp,
        });
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('joins validation messages into one string', () => {
        const { body } = respond(
            new UnprocessableEntityException([
                'email must be an email',
                'password is too short',
            ]),
        );

        expect(body.message).toBe(
            'email must be an email; password is too short',
        );
        expect(body.error).toBe('Unprocessable Entity');
    });

    it('sanitizes RepoError 500s and logs the underlying cause', () => {
        const cause = new Error('connection refused');
        const { status, body } = respond(
            new RepoError(
                'Failed to find unique user',
                HttpStatus.INTERNAL_SERVER_ERROR,
                cause,
            ),
        );

        expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(body.message).toBe('Internal Server Error');
        expect(body.error).toBe('Internal Server Error');
        expect(errorSpy).toHaveBeenCalledWith(
            '500 Failed to find unique user',
            cause.stack,
        );
    });

    it('catches non-HTTP errors and returns a sanitized 500', () => {
        const { status, body } = respond(new Error('unexpected boom'));

        expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(body.message).toBe('Internal Server Error');
        expect(body.error).toBe('Internal Server Error');
        expect(errorSpy).toHaveBeenCalledTimes(1);
    });
});
