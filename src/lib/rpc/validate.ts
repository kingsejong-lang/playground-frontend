/**
 * Client-side request validation: the same protovalidate rules the gateway
 * enforces, plus the total-source limit that CEL cannot express.
 * The gateway stays authoritative; this only gives instant feedback.
 *
 * Usage:
 *   assertValid(RunRequestSchema, request); // throws RpcFailureError(kind: "validation")
 */
import type { DescMessage, MessageShape } from '@bufbuild/protobuf';
import { pathToString } from '@bufbuild/protobuf/reflect';
import { createValidator } from '@bufbuild/protovalidate';
import { checkTotalSource, MAX_TOTAL_SOURCE_BYTES } from '@kingsejong-lang/playground-proto/limits';
import { RpcFailureError, failureMessage } from './errors';

let validator: ReturnType<typeof createValidator> | undefined;

function getValidator() {
  // Lazy: compiling CEL rules costs a few ms; do it on first use only.
  validator ??= createValidator();
  return validator;
}

/** Throws RpcFailureError when the message violates its proto rules. */
export function assertValid<Desc extends DescMessage>(schema: Desc, message: MessageShape<Desc>): void {
  const result = getValidator().validate(schema, message);
  if (result.kind === 'valid') return;
  if (result.kind === 'invalid') {
    const v = result.violations[0];
    const field = v ? pathToString(v.field) : undefined;
    throw new RpcFailureError({
      kind: 'validation',
      field: field || undefined,
      message: failureMessage('validation', { field: field || undefined, text: v?.message }),
    });
  }
  // kind === "error": the rules could not be evaluated; let the server decide.
}

/** Throws RpcFailureError when the UTF-8 size of all files exceeds the edge limit. */
export function assertFilesFit(files: ReadonlyArray<{ content: string }>): void {
  if (!checkTotalSource(files)) {
    throw new RpcFailureError({
      kind: 'payload_too_large',
      message: `${failureMessage('payload_too_large')} (limit ${MAX_TOTAL_SOURCE_BYTES / 1024} KiB)`,
    });
  }
}
