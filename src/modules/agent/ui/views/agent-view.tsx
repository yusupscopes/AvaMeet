"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export const AgentView = () => {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.agent.getMany.queryOptions());

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
};

import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";

export const AgentViewLoading = () => {
  return (
    <LoadingState
      title="Loading Agents"
      description="This may take a few seconds"
    />
  );
};

export const AgentViewError = () => {
  return (
    <ErrorState
      title="Error Loading Agents"
      description="Something went wrong"
    />
  );
};
