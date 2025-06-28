
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building, TrendingUp } from "lucide-react";

interface UserTypeSelectionProps {
  onUserTypeSelect: (userType: 'founder' | 'accelerator' | 'vc') => void;
}

const UserTypeSelection = ({ onUserTypeSelect }: UserTypeSelectionProps) => {
  const userTypes = [
    {
      id: 'founder' as const,
      title: 'Founder',
      description: 'I\'m a founder looking to pitch my startup',
      icon: <Users className="h-8 w-8 text-blue-600" />,
      buttonText: 'Continue as Founder'
    },
    {
      id: 'accelerator' as const,
      title: 'Accelerator & Incubator',
      description: 'I represent an accelerator or incubator program',
      icon: <Building className="h-8 w-8 text-green-600" />,
      buttonText: 'Continue as Accelerator'
    },
    {
      id: 'vc' as const,
      title: 'Venture Capitalists',
      description: 'I\'m a venture capitalist looking to evaluate startups',
      icon: <TrendingUp className="h-8 w-8 text-purple-600" />,
      buttonText: 'Continue as VC'
    }
  ];

  return (
    <div className="max-w-4xl w-full space-y-6 animate-fade-in">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Welcome to InvestorBase</h1>
        <p className="text-xl text-muted-foreground">
          Please select your user type to continue
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {userTypes.map((type) => (
          <Card key={type.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {type.icon}
              </div>
              <CardTitle className="text-xl">{type.title}</CardTitle>
              <CardDescription className="text-sm">
                {type.description}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button 
                onClick={() => onUserTypeSelect(type.id)}
                className="w-full"
                variant="default"
              >
                {type.buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UserTypeSelection;
