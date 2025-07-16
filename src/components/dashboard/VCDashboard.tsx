import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Cell } from "recharts";
import { ChartTooltip } from "@/components/ui/chart";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"; // Import Select components

// Mocking useCompanies for demonstration purposes if it's not available
const useCompanies = (page, limit) => {
  const companies = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    name: `Company ${i + 1}`,
    industry: ['Tech', 'Finance', 'Healthcare', 'Retail'][i % 4],
    overall_score: Math.floor(Math.random() * 50) + 50, // Scores between 50 and 99
  }));
  return { companies, isLoading: false, potentialStats: {} };
};

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

const BLUE_SHADES = [
  '#3b82f6', // blue-500 (Unique Outreaches)
  '#2563eb', // blue-600 (Follow Ups)
  '#1d4ed8', // blue-700 (Replies)
  '#1e40af', // blue-800
];

// New shades of blue for the funnel chart to create a gradient effect
const FUNNEL_SHADES_OF_BLUE = [
  '#1a5276', // Darkest blue for Initial Contact
  '#21618C', // Darker blue for Under Review
  '#2874A6', // Medium blue for Accepted
  '#2E86C1', // Lighter blue for Rejected
];

export function VCDashboard() {
  const { companies, isLoading, potentialStats } = useCompanies(1, 100);

  // Filter States - now single selection for dropdowns
  const [selectedPerson, setSelectedPerson] = useState('Roohi'); // Default to Roohi
  const [selectedIndustry, setSelectedIndustry] = useState('Tech'); // Default to Tech

  // Mock Date States (for future implementation, not currently used in data filtering)
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-12-31');

  const availablePersons = ['Roohi', 'Avasyu', 'Kanishk', 'Tanisha'];
  const availableIndustries = ['Tech', 'Finance', 'Healthcare', 'Retail'];

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

  // More granular mock data linking persons, channels, industries, and statuses (original scale)
  const allProspectData = useMemo(() => [
    // Roohi's Data
    { person: 'Roohi', channel: 'LinkedIn', industry: 'Tech', uniqueOutreaches: 20, followUps: 4, replies: 2, meetings: 1, status: 'Accepted' },
    { person: 'Roohi', channel: 'LinkedIn', industry: 'Finance', uniqueOutreaches: 20, followUps: 4, replies: 3, meetings: 0, status: 'Rejected' },
    { person: 'Roohi', channel: 'Others', industry: 'Healthcare', uniqueOutreaches: 15, followUps: 2, replies: 1, meetings: 0, status: 'Under Review' },
    { person: 'Roohi', channel: 'Calls', industry: 'Retail', uniqueOutreaches: 12, followUps: 2, replies: 1, meetings: 0, status: 'Initial Contact' },
    { person: 'Roohi', channel: 'Mail', industry: 'Tech', uniqueOutreaches: 8, followUps: 1, replies: 0, meetings: 0, status: 'Initial Contact' },

    // Avasyu's Data
    { person: 'Avasyu', channel: 'LinkedIn', industry: 'Finance', uniqueOutreaches: 25, followUps: 5, replies: 3, meetings: 0, status: 'Under Review' },
    { person: 'Avasyu', channel: 'Others', industry: 'Tech', uniqueOutreaches: 35, followUps: 7, replies: 4, meetings: 1, status: 'Accepted' },
    { person: 'Avasyu', channel: 'Calls', industry: 'Healthcare', uniqueOutreaches: 10, followUps: 1, replies: 0, meetings: 0, status: 'Rejected' },
    { person: 'Avasyu', channel: 'Mail', industry: 'Retail', uniqueOutreaches: 15, followUps: 3, replies: 1, meetings: 0, status: 'Initial Contact' },

    // Kanishk's Data
    { person: 'Kanishk', channel: 'LinkedIn', industry: 'Healthcare', uniqueOutreaches: 30, followUps: 6, replies: 4, meetings: 0, status: 'Initial Contact' },
    { person: 'Kanishk', channel: 'Others', industry: 'Retail', uniqueOutreaches: 20, followUps: 3, replies: 1, meetings: 0, status: 'Rejected' },
    { person: 'Kanishk', channel: 'Calls', industry: 'Tech', uniqueOutreaches: 20, followUps: 4, replies: 2, meetings: 1, status: 'Accepted' },
    { person: 'Kanishk', channel: 'Mail', industry: 'Finance', uniqueOutreaches: 10, followUps: 2, replies: 1, meetings: 0, status: 'Under Review' },

    // Tanisha's Data
    { person: 'Tanisha', channel: 'LinkedIn', industry: 'Retail', uniqueOutreaches: 15, followUps: 3, replies: 1, meetings: 0, status: 'Initial Contact' },
    { person: 'Tanisha', channel: 'Others', industry: 'Tech', uniqueOutreaches: 18, followUps: 2, replies: 0, meetings: 0, status: 'Rejected' },
    { person: 'Tanisha', channel: 'Calls', industry: 'Finance', uniqueOutreaches: 25, followUps: 5, replies: 3, meetings: 0, status: 'Under Review' },
    { person: 'Tanisha', channel: 'Mail', industry: 'Healthcare', uniqueOutreaches: 30, followUps: 6, replies: 4, meetings: 1, status: 'Accepted' }
  ], []);


  // Filtered data based on selected person and industry
  const filteredData = useMemo(() => {
    return allProspectData.filter(item =>
      item.person === selectedPerson &&
      item.industry === selectedIndustry
    );
  }, [selectedPerson, selectedIndustry, allProspectData]);

  // Data for the Bar Chart (still based on channels, as requested)
  const currentChannelChartData = useMemo(() => {
    const aggregatedByChannel = {};
    filteredData.forEach(item => {
      if (!aggregatedByChannel[item.channel]) {
        aggregatedByChannel[item.channel] = { channel: item.channel, uniqueOutreaches: 0, followUps: 0, replies: 0 };
      }
      aggregatedByChannel[item.channel].uniqueOutreaches += item.uniqueOutreaches;
      aggregatedByChannel[item.channel].followUps += item.followUps;
      aggregatedByChannel[item.channel].replies += item.replies;
    });
    return Object.values(aggregatedByChannel);
  }, [filteredData]);

  // Data for the Funnel Chart (Prospect Status) - Manually set values for desired scale
  const funnelChartData = useMemo(() => {
    // These values are set to ensure the X-axis of the funnel chart is in the 200-250 range
    return [
      { name: 'Initial Contact', value: 250 },
      { name: 'Under Review', value: 200 },
      { name: 'Accepted', value: 150 },
      { name: 'Rejected', value: 100 },
    ].filter(item => item.value > 0);
  }, []); // No dependencies on filteredData here, as values are fixed for demonstration

  // Custom label component for the funnel chart bars
  const CustomFunnelLabel = ({ x, y, width, height, value }) => {
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="12px"
        fontWeight="bold"
      >
        {value}
      </text>
    );
  };

  // Calculate dynamic metrics based on filteredData
  const filteredMetrics = useMemo(() => {
    const totalUniqueOutreaches = filteredData.reduce((sum, item) => sum + item.uniqueOutreaches, 0);
    const totalFollowUps = filteredData.reduce((sum, item) => sum + item.followUps, 0);
    const totalReplies = filteredData.reduce((sum, item) => sum + item.replies, 0);
    const totalMeetings = filteredData.reduce((sum, item) => sum + item.meetings, 0);

    return {
      uniqueOutreaches: totalUniqueOutreaches,
      followUps: totalFollowUps,
      replies: totalReplies,
      meetings: totalMeetings,
    };
  }, [filteredData]);


  return (
    <div className="flex flex-col lg:flex-row space-y-3 lg:space-y-0 lg:space-x-3 p-3 bg-gray-900 text-white font-inter">
      {/* Left Sidebar for Filters */}
      <Card className="lg:w-1/4 p-3 space-y-3 flex-shrink-0 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-base font-bold text-white mb-3">Filters</h2>

        {/* Date Filter */}
        <div>
          <h3 className="text-sm font-semibold mb-1 text-white">Date</h3>
          <div className="space-y-1">
            <div>
              <label htmlFor="startDate" className="block text-xs font-medium text-gray-300 mb-1">From:</label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-1.5 border rounded-md bg-gray-700 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-xs"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-xs font-medium text-gray-300 mb-1">To:</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-1.5 border rounded-md bg-gray-700 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-xs"
              />
            </div>
          </div>
        </div>

        {/* POC Name Filter (Dropdown) */}
        <div>
          <h3 className="text-sm font-semibold mb-1 text-white">POC</h3>
          <Select onValueChange={setSelectedPerson} value={selectedPerson}>
            <SelectTrigger className="w-full bg-gray-700 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-xs">
              <SelectValue placeholder="Select POC" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 text-white border-gray-600">
              {availablePersons.map((personName) => (
                <SelectItem key={personName} value={personName} className="text-xs">
                  {personName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Industry Filter (Dropdown) */}
        <div>
          <h3 className="text-sm font-semibold mb-1 text-white">Industry</h3>
          <Select onValueChange={setSelectedIndustry} value={selectedIndustry}>
            <SelectTrigger className="w-full bg-gray-700 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-xs">
              <SelectValue placeholder="Select Industry" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 text-white border-gray-600">
              {availableIndustries.map((industryName) => (
                <SelectItem key={industryName} value={industryName} className="text-xs">
                  {industryName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Right Content Area: Metric Cards + Charts */}
      <div className="flex flex-col space-y-3 flex-grow">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg">
            <CardContent className="p-3 text-center">
              <div>
                <p className="text-sm font-medium opacity-90">Unique Outreaches</p>
                <p className="text-3xl font-bold mt-1">{filteredMetrics.uniqueOutreaches}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-400 to-blue-500 text-white rounded-lg shadow-lg">
            <CardContent className="p-3 text-center">
              <div>
                <p className="text-sm font-medium opacity-90">Follow Ups</p>
                <p className="text-3xl font-bold mt-1">{filteredMetrics.followUps}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-300 to-blue-400 text-white rounded-lg shadow-lg">
            <CardContent className="p-3 text-center">
              <div>
                <p className="text-sm font-medium opacity-90">Replies</p>
                <p className="text-3xl font-bold mt-1">{filteredMetrics.replies}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-200 to-blue-300 text-gray-800 rounded-lg shadow-lg">
            <CardContent className="p-3 text-center">
              <div>
                <p className="text-sm font-medium opacity-90">Meetings</p>
                <p className="text-3xl font-bold mt-1">{filteredMetrics.meetings}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-grow">
          {/* Unique Outreaches, Follow ups and Replies by Channel (Bar Chart - Channel fixed) */}
          <Card className="bg-gray-800 rounded-lg shadow-lg">
            <CardHeader className="pb-1">
              <CardTitle className="text-base text-white">Unique Outreaches, Follow ups and Replies by Channel</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={currentChannelChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                  <XAxis dataKey="channel" stroke="#cbd5e0" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#cbd5e0" style={{ fontSize: '10px' }} />
                  <ChartTooltip
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4a5568', color: '#ffffff' }}
                    labelStyle={{ color: '#ffffff' }}
                  />
                  <Bar dataKey="uniqueOutreaches" fill={BLUE_SHADES[0]} name="Unique Outreaches" stackId="a" />
                  <Bar dataKey="followUps" fill={BLUE_SHADES[1]} name="Follow Ups" stackId="a" />
                  <Bar dataKey="replies" fill={BLUE_SHADES[2]} name="Replies" stackId="a" />
                  <Legend wrapperStyle={{ fontSize: '10px', color: '#cbd5e0' }} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Prospect Funnel Chart */}
          <Card className="bg-gray-800 rounded-lg shadow-lg">
            <CardHeader className="pb-1">
              <CardTitle className="text-base text-white">Prospect Status Funnel</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={funnelChartData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  barCategoryGap="10%" // Adjust gap between categories for funnel look
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                  <XAxis type="number" stroke="#cbd5e0" style={{ fontSize: '10px' }} />
                  <YAxis type="category" dataKey="name" stroke="#cbd5e0" style={{ fontSize: '10px' }} />
                  <ChartTooltip
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4a5568', color: '#ffffff' }}
                    labelStyle={{ color: '#ffffff' }}
                    formatter={(value, name) => [`${value} prospects`, name]}
                  />
                  <Bar dataKey="value" name="Number of Prospects" label={<CustomFunnelLabel />}>
                    {funnelChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={FUNNEL_SHADES_OF_BLUE[index % FUNNEL_SHADES_OF_BLUE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
