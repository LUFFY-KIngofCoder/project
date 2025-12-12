import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { SectionCard } from '../../components/Card';
import Button from '../../components/Button';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface AttendanceSubmissionProps {
  onSuccess: () => void;
}

export default function AttendanceSubmission({ onSuccess }: AttendanceSubmissionProps) {
  const { profile } = useAuth();
  const [status, setStatus] = useState<'present' | 'half_day' | 'on_leave' | 'absent'>('present');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);

  useEffect(() => {
    checkTodayAttendance();
  }, [profile]);

  const checkTodayAttendance = async () => {
    if (!profile) return;

    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', profile.id)
      .eq('date', today)
      .maybeSingle();

    setTodayAttendance(data);
    if (data) {
      setStatus(data.status);
      setReason(data.reason || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    setMessage(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const checkInTime = status === 'present' || status === 'half_day' ? new Date().toISOString() : null;

      if (todayAttendance) {
        const { error } = await supabase
          .from('attendance')
          .update({
            status,
            reason: reason || null,
          })
          .eq('id', todayAttendance.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Attendance updated successfully!' });
      } else {
        const { error } = await supabase.from('attendance').insert({
          employee_id: profile.id,
          date: today,
          status,
          reason: reason || null,
          check_in_time: checkInTime,
        });

        if (error) throw error;
        setMessage({ type: 'success', text: 'Attendance marked successfully!' });
      }

      checkTodayAttendance();
      onSuccess();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to submit attendance' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard title="Mark Your Attendance">
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-start space-x-2 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {message.text}
          </p>
        </div>
      )}

      {todayAttendance && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            You have already marked your attendance for today. You can update it below if needed.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Attendance Status</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { value: 'present', label: 'Present', color: 'green' },
              { value: 'half_day', label: 'Half Day', color: 'yellow' },
              { value: 'on_leave', label: 'On Leave', color: 'blue' },
            ].map((option) => (
              <label
                key={option.value}
                className={`relative flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  status === option.value
                    ? `border-${option.color}-600 bg-${option.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={option.value}
                  checked={status === option.value}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="sr-only"
                />
                <span className="font-medium text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {(status === 'on_leave' || status === 'half_day') && (
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason {status === 'on_leave' && <span className="text-red-600">*</span>}
            </label>
            <textarea
              id="reason"
              rows={4}
              required={status === 'on_leave'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-600">
            Date: <span className="font-medium text-gray-900">{new Date().toLocaleDateString()}</span>
          </p>
          <Button type="submit" variant="primary" size="lg" disabled={loading}>
            {loading ? 'Submitting...' : todayAttendance ? 'Update Attendance' : 'Mark Attendance'}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
