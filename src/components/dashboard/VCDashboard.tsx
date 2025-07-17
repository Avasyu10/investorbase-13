import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Cell } from "recharts";
import { ChartTooltip } from "@/components/ui/chart";
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

// New shades of blue for the funnel chart to create a gradient effect, more distinct
const FUNNEL_SHADES_OF_BLUE = [
  '#1E3A8A', // Darkest blue (Prospects)
  '#2563EB', // Medium-dark blue (Accepted)
  '#60A5FA', // Lighter blue (Rejected)
];

export function VCDashboard() {
  const { companies, isLoading, potentialStats } = useCompanies(1, 100);

  // Filter States - now single selection for dropdowns
  const [selectedPerson, setSelectedPerson] = useState('Roohi'); // Default to Roohi for dropdown
  const [selectedIndustry, setSelectedIndustry] = useState('Tech'); // Default to Tech for dropdown

  // Mock Date States (for future implementation, not currently used in data filtering)
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-12-31');

  const availablePersons = ['Roohi', 'Avasyu', 'Kanishk', 'Tanisha'];
  const availableIndustries = ['Tech', 'Finance', 'Healthcare', 'Retail'];

  // More granular mock data linking persons, channels, industries, and statuses
  const allProspectData = useMemo(() => {
    const data = [];
    // Updated statuses for the funnel chart
    const statuses = ['Prospects', 'Accepted', 'Rejected'];
    const channels = ['LinkedIn', 'Others', 'Calls', 'Mail'];
    const industries = ['Tech', 'Finance', 'Healthcare', 'Retail'];

    // Generate a reasonable number of entries for diverse filtering results
    for (let i = 0; i < 2000; i++) { // Increased for better data density and variety
      const person = availablePersons[Math.floor(Math.random() * availablePersons.length)];
      const channel = channels[Math.floor(Math.random() * channels.length)];
      const industry = industries[Math.floor(Math.random() * industries.length)];
      
      // Assign statuses to create a funnel effect in data
      let status;
      const rand = Math.random();
      if (rand < 0.6) { // 60% are prospects
        status = 'Prospects';
      } else if (rand < 0.85) { // 25% are accepted (60% + 25% = 85%)
        status = 'Accepted';
      } else { // 15% are rejected
        status = 'Rejected';
      }

      data.push({
        person,
        channel,
        industry,
        uniqueOutreaches: Math.floor(Math.random() * 15) + 3, // 3-17
        followUps: Math.floor(Math.random() * 8) + 1, // 1-8
        replies: Math.floor(Math.random() * 4) + 1, // 1-4
        meetings: Math.floor(Math.random() * 2) + 1, // 1-2
        status // This status will be used for the funnel chart
      });
    }
    return data;
  }, []);


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

  // Data for the Funnel Chart (Prospect Status) - Dynamically calculated and scaled
  const funnelChartData = useMemo(() => {
    const statusCounts = filteredData.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1; // Count occurrences of each status
      return acc;
    }, {});

    const orderedStages = ['Prospects', 'Accepted', 'Rejected'];
    
    // Calculate raw counts
    let rawData = orderedStages.map(stage => ({
      name: stage,
      value: statusCounts[stage] || 0
    }));

    // Find the maximum raw value for scaling
    const maxRawValue = rawData.length > 0 ? Math.max(...rawData.map(d => d.value)) : 1;
    
    // Desired max value for the chart (e.g., 250)
    const desiredMaxValue = 250;
    const scaleFactor = maxRawValue > 0 ? desiredMaxValue / maxRawValue : 0;

    // Scale values and ensure they are decreasing for funnel effect
    let scaledData = rawData.map(item => ({
      name: item.name,
      value: Math.round(item.value * scaleFactor) // Scale the value
    }));

    // Enforce decreasing values for a visual funnel
    for (let i = 1; i < scaledData.length; i++) {
      if (scaledData[i].value > scaledData[i-1].value) {
        scaledData[i].value = Math.max(0, scaledData[i-1].value - (Math.floor(Math.random() * 10) + 5)); // Ensure decrease
      }
      // Add a small random decrement to ensure distinctness if values are very close
      if (scaledData[i].value === scaledData[i-1].value && scaledData[i].value > 0) {
        scaledData[i].value = Math.max(0, scaledData[i].value - (Math.floor(Math.random() * 5) + 1));
      }
    }

    // Ensure the first value is within the 200-250 range if it's too low after scaling
    if (scaledData.length > 0 && scaledData[0].value < 200) {
      scaledData[0].value = 200 + Math.floor(Math.random() * 50);
    }
    
    return scaledData.filter(item => item.value >= 0); // Keep all stages, even if value is 0
  }, [filteredData]);

  // Custom label component for the funnel chart bars
  const CustomFunnelLabel = ({ x, y, width, height, value }) => {
    if (value === 0) return null; // Don't render label for zero values
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

  // Define the margin for the BarChart
  const barChartMargin = { top: 20, right: 30, left: 20, bottom: 5 };

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
                {({ width: containerWidth }) => {
                  // Calculate max value for scaling the bars
                  const maxFunnelValue = funnelChartData.length > 0 ? Math.max(...funnelChartData.map(d => d.value)) : 1;
                  // Define a base width for the top of the funnel relative to container width
                  const baseFunnelWidth = containerWidth * 0.7; // 70% of container width

                  return (
                    <BarChart
                      data={funnelChartData}
                      layout="vertical"
                      margin={barChartMargin}
                      barCategoryGap={0}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" stroke="#cbd5e0" style={{ fontSize: '10px' }} axisLine={false} tickLine={false} />
                      <ChartTooltip
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4a5568', color: '#ffffff' }}
                        labelStyle={{ color: '#ffffff' }}
                        formatter={(value, name) => [`${value} prospects`, name]}
                      />
                      <Bar
                        dataKey="value"
                        name="Number of Prospects"
                        shape={(props) => (
                          <FunnelBarShape
                            {...props}
                            chartWidth={containerWidth}
                            chartMargin={barChartMargin}
                            maxFunnelValue={maxFunnelValue}
                            baseFunnelWidth={baseFunnelWidth}
                          />
                        )}
                        label={<CustomFunnelLabel />}
                      >
                        {funnelChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={FUNNEL_SHADES_OF_BLUE[index % FUNNEL_SHADES_OF_BLUE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  );
                }}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Custom shape for funnel bars to create the tapered effect
const FunnelBarShape = (props) => {
  const { x, y, height, fill, index, data, chartWidth, chartMargin, maxFunnelValue, baseFunnelWidth } = props;

  // Calculate the actual plotting width within the ResponsiveContainer
  const chartPlottingWidth = chartWidth - (chartMargin.left || 0) - (chartMargin.right || 0);

  const currentSegmentValue = data[index].value;
  const nextSegmentValue = data[index + 1] ? data[index + 1].value : 0;

  // Calculate the width of the top and bottom edges of the current trapezoid segment
  // These widths are proportional to the values relative to the maximum value.
  // We use baseFunnelWidth to control the overall size of the funnel.
  const topEdgeWidth = (currentSegmentValue / maxFunnelValue) * baseFunnelWidth;
  const bottomEdgeWidth = (nextSegmentValue / maxFunnelValue) * baseFunnelWidth;

  // Ensure a minimum width for the smallest segment to prevent it from disappearing
  const minSegmentWidth = 10; // Minimum width in pixels for the smallest bar
  const adjustedTopEdgeWidth = Math.max(minSegmentWidth, topEdgeWidth);
  const adjustedBottomEdgeWidth = Math.max(minSegmentWidth, bottomEdgeWidth);


  // Calculate x-coordinates to center the trapezoid within the plotting area
  // The 'x' prop passed to FunnelBarShape is the left-most point of the bar if it were a rectangle
  // We need to adjust it to center our custom trapezoid.
  const xTopLeft = x + (props.width - adjustedTopEdgeWidth) / 2; // Use props.width for the full bar width
  const xTopRight = x + (props.width + adjustedTopEdgeWidth) / 2;
  const xBottomLeft = x + (props.width - adjustedBottomEdgeWidth) / 2;
  const xBottomRight = x + (props.width + adjustedBottomEdgeWidth) / 2;

  // Points for the trapezoid: (top-left, top-right, bottom-right, bottom-left)
  return (
    <path
      d={`M${xTopLeft} ${y}
          L${xTopRight} ${y}
          L${xBottomRight} ${y + height}
          L${xBottomLeft} ${y + height} Z`}
      fill={fill}
    />
  );
};
