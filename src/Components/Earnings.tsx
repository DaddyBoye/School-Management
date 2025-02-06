import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { ChevronDown } from 'lucide-react';

const EarningsChart = () => {
  const [timeframe, setTimeframe] = useState('This Year');
  const [showTimeframeMenu, setShowTimeframeMenu] = useState(false);

  const timeframes = ['This Year', 'Last Year', 'This Month', 'Last Month', 'Past 2 Years'];

  // Comprehensive earnings data with received and arrears across different timeframes
  const earningsData = {
    'This Year': [
      { period: 'Jan', received: 5000, arrears: 2000 },
      { period: 'Feb', received: 5500, arrears: 1800 },
      { period: 'Mar', received: 6000, arrears: 1600 },
      { period: 'Apr', received: 5800, arrears: 1500 },
      { period: 'May', received: 6200, arrears: 1300 },
      { period: 'Jun', received: 6500, arrears: 1100 },
      { period: 'Jul', received: 6700, arrears: 1000 },
      { period: 'Aug', received: 6300, arrears: 900 },
      { period: 'Sep', received: 6000, arrears: 800 },
      { period: 'Oct', received: 5900, arrears: 700 },
      { period: 'Nov', received: 5700, arrears: 600 },
      { period: 'Dec', received: 5500, arrears: 500 }
    ],
    'Last Year': [
      { period: 'Jan', received: 4500, arrears: 2500 },
      { period: 'Feb', received: 4800, arrears: 2200 },
      { period: 'Mar', received: 5200, arrears: 1900 },
      { period: 'Apr', received: 5000, arrears: 1700 },
      { period: 'May', received: 5300, arrears: 1500 },
      { period: 'Jun', received: 5600, arrears: 1200 },
      { period: 'Jul', received: 5800, arrears: 1000 },
      { period: 'Aug', received: 5500, arrears: 900 },
      { period: 'Sep', received: 5200, arrears: 800 },
      { period: 'Oct', received: 5000, arrears: 700 },
      { period: 'Nov', received: 4800, arrears: 600 },
      { period: 'Dec', received: 4600, arrears: 500 }
    ],
    'Past 2 Years': [
      { period: 'Year 1', received: 66000, arrears: 12000 },
      { period: 'Year 2', received: 70000, arrears: 10000 }
    ],
    'This Month': [
      { period: 'Week 1', received: 1500, arrears: 500 },
      { period: 'Week 2', received: 1700, arrears: 400 },
      { period: 'Week 3', received: 1600, arrears: 350 },
      { period: 'Week 4', received: 1800, arrears: 300 }
    ],
    'Last Month': [
      { period: 'Week 1', received: 1400, arrears: 550 },
      { period: 'Week 2', received: 1550, arrears: 450 },
      { period: 'Week 3', received: 1450, arrears: 400 },
      { period: 'Week 4', received: 1650, arrears: 350 }
    ]
  };

  const currentData = earningsData[timeframe];

  // Calculate totals
  const totals = currentData.reduce((acc, item) => ({
    received: acc.received + item.received,
    arrears: acc.arrears + item.arrears
  }), { received: 0, arrears: 0 });

  const Dropdown = ({ options, value, onChange, isOpen, setIsOpen }) => (
    <div className="relative">
      <button 
        className="flex items-center text-sm text-black bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-lg border"
        onClick={() => setIsOpen(!isOpen)}
      >
        {value}
        <ChevronDown className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 rounded-lg shadow-lg z-10">
          {options.map((option) => (
            <button
              key={option}
              className="w-full text-left px-4 py-2 text-sm text-black bg-white hover:bg-gray-200"
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border">
          <p className="text-gray-600 font-medium mb-2">{data.period}</p>
          <div className="space-y-1">
            <p className="text-blue-500">
              Received:  GH₵{data.received.toLocaleString()}
            </p>
            <p className="text-red-400">
              Arrears:  GH₵{data.arrears.toLocaleString()}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl p-4 h-full border-2">
      <div className="flex justify-between items-center mb-4">
        <div className="space-y-2">
          <h3 className="text-lg text-black font-medium">Earnings</h3>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400"></div>
              <span className="text-gray-600">
                Received:  GH₵{totals.received.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-300"></div>
              <span className="text-gray-600">
                Arrears:  GH₵{totals.arrears.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        
        <Dropdown 
          options={timeframes}
          value={timeframe}
          onChange={setTimeframe}
          isOpen={showTimeframeMenu}
          setIsOpen={setShowTimeframeMenu}
        />
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={currentData}
            margin={{ top: 10, right: 0, left: -15, bottom: 0 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false}
              stroke="#E5E7EB"
            />
            <XAxis 
              dataKey="period" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickFormatter={(value) => `${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="received" 
              stroke="#60A5FA" 
              fill="#60A5FA" 
              fillOpacity={0.3} 
            />
            <Area 
              type="monotone" 
              dataKey="arrears" 
              stroke="#FCA5A5" 
              fill="#FCA5A5" 
              fillOpacity={0.3} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EarningsChart;