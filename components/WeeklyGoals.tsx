import React, { useState, useMemo } from 'react';
import { User, WeeklyGoal } from '../types';
import { 
  Plus, 
  Calendar, 
  Flag, 
  AlertTriangle, 
  Archive,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  CheckCircle2,
  Circle,
  Clock,
  PlayCircle
} from 'lucide-react';

interface WeeklyGoalsProps {
  currentUser: User;
  weeklyGoals: WeeklyGoal[];
  onAddWeeklyGoal: (goal: Omit<WeeklyGoal, 'goalId'>) => void;
  onUpdateWeeklyGoal: (goalId: string, updates: Partial<WeeklyGoal>) => void;
}

const WeeklyGoals: React.FC<WeeklyGoalsProps> = ({
  currentUser,
  weeklyGoals,
  onAddWeeklyGoal,
  onUpdateWeeklyGoal
}) => {
  // Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [title, setTitle] = useState('');
  const [dod, setDod] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [dependency, setDependency] = useState('');
  
  const [showArchived, setShowArchived] = useState(false);

  // Helper: Current Date for Defaults
  React.useEffect(() => {
    const today = new Date();
    const iso = today.toISOString().split('T')[0];
    setStartDate(iso);
    // Default 1 week
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setEndDate(nextWeek.toISOString().split('T')[0]);
  }, []);

  // Filter Logic
  const myGoals = useMemo(() => {
    return weeklyGoals.filter(g => g.userId === currentUser.userId);
  }, [weeklyGoals, currentUser.userId]);

  const isArchived = (goal: WeeklyGoal) => {
    // Logic: Status is "Completed" or "Partially Completed" -> Archived
    // "Not Started" or "In Progress" -> Active
    return goal.status === 'Completed' || goal.status === 'Partially Completed';
  };

  const activeGoals = myGoals.filter(g => !isArchived(g)).sort((a, b) => {
    // Sort by Start Date Descending
    return (b.startDate || '').localeCompare(a.startDate || '');
  });
  
  const archivedGoals = myGoals.filter(g => isArchived(g)).sort((a, b) => {
    return (b.startDate || '').localeCompare(a.startDate || '');
  });

  // Add Handler
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddWeeklyGoal({
      userId: currentUser.userId,
      title,
      definitionOfDone: dod,
      priority,
      dependency,
      startDate,
      endDate,
      weekOfDate: '', // Explicitly saving nothing to weekOfDate
      status: 'Not Started',
      retroText: ''
    });

    setTitle('');
    setDod('');
    setDependency('');
    setPriority('Medium');
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200';
      case 'Medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-20 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-600 rounded-lg text-white">
          <Flag className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Weekly Goals</h2>
      </div>

      {/* Input Form */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-8">
        <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide text-indigo-600">Set New Goal</h3>
        <form onSubmit={handleAdd} className="space-y-4">
            
            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Start Date</label>
                <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full pl-9 p-2 border border-slate-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">End Date</label>
                <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full pl-9 p-2 border border-slate-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                </div>
              </div>
            </div>

            {/* Content */}
            <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Goal Title</label>
                 <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. Launch Marketing Campaign"
                  required
                 />
            </div>
            <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Definition of Done</label>
                 <textarea
                  value={dod}
                  onChange={(e) => setDod(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Specific criteria for success..."
                  rows={2}
                  required
                 />
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">Priority</label>
                   <select 
                     value={priority}
                     onChange={(e) => setPriority(e.target.value as any)}
                     className="w-full p-2 border border-slate-300 rounded text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
                   >
                     <option value="High">High</option>
                     <option value="Medium">Medium</option>
                     <option value="Low">Low</option>
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">Dependency (Optional)</label>
                   <input
                    value={dependency}
                    onChange={(e) => setDependency(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. Waiting for API"
                   />
                </div>
            </div>

            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                Add Weekly Goal
            </button>
        </form>
      </div>

      {/* Active Goals */}
      <div className="space-y-4 mb-8">
        <h3 className="font-bold text-slate-800 text-lg">Active Goals</h3>
        {activeGoals.length === 0 && (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-sm">
             No active goals. Add one above!
          </div>
        )}
        {activeGoals.map(goal => (
           <GoalCard 
             key={goal.goalId} 
             goal={goal} 
             getPriorityColor={getPriorityColor}
             onUpdate={onUpdateWeeklyGoal} 
           />
        ))}
      </div>

      {/* Archived Goals */}
      <div className="border-t border-slate-200 pt-6">
         <button 
           onClick={() => setShowArchived(!showArchived)}
           className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-sm w-full"
         >
            {showArchived ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Archive className="w-4 h-4" />
            Archived Goals ({archivedGoals.length})
         </button>

         {showArchived && (
           <div className="space-y-4 mt-4 animate-slide-up">
              {archivedGoals.map(goal => (
                 <GoalCard 
                   key={goal.goalId} 
                   goal={goal} 
                   getPriorityColor={getPriorityColor} 
                   onUpdate={onUpdateWeeklyGoal}
                   readOnly
                 />
              ))}
              {archivedGoals.length === 0 && <p className="text-slate-400 text-sm italic pl-6">No archived goals yet.</p>}
           </div>
         )}
      </div>

    </div>
  );
};

const GoalCard: React.FC<{ 
  goal: WeeklyGoal; 
  getPriorityColor: (p: string) => string; 
  onUpdate: (id: string, u: Partial<WeeklyGoal>) => void;
  readOnly?: boolean;
}> = ({ goal, getPriorityColor, onUpdate, readOnly }) => {
   
   const getStatusColor = (s: string) => {
      if (s === 'Completed') return 'text-green-600 bg-green-50 border-green-200';
      if (s === 'Partially Completed') return 'text-amber-600 bg-amber-50 border-amber-200';
      if (s === 'In Progress') return 'text-blue-600 bg-blue-50 border-blue-200';
      return 'text-slate-500 bg-white border-slate-200';
   };

   const dateDisplay = useMemo(() => {
     if (!goal.startDate) return '';
     if (goal.startDate === goal.endDate) return goal.startDate;
     return `${goal.startDate} → ${goal.endDate}`;
   }, [goal.startDate, goal.endDate]);

   return (
     <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all ${readOnly ? 'opacity-75 grayscale-[0.5]' : 'hover:shadow-md'}`}>
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-start">
           <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                  {dateDisplay && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                       {dateDisplay}
                    </span>
                  )}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityColor(goal.priority)}`}>
                     {goal.priority}
                  </span>
              </div>
              <h4 className="font-bold text-slate-800 text-lg leading-tight">{goal.title}</h4>
              <p className="text-xs text-slate-500 mt-2 font-medium bg-slate-50 inline-block px-2 py-1 rounded">
                 DoD: {goal.definitionOfDone}
              </p>
              {goal.dependency && (
                 <div className="flex items-center gap-1.5 mt-2 text-amber-600 text-xs font-bold">
                   <AlertTriangle className="w-3 h-3" />
                   Dependency: {goal.dependency}
                 </div>
              )}
           </div>
        </div>

        <div className="p-4 bg-slate-50/50 flex flex-col gap-3">
           {/* Status Bar */}
           <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Status:</span>
              {readOnly ? (
                 <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(goal.status)}`}>{goal.status}</span>
              ) : (
                 <div className="flex flex-wrap gap-2">
                    {['Not Started', 'In Progress', 'Partially Completed', 'Completed'].map(s => (
                       <button
                         key={s}
                         onClick={() => onUpdate(goal.goalId, { status: s as any })}
                         className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all flex items-center gap-1.5
                            ${goal.status === s 
                               ? getStatusColor(s) + ' ring-1 ring-offset-1 ring-slate-300'
                               : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-100'
                            }`}
                       >
                         {s === 'Completed' && <CheckCircle2 className="w-3 h-3"/>}
                         {s === 'Partially Completed' && <Clock className="w-3 h-3"/>}
                         {s === 'In Progress' && <PlayCircle className="w-3 h-3"/>}
                         {s === 'Not Started' && <Circle className="w-3 h-3"/>}
                         {s}
                       </button>
                    ))}
                 </div>
              )}
           </div>

           {/* Comment Box */}
           <div className="relative">
              <MessageSquare className="w-4 h-4 absolute top-2.5 left-2.5 text-slate-400" />
              <textarea 
                 value={goal.retroText || ''}
                 onChange={(e) => onUpdate(goal.goalId, { retroText: e.target.value })}
                 disabled={readOnly}
                 placeholder={readOnly ? "No comments." : "Add retro notes / comments..."}
                 className="w-full pl-9 p-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 min-h-[60px] bg-white disabled:bg-slate-100"
              />
           </div>
        </div>
     </div>
   );
};

export default WeeklyGoals;