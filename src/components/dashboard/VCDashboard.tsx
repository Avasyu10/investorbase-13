import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip, Treemap } from "recharts";

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

// Custom content for treemap, now without direct ratio display on segments
const CustomizedContent = (props) => {
  const { root, depth, x, y, width, height, index, payload, colors, name } = props;

  // Determine the fill color based on the payload's fill property
  const fillColor = payload?.fill || (depth < 2 ? colors[Math.floor((index / root.children.length) * colors.length)] : 'none');

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: fillColor,
          stroke: '#fff',
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
        }}
      />
      {depth === 1 ? (
        <>
          {/* Display Name */}
          <text x={x + width / 2} y={y + height / 2 - 5} textAnchor="middle" fill="#FFFFFF" fontSize={12} fontWeight="normal">
            {name}
          </text>
          {/* Display Value */}
          <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#FFFFFF" fontSize={14} fontWeight="normal">
            {payload?.value}
          </text>
        </>
      ) : null}
    </g>
  );
};

export function VCDashboard() {
  const { companies, isLoading, potentialStats } = useCompanies(1, 100);

  // Filter States
  const [selectedPerson, setSelectedPerson] = useState('Roohi');
  const [selectedIndustry, setSelectedIndustry] = useState('Tech');
  const [selectedStage, setSelectedStage] = useState('Early');
  const [dateRangeIndex, setDateRangeIndex] = useState(6); 

  const availablePersons = ['Roohi', 'Avasyu', 'Kanishk', 'Tanisha'];
  const availableIndustries = ['Tech', 'Finance', 'Healthcare', 'Retail'];
  const availableStages = ['Early', 'Growth', 'Mature', 'Seed'];

  // Expanded mock date ranges for the slider - 'Last 2 Years' removed
  const dateRanges = useMemo(() => [
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 14 Days', days: 14 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'Last 60 Days', days: 60 },
    { label: 'Last 90 Days', days: 90 },
    { label: 'Last 6 Months', days: 180 },
    { label: 'Last Year', days: 365 },
    { label: 'All Time', days: 365 * 10 }, // A large number for "All Time"
  ], []);

  // More granular mock data linking persons, channels, industries, statuses, and stages
  const allProspectData = useMemo(() => {
    const data = [];
    const channels = ['LinkedIn', 'Others', 'Calls', 'Mail'];
    const industries = ['Tech', 'Finance', 'Healthcare', 'Retail'];
    const statuses = ['Total', 'Accepted', 'Rejected', 'In Review'];
    const stages = ['Early', 'Growth', 'Mature', 'Seed'];

    // Increased number of mock data entries to ensure sufficient data after filtering
    for (let i = 0; i < 2000; i++) { 
      const person = availablePersons[Math.floor(Math.random() * availablePersons.length)];
      const channel = channels[Math.floor(Math.random() * channels.length)];
      const industry = industries[Math.floor(Math.random() * industries.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const stage = stages[Math.floor(Math.random() * stages.length)];

      // Generate a random date within the last 2 years for mock purposes
      const randomDate = new Date();
      randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * (365 * 2)));

      data.push({
        person,
        channel,
        industry,
        // Adjusted mock data generation to target desired ranges for filtered data
        uniqueOutreaches: Math.floor(Math.random() * 2) + 1, // Generates 1 or 2 per item
        followUps: Math.random() < 0.7 ? 1 : 0,    // ~70% chance of 1, ~30% chance of 0
        replies: Math.random() < 0.5 ? 1 : 0,      // ~50% chance of 1, ~50% chance of 0
        meetings: Math.random() < 0.4 ? 1 : 0,     // ~40% chance of 1, ~60% chance of 0
        status,
        stage,
        date: randomDate,
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
      item.stage === selectedStage &&
      item.date >= cutoffDate
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

    const actualTotal = statusCounts.Accepted + statusCounts.Rejected + statusCounts['In Review'];
    statusCounts.Total = actualTotal;

    // Prepare data for treemap including percentage for legend
    return [
      { name: 'Total', value: statusCounts.Total, fill: TREEMAP_COLORS[0] },
      { name: 'Accepted', value: statusCounts.Accepted, fill: TREEMAP_COLORS[1],
        percentage: actualTotal > 0 ? ((statusCounts.Accepted / actualTotal) * 100).toFixed(1) : '0.0' },
      { name: 'Rejected', value: statusCounts.Rejected, fill: TREEMAP_COLORS[2],
        percentage: actualTotal > 0 ? ((statusCounts.Rejected / actualTotal) * 100).toFixed(1) : '0.0' },
      { name: 'In Review', value: statusCounts['In Review'], fill: TREEMAP_COLORS[3],
        percentage: actualTotal > 0 ? ((statusCounts['In Review'] / actualTotal) * 100).toFixed(1) : '0.0' },
    ];
  }, [filteredData]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg shadow-lg p-6 animate-pulse">
            <div className="h-32 bg-gray-700 rounded"></div>
          </div>
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

  // Helper to format dates
  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  // Calculate the current start and end dates based on the slider
  const currentEndDate = new Date();
  const currentStartDate = new Date();
  currentStartDate.setDate(currentStartDate.getDate() - dateRanges[dateRangeIndex].days);

  return (
    <div className="flex flex-col lg:flex-row space-y-3 lg:space-y-0 lg:space-x-3 p-3 bg-gray-900 text-white font-inter">
      {/* Left Sidebar for Filters */}
      <div className="lg:w-1/4 p-3 space-y-3 flex-shrink-0 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-base font-bold text-white mb-3">Filters</h2>

        {/* Date Filter (Slider) */}
        <div>
          <h3 className="text-sm font-semibold mb-1 text-white">Date Range</h3>
          <div className="flex justify-between text-xs text-gray-300 mb-1">
            <span>From: {formatDate(currentStartDate)}</span>
            <span>To: {formatDate(currentEndDate)}</span>
          </div>
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
          <div className="relative">
            <select
              onChange={(e) => setSelectedPerson(e.target.value)}
              value={selectedPerson}
              className="w-full p-1.5 border rounded-md bg-gray-700 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-xs appearance-none pr-8"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='white'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}
            >
              <option value="" disabled>Select POC</option>
              {availablePersons.map((personName) => (
                <option key={personName} value={personName}>
                  {personName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Industry Filter (Dropdown) */}
        <div>
          <h3 className="text-sm font-semibold mb-1 text-white">Industry</h3>
          <div className="relative">
            <select
              onChange={(e) => setSelectedIndustry(e.target.value)}
              value={selectedIndustry}
              className="w-full p-1.5 border rounded-md bg-gray-700 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-xs appearance-none pr-8"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='white'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}
            >
              <option value="" disabled>Select Industry</option>
              {availableIndustries.map((industryName) => (
                <option key={industryName} value={industryName}>
                  {industryName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stage Filter (Dropdown) */}
        <div>
          <h3 className="text-sm font-semibold mb-1 text-white">Stage</h3>
          <div className="relative">
            <select
              onChange={(e) => setSelectedStage(e.target.value)}
              value={selectedStage}
              className="w-full p-1.5 border rounded-md bg-gray-700 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-xs appearance-none pr-8"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='white'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}
            >
              <option value="" disabled>Select Stage</option>
              {availableStages.map((stageName) => (
                <option key={stageName} value={stageName}>
                  {stageName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Right Content Area: Metric Cards + Charts */}
      <div className="flex flex-col space-y-3 flex-grow">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-3 text-center">
            <div>
              <p className="text-sm font-medium opacity-90">Unique Outreaches</p>
              <p className="text-3xl font-bold mt-1">{filteredMetrics.uniqueOutreaches}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-400 to-blue-500 text-white rounded-lg shadow-lg p-3 text-center">
            <div>
              <p className="text-sm font-medium opacity-90">Follow Ups</p>
              <p className="text-3xl font-bold mt-1">{filteredMetrics.followUps}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-300 to-blue-400 text-white rounded-lg shadow-lg p-3 text-center">
            <div>
              <p className="text-sm font-medium opacity-90">Replies</p>
              <p className="text-3xl font-bold mt-1">{filteredMetrics.replies}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-200 to-blue-300 text-gray-800 rounded-lg shadow-lg p-3 text-center">
            <div>
              <p className="text-sm font-medium opacity-90">Meetings</p>
              <p className="text-3xl font-bold mt-1">{filteredMetrics.meetings}</p>
            </div>
          </div>
        </div>

        {/* Charts Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-grow">
          {/* Unique Outreaches, Follow ups and Replies by Channel (Bar Chart - Channel fixed) */}
          <div className="bg-gray-800 rounded-lg shadow-lg">
            <div className="p-4 pb-1"> {/* Adjusted padding for card header */}
              <h2 className="text-base text-white font-semibold">Unique Outreaches, Follow ups and Replies by Channel</h2>
            </div>
            <div className="p-4 pt-1"> {/* Adjusted padding for card content */}
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={currentChannelChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                  <XAxis dataKey="channel" stroke="#cbd5e0" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#cbd5e0" style={{ fontSize: '10px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4a5568', color: '#ffffff' }}
                    labelStyle={{ color: '#ffffff' }}
                  />
                  <Bar dataKey="uniqueOutreaches" fill={BLUE_SHADES[0]} name="Unique Outreaches" stackId="a" />
                  <Bar dataKey="followUps" fill={BLUE_SHADES[1]} name="Follow Ups" stackId="a" />
                  <Bar dataKey="replies" fill={BLUE_SHADES[2]} name="Replies" stackId="a" />
                  <Legend wrapperStyle={{ fontSize: '10px', color: '#cbd5e0' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Prospect Status Treemap Chart - Dynamic data that changes with filters */}
          <div className="bg-gray-800 rounded-lg shadow-lg">
            <div className="p-4 pb-1 flex justify-between items-center"> {/* Adjusted padding and added flex for alignment */}
              <h2 className="text-base text-white font-semibold">Prospect Status Overview</h2>
              {/* Treemap Legend moved here */}
              <div className="flex space-x-1 text-[10px] text-white"> {/* Adjusted text size and spacing to 10px */}
                {treemapChartData.filter(d => d.name !== 'Total').map((entry) => (
                  <div key={entry.name} className="flex items-center">
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-0.5" style={{ backgroundColor: entry.fill }}></span> {/* Adjusted circle size and margin */}
                    <span>{entry.name}: {entry.value} ({entry.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 pt-1"> {/* Adjusted padding for card content */}
              <ResponsiveContainer width="100%" height={200}>
                <Treemap
                  data={treemapChartData}
                  dataKey="value"
                  aspectRatio={4/3}
                  stroke="#fff"
                  content={(props) => (
                    <CustomizedContent {...props} colors={TREEMAP_COLORS} />
                  )}
                />
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
