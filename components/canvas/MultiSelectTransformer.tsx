"use client";

import type { RefObject } from "react";
import { useCallback, useLayoutEffect, useRef } from "react";
import { Group, Rect, Transformer } from "react-konva";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";
import type { TransformBox } from "@/lib/utils/boundingBox";
import {
  boundBoxWithAnchorPreservation,
  computeGroupBoundingBox,
} from "@/lib/utils/boundingBox";
import { computeTransformedObject } from "@/lib/utils/transformMultiSelect";

const MIN_SIZE = 20;

interface MultiSelectTransformerProps {
  selectedIds: string[];
  nodeRefsRef: RefObject<Map<string, Konva.Node>>;
  refsVersion: number;
  objects: Record<string, ObjectData>;
  onTransformEnd?: () => void;
  onContextMenu?: (clientX: number, clientY: number) => void;
}

/**
 * Transformer that wraps multiple selected nodes with a single selection box.
 * Supports stretch, rotate, and updates all objects on transform end.
 */
export function MultiSelectTransformer({
  selectedIds,
  nodeRefsRef,
  refsVersion,
  objects,
  onTransformEnd,
  onContextMenu,
}: MultiSelectTransformerProps) {
  const trRef = useRef<Konva.Transformer | null>(null);
  const rectRef = useRef<Konva.Rect | null>(null);
  const anchorBoxRef = useRef<TransformBox | null>(null);
  const dragStartRef = useRef<{
    boxX: number;
    boxY: number;
    positions: Map<string, { x: number; y: number }>;
  } | null>(null);
  const { updateObject } = useBoardMutations();

  const handleDragStart = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const rect = e.target;
      const boxX = rect.x();
      const boxY = rect.y();
      const positions = new Map<string, { x: number; y: number }>();
      const refs = nodeRefsRef.current;
      for (const id of selectedIds) {
        const obj = objects[id];
        const node = refs.get(id);
        if (obj != null && node != null) {
          positions.set(id, { x: node.x(), y: node.y() });
        }
      }
      dragStartRef.current = { boxX, boxY, positions };
    },
    [selectedIds, objects, nodeRefsRef]
  );

  const handleDragMove = useCallback(() => {
    const start = dragStartRef.current;
    const rect = rectRef.current;
    if (!start || !rect) return;

    const deltaX = rect.x() - start.boxX;
    const deltaY = rect.y() - start.boxY;
    const refs = nodeRefsRef.current;

    for (const [id, pos] of start.positions) {
      const node = refs.get(id);
      if (node) {
        node.x(pos.x + deltaX);
        node.y(pos.y + deltaY);
      }
    }

    trRef.current?.getLayer()?.batchDraw();
  }, [nodeRefsRef]);

  const handleDragEnd = useCallback(() => {
    const start = dragStartRef.current;
    if (!start) return;

    const nodes = trRef.current?.nodes() ?? [];
    const refs = nodeRefsRef.current;
    for (const node of nodes) {
      const id = Array.from(refs.entries()).find(
        ([, ref]) => ref === node
      )?.[0];
      if (!id) continue;
      updateObject(id, { x: node.x(), y: node.y() });
    }

    dragStartRef.current = null;
    trRef.current?.getLayer()?.batchDraw();
    onTransformEnd?.();
  }, [nodeRefsRef, updateObject, onTransformEnd]);

  useLayoutEffect(() => {
    const tr = trRef.current;
    if (!tr || selectedIds.length === 0) return;

    const refs = nodeRefsRef.current;
    const nodes = selectedIds
      .map((id) => refs.get(id))
      .filter((n): n is Konva.Node => n != null);

    if (nodes.length > 0) {
      tr.nodes(nodes);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedIds, nodeRefsRef, refsVersion]);

  const handleTransformEnd = () => {
    anchorBoxRef.current = null;
    const tr = trRef.current;
    if (!tr) return;

    const nodes = tr.nodes();
    const refs = nodeRefsRef.current;
    for (const node of nodes) {
      const id = Array.from(refs.entries()).find(
        ([, ref]) => ref === node
      )?.[0];
      if (!id) continue;

      const obj = objects[id];
      if (!obj) continue;

      const updates = computeTransformedObject(obj, {
        x: node.x(),
        y: node.y(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
        rotation: node.rotation(),
      });
      updateObject(id, updates);
      node.scaleX(1);
      node.scaleY(1);
      node.rotation(0);
    }

    tr.getLayer()?.batchDraw();
    onTransformEnd?.();
  };

  if (selectedIds.length < 2) return null;

  const selectedObjects = selectedIds
    .map((id) => objects[id])
    .filter((o): o is ObjectData => o != null);
  const groupBox = computeGroupBoundingBox(selectedObjects);

  return (
    <Group>
      {/* Transparent hit area for right-click context menu on selection interior */}
      <Rect
        ref={rectRef}
        x={groupBox.x}
        y={groupBox.y}
        width={groupBox.width}
        height={groupBox.height}
        fill="transparent"
        listening
        draggable
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          onContextMenu?.(e.evt.clientX, e.evt.clientY);
        }}
      />
      <Transformer
      ref={trRef}
      flipEnabled
      keepRatio={false}
      ignoreStroke
      onContextMenu={(e) => {
        e.evt.preventDefault();
        onContextMenu?.(e.evt.clientX, e.evt.clientY);
      }}
      onTransformStart={() => {
        const tr = trRef.current;
        if (tr) {
          const rect = tr.getClientRect({ relativeTo: tr.getLayer() });
          anchorBoxRef.current = {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            rotation: tr.rotation(),
          };
        }
      }}
      boundBoxFunc={(oldBox, newBox) =>
        boundBoxWithAnchorPreservation(
          oldBox,
          newBox,
          MIN_SIZE,
          MIN_SIZE,
          anchorBoxRef.current
        )
      }
      onTransformEnd={handleTransformEnd}
      />
    </Group>
  );
}
