"use client";

import { useCallback } from "react";
import { useBoardMutations } from "@/hooks/useBoardMutations";
import { useBoardObjectsContext } from "@/hooks/useBoardObjects";
import {
  getNextZIndex,
  buildStickyNoteObject,
  buildShapeObject,
  buildFrameObject,
  buildConnectorObject,
  buildPenObject,
  formatBoardStateForAI,
  type ConnectorStyle,
  type CreateShapeType,
} from "@/lib/ai/boardTools";

/**
 * Hook that provides AI tool-callable methods for board operations.
 * Use these methods when the AI returns tool calls to create/update shapes.
 */
export function useBoardTools() {
  const { addObject, updateObject } = useBoardMutations();
  const { objects } = useBoardObjectsContext();

  const createStickyNote = useCallback(
    (text: string, x: number, y: number, color: string) => {
      const id = crypto.randomUUID();
      const obj = buildStickyNoteObject(
        text,
        x,
        y,
        color,
        getNextZIndex(objects),
        id
      );
      addObject(obj);
      return id;
    },
    [addObject, objects]
  );

  const createShape = useCallback(
    (
      type: CreateShapeType,
      x: number,
      y: number,
      width: number,
      height: number,
      color: string,
      text?: string
    ) => {
      const id = crypto.randomUUID();
      const obj = buildShapeObject(
        type,
        x,
        y,
        width,
        height,
        color,
        getNextZIndex(objects),
        id,
        text
      );
      addObject(obj);
      return id;
    },
    [addObject, objects]
  );

  const createFrame = useCallback(
    (
      title: string,
      x: number,
      y: number,
      width: number = 600,
      height: number = 400
    ) => {
      const id = crypto.randomUUID();
      const obj = buildFrameObject(
        title,
        x,
        y,
        width,
        height,
        getNextZIndex(objects),
        id
      );
      addObject(obj);
      return id;
    },
    [addObject, objects]
  );

  const createConnector = useCallback(
    (fromId: string, toId: string, style: ConnectorStyle = "arrow") => {
      const obj = buildConnectorObject(
        fromId,
        toId,
        style,
        objects,
        getNextZIndex(objects),
        crypto.randomUUID()
      );
      if (!obj) return null;
      addObject(obj);
      return obj.id;
    },
    [addObject, objects]
  );

  const createStraightLine = useCallback(
    (
      x: number,
      y: number,
      points: number[],
      strokeColor: string = "#1a1a2e",
      strokeWidth: number = 2
    ) => {
      const id = crypto.randomUUID();
      const obj = buildPenObject(
        x,
        y,
        points,
        strokeColor,
        strokeWidth,
        0,
        getNextZIndex(objects),
        id
      );
      addObject(obj);
      return id;
    },
    [addObject, objects]
  );

  const createCurvedStroke = useCallback(
    (
      x: number,
      y: number,
      points: number[],
      strokeColor: string = "#1a1a2e",
      strokeWidth: number = 2
    ) => {
      const id = crypto.randomUUID();
      const obj = buildPenObject(
        x,
        y,
        points,
        strokeColor,
        strokeWidth,
        0.5,
        getNextZIndex(objects),
        id
      );
      addObject(obj);
      return id;
    },
    [addObject, objects]
  );

  const moveObject = useCallback(
    (objectId: string, x: number, y: number) => {
      const obj = objects[objectId];
      if (!obj) return false;
      updateObject(objectId, { x, y });
      return true;
    },
    [objects, updateObject]
  );

  const resizeObject = useCallback(
    (objectId: string, width: number, height: number) => {
      const obj = objects[objectId];
      if (!obj) return false;
      if (obj.type === "circle") {
        const radius = Math.max(1, Math.min(width, height) / 2);
        updateObject(objectId, { radius });
      } else if (
        obj.type === "rect" ||
        obj.type === "sticky" ||
        obj.type === "frame" ||
        obj.type === "text"
      ) {
        updateObject(objectId, { width, height });
      } else {
        return false;
      }
      return true;
    },
    [objects, updateObject]
  );

  const updateText = useCallback(
    (objectId: string, newText: string) => {
      const obj = objects[objectId];
      if (!obj) return false;
      if (obj.type !== "sticky" && obj.type !== "text") return false;
      updateObject(objectId, { text: newText });
      return true;
    },
    [objects, updateObject]
  );

  const changeColor = useCallback(
    (objectId: string, color: string) => {
      const obj = objects[objectId];
      if (!obj) return false;
      const updates: { color?: string; strokeColor?: string } = { color };
      if (obj.type === "line" || obj.type === "pen") {
        updates.strokeColor = color;
      }
      updateObject(objectId, updates);
      return true;
    },
    [objects, updateObject]
  );

  const getBoardState = useCallback(() => {
    return formatBoardStateForAI(objects);
  }, [objects]);

  return {
    createStickyNote,
    createShape,
    createFrame,
    createConnector,
    createStraightLine,
    createCurvedStroke,
    moveObject,
    resizeObject,
    updateText,
    changeColor,
    getBoardState,
  };
}
