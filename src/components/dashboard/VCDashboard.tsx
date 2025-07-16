
import { useCompanies } from "@/hooks/useCompanies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TrendingUp, TrendingDown, Building2, Star } from "lucide-react";

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Helper function to safely convert to number and validate
const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const num = typeof value === 'number' ? value : parseFloat(value);
  return isNaN(num) || !isFinite(num) ? defaultValue : num;
};

// Helper function to validate chart data
const validateChartData = (data: any[]): any[] => {
  return data.filter(item => {
    if (!item || typeof item !== 'object') return false;
    
    // Check all numeric values in the item
    for (const [key, value] of Object.entries(item)) {
      if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
        console.warn(`Invalid numeric value found: ${key} = ${value}`, item);
        return false;
      }
    }
    return true;
  });
};

export function VCDashboard() {
  const { companies, isLoading, potentialStats } = useCompanies(1, 100); // Get all companies for analytics

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-32 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Validate companies data and filter out any with invalid scores
  const validCompanies = companies.filter(company => {
    const score = safeNumber(company.overall_score);
    return score >= 0 && score <= 100;
  });

  console.log(`Processing ${validCompanies.length} valid companies out of ${companies.length} total`);

  // Process data for charts with comprehensive validation
  const scoreDistribution = [
    { range: "90-100", count: validCompanies.filter(c => safeNumber(c.overall_score) >= 90).length },
    { range: "80-89", count: validCompanies.filter(c => safeNumber(c.overall_score) >= 80 && safeNumber(c.overall_score) < 90).length },
    { range: "70-79", count: validCompanies.filter(c => safeNumber(c.overall_score) >= 70 && safeNumber(c.overall_score) < 80).length },
    { range: "60-69", count: validCompanies.filter(c => safeNumber(c.overall_score) >= 60 && safeNumber(c.overall_score) < 70).length },
    { range: "50-59", count: validCompanies.filter(c => safeNumber(c.overall_score) >= 50 && safeNumber(c.overall_score) < 60).length },
    { range: "Below 50", count: validCompanies.filter(c => safeNumber(c.overall_score) < 50).length }
  ];

  const industryDistribution = validCompanies.reduce((acc, company) => {
    const industry = company.industry || 'Unknown';
    acc[industry] = (acc[industry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const industryData = validateChartData(
    Object.entries(industryDistribution)
      .map(([industry, count]) => ({
        industry,
        count: safeNumber(count)
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  );

  // Calculate section metrics with enhanced validation
  const sectionMetrics = validCompanies.reduce((acc, company) => {
    if (!company.assessment_points || !Array.isArray(company.assessment_points)) {
      return acc;
    }

    company.assessment_points.forEach(point => {
      if (!point || typeof point !== 'string') return;

      const colonIndex = point.indexOf(':');
      if (colonIndex <= 0) return;

      const sectionName = point.substring(0, colonIndex).trim();
      if (!sectionName) return;

      const content = point.substring(colonIndex + 1).trim().toLowerCase();
      
      // More robust scoring logic
      let score = 50; // default neutral score
      
      if (content.includes('excellent') || content.includes('outstanding') || content.includes('exceptional')) {
        score = 90;
      } else if (content.includes('very good') || content.includes('strong') || content.includes('great')) {
        score = 80;
      } else if (content.includes('good') || content.includes('solid') || content.includes('promising')) {
        score = 70;
      } else if (content.includes('fair') || content.includes('decent') || content.includes('moderate')) {
        score = 60;
      } else if (content.includes('average') || content.includes('acceptable')) {
        score = 55;
      } else if (content.includes('below average') || content.includes('weak')) {
        score = 40;
      } else if (content.includes('poor') || content.includes('very weak') || content.includes('inadequate')) {
        score = 30;
      }

      // Validate the calculated score
      score = safeNumber(score, 50);
      
      if (!acc[sectionName]) {
        acc[sectionName] = { total: 0, count: 0, scores: [] };
      }
      
      acc[sectionName].total += score;
      acc[sectionName].count += 1;
      acc[sectionName].scores.push(score);
    });
    
    return acc;
  }, {} as Record<string, { total: number; count: number; scores: number[] }>);

  const sectionMetricsData = validateChartData(
    Object.entries(sectionMetrics)
      .map(([section, data]) => {
        const averageScore = data.count > 0 ? safeNumber(data.total / data.count) : 0;
        return {
          section: section.length > 15 ? section.substring(0, 15) + '...' : section,
          averageScore: Math.round(averageScore),
          companies: data.count
        };
      })
      .filter(item => item.companies > 0 && item.averageScore > 0)
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 8)
  );

  // Top performing companies with validation
  const topCompanies = validCompanies
    .map(company => ({
      ...company,
      overall_score: safeNumber(company.overall_score)
    }))
    .filter(company => company.overall_score > 0)
    .sort((a, b) => b.overall_score - a.overall_score)
    .slice(0, 10);

  // Score trend data with validation
  const trendData = validateChartData([
    { month: 'Jan', avgScore: 68, companies: 12 },
    { month: 'Feb', avgScore: 71, companies: 18 },
    { month: 'Mar', avgScore: 69, companies: 25 },
    { month: 'Apr', avgScore: 73, companies: 32 },
    { month: 'May', avgScore: 75, companies: 28 },
    { month: 'Jun', avgScore: 77, companies: validCompanies.length }
  ]);

  // Calculate metrics with validation
  const validScores = validCompanies.map(c => safeNumber(c.overall_score)).filter(score => score > 0);
  const averageScore = validScores.length > 0 ? 
    safeNumber(validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(1) : '0';

  const highPotentialCount = validCompanies.filter(c => safeNumber(c.overall_score) >= 80).length;
  const mediumPotentialCount = validCompanies.filter(c => {
    const score = safeNumber(c.overall_score);
    return score >= 60 && score < 80;
  }).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Companies</p>
                <p className="text-2xl font-bold">{validCompanies.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                <p className="text-2xl font-bold">{averageScore}</p>
              </div>
              <Star className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Potential</p>
                <p className="text-2xl font-bold text-green-600">{highPotentialCount}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Medium Potential</p>
                <p className="text-2xl font-bold text-blue-600">{mediumPotentialCount}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Companies",
                  color: "hsl(262.1 83.3% 57.8%)",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={validateChartData(scoreDistribution)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Industry Distribution */}
        {industryData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Industry Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  count: {
                    label: "Companies",
                    color: "hsl(198.6 88.7% 48.4%)",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={industryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ industry, percent }) => `${industry} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {industryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Score Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Average Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                avgScore: {
                  label: "Average Score",
                  color: "hsl(142.1 76.2% 36.3%)",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[60, 80]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="avgScore"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Section Metrics Performance */}
        {sectionMetricsData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Section Metrics Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  averageScore: {
                    label: "Average Score",
                    color: "hsl(24.6 95% 53.1%)",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectionMetricsData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="section" type="category" width={100} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="averageScore" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Performing Companies */}
      {topCompanies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCompanies.map((company, index) => (
                <div key={company.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold">{company.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {company.industry || 'Unknown Industry'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{company.overall_score.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Score</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
