import React, { useState, useEffect } from 'react';
import { IonIcon, IonSpinner, IonButton, IonPopover, IonList, IonItem, IonLabel, IonToggle, IonRange, IonText } from '@ionic/react';
import { cloudDone, cloudOffline, warning, settings } from 'ionicons/icons';
import { AutoSaveService, AutoSaveStatus, AutoSaveConfig } from './AutoSaveService';

interface AutoSaveIndicatorProps {
  className?: string;
}

const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({ className }) => {
  const [status, setStatus] = useState<AutoSaveStatus>({
    isActive: false,
    lastSaved: null,
    nextSave: null,
    hasUnsavedChanges: false
  });
  const [config, setConfig] = useState<AutoSaveConfig>({
    enabled: true,
    intervalSeconds: 30,
    showNotifications: true
  });
  const [showSettings, setShowSettings] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState<Event | undefined>(undefined);

  const autoSaveService = AutoSaveService.getInstance();

  useEffect(() => {
    // Load initial config
    setConfig(autoSaveService.getConfig());

    // Set up status change callback
    autoSaveService.setStatusChangeCallback(setStatus);

    return () => {
      // Cleanup callback
      autoSaveService.setStatusChangeCallback(() => {});
    };
  }, []);

  const handleSettingsClick = (e: React.MouseEvent) => {
    setPopoverEvent(e.nativeEvent);
    setShowSettings(true);
  };

  const handleConfigChange = (newConfig: Partial<AutoSaveConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    autoSaveService.updateConfig(newConfig);
  };

  const getStatusIcon = () => {
    if (!config.enabled) {
      return cloudOffline;
    }
    
    if (status.error) {
      return warning;
    }
    
    if (status.isActive) {
      return cloudDone;
    }
    
    return cloudOffline;
  };

  const getStatusColor = () => {
    if (!config.enabled) {
      return 'medium';
    }
    
    if (status.error) {
      return 'danger';
    }
    
    if (status.isActive && !status.hasUnsavedChanges) {
      return 'success';
    }
    
    if (status.hasUnsavedChanges) {
      return 'warning';
    }
    
    return 'medium';
  };

  const getStatusText = () => {
    if (!config.enabled) {
      return 'Auto-save disabled';
    }
    
    if (status.error) {
      return `Auto-save error: ${status.error}`;
    }
    
    if (!status.isActive) {
      return 'Auto-save inactive';
    }
    
    if (status.lastSaved) {
      const timeAgo = Math.floor((Date.now() - status.lastSaved.getTime()) / 1000);
      if (timeAgo < 60) {
        return `Saved ${timeAgo}s ago`;
      } else {
        return `Saved ${Math.floor(timeAgo / 60)}m ago`;
      }
    }
    
    if (status.nextSave) {
      const timeUntil = Math.floor((status.nextSave.getTime() - Date.now()) / 1000);
      if (timeUntil > 0) {
        return `Next save in ${timeUntil}s`;
      }
    }
    
    return 'Auto-save active';
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      return `${Math.floor(seconds / 60)}m`;
    }
  };

  return (
    <div className={`auto-save-indicator ${className || ''}`}>
      <IonButton
        fill="clear"
        size="small"
        onClick={handleSettingsClick}
        style={{
          '--color': `var(--ion-color-${getStatusColor()})`,
          minWidth: 'auto',
          height: '32px'
        }}
      >
        <IonIcon icon={getStatusIcon()} slot="start" />
        <span style={{ fontSize: '12px', marginLeft: '4px' }}>
          {getStatusText()}
        </span>
      </IonButton>

      <IonPopover
        isOpen={showSettings}
        event={popoverEvent}
        onDidDismiss={() => setShowSettings(false)}
        showBackdrop={true}
      >
        <div style={{ padding: '16px', minWidth: '300px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>
            Auto-Save Settings
          </h3>
          
          <IonList>
            <IonItem>
              <IonLabel>
                <h3>Enable Auto-Save</h3>
                <p>Automatically save changes while editing</p>
              </IonLabel>
              <IonToggle
                checked={config.enabled}
                onIonChange={(e) => handleConfigChange({ enabled: e.detail.checked })}
              />
            </IonItem>

            {config.enabled && (
              <>
                <IonItem>
                  <IonLabel>
                    <h3>Save Interval</h3>
                    <p>How often to auto-save: {formatInterval(config.intervalSeconds)}</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonRange
                    min={1}
                    max={300}
                    step={1}
                    value={config.intervalSeconds}
                    onIonInput={(e) => handleConfigChange({ intervalSeconds: e.detail.value as number })}
                    pin={true}
                    pinFormatter={(value) => formatInterval(value)}
                  >
                    <IonLabel slot="start">1s</IonLabel>
                    <IonLabel slot="end">5m</IonLabel>
                  </IonRange>
                </IonItem>

                <IonItem>
                  <IonLabel>
                    <h3>Show Notifications</h3>
                    <p>Display notifications when auto-saving</p>
                  </IonLabel>
                  <IonToggle
                    checked={config.showNotifications}
                    onIonChange={(e) => handleConfigChange({ showNotifications: e.detail.checked })}
                  />
                </IonItem>
              </>
            )}
          </IonList>

          {status.isActive && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
              <IonText color="medium">
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Status</h4>
                <p style={{ margin: '0', fontSize: '12px' }}>
                  {status.lastSaved && `Last saved: ${status.lastSaved.toLocaleTimeString()}`}
                  {status.nextSave && (
                    <>
                      <br />
                      Next save: {status.nextSave.toLocaleTimeString()}
                    </>
                  )}
                  {status.hasUnsavedChanges && (
                    <>
                      <br />
                      <span style={{ color: 'var(--ion-color-warning)' }}>
                        Unsaved changes detected
                      </span>
                    </>
                  )}
                </p>
              </IonText>
            </div>
          )}
        </div>
      </IonPopover>

      <style>{`
        .auto-save-indicator {
          display: inline-block;
        }
        
        .auto-save-indicator ion-button {
          --padding-start: 8px;
          --padding-end: 8px;
        }
        
        @media (max-width: 768px) {
          .auto-save-indicator span {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default AutoSaveIndicator;
