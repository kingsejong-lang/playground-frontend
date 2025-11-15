import {
  ok,
  err,
  isOk,
  isErr,
  map,
  mapErr,
  andThen,
  unwrap,
  unwrapOr,
  unwrapOrElse,
  fromPromise,
  tryCatch,
  combine,
} from '../result'

describe('Result type', () => {
  describe('ok and err constructors', () => {
    it('should create a successful result', () => {
      const result = ok(42)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(42)
      }
    })

    it('should create a failed result', () => {
      const result = err('error message')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('error message')
      }
    })
  })

  describe('isOk and isErr type guards', () => {
    it('should correctly identify successful result', () => {
      const result = ok(42)
      expect(isOk(result)).toBe(true)
      expect(isErr(result)).toBe(false)
    })

    it('should correctly identify failed result', () => {
      const result = err('error')
      expect(isOk(result)).toBe(false)
      expect(isErr(result)).toBe(true)
    })
  })

  describe('map', () => {
    it('should map successful result', () => {
      const result = ok(10)
      const mapped = map(result, (x) => x * 2)

      expect(isOk(mapped)).toBe(true)
      if (mapped.ok) {
        expect(mapped.value).toBe(20)
      }
    })

    it('should not map failed result', () => {
      const result = err('error')
      const mapped = map(result, (x: number) => x * 2)

      expect(isErr(mapped)).toBe(true)
      if (!mapped.ok) {
        expect(mapped.error).toBe('error')
      }
    })
  })

  describe('mapErr', () => {
    it('should map error in failed result', () => {
      const result = err('original error')
      const mapped = mapErr(result, (e) => `Mapped: ${e}`)

      expect(isErr(mapped)).toBe(true)
      if (!mapped.ok) {
        expect(mapped.error).toBe('Mapped: original error')
      }
    })

    it('should not map successful result', () => {
      const result = ok(42)
      const mapped = mapErr(result, (e: string) => `Mapped: ${e}`)

      expect(isOk(mapped)).toBe(true)
      if (mapped.ok) {
        expect(mapped.value).toBe(42)
      }
    })
  })

  describe('andThen', () => {
    it('should chain successful results', () => {
      const result = ok(10)
      const chained = andThen(result, (x) => ok(x * 2))

      expect(isOk(chained)).toBe(true)
      if (chained.ok) {
        expect(chained.value).toBe(20)
      }
    })

    it('should short-circuit on error', () => {
      const result = err<number, string>('error')
      const chained = andThen(result, (x) => ok(x * 2))

      expect(isErr(chained)).toBe(true)
      if (!chained.ok) {
        expect(chained.error).toBe('error')
      }
    })
  })

  describe('unwrap', () => {
    it('should unwrap successful result', () => {
      const result = ok(42)
      expect(unwrap(result)).toBe(42)
    })

    it('should throw on failed result', () => {
      const result = err('error message')
      expect(() => unwrap(result)).toThrow('error message')
    })
  })

  describe('unwrapOr', () => {
    it('should return value for successful result', () => {
      const result = ok(42)
      expect(unwrapOr(result, 0)).toBe(42)
    })

    it('should return default for failed result', () => {
      const result = err('error')
      expect(unwrapOr(result, 0)).toBe(0)
    })
  })

  describe('unwrapOrElse', () => {
    it('should return value for successful result', () => {
      const result = ok(42)
      expect(unwrapOrElse(result, () => 0)).toBe(42)
    })

    it('should compute default for failed result', () => {
      const result = err('error')
      expect(unwrapOrElse(result, (e) => e.length)).toBe(5)
    })
  })

  describe('fromPromise', () => {
    it('should convert successful promise to ok', async () => {
      const promise = Promise.resolve(42)
      const result = await fromPromise(promise)

      expect(isOk(result)).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(42)
      }
    })

    it('should convert failed promise to err', async () => {
      const promise = Promise.reject(new Error('failed'))
      const result = await fromPromise(promise)

      expect(isErr(result)).toBe(true)
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error)
      }
    })

    it('should map error with custom mapper', async () => {
      const promise = Promise.reject('failed')
      const result = await fromPromise(promise, (e) => `Mapped: ${e}`)

      expect(isErr(result)).toBe(true)
      if (!result.ok) {
        expect(result.error).toBe('Mapped: failed')
      }
    })
  })

  describe('tryCatch', () => {
    it('should catch successful function', () => {
      const result = tryCatch(() => 42)

      expect(isOk(result)).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(42)
      }
    })

    it('should catch throwing function', () => {
      const result = tryCatch(() => {
        throw new Error('failed')
      })

      expect(isErr(result)).toBe(true)
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error)
      }
    })

    it('should map error with custom mapper', () => {
      const result = tryCatch(
        () => {
          throw 'failed'
        },
        (e) => `Mapped: ${e}`
      )

      expect(isErr(result)).toBe(true)
      if (!result.ok) {
        expect(result.error).toBe('Mapped: failed')
      }
    })
  })

  describe('combine', () => {
    it('should combine all successful results', () => {
      const results = [ok(1), ok(2), ok(3)]
      const combined = combine(results)

      expect(isOk(combined)).toBe(true)
      if (combined.ok) {
        expect(combined.value).toEqual([1, 2, 3])
      }
    })

    it('should return first error', () => {
      const results = [ok(1), err('error'), ok(3)]
      const combined = combine(results)

      expect(isErr(combined)).toBe(true)
      if (!combined.ok) {
        expect(combined.error).toBe('error')
      }
    })

    it('should handle empty array', () => {
      const results: typeof ok<number, string>[] = []
      const combined = combine(results)

      expect(isOk(combined)).toBe(true)
      if (combined.ok) {
        expect(combined.value).toEqual([])
      }
    })
  })
})
