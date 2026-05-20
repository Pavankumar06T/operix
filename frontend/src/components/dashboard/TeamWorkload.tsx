import { useTeamWorkload } from '../../hooks/useDashboard';
import { getInitials, getAvatarColor, getWorkloadColor } from '../../lib/utils';

export default function TeamWorkload() {
  const { data: team } = useTeamWorkload();
  const members = team || [];

  return (
    <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5 flex-[2]">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[#F8F8FF]">Team Workload</h3>
        <p className="text-xs text-[#9898B0] mt-0.5">Current capacity overview</p>
      </div>

      <div className="flex flex-col">
        {members.map((member, index) => {
          const barColor = getWorkloadColor(member.workloadPercent);
          const avatarColor = getAvatarColor(member.name);

          return (
            <div
              key={member.id}
              className={`flex items-center gap-3 py-3.5 ${index < members.length - 1 ? 'border-b border-[#2A2A3A]' : ''}`}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: avatarColor }}
              >
                {getInitials(member.name)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#F8F8FF] truncate">{member.name}</p>
                <p className="text-xs text-[#9898B0]">{member.role}</p>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span className="text-xs text-[#9898B0]">
                  {member.tasksCompleted}/{member.tasksTotal} tasks
                </span>
                <div className="w-[120px] h-1.5 rounded-full bg-[#2A2A3A]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${member.workloadPercent}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
                <span className="text-[10px] text-[#5A5A72]">{member.workloadPercent}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
