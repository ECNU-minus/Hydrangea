import { createRouter, createWebHistory } from 'vue-router'
import SchedulePage from '../views/SchedulePage.vue'
import SearchPage from '../views/SearchPage.vue'

/**
 * 路由（DESIGN §4.1）
 *
 * 双页面：搜索页负责查询与意向标记，排课页负责课表与已排标记。
 */
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/search' },
    { path: '/search', name: 'search', component: SearchPage },
    { path: '/schedule', name: 'schedule', component: SchedulePage },
    { path: '/:pathMatch(.*)*', redirect: '/search' },
  ],
})
