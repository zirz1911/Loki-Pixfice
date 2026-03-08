import { memo } from 'react';
import type { FurnitureType } from '../lib/officeLayout';

const PALETTE: { type: FurnitureType; icon: string; label: string }[] = [
  { type: 'desk',      icon: '🖥️', label: 'DESK' },
  { type: 'plant',     icon: '🪴', label: 'PLANT' },
  { type: 'lamp',      icon: '💡', label: 'LAMP' },
  { type: 'bookshelf', icon: '📚', label: 'SHELF' },
];

interface Props {
  editMode: boolean;
  placingType: FurnitureType | null;
  onToggleEdit: () => void;
  onSelectPlacing: (t: FurnitureType | null) => void;
}

export const EditToolbar = memo(function EditToolbar({ editMode, placingType, onToggleEdit, onSelectPlacing }: Props) {
  return (
    <div
      style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        zIndex: 30, display: 'flex', gap: 6, alignItems: 'center',
        background: '#16202e',
        border: `2px solid ${editMode ? '#5a8cff' : '#2a3a4e'}`,
        padding: '8px 14px',
        fontFamily: "'Press Start 2P', monospace",
        boxShadow: `4px 4px 0 #0a0a14${editMode ? ', 0 0 20px #5a8cff28' : ''}`,
        pointerEvents: 'auto',
      }}
    >
      <button
        onClick={onToggleEdit}
        style={{
          background: editMode ? '#5a8cff' : '#1e2c3e',
          border: `2px solid ${editMode ? '#8aacff' : '#3a4e6a'}`,
          color: editMode ? '#1e1e2e' : '#5a8cff',
          fontFamily: 'inherit', fontSize: '9px', padding: '6px 14px',
          cursor: 'pointer', letterSpacing: '1px',
        }}
      >
        {editMode ? '✓ DONE' : '✎ EDIT'}
      </button>

      {editMode && (
        <>
          <div style={{ width: 1, height: 22, background: '#2a3a4e', margin: '0 2px' }} />
          {PALETTE.map(item => (
            <button
              key={item.type}
              onClick={() => onSelectPlacing(placingType === item.type ? null : item.type)}
              title={`Place ${item.label}`}
              style={{
                background: placingType === item.type ? '#5a8cff' : '#1e2c3e',
                border: `2px solid ${placingType === item.type ? '#8aacff' : '#3a4e6a'}`,
                color: '#e0e8ff', fontSize: '16px', padding: '2px 6px',
                cursor: 'pointer', lineHeight: 1,
              }}
            >
              {item.icon}
            </button>
          ))}
          <div style={{ width: 1, height: 22, background: '#2a3a4e', margin: '0 2px' }} />
          <span style={{ color: '#6a7a9a', fontSize: '8px', lineHeight: 1.6, maxWidth: 160 }}>
            {placingType
              ? `CLICK TO PLACE\nESC TO CANCEL`
              : `DRAG TO MOVE\nRIGHT-CLICK DELETE`}
          </span>
        </>
      )}
    </div>
  );
});
