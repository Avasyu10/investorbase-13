import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Cell, Treemap, Tooltip } from "recharts";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

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

// Treemap colors - different shades of blue, with better distinction and visibility for text
const TREEMAP_COLORS = [
  '#1a237e', // Darker blue for Total
  '#3f51b5', // Medium blue for Accepted (slightly darker than previous #42a5f5)
  '#283593', // Slightly darker blue for Rejected (was #2196f3) - more distinct from In Review
  '#64b5f6', // Lighter blue for In Review (was #90caf9) - still light but with better contrast
];

// Custom content for treemap
const CustomizedContent = (props) => {
  const { root, depth, x, y, width, height, index, payload, colors, rank, name } = props;

  // Determine the fill color based on the payload's fill property
  // This ensures the color from treemapChartData is used directly
  const fillColor = payload?.fill || (depth < 2 ? colors[Math.floor((index / root.children.length) * colors.length)] : 'none');

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: fillColor, // Use the determined fill color
          stroke: '#fff',
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
        }}
      />
      {depth === 1 ? (
        // Adjusted font size and vertical position for name, removed bold, and changed fill to black
        <text x={x + width / 2} y={y + height / 2 + 5} textAnchor="middle" fill="#000" fontSize={12} fontWeight="normal">
          {name}
        </text>
      ) : null}
      {depth === 1 ? (
        // Adjusted font size, ensured normal font weight, adjusted vertical position for value, and changed fill to black
        <text x={x + width / 2} y={y + height / 2 - 10} textAnchor="middle" fill="#000" fontSize={14} fontWeight="normal">
          {payload?.value}
        </text>
      ) : null}
    </g>
  );
};

export function VCDashboard() {
  const { companies, isLoading, potentialStats } = useCompanies(1, 100);

  // Filter States
  const [selectedPerson, setSelectedPerson] = useState('Roohi');
  const [selectedIndustry, setSelectedIndustry] = useState('Tech');
  const [selectedStage, setSelectedStage] = useState('Early'); // New state for Stage filter
  const [dateRangeIndex, setDateRangeIndex] = useState(3); // Default to 'Last Year' (index 3)

  const availablePersons = ['Roohi', 'Avasyu', 'Kanishk', 'Tanisha'];
  const availableIndustries = ['Tech', 'Finance', 'Healthcare', 'Retail'];
  const availableStages = ['Early', 'Growth', 'Mature', 'Seed']; // New stages

  // Mock date ranges for the slider
  const dateRanges = useMemo(() => [
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'Last 90 Days', days: 90 },
    { label: 'Last Year', days: 365 },
  ], []);

  // More granular mock data linking persons, channels, industries, statuses, and stages
  const allProspectData = useMemo(() => {
    const data = [];
    const channels = ['LinkedIn', 'Others', 'Calls', 'Mail'];
    const industries = ['Tech', 'Finance', 'Healthcare', 'Retail'];
    const statuses = ['Total', 'Accepted', 'Rejected', 'In Review'];
    const stages = ['Early', 'Growth', 'Mature', 'Seed']; // Use the new stages

    // Generate a reasonable number of entries for diverse filtering results
    for (let i = 0; i < 1500; i++) {
      const person = availablePersons[Math.floor(Math.random() * availablePersons.length)];
      const channel = channels[Math.floor(Math.random() * channels.length)];
      const industry = industries[Math.floor(Math.random() * industries.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const stage = stages[Math.floor(Math.random() * stages.length)]; // Assign a random stage

      // Generate a random date within the last year for mock purposes
      const randomDate = new Date();
      randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 365));

      data.push({
        person,
        channel,
        industry,
        uniqueOutreaches: Math.floor(Math.random() * 15) + 3, // 3-17
        followUps: Math.floor(Math.random() * 8) + 1, // 1-8
        replies: Math.floor(Math.random() * 4) + 1, // 1-4
        meetings: Math.floor(Math.random() * 2) + 1, // 1-2
        status, // This status will be used for the treemap chart
        stage, // New stage property
        date: randomDate, // Date for filtering
      });
    }
    return data;
  }, []);

  // Filtered data based on selected person, industry, stage, and date range
  const filteredData = useMemo(() => {
    const { days } = dateRanges[dateRangeIndex];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return allProspectData.filter(item =>
      item.person === selectedPerson &&
      item.industry === selectedIndustry &&
      item.stage === selectedStage && // Apply stage filter
      item.date >= cutoffDate // Apply date filter
    );
  }, [selectedPerson, selectedIndustry, selectedStage, dateRangeIndex, allProspectData, dateRanges]);

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

  // Dynamic treemap chart data based on filtered data
  const treemapChartData = useMemo(() => {
    const statusCounts = { Total: 0, Accepted: 0, Rejected: 0, 'In Review': 0 };
    
    filteredData.forEach(item => {
      if (statusCounts.hasOwnProperty(item.status)) {
        statusCounts[item.status] += 1;
      }
    });

    // Calculate total from all statuses (excluding "Total" to avoid double counting)
    const actualTotal = statusCounts.Accepted + statusCounts.Rejected + statusCounts['In Review'];
    statusCounts.Total = actualTotal; // Removed fallback to 100, now it's truly dynamic

    return [
      { name: 'Total', value: statusCounts.Total, fill: TREEMAP_COLORS[0] },
      { name: 'Accepted', value: statusCounts.Accepted, fill: TREEMAP_COLORS[1] },
      { name: 'Rejected', value: statusCounts.Rejected, fill: TREEMAP_COLORS[2] },
      { name: 'In Review', value: statusCounts['In Review'], fill: TREEMAP_COLORS[3] },
    ];
  }, [filteredData]);

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

        {/* Date Filter (Slider) */}
        <div>
          <h3 className="text-sm font-semibold mb-1 text-white">Date Range</h3>
          <input
            type="range"
            min="0"
            max={dateRanges.length - 1}
            value={dateRangeIndex}
            onChange={(e) => setDateRangeIndex(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="text-center text-xs text-gray-300 mt-1">
            {dateRanges[dateRangeIndex].label}
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

        {/* Stage Filter (Dropdown) - NEW */}
        <div>
          <h3 className="text-sm font-semibold mb-1 text-white">Stage</h3>
          <Select onValueChange={setSelectedStage} value={selectedStage}>
            <SelectTrigger className="w-full bg-gray-700 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-xs">
              <SelectValue placeholder="Select Stage" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 text-white border-gray-600">
              {availableStages.map((stageName) => (
                <SelectItem key={stageName} value={stageName} className="text-xs">
                  {stageName}
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
                  <Tooltip // Using Recharts' Tooltip directly
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

          {/* Prospect Status Treemap Chart - Dynamic data that changes with filters */}
          <Card className="bg-gray-800 rounded-lg shadow-lg">
            <CardHeader className="pb-1">
              <CardTitle className="text-base text-white">Prospect Status Overview</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <ResponsiveContainer width="100%" height={200}>
                <Treemap
                  data={treemapChartData}
                  dataKey="value"
                  aspectRatio={4/3}
                  stroke="#fff"
                  content={<CustomizedContent colors={TREEMAP_COLORS} />}
                />
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
