const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      {
        path: 'visualization',
        redirect: '/visualization/timeseries',
      },
      {
        path: 'visualization/timeseries',
        name: 'TimeSeries',
        component: () => import('pages/VisualizationPage.vue'),
        meta: { title: '時間序列分析' },
      },
      {
        path: 'visualization/correlation',
        name: 'Correlation',
        component: () => import('pages/VisualizationPage.vue'),
        meta: { title: '關聯性分析' },
      },
      {
        path: 'visualization/summary',
        name: 'Summary',
        component: () => import('pages/VisualizationPage.vue'),
        meta: { title: '統計摘要' },
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
