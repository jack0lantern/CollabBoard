"use client";

import dynamic from "next/dynamic";

const BoardStage = dynamic(
  () => import("./BoardStage").then((m) => m.BoardStage),
  { ssr: false }
);

export function BoardCanvas({ boardId }: { boardId: string }) {
  return (
    <div className="w-full h-full relative bg-gray-100 dark:bg-gray-900">
      <BoardStage boardId={boardId} />
    </div>
  );
}
