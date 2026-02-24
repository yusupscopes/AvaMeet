import { database } from "@/database";
import { agent, meeting } from "@/database/schema";
import { streamVideo } from "@/lib/stream-video";
import { and, eq, not } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import {
  CallEndedEvent,
  CallTranscriptionReadyEvent,
  CallSessionParticipantLeftEvent,
  CallRecordingReadyEvent,
  CallSessionStartedEvent,
} from "@stream-io/node-sdk";
import { MeetingStatus } from "@/modules/meeting/types";
import { inngest } from "@/inngest/client";

function verifySignatureWithSDK(body: string, signature: string): boolean {
  return streamVideo.verifyWebhook(body, signature);
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-signature");
  const apiKey = request.headers.get("x-api-key");

  if (!signature || !apiKey) {
    return NextResponse.json(
      { error: "Missing signature or API key" },
      { status: 400 },
    );
  }

  const body = await request.text();
  if (!verifySignatureWithSDK(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body) as Record<string, unknown>;
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = (payload as Record<string, unknown>)?.type;

  if (eventType === "call.session_started") {
    const event = payload as CallSessionStartedEvent;
    const meetingId = event.call.custom?.meetingId as string;

    if (!meetingId) {
      return NextResponse.json(
        { error: "Missing meeting ID" },
        { status: 400 },
      );
    }

    const [existingMeeting] = await database
      .select()
      .from(meeting)
      .where(
        and(
          eq(meeting.id, meetingId),
          not(eq(meeting.status, MeetingStatus.Completed)),
          not(eq(meeting.status, MeetingStatus.Active)),
          not(eq(meeting.status, MeetingStatus.Canceled)),
          not(eq(meeting.status, MeetingStatus.Processing)),
        ),
      );

    if (!existingMeeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    await database
      .update(meeting)
      .set({ status: MeetingStatus.Active, startedAt: new Date() })
      .where(eq(meeting.id, existingMeeting.id));

    const [existingAgent] = await database
      .select()
      .from(agent)
      .where(eq(agent.id, existingMeeting.agentId));

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const call = streamVideo.video.call("default", meetingId);
    const realtimeClient = await streamVideo.video.connectOpenAi({
      call,
      openAiApiKey: process.env.OPENAI_API_KEY!,
      agentUserId: existingAgent.id,
    });

    realtimeClient.updateSession({
      instructions: existingAgent.instructions,
    });
  } else if (eventType === "call.session_participant_left") {
    const event = payload as CallSessionParticipantLeftEvent;
    const meetingId = event.call_cid.split(":")[1]; // call_cid is formatted as "type:id"

    if (!meetingId) {
      return NextResponse.json(
        { error: "Missing meeting ID" },
        { status: 400 },
      );
    }

    const call = streamVideo.video.call("default", meetingId);
    await call.end();
  } else if (eventType === "call.session_ended") {
    const event = payload as CallEndedEvent;
    const meetingId = event.call.custom?.meetingId as string;

    if (!meetingId) {
      return NextResponse.json(
        { error: "Missing meeting ID" },
        { status: 400 },
      );
    }

    await database
      .update(meeting)
      .set({ status: MeetingStatus.Processing, endedAt: new Date() })
      .where(
        and(
          eq(meeting.id, meetingId),
          eq(meeting.status, MeetingStatus.Active),
        ),
      );
  } else if (eventType === "call.transcription_ready") {
    const event = payload as CallTranscriptionReadyEvent;
    const meetingId = event.call_cid.split(":")[1]; // call_cid is formatted as "type:id"

    if (!meetingId) {
      return NextResponse.json(
        { error: "Missing meeting ID" },
        { status: 400 },
      );
    }

    const [updatedMeeting] = await database
      .update(meeting)
      .set({ transcriptUrl: event.call_transcription.url })
      .where(eq(meeting.id, meetingId))
      .returning();

    await inngest.send({
      name: "meeting/processing",
      data: {
        meetingId: updatedMeeting.id,
        transcriptUrl: updatedMeeting.transcriptUrl,
      },
    });
  } else if (eventType === "call.recording_ready") {
    const event = payload as CallRecordingReadyEvent;
    const meetingId = event.call_cid.split(":")[1]; // call_cid is formatted as "type:id"

    if (!meetingId) {
      return NextResponse.json(
        { error: "Missing meeting ID" },
        { status: 400 },
      );
    }

    await database
      .update(meeting)
      .set({ recordingUrl: event.call_recording.url })
      .where(eq(meeting.id, meetingId));
  }

  return NextResponse.json({ status: "success" }, { status: 200 });
}
