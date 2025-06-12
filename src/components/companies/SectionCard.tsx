
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SectionBase } from "@/lib/api/apiContract";
import { ArrowUpRight, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { SECTION_TITLES, SECTION_TYPES } from "@/lib/constants";

interface SectionCardProps {
  section: SectionBase;
  onClick: () => void;
}

export function SectionCard({ section, onClick }: SectionCardProps) {
  const navigate = useNavigate();

  // Format score to whole number
  const scoreValue = Math.round(section.score);
  
  // Calculate progress percentage (already 0-100 scale)
  const progressPercentage = scoreValue;

  // Get the display title from constants based on section type, fallback to database title
  const getDisplayTitle = (section: SectionBase): string => {
    // Try to match the section type to our constants
    const sectionType = section.type?.toUpperCase();
    if (sectionType && SECTION_TITLES[sectionType as keyof typeof SECTION_TITLES]) {
      return SECTION_TITLES[sectionType as keyof typeof SECTION_TITLES];
    }
    
    // Fallback: try to map common title patterns to our section types
    const title = section.title.toLowerCase();
    if (title.includes('solution') || title.includes('product')) {
      return SECTION_TITLES[SECTION_TYPES.SOLUTION];
    }
    if (title.includes('traction') || title.includes('milestone')) {
      return SECTION_TITLES[SECTION_TYPES.TRACTION];
    }
    if (title.includes('team') || title.includes('founder')) {
      return SECTION_TITLES[SECTION_TYPES.TEAM];
    }
    if (title.includes('financial') || title.includes('projection')) {
      return SECTION_TITLES[SECTION_TYPES.FINANCIALS];
    }
    if (title.includes('ask') || title.includes('next step')) {
      return SECTION_TITLES[SECTION_TYPES.ASK];
    }
    if (title.includes('problem')) {
      return SECTION_TITLES[SECTION_TYPES.PROBLEM];
    }
    if (title.includes('market') || title.includes('opportunity')) {
      return SECTION_TITLES[SECTION_TYPES.MARKET];
    }
    if (title.includes('competitive') || title.includes('landscape')) {
      return SECTION_TITLES[SECTION_TYPES.COMPETITIVE_LANDSCAPE];
    }
    if (title.includes('business model')) {
      return SECTION_TITLES[SECTION_TYPES.BUSINESS_MODEL];
    }
    if (title.includes('go-to-market') || title.includes('strategy')) {
      return SECTION_TITLES[SECTION_TYPES.GTM_STRATEGY];
    }
    
    // Final fallback to original title
    return section.title;
  };

  const displayTitle = getDisplayTitle(section);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "score-excellent";
    if (score >= 70) return "score-good";
    if (score >= 50) return "score-average";
    if (score >= 30) return "score-poor";
    return "score-critical";
  };
  
  const getSectionTypeDescription = (type: string, score: number): string => {
    const scoreText = `${score}/100`;
    
    // Specific descriptions based on section type and score
    if (type === "business_model" || section.title.toLowerCase().includes("business model")) {
      if (score >= 90) return `Exceptional Business Model (${scoreText}): Highly scalable and profitable with clear revenue streams and competitive advantages. Excellent unit economics with proven market fit.`;
      if (score >= 70) return `Strong Business Model (${scoreText}): Good scalability and profit potential with defined revenue streams. Solid unit economics and market validation.`;
      if (score >= 50) return `Adequate Business Model (${scoreText}): Basic model in place but scalability or profitability concerns exist. Some market validation, requires optimization.`;
      if (score >= 30) return `Problematic Business Model (${scoreText}): Significant flaws in revenue strategy or unit economics. Limited validation and substantial revision needed.`;
      return `Critical Business Model Issues (${scoreText}): Fundamentally unsound approach to monetization with no clear path to profitability. Complete overhaul required.`;
    }
    
    if (type === "competitive_landscape" || section.title.toLowerCase().includes("competitive") || section.title.toLowerCase().includes("landscape")) {
      if (score >= 90) return `Dominant Market Position (${scoreText}): Clear competitive advantages in a favorable market structure. Leading market position with high barriers to entry.`;
      if (score >= 70) return `Favorable Competitive Position (${scoreText}): Solid competitive advantages in a reasonably favorable market. Good positioning against competitors.`;
      if (score >= 50) return `Moderate Competitive Standing (${scoreText}): Some differentiation but faces significant competition. Average positioning requiring strategic improvements.`;
      if (score >= 30) return `Weak Competitive Position (${scoreText}): Limited differentiation in a crowded market. At-risk positioning with few sustainable advantages.`;
      return `Severe Competitive Disadvantages (${scoreText}): No clear differentiators in a highly competitive or declining market. Immediate strategic repositioning required.`;
    }
    
    if (type === "financials" || section.title.toLowerCase().includes("financials") || section.title.toLowerCase().includes("financial")) {
      if (score >= 90) return `Exceptional Financial Health (${scoreText}): Strong revenue growth, profitability metrics, and cash position. Clear path to sustainable profitability with attractive unit economics.`;
      if (score >= 70) return `Solid Financial Performance (${scoreText}): Good revenue trajectory and reasonable burn rate. Path to profitability exists with manageable risk factors.`;
      if (score >= 50) return `Adequate Financial Standing (${scoreText}): Moderate growth with concerning cost structure or burn rate. Requires optimization to achieve profitability.`;
      if (score >= 30) return `Problematic Financials (${scoreText}): Poor growth metrics, concerning burn rate, or unsustainable unit economics. Significant restructuring needed.`;
      return `Critical Financial Issues (${scoreText}): Unsustainable financial model with immediate runway or solvency concerns. Emergency measures required.`;
    }
    
    if (type === "go_to_market" || section.title.toLowerCase().includes("go-to-market") || section.title.toLowerCase().includes("marketing")) {
      if (score >= 90) return `Excellent Go-to-Market Strategy (${scoreText}): Highly effective customer acquisition channels with outstanding CAC/LTV ratios. Clear understanding of target market with proven strategies.`;
      if (score >= 70) return `Strong Go-to-Market Approach (${scoreText}): Effective acquisition strategy with good conversion metrics. Well-defined target market and reasonable CAC.`;
      if (score >= 50) return `Adequate Market Approach (${scoreText}): Basic acquisition strategy in place but efficiency concerns exist. Target market definition or conversion needs improvement.`;
      if (score >= 30) return `Problematic Go-to-Market (${scoreText}): Inefficient acquisition channels with poor economics. Unclear targeting or positioning requiring major revision.`;
      return `Failed Market Strategy (${scoreText}): No effective customer acquisition approach. Prohibitive CAC or undefined market fit requiring complete rethinking.`;
    }
    
    // Default descriptions if type doesn't match specific categories
    if (score >= 90) return `Outstanding (${scoreText}): This section demonstrates exceptional quality with industry-leading practices, providing significant competitive advantage.`;
    if (score >= 70) return `Very Good (${scoreText}): This section is well executed with minor opportunities for enhancement. Shows solid understanding of investor expectations.`;
    if (score >= 50) return `Satisfactory (${scoreText}): Several aspects need improvement, though the foundation is adequate. Key elements require further development.`;
    if (score >= 30) return `Needs Work (${scoreText}): Significant deficiencies exist that would concern potential investors. Requires substantial revisions.`;
    return `Critical Concerns (${scoreText}): This section fails to meet basic standards and requires complete overhaul. Major red flags for investors.`;
  };

  return (
    <Card 
      className="hover:shadow-card transition-all cursor-pointer border bg-card/50 border-0 shadow-subtle"
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold line-clamp-1">{displayTitle}</h3>
          <div className="flex items-center">
            <span className="font-bold text-lg text-primary">{scoreValue}</span>
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 ml-1 text-muted-foreground">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" align="center" className="max-w-[260px] text-xs">
                  <p>{getSectionTypeDescription(section.type, section.score)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="mb-4">
          <Progress 
            value={progressPercentage} 
            className={`h-1.5 ${getScoreColor(section.score)}`} 
          />
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-3 h-[60px]">
          {section.description || 'No description available'}
        </p>
      </CardContent>
      <CardFooter className="pt-1 pb-4 flex justify-end">
        <span className="text-xs text-primary flex items-center gap-0.5">
          View details <ArrowUpRight className="h-3 w-3" />
        </span>
      </CardFooter>
    </Card>
  );
}
