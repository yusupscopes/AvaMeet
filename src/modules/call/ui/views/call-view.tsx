"use client";

import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CallProvider } from "../components/call-provider";

interface Props {
  meetingId: string;
}

export const CallView = ({ meetingId }: Props) => {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.meeting.getOne.queryOptions({ id: meetingId }),
  );

  if (data.status === "completed") {
    return (
      <div className="flex h-screen items-center justify-center">
        <ErrorState
          title="Meeting has ended"
          description="You can no longer join this meeting"
        />
      </div>
    );
  }

  return <CallProvider meetingId={meetingId} meetingName={data.name} />;
};

export const CallViewLoading = () => {
  return (
    <LoadingState
      title="Loading Call"
      description="This may take a few seconds while we prepare the call"
    />
  );
};

export const CallViewError = () => {
  return (
    <ErrorState
      title="Error Loading Call"
      description="Something went wrong while loading the call"
    />
  );
};
