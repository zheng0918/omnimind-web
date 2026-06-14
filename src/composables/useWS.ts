export function useWS() {
  return {
    status: 'reserved' as const,
    connect: () => undefined,
    close: () => undefined,
  }
}
