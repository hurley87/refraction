import { describe, it, expect } from 'vitest'
import { apiSuccess, apiError, apiValidationError } from '../response'
import { ZodError } from 'zod'

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

    // Edge case tests for apiSuccess
    it('should handle null data', async () => {
      const response = apiSuccess(null);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeNull();
    });

    it('should handle empty object', async () => {
      const response = apiSuccess({});

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual({});
    });

    it('should handle array data', async () => {
      const data = [1, 2, 3, { nested: 'value' }];
      const response = apiSuccess(data);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
    });

    it('should handle deeply nested objects', async () => {
      const nestedData = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
              array: [1, 2, { level4: true }],
            },
          },
        },
      };
      const response = apiSuccess(nestedData);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(nestedData);
      expect(json.data.level1.level2.level3.value).toBe('deep');
    });

    it('should return valid JSON response', async () => {
      const response = apiSuccess({ test: true });

      // Verify response is valid JSON (NextResponse.json guarantees application/json)
      const json = await response.json();
      expect(json).toBeDefined();
      expect(typeof json).toBe('object');
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

    // Edge case tests for apiError
    it('should handle empty error message', async () => {
      const response = apiError('');

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('');
    });

    it('should handle very long error message', async () => {
      const longMessage = 'A'.repeat(10000);
      const response = apiError(longMessage);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe(longMessage);
      expect(json.error.length).toBe(10000);
    });

    it('should handle error message with special characters', async () => {
      const specialMessage = 'Error: <script>alert("xss")</script> & "quotes" \' newline\n tab\t';
      const response = apiError(specialMessage);

      const json = await response.json();
      expect(json.error).toBe(specialMessage);
    });

    it('should return valid JSON response', async () => {
      const response = apiError('Error');

      // Verify response is valid JSON (NextResponse.json guarantees application/json)
      const json = await response.json();
      expect(json).toBeDefined();
      expect(typeof json).toBe('object');
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

    // Edge case tests for apiValidationError
    it('should handle multiple validation errors', async () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
        {
          code: 'too_small',
          minimum: 1,
          type: 'string',
          inclusive: true,
          exact: false,
          path: ['username'],
          message: 'Username is required',
        },
        {
          code: 'invalid_type',
          expected: 'number',
          received: 'string',
          path: ['age'],
          message: 'Age must be a number',
        },
      ]);

      const response = apiValidationError(zodError);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('email');
      expect(json.error).toContain('username');
      expect(json.error).toContain('age');
    });

    it('should handle nested path validation errors', async () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          path: ['user', 'profile', 'address', 'street'],
          message: 'Street is required',
        },
      ]);

      const response = apiValidationError(zodError);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('user.profile.address.street');
    });

    it('should handle validation error without path (root level)', async () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'object',
          received: 'string',
          path: [],
          message: 'Expected object, received string',
        },
      ]);

      const response = apiValidationError(zodError);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Expected object, received string');
    });

    it('should allow custom status code', () => {
      const zodError = new ZodError([
        {
          code: 'custom',
          path: ['field'],
          message: 'Custom error',
        },
      ]);

      const response = apiValidationError(zodError, 422);

      expect(response.status).toBe(422);
    });

    it('should return valid JSON response', async () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['field'],
          message: 'Invalid',
        },
      ]);

      const response = apiValidationError(zodError);

      // Verify response is valid JSON (NextResponse.json guarantees application/json)
      const json = await response.json();
      expect(json).toBeDefined();
      expect(typeof json).toBe('object');
    });
  });
});

