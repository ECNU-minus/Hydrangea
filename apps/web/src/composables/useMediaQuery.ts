import { onBeforeUnmount, ref, type Ref } from 'vue'

/**
 * 响应式媒体查询（DESIGN.md §4.5）
 *
 * 封装 `window.matchMedia`，返回随视口变化的响应式布尔值。
 * 组件卸载时自动移除监听，避免内存泄漏。
 */
export function useMediaQuery(query: string): Ref<boolean> {
  const matches = ref(false)

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mql = window.matchMedia(query)
    matches.value = mql.matches

    const onChange = (e: MediaQueryListEvent) => {
      matches.value = e.matches
    }
    mql.addEventListener('change', onChange)
    onBeforeUnmount(() => mql.removeEventListener('change', onChange))
  }

  return matches
}

/** 桌面端最小宽度（px），与 App.vue 的窄屏媒体查询保持一致 */
export const DESKTOP_MIN_WIDTH = 768

/** 是否为桌面端视口（宽度 ≥ DESKTOP_MIN_WIDTH） */
export function useIsDesktop(): Ref<boolean> {
  return useMediaQuery(`(min-width: ${DESKTOP_MIN_WIDTH}px)`)
}
