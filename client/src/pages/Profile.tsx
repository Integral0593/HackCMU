import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, User as UserIcon, Edit3, Loader2 } from "lucide-react";
import { User, insertUserSchema, type InsertUser, genderEnum } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const profileSchema = insertUserSchema.extend({
  username: z.string().min(1, "Name is required"),
  major: z.string().min(1, "Major is required"),
});

type ProfileData = z.infer<typeof profileSchema>;

// Helper function to validate gender from localStorage
function validateGender(gender: unknown): z.infer<typeof genderEnum> | undefined {
  if (typeof gender === 'string') {
    const result = genderEnum.safeParse(gender);
    return result.success ? result.data : undefined;
  }
  return undefined;
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // User state - get from localStorage
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('slotsync-user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        // Validate gender field to ensure type safety
        if (parsed && typeof parsed === 'object') {
          return {
            ...parsed,
            gender: validateGender(parsed.gender)
          } as User;
        }
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Redirect unauthenticated users in useEffect to avoid render-time side effects
  useEffect(() => {
    if (!user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // React Query mutation for updating profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      if (!user) throw new Error("No user found");
      
      // Handle file upload if avatar changed
      let avatarUrl = data.avatar;
      if (previewUrl && avatarFile) {
        // In a real app, you'd upload the file to a service like AWS S3 or similar
        // For now, we'll use the data URL
        avatarUrl = previewUrl;
      }
      
      const updateData: Partial<InsertUser> = {
        username: data.username,
        major: data.major,
        avatar: avatarUrl,
        dorm: data.dorm,
        college: data.college,
        gender: data.gender,
        bio: data.bio
      };
      
      const response = await apiRequest("PUT", `/api/users/${user.id}`, updateData);
      return response.json();
    },
    onSuccess: (updatedUser: User) => {
      // Update local state and localStorage with server response
      setUser(updatedUser);
      localStorage.setItem('slotsync-user', JSON.stringify(updatedUser));
      setIsEditing(false);
      setPreviewUrl(null);
      setAvatarFile(null);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
      console.log('Profile updated:', updatedUser);
    },
    onError: (error: Error) => {
      console.error('Profile update error:', error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || "",
      major: user?.major || "",
      avatar: user?.avatar || null,
      dorm: user?.dorm || "",
      college: user?.college || "",
      gender: validateGender(user?.gender),
      bio: user?.bio || "",
    },
  });

  // Update form defaults when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username || "",
        major: user.major || "",
        avatar: user.avatar || null,
        dorm: user.dorm || "",
        college: user.college || "",
        gender: validateGender(user.gender),
        bio: user.bio || "",
      });
    }
  }, [user, form]);

  const userInitials = user?.username
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase() || "U";

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please choose a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please choose an image file",
          variant: "destructive",
        });
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (data: ProfileData) => {
    updateProfileMutation.mutate(data);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('slotsync-user');
    setLocation("/");
    console.log('User logged out from profile');
  };

  // Show loading or return null while redirecting
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" data-testid="link-back-home">
            <Button variant="outline" size="sm" className="flex items-center gap-2 hover-elevate">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold">Profile</h1>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Header Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                    {(previewUrl || user.avatar) && (
                      <AvatarImage 
                        src={previewUrl || user.avatar || undefined} 
                        alt={user.username} 
                      />
                    )}
                    <AvatarFallback className="text-lg sm:text-xl">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  
                  {isEditing && (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        id="avatar-upload"
                        data-testid="input-avatar-upload"
                      />
                      <Label htmlFor="avatar-upload">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          asChild
                          className="cursor-pointer hover-elevate"
                        >
                          <div className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            <span className="text-xs sm:text-sm">Upload Photo</span>
                          </div>
                        </Button>
                      </Label>
                    </div>
                  )}
                </div>

                {/* User Information */}
                <div className="flex-1 text-center sm:text-left">
                  {!isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-semibold" data-testid="text-username">
                          {user.username}
                        </h2>
                        <p className="text-muted-foreground" data-testid="text-major">
                          {user.major}
                        </p>
                      </div>
                      
                      {/* Additional Information */}
                      <div className="space-y-2 text-sm">
                        {(user.dorm || user.college || user.gender) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {user.dorm && (
                              <div>
                                <span className="text-muted-foreground">Dorm: </span>
                                <span data-testid="text-dorm">{user.dorm}</span>
                              </div>
                            )}
                            {user.college && (
                              <div>
                                <span className="text-muted-foreground">College: </span>
                                <span data-testid="text-college">{user.college}</span>
                              </div>
                            )}
                            {user.gender && (
                              <div className="sm:col-span-2">
                                <span className="text-muted-foreground">Gender: </span>
                                <span data-testid="text-gender">
                                  {user.gender === 'prefer_not_to_say' 
                                    ? 'Prefer not to say' 
                                    : user.gender.charAt(0).toUpperCase() + user.gender.slice(1)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {user.bio && (
                          <div className="pt-2">
                            <p className="text-muted-foreground text-xs mb-1">Bio:</p>
                            <p className="text-sm leading-relaxed" data-testid="text-bio">
                              {user.bio}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                        data-testid="button-edit-profile"
                        className="flex items-center gap-2 hover-elevate"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit Profile
                      </Button>
                    </div>
                  ) : (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter your full name"
                                  {...field}
                                  data-testid="input-profile-username"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="major"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Major</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter your major"
                                  {...field}
                                  data-testid="input-profile-major"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="dorm"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dorm</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter your dorm"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-profile-dorm"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="college"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>College</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter your college"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-profile-college"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="gender"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gender</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-profile-gender">
                                    <SelectValue placeholder="Select gender" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="male">Male</SelectItem>
                                  <SelectItem value="female">Female</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Tell us about yourself..."
                                  className="min-h-[100px]"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="textarea-profile-bio"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <Button 
                            type="submit" 
                            className="flex-1"
                            data-testid="button-save-profile"
                            disabled={updateProfileMutation.isPending}
                          >
                            {updateProfileMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save Changes"
                            )}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setIsEditing(false);
                              setPreviewUrl(null);
                              setAvatarFile(null);
                              form.reset();
                            }}
                            className="flex-1"
                            data-testid="button-cancel-edit"
                            disabled={updateProfileMutation.isPending}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-medium">Sign Out</h3>
                    <p className="text-sm text-muted-foreground">
                      Sign out of your SlotSync account
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleLogout}
                    data-testid="button-profile-logout"
                    className="w-full sm:w-auto"
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}