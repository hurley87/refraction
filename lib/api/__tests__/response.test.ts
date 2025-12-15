import { apiSuccess, apiError, apiValidationError } from '../response';
import { ZodError } from 'zod';

describe('API Response Utilities', () => {
  describe('apiSuccess', () => {
    it('should return a successful response with data', async () => {
      const data = { id: 1, name: 'Test' };
      const response = apiSuccess(data);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
    });

    it('should include optional message', async () => {
      const response = apiSuccess({}, 'Operation successful');

      const json = await response.json();
      expect(json.message).toBe('Operation successful');
    });

    it('should allow custom status code', () => {
      const response = apiSuccess({}, undefined, 201);

      expect(response.status).toBe(201);
    });
  });

  describe('apiError', () => {
    it('should return an error response', async () => {
      const response = apiError('Something went wrong');

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Something went wrong');
    });

    it('should allow custom status codes', () => {
      const response400 = apiError('Bad request', 400);
      const response404 = apiError('Not found', 404);
      const response429 = apiError('Too many requests', 429);

      expect(response400.status).toBe(400);
      expect(response404.status).toBe(404);
      expect(response429.status).toBe(429);
    });
  });

  describe('apiValidationError', () => {
    it('should return validation error response', async () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
      ]);

      const response = apiValidationError(zodError);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('email');
      expect(json.error).toContain('Expected string');
    });
  });
});

