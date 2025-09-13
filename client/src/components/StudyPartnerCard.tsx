import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StudyPartner } from "@shared/schema";
import { MessageCircle, Users, GraduationCap, Heart, BookOpen } from "lucide-react";

interface StudyPartnerCardProps {
  partner: StudyPartner;
  onConnect?: (partnerId: string) => void;
}

export default function StudyPartnerCard({ partner, onConnect }: StudyPartnerCardProps) {
  const initials = partner.username
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();

  // Extract hobbies from bio (same logic as backend)
  const extractHobbies = (bio: string | null | undefined): string[] => {
    if (!bio) return [];
    
    const hobbyKeywords = [
      'reading', 'gaming', 'music', 'sports', 'basketball', 'football', 'soccer', 
      'tennis', 'swimming', 'running', 'hiking', 'cooking', 'photography', 'art',
      'coding', 'programming', 'chess', 'guitar', 'piano', 'movies', 'travel',
      'dancing', 'singing', 'writing', 'drawing', 'cycling', 'yoga', 'gym',
      'anime', 'manga', 'books', 'science', 'research', 'technology', 'AI',
      'machine learning', 'data science'
    ];
    
    const bioLower = bio.toLowerCase();
    return hobbyKeywords.filter(hobby => bioLower.includes(hobby));
  };

  const userHobbies = extractHobbies(partner.bio);

  return (
    <Card className="hover-elevate" data-testid={`study-partner-${partner.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            {partner.avatar && <AvatarImage src={partner.avatar} alt={partner.username} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{partner.username}</h3>
            </div>
            
            {/* User Info Tags */}
            <div className="flex flex-wrap gap-1 mb-2">
              {/* Major Tag */}
              <Badge variant="outline" className="text-xs">
                <BookOpen className="h-3 w-3 mr-1" />
                {partner.major}
              </Badge>
              
              {/* Grade Tag */}
              {partner.grade && (
                <Badge variant="outline" className="text-xs">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  {partner.grade}
                </Badge>
              )}
              
              {/* Hobby Tags - show up to 3 */}
              {userHobbies.slice(0, 3).map((hobby, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  <Heart className="h-3 w-3 mr-1" />
                  {hobby}
                </Badge>
              ))}
              
              {/* Show +X more if there are more hobbies */}
              {userHobbies.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{userHobbies.length - 3} more
                </Badge>
              )}
            </div>
            
            {partner.shared_classes.length > 0 && (
              <div className="flex items-center gap-1 mb-2">
                <Users className="h-3 w-3 text-primary" />
                <div className="flex flex-wrap gap-1">
                  {partner.shared_classes.map((course, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {course}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {partner.current_class && (
              <p className="text-xs text-primary font-medium mb-1">
                Currently in {partner.current_class}
              </p>
            )}
            
            {partner.next_class && (
              <p className="text-xs text-muted-foreground mb-2">
                Next: {partner.next_class}
              </p>
            )}
            
            <p className="text-xs text-foreground mb-3">{partner.reason}</p>
            
            <Button 
              size="sm" 
              onClick={() => onConnect?.(partner.id)}
              className="w-full"
              data-testid={`connect-${partner.id}`}
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              Connect
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}