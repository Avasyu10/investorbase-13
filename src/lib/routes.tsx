
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import Report from '@/pages/Report';
import UploadReport from '@/pages/UploadReport';
import { CompaniesList } from '@/components/companies/CompaniesList';
import { CompanyDetails } from '@/components/companies/CompanyDetails';
import { SectionDetail } from '@/components/companies/SectionDetail';
import ProfileSetup from '@/pages/ProfileSetup';
import ProfileEdit from '@/pages/ProfileEdit';
import SupplementaryMaterials from '@/pages/SupplementaryMaterials';
import Profile from '@/pages/Profile';
import UserProfile from '@/pages/UserProfile';

// Define routes
const routes = [
  {
    path: '/',
    element: <Index />,
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
    element: <UploadReport />,
  },
  {
    path: '/reports/:reportId',
    element: <Report />,
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
    element: <SectionDetail />,
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
