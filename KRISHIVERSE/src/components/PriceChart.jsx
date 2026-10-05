import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

// Generate mock 6-month historical data based on current price
function generateHistoricalData(basePrice) {
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  let currentPrice = basePrice * 0.8; // start lower 6 months ago (mock)

  return months.map(month => {
    // Random fluctuation
    const fluctuation = (Math.random() - 0.3) * (basePrice * 0.1);
    currentPrice = currentPrice + fluctuation;
    return {
      month,
      price: Math.round(currentPrice)
    };
  }).concat({ month: 'Apr (Now)', price: Math.round(basePrice) });
}

export default function PriceChart({ crop, currentPrice }) {
  const { t } = useTranslation();
  
  // Memoize data so it doesn't jump randomly on re-renders, unless crop changes
  const { data, forecast } = useMemo(() => {
    if (!currentPrice || !crop || crop === 'All') return { data: [], forecast: null };
    
    const histData = generateHistoricalData(currentPrice);
    
    // AI Mock Forecast Logic
    const isRising = Math.random() > 0.4; // 60% chance to predict rise
    const percent = Math.floor(Math.random() * 10) + 5; // 5% to 15%
    
    const forecast = {
      isRising,
      percent,
      text: `${crop} prices are expected to ${isRising ? 'rise' : 'drop'} by ~${percent}% next week.`
    };
    
    return { data: histData, forecast };
  }, [crop, currentPrice]);

  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-800 font-bold text-sm">
          {crop} {t('prices.trend', '6-Month Trend')}
        </h3>
        
        {/* AI Forecast Indicator */}
        {forecast && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            forecast.isRising ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {forecast.isRising ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
            {forecast.text}
          </div>
        )}
      </div>

      <div className="h-48 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              tickFormatter={(val) => `₹${val}`}
            />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              labelStyle={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '4px' }}
              itemStyle={{ color: '#1F2937', fontWeight: 'bold' }}
              formatter={(value) => [`₹${value}`, 'Avg Price']}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#0ea5e9" 
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0, fill: '#0ea5e9' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
