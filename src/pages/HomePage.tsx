import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import WeeklyTracker from '@/components/WeeklyTracker';

interface UserStats {
  daysLoggedIn: number;
  activeHabits: number;
  profile: any;
}

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats>({
    daysLoggedIn: 0,
    activeHabits: 0,
    profile: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserStats();
    }
  }, [user]);

  const loadUserStats = async () => {
    if (!user) return;

    try {
      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Get active habits count
      const { data: habits, count } = await supabase
        .from('user_habits')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_active', true);

      setStats({
        daysLoggedIn: profile?.days_logged_in || 0,
        activeHabits: count || 0,
        profile
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-3/4 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-muted rounded"></div>
            <div className="h-24 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Greeting */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">
          {getGreeting()}, {stats.profile?.display_name || 'there'}! 👋
        </h1>
        <p className="text-muted-foreground">
          Ready to build some amazing habits today?
        </p>
      </div>

      {/* Weekly Tracker */}
      <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
        <CardContent className="pt-6">
          <WeeklyTracker />
        </CardContent>
      </Card>

      {/* Habit Entry Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          onClick={() => navigate('/habits/select/build')}
          className="h-16 flex-col gap-2 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        >
          <span className="text-2xl">🌱</span>
          <span className="text-sm font-medium">Build a Habit</span>
        </Button>
        <Button 
          onClick={() => navigate('/habits/select/break')}
          variant="outline"
          className="h-16 flex-col gap-2 border-destructive/20 text-destructive hover:bg-destructive/10"
        >
          <span className="text-2xl">🚫</span>
          <span className="text-sm font-medium">Break a Habit</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Days Logged In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats.daysLoggedIn}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Habits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary-foreground">
              {stats.activeHabits}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.activeHabits === 0 ? (
            <div className="text-center py-8 space-y-4">
              <div className="text-4xl">🌱</div>
              <h3 className="text-lg font-medium">Start Your Journey</h3>
              <p className="text-muted-foreground text-sm">
                You haven't started any habits yet. Use the buttons above to begin building your perfect routine!
              </p>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="text-4xl">🔥</div>
              <h3 className="text-lg font-medium">Keep Going!</h3>
              <p className="text-muted-foreground text-sm">
                You're doing great with your habits. Check the Habits tab to mark today's progress!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Motivational Quote */}
      <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
        <CardContent className="pt-6">
          <blockquote className="text-center space-y-2">
            <p className="text-sm italic">
              "We are what we repeatedly do. Excellence, then, is not an act, but a habit."
            </p>
            <footer className="text-xs text-muted-foreground">— Aristotle</footer>
          </blockquote>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomePage;