import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Newspaper } from 'lucide-react';

const NewsFeed = () => {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();

  useEffect(() => {
    async function fetchNews() {
      try {
        setLoading(true);
        
        // If we have a company ID, fetch news for that company
        if (id) {
          const { data, error } = await supabase
            .from('news')
            .select('*, companies(name)')
            .eq('company_id', id)
            .order('published_at', { ascending: false });
            
          if (error) throw error;
          
          setNews(data || []);
        } else {
          // Otherwise, fetch all news
          const { data, error } = await supabase
            .from('news')
            .select('*, companies(name)')
            .order('published_at', { ascending: false })
            .limit(10);
            
          if (error) throw error;
          
          setNews(data || []);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchNews();
  }, [id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center mb-6">
        <Newspaper className="mr-2 h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Latest News</h2>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="mb-4">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-2/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : news.length > 0 ? (
        <div className="space-y-4">
          {news.map((item) => (
            <Card key={item.id} className="mb-4 overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold">
                    {item.title}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(item.published_at)}
                  </span>
                </div>
                {item.companies && (
                  <p className="text-sm text-primary">
                    {item.companies.name}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{item.summary}</p>
                {item.url && (
                  <Button variant="link" className="px-0 h-auto" asChild>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      Read more
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground mb-4">No news available at this time.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NewsFeed;
