import React, { useEffect, useState } from 'react';
import { IonButton, IonIcon, IonFab, IonFabList, IonFabButton } from '@ionic/react';
import { arrowUndo, arrowRedo, reorderTwoOutline } from 'ionicons/icons';
import * as AppGeneral from '../socialcalc/index.js';
import './UndoRedo.css';

interface UndoRedoProps {
  className?: string;
  showAsFab?: boolean;
}

const UndoRedo: React.FC<UndoRedoProps> = ({ className = '', showAsFab = false }) => {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Check if undo/redo operations are available
  const checkUndoRedoAvailability = () => {
    try {
      const SocialCalc = (window as any).SocialCalc;
      if (SocialCalc && SocialCalc.GetCurrentWorkBookControl) {
        const control = SocialCalc.GetCurrentWorkBookControl();
        if (control && control.workbook && control.workbook.spreadsheet && control.workbook.spreadsheet.editor) {
          const editor = control.workbook.spreadsheet.editor;
          if (editor.context && editor.context.sheetobj && editor.context.sheetobj.changes) {
            const changes = editor.context.sheetobj.changes;
            // Check if undo stack has items
            setCanUndo(changes.stack && changes.stack.length > 0);
            // Check if redo stack has items  
            setCanRedo(changes.redo && changes.redo.length > 0);
            return;
          }
        }
      }
      // Default to enabled if we can't check properly
      setCanUndo(true);
      setCanRedo(true);
    } catch (error) {
      // Default to enabled if there's an error
      setCanUndo(true);
      setCanRedo(true);
    }
  };

  useEffect(() => {
    // Check availability on mount and periodically
    checkUndoRedoAvailability();
    const interval = setInterval(checkUndoRedoAvailability, 1000);

    // Keyboard shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        handleUndo();
      } else if ((event.ctrlKey || event.metaKey) && (event.shiftKey && event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'y')) {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleUndo = () => {
    try {
      AppGeneral.undo();
      // Force a check after operation
      setTimeout(checkUndoRedoAvailability, 100);
    } catch (error) {
      console.error('Undo failed:', error);
    }
  };

  const handleRedo = () => {
    try {
      AppGeneral.redo();
      // Force a check after operation
      setTimeout(checkUndoRedoAvailability, 100);
    } catch (error) {
      console.error('Redo failed:', error);
    }
  };

  if (showAsFab) {
    return (
      <IonFab vertical="top" horizontal="start" slot="fixed" className="undo-redo-fab">
        <IonFabButton size="small" color="secondary">
          <IonIcon icon={reorderTwoOutline} />
        </IonFabButton>
        <IonFabList side="end">
          <IonFabButton 
            size="small" 
            color="primary" 
            disabled={!canUndo}
            onClick={handleUndo}
            title="Undo (Ctrl+Z)"
          >
            <IonIcon icon={arrowUndo} />
          </IonFabButton>
          <IonFabButton 
            size="small" 
            color="primary" 
            disabled={!canRedo}
            onClick={handleRedo}
            title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
          >
            <IonIcon icon={arrowRedo} />
          </IonFabButton>
        </IonFabList>
      </IonFab>
    );
  }

  return (
    <div className={`undo-redo-buttons ${className}`}>
      <IonButton
        size="small"
        fill="clear"
        disabled={!canUndo}
        onClick={handleUndo}
        title="Undo (Ctrl+Z)"
        className="undo-button"
      >
        <IonIcon icon={arrowUndo} slot="icon-only" />
      </IonButton>
      <IonButton
        size="small"
        fill="clear"
        disabled={!canRedo}
        onClick={handleRedo}
        title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
        className="redo-button"
      >
        <IonIcon icon={arrowRedo} slot="icon-only" />
      </IonButton>
    </div>
  );
};

export default UndoRedo;
