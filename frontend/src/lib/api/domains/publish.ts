import { get, post } from "@/lib/api/client";
import type { PublishAccount, PublishJob } from "@/lib/api/types";

export const publishApi = {
  createAccount: (data: { platform: "bilibili" | "douyin"; label?: string; credential_json: string }) =>
    post<PublishAccount>("/publish/accounts", data),
  listAccounts: () => get<PublishAccount[]>("/publish/accounts"),
  validateAccount: (accountId: string) => post<PublishAccount>(`/publish/accounts/${accountId}/validate`, {}),
  disableAccount: (accountId: string) => post<PublishAccount>(`/publish/accounts/${accountId}/disable`, {}),
  createJob: (data: {
    account_id: string;
    project_id?: string;
    branch_name?: string;
    video_url?: string;
    title?: string;
    description?: string;
    tags?: string[];
    bilibili_tid?: number;
    cover_url?: string;
    scheduled_publish_at?: string;
    multi_part?: boolean;
  }) => post<PublishJob>("/publish/jobs", data),
  getJob: (jobId: string) => get<PublishJob>(`/publish/jobs/${jobId}`),
  retryJob: (jobId: string) => post<PublishJob>(`/publish/jobs/${jobId}/retry`, {}),
};
