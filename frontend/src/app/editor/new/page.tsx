"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { projectApi } from "@/lib/api";
import PageContainer from "@/components/layout/PageContainer";
import SectionHeader from "@/components/layout/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Button from "@/components/ui/button";
import LinkButton from "@/components/ui/link-button";
import ErrorState from "@/components/ui/error-state";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => name.trim().length > 0 && !submitting, [name, submitting]);

  const handleCreate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await projectApi.create({ name: name.trim(), description: description.trim() || undefined });
      const projectId = res.data?.id;
      if (typeof projectId !== "number") {
        throw new Error("Invalid project response");
      }
      router.push(`/editor/${projectId}`);
    } catch (e: any) {
      const message =
        e?.response?.data?.detail ||
        e?.message ||
        "Failed to create project. Please check API availability and authentication.";
      setError(String(message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] py-10">
      <PageContainer>
        <div className="max-w-3xl">
          <div className="mb-8">
            <SectionHeader title="Create Project" subtitle="Start a new video project and jump into the editor." />
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground">Project Name</label>
                  <div className="mt-2">
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cat Adventure" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">Description (optional)</label>
                  <div className="mt-2">
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="A short one-liner about this project..."
                      className="min-h-[120px]"
                    />
                  </div>
                </div>

                {error ? <ErrorState title="Create failed" description={error} /> : null}

                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    If you see an auth error, obtain a token and set it in localStorage key{" "}
                    <span className="text-foreground">token</span>.
                  </div>
                  <div className="flex items-center gap-3">
                    <LinkButton href="/projects" variant="secondary">
                      Back
                    </LinkButton>
                    <Button onClick={handleCreate} disabled={!canSubmit} loading={submitting}>
                      Create & Open Editor
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}
