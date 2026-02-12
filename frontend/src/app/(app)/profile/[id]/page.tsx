import UserProfileClient from "@/app/(app)/profile/[id]/UserProfileClient";

export default function UserProfilePage({ params }: { params: { id: string } }) {
  return <UserProfileClient userId={params.id} />;
}
