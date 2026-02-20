"use client";

import { RealtimeBoardProvider } from "@/components/providers/RealtimeBoardProvider";
import { BoardObjectsProvider } from "@/components/providers/BoardObjectsProvider";
import { GridProvider } from "@/components/providers/GridProvider";
import { ViewportProvider } from "@/components/providers/ViewportProvider";

export function ViewBoardWrapper({
  boardId,
  children,
}: {
  boardId: string;
  children: React.ReactNode;
}) {
  return (
    <RealtimeBoardProvider
      boardId={boardId}
      userId="view-readonly"
      displayName="Viewer"
      avatarUrl={null}
      readOnly
    >
      <GridProvider>
        <ViewportProvider>
          <BoardObjectsProvider>{children}</BoardObjectsProvider>
        </ViewportProvider>
      </GridProvider>
    </RealtimeBoardProvider>
  );
}
