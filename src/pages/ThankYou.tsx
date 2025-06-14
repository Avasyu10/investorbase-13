
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Building, GraduationCap } from "lucide-react";

const ThankYou = () => {
  useEffect(() => {
    // Scroll to top when page loads
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="container mx-auto flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-2xl shadow-2xl border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-8 pt-12">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
                <CheckCircle className="h-20 w-20 text-green-500 relative z-10" />
              </div>
            </div>
            <CardTitle className="text-3xl md:text-4xl font-bold text-white mb-4">
              Application Submitted Successfully!
            </CardTitle>
            <div className="flex items-center justify-center gap-2 text-lg text-primary font-medium">
              <GraduationCap className="h-6 w-6" />
              <span>Eureka Incubation Program</span>
            </div>
          </CardHeader>
          
          <CardContent className="px-8 pb-12">
            <div className="space-y-6 text-center">
              <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 rounded-lg p-6 border border-blue-800">
                <h3 className="text-xl font-semibold text-white mb-3">
                  What happens next?
                </h3>
                <div className="space-y-4 text-gray-300">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-1 flex-shrink-0">
                      1
                    </div>
                    <p className="text-left">
                      Our team will review your application and analyze your business proposal
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-1 flex-shrink-0">
                      2
                    </div>
                    <p className="text-left">
                      We'll conduct an initial assessment of your startup's potential and fit with our program
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-1 flex-shrink-0">
                      3
                    </div>
                    <p className="text-left">
                      You'll receive an email update within 5-7 business days regarding the next steps
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-lg p-6 border border-gray-700">
                <Building className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Thank you for choosing Eureka
                </h3>
                <p className="text-gray-300">
                  We're excited to learn about your innovative idea and look forward to potentially supporting your entrepreneurial journey.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ThankYou;
