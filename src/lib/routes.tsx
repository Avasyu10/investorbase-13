
import React from "react";
import { RouteObject } from "react-router-dom";

const Home = React.lazy(() => import('@/pages/Home'));
const Login = React.lazy(() => import('@/pages/Login'));
const Register = React.lazy(() => import('@/pages/Register'));
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const UploadReport = React.lazy(() => import('@/pages/UploadReport'));
const CompanyProfile = React.lazy(() => import('@/pages/CompanyProfile'));
const PublicSubmission = React.lazy(() => import('@/pages/PublicSubmission'));
const TestEmail = React.lazy(() => import('@/pages/TestEmail'));

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Home />
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/register',
    element: <Register />
  },
  {
    path: '/dashboard',
    element: <Dashboard />
  },
  {
    path: '/upload',
    element: <UploadReport />
  },
  {
    path: '/company/:id',
    element: <CompanyProfile />
  },
  {
    path: '/public-submission',
    element: <PublicSubmission />
  },
  {
    path: '/test-email',
    element: <TestEmail />
  },
];
