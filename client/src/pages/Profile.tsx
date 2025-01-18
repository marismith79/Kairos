// import { useUser } from "@/lib/auth";
// import { AuthForm } from "@/components/AuthForm";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { useQuery } from "@tanstack/react-query";
// import type { SelectSavedFacility } from "@db/schema";
// import { Loader2 } from "lucide-react";
// import { FacilityCard } from "@/components/FacilityCard";
import * as React from "react"

export default function Profile() {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold">Profile Page</h1>
      <p className="text-muted-foreground">This is the profile page. Content will go here.</p>
    </div>
  );
}
  // const { data: user, isLoading: isLoadingUser } = useUser();
  // const { data: savedFacilities, isLoading: isLoadingSaved } = useQuery<SelectSavedFacility[]>({
  //   queryKey: ["/api/saved-facilities"],
  //   enabled: !!user,
  // });

  // if (isLoadingUser) {
  //   return (
  //     <div className="flex items-center justify-center min-h-[50vh]">
  //       <Loader2 className="h-8 w-8 animate-spin" />
  //     </div>
  //   );
  // }

  // if (!user) {
  //   return (
  //     <div className="container mx-auto px-4 py-6">
  //       <Card>
  //         <CardHeader>
  //           <CardTitle>Login or Register</CardTitle>
  //         </CardHeader>
  //         <CardContent>
  //           <AuthForm />
  //         </CardContent>
  //       </Card>
  //     </div>
  //   );
  // }

  // return (
  //   <div className="container mx-auto px-4 py-6">
  //     <Card className="mb-6">
  //       <CardHeader>
  //         <CardTitle>Welcome, {user.name}!</CardTitle>
  //       </CardHeader>
  //     </Card>

  //     <div className="space-y-4">
  //       <h2 className="text-2xl font-bold">Saved Facilities</h2>
  //       {isLoadingSaved ? (
  //         <div className="flex items-center justify-center py-8">
  //           <Loader2 className="h-8 w-8 animate-spin" />
  //         </div>
  //       ) : savedFacilities && savedFacilities.length > 0 ? (
  //         savedFacilities.map((saved) => (
  //           <FacilityCard
  //             key={saved.id}
  //             facility={saved.facilityData}
  //             showSaveButton={false}
  //           />
  //         ))
  //       ) : (
  //         <p className="text-muted-foreground">No saved facilities yet.</p>
  //       )}
  //     </div>
  //   </div>
  // );
  // }