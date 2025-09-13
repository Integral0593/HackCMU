import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import StatusBoard from "@/components/StatusBoard"; 
import StatusDisplay from "@/components/StatusDisplay";
import ScheduleForm from "@/components/ScheduleForm";
import StudyPartnerRecommendations from "@/components/StudyPartnerRecommendations";
import UserDetailModal from "@/components/UserDetailModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Schedule, 
  InsertSchedule, 
  CurrentStatusResponse, 
  StudyPartner,
  SearchUser,
  FriendWithUser
} from "@shared/schema";
import { Search, Users, UserPlus, UserX, BookOpen, Plus } from "lucide-react";
import logoImage from "@assets/logo_1757730069515.png";
import dashboardIcon from "@assets/dashboard_icon_1757730011816.png";
import scheduleIcon from "@assets/schedule_icon_1757730011819.png";
import partnersIcon from "@assets/partners_icon_1757730011818.png";

type StatusType = "studying" | "free" | "in_class" | "busy" | "tired" | "social";

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [manualStatus, setManualStatus] = useState<StatusType | null>(null);
  const [manualMessage, setManualMessage] = useState<string | undefined>(undefined);
  // Remove state since we're using react-query now
  
  // User detail modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Partner search states
  const [partnerSearchQuery, setPartnerSearchQuery] = useState("");
  const [isAddFriendDialogOpen, setIsAddFriendDialogOpen] = useState(false);
  const [friendUsernameSearch, setFriendUsernameSearch] = useState("");
  const debouncedPartnerSearch = useDebounce(partnerSearchQuery, 300);
  const debouncedFriendSearch = useDebounce(friendUsernameSearch, 300);

  // Real API calls for status and recommendations
  const { data: statusData, isLoading: isStatusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/status'],
    enabled: !!user,
  });

  const { data: recommendations, isLoading: isRecommendationsLoading, refetch: refetchRecommendations } = useQuery({
    queryKey: ['/api/recommendations', user?.id],
    enabled: !!user,
  });

  const { data: schedules, refetch: refetchSchedules } = useQuery({
    queryKey: ['/api/schedules', user?.id],
    enabled: !!user,
  });

  // Partner search queries
  const { data: partnerSearchResults = [], isLoading: isPartnerSearching } = useQuery<SearchUser[]>({
    queryKey: ['/api/users/search', debouncedPartnerSearch],
    enabled: debouncedPartnerSearch.length >= 2,
    queryFn: async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedPartnerSearch)}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    }
  });

  // Search users for dialog
  const { data: dialogSearchResults = [], isLoading: isDialogSearching } = useQuery<SearchUser[]>({
    queryKey: ['/api/users/search', 'dialog', debouncedFriendSearch],
    enabled: debouncedFriendSearch.length >= 1 && isAddFriendDialogOpen,
    queryFn: async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedFriendSearch)}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    }
  });

  // Get friends list
  const { data: friends = [], isLoading: isLoadingFriends } = useQuery<FriendWithUser[]>({
    queryKey: ['/api/friends', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not available');
      const res = await fetch(`/api/friends/${user.id}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    }
  });

  // Auto-refresh status every 30 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      handleRefreshStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);


  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: ({ status, message }: { status: StatusType, message?: string }) => 
      apiRequest('PUT', `/api/status/${user?.id}`, { status, message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
    },
  });

  // Add friend mutation
  const addFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      return apiRequest('POST', `/api/friends`, { friendId });
    },
    onSuccess: (data, friendId) => {
      toast({
        title: "Friend added successfully",
        description: "They have been added to your friends list."
      });
      
      // Close dialog and reset search
      setIsAddFriendDialogOpen(false);
      setFriendUsernameSearch("");
      
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/search'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add friend",
        description: error.message || "An error occurred while adding the friend.",
        variant: "destructive"
      });
    }
  });

  // Remove friend mutation
  const removeFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      return apiRequest('DELETE', `/api/friends/${friendId}`);
    },
    onSuccess: (data, friendId) => {
      toast({
        title: "Friend removed",
        description: "They have been removed from your friends list."
      });
      
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/search'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove friend",
        description: error.message || "An error occurred while removing the friend.",
        variant: "destructive"
      });
    }
  });

  const handleStatusChange = (newStatus: StatusType, customMessage?: string) => {
    setManualStatus(newStatus);
    setManualMessage(customMessage);
    if (user) {
      statusMutation.mutate({ status: newStatus, message: customMessage });
    }
  };

  // Schedule mutations
  const addScheduleMutation = useMutation({
    mutationFn: (newSchedule: InsertSchedule) => 
      apiRequest('POST', `/api/schedules/${user?.id}`, newSchedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations', user?.id] });
    },
  });

  const handleAddSchedule = (newSchedule: InsertSchedule) => {
    if (!user) return;
    addScheduleMutation.mutate(newSchedule);
  };

  const removeScheduleMutation = useMutation({
    mutationFn: (scheduleId: string) => 
      apiRequest('DELETE', `/api/schedules/${user?.id}/${scheduleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations', user?.id] });
    },
  });

  const handleRemoveSchedule = (scheduleId: string) => {
    removeScheduleMutation.mutate(scheduleId);
  };

  const handleRefreshStatus = () => {
    refetchStatus();
  };

  const handleRefreshRecommendations = () => {
    if (!user) return;
    refetchRecommendations();
  };

  const handleAddFriend = (friendId: string) => {
    addFriendMutation.mutate(friendId);
  };

  const handleRemoveFriend = (friendId: string) => {
    removeFriendMutation.mutate(friendId);
  };

  const isAddingFriend = addFriendMutation.isPending;
  const isRemovingFriend = removeFriendMutation.isPending;

  const filteredPartnerSearchResults = partnerSearchResults.filter(user => user.id !== user?.id);

  const handleConnect = (partnerId: string) => {
    console.log('Connecting to partner:', partnerId);
    
    // Find the partner in recommendations
    const partner = (recommendations as StudyPartner[] | undefined)?.find((p: StudyPartner) => p.id === partnerId);
    
    if (partner) {
      // Convert StudyPartner to User object for the modal
      const partnerUser: User = {
        id: partner.id,
        username: partner.username,
        password: '', // Not needed for modal display
        fullName: partner.fullName || null,
        major: partner.major,
        avatar: partner.avatar,
        dorm: null, // Not available in StudyPartner
        college: null,
        gender: null,
        bio: null,
      };
      
      setSelectedUser(partnerUser);
      setIsModalOpen(true);
    } else {
      console.error('Partner not found:', partnerId);
      // Could show a toast notification here
    }
  };

  const handleUploadICS = (uploadedSchedules: Schedule[]) => {
    // Invalidate queries to refresh data after ICS upload
    queryClient.invalidateQueries({ queryKey: ['/api/schedules', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['/api/status'] });
    queryClient.invalidateQueries({ queryKey: ['/api/recommendations', user?.id] });
    console.log('ICS uploaded, schedules added:', uploadedSchedules.length);
  };

  const handleUserClick = (userId: string) => {
    console.log('User clicked:', userId);
    
    // Find user in statusData
    if (!statusData) return;
    
    const statusResponse = statusData as CurrentStatusResponse;
    const allUsers = [...statusResponse.in_class, ...statusResponse.free];
    const clickedUser = allUsers.find(u => u.id === userId);
    
    if (clickedUser) {
      // Convert the status response user to a full User object
      const fullUser: User = {
        id: clickedUser.id,
        username: clickedUser.username,
        password: '', // Not needed for modal display
        fullName: clickedUser.fullName || null,
        major: clickedUser.major,
        avatar: clickedUser.avatar,
        dorm: null, // These fields aren't in the status response, so setting defaults
        college: null,
        gender: null,
        bio: null,
      };
      
      setSelectedUser(fullUser);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  // Helper function to get user's status and class info for modal
  const getUserStatusInfo = (userId: string) => {
    // First check if this user is in the status data (current users)
    if (statusData) {
      const statusResponse = statusData as CurrentStatusResponse;
      const inClassUser = statusResponse.in_class.find((u: any) => u.id === userId);
      if (inClassUser) {
        return {
          status: inClassUser.manual_status as StatusType,
          currentClass: inClassUser.current_class,
          nextClass: undefined
        };
      }
      
      const freeUser = statusResponse.free.find((u: any) => u.id === userId);
      if (freeUser) {
        return {
          status: freeUser.manual_status as StatusType,
          currentClass: undefined,
          nextClass: freeUser.next_class
        };
      }
    }
    
    // If not found in status data, check if this is a study partner
    const partner = (recommendations as StudyPartner[] | undefined)?.find((p: StudyPartner) => p.id === userId);
    if (partner) {
      return {
        status: "free" as StatusType, // Default status for partners
        currentClass: partner.current_class,
        nextClass: partner.next_class
      };
    }
    
    return null;
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoImage} alt="SlotSync Logo" className="h-16 w-16" />
          </div>
          <div className="text-lg font-medium mb-2">Loading SlotSync...</div>
          <div className="text-muted-foreground">Please wait while we load your account</div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-md mx-auto text-center">
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <img src={logoImage} alt="SlotSync Logo" className="h-16 w-16" />
                </div>
                <CardTitle>Welcome to SlotSync</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Please sign in to access your dashboard
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full"
                  onClick={() => window.location.href = '/login'}
                  data-testid="button-goto-login"
                >
                  Sign In
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.href = '/register'}
                  data-testid="button-goto-register"
                >
                  Create Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Main app for authenticated users
  return (
    <div className="min-h-screen bg-background">
      <Header 
        userStatus={manualStatus || "free"}
      />
      
      <main className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 text-xs sm:text-sm">
              <img src={dashboardIcon} alt="Dashboard" className="h-4 w-4 sm:h-5 sm:w-5" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="schedule" data-testid="tab-schedule" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 text-xs sm:text-sm">
              <img src={scheduleIcon} alt="Schedule" className="h-4 w-4 sm:h-5 sm:w-5" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="partners" data-testid="tab-partners" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 text-xs sm:text-sm">
              <img src={partnersIcon} alt="Partners" className="h-4 w-4 sm:h-5 sm:w-5" />
              Partners
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            {/* Status Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Your Status</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Let others know what you're up to
                </p>
              </CardHeader>
              <CardContent>
                <StatusDisplay 
                  currentStatus={manualStatus}
                  currentMessage={manualMessage}
                  onStatusChange={handleStatusChange}
                  schedules={(schedules as Schedule[] | undefined) || []}
                />
              </CardContent>
            </Card>

            {/* Status Board */}
            <StatusBoard
              statusData={statusData as CurrentStatusResponse | null}
              isLoading={isStatusLoading}
              onRefresh={handleRefreshStatus}
              onUserClick={handleUserClick}
            />
          </TabsContent>
          
          <TabsContent value="schedule" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            <ScheduleForm
              schedules={(schedules as Schedule[] | undefined) || []}
              onAddSchedule={handleAddSchedule}
              onRemoveSchedule={handleRemoveSchedule}
              onUploadICS={handleUploadICS}
              userId={user?.id}
            />
          </TabsContent>
          
          <TabsContent value="partners" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            {/* Search and Add Friends Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Find Study Partners
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Main search bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by username or major..."
                      value={partnerSearchQuery}
                      onChange={(e) => setPartnerSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-partner-search"
                    />
                  </div>
                  
                  <Separator />
                  
                  {/* Quick add friend button */}
                  <div className="flex items-center justify-center">
                    <Dialog open={isAddFriendDialogOpen} onOpenChange={setIsAddFriendDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          data-testid="button-add-friend-username"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Friend by Username
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add Friend by Username</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="relative">
                            <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Enter username..."
                              value={friendUsernameSearch}
                              onChange={(e) => setFriendUsernameSearch(e.target.value)}
                              className="pl-10"
                              data-testid="input-friend-username"
                            />
                          </div>
                          
                          {isDialogSearching && debouncedFriendSearch.length >= 1 && (
                            <p className="text-sm text-muted-foreground">
                              Searching users...
                            </p>
                          )}
                          
                          {dialogSearchResults.length > 0 && (
                            <div className="max-h-64 overflow-y-auto space-y-2">
                              {dialogSearchResults.filter(searchUser => searchUser.id !== user?.id).map((searchUser: SearchUser) => (
                                <div key={searchUser.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                  <Avatar className="h-10 w-10">
                                    {searchUser.avatar && <AvatarImage src={searchUser.avatar} alt={searchUser.fullName || searchUser.username} />}
                                    <AvatarFallback>
                                      {(searchUser.fullName || searchUser.username)
                                        .split(" ")
                                        .map(n => n[0])
                                        .join("")
                                        .toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-sm truncate">{searchUser.fullName || searchUser.username}</p>
                                      {searchUser.fullName && (
                                        <span className="text-xs text-muted-foreground">@{searchUser.username}</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{searchUser.major}</p>
                                  </div>
                                  {!searchUser.isFriend ? (
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleAddFriend(searchUser.id)}
                                      disabled={isAddingFriend}
                                      data-testid={`dialog-add-friend-${searchUser.id}`}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      {isAddingFriend ? "Adding..." : "Add"}
                                    </Button>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">
                                      <Users className="h-3 w-3 mr-1" />
                                      Friend
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {debouncedFriendSearch.length >= 1 && !isDialogSearching && dialogSearchResults.filter(searchUser => searchUser.id !== user?.id).length === 0 && (
                            <div className="text-center py-6">
                              <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">No users found with that username</p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {/* Search help text */}
                  {partnerSearchQuery.length > 0 && partnerSearchQuery.length < 2 && (
                    <p className="text-sm text-muted-foreground">
                      Type at least 2 characters to search
                    </p>
                  )}
                  
                  {isPartnerSearching && debouncedPartnerSearch.length >= 2 && (
                    <p className="text-sm text-muted-foreground">
                      Searching partners...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Search Results */}
            {filteredPartnerSearchResults.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Search Results</CardTitle>
                    <Badge variant="outline">{filteredPartnerSearchResults.length} found</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredPartnerSearchResults.map((searchUser: SearchUser) => (
                      <div key={searchUser.id} className="border rounded-lg p-4 hover-elevate" data-testid={`search-result-${searchUser.id}`}>
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12">
                            {searchUser.avatar && <AvatarImage src={searchUser.avatar} alt={searchUser.fullName || searchUser.username} />}
                            <AvatarFallback>
                              {(searchUser.fullName || searchUser.username)
                                .split(" ")
                                .map(n => n[0])
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-sm truncate">{searchUser.fullName || searchUser.username}</h3>
                              {searchUser.fullName && (
                                <span className="text-xs text-muted-foreground">@{searchUser.username}</span>
                              )}
                              {searchUser.isFriend && (
                                <Badge variant="secondary" className="text-xs">
                                  <Users className="h-3 w-3 mr-1" />
                                  Friend
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-xs text-muted-foreground mb-2">{searchUser.major}</p>
                            
                            {searchUser.sharedClasses && searchUser.sharedClasses.length > 0 && (
                              <div className="flex items-center gap-1 mb-3">
                                <BookOpen className="h-3 w-3 text-primary" />
                                <div className="flex flex-wrap gap-1">
                                  {searchUser.sharedClasses.map((course, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {course}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {!searchUser.isFriend && (
                              <Button 
                                size="sm" 
                                onClick={() => handleAddFriend(searchUser.id)}
                                disabled={isAddingFriend}
                                className="w-full"
                                data-testid={`add-friend-${searchUser.id}`}
                              >
                                <UserPlus className="h-3 w-3 mr-1" />
                                {isAddingFriend ? "Adding..." : "Add Friend"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* My Friends Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    My Friends ({friends.length})
                  </CardTitle>
                  {friends.length > 0 && (
                    <Badge variant="outline">{friends.length} friends</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingFriends ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Loading your friends...</p>
                ) : friends.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {friends.map((friend: FriendWithUser) => (
                      <div key={friend.id} className="border rounded-lg p-4 hover-elevate" data-testid={`friend-${friend.friend.id}`}>
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12">
                            {friend.friend.avatar && <AvatarImage src={friend.friend.avatar} alt={friend.friend.fullName || friend.friend.username} />}
                            <AvatarFallback>
                              {(friend.friend.fullName || friend.friend.username)
                                .split(" ")
                                .map(n => n[0])
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-sm truncate">{friend.friend.fullName || friend.friend.username}</h3>
                              {friend.friend.fullName && (
                                <span className="text-xs text-muted-foreground">@{friend.friend.username}</span>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                Friend
                              </Badge>
                            </div>
                            
                            <p className="text-xs text-muted-foreground mb-2">{friend.friend.major}</p>
                            <p className="text-xs text-muted-foreground mb-3">
                              Friends since {new Date(friend.createdAt!).toLocaleDateString()}
                            </p>
                            
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleRemoveFriend(friend.friend.id)}
                              disabled={isRemovingFriend}
                              className="w-full"
                              data-testid={`remove-friend-${friend.friend.id}`}
                            >
                              <UserX className="h-3 w-3 mr-1" />
                              {isRemovingFriend ? "Removing..." : "Remove Friend"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No friends yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Search for study partners and add them as friends to get started.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Original Recommendations Section */}
            <StudyPartnerRecommendations
              recommendations={(recommendations as StudyPartner[] | undefined) || []}
              isLoading={isRecommendationsLoading}
              onRefresh={handleRefreshRecommendations}
              onConnect={handleConnect}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* User Detail Modal */}
      <UserDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        user={selectedUser}
        currentUserId={user?.id || ""}
        status={selectedUser ? getUserStatusInfo(selectedUser.id)?.status : undefined}
        currentClass={selectedUser ? getUserStatusInfo(selectedUser.id)?.currentClass : undefined}
        nextClass={selectedUser ? getUserStatusInfo(selectedUser.id)?.nextClass : undefined}
      />
    </div>
  );
}