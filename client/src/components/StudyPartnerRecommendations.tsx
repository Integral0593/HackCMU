import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StudyPartnerCard from "./StudyPartnerCard";
import { StudyPartner } from "@shared/schema";
import { Users, RefreshCw, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudyPartnerRecommendationsProps {
  recommendations: StudyPartner[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onConnect?: (partnerId: string) => void;
  className?: string;
}

export default function StudyPartnerRecommendations({ 
  recommendations, 
  isLoading = false, 
  onRefresh,
  onConnect,
  className 
}: StudyPartnerRecommendationsProps) {
  return (
    <Card className={cn(className)} data-testid="recommendations-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Study Partners ({recommendations.length})
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            data-testid="refresh-recommendations"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {isLoading && recommendations.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-md">
                    <div className="h-12 w-12 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-24 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-48 mb-3"></div>
                      <div className="h-8 bg-muted rounded w-full"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Study Partners Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try updating your status or adding more courses to your schedule
              </p>
              <Button variant="outline" onClick={onRefresh} data-testid="refresh-empty">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Recommendations
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {recommendations.map((partner) => (
                <StudyPartnerCard
                  key={partner.id}
                  partner={partner}
                  onConnect={onConnect}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}