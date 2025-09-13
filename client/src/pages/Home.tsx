import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  User, 
  Schedule, 
  InsertSchedule, 
  CurrentStatusResponse, 
  StudyPartner,
  insertUserSchema
} from "@shared/schema";
import logoImage from "@assets/logo_1757730069515.png";
import dashboardIcon from "@assets/dashboard_icon_1757730011816.png";
import scheduleIcon from "@assets/schedule_icon_1757730011819.png";
import partnersIcon from "@assets/partners_icon_1757730011818.png";

const loginSchema = insertUserSchema.pick({ username: true, major: true });
type LoginData = z.infer<typeof loginSchema>;

type StatusType = "studying" | "free" | "in_class" | "busy" | "tired" | "social";

export default function Home() {
  // User state with localStorage persistence for syncing with Profile page
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('slotsync-user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [manualStatus, setManualStatus] = useState<StatusType | null>(null);
  const [manualMessage, setManualMessage] = useState<string | undefined>(undefined);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [statusData, setStatusData] = useState<CurrentStatusResponse | null>(null);
  const [recommendations, setRecommendations] = useState<StudyPartner[]>([]);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(false);
  
  // User detail modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      major: "",
    },
  });

  // Mock data initialization
  useEffect(() => {
    // todo: remove mock functionality
    const mockStatusData: CurrentStatusResponse = {
      now: new Date().toISOString(),
      in_class: [
        {
          id: "1",
          username: "Alice Chen",
          major: "Computer Science",
          avatar: null,
          current_class: "CS 151",
          manual_status: "studying"
        }
      ],
      free: [
        {
          id: "2", 
          username: "Bob Johnson",
          major: "Mathematics",
          avatar: null,
          next_class: "Math 201 @ 2:00 PM",
          manual_status: "free"
        },
        {
          id: "3",
          username: "Carol Smith", 
          major: "Business",
          avatar: null,
          manual_status: "in_class"
        }
      ]
    };

    const mockRecommendations: StudyPartner[] = [
      {
        id: "2",
        username: "Bob Johnson",
        major: "Mathematics", 
        avatar: null,
        score: 85,
        shared_classes: ["CS 151", "Math 201"],
        current_class: undefined,
        next_class: "CS 151 @ 2:00 PM",
        reason: "Shares 2 classes with you; Both interested in studying"
      },
      {
        id: "3",
        username: "Carol Smith",
        major: "Business",
        avatar: null,
        score: 72,
        shared_classes: ["Math 201"],
        current_class: undefined,
        next_class: undefined,
        reason: "Shares 1 class with you; Available in class"
      }
    ];

    setStatusData(mockStatusData);
    setRecommendations(mockRecommendations);
  }, []);

  // Auto-refresh status every 30 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      handleRefreshStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = (data: LoginData) => {
    // todo: replace with real API call
    const newUser: User = {
      id: Math.random().toString(),
      username: data.username,
      major: data.major,
      avatar: null,
      dorm: null,
      college: null,
      gender: null,
      bio: null,
    };
    setUser(newUser);
    localStorage.setItem('slotsync-user', JSON.stringify(newUser));
    console.log('User logged in:', newUser);
  };

  const handleLogout = () => {
    setUser(null);
    setManualStatus(null);
    setManualMessage(undefined);
    setSchedules([]);
    localStorage.removeItem('slotsync-user');
    console.log('User logged out');
  };

  const handleStatusChange = (newStatus: StatusType, customMessage?: string) => {
    setManualStatus(newStatus);
    setManualMessage(customMessage);
    console.log('Status changed to:', newStatus, customMessage ? `with message: "${customMessage}"` : '');
    // todo: Call API to update user status with custom message
  };

  const handleAddSchedule = (newSchedule: InsertSchedule) => {
    if (!user) return;
    
    const schedule: Schedule = {
      ...newSchedule,
      id: Math.random().toString(),
      userId: user.id,
      location: newSchedule.location || null
    };
    setSchedules(prev => [...prev, schedule]);
    console.log('Schedule added:', schedule);
    // todo: Call API to add schedule
  };

  const handleRemoveSchedule = (scheduleId: string) => {
    setSchedules(prev => prev.filter(s => s.id !== scheduleId));
    console.log('Schedule removed:', scheduleId);
    // todo: Call API to remove schedule
  };

  const handleRefreshStatus = () => {
    setIsStatusLoading(true);
    console.log('Refreshing status...');
    // todo: Call API to get current status
    setTimeout(() => setIsStatusLoading(false), 1000);
  };

  const handleRefreshRecommendations = () => {
    if (!user) return;
    
    setIsRecommendationsLoading(true);
    console.log('Refreshing recommendations...');
    // todo: Call API to get study partner recommendations
    setTimeout(() => setIsRecommendationsLoading(false), 1500);
  };

  const handleConnect = (partnerId: string) => {
    console.log('Connecting to partner:', partnerId);
    
    // Find the partner in recommendations
    const partner = recommendations.find(p => p.id === partnerId);
    
    if (partner) {
      // Convert StudyPartner to User object for the modal
      const partnerUser: User = {
        id: partner.id,
        username: partner.username,
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
    setSchedules(prev => [...prev, ...uploadedSchedules]);
    console.log('ICS uploaded, schedules added:', uploadedSchedules.length);
  };

  const handleUserClick = (userId: string) => {
    console.log('User clicked:', userId);
    
    // Find user in statusData
    if (!statusData) return;
    
    const allUsers = [...statusData.in_class, ...statusData.free];
    const clickedUser = allUsers.find(u => u.id === userId);
    
    if (clickedUser) {
      // Convert the status response user to a full User object
      const fullUser: User = {
        id: clickedUser.id,
        username: clickedUser.username,
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
      const inClassUser = statusData.in_class.find(u => u.id === userId);
      if (inClassUser) {
        return {
          status: inClassUser.manual_status as StatusType,
          currentClass: inClassUser.current_class,
          nextClass: undefined
        };
      }
      
      const freeUser = statusData.free.find(u => u.id === userId);
      if (freeUser) {
        return {
          status: freeUser.manual_status as StatusType,
          currentClass: undefined,
          nextClass: freeUser.next_class
        };
      }
    }
    
    // If not found in status data, check if this is a study partner
    const partner = recommendations.find(p => p.id === userId);
    if (partner) {
      return {
        status: "free" as StatusType, // Default status for partners
        currentClass: partner.current_class,
        nextClass: partner.next_class
      };
    }
    
    return null;
  };

  // Login form for non-authenticated users
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={null} onLogin={() => {}} />
        <main className="container mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <img src={logoImage} alt="SlotSync Logo" className="h-16 w-16" />
                </div>
                <CardTitle>Welcome to SlotSync</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Enter your details to find study partners
                </p>
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Alice Chen" 
                              {...field}
                              data-testid="input-username"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="major"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Major</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Computer Science" 
                              {...field}
                              data-testid="input-major"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      data-testid="submit-login"
                    >
                      Get Started
                    </Button>
                  </form>
                </Form>
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
        user={user} 
        userStatus={manualStatus || "free"}
        onLogout={handleLogout}
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
                  schedules={schedules}
                />
              </CardContent>
            </Card>

            {/* Status Board */}
            <StatusBoard
              statusData={statusData}
              isLoading={isStatusLoading}
              onRefresh={handleRefreshStatus}
              onUserClick={handleUserClick}
            />
          </TabsContent>
          
          <TabsContent value="schedule" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            <ScheduleForm
              schedules={schedules}
              onAddSchedule={handleAddSchedule}
              onRemoveSchedule={handleRemoveSchedule}
              onUploadICS={handleUploadICS}
              userId={user?.id}
            />
          </TabsContent>
          
          <TabsContent value="partners" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            <StudyPartnerRecommendations
              recommendations={recommendations}
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