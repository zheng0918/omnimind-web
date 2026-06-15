/**
 * 全站路由路径常量。
 *
 * 设计要点：审查与编写在原型 index-v2.html 中是「同一视图 + 双 Tab」（ir 视图），
 * 因此这里只保留单一 `review` 路由作为「智能审查工作台」入口；进入编写模式通过
 * `?mode=write` 查询参数深链，避免出现独立且无侧边栏入口的孤立 /write 路由。
 */
export const ROUTE_PATHS = {
  login: '/login',
  workbench: '/',
  chat: '/chat',
  kb: '/kb',
  kbDetail: '/kb/:kbId',
  /** 智能审查工作台（审查 + 编写双 Tab 合一）。编写模式：`/review?mode=write` */
  review: '/review',
  sys: '/sys',
  forbidden: '/403',
} as const

/** 进入编写模式的深链目标，供 router-link 的对象写法复用。 */
export const REVIEW_WRITE_LOCATION = { path: ROUTE_PATHS.review, query: { mode: 'write' } } as const
