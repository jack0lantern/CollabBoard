"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Group, Rect, Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";
import type { TransformBox } from "@/lib/utils/boundingBox";
import { boundBoxWithAnchorPreservation } from "@/lib/utils/boundingBox";
import { measureText, getCaretIndexFromPosition } from "@/lib/utils/measureText";
import {
  TEXT_BOX_PADDING,
  computeClampedCornerTransform,
  computeTextBoxDimensions,
  shouldDeleteEmptyTextOnBlur,
} from "@/lib/utils/textShapeLayout";

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 32;
const MIN_SIZE = 20;
const DEFAULT_FONT_SIZE = 16;
const DEFAULT_TEXT_COLOR = "#000000";
const DEFAULT_FONT_FAMILY = "sans-serif";
const MEASURE_MAX_WIDTH = 4000;

export function TextShape({
  data,
  onSelect,
  isSelected,
  isMultiSelect,
  registerShapeRef,
  onShapeDragEnd,
  onContextMenu,
  onDragMoveTick,
  onDragStart,
  onDragEndAt,
  onDragMoveAt,
  frameDragOffset,
  readOnly = false,
}: {
  data: ObjectData;
  onSelect: (id: string, addToSelection?: boolean) => void;
  isSelected?: boolean;
  isMultiSelect?: boolean;
  registerShapeRef?: (id: string, node: Konva.Node | null) => void;
  onShapeDragEnd?: () => void;
  onDragEndAt?: (objectId: string, newX: number, newY: number) => void;
  onDragMoveAt?: (objectId: string, newX: number, newY: number) => void;
  onContextMenu?: (id: string, clientX: number, clientY: number) => void;
  onDragMoveTick?: () => void;
  onDragStart?: (objectId: string) => void;
  frameDragOffset?: { dx: number; dy: number };
  readOnly?: boolean;
}) {
  const { updateObject, deleteObject } = useBoardMutations();
  const groupRef = useRef<Konva.Group | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const anchorBoxRef = useRef<TransformBox | null>(null);
  const isTransformingRef = useRef(false);
  const activeAnchorRef = useRef<string | null>(null);
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null);
  const [localSize, setLocalSize] = useState<{ width: number; height: number } | null>(null);
  const [localRotation, setLocalRotation] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const baseX = isDragging ? pos.x : (localPos?.x ?? data.x);
  const baseY = isDragging ? pos.y : (localPos?.y ?? data.y);
  const displayX = baseX + (frameDragOffset?.dx ?? 0);
  const displayY = baseY + (frameDragOffset?.dy ?? 0);
  const displayRotation = localRotation ?? data.rotation ?? 0;
  const editInfoRef = useRef<{
    stage: Konva.Stage;
    pos: { x: number; y: number };
    clientX?: number;
    clientY?: number;
    replaceWith?: string;
  } | null>(null);

  const prevPosRef = useRef({ x: data.x, y: data.y });
  useEffect(() => {
    if (localPos != null) {
      const prev = prevPosRef.current;
      if (data.x !== prev.x || data.y !== prev.y) {
        queueMicrotask(() => setLocalPos(null));
      }
    }
    prevPosRef.current = { x: data.x, y: data.y };
    if (!isDragging && localPos == null) {
      queueMicrotask(() => setPos({ x: data.x, y: data.y }));
    }
  }, [data.x, data.y, isDragging, localPos]);

  const prevDataRef = useRef({ width: data.width, height: data.height });
  useEffect(() => {
    if (isTransformingRef.current) return;
    if (localSize != null) {
      const prev = prevDataRef.current;
      if (data.width !== prev.width || data.height !== prev.height) {
        queueMicrotask(() => setLocalSize(null));
      }
    }
    prevDataRef.current = { width: data.width, height: data.height };
  }, [data.width, data.height, localSize]);

  const prevRotationRef = useRef(data.rotation);
  useEffect(() => {
    if (isTransformingRef.current) return;
    if (localRotation != null) {
      const prev = prevRotationRef.current;
      if (data.rotation !== prev) {
        queueMicrotask(() => setLocalRotation(null));
      }
    }
    prevRotationRef.current = data.rotation ?? 0;
  }, [data.rotation, localRotation]);

  useLayoutEffect(() => {
    if (groupRef.current != null) {
      registerShapeRef?.(data.id, groupRef.current);
    }
    return () => registerShapeRef?.(data.id, null);
  }, [data.id, registerShapeRef]);

  useLayoutEffect(() => {
    if (isSelected && !isMultiSelect && groupRef.current != null && trRef.current != null) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, isMultiSelect]);

  const width = localSize?.width ?? data.width ?? DEFAULT_WIDTH;
  const height = localSize?.height ?? data.height ?? DEFAULT_HEIGHT;
  const absWidth = Math.abs(width);
  const absHeight = Math.abs(height);
  const flipX = width < 0;
  const flipY = height < 0;

  useEffect(() => {
    if (isEditing || isSelected) return;
    const text = data.text ?? "";
    const fontSize = data.fontSize ?? DEFAULT_FONT_SIZE;
    const fontFamily = data.fontFamily ?? DEFAULT_FONT_FAMILY;
    const fontWeight = data.fontWeight ?? "normal";
    const fontStyle = data.fontStyle ?? "normal";
    const contentWidth = Math.max(absWidth - TEXT_BOX_PADDING * 2, 1);
    const measured =
      text === ""
        ? { width: 1, height: fontSize * 1.2 }
        : measureText(text, {
            fontFamily,
            fontSize,
            fontWeight,
            fontStyle,
            maxWidth: Math.max(contentWidth, MEASURE_MAX_WIDTH),
          });
    const nextSize = computeTextBoxDimensions({
      measuredWidth: measured.width,
      measuredHeight: measured.height,
      minWidth: MIN_SIZE,
      minHeight: MIN_SIZE,
    });
    const storedW = Math.abs(data.width ?? DEFAULT_WIDTH);
    const storedH = Math.abs(data.height ?? DEFAULT_HEIGHT);
    if (Math.abs(nextSize.width - storedW) > 1 || Math.abs(nextSize.height - storedH) > 1) {
      updateObject(data.id, { width: nextSize.width, height: nextSize.height });
    }
  }, [
    data.id,
    data.text,
    data.fontSize,
    data.fontFamily,
    data.fontWeight,
    data.fontStyle,
    data.width,
    data.height,
    absWidth,
    updateObject,
    isEditing,
    isSelected,
  ]);

  const didDragRef = useRef(false);
  const wasSelectedOnMouseDownRef = useRef(false);
  const handleClickToEdit = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (readOnly || e.evt.button !== 0 || isEditing || didDragRef.current) return;
      e.cancelBubble = true;
      if (!isSelected || !wasSelectedOnMouseDownRef.current) return;
      const stage = e.target.getStage();
      if (!stage) return;
      editInfoRef.current = {
        stage,
        pos: { x: displayX, y: displayY },
        clientX: e.evt.clientX,
        clientY: e.evt.clientY,
      };
      setIsEditing(true);
    },
    [displayX, displayY, isEditing, isSelected, readOnly]
  );

  const handleDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (readOnly) return;
      e.cancelBubble = true;
      const stage = e.target.getStage();
      if (!stage) return;
      editInfoRef.current = {
        stage,
        pos: { x: displayX, y: displayY },
        clientX: e.evt.clientX,
        clientY: e.evt.clientY,
      };
      setIsEditing(true);
    },
    [displayX, displayY, readOnly]
  );

  useEffect(() => {
    if (readOnly || !isSelected || isEditing || isMultiSelect) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key;
      if (key.length === 1 && !e.repeat) {
        e.preventDefault();
        const stage = groupRef.current?.getStage();
        if (!stage) return;
        editInfoRef.current = {
          stage,
          pos: { x: displayX, y: displayY },
          replaceWith: key,
        };
        setIsEditing(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [readOnly, isSelected, isEditing, isMultiSelect, displayX, displayY]);

  useEffect(() => {
    if (!isEditing || !editInfoRef.current) return;

    // Fixes for text not editable (3 reasons):
    // 1. Measure effect overwrites width/height during edit -> edit effect re-runs,
    //    cleanup destroys textarea, user loses focus. Fixed by skipping measure when isEditing.
    // 2. Opening click can bubble to window before listener is added; if timing aligns,
    //    handleOutsideClick could fire and close editor immediately. Fixed by
    //    ignoreFirstOutsideRef and using mousedown (fires before click).
    // 3. Listener added too soon can catch the same event that opened the editor.
    //    Fixed by double requestAnimationFrame to defer until after event loop clears.

    const { stage, pos, clientX, clientY, replaceWith } = editInfoRef.current;
    const stageBox = stage.container().getBoundingClientRect();
    const scaleX = stage.scaleX();
    const scaleY = stage.scaleY();
    const stageX = stage.x();
    const stageY = stage.y();

    const textX = width >= 0 ? pos.x : pos.x + width;
    const textY = height >= 0 ? pos.y : pos.y + height;
    const areaX = stageBox.left + stageX + (textX + TEXT_BOX_PADDING) * scaleX;
    const areaY = stageBox.top + stageY + (textY + TEXT_BOX_PADDING) * scaleY;
    const areaW = Math.max(1, (absWidth - TEXT_BOX_PADDING * 2) * scaleX);
    const areaH = Math.max(1, (absHeight - TEXT_BOX_PADDING * 2) * scaleY);
    const scaledFontSize = (data.fontSize ?? DEFAULT_FONT_SIZE) * scaleX;

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);

    const initialText = replaceWith != null ? replaceWith : (data.text ?? "");
    textarea.value = initialText;
    textarea.style.position = "fixed";
    textarea.style.left = `${String(areaX)}px`;
    textarea.style.top = `${String(areaY)}px`;
    textarea.style.width = `${String(areaW)}px`;
    textarea.style.height = `${String(areaH)}px`;
    textarea.style.fontSize = `${String(scaledFontSize)}px`;
    textarea.style.fontFamily = data.fontFamily ?? DEFAULT_FONT_FAMILY;
    textarea.style.fontWeight = data.fontWeight ?? "normal";
    textarea.style.fontStyle = data.fontStyle ?? "normal";
    textarea.style.textDecoration = data.textDecoration ?? "none";
    textarea.style.color = data.textColor ?? DEFAULT_TEXT_COLOR;
    textarea.style.border = "none";
    textarea.style.padding = "0";
    textarea.style.margin = "0";
    textarea.style.overflow = "hidden";
    textarea.style.background = "transparent";
    textarea.style.outline = "none";
    textarea.style.resize = "none";
    textarea.style.lineHeight = "1.2";
    textarea.style.overflowWrap = "break-word";
    if (data.textHighlightColor != null && data.textHighlightColor !== "") {
      textarea.style.backgroundColor = data.textHighlightColor;
    }

    textarea.focus();

    if (clientX != null && clientY != null && replaceWith == null) {
      const relX = clientX - areaX;
      const relY = clientY - areaY;
      const fontSize = data.fontSize ?? DEFAULT_FONT_SIZE;
      const fontFamily = data.fontFamily ?? DEFAULT_FONT_FAMILY;
      const fontWeight = data.fontWeight ?? "normal";
      const fontStyle = data.fontStyle ?? "normal";
      const maxWidth = Math.max(absWidth - TEXT_BOX_PADDING * 2, MEASURE_MAX_WIDTH);
      const caretIndex = getCaretIndexFromPosition(initialText, relX / scaleX, relY / scaleY, {
        fontFamily,
        fontSize,
        fontWeight,
        fontStyle,
        maxWidth,
      });
      textarea.setSelectionRange(caretIndex, caretIndex);
    } else if (replaceWith != null) {
      textarea.setSelectionRange(initialText.length, initialText.length);
    }

    const saveAndClose = () => {
      const value = textarea.value;
      textarea.parentNode?.removeChild(textarea);
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("touchstart", handleOutsideClick);
      if (shouldDeleteEmptyTextOnBlur(value)) {
        deleteObject(data.id);
        setIsEditing(false);
        editInfoRef.current = null;
        return;
      }
      const fontSize = data.fontSize ?? DEFAULT_FONT_SIZE;
      const fontFamily = data.fontFamily ?? DEFAULT_FONT_FAMILY;
      const fontWeight = data.fontWeight ?? "normal";
      const fontStyle = data.fontStyle ?? "normal";
      const measured = measureText(value, {
        fontFamily,
        fontSize,
        fontWeight,
        fontStyle,
        maxWidth: MEASURE_MAX_WIDTH,
      });
      const nextSize = computeTextBoxDimensions({
        measuredWidth: measured.width,
        measuredHeight: measured.height,
        minWidth: MIN_SIZE,
        minHeight: MIN_SIZE,
      });
      updateObject(data.id, {
        text: value,
        width: nextSize.width,
        height: nextSize.height,
      });
      setIsEditing(false);
      editInfoRef.current = null;
    };

    const ignoreFirstOutsideRef = { current: true };
    const handleOutsideClick = (evt: MouseEvent | TouchEvent) => {
      if (evt.target === textarea) return;
      if (ignoreFirstOutsideRef.current) {
        ignoreFirstOutsideRef.current = false;
        return;
      }
      saveAndClose();
    };

    textarea.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter" && !evt.shiftKey) {
        evt.preventDefault();
        saveAndClose();
      }
      if (evt.key === "Escape") {
        evt.preventDefault();
        textarea.value = data.text ?? "";
        saveAndClose();
      }
    });

    const resizeTextarea = () => {
      const value = textarea.value;
      const fontSize = data.fontSize ?? DEFAULT_FONT_SIZE;
      const fontFamily = data.fontFamily ?? DEFAULT_FONT_FAMILY;
      const fontWeight = data.fontWeight ?? "normal";
      const fontStyle = data.fontStyle ?? "normal";
      const measured =
        value === ""
          ? { width: 1, height: fontSize * 1.2 }
          : measureText(value, {
              fontFamily,
              fontSize,
              fontWeight,
              fontStyle,
              maxWidth: MEASURE_MAX_WIDTH,
            });
      const nextSize = computeTextBoxDimensions({
        measuredWidth: measured.width,
        measuredHeight: measured.height,
        minWidth: MIN_SIZE,
        minHeight: MIN_SIZE,
      });
      textarea.style.width = `${String(Math.max(1, (nextSize.width - TEXT_BOX_PADDING * 2) * scaleX))}px`;
      textarea.style.height = `${String(Math.max(1, (nextSize.height - TEXT_BOX_PADDING * 2) * scaleY))}px`;
    };
    textarea.addEventListener("input", resizeTextarea);
    textarea.addEventListener("keyup", resizeTextarea);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.addEventListener("mousedown", handleOutsideClick);
        window.addEventListener("touchstart", handleOutsideClick);
      });
    });

    return () => {
      textarea.removeEventListener("input", resizeTextarea);
      textarea.removeEventListener("keyup", resizeTextarea);
      if (textarea.parentNode) {
        textarea.parentNode.removeChild(textarea);
      }
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [
    isEditing,
    data.id,
    data.text,
    data.fontFamily,
    data.fontSize,
    data.fontStyle,
    data.fontWeight,
    data.textColor,
    data.textDecoration,
    data.textHighlightColor,
    absWidth,
    absHeight,
    updateObject,
    deleteObject,
    width,
    height,
  ]);

  return (
    <>
      {isSelected && !isMultiSelect && (
        <Transformer
          ref={trRef}
          flipEnabled
          keepRatio
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          ignoreStroke
          onTransformStart={() => {
            isTransformingRef.current = true;
            anchorBoxRef.current = null;
            activeAnchorRef.current = trRef.current?.getActiveAnchor() ?? null;
          }}
          onTransform={() => {
            activeAnchorRef.current = trRef.current?.getActiveAnchor() ?? null;
            onDragMoveTick?.();
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
              trRef.current?.getActiveAnchor() ?? undefined,
              true
            );
          }}
        />
      )}
      <Group
        ref={groupRef}
        x={displayX}
        y={displayY}
        rotation={displayRotation}
        draggable={!readOnly && !isEditing}
        onMouseDown={(e) => {
          if (e.evt.button !== 0) return;
          e.cancelBubble = true;
          didDragRef.current = false;
          wasSelectedOnMouseDownRef.current = Boolean(isSelected);
          onSelect(data.id, e.evt.shiftKey);
        }}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          onContextMenu?.(data.id, e.evt.clientX, e.evt.clientY);
        }}
        onClick={handleClickToEdit}
        onDblClick={handleDblClick}
        onDragStart={() => {
          setIsDragging(true);
          onDragStart?.(data.id);
          didDragRef.current = false;
        }}
        onDragMove={(e) => {
          didDragRef.current = true;
          const x = e.target.x();
          const y = e.target.y();
          setPos({ x, y });
          onDragMoveAt?.(data.id, x, y);
          onDragMoveTick?.();
        }}
        onDragEnd={(e) => {
          const newX = e.target.x();
          const newY = e.target.y();
          setLocalPos({ x: newX, y: newY });
          setIsDragging(false);
          updateObject(data.id, { x: newX, y: newY });
          onDragEndAt?.(data.id, newX, newY);
          onShapeDragEnd?.();
        }}
        onTransformEnd={() => {
          anchorBoxRef.current = null;
          isTransformingRef.current = false;
          if (isMultiSelect) return;
          const node = groupRef.current;
          if (!node) return;
          const activeAnchor = activeAnchorRef.current ?? undefined;
          activeAnchorRef.current = null;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          const newRotation = node.rotation();
          const rawW = width * scaleX;
          const rawH = height * scaleY;
          const absRawW = Math.abs(rawW);
          const absRawH = Math.abs(rawH);
          const baseFontSize = data.fontSize ?? DEFAULT_FONT_SIZE;
          const clamped = computeClampedCornerTransform({
            baseFontSize,
            rawWidth: absRawW,
            rawHeight: absRawH,
            prevWidth: absWidth,
            prevHeight: absHeight,
            activeAnchor,
            minSize: MIN_SIZE,
          });
          const { width: newWidth, height: newHeight, fontSize: newFontSize } =
            clamped;

          let newX = node.x();
          let newY = node.y();
          if (
            activeAnchor != null &&
            (newWidth !== absRawW || newHeight !== absRawH)
          ) {
            const anchoredRight =
              activeAnchor === "top-left" || activeAnchor === "bottom-left";
            const anchoredBottom =
              activeAnchor === "top-left" || activeAnchor === "top-right";
            if (anchoredRight) newX = node.x() + absRawW - newWidth;
            if (anchoredBottom) newY = node.y() + absRawH - newHeight;
          }

          setLocalSize({ width: newWidth, height: newHeight });
          setLocalRotation(newRotation);
          node.scaleX(1);
          node.scaleY(1);
          node.x(newX);
          node.y(newY);
          updateObject(data.id, {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
            fontSize: newFontSize,
            rotation: newRotation,
          });
        }}
      >
        {!isEditing && (
          <Rect
            x={flipX ? width : 0}
            y={flipY ? height : 0}
            width={absWidth}
            height={absHeight}
            fill="transparent"
          />
        )}
        {!isEditing && (
          <>
            {data.textHighlightColor != null && data.textHighlightColor !== "" && (
              <Rect
                x={flipX ? width + TEXT_BOX_PADDING : TEXT_BOX_PADDING}
                y={flipY ? height + TEXT_BOX_PADDING : TEXT_BOX_PADDING}
                width={Math.max(1, absWidth - TEXT_BOX_PADDING * 2)}
                height={Math.max(1, absHeight - TEXT_BOX_PADDING * 2)}
                fill={data.textHighlightColor}
                listening={false}
              />
            )}
            <Text
              text={data.text ?? ""}
              x={flipX ? width + TEXT_BOX_PADDING : TEXT_BOX_PADDING}
              y={flipY ? height + TEXT_BOX_PADDING : TEXT_BOX_PADDING}
              width={Math.max(1, absWidth - TEXT_BOX_PADDING * 2)}
              height={Math.max(1, absHeight - TEXT_BOX_PADDING * 2)}
              fontSize={data.fontSize ?? DEFAULT_FONT_SIZE}
              fontFamily={data.fontFamily ?? DEFAULT_FONT_FAMILY}
              fontStyle={
                [data.fontWeight === "bold" && "bold", data.fontStyle === "italic" && "italic"]
                  .filter(Boolean)
                  .join(" ") || "normal"
              }
              textDecoration={data.textDecoration ?? "none"}
              fill={data.textColor ?? DEFAULT_TEXT_COLOR}
              listening={false}
              wrap="word"
            />
          </>
        )}
      </Group>
    </>
  );
}
