import React, { useState, useEffect } from 'react';
import {
  IonButton,
  IonIcon,
  IonToast,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
} from '@ionic/react';
import { refresh, close } from 'ionicons/icons';

const PWAUpdatePrompt: React.FC = () => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [updateServiceWorker, setUpdateServiceWorker] = useState<(() => void) | null>(null);

  useEffect(() => {
    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
          setUpdateServiceWorker(() => event.data.updateServiceWorker);
          setShowUpdatePrompt(true);
        }
      });
    }
  }, []);

  const handleUpdateClick = () => {
    if (updateServiceWorker) {
      updateServiceWorker();
      setShowToast(true);
      setToastMessage('App updated successfully!');
      setShowUpdatePrompt(false);
      setUpdateServiceWorker(null);
    }
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    setUpdateServiceWorker(null);
  };

  if (!showUpdatePrompt) return null;

  return (
    <>
      <IonCard style={{ margin: '16px', zIndex: 1000 }}>
        <IonCardHeader>
          <IonCardTitle style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Update Available
            <IonButton
              fill="clear"
              size="small"
              onClick={handleDismiss}
              style={{ margin: 0 }}
            >
              <IonIcon icon={close} />
            </IonButton>
          </IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <p>A new version of the app is available!</p>
          <p style={{ fontSize: '0.9em', color: '#666' }}>
            Update now to get the latest features and improvements.
          </p>
          <IonButton
            expand="block"
            onClick={handleUpdateClick}
            style={{ marginTop: '16px' }}
          >
            <IonIcon icon={refresh} slot="start" />
            Update Now
          </IonButton>
        </IonCardContent>
      </IonCard>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
        position="bottom"
      />
    </>
  );
};

export default PWAUpdatePrompt;
