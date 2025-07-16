import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, RadialBarChart, RadialBar, AreaChart, Area, Legend, PieChart, Pie, Cell } from "recharts";
import { ChartTooltip } from "@/components/ui/chart";

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
  '#8b5cf6', // violet-500 (kept for other potential uses, but not directly used for the violet replacement)
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
];

const BLUE_SHADES = [
  '#3b82f6', // blue-500 (Unique Outreaches)
  '#2563eb', // blue-600 (Follow Ups)
  '#1d4ed8', // blue-700 (Replies)
  '#1e40af', // blue-800 (for Meeting Categories if needed)
];

export function VCDashboard() {
  const { companies, isLoading, potentialStats } = useCompanies(1, 100);

  // Filter States
  const [selectedPersons, setSelectedPersons] = useState(['Roohi']); // Default to Roohi
  const [selectedChannels, setSelectedChannels] = useState(['LinkedIn', 'Others', 'Calls', 'Mail']); // All channels selected by default
  const [startDate, setStartDate] = useState('2025-01-01'); // Mock start date
  const [endDate, setEndDate] = useState('2025-12-31'); // Mock end date

  const availablePersons = ['Roohi', 'Avasyu', 'Kanishk', 'Tanisha'];
  const availableChannels = ['LinkedIn', 'Others', 'Calls', 'Mail'];

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

  // Mock data for channel distribution, now categorized by person
  const channelDataByPerson = {
    'Roohi': [
      { channel: 'LinkedIn', uniqueOutreaches: 40, followUps: 8, replies: 5, meetings: 1 },
      { channel: 'Others', uniqueOutreaches: 28, followUps: 4, replies: 2, meetings: 0 },
      { channel: 'Calls', uniqueOutreaches: 12, followUps: 2, replies: 1, meetings: 0 },
      { channel: 'Mail', uniqueOutreaches: 8, followUps: 1, replies: 0, meetings: 0 }
    ],
    'Avasyu': [
      { channel: 'LinkedIn', uniqueOutreaches: 25, followUps: 5, replies: 3, meetings: 0 },
      { channel: 'Others', uniqueOutreaches: 35, followUps: 7, replies: 4, meetings: 1 },
      { channel: 'Calls', uniqueOutreaches: 10, followUps: 1, replies: 0, meetings: 0 },
      { channel: 'Mail', uniqueOutreaches: 15, followUps: 3, replies: 1, meetings: 0 }
    ],
    'Kanishk': [
      { channel: 'LinkedIn', uniqueOutreaches: 30, followUps: 6, replies: 4, meetings: 0 },
      { channel: 'Others', uniqueOutreaches: 20, followUps: 3, replies: 1, meetings: 0 },
      { channel: 'Calls', uniqueOutreaches: 20, followUps: 4, replies: 2, meetings: 1 },
      { channel: 'Mail', uniqueOutreaches: 10, followUps: 2, replies: 1, meetings: 0 }
    ],
    'Tanisha': [
      { channel: 'LinkedIn', uniqueOutreaches: 15, followUps: 3, replies: 1, meetings: 0 },
      { channel: 'Others', uniqueOutreaches: 18, followUps: 2, replies: 0, meetings: 0 },
      { channel: 'Calls', uniqueOutreaches: 25, followUps: 5, replies: 3, meetings: 0 },
      { channel: 'Mail', uniqueOutreaches: 30, followUps: 6, replies: 4, meetings: 1 }
    ]
  };

  // Memoized currentChannelData based on selected person and channels
  const currentChannelData = useMemo(() => {
    // Determine which person's data to show. If multiple are selected, aggregate.
    // For simplicity, let's aggregate if multiple are selected, otherwise show the first selected.
    let aggregatedData = {};

    selectedPersons.forEach(person => {
      const dataForPerson = channelDataByPerson[person] || [];
      dataForPerson.forEach(item => {
        if (selectedChannels.includes(item.channel)) {
          if (!aggregatedData[item.channel]) {
            aggregatedData[item.channel] = { channel: item.channel, uniqueOutreaches: 0, followUps: 0, replies: 0, meetings: 0 };
          }
          aggregatedData[item.channel].uniqueOutreaches += item.uniqueOutreaches;
          aggregatedData[item.channel].followUps += item.followUps;
          aggregatedData[item.channel].replies += item.replies;
          aggregatedData[item.channel].meetings += item.meetings; // Aggregate meetings too
        }
      });
    });

    return Object.values(aggregatedData);
  }, [selectedPersons, selectedChannels]);

  // Calculate dynamic metrics based on currentChannelData
  const filteredMetrics = useMemo(() => {
    const totalUniqueOutreaches = currentChannelData.reduce((sum, item) => sum + item.uniqueOutreaches, 0);
    const totalFollowUps = currentChannelData.reduce((sum, item) => sum + item.followUps, 0);
    const totalReplies = currentChannelData.reduce((sum, item) => sum + item.replies, 0);
    const totalMeetings = currentChannelData.reduce((sum, item) => sum + item.meetings, 0); // Sum meetings

    return {
      uniqueOutreaches: totalUniqueOutreaches,
      followUps: totalFollowUps,
      replies: totalReplies,
      meetings: totalMeetings,
    };
  }, [currentChannelData]);


  // Meeting Categories data (static for now, can be made dynamic with more complex mocks)
  // For demonstration, let's make meeting categories dependent on total meetings.
  const meetingCategoriesData = useMemo(() => {
    if (filteredMetrics.meetings === 0) {
      return [{ name: 'No Meetings', value: 100, fill: '#6b7280' }]; // Gray if no meetings
    }

    // Distribute based on a simple rule, e.g., 70% Product Demos, 30% Discovery Calls
    const productDemos = Math.round(filteredMetrics.meetings * 0.7);
    const discoveryCalls = filteredMetrics.meetings - productDemos;

    return [
      { name: 'Product Demos', value: productDemos, fill: BLUE_SHADES[3] },
      { name: 'Discovery Calls', value: discoveryCalls, fill: BLUE_SHADES[0] }
    ].filter(item => item.value > 0); // Only show categories with values
  }, [filteredMetrics.meetings]);


  // Handlers for filter changes
  const handlePersonCheckboxChange = (personName) => {
    setSelectedPersons((prevSelected) => {
      // Allow multiple selections for persons
      if (prevSelected.includes(personName)) {
        const newSelection = prevSelected.filter((name) => name !== personName);
        // If all are deselected, select all available persons
        return newSelection.length === 0 ? availablePersons : newSelection;
      } else {
        return [...prevSelected, personName];
      }
    });
  };

  const handleChannelCheckboxChange = (channelName) => {
    setSelectedChannels((prevSelected) => {
      if (prevSelected.includes(channelName)) {
        const newSelection = prevSelected.filter((name) => name !== channelName);
        // If all are deselected, select all available channels
        return newSelection.length === 0 ? availableChannels : newSelection;
      } else {
        return [...prevSelected, channelName];
      }
    });
  };

  return (
    // Main container uses flex to arrange sidebar and main content
    <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4 p-4 min-h-screen bg-gray-900 text-white font-inter">
      {/* Left Sidebar for Filters */}
      {/* Adjusted width to lg:w-1/4 for the filter card */}
      <Card className="lg:w-1/4 p-4 space-y-4 flex-shrink-0 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">Filters</h2>

        {/* Date Filter */}
        <div>
          <h3 className="text-md font-semibold mb-2 text-white">Date</h3>
          <div className="space-y-2">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-300 mb-1">From:</label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border rounded-md bg-gray-700 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-300 mb-1">To:</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border rounded-md bg-gray-700 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* POC Name Filter */}
        <div>
          <h3 className="text-md font-semibold mb-2 text-white">POC</h3>
          <div className="space-y-2">
            {availablePersons.map((personName) => (
              <div key={personName} className="flex items-center">
                <input
                  type="checkbox"
                  id={`person-checkbox-${personName}`}
                  checked={selectedPersons.includes(personName)}
                  onChange={() => handlePersonCheckboxChange(personName)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-blue-600 dark:focus:ring-blue-600"
                />
                <label htmlFor={`person-checkbox-${personName}`} className="ml-2 text-sm text-gray-300 cursor-pointer">
                  {personName}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Channel Filter */}
        <div>
          <h3 className="text-md font-semibold mb-2 text-white">Channel</h3>
          <div className="space-y-2">
            {availableChannels.map((channelName) => (
              <div key={channelName} className="flex items-center">
                <input
                  type="checkbox"
                  id={`channel-checkbox-${channelName}`}
                  checked={selectedChannels.includes(channelName)}
                  onChange={() => handleChannelCheckboxChange(channelName)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-blue-600 dark:focus:ring-blue-600"
                />
                <label htmlFor={`channel-checkbox-${channelName}`} className="ml-2 text-sm text-gray-300 cursor-pointer">
                  {channelName}
                </label>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Right Content Area: Metric Cards + Charts */}
      {/* This div now takes up the remaining space and contains both the metric cards and charts */}
      <div className="flex-grow flex flex-col space-y-4">
        {/* Key Metrics Cards - Shifted to the right by being part of the flex-grow container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg">
            <CardContent className="p-4 text-center">
              <div>
                <p className="text-sm font-medium opacity-90">Unique Outreaches</p>
                <p className="text-4xl font-bold mt-2">{filteredMetrics.uniqueOutreaches}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-400 to-blue-500 text-white rounded-lg shadow-lg">
            <CardContent className="p-4 text-center">
              <div>
                <p className="text-sm font-medium opacity-90">Follow Ups</p>
                <p className="text-4xl font-bold mt-2">{filteredMetrics.followUps}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-300 to-blue-400 text-white rounded-lg shadow-lg">
            <CardContent className="p-4 text-center">
              <div>
                <p className="text-sm font-medium opacity-90">Replies</p>
                <p className="text-4xl font-bold mt-2">{filteredMetrics.replies}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-lg shadow-lg">
            <CardContent className="p-4 text-center">
              <div>
                <p className="text-sm font-medium opacity-90">Meetings</p>
                <p className="text-4xl font-bold mt-2">{filteredMetrics.meetings}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Area */}
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Unique Outreaches, Follow ups and Replies by Channel */}
          <Card className="bg-gray-800 rounded-lg shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Unique Outreaches, Follow ups and Replies by Channel</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={currentChannelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" /> {/* Darker grid lines */}
                  <XAxis dataKey="channel" stroke="#cbd5e0" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#cbd5e0" style={{ fontSize: '12px' }} />
                  <ChartTooltip
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4a5568', color: '#ffffff' }}
                    labelStyle={{ color: '#ffffff' }}
                  />
                  <Bar dataKey="uniqueOutreaches" fill={BLUE_SHADES[0]} name="Unique Outreaches" stackId="a" />
                  <Bar dataKey="followUps" fill={BLUE_SHADES[1]} name="Follow Ups" stackId="a" />
                  <Bar dataKey="replies" fill={BLUE_SHADES[2]} name="Replies" stackId="a" />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#cbd5e0' }} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Meeting Categories */}
          <Card className="bg-gray-800 rounded-lg shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Meeting Categories</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={meetingCategoriesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    // label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} // Optional: show labels on slices
                  >
                    {meetingCategoriesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    formatter={(value, name) => [`${value} meetings`, name]}
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4a5568', color: '#ffffff' }}
                    labelStyle={{ color: '#ffffff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#cbd5e0' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
