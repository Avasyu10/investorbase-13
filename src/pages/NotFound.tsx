
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BadgePill } from "@/components/ui/badge-pill";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">404</h1>
          <BadgePill variant="danger" className="mb-4 mx-auto">Page Not Found</BadgePill>
          <p className="text-gray-600 mb-6">
            The page you are looking for might have been removed, had its name changed, 
            or is temporarily unavailable.
          </p>
          
          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-sm text-gray-500 mb-2">
              <strong>Debug info:</strong> {location.pathname}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              If you're configuring a webhook, make sure the endpoint URL is correct.
            </p>
          </div>
          
          <Button asChild className="mt-2">
            <a href="/">Return to Home</a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
