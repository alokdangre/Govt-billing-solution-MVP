import React, { useState, useEffect } from 'react';
import {
  IonButton,
  IonIcon,
  IonAlert,
  IonToast,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
} from '@ionic/react';
import { download, close } from 'ionicons/icons';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      setShowToast(true);
      setToastMessage('App installed successfully!');
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setToastMessage('Installing app...');
      setShowToast(true);
    } else {
      setToastMessage('Installation cancelled');
      setShowToast(true);
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
  };

  if (!showInstallPrompt) return null;

  return (
    <>
      <IonCard style={{ margin: '16px', zIndex: 1000 }}>
        <IonCardHeader>
          <IonCardTitle style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Install App
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
          <p>Install the Government Billing Solution app for a better experience!</p>
          <p style={{ fontSize: '0.9em', color: '#666' }}>
            Get quick access, offline functionality, and native app features.
          </p>
          <IonButton
            expand="block"
            onClick={handleInstallClick}
            style={{ marginTop: '16px' }}
          >
            <IonIcon icon={download} slot="start" />
            Install App
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

export default PWAInstallPrompt;
