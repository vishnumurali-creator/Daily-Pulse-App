import React, { useState, useEffect, useMemo } from 'react';
import { User, Task, WeeklyGoal } from '../types';
import { snapToMonday } from '../services/storage'; 
import { 
  Plus, 
  Minus, 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  Calendar, 
  CalendarDays, 
  Flag, 
  ChevronLeft, 
  ChevronRight,
  RotateCcw
} from 'lucide-react';

interface PlannerProps {
  currentUser: User;
  tasks: Task[];
  weeklyGoals: WeeklyGoal[];
  onAddTask: (task: Omit<Task, 'taskId' | 'actualPomodoros' | 'status'>) => void;
  onUpdatePomodoro: (taskId: string, increment: number) => void;
  onToggleTaskStatus: (taskId: string) => void;
  onAddWeeklyGoal: (goal: Omit<WeeklyGoal, 'goalId'>) => void;
  onUpdateWeeklyGoal: (goalId: string, updates: Partial<WeeklyGoal>) => void;
}

// ==========================================
// 📅 DATE UTILS
// ==========================================

const toLocalISO = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekRange = (mondayStr: string) => {
  if (!mondayStr) return { start: '', end: '', label: 'Invalid Date' };
  
  const parts = mondayStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
      return { start: '', end: '', label: 'Invalid Date' };
  }

  // Construct date in local time
  const start = new Date(parts[0], parts[1] - 1, parts[2]);
  
  const end = new Date(start);
  end.setDate(end.getDate() + 6); // Sunday
  
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  
  // Handle cross-year labels (e.g. Dec 29, 2025 - Jan 4, 2026)
  const label = startYear === endYear 
    ? `${fmt(start)} - ${fmt(end)}, ${startYear}`
    : `${fmt(start)}, ${startYear} - ${fmt(end)}, ${endYear}`;

  return {
    start: toLocalISO(start),
    end: toLocalISO(end),
    label
  };
};

const formatDateFriendly = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;

  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  if (isNaN(dateObj.getTime())) return dateStr;
  
  return dateObj.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
};

// ==========================================
// 🧩 COMPONENT
// ==========================================

