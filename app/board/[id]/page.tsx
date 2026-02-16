import { LiveblocksRoom } from "@/components/providers/LiveblocksRoom";
import { BoardCanvas } from "@/components/canvas/BoardCanvas";
import { BoardHeader } from "@/components/ui/BoardHeader";
import { Toolbar } from "@/components/ui/Toolbar";
import { UserList } from "@/components/ui/UserList";

export default async function BoardPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  return (
    <LiveblocksRoom boardId={id}>
      <div className="h-screen flex flex-col relative">
        <BoardHeader boardId={id} />
        <div className="flex-1 relative overflow-hidden">
          <BoardCanvas boardId={id} />
          <div className="absolute top-4 left-4 z-10">
            <Toolbar />
          </div>
          <div className="absolute top-4 right-4 z-10">
            <UserList />
          </div>
        </div>
      </div>
    </LiveblocksRoom>
  );
}
