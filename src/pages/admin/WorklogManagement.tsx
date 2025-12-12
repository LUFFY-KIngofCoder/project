import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { WorklogWithProfile } from '../../types';
import { SectionCard } from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { Check, X, Download, Filter, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function WorklogManagement() {
  const { profile } = useAuth();
  const [worklogs, setWorklogs] = useState<WorklogWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [selectedWorklog, setSelectedWorklog] = useState<WorklogWithProfile | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadWorklogs();
    }
  }, [startDate, endDate, approvalFilter]);

  const loadWorklogs = async () => {
    try {
      let query = supabase
        .from('worklogs')
        .select(`
          *,
          employee:profiles!worklogs_employee_id_fkey(*),
          approver:profiles!worklogs_approved_by_fkey(*)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (approvalFilter === 'approved') {
        query = query.eq('is_approved', true);
      } else if (approvalFilter === 'pending') {
        query = query.eq('is_approved', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      setWorklogs(data || []);
    } catch (error) {
      console.error('Error loading worklogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('worklogs')
        .update({
          is_approved: true,
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      loadWorklogs();
    } catch (error) {
      console.error('Error approving worklog:', error);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this worklog?')) return;

    try {
      const { error } = await supabase.from('worklogs').delete().eq('id', id);

      if (error) throw error;
      loadWorklogs();
    } catch (error) {
      console.error('Error rejecting worklog:', error);
    }
  };

  const handleView = (worklog: WorklogWithProfile) => {
    setSelectedWorklog(worklog);
    setIsViewModalOpen(true);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Employee', 'Tasks', 'Hours', 'Approved'];
    const rows = worklogs.map((record) => [
      record.date,
      (record.employee as any)?.full_name || '',
      record.tasks_completed.replace(/,/g, ';'),
      record.hours_spent,
      record.is_approved ? 'Yes' : 'No',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worklogs_${startDate}_${endDate}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Worklogs</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <Button onClick={exportToCSV} variant="secondary" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approved
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {worklogs.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(record.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{(record.employee as any)?.full_name}</div>
                    <div className="text-sm text-gray-500">{(record.employee as any)?.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">{record.tasks_completed}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {record.hours_spent}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        record.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {record.is_approved ? 'Yes' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => handleView(record)} className="text-blue-600 hover:text-blue-900">
                        <Eye className="h-4 w-4" />
                      </button>
                      {!record.is_approved && (
                        <>
                          <button
                            onClick={() => handleApprove(record.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleReject(record.id)} className="text-red-600 hover:text-red-900">
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {worklogs.length === 0 && <div className="text-center py-12 text-gray-500">No worklogs found</div>}
        </div>
      </SectionCard>

      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedWorklog(null);
        }}
        title="Worklog Details"
        size="lg"
      >
        {selectedWorklog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <p className="mt-1 text-gray-900">{new Date(selectedWorklog.date).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee</label>
                <p className="mt-1 text-gray-900">{(selectedWorklog.employee as any)?.full_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Hours Spent</label>
                <p className="mt-1 text-gray-900 font-medium">{selectedWorklog.hours_spent} hours</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span
                  className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${
                    selectedWorklog.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {selectedWorklog.is_approved ? 'Approved' : 'Pending'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tasks Completed</label>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-900 whitespace-pre-wrap">{selectedWorklog.tasks_completed}</p>
              </div>
            </div>

            {!selectedWorklog.is_approved && (
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="danger" onClick={() => handleReject(selectedWorklog.id)}>
                  Reject
                </Button>
                <Button variant="success" onClick={() => handleApprove(selectedWorklog.id)}>
                  Approve
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
