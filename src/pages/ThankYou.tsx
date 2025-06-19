
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const ThankYou = () => {
  useEffect(() => {
    // Scroll to top when page loads
    window.scrollTo(0, 0);
  }, []);

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-black py-12 px-4">
      <div className="container mx-auto flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-2xl shadow-xl border border-blue-800/30 bg-slate-900/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-8 pt-12">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
                <CheckCircle className="h-20 w-20 text-emerald-400 relative z-10" />
              </div>
            </div>
            <CardTitle className="text-3xl md:text-4xl font-bold text-white mb-4">
              Thank You for Your Submission!
            </CardTitle>
            <p className="text-lg text-blue-100 max-w-md mx-auto">
              We have successfully received your application and will review it shortly.
            </p>
          </CardHeader>
          
          <CardContent className="px-8 pb-12">
            <div className="space-y-6 text-center">
              <div className="bg-gradient-to-r from-blue-900/50 to-slate-800/50 rounded-lg p-6 border border-blue-700/30">
                <div className="flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  Confirmation Email Sent
                </h3>
                <p className="text-blue-100 mb-4">
                  A confirmation email has been sent to your registered email address with details about your submission.
                </p>
                <p className="text-sm text-blue-200">
                  Please check your inbox and spam folder for the confirmation email.
                </p>
              </div>

              <div className="bg-gradient-to-r from-slate-800/50 to-blue-900/50 rounded-lg p-6 border border-slate-700/30">
                <h3 className="text-lg font-semibold text-white mb-3">
                  What happens next?
                </h3>
                <div className="space-y-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-1 flex-shrink-0">
                      1
                    </div>
                    <p className="text-blue-100">
                      Our team will review your application and analyze your business proposal
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-1 flex-shrink-0">
                      2
                    </div>
                    <p className="text-blue-100">
                      We'll conduct an initial assessment of your startup's potential and fit with our program
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-1 flex-shrink-0">
                      3
                    </div>
                    <p className="text-blue-100">
                      You'll receive an email update within 5-7 business days regarding the next steps
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleGoBack}
                  variant="outline"
                  className="flex items-center gap-2 border-blue-600 text-blue-400 hover:bg-blue-900/20 hover:text-blue-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go Back
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ThankYou;
