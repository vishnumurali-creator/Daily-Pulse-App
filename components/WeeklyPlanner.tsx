import React, { useState, useEffect } from 'react';
import { User, Task, WeeklyGoal } from '../types';
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

// --- Date Helpers ---
// Use local date string (YYYY-MM-DD) to avoid timezone shifts when user is just thinking in "Days"
const toDateStr = (d: Date) => {
  const offset = d.getTimezoneOffset() * 60000;
  const localDate = new Date(d.getTime() - offset);
  return localDate.toISOString().split('T')[0];
};

const getStartOfWeek = (dateStr: string) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(d.setDate(diff));
  return toDateStr(monday);
};

const formatDateFriendly = (dateStr: string) => {
  // Parse date manually to avoid timezone issues with Date constructor
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

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
  const [viewMode, setViewMode] = useState<'today' | 'week'>('today');
  const [selectedDate, setSelectedDate] = useState<string>(toDateStr(new Date()));
  
  // Daily State
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newEst, setNewEst] = useState<number>(2);

  // Weekly Goal State
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDoD, setNewGoalDoD] = useState('');
  const [newGoalPriority, setNewGoalPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newGoalDependency, setNewGoalDependency] = useState('');

  // Reset inputs when switching days to avoid confusion
  useEffect(() => {
    setNewTaskDesc('');
    setNewEst(2);
  }, [selectedDate]);

  // --- Date Navigation Handlers ---
  const handlePrev = () => {
    // Manual date calculation to ensure string stability
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + (viewMode === 'today' ? -1 : -7));
    setSelectedDate(toDateStr(d));
  };

  const handleNext = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + (viewMode === 'today' ? 1 : 7));
    setSelectedDate(toDateStr(d));
  };

  const handleJumpToToday = () => {
    setSelectedDate(toDateStr(new Date()));
  };

  const currentWeekStart = getStartOfWeek(selectedDate);

  // --- Logic for Daily View ---
  const myDailyTasks = tasks.filter((t) => t.userId === currentUser.userId);
  
  // Filter tasks for the selected date.
  const filteredDailyTasks = myDailyTasks.filter(t => {
    // Primary: Match specific date
    if (t.scheduledDate) {
      return t.scheduledDate === selectedDate;
    }
    // Fallback: Legacy tasks without scheduledDate, match by week
    return t.weekOfDate === currentWeekStart;
  });

  // Calculate totals
  const totalDailyPomos = filteredDailyTasks.reduce((acc, t) => acc + t.estimatedPomodoros, 0);
  const isOverworked = totalDailyPomos > 16;

  const handleAddDailyTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskDesc.trim()) {
      onAddTask({
        userId: currentUser.userId,
        taskDescription: newTaskDesc,
        weekOfDate: currentWeekStart,
        scheduledDate: selectedDate,
        estimatedPomodoros: newEst,
      });
      setNewTaskDesc('');
      setNewEst(2);
    }
  };

  // --- Logic for Weekly View ---
  const myWeeklyGoals = weeklyGoals.filter(g => 
    g.userId === currentUser.userId && 
    g.weekOfDate === currentWeekStart
  );

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGoalTitle.trim()) {
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
    }
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200';
      case 'Medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const isToday = selectedDate === toDateStr(new Date());

  return (
    <div className="max-w-2xl mx-auto pb-20">
      
      {/* Header & Toggle */}
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

        {/* Date Navigation Bar */}
        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <button onClick={handlePrev} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    {viewMode === 'today' ? 'Focusing On' : 'Week Of'}
                </span>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-lg">
                        {viewMode === 'today' ? formatDateFriendly(selectedDate) : formatDateFriendly(currentWeekStart)}
                    </span>
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                        className="w-5 h-5 opacity-0 absolute cursor-pointer" 
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
        <div className="animate-fade-in">
           {/* Overwork Warning */}
           <div className={`p-4 rounded-xl border mb-6 flex items-start gap-3 transition-colors ${isOverworked ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
              <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isOverworked ? 'block' : 'hidden'}`} />
              <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${!isOverworked ? 'block' : 'hidden'}`} />
              <div>
                <p className="font-bold text-sm">
                  {isOverworked ? "Overwork Alert!" : "Healthy Capacity"}
                </p>
                <p className="text-sm mt-1">
                  You have planned <strong>{totalDailyPomos}</strong> pomodoros for {formatDateFriendly(selectedDate)}. 
                  {isOverworked ? " Ideally, aim for 16 or fewer to avoid burnout." : " You are within the recommended limit (16 max)."}
                </p>
              </div>
           </div>

           {/* Add Task */}
           <form onSubmit={handleAddDailyTask} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-slate-500 mb-1">Task Description</label>
              <input
                type="text"
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g. Code Review"
                required
              />
            </div>
            <div className="w-full md:w-32">
              <label className="block text-xs font-bold text-slate-500 mb-1">Est. Pomos</label>
              <input
                type="number"
                min="1"
                max="16"
                value={newEst}
                onChange={(e) => setNewEst(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button type="submit" className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded transition-colors flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" />
            </button>
          </form>

          {/* Task List */}
          <div className="space-y-3">
            {filteredDailyTasks.length === 0 && <div className="text-center text-slate-400 py-6">No tasks planned for {formatDateFriendly(selectedDate)}.</div>}
            {filteredDailyTasks.map((task) => (
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
                       <span className="font-semibold bg-slate-100 px-1.5 py-0.5 rounded">Est: {task.estimatedPomodoros}</span>
                       <span className="font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">Actual: {task.actualPomodoros}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
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
        <div className="animate-fade-in">
          
          {/* Add Goal Form */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-8">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Flag className="w-4 h-4 text-indigo-600" />
              Set Goal for Week of {formatDateFriendly(currentWeekStart)}
            </h3>
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Goal Title</label>
                 <input
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. Ship Phase 1"
                  required
                 />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Definition of Done</label>
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
                     className="w-full p-2 border border-slate-300 rounded text-sm bg-white"
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
                    className="w-full p-2 border border-slate-300 rounded text-sm"
                    placeholder="e.g. Design Team"
                   />
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2 rounded hover:bg-indigo-700 transition-colors">
                Add Goal
              </button>
            </form>
          </div>

          {/* Goals List */}
          <div className="space-y-4">
            {myWeeklyGoals.length === 0 && <div className="text-center text-slate-400">No goals set for this week.</div>}
            
            {myWeeklyGoals.map(goal => (
              <div key={goal.goalId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800">{goal.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">DoD: {goal.definitionOfDone}</p>
                    {goal.dependency && (
                      <p className="text-xs text-amber-600 mt-1 font-medium">⚠️ Dependency: {goal.dependency}</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityColor(goal.priority)}`}>
                    {goal.priority}
                  </span>
                </div>
                
                <div className="p-4 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Status Updater */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                    <select
                      value={goal.status}
                      onChange={(e) => onUpdateWeeklyGoal(goal.goalId, { status: e.target.value as any })}
                      className="w-full p-1.5 text-sm border border-slate-300 rounded bg-white"
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  
                  {/* Retro Updater */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Weekly Retro</label>
                    <input
                      type="text"
                      value={goal.retroText || ''}
                      onChange={(e) => onUpdateWeeklyGoal(goal.goalId, { retroText: e.target.value })}
                      placeholder="Thoughts/Reflections..."
                      className="w-full p-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
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