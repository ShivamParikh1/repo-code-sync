import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface WeeklyTrackerProps {
  onDataLoad?: (data: DayData[]) => void;
}

interface DayData {
  date: string;
  completionRate: number;
  completedHabits: number;
  totalHabits: number;
}

const WeeklyTracker = ({ onDataLoad }: WeeklyTrackerProps) => {
  const { user } = useAuth();
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadWeeklyData();
    }
  }, [user]);

  const loadWeeklyData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get past 7 days including today
      const dates = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }

      // Get user's active habits
      const { data: userHabits } = await supabase
        .from('user_habits')
        .select('id, created_at')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!userHabits) {
        setWeekData(dates.map(date => ({ date, completionRate: 0, completedHabits: 0, totalHabits: 0 })));
        return;
      }

      // Get completions for all habits and dates
      const weeklyData: DayData[] = [];

      for (const date of dates) {
        // Filter habits that were created before or on this date
        const habitsActiveOnDate = userHabits.filter(habit => {
          const habitCreatedDate = new Date(habit.created_at).toISOString().split('T')[0];
          return habitCreatedDate <= date;
        });

        if (habitsActiveOnDate.length === 0) {
          weeklyData.push({ date, completionRate: 0, completedHabits: 0, totalHabits: 0 });
          continue;
        }

        // Get completions for this date
        const { data: completions } = await supabase
          .from('habit_completions')
          .select('user_habit_id')
          .in('user_habit_id', habitsActiveOnDate.map(h => h.id))
          .gte('completed_at', date)
          .lt('completed_at', new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        const completedHabits = new Set(completions?.map(c => c.user_habit_id) || []).size;
        const totalHabits = habitsActiveOnDate.length;
        const completionRate = totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0;

        weeklyData.push({
          date,
          completionRate: Math.round(completionRate),
          completedHabits,
          totalHabits
        });
      }

      setWeekData(weeklyData);
      onDataLoad?.(weeklyData);
    } catch (error) {
      console.error('Error loading weekly data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayLabel = (date: string) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayDate = new Date(date);
    const today = new Date();
    
    if (date === today.toISOString().split('T')[0]) {
      return 'Today';
    }
    
    return dayNames[dayDate.getDay()];
  };

  const getCircleColor = (completionRate: number) => {
    if (completionRate === 0) return 'bg-muted';
    if (completionRate < 50) return 'bg-destructive/60';
    if (completionRate < 100) return 'bg-warning/60';
    return 'bg-success';
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground text-center">Weekly Progress</h3>
        <div className="flex justify-between items-center">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex flex-col items-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse"></div>
              <span className="text-xs text-muted-foreground">...</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground text-center">Weekly Progress</h3>
      <div className="flex justify-between items-center">
        {weekData.map((day, index) => (
          <div key={day.date} className="flex flex-col items-center space-y-1">
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all duration-300 ${getCircleColor(day.completionRate)}`}
              title={`${day.completedHabits}/${day.totalHabits} habits completed`}
            >
              {day.completionRate}%
            </div>
            <span className="text-xs text-muted-foreground">
              {getDayLabel(day.date)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyTracker;