import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, RadialBarChart, RadialBar, AreaChart, Area, Legend, PieChart, Pie, Cell } from "recharts";
import { ChartTooltip } from "@/components/ui/chart";
// Assuming useCompanies and other imports remain the same or are provided elsewhere
// import { useCompanies } from "@/hooks/useCompanies"; // Keep this if it's a real hook

// Mocking useCompanies for demonstration purposes if it's not available
const useCompanies = (page, limit) => {
  // Mock data for companies to prevent errors if the hook is not truly provided
  const companies = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    name: `Company ${i + 1}`,
    industry: ['Tech', 'Finance', 'Healthcare', 'Retail'][i % 4],
    overall_score: Math.floor(Math.random() * 50) + 50, // Scores between 50 and 99
  }));
  return { companies, isLoading: false, potentialStats: {} };
};


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

const BLUE_SHADES = [
  '#3b82f6', // blue-500
  '#2563eb', // blue-600
  '#1d4ed8', // blue-700
  '#1e40af', // blue-800
];

export function VCDashboard() {
  const { companies, isLoading, potentialStats } = useCompanies(1, 100);

  // State to manage the selected persons for the filter (now an array)
  // Default to 'Roohi' being selected
  const [selectedPersons, setSelectedPersons] = useState(['Roohi']);

  const availablePersons = ['Roohi', 'Avasyu', 'Kanishk', 'Tanisha'];

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

  const uniqueOutreaches = companies.length;
  const followUps = 15;
  const replies = 8;
  const meetings = 1;

  // Mock data for channel distribution, now categorized by person
  const channelDataByPerson = {
    'Roohi': [
      { channel: 'LinkedIn', uniqueOutreaches: 40, followUps: 8, replies: 5 },
      { channel: 'Others', uniqueOutreaches: 28, followUps: 4, replies: 2 },
      { channel: 'Calls', uniqueOutreaches: 12, followUps: 2, replies: 1 },
      { channel: 'Mail', uniqueOutreaches: 8, followUps: 1, replies: 0 }
    ],
    'Avasyu': [
      { channel: 'LinkedIn', uniqueOutreaches: 25, followUps: 5, replies: 3 },
      { channel: 'Others', uniqueOutreaches: 35, followUps: 7, replies: 4 },
      { channel: 'Calls', uniqueOutreaches: 10, followUps: 1, replies: 0 },
      { channel: 'Mail', uniqueOutreaches: 15, followUps: 3, replies: 1 }
    ],
    'Kanishk': [
      { channel: 'LinkedIn', uniqueOutreaches: 30, followUps: 6, replies: 4 },
      { channel: 'Others', uniqueOutreaches: 20, followUps: 3, replies: 1 },
      { channel: 'Calls', uniqueOutreaches: 20, followUps: 4, replies: 2 },
      { channel: 'Mail', uniqueOutreaches: 10, followUps: 2, replies: 1 }
    ],
    'Tanisha': [
      { channel: 'LinkedIn', uniqueOutreaches: 15, followUps: 3, replies: 1 },
      { channel: 'Others', uniqueOutreaches: 18, followUps: 2, replies: 0 },
      { channel: 'Calls', uniqueOutreaches: 25, followUps: 5, replies: 3 },
      { channel: 'Mail', uniqueOutreaches: 30, followUps: 6, replies: 4 }
    ]
  };

  // Get the channel data for the *first* currently selected person
  // If no person is selected, default to Roohi's data or an empty array
  const currentChannelData = selectedPersons.length > 0
    ? channelDataByPerson[selectedPersons[0]] || []
    : [];


  const meetingCategoriesData = [
    { name: 'Product Demos', value: 85, fill: '#1e40af' },
    { name: 'Discovery Calls', value: 15, fill: '#3b82f6' }
  ];

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
    .slice(0, 8);

  const topCompanies = [...companies]
    .sort((a, b) => b.overall_score - a.overall_score)
    .slice(0, 10);

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

  // Handler for checkbox changes
  const handleCheckboxChange = (personName) => {
    setSelectedPersons((prevSelected) => {
      if (prevSelected.includes(personName)) {
        // If already selected, remove it
        return prevSelected.filter((name) => name !== personName);
      } else {
        // If not selected, add it (and ensure only one is selected if you want single-select behavior)
        // For multi-select: return [...prevSelected, personName];
        // For single-select with checkboxes:
        return [personName]; // Only the newly selected one
      }
    });
  };


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Key Metrics Cards - New Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        {/* Channel Distribution with Checkbox Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Unique Outreaches, Follow ups and Replies by Channel</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4"> {/* Use flex for layout */}
            {/* POC Checkbox Filter */}
            <div className="flex-shrink-0 w-full md:w-1/4"> {/* Adjust width as needed */}
              <h3 className="text-lg font-semibold mb-2">POC</h3> {/* New heading */}
              <div className="space-y-2">
                {availablePersons.map((personName) => (
                  <div key={personName} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`checkbox-${personName}`}
                      checked={selectedPersons.includes(personName)}
                      onChange={() => handleCheckboxChange(personName)}
                      className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-blue-600 dark:focus:ring-blue-600"
                    />
                    <label htmlFor={`checkbox-${personName}`} className="ml-2 text-sm text-gray-900 dark:text-gray-200 cursor-pointer">
                      {personName}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            {/* Chart */}
            <div className="flex-grow">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={currentChannelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="channel" />
                  <YAxis />
                  <ChartTooltip />
                  <Bar dataKey="uniqueOutreaches" fill={BLUE_SHADES[0]} name="Unique Outreaches" />
                  <Bar dataKey="followUps" fill={BLUE_SHADES[1]} name="Follow Ups" />
                  <Bar dataKey="replies" fill={BLUE_SHADES[2]} name="Replies" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
                  stroke={CHART_COLORS[2]}
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
