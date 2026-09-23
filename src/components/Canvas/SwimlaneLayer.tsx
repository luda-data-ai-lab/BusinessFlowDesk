import { useMemo } from 'react';
import { ViewportPortal } from '@xyflow/react';
import { useFlowStore } from '../../hooks/useFlowStore';
import { useT } from '../../i18n';
import { computeLanes, LANE_HEADER } from '../../utils/swimlanes';

const LANE_COLORS = ['#2563EB', '#7C3AED', '#0891B2', '#D97706', '#DB2777', '#059669', '#64748B'];

export function SwimlaneLayer() {
  const t = useT();
  const enabled = useFlowStore((s) => s.swimlanes);
  const nodes = useFlowStore((s) => s.nodes);
  const direction = useFlowStore((s) => s.layoutDirection);

  const lanes = useMemo(
    () => (enabled ? computeLanes(nodes, direction) : []),
    [enabled, nodes, direction],
  );

  if (lanes.length === 0) return null;
  const isTB = direction === 'TB';

  return (
    <ViewportPortal>
      {lanes.map((lane, i) => {
        const color = LANE_COLORS[i % LANE_COLORS.length];
        return (
          <div
            key={lane.department || '__unassigned'}
            className="bfd-swimlane pointer-events-none absolute"
            style={{
              left: lane.x,
              top: lane.y,
              width: lane.width,
              height: lane.height,
              background: `${color}0D`,
              borderLeft: isTB ? `1px dashed ${color}66` : undefined,
              borderTop: !isTB ? `1px dashed ${color}66` : undefined,
              borderRight: isTB && i === lanes.length - 1 ? `1px dashed ${color}66` : undefined,
              borderBottom: !isTB && i === lanes.length - 1 ? `1px dashed ${color}66` : undefined,
            }}
          >
            <div
              className="absolute flex items-center overflow-hidden text-ellipsis whitespace-nowrap px-3 text-sm font-semibold tracking-wide"
              style={{
                color,
                background: `${color}1A`,
                ...(isTB
                  ? {
                      left: 0,
                      top: 0,
                      width: '100%',
                      height: LANE_HEADER,
                      justifyContent: 'center',
                    }
                  : { left: 0, top: 0, width: LANE_HEADER, height: '100%' }),
              }}
            >
              <span
                style={
                  isTB
                    ? undefined
                    : {
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        margin: '0 auto',
                      }
                }
              >
                {lane.department || t('unassignedLane')}
              </span>
            </div>
          </div>
        );
      })}
    </ViewportPortal>
  );
}
