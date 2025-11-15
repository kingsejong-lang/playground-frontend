import { z } from 'zod'
import {
  validate,
  isError,
  hasMessage,
  isAxiosError,
  parseJSON,
  parseAndValidate,
  isFileReaderResult,
  assertType,
  isDefined,
  isNonEmptyString,
  isArray,
  isRecord,
  extractErrorMessage,
  extractErrorStatus,
} from '../guards'
import { isOk, isErr } from '../result'

describe('guards', () => {
  describe('validate', () => {
    const userSchema = z.object({
      name: z.string(),
      age: z.number(),
    })

    it('should validate valid data', () => {
      const data = { name: 'John', age: 30 }
      const result = validate(userSchema, data)

      expect(isOk(result)).toBe(true)
      if (result.ok) {
        expect(result.value).toEqual({ name: 'John', age: 30 })
      }
    })

    it('should return error for invalid data', () => {
      const data = { name: 'John', age: 'thirty' }
      const result = validate(userSchema, data)

      expect(isErr(result)).toBe(true)
      if (!result.ok) {
        expect(result.error.type).toBe('ValidationError')
      }
    })

    it('should include field path in validation error', () => {
      const data = { name: 123, age: 30 }
      const result = validate(userSchema, data)

      expect(isErr(result)).toBe(true)
      if (!result.ok) {
        expect(result.error.field).toBe('name')
      }
    })
  })

  describe('isError', () => {
    it('should return true for Error instance', () => {
      expect(isError(new Error('test'))).toBe(true)
    })

    it('should return true for TypeError', () => {
      expect(isError(new TypeError('test'))).toBe(true)
    })

    it('should return false for string', () => {
      expect(isError('error')).toBe(false)
    })

    it('should return false for object with message', () => {
      expect(isError({ message: 'error' })).toBe(false)
    })

    it('should return false for null', () => {
      expect(isError(null)).toBe(false)
    })
  })

  describe('hasMessage', () => {
    it('should return true for object with message string', () => {
      expect(hasMessage({ message: 'test' })).toBe(true)
    })

    it('should return false for object with non-string message', () => {
      expect(hasMessage({ message: 123 })).toBe(false)
    })

    it('should return false for object without message', () => {
      expect(hasMessage({ error: 'test' })).toBe(false)
    })

    it('should return false for null', () => {
      expect(hasMessage(null)).toBe(false)
    })

    it('should return false for string', () => {
      expect(hasMessage('error')).toBe(false)
    })
  })

  describe('isAxiosError', () => {
    it('should return true for axios error', () => {
      const axiosError = {
        message: 'Request failed',
        isAxiosError: true,
        response: {
          data: { message: 'Server error' },
          status: 500,
        },
      }
      expect(isAxiosError(axiosError)).toBe(true)
    })

    it('should return false when isAxiosError is false', () => {
      const notAxiosError = {
        message: 'Error',
        isAxiosError: false,
      }
      expect(isAxiosError(notAxiosError)).toBe(false)
    })

    it('should return false for regular error', () => {
      expect(isAxiosError(new Error('test'))).toBe(false)
    })

    it('should return false for null', () => {
      expect(isAxiosError(null)).toBe(false)
    })
  })

  describe('parseJSON', () => {
    it('should parse valid JSON string', () => {
      const result = parseJSON('{"name":"John","age":30}')

      expect(isOk(result)).toBe(true)
      if (result.ok) {
        expect(result.value).toEqual({ name: 'John', age: 30 })
      }
    })

    it('should parse JSON array', () => {
      const result = parseJSON('[1,2,3]')

      expect(isOk(result)).toBe(true)
      if (result.ok) {
        expect(result.value).toEqual([1, 2, 3])
      }
    })

    it('should return error for invalid JSON', () => {
      const result = parseJSON('invalid json')

      expect(isErr(result)).toBe(true)
      if (!result.ok) {
        expect(result.error.type).toBe('ParseError')
      }
    })

    it('should include original data in parse error', () => {
      const invalidJSON = '{invalid}'
      const result = parseJSON(invalidJSON)

      expect(isErr(result)).toBe(true)
      if (!result.ok) {
        expect(result.error.data).toBe(invalidJSON)
      }
    })
  })

  describe('parseAndValidate', () => {
    const userSchema = z.object({
      name: z.string(),
      age: z.number(),
    })

    it('should parse and validate valid JSON', () => {
      const result = parseAndValidate(userSchema, '{"name":"John","age":30}')

      expect(isOk(result)).toBe(true)
      if (result.ok) {
        expect(result.value).toEqual({ name: 'John', age: 30 })
      }
    })

    it('should return parse error for invalid JSON', () => {
      const result = parseAndValidate(userSchema, 'invalid json')

      expect(isErr(result)).toBe(true)
      if (!result.ok) {
        expect(result.error.type).toBe('ParseError')
      }
    })

    it('should return validation error for invalid data', () => {
      const result = parseAndValidate(userSchema, '{"name":"John","age":"thirty"}')

      expect(isErr(result)).toBe(true)
      if (!result.ok) {
        expect(result.error.type).toBe('ValidationError')
      }
    })
  })

  describe('isFileReaderResult', () => {
    it('should return true for string', () => {
      expect(isFileReaderResult('test')).toBe(true)
    })

    it('should return true for ArrayBuffer', () => {
      expect(isFileReaderResult(new ArrayBuffer(8))).toBe(true)
    })

    it('should return true for null', () => {
      expect(isFileReaderResult(null)).toBe(true)
    })

    it('should return false for number', () => {
      expect(isFileReaderResult(123)).toBe(false)
    })

    it('should return false for object', () => {
      expect(isFileReaderResult({})).toBe(false)
    })
  })

  describe('assertType', () => {
    const numberSchema = z.number()

    it('should validate correct type', () => {
      const result = assertType(numberSchema, 42)

      expect(isOk(result)).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(42)
      }
    })

    it('should return error for incorrect type', () => {
      const result = assertType(numberSchema, 'not a number')

      expect(isErr(result)).toBe(true)
      if (!result.ok) {
        expect(result.error.type).toBe('ValidationError')
      }
    })
  })

  describe('isDefined', () => {
    it('should return true for defined values', () => {
      expect(isDefined(0)).toBe(true)
      expect(isDefined('')).toBe(true)
      expect(isDefined(false)).toBe(true)
      expect(isDefined([])).toBe(true)
      expect(isDefined({})).toBe(true)
    })

    it('should return false for null', () => {
      expect(isDefined(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isDefined(undefined)).toBe(false)
    })
  })

  describe('isNonEmptyString', () => {
    it('should return true for non-empty string', () => {
      expect(isNonEmptyString('hello')).toBe(true)
      expect(isNonEmptyString('   test   ')).toBe(true)
    })

    it('should return false for empty string', () => {
      expect(isNonEmptyString('')).toBe(false)
    })

    it('should return false for whitespace-only string', () => {
      expect(isNonEmptyString('   ')).toBe(false)
    })

    it('should return false for non-string', () => {
      expect(isNonEmptyString(123)).toBe(false)
      expect(isNonEmptyString(null)).toBe(false)
      expect(isNonEmptyString(undefined)).toBe(false)
    })
  })

  describe('isArray', () => {
    it('should return true for arrays', () => {
      expect(isArray([])).toBe(true)
      expect(isArray([1, 2, 3])).toBe(true)
      expect(isArray(['a', 'b'])).toBe(true)
    })

    it('should return false for non-arrays', () => {
      expect(isArray({})).toBe(false)
      expect(isArray('array')).toBe(false)
      expect(isArray(null)).toBe(false)
      expect(isArray(undefined)).toBe(false)
    })
  })

  describe('isRecord', () => {
    it('should return true for objects', () => {
      expect(isRecord({})).toBe(true)
      expect(isRecord({ key: 'value' })).toBe(true)
    })

    it('should return false for arrays', () => {
      expect(isRecord([])).toBe(false)
    })

    it('should return false for null', () => {
      expect(isRecord(null)).toBe(false)
    })

    it('should return false for primitives', () => {
      expect(isRecord('string')).toBe(false)
      expect(isRecord(123)).toBe(false)
      expect(isRecord(true)).toBe(false)
    })
  })

  describe('extractErrorMessage', () => {
    it('should extract message from Error', () => {
      const error = new Error('Test error')
      expect(extractErrorMessage(error)).toBe('Test error')
    })

    it('should extract message from axios error', () => {
      const axiosError = {
        message: 'Request failed',
        isAxiosError: true,
        response: {
          data: { message: 'Server error' },
          status: 500,
        },
      }
      expect(extractErrorMessage(axiosError)).toBe('Server error')
    })

    it('should fallback to axios message when no response data', () => {
      const axiosError = {
        message: 'Request failed',
        isAxiosError: true,
      }
      expect(extractErrorMessage(axiosError)).toBe('Request failed')
    })

    it('should extract message from object with message', () => {
      expect(extractErrorMessage({ message: 'Custom error' })).toBe('Custom error')
    })

    it('should handle string errors', () => {
      expect(extractErrorMessage('Error string')).toBe('Error string')
    })

    it('should return default message for unknown error', () => {
      expect(extractErrorMessage(123)).toBe('An unknown error occurred')
      expect(extractErrorMessage(null)).toBe('An unknown error occurred')
      expect(extractErrorMessage(undefined)).toBe('An unknown error occurred')
    })
  })

  describe('extractErrorStatus', () => {
    it('should extract status from axios error', () => {
      const axiosError = {
        message: 'Request failed',
        isAxiosError: true,
        response: {
          data: { message: 'Server error' },
          status: 500,
        },
      }
      expect(extractErrorStatus(axiosError)).toBe(500)
    })

    it('should return undefined for axios error without response', () => {
      const axiosError = {
        message: 'Request failed',
        isAxiosError: true,
      }
      expect(extractErrorStatus(axiosError)).toBeUndefined()
    })

    it('should extract status from object with status property', () => {
      expect(extractErrorStatus({ status: 404 })).toBe(404)
    })

    it('should return undefined for non-number status', () => {
      expect(extractErrorStatus({ status: 'error' })).toBeUndefined()
    })

    it('should return undefined for unknown error types', () => {
      expect(extractErrorStatus(new Error('test'))).toBeUndefined()
      expect(extractErrorStatus('error')).toBeUndefined()
      expect(extractErrorStatus(null)).toBeUndefined()
    })
  })
})
