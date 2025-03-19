import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { Dashboard } from '@/pages/Dashboard';
import { Reports } from '@/pages/Reports';
import { ReportDetails } from '@/pages/ReportDetails';
import { CompaniesList } from '@/components/companies/CompaniesList';
import { CompanyDetails } from '@/components/companies/CompanyDetails';
import { SectionDetails } from '@/components/companies/SectionDetails';
import { ProfileSetup } from '@/pages/ProfileSetup';
import { ProfileEdit } from '@/pages/ProfileEdit';
import { SupplementaryMaterials } from '@/components/companies/SupplementaryMaterials';
import Profile from '@/pages/Profile';
import UserProfile from '@/pages/UserProfile';

// Define routes
const routes = [
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/dashboard',
    element: <Dashboard />,
  },
  {
    path: '/reports',
    element: <Reports />,
  },
  {
    path: '/reports/:reportId',
    element: <ReportDetails />,
  },
  {
    path: '/companies',
    element: <CompaniesList />,
  },
  {
    path: '/company/:companyId',
    element: <CompanyDetails />,
  },
  {
    path: '/company/:companyId/section/:sectionId',
    element: <SectionDetails />,
  },
  {
    path: '/profile/setup',
    element: <ProfileSetup />,
  },
  {
    path: '/profile/edit',
    element: <ProfileEdit />,
  },
  {
    path: '/profile',
    element: <Profile />,
  },
  {
    path: '/company/:companyId/supplementary',
    element: <SupplementaryMaterials />,
  },
  {
    path: '/profile',
    element: <UserProfile />,
  },
];

export default routes;
