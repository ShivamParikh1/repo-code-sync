import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Community {
  id: string;
  name: string;
  code: string;
  is_private: boolean;
  owner_id: string;
  created_at: string;
  member_count?: number;
  is_owner?: boolean;
  member_status?: 'pending' | 'accepted' | 'rejected';
}

const CommunityPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [newCommunity, setNewCommunity] = useState({
    name: '',
    isPrivate: false
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadCommunities();
    }
  }, [user]);

  const loadCommunities = async () => {
    if (!user) return;

    try {
      // Get communities where user is owner or member
      const { data: memberCommunities } = await supabase
        .from('community_members')
        .select(`
          status,
          communities (
            id,
            name,
            code,
            is_private,
            owner_id,
            created_at
          )
        `)
        .eq('user_id', user.id);

      const { data: ownedCommunities } = await supabase
        .from('communities')
        .select('*')
        .eq('owner_id', user.id);

      // Combine and format communities
      const allCommunities: Community[] = [];

      // Add owned communities
      if (ownedCommunities) {
        allCommunities.push(...ownedCommunities.map(community => ({
          ...community,
          is_owner: true,
          member_status: 'accepted' as const
        })));
      }

      // Add member communities (avoid duplicates)
      if (memberCommunities) {
        memberCommunities.forEach(member => {
          if (member.communities && !allCommunities.find(c => c.id === member.communities.id)) {
            allCommunities.push({
              ...member.communities,
              is_owner: false,
              member_status: member.status as 'pending' | 'accepted' | 'rejected'
            });
          }
        });
      }

      setCommunities(allCommunities);
    } catch (error) {
      console.error('Error loading communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCommunityCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateCommunity = async () => {
    if (!user || !newCommunity.name.trim()) return;

    try {
      const code = generateCommunityCode();
      
      const { data, error } = await supabase
        .from('communities')
        .insert({
          name: newCommunity.name.trim(),
          code,
          is_private: newCommunity.isPrivate,
          owner_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Community created! 🎉",
        description: `Your community "${newCommunity.name}" has been created with code: ${code}`
      });

      setNewCommunity({ name: '', isPrivate: false });
      setCreateDialogOpen(false);
      loadCommunities();
    } catch (error) {
      console.error('Error creating community:', error);
      toast({
        title: "Failed to create community",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleJoinCommunity = async () => {
    if (!user || !joinCode.trim()) return;

    try {
      // First, find the community by code
      const { data: community } = await supabase
        .from('communities')
        .select('*')
        .eq('code', joinCode.trim().toUpperCase())
        .single();

      if (!community) {
        toast({
          title: "Community not found",
          description: "Please check the code and try again",
          variant: "destructive"
        });
        return;
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('community_members')
        .select('*')
        .eq('community_id', community.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        toast({
          title: "Already a member",
          description: "You're already part of this community",
          variant: "destructive"
        });
        return;
      }

      // Join the community
      const { error } = await supabase
        .from('community_members')
        .insert({
          community_id: community.id,
          user_id: user.id,
          status: community.is_private ? 'pending' : 'accepted'
        });

      if (error) throw error;

      toast({
        title: community.is_private ? "Request sent! ⏳" : "Joined community! 🎉",
        description: community.is_private 
          ? "Your request to join has been sent to the community owner"
          : `Welcome to "${community.name}"!`
      });

      setJoinCode('');
      loadCommunities();
    } catch (error) {
      console.error('Error joining community:', error);
      toast({
        title: "Failed to join community",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

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
        <h1 className="text-2xl font-bold mb-2">My Community</h1>
        <p className="text-muted-foreground">Connect with others and track habits together</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Join Community</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="join-code">Community Code</Label>
              <Input
                id="join-code"
                placeholder="Enter 6-character code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
            </div>
            <Button onClick={handleJoinCommunity} className="w-full">
              Join Community
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Community</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">Create New Community</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Community</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="community-name">Community Name</Label>
                    <Input
                      id="community-name"
                      placeholder="Enter community name"
                      value={newCommunity.name}
                      onChange={(e) => setNewCommunity(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="private-community"
                      checked={newCommunity.isPrivate}
                      onCheckedChange={(checked) => setNewCommunity(prev => ({ ...prev, isPrivate: checked }))}
                    />
                    <Label htmlFor="private-community">Private community (require approval)</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleCreateCommunity} className="flex-1">
                      Create
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Communities List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Your Communities</h2>
        
        {communities.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-medium mb-2">No Communities Yet</h3>
              <p className="text-muted-foreground">
                Create or join a community to start tracking habits with friends!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {communities.map((community) => (
              <Card key={community.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{community.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {community.is_owner && <Badge variant="secondary">Owner</Badge>}
                      {community.is_private && <Badge variant="outline">Private</Badge>}
                      {community.member_status === 'pending' && <Badge variant="outline">Pending</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Code: <code className="bg-muted px-2 py-1 rounded">{community.code}</code>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityPage;