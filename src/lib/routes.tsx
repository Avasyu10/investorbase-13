import React from "react";

export const routes = [
  {
    path: '/',
    element: <React.lazy(() => import('@/pages/Home')) />,
  },
  {
    path: '/login',
    element: <React.lazy(() => import('@/pages/Login')) />,
  },
  {
    path: '/register',
    element: <React.lazy(() => import('@/pages/Register')) />,
  },
  {
    path: '/dashboard',
    element: <React.lazy(() => import('@/pages/Dashboard')) />,
  },
  {
    path: '/upload',
    element: <React.lazy(() => import('@/pages/UploadReport')) />,
  },
  {
    path: '/company/:id',
    element: <React.lazy(() => import('@/pages/CompanyProfile')) />,
  },
  {
    path: '/public-submission',
    element: <React.lazy(() => import('@/pages/PublicSubmission')) />,
  },
  {
    path: '/test-email',
    element: <React.lazy(() => import('@/pages/TestEmail')) />,
  },
];
