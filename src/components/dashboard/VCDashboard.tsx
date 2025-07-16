
import { useCompanies } from "@/hooks/useCompanies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TrendingUp, TrendingDown, Building2, Star } from "lucide-react";

// Define proper color values using CSS variables
const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
];

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

  // Process data for charts
  const scoreDistribution = [
    { range: "90-100", count: companies.filter(c => c.overall_score >= 90).length },
    { range: "80-89", count: companies.filter(c => c.overall_score >= 80 && c.overall_score < 90).length },
    { range: "70-79", count: companies.filter(c => c.overall_score >= 70 && c.overall_score < 80).length },
    { range: "60-69", count: companies.filter(c => c.overall_score >= 60 && c.overall_score < 70).length },
    { range: "50-59", count: companies.filter(c => c.overall_score >= 50 && c.overall_score < 60).length },
    { range: "Below 50", count: companies.filter(c => c.overall_score < 50).length }
  ];

  const industryDistribution = companies.reduce((acc, company) => {
    const industry = company.industry || 'Unknown';
    acc[industry] = (acc[industry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const industryData = Object.entries(industryDistribution)
    .map(([industry, count]) => ({
      industry,
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // Top 8 industries

  // Process section metrics data from assessment points
  const sectionMetrics = companies.reduce((acc, company) => {
    if (company.assessment_points && Array.isArray(company.assessment_points)) {
      company.assessment_points.forEach((point: string) => {
        // Extract section name from assessment point (assuming format like "Business Model: 8.5/10")
        const match = point.match(/^([^:]+):\s*(\d+(?:\.\d+)?)/);
        if (match) {
          const sectionName = match[1].trim();
          const score = parseFloat(match[2]);
          
          if (!isNaN(score)) {
            if (!acc[sectionName]) {
              acc[sectionName] = { total: 0, count: 0 };
            }
            acc[sectionName].total += score;
            acc[sectionName].count += 1;
          }
        }
      });
    }
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  const sectionData = Object.entries(sectionMetrics)
    .map(([section, data]) => ({
      section: section.length > 15 ? section.substring(0, 15) + '...' : section,
      avgScore: Math.round((data.total / data.count) * 10) / 10 // Round to 1 decimal
    }))
    .filter(item => !isNaN(item.avgScore) && isFinite(item.avgScore))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 8); // Top 8 sections

  // Top performing companies
  const topCompanies = [...companies]
    .sort((a, b) => b.overall_score - a.overall_score)
    .slice(0, 10);

  // Score trend data (simulated monthly data)
  const trendData = [
    { month: 'Jan', avgScore: 68, companies: 12 },
    { month: 'Feb', avgScore: 71, companies: 18 },
    { month: 'Mar', avgScore: 69, companies: 25 },
    { month: 'Apr', avgScore: 73, companies: 32 },
    { month: 'May', avgScore: 75, companies: 28 },
    { month: 'Jun', avgScore: 77, companies: companies.length }
  ];

  const averageScore = companies.length > 0 ? 
    (companies.reduce((sum, c) => sum + c.overall_score, 0) / companies.length).toFixed(1) : 0;

  const highPotentialCount = companies.filter(c => c.overall_score >= 80).length;
  const mediumPotentialCount = companies.filter(c => c.overall_score >= 60 && c.overall_score < 80).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Companies</p>
                <p className="text-2xl font-bold">{companies.length}</p>
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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <ChartTooltip />
                <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Industry Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Industry Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Score Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Average Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[60, 80]} />
                <ChartTooltip />
                <Area
                  type="monotone"
                  dataKey="avgScore"
                  stroke={CHART_COLORS[2]}
                  fill={CHART_COLORS[2]}
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Section Metrics Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Section Metrics Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {sectionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sectionData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 10]} />
                  <YAxis dataKey="section" type="category" width={100} />
                  <ChartTooltip />
                  <Bar dataKey="avgScore" fill={CHART_COLORS[3]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>No section metrics data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Companies */}
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
                  <div className="text-2xl font-bold text-primary">{company.overall_score}</div>
                  <div className="text-sm text-muted-foreground">Score</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
