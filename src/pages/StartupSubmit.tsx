import { StartupSubmissionForm } from "@/components/startup/StartupSubmissionForm";
import { Navbar } from "@/components/layout/Navbar";

const StartupSubmit = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <StartupSubmissionForm />
    </div>
  );
};

export default StartupSubmit;