import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import StatusBoard from "@/components/StatusBoard"; 
import StatusButtons from "@/components/StatusButtons";
import ScheduleForm from "@/components/ScheduleForm";
import StudyPartnerRecommendations from "@/components/StudyPartnerRecommendations";
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

const loginSchema = insertUserSchema.pick({ username: true, major: true });
type LoginData = z.infer<typeof loginSchema>;

type StatusType = "studying" | "free" | "help" | "busy" | "tired" | "social";

export default function Home() {
  // todo: remove mock functionality - replace with real API calls
  const [user, setUser] = useState<User | null>(null);
  const [userStatus, setUserStatus] = useState<StatusType>("free");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [statusData, setStatusData] = useState<CurrentStatusResponse | null>(null);
  const [recommendations, setRecommendations] = useState<StudyPartner[]>([]);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(false);

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
          current_class: "CS 151",
          manual_status: "studying"
        }
      ],
      free: [
        {
          id: "2", 
          username: "Bob Johnson",
          major: "Mathematics",
          next_class: "Math 201 @ 2:00 PM",
          manual_status: "free"
        },
        {
          id: "3",
          username: "Carol Smith", 
          major: "Business",
          manual_status: "help"
        }
      ]
    };

    const mockRecommendations: StudyPartner[] = [
      {
        id: "2",
        username: "Bob Johnson",
        major: "Mathematics", 
        avatar: undefined,
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
        avatar: undefined,
        score: 72,
        shared_classes: ["Math 201"],
        current_class: undefined,
        next_class: undefined,
        reason: "Shares 1 class with you; Available to help"
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
    };
    setUser(newUser);
    console.log('User logged in:', newUser);
  };

  const handleLogout = () => {
    setUser(null);
    setUserStatus("free");
    setSchedules([]);
    console.log('User logged out');
  };

  const handleStatusChange = (newStatus: StatusType) => {
    setUserStatus(newStatus);
    console.log('Status changed to:', newStatus);
    // todo: Call API to update user status
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
    // todo: Implement connection functionality
  };

  const handleUploadICS = (uploadedSchedules: Schedule[]) => {
    setSchedules(prev => [...prev, ...uploadedSchedules]);
    console.log('ICS uploaded, schedules added:', uploadedSchedules.length);
  };

  const handleUserClick = (userId: string) => {
    console.log('User clicked:', userId);
    // todo: Show user profile or start chat
  };

  // Login form for non-authenticated users
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={null} onLogin={() => {}} />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Welcome to Campus Connect</CardTitle>
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
        userStatus={userStatus}
        onLogout={handleLogout}
      />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="schedule" data-testid="tab-schedule">Schedule</TabsTrigger>
            <TabsTrigger value="partners" data-testid="tab-partners">Partners</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6">
            {/* Status Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Your Status</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Let others know what you're up to
                </p>
              </CardHeader>
              <CardContent>
                <StatusButtons 
                  currentStatus={userStatus}
                  onStatusChange={handleStatusChange}
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
          
          <TabsContent value="schedule" className="space-y-6">
            <ScheduleForm
              schedules={schedules}
              onAddSchedule={handleAddSchedule}
              onRemoveSchedule={handleRemoveSchedule}
              onUploadICS={handleUploadICS}
              userId={user?.id}
            />
          </TabsContent>
          
          <TabsContent value="partners" className="space-y-6">
            <StudyPartnerRecommendations
              recommendations={recommendations}
              isLoading={isRecommendationsLoading}
              onRefresh={handleRefreshRecommendations}
              onConnect={handleConnect}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}