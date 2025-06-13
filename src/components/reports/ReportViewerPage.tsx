
import React from 'react';
import { useParams } from 'react-router-dom';
import { ReportViewer } from './ReportViewer';

const ReportViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="text-muted-foreground">Report ID is missing</p>
        </div>
      </div>
    );
  }

  return <ReportViewer reportId={id} />;
};

export default ReportViewerPage;
