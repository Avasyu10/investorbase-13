
import { ReportsList } from "@/components/reports/ReportsList";

const Dashboard = () => {
  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your Reports</h1>
        <p className="text-muted-foreground mt-1">
          View and download your available reports
        </p>
      </div>
      <ReportsList />
    </div>
  );
};

export default Dashboard;
