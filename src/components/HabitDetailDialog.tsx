import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HabitCategory {
  id: string;
  name: string;
  type: 'build' | 'break';
  description: string;
  methods: string;
  quote?: string;
}

interface HabitDetailDialogProps {
  habit: HabitCategory | null;
  isOpen: boolean;
  onClose: () => void;
  onStartHabit: () => void;
}

const HabitDetailDialog = ({ habit, isOpen, onClose, onStartHabit }: HabitDetailDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    timesPerDay: 1,
    customAmount: '',
    reminderTimes: ['']
  });

  const handleStartHabit = async () => {
    if (!user || !habit) return;

    setLoading(true);
    try {
      const habitData = {
        user_id: user.id,
        habit_category_id: habit.id,
        times_per_day: settings.timesPerDay,
        custom_amount: settings.customAmount ? parseInt(settings.customAmount) : null,
        reminder_times: settings.reminderTimes.filter(time => time.trim() !== '')
      };

      const { error } = await supabase
        .from('user_habits')
        .insert(habitData);

      if (error) throw error;

      toast({
        title: "Habit started! 🎉",
        description: `You've started tracking "${habit.name}". Keep it up!`
      });

      onStartHabit();
      onClose();
      
      // Reset settings
      setSettings({
        timesPerDay: 1,
        customAmount: '',
        reminderTimes: ['']
      });
    } catch (error) {
      console.error('Error starting habit:', error);
      toast({
        title: "Failed to start habit",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addReminderTime = () => {
    setSettings(prev => ({
      ...prev,
      reminderTimes: [...prev.reminderTimes, '']
    }));
  };

  const updateReminderTime = (index: number, value: string) => {
    setSettings(prev => ({
      ...prev,
      reminderTimes: prev.reminderTimes.map((time, i) => i === index ? value : time)
    }));
  };

  const removeReminderTime = (index: number) => {
    setSettings(prev => ({
      ...prev,
      reminderTimes: prev.reminderTimes.filter((_, i) => i !== index)
    }));
  };

  if (!habit) return null;

  const isWaterHabit = habit.name.toLowerCase().includes('water');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{habit.name}</DialogTitle>
            <Badge variant={habit.type === 'build' ? 'secondary' : 'destructive'}>
              {habit.type === 'build' ? 'Build' : 'Break'}
            </Badge>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Description */}
          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">{habit.description}</p>
          </div>

          {/* Methods */}
          <div>
            <h4 className="font-medium mb-2">Methods to Success</h4>
            <p className="text-sm text-muted-foreground">{habit.methods}</p>
          </div>

          {/* Quote for break habits */}
          {habit.quote && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Motivation</h4>
              <blockquote className="text-sm italic text-muted-foreground">
                "{habit.quote}"
              </blockquote>
            </div>
          )}

          {/* Settings */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Customize Your Habit</h4>
            
            <div>
              <Label htmlFor="times-per-day">Times per day</Label>
              <Input
                id="times-per-day"
                type="number"
                min="1"
                max="10"
                value={settings.timesPerDay}
                onChange={(e) => setSettings(prev => ({ ...prev, timesPerDay: parseInt(e.target.value) || 1 }))}
              />
            </div>

            {isWaterHabit && (
              <div>
                <Label htmlFor="water-amount">Amount (ml)</Label>
                <Input
                  id="water-amount"
                  type="number"
                  placeholder="e.g., 250"
                  value={settings.customAmount}
                  onChange={(e) => setSettings(prev => ({ ...prev, customAmount: e.target.value }))}
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Reminder times</Label>
                <Button variant="outline" size="sm" onClick={addReminderTime}>
                  Add time
                </Button>
              </div>
              {settings.reminderTimes.map((time, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => updateReminderTime(index, e.target.value)}
                  />
                  {settings.reminderTimes.length > 1 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => removeReminderTime(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleStartHabit} disabled={loading} className="flex-1">
              {loading ? 'Starting...' : 'Start Habit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HabitDetailDialog;