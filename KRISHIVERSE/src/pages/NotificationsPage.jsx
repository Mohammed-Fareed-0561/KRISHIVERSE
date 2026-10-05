import React from 'react';
import { motion } from 'framer-motion';
import { 
  IconBell, 
  IconAlertTriangle, 
  IconCloudRain, 
  IconCalendarEvent, 
  IconCash,
  IconCircleCheck
} from '@tabler/icons-react';

const NotificationsPage = () => {
  const notifications = [
    {
      id: 1,
      type: 'weather',
      title: 'Heavy Rain Alert',
      message: 'Expected heavy rainfall in your area tomorrow. Avoid spraying pesticides.',
      time: '2 hours ago',
      icon: <IconCloudRain className="text-blue-500" />,
      unread: true
    },
    {
      id: 2,
      type: 'calendar',
      title: 'Harvest Time Approaching',
      message: 'Your Wheat crop is reaching maturity. Plan for harvest in 5-7 days.',
      time: '5 hours ago',
      icon: <IconCalendarEvent className="text-green-500" />,
      unread: true
    },
    {
      id: 3,
      type: 'finance',
      title: 'Loan Disbursal',
      message: 'Your Micro-Loan application for "Seed Purchase" has been approved.',
      time: '1 day ago',
      icon: <IconCash className="text-amber-500" />,
      unread: false
    },
    {
      id: 4,
      type: 'diagnose',
      title: 'Diagnosis Complete',
      message: 'The analysis for your "Paddy" crop is ready. Click to view results.',
      time: '2 days ago',
      icon: <IconCircleCheck className="text-teal-500" />,
      unread: false
    }
  ];

  return (
    <div className="pb-24 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <button className="text-sm font-medium text-green-600 hover:text-green-700">
          Mark all as read
        </button>
      </div>

      <div className="space-y-4">
        {notifications.map((notif, index) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-xl border transition-all ${
              notif.unread 
                ? 'bg-green-50 border-green-100 shadow-sm' 
                : 'bg-white border-gray-100'
            }`}
          >
            <div className="flex gap-4">
              <div className={`p-2 rounded-lg h-fit ${
                notif.unread ? 'bg-white shadow-sm' : 'bg-gray-50'
              }`}>
                {notif.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className={`font-semibold ${notif.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                    {notif.title}
                  </h3>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{notif.time}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {notif.message}
                </p>
                {notif.type === 'weather' && (
                  <button className="mt-3 text-sm font-semibold text-blue-600 flex items-center gap-1">
                    View Weather Plan <IconAlertTriangle size={14} />
                  </button>
                )}
              </div>
              {notif.unread && (
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-20">
          <IconBell size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No new notifications</p>
        </div>
      )}

      {/* Action shortcuts */}
      <div className="mt-10 pt-6 border-t border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recommended for You</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-gray-100 bg-white hover:border-green-200 transition-colors shadow-sm">
            <IconCalendarEvent className="text-green-600 mb-2" />
            <div className="text-sm font-bold">Crop Tracker</div>
            <div className="text-xs text-gray-500">Update wheat status</div>
          </div>
          <div className="p-4 rounded-xl border border-gray-100 bg-white hover:border-green-200 transition-colors shadow-sm">
            <IconCash className="text-amber-600 mb-2" />
            <div className="text-sm font-bold">Loans Info</div>
            <div className="text-xs text-gray-500">Explore KCC schemes</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
