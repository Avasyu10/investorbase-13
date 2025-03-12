
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-3xl space-y-6 animate-fade-in">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-primary/5">
            <FileText className="h-10 w-10 text-primary" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Your reports, beautifully organized
        </h1>
        
        <p className="text-xl text-muted-foreground">
          Access and download your reports securely from anywhere. A minimalist, elegant experience for viewing your important documents.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button asChild size="lg" className="transition-all duration-200 hover:shadow-md">
            <Link to="/login">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="transition-all duration-200">
            <Link to="/signup">
              Create Account
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
