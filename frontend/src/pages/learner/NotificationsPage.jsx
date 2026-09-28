import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      fetchNotifs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifs();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Notification Center</h1>
          <p className="text-xs text-slate-400 mt-1">Review feedback alerts, practice reminders, and milestone notices.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
          Mark All Read
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No notifications in your inbox.</div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {notifications.map(n => (
              <div 
                key={n.id} 
                className={`py-4 flex items-center justify-between gap-4 ${!n.is_read ? 'bg-primary-950/15 -mx-6 px-6' : ''}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${!n.is_read ? 'text-white' : 'text-slate-300'}`}>
                      {n.title}
                    </span>
                    <Badge variant={n.notification_type === 'milestone' ? 'warning' : 'primary'} size="sm">
                      {n.notification_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">{n.message}</p>
                </div>
                <div className="flex items-center gap-2">
                  {n.link && (
                    <Link to={n.link}>
                      <Button size="sm" variant="ghost">View</Button>
                    </Link>
                  )}
                  {!n.is_read && (
                    <Button size="sm" variant="outline" onClick={() => handleMarkRead(n.id)}>
                      Read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
