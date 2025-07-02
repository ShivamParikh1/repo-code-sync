import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserHabit {
  id: string;
  habit_category_id: string;
  current_streak: number;
  best_streak: number;
  times_per_day: number;
  custom_amount?: number;
  reminder_times?: string[];
  created_at: string;
  habit_categories: {
    name: string;
    type: 'build' | 'break';
  };
  completions_today: number;
}

interface ActiveHabitCardProps {
  habit: UserHabit;
  onUpdate: () => void;
}

const ActiveHabitCard = ({ habit, onUpdate }: ActiveHabitCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const isCompleted = habit.completions_today >= habit.times_per_day;
  const progressPercentage = Math.min((habit.completions_today / habit.times_per_day) * 100, 100);

  const handleComplete = async () => {
    if (!user || isCompleted) return;

    setLoading(true);
    try {
      // Add completion
      const { error } = await supabase
        .from('habit_completions')
        .insert({
          user_habit_id: habit.id,
          amount: habit.custom_amount || 1
        });

      if (error) throw error;

      // Update streak
      const newStreak = habit.current_streak + 1;
      const newBestStreak = Math.max(newStreak, habit.best_streak);

      await supabase
        .from('user_habits')
        .update({
          current_streak: newStreak,
          best_streak: newBestStreak
        })
        .eq('id', habit.id);

      // Show success animation
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      toast({
        title: "Great job! 🎉",
        description: "Keep it up! You're building an amazing habit.",
      });

      onUpdate();
    } catch (error) {
      console.error('Error completing habit:', error);
      toast({
        title: "Failed to mark as complete",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async () => {
    if (!user || habit.completions_today === 0) return;

    setLoading(true);
    try {
      // Get the latest completion for today
      const today = new Date().toISOString().split('T')[0];
      const { data: completions } = await supabase
        .from('habit_completions')
        .select('id')
        .eq('user_habit_id', habit.id)
        .gte('completed_at', today)
        .order('completed_at', { ascending: false })
        .limit(1);

      if (completions && completions.length > 0) {
        // Delete the latest completion
        await supabase
          .from('habit_completions')
          .delete()
          .eq('id', completions[0].id);

        toast({
          title: "Undone",
          description: "Last completion has been removed.",
        });

        onUpdate();
      }
    } catch (error) {
      console.error('Error undoing completion:', error);
      toast({
        title: "Failed to undo",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`transition-all duration-500 ${showSuccess ? 'bg-success/10 border-success' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{habit.habit_categories.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={habit.habit_categories.type === 'build' ? 'secondary' : 'destructive'}>
              {habit.habit_categories.type === 'build' ? 'Build' : 'Break'}
            </Badge>
            {isCompleted && <span className="text-lg">✅</span>}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Today's Progress</span>
            <span>{habit.completions_today}/{habit.times_per_day}</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Streaks */}
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-1">
            <span className="text-lg">🔥</span>
            <span>Current: {habit.current_streak}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg">🏆</span>
            <span>Best: {habit.best_streak}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={handleComplete}
            disabled={loading || isCompleted}
            className="flex-1"
            variant={isCompleted ? "outline" : "default"}
          >
            {loading ? 'Updating...' : isCompleted ? 'Completed!' : 'Mark Complete'}
          </Button>
          {habit.completions_today > 0 && (
            <Button 
              onClick={handleUndo}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              Undo
            </Button>
          )}
        </div>

        {showSuccess && (
          <div className="text-center text-success font-medium animate-pulse">
            Great job! Keep it up! 🎉
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActiveHabitCard;