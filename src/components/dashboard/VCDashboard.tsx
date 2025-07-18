import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip, Treemap } from "recharts";
import { Slider } from "@/components/ui/slider";

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

// Enhanced blue-violet gradient colors for better visual appeal
const BLUE_VIOLET_SHADES = [
  '#7c3aed', // violet-600 (Unique Outreaches) - more vibrant
  '#8b5cf6', // violet-500 (Follow Ups) - vibrant violet
  '#6366f1', // indigo-500 (Replies) - bright indigo
  '#3b82f6', // blue-500 - bright blue
];

// Treemap colors - attractive blue-violet combinations with better contrast
const TREEMAP_COLORS = [
  '#4338ca', // Indigo-700 for Total (strong but not too dark)
  '#7c3aed', // Violet-600 for Accepted (vibrant and attractive)
  '#8b5cf6', // Violet-500 for Rejected (lighter violet)
  '#a855f7', // Purple-500 for In Review (lighter purple for contrast)
];

// Custom content for treemap with improved text positioning and visibility
const CustomizedContent = (props) => {
  const { root, depth, x, y, width, height, index, payload, colors, name } = props;
  const fillColor = payload?.fill || (depth < 2 ? colors[Math.floor((index / root.children.length) * colors.length)] : 'none');
  // Only show text if the rectangle is large enough
  const showText = width > 60 && height > 40;
  const showValue = width > 80 && height > 60;

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
      {depth === 1 && showText ? (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - (showValue ? 8 : 0)}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize={Math.min(14, width / 6, height / 8)}
            fontWeight="500"
            dominantBaseline="middle"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
          >
            {name}
          </text>
          {showValue && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 12}
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize={Math.min(16, width / 5, height / 6)}
              fontWeight="600"
              dominantBaseline="middle"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
            >
              {payload?.value}
            </text>
          )}
        </>
      ) : null}
    </g>
  );
};

