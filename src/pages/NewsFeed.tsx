import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Sparkle, BookText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from 'sonner';

interface MarketInsight {
  id: number;
  title: string;
  content: string;
  source_url: string;
  created_at: string;
}

interface NewsItem {
  id: number;
  title: string;
  link: string;
  source: string;
  published_date: string;
}

const NewsFeed = () => {
  const [marketInsights, setMarketInsights] = useState<MarketInsight[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNewsFeed = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('news_feed')
          .select('market_insights, news_items')
          .single();

        if (error) {
          console.error('Error fetching news feed:', error);
          setError(error.message);
          toast.error("Error fetching news feed", {
            description: "Failed to load the latest market insights and news. Please try again later."
          });
        }

        if (data) {
          // Type cast the data fetched from Supabase
          const marketInsights = (data.market_insights || []) as unknown as MarketInsight[];
          const newsItems = (data.news_items || []) as unknown as NewsItem[];

          setMarketInsights(marketInsights);
          setNewsItems(newsItems);
        }
      } catch (err) {
        console.error('Unexpected error fetching news feed:', err);
        setError('An unexpected error occurred.');
        toast.error("Unexpected error", {
          description: "An unexpected error occurred while loading the news feed. Please try again."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchNewsFeed();
  }, []);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown Date';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 animate-fade-in">
      <h1 className="text-3xl font-bold mb-6">Market Insights & News</h1>

      {isLoading && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="h-6 w-64" /></CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="h-6 w-64" /></CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <div className="text-red-500 mb-4">Error: {error}</div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <Sparkle className="h-5 w-5 text-amber-500" />
              Latest Market Insights
            </h2>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {marketInsights.map((insight) => (
                  <Card key={insight.id} className="bg-secondary/30">
                    <CardHeader>
                      <CardTitle>{insight.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p className="line-clamp-3 mb-2">{insight.content}</p>
                      <a
                        href={insight.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        Read more
                      </a>
                    </CardContent>
                  </Card>
                ))}
                {marketInsights.length === 0 && (
                  <div className="text-muted-foreground">No market insights available.</div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <BookText className="h-5 w-5 text-[#1EAEDB]" />
              Industry News
            </h2>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {newsItems.map((item) => (
                  <Card key={item.id} className="bg-secondary/30">
                    <CardHeader>
                      <CardTitle>{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p className="text-muted-foreground">
                        Source: {item.source} - {formatDate(item.published_date)}
                      </p>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        Read full article
                      </a>
                    </CardContent>
                  </Card>
                ))}
                {newsItems.length === 0 && (
                  <div className="text-muted-foreground">No news items available.</div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsFeed;
