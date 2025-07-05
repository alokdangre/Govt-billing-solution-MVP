import React, { useEffect, useState } from "react";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonLabel, IonIcon, IonList, IonItem, IonSpinner, IonToast, IonSegment, IonSegmentButton, IonAlert
} from "@ionic/react";
import { document, cloud, create } from "ionicons/icons";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { Local } from "../components/Storage/LocalStorage";
import * as AppGeneral from '../components/socialcalc/index.js';
import { useHistory } from "react-router-dom";

const FileList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'local' | 'server'>('local');
  const [localFiles, setLocalFiles] = useState<any>({});
  const [serverFiles, setServerFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);


  const local = new Local();
  const history = useHistory();
  
  // Dummy updateSelectedFile and updateBillType for demonstration
  const updateSelectedFile = (key: string) => {};
  const updateBillType = (billType: number) => {};

  // Load local files
  const loadLocalFiles = async () => {
    setLoading(true);
    const files = await local._getAllFiles();
    setLocalFiles(files);
    setLoading(false);
  };

  // Load server files
  const loadServerFiles = async () => {
    setLoading(true);
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.uid) {
      setToastMsg("You must be logged in to view server files.");
      setShowToast(true);
      setServerFiles([]);
      setLoading(false);
      return;
    }
    const db = getFirestore();
    const filesCol = collection(db, `users/${user.uid}/files`);
    const snap = await getDocs(filesCol);
    const files = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setServerFiles(files);
    setLoading(false);
  };

  const editFile = (key: string) => {
    local._getFile(key).then((data) => {
      AppGeneral.viewFile(key, decodeURIComponent((data as any).content));
      updateSelectedFile(key);
      updateBillType((data as any).billType);
      // Store selected file info in localStorage for Home page
      localStorage.setItem('selectedFile', key);
      localStorage.setItem('selectedBillType', (data as any).billType?.toString() || '1');
      // Navigate to Home page to edit the file
      history.push('/');
    });
  };

  const handleEditFile = async (key: string) => {
    editFile(key);
  };

  

  const handleEditServerFile = async (file: any) => {
    try {
      // Load file content from server and open for editing
      const content = decodeURIComponent(file.content);
      AppGeneral.viewFile(file.name || file.id, content);
      updateSelectedFile(file.name || file.id);
      updateBillType(file.billType || 1);
      // Store selected file info in localStorage for Home page
      localStorage.setItem('selectedFile', file.name || file.id);
      localStorage.setItem('selectedBillType', (file.billType || 1).toString());
      // Navigate to Home page to edit the file
      history.push('/');
    } catch (error) {
      setToastMsg("Failed to load file: " + error.message);
      setShowToast(true);
    }
  };

  useEffect(() => { if (activeTab === 'local') loadLocalFiles(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'server') loadServerFiles(); }, [activeTab]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>All Files</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonSegment value={activeTab} onIonChange={e => setActiveTab(e.detail.value as 'local' | 'server')} style={{ margin: 16 }}>
          <IonSegmentButton value="local">
            <IonIcon icon={document} />
            <IonLabel>Local</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="server">
            <IonIcon icon={cloud} />
            <IonLabel>Server</IonLabel>
          </IonSegmentButton>
        </IonSegment>
        {activeTab === 'local' ? (
          loading ? <IonSpinner /> : (
            <IonList>
              {Object.keys(localFiles).length === 0 && <IonItem>No local files found.</IonItem>}
              {Object.keys(localFiles).map(key => (
                <IonItem key={key}>
                  <IonLabel>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                      {key}
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>Last Modified: {new Date(localFiles[key].modified || localFiles[key]).toLocaleString()}</div>
                  </IonLabel>
                  {/* Edit button */}
                  <IonIcon
                    icon={create}
                    color="primary"
                    slot="end"
                    size="large"
                    style={{ marginLeft: 12, cursor: 'pointer' }}
                    onClick={() => handleEditFile(key)}
                  />
                </IonItem>
              ))}
            </IonList>
          )
        ) : (
          loading ? <IonSpinner /> : (
            <IonList>
              {serverFiles.length === 0 && <IonItem>No server files found.</IonItem>}
              {serverFiles.map(file => (
                <IonItem key={file.id}>
                  <IonLabel>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                      {file.name || file.id}
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>Uploaded: {file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : 'N/A'}</div>
                  </IonLabel>
                  {/* Edit button for server files */}
                  <IonIcon
                    icon={create}
                    color="primary"
                    slot="end"
                    size="large"
                    style={{ marginLeft: 12, cursor: 'pointer' }}
                    onClick={() => handleEditServerFile(file)}
                  />
                </IonItem>
              ))}
            </IonList>
          )
        )}

        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={2000} />
      </IonContent>
    </IonPage>
  );
};

export default FileList; 