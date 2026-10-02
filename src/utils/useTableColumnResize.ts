import { useState, useCallback, useRef } from 'react';

interface UseTableColumnResizeProps {
  columnWidths: Record<string, number>;
  defaultWidths?: Record<string, number>;
  onUpdateWidth: (colId: string, width: number) => void;
  minWidth?: number;
}

export function useTableColumnResize({
  columnWidths,
  defaultWidths,
  onUpdateWidth,
  minWidth = 40,
}: UseTableColumnResizeProps) {
  const [resizingColId, setResizingColId] = useState<string | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const activeColIdRef = useRef<string | null>(null);

  const onMouseDown = useCallback(
    (colId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const currentWidth = columnWidths[colId] || defaultWidths?.[colId] || 100;
      startXRef.current = e.clientX;
      startWidthRef.current = currentWidth;
      activeColIdRef.current = colId;
      setResizingColId(colId);

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!activeColIdRef.current) return;
        const delta = moveEvent.clientX - startXRef.current;
        const newWidth = Math.max(minWidth, startWidthRef.current + delta);
        onUpdateWidth(activeColIdRef.current, newWidth);
      };

      const onMouseUp = () => {
        activeColIdRef.current = null;
        setResizingColId(null);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [columnWidths, minWidth, onUpdateWidth]
  );

  return {
    resizingColId,
    onMouseDown,
  };
}
