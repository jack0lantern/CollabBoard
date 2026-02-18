"use client";

import { useLayoutEffect, useRef } from "react";
import { Transformer } from "react-konva";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";
import type { TransformBox } from "@/lib/utils/boundingBox";
import { boundBoxWithAnchorPreservation } from "@/lib/utils/boundingBox";
import { computeTransformedObject } from "@/lib/utils/transformMultiSelect";

const MIN_SIZE = 20;

interface MultiSelectTransformerProps {
  selectedIds: string[];
  nodeRefs: Map<string, Konva.Node>;
  objects: Record<string, ObjectData>;
  onTransformEnd?: () => void;
}

/**
 * Transformer that wraps multiple selected nodes with a single selection box.
 * Supports stretch, rotate, and updates all objects on transform end.
 */
export function MultiSelectTransformer({
  selectedIds,
  nodeRefs,
  objects,
  onTransformEnd,
}: MultiSelectTransformerProps) {
  const trRef = useRef<Konva.Transformer | null>(null);
  const anchorBoxRef = useRef<TransformBox | null>(null);
  const { updateObject } = useBoardMutations();

  useLayoutEffect(() => {
    const tr = trRef.current;
    if (!tr || selectedIds.length === 0) return;

    const nodes = selectedIds
      .map((id) => nodeRefs.get(id))
      .filter((n): n is Konva.Node => n != null);

    if (nodes.length > 0) {
      tr.nodes(nodes);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedIds, nodeRefs]);

  const handleTransformEnd = () => {
    anchorBoxRef.current = null;
    const tr = trRef.current;
    if (!tr) return;

    const nodes = tr.nodes();
    for (const node of nodes) {
      const id = Array.from(nodeRefs.entries()).find(
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
    <Transformer
      ref={trRef}
      flipEnabled
      keepRatio={false}
      ignoreStroke
      boundBoxFunc={(oldBox, newBox) => {
        if (!anchorBoxRef.current) anchorBoxRef.current = oldBox;
        return boundBoxWithAnchorPreservation(
          oldBox,
          newBox,
          MIN_SIZE,
          MIN_SIZE,
          anchorBoxRef.current
        );
      }}
      onTransformEnd={handleTransformEnd}
    />
  );
}
