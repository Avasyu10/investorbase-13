
import React, { useEffect } from 'react';
import LoginForm from '@/components/auth/LoginForm';
import { useLocation } from 'react-router-dom';

const Login: React.FC = () => {
  const location = useLocation();
  const from = location.state?.from || '/dashboard';
  
  useEffect(() => {
    console.log("Login page mounted: redirecting to", from, "after successful login");
  }, [from]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <LoginForm redirectTo={from} />
    </div>
  );
};

export default Login;
