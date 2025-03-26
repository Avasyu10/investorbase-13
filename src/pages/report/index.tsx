
import React from 'react';
import { useParams } from 'react-router-dom';

const ReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Report {id}</h1>
      <p>Report content will be displayed here.</p>
    </div>
  );
};

export default ReportPage;
