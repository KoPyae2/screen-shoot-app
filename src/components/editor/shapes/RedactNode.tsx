import { useEffect, useRef } from "react";
import Konva from "konva";
import { Image as KonvaImage } from "react-konva";
import type { RedactShape } from "../../../store/editorStore";
import * as React from "react";

interface Props {
  shape: RedactShape;
  image: HTMLImageElement | undefined;
  onSelect: () => void;
  onChange: (patch: Partial<RedactShape>) => void;
  draggable: boolean;
}

/**
 * A redaction rectangle: renders a crop of the base screenshot with a
 * blur or pixelate filter baked over it. Because it re-samples real pixels,
 * the obscured content is destroyed on export.
 */
export const RedactNode = React.memo(function RedactNode({
  shape, image, onSelect, onChange, draggable,
}: Props) {
  const ref = useRef<Konva.Image>(null);

  // Re-cache when geometry, strength, or the base image changes.
  useEffect(() => {
    const node = ref.current;
    if (!node || !image) return;
    node.cache();
    node.getLayer()?.batchDraw();
  }, [image, shape.x, shape.y, shape.width, shape.height, shape.strength, shape.type]);

  if (!image) return null;

  const w = Math.max(1, shape.width);
  const h = Math.max(1, shape.height);

  return (
    <KonvaImage
      ref={ref}
      id={shape.id}
      image={image}
      x={shape.x}
      y={shape.y}
      width={w}
      height={h}
      crop={{ x: shape.x, y: shape.y, width: w, height: h }}
      draggable={draggable}
      filters={
        shape.type === "blur" ? [Konva.Filters.Blur] : [Konva.Filters.Pixelate]
      }
      blurRadius={shape.type === "blur" ? shape.strength : 0}
      pixelSize={shape.type === "pixelate" ? Math.max(2, shape.strength) : 1}
      onMouseDown={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        const node = e.target;
        const nx = node.x();
        const ny = node.y();
        onChange({ x: nx, y: ny, crop: { x: nx, y: ny, width: w, height: h } } as Partial<RedactShape>);
      }}
      onTransformEnd={(e) => {
        const node = e.target as Konva.Image;
        const sx = node.scaleX();
        const sy = node.scaleY();
        const nw = Math.max(4, node.width() * sx);
        const nh = Math.max(4, node.height() * sy);
        const nx = node.x();
        const ny = node.y();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: nx,
          y: ny,
          width: nw,
          height: nh,
          crop: { x: nx, y: ny, width: nw, height: nh },
        } as Partial<RedactShape>);
      }}
    />
  );
});
