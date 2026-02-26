import JSONL from "jsonl-parse-stringify";
import { inngest } from "@/inngest/client";
import { MeetingStatus, StreamTranscriptItem } from "@/modules/meeting/types";
import { database } from "@/database";
import { agent, meeting, user } from "@/database/schema";
import { eq, inArray } from "drizzle-orm";
import { createAgent, openai, TextMessage } from "@inngest/agent-kit";

const summarizer = createAgent({
  name: "Summarizer",
  system: `
  You are an expert summarizer. You write readable, concise, simple content. You are given a transcript of a meeting and you need to summarize it.

Use the following markdown structure for every output:

### Overview
Provide a detailed, engaging summary of the session's content. Focus on major features, user workflows, and any key takeaways. Write in a narrative style, using full sentences. Highlight unique or powerful aspects of the product, platform, or discussion.

### Notes
Break down key content into thematic sections with timestamp ranges. Each section should summarize key points, actions, or demos in bullet format.

Example:
#### Section Name
- Main point or demo shown here
- Another key insight or interaction
- Follow-up tool or explanation provided

#### Next Section
- Feature X automatically does Y
- Mention of integration with Z
  `.trim(),
  model: openai({ model: "gpt-4o", apiKey: process.env.OPENAI_API_KEY }),
});

export const meetingProcessing = inngest.createFunction(
  { id: "meeting/processing" },
  { event: "meeting/processing" },
  async ({ event, step }) => {
    const response = await step.run("fetch-transcript", async () => {
      const res = await fetch(event.data.transcriptUrl);
      if (!res.ok) {
        throw new Error(
          `Transcript fetch failed: ${res.status} ${res.statusText} (${event.data.transcriptUrl})`,
        );
      }
      return res.text();
    });

    const transcript = await step.run("parse-transcript", async () => {
      return JSONL.parse<StreamTranscriptItem>(response);
    });

    const transcriptWithSpeakers = await step.run("add-speakers", async () => {
      const speakerIds = [
        ...new Set(transcript.map((item) => item.speaker_id)),
      ].filter((id): id is string => id != null);

      let userSpeakers: { id: string; name: string }[] = [];
      let agentSpeakers: { id: string; name: string }[] = [];

      if (speakerIds.length > 0) {
        userSpeakers = await database
          .select()
          .from(user)
          .where(inArray(user.id, speakerIds))
          .then((users) => users.map((user) => ({ ...user })));

        agentSpeakers = await database
          .select()
          .from(agent)
          .where(inArray(agent.id, speakerIds))
          .then((agents) => agents.map((agent) => ({ ...agent })));
      }

      const speakers = [...userSpeakers, ...agentSpeakers];

      return transcript.map((item) => {
        const speaker = speakers.find(
          (speaker) => speaker.id === item.speaker_id,
        );
        if (!speaker) {
          return {
            ...item,
            user: {
              name: "Unknown",
            },
          };
        }

        return {
          ...item,
          user: {
            name: speaker.name,
          },
        };
      });
    });

    const { output } = await step.run("summarize-transcript", async () => {
      const result = await summarizer.run(
        "Summarize the following transcript: " +
          JSON.stringify(transcriptWithSpeakers),
      );
      return { output: result.output };
    });

    await step.run("save-summary", async () => {
      const firstMessage = Array.isArray(output) && output.length > 0 ? output[0] : undefined;
      const rawContent = firstMessage ? (firstMessage as TextMessage).content : undefined;
      const summary =
        typeof rawContent === "string" ? rawContent : "";

      await database
        .update(meeting)
        .set({
          summary,
          status: MeetingStatus.Completed,
        })
        .where(eq(meeting.id, event.data.meetingId));
    });
  },
);
