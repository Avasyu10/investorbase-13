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
  '#3b82f6', // blue-500
  '#2563eb', // blue-600
  '#1d4ed8', // blue-700
  '#1e40af', // blue-800
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

  // Key Metrics (these remain mock data, not directly tied to filters without more complex data structure)
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

  // Memoized currentChannelData based on selected person and channels
  const currentChannelData = useMemo(() => {
    // Determine which person's data to show
    const personToShow = selectedPersons.length > 0 ? selectedPersons[0] : 'Roohi';
    const dataForPerson = channelDataByPerson[personToShow] || [];

    // Filter by selected channels
    return dataForPerson.filter(item => selectedChannels.includes(item.channel));
  }, [selectedPersons, selectedChannels]);

  // Meeting Categories data (static for now, can be made dynamic with more complex mocks)
  const meetingCategoriesData = [
    { name: 'Product Demos', value: 85, fill: '#1e40af' },
    { name: 'Discovery Calls', value: 15, fill: '#3b82f6' }
  ];

  // Handlers for filter changes
  const handlePersonCheckboxChange = (personName) => {
    setSelectedPersons((prevSelected) => {
      if (prevSelected.includes(personName)) {
        const newSelection = prevSelected.filter((name) => name !== personName);
        // If deselecting the last one, ensure 'Roohi' is selected by default
        return newSelection.length === 0 ? ['Roohi'] : newSelection;
      } else {
        // For single-selection behavior with checkboxes, just select the new one
        return [personName];
      }
    });
  };

  const handleChannelCheckboxChange = (channelName) => {
    setSelectedChannels((prevSelected) => {
      if (prevSelected.includes(channelName)) {
        return prevSelected.filter((name) => name !== channelName);
      } else {
        return [...prevSelected, channelName];
      }
    });
  };

  return (
    // Reduced vertical padding from space-y-6 to space-y-4, and container padding from py-6 to py-4
    <div className="space-y-4 animate-fade-in h-screen overflow-hidden"> {/* Added h-screen overflow-hidden */}
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4"> {/* Reduced gap and mb */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4 text-center"> {/* Reduced padding */}
            <div>
              <p className="text-xs font-medium opacity-90">Unique Outreaches</p> {/* Smaller text */}
              <p className="text-3xl font-bold mt-1">{uniqueOutreaches}</p> {/* Smaller text */}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-400 to-blue-500 text-white">
          <CardContent className="p-4 text-center"> {/* Reduced padding */}
            <div>
              <p className="text-xs font-medium opacity-90">Follow Ups</p> {/* Smaller text */}
              <p className="text-3xl font-bold mt-1">{followUps}</p> {/* Smaller text */}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-300 to-blue-400 text-white">
          <CardContent className="p-4 text-center"> {/* Reduced padding */}
            <div>
              <p className="text-xs font-medium opacity-90">Replies</p> {/* Smaller text */}
              <p className="text-3xl font-bold mt-1">{replies}</p> {/* Smaller text */}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800">
          <CardContent className="p-4 text-center"> {/* Reduced padding */}
            <div>
              <p className="text-xs font-medium opacity-90">Meetings</p> {/* Smaller text */}
              <p className="text-3xl font-bold mt-1">{meetings}</p> {/* Smaller text */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area: Sidebar + Charts */}
      <div className="flex flex-col lg:flex-row gap-4 flex-grow"> {/* Reduced gap, added flex-grow */}
        {/* Left Sidebar for Filters */}
        <Card className="lg:w-1/4 p-4 space-y-4 flex-shrink-0"> {/* Reduced padding and space-y */}
          <h2 className="text-lg font-bold text-white mb-2">Filters</h2> {/* Smaller text, reduced mb */}

          {/* Date Filter */}
          <div>
            <h3 className="text-md font-semibold mb-1 text-white">Date</h3> {/* Smaller text, reduced mb */}
            <div className="space-y-1"> {/* Reduced space-y */}
              <div>
                <label htmlFor="startDate" className="block text-xs font-medium text-white mb-0.5">From:</label> {/* Smaller text */}
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-1.5 border rounded-md bg-gray-700 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-sm" // Reduced padding, smaller text
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-xs font-medium text-white mb-0.5">To:</label> {/* Smaller text */}
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-1.5 border rounded-md bg-gray-700 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-sm" // Reduced padding, smaller text
                />
              </div>
            </div>
          </div>

          {/* POC Name Filter */}
          <div>
            <h3 className="text-md font-semibold mb-1 text-white">POC</h3> {/* Smaller text, reduced mb */}
            <div className="space-y-1"> {/* Reduced space-y */}
              {availablePersons.map((personName) => (
                <div key={personName} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`person-checkbox-${personName}`}
                    checked={selectedPersons.includes(personName)}
                    onChange={() => handlePersonCheckboxChange(personName)}
                    className="form-checkbox h-3.5 w-3.5 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-blue-600 dark:focus:ring-blue-600" // Smaller checkbox
                  />
                  <label htmlFor={`person-checkbox-${personName}`} className="ml-1.5 text-xs text-white cursor-pointer"> {/* Smaller text, reduced ml */}
                    {personName}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Channel Filter */}
          <div>
            <h3 className="text-md font-semibold mb-1 text-white">Channel</h3> {/* Smaller text, reduced mb */}
            <div className="space-y-1"> {/* Reduced space-y */}
              {availableChannels.map((channelName) => (
                <div key={channelName} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`channel-checkbox-${channelName}`}
                    checked={selectedChannels.includes(channelName)}
                    onChange={() => handleChannelCheckboxChange(channelName)}
                    className="form-checkbox h-3.5 w-3.5 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-blue-600 dark:focus:ring-blue-600" // Smaller checkbox
                  />
                  <label htmlFor={`channel-checkbox-${channelName}`} className="ml-1.5 text-xs text-white cursor-pointer"> {/* Smaller text, reduced ml */}
                    {channelName}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Right Content Area for Charts */}
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Reduced gap */}
          {/* Unique Outreaches, Follow ups and Replies by Channel */}
          <Card>
            <CardHeader className="pb-2"> {/* Reduced padding-bottom */}
              <CardTitle className="text-base">Unique Outreaches, Follow ups and Replies by Channel</CardTitle> {/* Smaller title */}
            </CardHeader>
            <CardContent className="pt-2"> {/* Reduced padding-top */}
              <ResponsiveContainer width="100%" height={200}> {/* Significantly reduced height */}
                <BarChart data={currentChannelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="channel" style={{ fontSize: '10px' }} /> {/* Smaller font size for axis labels */}
                  <YAxis style={{ fontSize: '10px' }} /> {/* Smaller font size for axis labels */}
                  <ChartTooltip />
                  <Bar dataKey="uniqueOutreaches" fill={BLUE_SHADES[0]} name="Unique Outreaches" />
                  <Bar dataKey="followUps" fill={BLUE_SHADES[1]} name="Follow Ups" />
                  <Bar dataKey="replies" fill={BLUE_SHADES[2]} name="Replies" />
                  <Legend wrapperStyle={{ fontSize: '10px' }} /> {/* Smaller font size for legend */}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Meeting Categories */}
          <Card>
            <CardHeader className="pb-2"> {/* Reduced padding-bottom */}
              <CardTitle className="text-base">Meeting Categories</CardTitle> {/* Smaller title */}
            </CardHeader>
            <CardContent className="pt-2"> {/* Reduced padding-top */}
              <ResponsiveContainer width="100%" height={200}> {/* Significantly reduced height */}
                <PieChart>
                  <Pie
                    data={meetingCategoriesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40} // Reduced radius
                    outerRadius={80} // Reduced radius
                    paddingAngle={3} // Reduced padding angle
                    dataKey="value"
                  >
                    {meetingCategoriesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip formatter={(value, name) => [`${value}%`, name]} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} /> {/* Smaller font size for legend */}
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
