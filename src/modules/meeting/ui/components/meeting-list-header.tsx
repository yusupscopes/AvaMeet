"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon, XCircleIcon } from "lucide-react";
import { NewMeetingDialog } from "./new-meeting-dialog";
import { useState } from "react";
import { MeetingSearchFilter } from "./meeting-search-filter";
import { MeetingStatusFilter } from "./meeting-status-filter";
import { MeetingAgentIdFilter } from "./meeting-agent-id-filter";
import { useMeetingsFilters } from "../../hooks/use-meetings-filters";
import { DEFAULT_PAGE } from "@/constants";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export const MeetingListHeader = () => {
  const [filters, setFilters] = useMeetingsFilters();
  const [isOpen, setIsOpen] = useState(false);

  const isAnyFilterModified =
    !!filters.search || !!filters.status || !!filters.agentId;

  const onClearFilters = () => {
    setFilters({ status: null, agentId: "", search: "", page: DEFAULT_PAGE });
  };

  return (
    <>
      <NewMeetingDialog open={isOpen} onOpenChange={setIsOpen} />
      <div className="py-4 px-4 md:px-8 flex flex-col gap-y-4">
        <div className="flex items-center justify-between">
          <h5 className="font-medium text-xl">My Meetings</h5>
          <Button onClick={() => setIsOpen(true)}>
            <PlusIcon />
            New Meeting
          </Button>
        </div>
        <ScrollArea>
          <div className="flex items-center gap-x-2 p-1">
            <MeetingSearchFilter />
            <MeetingStatusFilter />
            <MeetingAgentIdFilter />
            {isAnyFilterModified && (
              <Button variant="outline" size="sm" onClick={onClearFilters}>
                <XCircleIcon />
                Clear
              </Button>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </>
  );
};
