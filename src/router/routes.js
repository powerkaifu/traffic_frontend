const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      {
        path: 'visualization',
        component: () => import('pages/VisualizationPage.vue'),
        children: [
          {
            path: '',
            redirect: 'timeseries',
          },
          {
            path: 'timeseries',
            name: 'TimeSeries',
            meta: { title: '時間序列分析' },
          },
          {
            path: 'correlation',
            name: 'Correlation',
            meta: { title: '關聯性分析' },
          },
          {
            path: 'summary',
            name: 'Summary',
            meta: { title: '統計摘要' },
          },
        ],
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
