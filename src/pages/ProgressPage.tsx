import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface HabitProgress {
  id: string;
  name: string;
  type: 'build' | 'break';
  current_streak: number;
  best_streak: number;
  total_completions: number;
  days_active: number;
  success_rate: number;
  last_7_days: boolean[];
}

const ProgressPage = () => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<HabitProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProgressData();
    }
  }, [user]);

  const loadProgressData = async () => {
    if (!user) return;

    try {
      // Get user habits with completions
      const { data: userHabits } = await supabase
        .from('user_habits')
        .select(`
          id,
          current_streak,
          best_streak,
          created_at,
          habit_categories (name, type),
          habit_completions (completed_at)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!userHabits) return;

      // Process each habit's progress
      const progressData = userHabits.map(habit => {
        const completions = habit.habit_completions || [];
        const createdAt = new Date(habit.created_at);
        const today = new Date();
        const daysActive = Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // Calculate last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const hasCompletion = completions.some(completion => {
            const completionDate = new Date(completion.completed_at).toISOString().split('T')[0];
            return completionDate === dateStr;
          });
          
          last7Days.push(hasCompletion);
        }

        const successRate = daysActive > 0 ? (completions.length / daysActive) * 100 : 0;

        return {
          id: habit.id,
          name: habit.habit_categories?.name || '',
          type: habit.habit_categories?.type as 'build' | 'break',
          current_streak: habit.current_streak || 0,
          best_streak: habit.best_streak || 0,
          total_completions: completions.length,
          days_active: daysActive,
          success_rate: Math.round(successRate),
          last_7_days: last7Days
        };
      });

      setHabits(progressData);
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Progress</h1>
        <p className="text-muted-foreground">Track your habit journey and celebrate your wins</p>
      </div>

      {habits.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium mb-2">No Progress Yet</h3>
            <p className="text-muted-foreground">
              Start some habits to see your progress here!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {habits.map((habit) => (
            <Card key={habit.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{habit.name}</CardTitle>
                  <Badge variant={habit.type === 'build' ? 'secondary' : 'destructive'}>
                    {habit.type === 'build' ? 'Build' : 'Break'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Streaks */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-primary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{habit.current_streak}</div>
                    <div className="text-sm text-muted-foreground">Current Streak</div>
                  </div>
                  <div className="text-center p-3 bg-secondary/10 rounded-lg">
                    <div className="text-2xl font-bold text-secondary-foreground">{habit.best_streak}</div>
                    <div className="text-sm text-muted-foreground">Best Streak</div>
                  </div>
                </div>

                {/* Success Rate */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Success Rate</span>
                    <span>{habit.success_rate}%</span>
                  </div>
                  <Progress value={habit.success_rate} className="h-2" />
                </div>

                {/* Last 7 Days */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Last 7 Days</div>
                  <div className="flex gap-1">
                    {habit.last_7_days.map((completed, index) => {
                      const date = new Date();
                      date.setDate(date.getDate() - (6 - index));
                      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                      const dayName = dayNames[date.getDay()];
                      
                      return (
                        <div key={index} className="flex-1 text-center">
                          <div className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-medium ${
                            completed 
                              ? 'bg-success text-success-foreground' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {completed ? '✓' : '○'}
                          </div>
                          <div className="text-xs text-muted-foreground">{dayName}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t">
                  <span>Total Completions: {habit.total_completions}</span>
                  <span>Active for {habit.days_active} days</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgressPage;