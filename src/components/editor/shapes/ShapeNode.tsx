import * as React from "react";
import Konva from "konva";
import {
  Arrow,
  Rect,
  Ellipse,
  Line,
  Text as KonvaText,
} from "react-konva";
import type { Shape } from "../../../store/editorStore";
import { RedactNode } from "./RedactNode";

interface Props {
  shape: Shape;
  image: HTMLImageElement | undefined;
  // Callbacks receive the shape id so the parent can pass the same stable
  // function to every node — otherwise React.memo never skips a render.
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<Shape>) => void;
  onTextEdit: (id: string) => void;
  draggable: boolean;
}

export const ShapeNode = React.memo(function ShapeNode({
  shape,
  image,
  onSelect,
  onChange: onChangeById,
  onTextEdit,
  draggable,
}: Props) {
  const select = () => onSelect(shape.id);
  const onChange = (patch: Partial<Shape>) => onChangeById(shape.id, patch);
  /** Common drag handler producing an {x,y} patch. */
  const dragPatch = (e: Konva.KonvaEventObject<DragEvent>) =>
    onChange({ x: e.target.x(), y: e.target.y() } as Partial<Shape>);
  const common = {
    id: shape.id,
    draggable,
    onMouseDown: select,
    onTap: select,
  };

  switch (shape.type) {
    case "arrow":
      return (
        <Arrow
          {...common}
          points={shape.points}
          stroke={shape.stroke}
          fill={shape.stroke}
          strokeWidth={shape.strokeWidth}
          pointerLength={Math.max(10, shape.strokeWidth * 2.5)}
          pointerWidth={Math.max(10, shape.strokeWidth * 2.5)}
          lineCap="round"
          lineJoin="round"
          hitStrokeWidth={20}
          onDragEnd={(e) => {
            const dx = e.target.x();
            const dy = e.target.y();
            e.target.position({ x: 0, y: 0 });
            onChange({
              points: shape.points.map((p, i) => (i % 2 === 0 ? p + dx : p + dy)),
            } as Partial<Shape>);
          }}
        />
      );

    case "rect":
      return (
        <Rect
          {...common}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          cornerRadius={4}
          onDragEnd={dragPatch}
          onTransformEnd={(e) => {
            const node = e.target as Konva.Rect;
            const nw = Math.max(4, node.width() * node.scaleX());
            const nh = Math.max(4, node.height() * node.scaleY());
            node.scaleX(1);
            node.scaleY(1);
            onChange({ x: node.x(), y: node.y(), width: nw, height: nh } as Partial<Shape>);
          }}
        />
      );

    case "ellipse":
      return (
        <Ellipse
          {...common}
          x={shape.x + shape.width / 2}
          y={shape.y + shape.height / 2}
          radiusX={Math.abs(shape.width) / 2}
          radiusY={Math.abs(shape.height) / 2}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          onDragEnd={(e) =>
            onChange({
              x: e.target.x() - shape.width / 2,
              y: e.target.y() - shape.height / 2,
            } as Partial<Shape>)
          }
          onTransformEnd={(e) => {
            const node = e.target as Konva.Ellipse;
            const nw = Math.max(4, node.radiusX() * 2 * node.scaleX());
            const nh = Math.max(4, node.radiusY() * 2 * node.scaleY());
            node.scaleX(1);
            node.scaleY(1);
            onChange({
              x: node.x() - nw / 2,
              y: node.y() - nh / 2,
              width: nw,
              height: nh,
            } as Partial<Shape>);
          }}
        />
      );

    case "pen":
      return (
        <Line
          {...common}
          points={shape.points}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={0.4}
          hitStrokeWidth={20}
          onDragEnd={(e) => {
            const dx = e.target.x();
            const dy = e.target.y();
            e.target.position({ x: 0, y: 0 });
            onChange({
              points: shape.points.map((p, i) => (i % 2 === 0 ? p + dx : p + dy)),
            } as Partial<Shape>);
          }}
        />
      );

    case "highlighter":
      return (
        <Line
          {...common}
          points={shape.points}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          lineCap="round"
          lineJoin="round"
          opacity={0.4}
          globalCompositeOperation="multiply"
          hitStrokeWidth={20}
          onDragEnd={(e) => {
            const dx = e.target.x();
            const dy = e.target.y();
            e.target.position({ x: 0, y: 0 });
            onChange({
              points: shape.points.map((p, i) => (i % 2 === 0 ? p + dx : p + dy)),
            } as Partial<Shape>);
          }}
        />
      );

    case "text":
      return (
        <KonvaText
          {...common}
          x={shape.x}
          y={shape.y}
          text={shape.text || " "}
          fontSize={shape.fontSize}
          fontStyle="bold"
          fill={shape.stroke}
          onDblClick={() => onTextEdit(shape.id)}
          onDblTap={() => onTextEdit(shape.id)}
          onDragEnd={dragPatch}
          onTransformEnd={(e) => {
            const node = e.target as Konva.Text;
            const scale = node.scaleX();
            node.scaleX(1);
            node.scaleY(1);
            onChange({
              x: node.x(),
              y: node.y(),
              fontSize: Math.max(8, shape.fontSize * scale),
            } as Partial<Shape>);
          }}
        />
      );

    case "blur":
    case "pixelate":
      return (
        <RedactNode
          shape={shape}
          image={image}
          onSelect={onSelect}
          onChange={onChangeById}
          draggable={draggable}
        />
      );

    default:
      return null;
  }
});
