
import React from 'react';
import LoginForm from '@/components/auth/LoginForm';

const Login: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0B0D14] flex items-center justify-center p-4">
      <LoginForm />
    </div>
  );
};

export default Login;
