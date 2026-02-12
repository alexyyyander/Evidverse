import ProjectPreviewClient from "@/app/(app)/project/[id]/ProjectPreviewClient";

export default function ProjectPreviewPage({ params }: { params: { id: string } }) {
  const projectId = typeof params.id === "string" && params.id.length > 0 ? params.id : null;
  return <ProjectPreviewClient projectId={projectId} />;
}
