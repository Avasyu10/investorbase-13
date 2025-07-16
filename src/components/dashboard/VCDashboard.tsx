import { useCompanies } from "@/hooks/useCompanies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, RadialBarChart, RadialBar, AreaChart, Area, Legend, PieChart, Pie, Cell } from "recharts";
import { ChartTooltip } from "@/components/ui/chart"; // Removed ChartTooltipContent as it's not used
import { TrendingUp, TrendingDown, Building2, Star } from "lucide-react";

// Define proper color values using CSS variables
const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500 (kept for other potential uses, but not directly used for the violet replacement)
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
];

// Replaced PURPLE_SHADES with BLUE_SHADES for consistency with the existing blue in the Meeting Categories
const BLUE_SHADES = [
  '#3b82f6', // blue-500
  '#2563eb', // blue-600
  '#1d4ed8', // blue-700
  '#1e40af', // blue-800
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

  // Mock data for the new metrics
  const uniqueOutreaches = companies.length;
  const followUps = 15; // Mock data
  const replies = 8; // Mock data
  const meetings = 1; // Mock data

  // Mock data for channel distribution (replacing score distribution)
  const channelData = [
    { channel: 'LinkedIn', uniqueOutreaches: 40, followUps: 8, replies: 5 },
    { channel: 'Others', uniqueOutreaches: 28, followUps: 4, replies: 2 },
    { channel: 'Calls', uniqueOutreaches: 12, followUps: 2, replies: 1 },
    { channel: 'Mail', uniqueOutreaches: 8, followUps: 1, replies: 0 }
  ];

  // Mock data for meeting categories (replacing section metrics)
  const meetingCategoriesData = [
    { name: 'Product Demos', value: 85, fill: '#1e40af' },
    { name: 'Discovery Calls', value: 15, fill: '#3b82f6' }
  ];

  // Process data for charts
  const industryDistribution = companies.reduce((acc, company) => {
    const industry = company.industry || 'Unknown';
    acc[industry] = (acc[industry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const industryData = Object.entries(industryDistribution)
    .map(([industry, count], index) => ({
      industry,
      count,
      fill: CHART_COLORS[index % CHART_COLORS.length]
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // Top 8 industries

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
      {/* Key Metrics Cards - New Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Changed violet gradients to blue gradients */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6 text-center">
            <div>
              <p className="text-sm font-medium opacity-90">Unique Outreaches</p>
              <p className="text-4xl font-bold mt-2">{uniqueOutreaches}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-400 to-blue-500 text-white">
          <CardContent className="p-6 text-center">
            <div>
              <p className="text-sm font-medium opacity-90">Follow Ups</p>
              <p className="text-4xl font-bold mt-2">{followUps}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-300 to-blue-400 text-white">
          <CardContent className="p-6 text-center">
            <div>
              <p className="text-sm font-medium opacity-90">Replies</p>
              <p className="text-4xl font-bold mt-2">{replies}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800">
          <CardContent className="p-6 text-center">
            <div>
              <p className="text-sm font-medium opacity-90">Meetings</p>
              <p className="text-4xl font-bold mt-2">{meetings}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Unique Outreaches, Follow ups and Replies by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={channelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="channel" />
                <YAxis />
                <ChartTooltip />
                {/* Changed fill colors to BLUE_SHADES */}
                <Bar dataKey="uniqueOutreaches" fill={BLUE_SHADES[0]} name="Unique Outreaches" />
                <Bar dataKey="followUps" fill={BLUE_SHADES[1]} name="Follow Ups" />
                <Bar dataKey="replies" fill={BLUE_SHADES[2]} name="Replies" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Meeting Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Meeting Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={meetingCategoriesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {meetingCategoriesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip formatter={(value, name) => [`${value}%`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Industry Distribution - RadialBar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Industry Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="80%" data={industryData}>
                {/* Changed fill color to a shade of blue for consistency */}
                <RadialBar dataKey="count" cornerRadius={10} fill={BLUE_SHADES[0]} />
                <Legend
                  iconSize={10}
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  formatter={(value, entry) => {
                    const item = entry.payload;
                    return item ? `${item.industry}: ${item.count}` : `${value}`;
                  }}
                />
                <ChartTooltip
                  formatter={(value, name, props) => [`${value} companies`, props.payload.industry]}
                />
              </RadialBarChart>
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
                  stroke={CHART_COLORS[2]} // Keeping green/emerald for trend, as it signifies growth
                  fill={CHART_COLORS[2]}
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
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
