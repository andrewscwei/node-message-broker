/**
 * Creates a random correlation ID.
 *
 * @returns The random correlation ID.
 */
export default function randomCorrelationId(): string {
  return new Date().getTime().toString() + Math.random().toString() + Math.random().toString();
}