const Planner: React.FC<PlannerProps> = ({
  currentUser,
  tasks,
  weeklyGoals,
  onAddTask,
  onUpdatePomodoro,
  onToggleTaskStatus,
  onAddWeeklyGoal,
  onUpdateWeeklyGoal
}) => {
  // View State
  const [viewMode, setViewMode] = useState<'today' | 'week'>('today');
  
  // "Selected Date" acts as our cursor. Defaults to today.
  const [selectedDate, setSelectedDate] = useState<string>(toLocalISO(new Date()));

  // ⭐️ CRITICAL LOGIC: 
  // Regardless of what 'selectedDate' is (Tuesday, Sunday, etc.),
  // 'currentWeekStart' is always the Monday of that week.
  // This is used for BOTH fetching matching goals AND creating new ones.
  const currentWeekStart = useMemo(() => snapToMonday(selectedDate), [selectedDate]);
  const weekRange = useMemo(() => getWeekRange(currentWeekStart), [currentWeekStart]);

  // Form State
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newEst, setNewEst] = useState<number>(2);

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDoD, setNewGoalDoD] = useState('');
  const [newGoalPriority, setNewGoalPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newGoalDependency, setNewGoalDependency] = useState('');

  // Reset task inputs when date changes (optional UX choice)
  useEffect(() => {
    setNewTaskDesc('');
    setNewEst(2);
  }, [selectedDate]);

  // --- Navigation Helpers ---

  const handleDateChange = (daysToAdd: number) => {
    const parts = selectedDate.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    date.setDate(date.getDate() + daysToAdd);
    setSelectedDate(toLocalISO(date));
  };

  const handlePrev = () => handleDateChange(viewMode === 'today' ? -1 : -7);
  const handleNext = () => handleDateChange(viewMode === 'today' ? 1 : 7);
  const handleJumpToToday = () => setSelectedDate(toLocalISO(new Date()));

  const isToday = selectedDate === toLocalISO(new Date());

  // --- FILTERING LOGIC ---

  // 1. Daily Tasks: Filter by explicit Scheduled Date OR Week fallback
  const myDailyTasks = tasks.filter(t => {
    if (t.userId !== currentUser.userId) return false;
    // Strict day match if available
    if (t.scheduledDate && t.scheduledDate.length >= 10) {
      return t.scheduledDate === selectedDate;
    }
    // Fallback: If no scheduled date, does it belong to this week?
    return t.weekOfDate === currentWeekStart;
  });

  const totalDailyPomos = myDailyTasks.reduce((acc, t) => acc + t.estimatedPomodoros, 0);
  const isOverworked = totalDailyPomos > 16;

  // 2. Weekly Goals: Filter by "Snapped Monday"
  // Logic: Ensure both the goal's date and the current view are snapped to Monday before comparing.
  const myWeeklyGoals = weeklyGoals.filter(g => {
    if (g.userId !== currentUser.userId) return false;
    
    // Safety: normalize the goal's week date from the backend to ensure it is a Monday
    const goalMonday = snapToMonday(g.weekOfDate);
    
    // Compare strictly
    return goalMonday === currentWeekStart;
  });

  // --- ACTIONS ---

  const handleAddDailyTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskDesc.trim()) return;

    onAddTask({
      userId: currentUser.userId,
      taskDescription: newTaskDesc,
      weekOfDate: currentWeekStart, // Link to the week
      scheduledDate: selectedDate,  // Link to the specific day
      estimatedPomodoros: newEst,
    });
    setNewTaskDesc('');
    setNewEst(2);
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    // ⭐️ LOGIC: When creating a goal, we ALWAYS force the date to be the Monday of the current view.
    // Even if today is Tuesday, the goal is saved as "Monday, Dec XX".
    onAddWeeklyGoal({
      userId: currentUser.userId,
      weekOfDate: currentWeekStart, 
      title: newGoalTitle,
      definitionOfDone: newGoalDoD,
      priority: newGoalPriority,
      dependency: newGoalDependency,
      status: 'Not Started',
      retroText: ''
    });
    
    setNewGoalTitle('');
    setNewGoalDoD('');
    setNewGoalDependency('');
    setNewGoalPriority('Medium');
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
    <div className="max-w-2xl mx-auto pb-20 animate-fade-in">
      
      {/* --- HEADER & TOGGLE --- */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">Planner</h2>
          <div className="bg-slate-200 p-1 rounded-lg flex text-sm font-medium">
            <button
              onClick={() => setViewMode('today')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all ${viewMode === 'today' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Daily Pomo</span>
              <span className="sm:hidden">Day</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all ${viewMode === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Weekly Goals</span>
              <span className="sm:hidden">Week</span>
            </button>
          </div>
        </div>

        {/* --- DATE NAVIGATOR --- */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <button onClick={handlePrev} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    {viewMode === 'today' ? 'Focusing On' : 'Week Of'}
                </span>
                
                <div className="relative group cursor-pointer text-center">
                    {viewMode === 'today' ? (
                       <span className="font-bold text-slate-800 text-lg hover:text-indigo-600 transition-colors block">
                          {formatDateFriendly(selectedDate)}
                       </span>
                    ) : (
                       // Weekly View: Show Range explicitly
                       <span className="font-bold text-slate-800 text-lg hover:text-indigo-600 transition-colors block leading-tight">
                         {weekRange.label}
                       </span>
                    )}
                    
                    {/* Native Date Picker for Quick Jumping */}
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    /> 
                </div>
            </div>

            <div className="flex items-center gap-1">
                {!isToday && (
                    <button 
                        onClick={handleJumpToToday}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-bold flex items-center gap-1 mr-1"
                        title="Jump to Today"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                )}
                <button onClick={handleNext} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>

      {/* ================= DAILY VIEW ================= */}
      {viewMode === 'today' && (
        <div className="animate-slide-up">
           <div className={`p-4 rounded-xl border mb-6 flex items-start gap-3 transition-colors ${isOverworked ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
              <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isOverworked ? 'block' : 'hidden'}`} />
              <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${!isOverworked ? 'block' : 'hidden'}`} />
              <div>
                <p className="font-bold text-sm">
                  {isOverworked ? "Capacity Alert" : "Healthy Capacity"}
                </p>
                <p className="text-xs mt-1 opacity-90">
                  {totalDailyPomos} Pomodoros planned. 
                  {isOverworked ? " Consider deferring tasks to tomorrow." : " You are within the recommended limit (16 max)."}
                </p>
              </div>
           </div>

           <form onSubmit={handleAddDailyTask} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-slate-500 mb-1">Task Description</label>
              <input
                type="text"
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="e.g. Code Review"
                required
              />
            </div>
            <div className="w-full md:w-28">
              <label className="block text-xs font-bold text-slate-500 mb-1">Est. Pomos</label>
              <input
                type="number"
                min="1"
                max="16"
                value={newEst}
                onChange={(e) => setNewEst(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
            <button type="submit" className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded transition-colors flex items-center justify-center gap-2 shadow-sm">
              <Plus className="w-5 h-5" />
            </button>
          </form>

          <div className="space-y-3">
            {myDailyTasks.length === 0 && <div className="text-center text-slate-400 py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">No tasks planned for {formatDateFriendly(selectedDate)}.</div>}
            
            {myDailyTasks.map((task) => (
              <div key={task.taskId} className={`bg-white p-4 rounded-xl shadow-sm border transition-all ${task.status === 'Done' ? 'border-green-200 bg-green-50/30' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-4">
                  <button onClick={() => onToggleTaskStatus(task.taskId)} className="mt-1 shrink-0 text-slate-400 hover:text-green-500 transition-colors">
                    {task.status === 'Done' ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6" />}
                  </button>
                  
                  <div className="flex-1">
                    <h3 className={`font-medium ${task.status === 'Done' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                      {task.taskDescription}
                    </h3>
                    <div className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                       <span className="font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">Est: {task.estimatedPomodoros}</span>
                       <span className="font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px]">Actual: {task.actualPomodoros}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-100">
                     <button 
                       onClick={() => onUpdatePomodoro(task.taskId, -1)}
                       disabled={task.actualPomodoros <= 0}
                       className="w-7 h-7 rounded bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-400 flex items-center justify-center transition-colors disabled:opacity-50"
                     >
                       <Minus className="w-3 h-3" />
                     </button>
                     <span className="text-sm font-bold w-4 text-center">{task.actualPomodoros}</span>
                     <button 
                       onClick={() => onUpdatePomodoro(task.taskId, 1)}
                       className="w-7 h-7 rounded bg-white border border-slate-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200 text-slate-400 flex items-center justify-center transition-colors"
                     >
                       <Plus className="w-3 h-3" />
                     </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= WEEKLY VIEW ================= */}
      {viewMode === 'week' && (
        <div className="animate-slide-up">
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Flag className="w-4 h-4 text-indigo-600" />
              <span>Set Goal for: <span className="text-indigo-600">{weekRange.label}</span></span>
            </h3>
            
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Goal Title</label>
                 <input
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. Ship MVP Feature"
                  required
                 />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Definition of Done (DoD)</label>
                 <textarea
                  value={newGoalDoD}
                  onChange={(e) => setNewGoalDoD(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="What does success look like?"
                  rows={2}
                  required
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">Priority</label>
                   <select 
                     value={newGoalPriority}
                     onChange={(e) => setNewGoalPriority(e.target.value as any)}
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
                    value={newGoalDependency}
                    onChange={(e) => setNewGoalDependency(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. Waiting for Design"
                   />
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded hover:bg-indigo-700 transition-colors shadow-sm">
                Add Weekly Goal
              </button>
            </form>
          </div>

          <div className="space-y-4">
            {myWeeklyGoals.length === 0 && (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-slate-500 text-sm">No goals found for {weekRange.label}.</p>
                    <p className="text-xs text-slate-400 mt-1">Add a goal above to get started.</p>
                </div>
            )}
            
            {myWeeklyGoals.map(goal => (
              <div key={goal.goalId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
                <div className="p-4 border-b border-slate-100 flex justify-between items-start">
                  <div className="flex-1 pr-4">
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
                  <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-wider ${getPriorityColor(goal.priority)}`}>
                    {goal.priority}
                  </span>
                </div>
                
                <div className="p-4 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                    <select
                      value={goal.status}
                      onChange={(e) => onUpdateWeeklyGoal(goal.goalId, { status: e.target.value as any })}
                      className={`w-full p-2 text-sm border rounded font-medium focus:ring-1 focus:ring-indigo-500 outline-none
                        ${goal.status === 'Completed' ? 'bg-green-50 border-green-200 text-green-700' : 
                          goal.status === 'In Progress' ? 'bg-blue-50 border-blue-200 text-blue-700' : 
                          'bg-white border-slate-300 text-slate-600'}`}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Weekly Retro / Notes</label>
                    <input
                      type="text"
                      value={goal.retroText || ''}
                      onChange={(e) => onUpdateWeeklyGoal(goal.goalId, { retroText: e.target.value })}
                      placeholder="Reflections on this goal..."
                      className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};

export default Planner;