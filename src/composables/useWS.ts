/**
 * WebSocket 预留空骨架（frontendRequirements.md §七 扩展性预留）。
 * 一期不引入多人协作/实时锁，仅占位以稳定上层 API；二期再补连接与重连逻辑。
 */
export function useWS() {
  return {
    status: 'reserved' as const,
    connect: () => undefined,
    close: () => undefined,
  }
}
