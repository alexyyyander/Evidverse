import UserProfileClient from "@/app/(app)/profile/[id]/UserProfileClient";

export default function UserProfilePage({ params }: { params: { id: string } }) {
  const userId = Number(params.id);

  return <UserProfileClient userId={userId} />;
}
