import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import type { Alert } from '../types';

const MOCK_ALERTS: Alert[] = [
  { id: 'a1', task_id: 't1', project_id: 'p1', manager_id: 'm1', type: 'delay_risk', severity: 'critical', title: 'Task At Risk: "Payment Gateway Integration"', message: "Ravi Kumar's task \"Payment Gateway Integration\" has a risk score of 92/100. At current pace of 7.5% per day, this task needs 9 more days but only 4 days remain.", is_resolved: false, is_seen: false, created_at: '2026-05-20T08:30:00Z' },
  { id: 'a2', task_id: 't2', project_id: 'p2', manager_id: 'm1', type: 'delay_risk', severity: 'high', title: 'Task At Risk: "Dashboard Analytics Module"', message: "Priya Sharma's task has a risk score of 85/100. At current pace, this task needs 10 more days but only 5 remain.", is_resolved: false, is_seen: false, created_at: '2026-05-20T07:15:00Z' },
  { id: 'a3', task_id: null, project_id: null, manager_id: 'm1', type: 'burnout', severity: 'high', title: 'Wellbeing Alert: Ravi Kumar', message: 'Performance data suggests Ravi Kumar may be experiencing elevated workload stress. Task completion rate declined from 85% to 52% over 4 weeks.', is_resolved: false, is_seen: true, created_at: '2026-05-19T23:00:00Z' },
  { id: 'a4', task_id: 't5', project_id: 'p3', manager_id: 'm1', type: 'milestone', severity: 'low', title: 'Milestone Reached: CloudSync v2.0', message: 'CloudSync App has reached 78% completion. The team is ahead of schedule for the June 30 deadline.', is_resolved: false, is_seen: true, created_at: '2026-05-19T14:20:00Z' },
  { id: 'a5', task_id: null, project_id: 'p1', manager_id: 'm1', type: 'client_feedback', severity: 'medium', title: 'New Client Feedback: FinTech Portal', message: 'Client has requested changes to the payment flow UI. This may impact the current sprint timeline.', is_resolved: false, is_seen: true, created_at: '2026-05-18T10:45:00Z' },
];

export function useAlerts() {
  return useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      try {
        const { data } = await api.get<{ alerts: Alert[] }>('/api/alerts', {
          params: { resolved: false, limit: 5 },
        });
        return data.alerts;
      } catch {
        return MOCK_ALERTS;
      }
    },
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      await api.patch(`/api/alerts/${alertId}`, { is_seen: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.patch('/api/alerts/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
