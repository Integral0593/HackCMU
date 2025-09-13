import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Search, Users, UserPlus, UserX, BookOpen, Plus } from "lucide-react";
import type { SearchUser, FriendWithUser, PublicUser } from "@shared/schema";

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

function SearchUserCard({ user, onAddFriend, isAdding }: {
  user: SearchUser;
  onAddFriend: (userId: string) => void;
  isAdding: boolean;
}) {
  const displayName = user.fullName || user.username;
  const initials = displayName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();

  return (
    <Card className="hover-elevate" data-testid={`search-user-${user.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            {user.avatar && <AvatarImage src={user.avatar} alt={displayName} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-sm truncate">{displayName}</h3>
              {user.fullName && (
                <span className="text-xs text-muted-foreground">@{user.username}</span>
              )}
              {user.isFriend && (
                <Badge variant="secondary" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  Friend
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mb-2">{user.major}</p>
            
            {user.dorm && (
              <p className="text-xs text-muted-foreground mb-2">Dorm: {user.dorm}</p>
            )}
            
            {user.college && (
              <p className="text-xs text-muted-foreground mb-2">College: {user.college}</p>
            )}
            
            {user.bio && (
              <p className="text-xs text-foreground mb-2">{user.bio}</p>
            )}
            
            {user.sharedClasses.length > 0 && (
              <div className="flex items-center gap-1 mb-3">
                <BookOpen className="h-3 w-3 text-primary" />
                <div className="flex flex-wrap gap-1">
                  {user.sharedClasses.map((course, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {course}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {!user.isFriend && (
              <Button 
                size="sm" 
                onClick={() => onAddFriend(user.id)}
                disabled={isAdding}
                className="w-full"
                data-testid={`add-friend-${user.id}`}
              >
                <UserPlus className="h-3 w-3 mr-1" />
                {isAdding ? "Adding..." : "Add Friend"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FriendCard({ friend, onRemoveFriend, isRemoving }: {
  friend: FriendWithUser;
  onRemoveFriend: (friendId: string) => void;
  isRemoving: boolean;
}) {
  const displayName = friend.friend.fullName || friend.friend.username;
  const initials = displayName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();

  return (
    <Card className="hover-elevate" data-testid={`friend-${friend.friend.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            {friend.friend.avatar && <AvatarImage src={friend.friend.avatar} alt={displayName} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-sm truncate">{displayName}</h3>
              {friend.friend.fullName && (
                <span className="text-xs text-muted-foreground">@{friend.friend.username}</span>
              )}
              <Badge variant="secondary" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                Friend
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground mb-2">{friend.friend.major}</p>
            
            {friend.friend.dorm && (
              <p className="text-xs text-muted-foreground mb-2">Dorm: {friend.friend.dorm}</p>
            )}
            
            {friend.friend.college && (
              <p className="text-xs text-muted-foreground mb-2">College: {friend.friend.college}</p>
            )}
            
            {friend.friend.bio && (
              <p className="text-xs text-foreground mb-2">{friend.friend.bio}</p>
            )}
            
            <p className="text-xs text-muted-foreground mb-3">
              Friends since {new Date(friend.createdAt!).toLocaleDateString()}
            </p>
            
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => onRemoveFriend(friend.friend.id)}
              disabled={isRemoving}
              className="w-full"
              data-testid={`remove-friend-${friend.friend.id}`}
            >
              <UserX className="h-3 w-3 mr-1" />
              {isRemoving ? "Removing..." : "Remove Friend"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Partners() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddFriendDialogOpen, setIsAddFriendDialogOpen] = useState(false);
  const [friendUsernameSearch, setFriendUsernameSearch] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const debouncedFriendSearch = useDebounce(friendUsernameSearch, 300);
  const { toast } = useToast();

  // Get current user for friends list
  const { data: currentUserData } = useQuery<{ user: PublicUser }>({
    queryKey: ['/api/auth/me']
  });

  const currentUser = currentUserData?.user;

  // Search users query
  const { data: searchResults = [], isLoading: isSearching } = useQuery<SearchUser[]>({
    queryKey: ['/api/users/search', debouncedSearch],
    enabled: debouncedSearch.length >= 2,
    queryFn: async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedSearch)}`, {
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
    queryKey: ['/api/friends', currentUser?.id],
    enabled: !!currentUser?.id,
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('User ID not available');
      const res = await fetch(`/api/friends/${currentUser.id}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    }
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

  const handleAddFriend = (friendId: string) => {
    addFriendMutation.mutate(friendId);
  };

  const handleRemoveFriend = (friendId: string) => {
    removeFriendMutation.mutate(friendId);
  };

  const isAddingFriend = addFriendMutation.isPending;
  const isRemovingFriend = removeFriendMutation.isPending;

  const filteredSearchResults = useMemo(() => {
    return searchResults.filter(user => user.id !== currentUser?.id);
  }, [searchResults, currentUser?.id]);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Study Partners</h1>
        <p className="text-muted-foreground">
          Find and connect with study partners who share your classes and interests.
        </p>
      </div>

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="search" data-testid="tab-search">
            <Search className="h-4 w-4 mr-2" />
            Search Partners
          </TabsTrigger>
          <TabsTrigger value="friends" data-testid="tab-friends">
            <Users className="h-4 w-4 mr-2" />
            My Friends ({friends.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                Find Study Partners
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by username or major..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
                
                <Separator />
                
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
                            {dialogSearchResults.filter(user => user.id !== currentUser?.id).map((user: SearchUser) => (
                              <div key={user.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                <Avatar className="h-10 w-10">
                                  {user.avatar && <AvatarImage src={user.avatar} alt={user.fullName || user.username} />}
                                  <AvatarFallback>
                                    {(user.fullName || user.username)
                                      .split(" ")
                                      .map(n => n[0])
                                      .join("")
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm truncate">{user.fullName || user.username}</p>
                                    {user.fullName && (
                                      <span className="text-xs text-muted-foreground">@{user.username}</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">{user.major}</p>
                                </div>
                                {!user.isFriend ? (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleAddFriend(user.id)}
                                    disabled={isAddingFriend}
                                    data-testid={`dialog-add-friend-${user.id}`}
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
                        
                        {debouncedFriendSearch.length >= 1 && !isDialogSearching && dialogSearchResults.filter(user => user.id !== currentUser?.id).length === 0 && (
                          <div className="text-center py-6">
                            <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No users found with that username</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {searchQuery.length > 0 && searchQuery.length < 2 && (
                  <p className="text-sm text-muted-foreground">
                    Type at least 2 characters to search
                  </p>
                )}
                
                {isSearching && debouncedSearch.length >= 2 && (
                  <p className="text-sm text-muted-foreground">
                    Searching...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {filteredSearchResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Search Results</h3>
                <Badge variant="outline">{filteredSearchResults.length} found</Badge>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                {filteredSearchResults.map((user: SearchUser) => (
                  <SearchUserCard
                    key={user.id}
                    user={user}
                    onAddFriend={handleAddFriend}
                    isAdding={isAddingFriend}
                  />
                ))}
              </div>
            </div>
          )}

          {debouncedSearch.length >= 2 && !isSearching && filteredSearchResults.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try searching with different keywords or check the spelling.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="friends" className="space-y-4">
          {isLoadingFriends ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Loading your friends...</p>
              </CardContent>
            </Card>
          ) : friends.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Your Study Partners</h3>
                <Badge variant="outline">{friends.length} friends</Badge>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                {friends.map((friend: FriendWithUser) => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    onRemoveFriend={handleRemoveFriend}
                    isRemoving={isRemovingFriend}
                  />
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No friends yet</h3>
                <p className="text-muted-foreground mb-4">
                  Search for study partners and add them as friends to get started.
                </p>
                <Button 
                  onClick={() => {
                    // Switch to search tab
                    const searchTab = document.querySelector('[data-testid="tab-search"]') as HTMLElement;
                    if (searchTab) {
                      searchTab.click();
                    }
                  }}
                  data-testid="button-find-partners"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Find Study Partners
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}