export function VCDashboard() {
  const { companies, isLoading } = useCompanies(1, 100);

  // Filter States
  const [selectedPerson, setSelectedPerson] = useState('Roohi');
  const [selectedIndustry, setSelectedIndustry] = useState('Tech');
  const [selectedStage, setSelectedStage] = useState('Early');
  // Date range states for range slider - array with two values [start, end]
  const [dateRange, setDateRange] = useState([0, 6]);

  const availablePersons = ['Roohi', 'Avasyu', 'Kanishk', 'Tanisha'];
  const availableIndustries = ['Tech', 'Finance', 'Healthcare', 'Retail'];
  const availableStages = ['Early', 'Growth', 'Mature', 'Seed'];

  // Date ranges for the slider
  const dateRanges = useMemo(() => [
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 14 Days', days: 14 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'Last 60 Days', days: 60 },
    { label: 'Last 90 Days', days: 90 },
    { label: 'Last 6 Months', days: 180 },
    { label: 'Last Year', days: 365 },
    { label: 'All Time', days: 365 * 10 },
  ], []);

  // Mock data with adjusted ranges (max 400-500, then decreasing)
  const allProspectData = useMemo(() => {
    const data = [];
    const channels = ['LinkedIn', 'Others', 'Calls', 'Mail'];
    const industries = ['Tech', 'Finance', 'Healthcare', 'Retail'];
    const statuses = ['Total', 'Accepted', 'Rejected', 'In Review'];
    const stages = ['Early', 'Growth', 'Mature', 'Seed'];

    for (let i = 0; i < 1500; i++) {
      const person = availablePersons[Math.floor(Math.random() * availablePersons.length)];
      const channel = channels[Math.floor(Math.random() * channels.length)];
      const industry = industries[Math.floor(Math.random() * industries.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const stage = stages[Math.floor(Math.random() * stages.length)];
      const randomDate = new Date();
      randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * (365 * 2)));

      data.push({
        person,
        channel,
        industry,
        uniqueOutreaches: Math.floor(Math.random() * 11) + 20, // 20-30 range
        followUps: Math.floor(Math.random() * 5) + 10,       // 10-15 range
        replies: Math.floor(Math.random() * 3) + 5,          // 5-8 range
        meetings: Math.floor(Math.random() * 2) + 1,         // 1-3 range
        status,
        stage,
        date: randomDate,
      });
    }
    return data;
  }, []);

  // Filtered data based on date range
  const filteredData = useMemo(() => {
    const startDays = dateRanges[dateRange[1]].days; // End of range (larger value)
    const endDays = dateRanges[dateRange[0]].days;   // Start of range (smaller value)
    const currentDate = new Date();
    const startCutoffDate = new Date();
    const endCutoffDate = new Date();

    startCutoffDate.setDate(currentDate.getDate() - startDays);
    endCutoffDate.setDate(currentDate.getDate() - endDays);

    return allProspectData.filter(item =>
      item.person === selectedPerson &&
      item.industry === selectedIndustry &&
      item.stage === selectedStage &&
      item.date >= startCutoffDate &&
      item.date <= endCutoffDate
    );
  }, [selectedPerson, selectedIndustry, selectedStage, dateRange, allProspectData, dateRanges]);

  // Bar chart data
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

  // Treemap data
  const treemapChartData = useMemo(() => {
    const statusCounts = { Total: 0, Accepted: 0, Rejected: 0, 'In Review': 0 };
    filteredData.forEach(item => {
      if (statusCounts.hasOwnProperty(item.status)) {
        statusCounts[item.status] += 1;
      }
    });

    const actualTotal = statusCounts.Accepted + statusCounts.Rejected + statusCounts['In Review'];
    statusCounts.Total = actualTotal; // Ensure Total reflects sum of its parts

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

  // Calculate metrics
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

  // Date formatting
  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  // Calculate current date range
  const currentEndDate = new Date();
  const startRangeDate = new Date();
  const endRangeDate = new Date();
  startRangeDate.setDate(currentEndDate.getDate() - dateRanges[dateRange[1]].days);
  endRangeDate.setDate(currentEndDate.getDate() - dateRanges[dateRange[0]].days);

  return (
    <div className="flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-4 p-2 bg-gray-900 text-white font-inter h-screen overflow-hidden"> {/* Reduced padding and space-y */}
      {/* Left Sidebar for Filters */}
      <div className="lg:w-1/4 p-3 space-y-3 flex-shrink-0 bg-gray-800 rounded-lg shadow-lg"> {/* Reduced padding and space-y */}
        <h2 className="text-base font-bold text-white mb-2">Filters</h2> {/* Reduced font size and margin */}

        {/* Date Filter (Range Slider) */}
        <div>
          <h3 className="text-xs font-semibold mb-1 text-white">Date Range</h3> {/* Reduced font size and margin */}
          <div className="flex justify-between text-xs text-gray-300 mb-2"> {/* Reduced margin */}
            <span>From: {formatDate(startRangeDate)}</span>
            <span>To: {formatDate(endRangeDate)}</span>
          </div>
          <div className="px-1 py-2"> {/* Reduced padding */}
            <Slider
              value={dateRange}
              onValueChange={setDateRange}
              max={dateRanges.length - 1}
              min={0}
              step={1}
              className="w-full [&.slider-track]:bg-blue-600 [&.slider-range]:bg-violet-500 [&.slider-thumb]:bg-white [&.slider-thumb]:border-2 [&.slider-thumb]:border-violet-500 [&.slider-thumb]:shadow-lg"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1"> {/* Reduced margin */}
            <span>{dateRanges[dateRange[0]].label}</span>
            <span>{dateRanges[dateRange[1]].label}</span>
          </div>
        </div>

        {/* POC Name Filter */}
        <div>
          <h3 className="text-xs font-semibold mb-1 text-white">POC</h3> {/* Reduced font size and margin */}
          <div className="relative">
            <select
              onChange={(e) => setSelectedPerson(e.target.value)}
              value={selectedPerson}
              className="w-full p-1 border rounded-md bg-gray-700 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-xs appearance-none pr-6" {/* Reduced padding and font size */}
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='white'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.3rem center', backgroundSize: '1.2em 1.2em' }} {/* Adjusted background size and position */}
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

        {/* Industry Filter */}
        <div>
          <h3 className="text-xs font-semibold mb-1 text-white">Industry</h3> {/* Reduced font size and margin */}
          <div className="relative">
            <select
              onChange={(e) => setSelectedIndustry(e.target.value)}
              value={selectedIndustry}
              className="w-full p-1 border rounded-md bg-gray-700 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-xs appearance-none pr-6" {/* Reduced padding and font size */}
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='white'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.3rem center', backgroundSize: '1.2em 1.2em' }} {/* Adjusted background size and position */}
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

        {/* Stage Filter */}
        <div>
          <h3 className="text-xs font-semibold mb-1 text-white">Stage</h3> {/* Reduced font size and margin */}
          <div className="relative">
            <select
              onChange={(e) => setSelectedStage(e.target.value)}
              value={selectedStage}
              className="w-full p-1 border rounded-md bg-gray-700 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-xs appearance-none pr-6" {/* Reduced padding and font size */}
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='white'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.3rem center', backgroundSize: '1.2em 1.2em' }} {/* Adjusted background size and position */}
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
      <div className="flex flex-col space-y-2 flex-grow h-full"> {/* Reduced space-y */}
        {/* Key Metrics Cards - All using the same gradient color */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2"> {/* Reduced gap */}
          <div className="bg-gradient-to-br from-blue-200 to-blue-300 text-gray-800 rounded-lg shadow-lg p-3 text-center"> {/* Reduced padding */}
            <div>
              <p className="text-xs font-medium opacity-90">Unique Outreaches</p> {/* Reduced font size */}
              <p className="text-2xl font-bold mt-0.5">{filteredMetrics.uniqueOutreaches}</p> {/* Reduced font size and margin */}
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-200 to-blue-300 text-gray-800 rounded-lg shadow-lg p-3 text-center"> {/* Reduced padding */}
            <div>
              <p className="text-xs font-medium opacity-90">Follow Ups</p> {/* Reduced font size */}
              <p className="text-2xl font-bold mt-0.5">{filteredMetrics.followUps}</p> {/* Reduced font size and margin */}
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-200 to-blue-300 text-gray-800 rounded-lg shadow-lg p-3 text-center"> {/* Reduced padding */}
            <div>
              <p className="text-xs font-medium opacity-90">Replies</p> {/* Reduced font size */}
              <p className="text-2xl font-bold mt-0.5">{filteredMetrics.replies}</p> {/* Reduced font size and margin */}
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-200 to-blue-300 text-gray-800 rounded-lg shadow-lg p-3 text-center"> {/* Reduced padding */}
            <div>
              <p className="text-xs font-medium opacity-90">Meetings</p> {/* Reduced font size */}
              <p className="text-2xl font-bold mt-0.5">{filteredMetrics.meetings}</p> {/* Reduced font size and margin */}
            </div>
          </div>
        </div>

        {/* Charts Area */}
        {/* Adjusted flex-grow to distribute vertical space for charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-grow"> {/* Reduced gap */}
          {/* Bar Chart */}
          <div className="bg-gray-800 rounded-lg shadow-lg flex flex-col">
            <div className="p-3 pb-1"> {/* Reduced padding */}
              <h2 className="text-base text-white font-semibold">Unique Outreaches, Follow ups and Replies by Channel</h2> {/* Reduced font size */}
            </div>
            <div className="p-3 pt-1 flex-grow"> {/* Reduced padding */}
              {/* Set a fixed height for ResponsiveContainer to control vertical space */}
              <ResponsiveContainer width="100%" height={150}> {/* Further decreased height */}
                <BarChart data={currentChannelChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                  <XAxis dataKey="channel" stroke="#cbd5e0" style={{ fontSize: '10px' }} /> {/* Reduced font size */}
                  <YAxis stroke="#cbd5e0" style={{ fontSize: '10px' }} /> {/* Reduced font size */}
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4a5568', color: '#ffffff' }}
                    labelStyle={{ color: '#ffffff' }}
                  />
                  <Bar dataKey="uniqueOutreaches" fill={BLUE_VIOLET_SHADES[0]} name="Unique Outreaches" stackId="a" />
                  <Bar dataKey="followUps" fill={BLUE_VIOLET_SHADES[1]} name="Follow Ups" stackId="a" />
                  <Bar dataKey="replies" fill={BLUE_VIOLET_SHADES[2]} name="Replies" stackId="a" />
                  <Legend wrapperStyle={{ fontSize: '10px', color: '#cbd5e0' }} /> {/* Reduced font size */}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Treemap Chart */}
          <div className="bg-gray-800 rounded-lg shadow-lg flex flex-col">
            <div className="p-3 pb-1 flex justify-between items-center"> {/* Reduced padding */}
              <h2 className="text-base text-white font-semibold">Prospect Status Overview</h2> {/* Reduced font size */}
              <div className="flex space-x-1 text-xs text-white"> {/* Reduced space-x and font size */}
                {treemapChartData.filter(d => d.name !== 'Total').map((entry) => (
                  <div key={entry.name} className="flex items-center">
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-0.5" style={{ backgroundColor: entry.fill }}></span> {/* Reduced size and margin */}
                    <span>{entry.name}: {entry.value} ({entry.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 pt-1 flex-grow"> {/* Reduced padding */}
              {/* Set a fixed height for ResponsiveContainer to control vertical space */}
              <ResponsiveContainer width="100%" height={150}> {/* Further decreased height */}
                <Treemap
                  data={treemapChartData}
                  dataKey="value"
                  aspectRatio={4/3}
                  stroke="#fff"
                  content={<CustomizedContent colors={TREEMAP_COLORS} />}
                />
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
