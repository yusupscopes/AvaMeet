import { auth } from "@/lib/auth";
import {
  CallView,
  CallViewError,
  CallViewLoading,
} from "@/modules/call/ui/views/call-view";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface Props {
  params: Promise<{
    meetingId: string;
  }>;
}

export default async function Page({ params }: Props) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  const { meetingId } = await params;

  const queryClient = getQueryClient();
  void (await queryClient.prefetchQuery(
    trpc.meeting.getOne.queryOptions({ id: meetingId }),
  ));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<CallViewLoading />}>
        <ErrorBoundary fallback={<CallViewError />}>
          <CallView meetingId={meetingId} />
        </ErrorBoundary>
      </Suspense>
    </HydrationBoundary>
  );
}
