"use client";

import type { RefObject } from "react";
import { useCallback, useLayoutEffect, useRef } from "react";
import { Group, Transformer } from "react-konva";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";
import type { TransformBox } from "@/lib/utils/boundingBox";
import { boundBoxWithAnchorPreservation } from "@/lib/utils/boundingBox";
import { computeTransformedObject } from "@/lib/utils/transformMultiSelect";

const MIN_SIZE = 20;

interface MultiSelectTransformerProps {
  selectedIds: string[];
  nodeRefsRef: RefObject<Map<string, Konva.Node>>;
  refsVersion: number;
  objects: Record<string, ObjectData>;
  onTransformEnd?: () => void;
  onTransform?: () => void;
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
  onTransform,
  onContextMenu,
}: MultiSelectTransformerProps) {
  const trRef = useRef<Konva.Transformer | null>(null);
  const anchorBoxRef = useRef<TransformBox | null>(null);
  const { updateObject } = useBoardMutations();

  const persistPositions = useCallback(() => {
    const tr = trRef.current;
    if (!tr) return;
    const nodes = tr.nodes();
    const refs = nodeRefsRef.current;
    for (const node of nodes) {
      const id = Array.from(refs.entries()).find(
        ([, ref]) => ref === node
      )?.[0];
      if (!id) continue;
      updateObject(id, { x: node.x(), y: node.y() });
    }
    tr.getLayer()?.batchDraw();
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

  useLayoutEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const back = tr.findOne(".back");
    if (!back) return;
    const handler = () => persistPositions();
    back.on("dragend", handler);
    return () => back.off("dragend", handler);
  }, [refsVersion, persistPositions]);

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

  return (
    <Group>
      <Transformer
        ref={trRef}
        flipEnabled
        keepRatio={false}
        ignoreStroke
        shouldOverdrawWholeArea
        onContextMenu={(e) => {
          e.evt.preventDefault();
          onContextMenu?.(e.evt.clientX, e.evt.clientY);
        }}
        onTransform={onTransform}
        onTransformStart={() => {
          anchorBoxRef.current = null;
        }}
        boundBoxFunc={(oldBox, newBox) => {
          if (anchorBoxRef.current == null) {
            anchorBoxRef.current = { ...oldBox };
          }
          return boundBoxWithAnchorPreservation(
            oldBox,
            newBox,
            MIN_SIZE,
            MIN_SIZE,
            anchorBoxRef.current,
            trRef.current?.getActiveAnchor() ?? undefined
          );
        }}
        onTransformEnd={handleTransformEnd}
      />
    </Group>
  );
}
