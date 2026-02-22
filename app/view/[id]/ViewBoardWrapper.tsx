"use client";

import { RealtimeBoardProvider } from "@/components/providers/RealtimeBoardProvider";
import { BoardObjectsProvider } from "@/components/providers/BoardObjectsProvider";
import { GridProvider } from "@/components/providers/GridProvider";
import { ViewportProvider } from "@/components/providers/ViewportProvider";
import { SelectionProvider } from "@/components/providers/SelectionProvider";

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
          <SelectionProvider>
            <BoardObjectsProvider>{children}</BoardObjectsProvider>
          </SelectionProvider>
        </ViewportProvider>
      </GridProvider>
    </RealtimeBoardProvider>
  );
}
