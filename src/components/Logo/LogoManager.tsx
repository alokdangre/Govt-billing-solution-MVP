import React, { useState } from 'react';
import { 
  IonButton, 
  IonIcon, 
  IonActionSheet, 
  IonAlert, 
  IonToast 
} from '@ionic/react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { image, camera, albums, trash } from 'ionicons/icons';
import * as AppGeneral from '../socialcalc/index.js';
import './LogoManager.css';

interface LogoManagerProps {
  onLogoAdded?: (imageUrl: string) => void;
  onLogoRemoved?: () => void;
}

const LogoManager: React.FC<LogoManagerProps> = ({ onLogoAdded, onLogoRemoved }) => {
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showRemoveAlert, setShowRemoveAlert] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const takePicture = async (source: CameraSource) => {
    try {
      setIsProcessing(true);
      
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: source,
        width: 300,
        height: 200,
      });

      if (image.dataUrl) {
        // Add logo to current sheet
        const coord = { 
          [AppGeneral.getCurrentSheet()]: 'A1' // Default position, can be made configurable
        };
        
        await AppGeneral.addLogo(coord, image.dataUrl);
        
        if (onLogoAdded) {
          onLogoAdded(image.dataUrl);
        }
        
        setToastMessage('Logo added successfully!');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      setToastMessage('Failed to add logo. Please try again.');
      setShowToast(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeLogo = async () => {
    try {
      setIsProcessing(true);
      
      const coord = {
        [AppGeneral.getCurrentSheet()]: 'A1' // Same position as add
      };
      
      await AppGeneral.removeLogo(coord);
      
      if (onLogoRemoved) {
        onLogoRemoved();
      }
      
      setToastMessage('Logo removed successfully!');
      setShowToast(true);
    } catch (error) {
      console.error('Error removing logo:', error);
      setToastMessage('Failed to remove logo. Please try again.');
      setShowToast(true);
    } finally {
      setIsProcessing(false);
      setShowRemoveAlert(false);
    }
  };

  const checkPermissions = async () => {
    try {
      const permissions = await Camera.checkPermissions();
      
      if (permissions.camera === 'denied' || permissions.photos === 'denied') {
        const requestResult = await Camera.requestPermissions();
        return requestResult.camera === 'granted' && requestResult.photos === 'granted';
      }
      
      return permissions.camera === 'granted' && permissions.photos === 'granted';
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  };

  const handleAddLogo = async () => {
    const hasPermissions = await checkPermissions();
    
    if (!hasPermissions) {
      setToastMessage('Camera and photo permissions are required to add logos.');
      setShowToast(true);
      return;
    }
    
    setShowActionSheet(true);
  };

  return (
    <>
      <div className="logo-manager">
        <IonButton
          fill="clear"
          size="small"
          onClick={handleAddLogo}
          disabled={isProcessing}
          title="Add Logo"
        >
          <IonIcon icon={image} slot="icon-only" />
        </IonButton>
        
        <IonButton
          fill="clear"
          size="small"
          color="danger"
          onClick={() => setShowRemoveAlert(true)}
          disabled={isProcessing}
          title="Remove Logo"
        >
          <IonIcon icon={trash} slot="icon-only" />
        </IonButton>
      </div>

      <IonActionSheet
        isOpen={showActionSheet}
        onDidDismiss={() => setShowActionSheet(false)}
        header="Add Logo"
        buttons={[
          {
            text: 'Take Photo',
            icon: camera,
            handler: () => {
              takePicture(CameraSource.Camera);
            },
          },
          {
            text: 'Choose from Gallery',
            icon: albums,
            handler: () => {
              takePicture(CameraSource.Photos);
            },
          },
          {
            text: 'Cancel',
            role: 'cancel',
          },
        ]}
      />

      <IonAlert
        isOpen={showRemoveAlert}
        onDidDismiss={() => setShowRemoveAlert(false)}
        header="Remove Logo"
        message="Are you sure you want to remove the logo from this sheet?"
        buttons={[
          {
            text: 'Cancel',
            role: 'cancel',
          },
          {
            text: 'Remove',
            role: 'destructive',
            handler: removeLogo,
          },
        ]}
      />

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

export default LogoManager;
