import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import HabitDetailDialog from '@/components/HabitDetailDialog';
import ActiveHabitCard from '@/components/ActiveHabitCard';

interface HabitCategory {
  id: string;
  name: string;
  type: 'build' | 'break';
  description: string;
  methods: string;
  quote?: string;
}

interface UserHabit {
  id: string;
  habit_category_id: string;
  current_streak: number;
  best_streak: number;
  times_per_day: number;
  custom_amount?: number;
  reminder_times?: string[];
  created_at: string;
  habit_categories: HabitCategory;
  completions_today: number;
}

const HabitsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [habitCategories, setHabitCategories] = useState<HabitCategory[]>([]);
  const [userHabits, setUserHabits] = useState<UserHabit[]>([]);
  const [selectedHabit, setSelectedHabit] = useState<HabitCategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Load habit categories
      const { data: categories } = await supabase
        .from('habit_categories')
        .select('*')
        .order('name');

      // Load user's active habits with today's completions
      const { data: habits } = await supabase
        .from('user_habits')
        .select(`
          *,
          habit_categories (*),
          habit_completions!inner (
            id,
            completed_at
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gte('habit_completions.completed_at', new Date().toISOString().split('T')[0]);

      // Count today's completions for each habit
      const habitsWithCompletions = habits?.map(habit => ({
        ...habit,
        current_streak: habit.current_streak || 0,
        best_streak: habit.best_streak || 0,
        times_per_day: habit.times_per_day || 1,
        habit_categories: {
          ...habit.habit_categories,
          type: habit.habit_categories.type as 'build' | 'break'
        },
        completions_today: habit.habit_completions?.filter(completion => {
          const today = new Date().toISOString().split('T')[0];
          const completionDate = new Date(completion.completed_at).toISOString().split('T')[0];
          return completionDate === today;
        }).length || 0
      })) || [];

      setHabitCategories((categories || []).map(cat => ({
        ...cat,
        type: cat.type as 'build' | 'break'
      })));
      setUserHabits(habitsWithCompletions);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildHabits = habitCategories.filter(h => h.type === 'build');
  const breakHabits = habitCategories.filter(h => h.type === 'break');

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Your Habits</h1>
        <p className="text-muted-foreground">Track your progress and build consistency</p>
      </div>

      {/* Active Habits */}
      {userHabits.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Active Habits</h2>
          <div className="grid gap-4">
            {userHabits.map((habit) => (
              <ActiveHabitCard 
                key={habit.id} 
                habit={habit} 
                onUpdate={loadData}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Habits */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Start New Habits</h2>
        
        <Tabs defaultValue="build" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="build" className="flex items-center gap-2">
              <span className="text-lg">🌱</span>
              Build Habits
            </TabsTrigger>
            <TabsTrigger value="break" className="flex items-center gap-2">
              <span className="text-lg">🚫</span>
              Break Habits
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="build" className="space-y-3">
            {buildHabits.map((habit) => (
              <Card 
                key={habit.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedHabit(habit)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{habit.name}</CardTitle>
                    <Badge variant="secondary">Build</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{habit.description}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          <TabsContent value="break" className="space-y-3">
            {breakHabits.map((habit) => (
              <Card 
                key={habit.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedHabit(habit)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{habit.name}</CardTitle>
                    <Badge variant="destructive">Break</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{habit.description}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Habit Detail Dialog */}
      <HabitDetailDialog
        habit={selectedHabit}
        isOpen={selectedHabit !== null}
        onClose={() => setSelectedHabit(null)}
        onStartHabit={loadData}
      />
    </div>
  );
};

export default HabitsPage;