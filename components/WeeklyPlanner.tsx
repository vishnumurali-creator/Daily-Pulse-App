import React, { useState } from 'react';
import { User, Task } from '../types';
import { Plus, Clock, CheckCircle2, Circle, AlertTriangle, Calendar, CalendarDays } from 'lucide-react';

interface PlannerProps {
  currentUser: User;
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'taskId' | 'actualPomodoros' | 'status'>) => void;
  onUpdatePomodoro: (taskId: string, increment: number) => void;
  onToggleStatus: (taskId: string) => void;
}

const Planner: React.FC<PlannerProps> = ({
  currentUser,
  tasks,
  onAddTask,
  onUpdatePomodoro,
  onToggleStatus,
}) => {
  const [viewMode, setViewMode] = useState<'today' | 'week'>('today');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newEst, setNewEst] = useState<number>(2);

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter tasks based on view mode
  const myTasks = tasks.filter((t) => t.userId === currentUser.userId);
  
  const displayedTasks = myTasks.filter(t => {
    if (viewMode === 'today') {
        // Show tasks specifically for today OR tasks marked 'To Do' that are past due (carry over)
        return t.scheduledDate === todayStr || (t.status === 'To Do' && t.scheduledDate && t.scheduledDate < todayStr);
    }
    return true; // Week view shows all
  });

  const totalEstimated = displayedTasks.reduce((acc, t) => acc + t.estimatedPomodoros, 0);
  const totalActual = displayedTasks.reduce((acc, t) => acc + t.actualPomodoros, 0);
  const isOvercommitted = viewMode === 'week' && totalEstimated > 60;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskDesc.trim()) {
      onAddTask({
        userId: currentUser.userId,
        taskDescription: newTaskDesc,
        weekOfDate: todayStr, // Simplified week logic
        scheduledDate: viewMode === 'today' ? todayStr : undefined,
        estimatedPomodoros: newEst,
      });
      setNewTaskDesc('');
      setNewEst(2);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20">
      
      {/* Header & Toggle */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-800">Focus Planner</h2>
          
          <div className="bg-slate-200 p-1 rounded-lg flex text-sm font-medium">
            <button
              onClick={() => setViewMode('today')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all ${viewMode === 'today' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Calendar className="w-4 h-4" />
              Today
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all ${viewMode === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <CalendarDays className="w-4 h-4" />
              Week
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-xs text-slate-500 uppercase font-bold mb-1">
               {viewMode === 'today' ? "Today's Focus" : "Weekly Capacity"}
             </p>
             <div className="flex items-baseline gap-1">
               <span className="text-2xl font-bold text-slate-900">{totalActual}</span>
               <span className="text-sm text-slate-400">/ {totalEstimated} Pomos</span>
             </div>
           </div>
           
           {/* Mini Progress Bar */}
           <div className="flex flex-col items-end gap-1 w-1/2">
             <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
               <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((totalActual / (totalEstimated || 1)) * 100, 100)}%` }}
               ></div>
             </div>
             <span className="text-xs text-slate-400">{totalEstimated > 0 ? Math.round((totalActual/totalEstimated)*100) : 0}% Complete</span>
           </div>
        </div>
      </div>

      {isOvercommitted && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">
            <strong>Capacity Warning:</strong> You've planned over 60 Pomodoros. Consider deferring some tasks.
          </p>
        </div>
      )}

      {/* Add Task Form */}
      <form onSubmit={handleAdd} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-500 mb-1">
             {viewMode === 'today' ? "Task for Today" : "Task for this Week"}
          </label>
          <input
            type="text"
            value={newTaskDesc}
            onChange={(e) => setNewTaskDesc(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
            placeholder={viewMode === 'today' ? "e.g. Finish Code Review" : "e.g. Q3 Planning"}
            required
          />
        </div>
        <div className="w-full md:w-32">
          <label className="block text-xs font-bold text-slate-500 mb-1">Est. Pomodoros</label>
          <input
            type="number"
            min="1"
            max="20"
            value={newEst}
            onChange={(e) => setNewEst(Number(e.target.value))}
            className="w-full p-2 border border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          type="submit"
          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="md:hidden">Add Task</span>
        </button>
      </form>

      {/* Task List */}
      <div className="space-y-3">
        {displayedTasks.length === 0 && (
            <div className="text-center text-slate-400 py-10 flex flex-col items-center">
                <div className="bg-slate-100 p-4 rounded-full mb-3">
                    {viewMode === 'today' ? <Calendar className="w-6 h-6 text-slate-300"/> : <CalendarDays className="w-6 h-6 text-slate-300"/>}
                </div>
                <p>No tasks planned for {viewMode === 'today' ? 'today' : 'this week'}.</p>
            </div>
        )}
        
        {displayedTasks.map((task) => (
          <div key={task.taskId} className={`bg-white p-4 rounded-xl shadow-sm border transition-all ${task.status === 'Done' ? 'border-green-200 bg-green-50/30' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between gap-4">
              <button onClick={() => onToggleStatus(task.taskId)} className="mt-1 shrink-0 text-slate-400 hover:text-green-500 transition-colors">
                {task.status === 'Done' ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6" />}
              </button>
              
              <div className="flex-1">
                <h3 className={`font-medium ${task.status === 'Done' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                  {task.taskDescription}
                </h3>
                <div className="flex items-center gap-4 mt-2">
                   <div className="text-xs text-slate-500 flex items-center gap-1">
                     <span className="font-semibold">Est:</span> {task.estimatedPomodoros} 🍅
                   </div>
                   <div className="text-xs text-slate-500 flex items-center gap-1">
                     <span className="font-semibold">Actual:</span> {task.actualPomodoros}
                   </div>
                   {viewMode === 'week' && task.scheduledDate && (
                       <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                           {task.scheduledDate === todayStr ? 'Today' : task.scheduledDate}
                       </span>
                   )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-1">
                 <button 
                   onClick={() => onUpdatePomodoro(task.taskId, 1)}
                   className="w-8 h-8 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors"
                   title="Add Pomodoro"
                 >
                   <Plus className="w-4 h-4" />
                 </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Planner;