
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight, Globe, TrendingUp, BookOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface MarketResearchItem {
  id: string;
  company_id: string;
  companies: {
    name: string;
  };
  market_insights: string[];
  news_highlights: string[];
  created_at: string;
}

interface NewsItem {
  id: string;
  type: 'market_research' | 'fund_thesis_analysis';
  title: string;
  subtitle: string;
  companyId: string;
  companyName: string;
  highlights: string[];
  createdAt: string;
}

const NewsFeed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch market research data
        const { data: marketResearchData, error: marketResearchError } = await supabase
          .from('market_research')
          .select(`
            id,
            company_id,
            companies (
              name
            ),
            market_insights,
            news_highlights,
            created_at
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (marketResearchError) {
          console.error('Error fetching market research:', marketResearchError);
          throw marketResearchError;
        }

        // Fetch fund thesis analysis data
        const { data: thesisAnalysisData, error: thesisError } = await supabase
          .from('fund_thesis_analysis')
          .select(`
            id,
            company_id,
            companies (
              name
            ),
            alignment_score,
            opportunity_fit,
            alignment_reasons,
            created_at
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (thesisError) {
          console.error('Error fetching thesis analysis:', thesisError);
          throw thesisError;
        }

        // Format the market research data
        let formattedNewsItems: NewsItem[] = [];
        
        if (marketResearchData) {
          const marketResearchItems = marketResearchData.map((item: MarketResearchItem) => ({
            id: item.id,
            type: 'market_research' as const,
            title: `New Market Research for ${item.companies?.name || 'Unknown Company'}`,
            subtitle: 'Market Insights and News',
            companyId: item.company_id,
            companyName: item.companies?.name || 'Unknown Company',
            highlights: [...(item.market_insights || []), ...(item.news_highlights || [])].slice(0, 3),
            createdAt: item.created_at
          }));
          
          formattedNewsItems = [...formattedNewsItems, ...marketResearchItems];
        }
        
        // Format the thesis analysis data
        if (thesisAnalysisData) {
          const thesisItems = thesisAnalysisData.map((item) => ({
            id: item.id,
            type: 'fund_thesis_analysis' as const,
            title: `Fund Thesis Analysis for ${item.companies?.name || 'Unknown Company'}`,
            subtitle: `Alignment Score: ${item.alignment_score?.toFixed(1)}/5 - ${item.opportunity_fit || 'Analysis Complete'}`,
            companyId: item.company_id,
            companyName: item.companies?.name || 'Unknown Company',
            highlights: item.alignment_reasons || [],
            createdAt: item.created_at
          }));
          
          formattedNewsItems = [...formattedNewsItems, ...thesisItems];
        }

        // Sort by created_at
        formattedNewsItems.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setNewsItems(formattedNewsItems);
      } catch (error) {
        console.error('Error in useEffect:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleCardClick = (companyId: string) => {
    navigate(`/company/${companyId}`);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">News Feed</h1>
      
      {isLoading && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="shadow-card border-0">
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <div>
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mt-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {!isLoading && newsItems.length === 0 && (
        <Card className="shadow-card border-0 p-8 text-center">
          <div className="flex flex-col items-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No Updates Yet</CardTitle>
            <p className="text-muted-foreground mb-6">
              Your news feed will show market research and analysis updates for your portfolio companies.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              View Dashboard
            </Button>
          </div>
        </Card>
      )}
      
      {!isLoading && newsItems.length > 0 && (
        <div className="space-y-6">
          {newsItems.map((item) => (
            <Card 
              key={item.id}
              className="shadow-card border-0 cursor-pointer hover:bg-secondary/20 transition-colors"
              onClick={() => handleCardClick(item.companyId)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center text-xl">
                      {item.title}
                    </CardTitle>
                    <div className="flex items-center mt-1 gap-2">
                      <Badge variant="secondary" className="font-normal">
                        {item.type === 'market_research' ? 'Market Research' : 'Fund Thesis'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <Avatar className="h-10 w-10 bg-primary/10">
                    <AvatarImage src=""/>
                    <AvatarFallback>
                      {item.type === 'market_research' ? 
                        <Globe className="h-5 w-5 text-sky-500" /> : 
                        <BookOpen className="h-5 w-5 text-blue-500" />
                      }
                    </AvatarFallback>
                  </Avatar>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium mb-3 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  {item.subtitle}
                </p>
                <ul className="space-y-2">
                  {item.highlights.map((highlight, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex gap-2 items-start">
                      <div className="rounded-full bg-primary/10 p-1 mt-0.5">
                        <div className="h-1 w-1 rounded-full bg-primary" />
                      </div>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-end mt-4">
                  <Button variant="ghost" size="sm" className="text-xs flex items-center gap-1">
                    View details <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewsFeed;
