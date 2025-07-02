-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  days_logged_in INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create habit categories table
CREATE TABLE public.habit_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('build', 'break')),
  description TEXT,
  methods TEXT,
  quote TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user habits table
CREATE TABLE public.user_habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_category_id UUID NOT NULL REFERENCES public.habit_categories(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  times_per_day INTEGER DEFAULT 1,
  custom_amount INTEGER,
  reminder_times TEXT[], -- JSON array of times
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create habit completions table
CREATE TABLE public.habit_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_habit_id UUID NOT NULL REFERENCES public.user_habits(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  amount INTEGER DEFAULT 1
);

-- Create communities table
CREATE TABLE public.communities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_private BOOLEAN DEFAULT false,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community members table
CREATE TABLE public.community_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Habit categories policies (public read)
CREATE POLICY "Anyone can view habit categories" ON public.habit_categories FOR SELECT USING (true);

-- User habits policies
CREATE POLICY "Users can manage their own habits" ON public.user_habits FOR ALL USING (auth.uid() = user_id);

-- Habit completions policies
CREATE POLICY "Users can manage their completions" ON public.habit_completions 
FOR ALL USING (auth.uid() = (SELECT user_id FROM public.user_habits WHERE id = user_habit_id));

-- Communities policies
CREATE POLICY "Users can view communities they're members of" ON public.communities 
FOR SELECT USING (
  auth.uid() = owner_id OR 
  EXISTS (SELECT 1 FROM public.community_members WHERE community_id = id AND user_id = auth.uid() AND status = 'accepted')
);
CREATE POLICY "Users can create communities" ON public.communities FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their communities" ON public.communities FOR UPDATE USING (auth.uid() = owner_id);

-- Community members policies
CREATE POLICY "Users can view members of their communities" ON public.community_members 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.communities WHERE id = community_id AND owner_id = auth.uid()) OR
  user_id = auth.uid()
);
CREATE POLICY "Users can join communities" ON public.community_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can manage members" ON public.community_members 
FOR UPDATE USING (EXISTS (SELECT 1 FROM public.communities WHERE id = community_id AND owner_id = auth.uid()));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_habits_updated_at BEFORE UPDATE ON public.user_habits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default habit categories
INSERT INTO public.habit_categories (name, type, description, methods, quote) VALUES
('Drink Water', 'build', 'Stay hydrated throughout the day', 'Set reminders, carry a water bottle, track intake', null),
('Wake Up Early', 'build', 'Start your day with more energy and productivity', 'Set a consistent sleep schedule, avoid screens before bed, use natural light alarm', null),
('Exercise Daily', 'build', 'Maintain physical fitness and health', 'Start with 15 minutes, choose activities you enjoy, schedule it like an appointment', null),
('Read Books', 'build', 'Expand knowledge and improve focus', 'Read for 20 minutes daily, choose interesting topics, keep books visible', null),
('Meditate', 'build', 'Reduce stress and improve mental clarity', 'Start with 5 minutes, use guided apps, find a quiet space', null),
('Stop Procrastinating', 'break', 'Overcome delays and increase productivity', 'Break tasks into smaller steps, use the 2-minute rule, eliminate distractions', 'The way to get started is to quit talking and begin doing. - Walt Disney'),
('Reduce Phone Use', 'break', 'Minimize digital distractions and improve focus', 'Use app timers, create phone-free zones, find alternative activities', 'Almost everything will work again if you unplug it for a few minutes, including you. - Anne Lamott'),
('Stop Negative Self-Talk', 'break', 'Improve mental health and self-confidence', 'Practice mindfulness, challenge negative thoughts, use positive affirmations', 'You are your own worst enemy. But you can also be your own greatest ally.'),
('Quit Junk Food', 'break', 'Improve health and energy levels', 'Plan healthy meals, remove temptations, find healthy alternatives', 'Take care of your body. It''s the only place you have to live. - Jim Rohn'),
('Stop Staying Up Late', 'break', 'Improve sleep quality and daily energy', 'Set a bedtime routine, avoid caffeine late, create a relaxing environment', 'Sleep is the best meditation. - Dalai Lama');