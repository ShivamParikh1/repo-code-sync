import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowDown, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import HabitDetailDialog from '@/components/HabitDetailDialog';

interface HabitCategory {
  id: string;
  name: string;
  type: 'build' | 'break';
  description: string;
  methods: string;
  quote?: string;
}

const HabitSelectPage = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: 'build' | 'break' }>();
  const [habits, setHabits] = useState<HabitCategory[]>([]);
  const [filteredHabits, setFilteredHabits] = useState<HabitCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHabit, setSelectedHabit] = useState<HabitCategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHabits();
  }, [type]);

  useEffect(() => {
    filterHabits();
  }, [habits, searchQuery]);

  const loadHabits = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('habit_categories')
        .select('*')
        .eq('type', type)
        .order('name');

      const typedData = (data || []).map(habit => ({
        ...habit,
        type: habit.type as 'build' | 'break'
      }));

      setHabits(typedData);
    } catch (error) {
      console.error('Error loading habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterHabits = () => {
    if (!searchQuery.trim()) {
      setFilteredHabits(habits);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = habits.filter(habit => 
      habit.name.toLowerCase().includes(query) || 
      habit.description.toLowerCase().includes(query)
    );
    setFilteredHabits(filtered);
  };

  const handleHabitStart = () => {
    navigate('/habits');
    setSelectedHabit(null);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowDown className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded"></div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowDown className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-bold flex-1 text-center">
          {type === 'build' ? '🌱 Build Habits' : '🚫 Break Habits'}
        </h1>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Search ${type} habits...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Habits List */}
      <div className="space-y-3">
        {filteredHabits.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <div className="text-4xl mb-4">
                {searchQuery ? '🔍' : type === 'build' ? '🌱' : '🚫'}
              </div>
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? 'No habits found' : 'No habits available'}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? `Try searching for different terms related to ${type} habits`
                  : `We're working on adding more ${type} habits soon!`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredHabits.map((habit) => (
            <Card 
              key={habit.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedHabit(habit)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{habit.name}</CardTitle>
                  <Badge variant={habit.type === 'build' ? 'secondary' : 'destructive'}>
                    {habit.type === 'build' ? 'Build' : 'Break'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {habit.description}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Habit Detail Dialog */}
      <HabitDetailDialog
        habit={selectedHabit}
        isOpen={selectedHabit !== null}
        onClose={() => setSelectedHabit(null)}
        onStartHabit={handleHabitStart}
      />
    </div>
  );
};

export default HabitSelectPage;