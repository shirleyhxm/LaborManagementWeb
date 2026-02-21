/**
 * Tests for API service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api, ApiError, NetworkError, TimeoutError } from './api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger to avoid console noise in tests
vi.mock('../utils/logger', () => ({
  logApiRequest: vi.fn(),
  logApiError: vi.fn(),
}));

describe('API service', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    localStorage.clear();
  });

  describe('Error classes', () => {
    it('should create ApiError with correct properties', () => {
      const error = new ApiError('Test error', 404, { detail: 'Not found' });

      expect(error.name).toBe('ApiError');
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(404);
      expect(error.data).toEqual({ detail: 'Not found' });
      expect(error.isNetworkError).toBe(false);
    });

    it('should create NetworkError', () => {
      const error = new NetworkError('Connection failed');

      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('Connection failed');
      expect(error.status).toBe(0);
      expect(error.isNetworkError).toBe(true);
    });

    it('should create TimeoutError', () => {
      const error = new TimeoutError('Request timed out');

      expect(error.name).toBe('TimeoutError');
      expect(error.message).toBe('Request timed out');
      expect(error.status).toBe(408);
      expect(error.isNetworkError).toBe(true);
    });
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      });

      const result = await api.get<typeof mockData>('/test');

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should include auth token in headers when available', async () => {
      localStorage.setItem('auth_token', 'test-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      });

      await api.get('/test');

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1].headers;
      expect(headers['Authorization']).toBe('Bearer test-token');
    });

    it('should handle 404 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({}),
      });

      await expect(api.get('/not-found')).rejects.toThrow(ApiError);
      await expect(api.get('/not-found')).rejects.toThrow(
        'The requested resource was not found.'
      );
    });

    it('should handle 401 unauthorized errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({}),
      });

      await expect(api.get('/protected')).rejects.toThrow(
        'Authentication required. Please log in again.'
      );
    });

    it('should handle 403 forbidden errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({}),
      });

      await expect(api.get('/forbidden')).rejects.toThrow(
        "You don't have permission to perform this action."
      );
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request with data', async () => {
      const requestData = { name: 'New Item' };
      const responseData = { id: 1, ...requestData };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => responseData,
      });

      const result = await api.post('/items', requestData);

      expect(result).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].body).toBe(JSON.stringify(requestData));
    });

    it('should include Content-Type header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      });

      await api.post('/test', { data: 'test' });

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1].headers;
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('PUT requests', () => {
    it('should make successful PUT request', async () => {
      const updateData = { name: 'Updated' };
      const responseData = { id: 1, ...updateData };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => responseData,
      });

      const result = await api.put('/items/1', updateData);

      expect(result).toEqual(responseData);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].method).toBe('PUT');
    });
  });

  describe('DELETE requests', () => {
    it('should make successful DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
        json: async () => {
          throw new Error('No content');
        },
      });

      const result = await api.delete('/items/1');

      expect(result).toEqual({});
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].method).toBe('DELETE');
    });
  });

  describe('PATCH requests', () => {
    it('should make successful PATCH request', async () => {
      const patchData = { status: 'active' };
      const responseData = { id: 1, ...patchData };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => responseData,
      });

      const result = await api.patch('/items/1', patchData);

      expect(result).toEqual(responseData);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].method).toBe('PATCH');
    });
  });

  describe('Retry logic', () => {
    it('should retry on network errors', async () => {
      // First two calls fail with network error, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ success: true }),
        });

      const result = await api.get('/test');

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 30000); // Increase timeout for retry delays

    it('should retry on 500 errors', async () => {
      // First call returns 500, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ success: true }),
        });

      const result = await api.get('/test');

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, 30000);

    it('should retry on 429 rate limit errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ success: true }),
        });

      const result = await api.get('/test');

      expect(result).toEqual({ success: true });
    }, 30000);

    it('should not retry on 4xx errors (except 429)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid data' }),
      });

      await expect(api.get('/test')).rejects.toThrow(ApiError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry when skipRetry is true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      });

      await expect(api.get('/test', { skipRetry: true })).rejects.toThrow(ApiError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries exhausted', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(api.get('/test')).rejects.toThrow(NetworkError);
      // Should try 1 initial + 3 retries = 4 times
      expect(mockFetch).toHaveBeenCalledTimes(4);
    }, 30000);
  });

  describe('Timeout handling', () => {
    it('should timeout long-running requests', async () => {
      // Mock a request that never resolves
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      await expect(
        api.get('/slow', { timeout: 100 })
      ).rejects.toThrow(TimeoutError);
    }, 10000);
  });

  describe('Custom headers', () => {
    it('should merge custom headers with default headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      });

      await api.get('/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1].headers;
      expect(headers['X-Custom-Header']).toBe('custom-value');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Response handling', () => {
    it('should handle non-JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
        json: async () => {
          throw new Error('No JSON');
        },
      });

      const result = await api.get('/no-content');

      expect(result).toEqual({});
    });

    it('should parse JSON responses', async () => {
      const jsonData = { message: 'Success', data: [1, 2, 3] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => jsonData,
      });

      const result = await api.get('/json');

      expect(result).toEqual(jsonData);
    });

    it('should handle error responses with JSON data', async () => {
      const errorData = { error: 'Validation failed', fields: ['name', 'email'] };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => errorData,
      });

      try {
        await api.post('/validate', {});
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.status).toBe(400);
          expect(error.data).toEqual(errorData);
        }
      }
    });

    it('should handle error responses with non-JSON data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Not JSON');
        },
      });

      await expect(api.get('/error')).rejects.toThrow('Server error');
    });
  });

  describe('Error messages', () => {
    const statusCodeTests = [
      { status: 401, expectedMessage: 'Authentication required. Please log in again.' },
      { status: 403, expectedMessage: "You don't have permission to perform this action." },
      { status: 404, expectedMessage: 'The requested resource was not found.' },
      { status: 429, expectedMessage: 'Too many requests. Please try again later.' },
      { status: 500, expectedMessage: 'Server error. Please try again later.' },
      { status: 503, expectedMessage: 'Service temporarily unavailable. Please try again later.' },
    ];

    statusCodeTests.forEach(({ status, expectedMessage }) => {
      it(`should return custom message for ${status} errors`, async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status,
          statusText: 'Error',
          json: async () => ({}),
        });

        try {
          await api.get('/test');
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          if (error instanceof ApiError) {
            expect(error.message).toBe(expectedMessage);
          }
        }
      });
    });

    it('should use server error message when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Custom validation error' }),
      });

      try {
        await api.get('/test');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.message).toBe('Custom validation error');
        }
      }
    });
  });
});
