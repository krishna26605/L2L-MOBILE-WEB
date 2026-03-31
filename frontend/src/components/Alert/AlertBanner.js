import { useState, useEffect } from 'react';
import { AlertTriangle, X, MapPin, Users, Clock } from 'lucide-react';
import { alertsAPI } from '../../lib/api';

export const AlertBanner = () => {
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    fetchAlerts();
    // Refresh every 60 seconds
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await alertsAPI.getActive();
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const dismiss = (alertId) => {
    setDismissed(prev => new Set([...prev, alertId]));
  };

  const visibleAlerts = alerts.filter(a => !dismissed.has(a._id));

  if (visibleAlerts.length === 0) return null;

  const severityColors = {
    critical: 'from-red-600 to-red-700 border-red-400',
    high: 'from-orange-500 to-orange-600 border-orange-400',
    medium: 'from-yellow-500 to-yellow-600 border-yellow-400'
  };

  const severityIcons = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡'
  };

  const timeSince = (dateStr) => {
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-3 mb-6">
      {visibleAlerts.map(alert => (
        <div
          key={alert._id}
          className={`bg-gradient-to-r ${severityColors[alert.severity] || severityColors.high} text-white rounded-xl p-4 shadow-lg border-l-4 animate-pulse`}
          style={{ animationDuration: '3s' }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-base">
                  {severityIcons[alert.severity]} EMERGENCY: {alert.title}
                </h4>
                <p className="text-sm opacity-90 mt-1">{alert.description}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs opacity-80">
                  <span className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>{alert.area}</span>
                  </span>
                  {alert.peopleAffected > 0 && (
                    <span className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>~{alert.peopleAffected} people</span>
                    </span>
                  )}
                  <span className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{timeSince(alert.createdAt)}</span>
                  </span>
                  <span>Posted by: {alert.ngoName}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => dismiss(alert._id)}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
