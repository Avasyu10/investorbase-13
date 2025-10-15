import { useEffect, useState } from "react";
import { getStartupsList } from "@/lib/supabase/startups";

export function useStartups(page: number, pageSize: number, sortBy: string, sortOrder: 'asc' | 'desc', search: string) {
  const [startups, setStartups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const refetch = async () => {
    setIsLoading(true);
    try {
      const data = await getStartupsList();
      setStartups(data || []);
      setError(null);
    } catch (err) {
      setError(err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line
  }, [page, pageSize, sortBy, sortOrder, search]);

  return { startups, isLoading, error, refetch };
}
