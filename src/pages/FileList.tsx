import React, { useEffect, useState } from "react";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonLabel, IonIcon, IonList, IonItem, IonSpinner, IonToast, IonSegment, IonSegmentButton, IonAlert, IonButton, IonSearchbar, IonCheckbox, IonGrid, IonRow, IonCol
} from "@ionic/react";
import { document, cloud, create, trash, cloudUpload, download, search, checkboxOutline, square } from "ionicons/icons";
import { getFirestore, collection, getDocs, addDoc } from "firebase/firestore";
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
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUploadAlert, setShowUploadAlert] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedLocalFiles, setSelectedLocalFiles] = useState<Set<string>>(new Set());
  const [selectedServerFiles, setSelectedServerFiles] = useState<Set<string>>(new Set());
  const [showSelectedUploadAlert, setShowSelectedUploadAlert] = useState(false);
  const [showSelectedDownloadAlert, setShowSelectedDownloadAlert] = useState(false);

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

  const editFile = async (key: string) => {
    try {
      const data = await local._getFile(key);
      if (!data) {
        setToastMsg(`File "${key}" not found.`);
        setShowToast(true);
        return;
      }
      
      // Store selected file info in localStorage for Home page
      localStorage.setItem('selectedFile', key);
      localStorage.setItem('selectedBillType', (data as any).billType?.toString() || '1');
      
      // Navigate to Home page to edit the file
      history.push('/');
      
      // Small delay to ensure navigation completes before loading file
      setTimeout(() => {
        try {
          AppGeneral.viewFile(key, decodeURIComponent((data as any).content));
        } catch (error) {
          console.error('Error loading file content:', error);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error editing file:', error);
      setToastMsg(`Failed to open file "${key}": ${error.message}`);
      setShowToast(true);
    }
  };

  const handleEditFile = async (key: string) => {
    console.log('Edit button clicked for file:', key);
    await editFile(key);
  };

  const handleDeleteFile = (key: string) => {
    setFileToDelete(key);
    setShowDeleteAlert(true);
  };

  const confirmDeleteFile = async () => {
    if (fileToDelete) {
      try {
        await local._deleteFile(fileToDelete);
        setToastMsg(`File "${fileToDelete}" deleted successfully.`);
        setShowToast(true);
        // Reload local files to update the list
        loadLocalFiles();
      } catch (error) {
        setToastMsg("Failed to delete file: " + error.message);
        setShowToast(true);
      }
      setFileToDelete(null);
      setShowDeleteAlert(false);
    }
  };

  const handleEditServerFile = async (file: any) => {
    try {
      console.log('Edit server file clicked:', file.name || file.id);
      
      const fileName = file.name || file.id;
      
      // Store selected file info in localStorage for Home page
      localStorage.setItem('selectedFile', fileName);
      localStorage.setItem('selectedBillType', (file.billType || 1).toString());
      
      // Navigate to Home page to edit the file
      history.push('/');
      
      // Small delay to ensure navigation completes before loading file
      setTimeout(() => {
        try {
          const content = decodeURIComponent(file.content);
          AppGeneral.viewFile(fileName, content);
        } catch (error) {
          console.error('Error loading server file content:', error);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error editing server file:', error);
      setToastMsg("Failed to load file: " + error.message);
      setShowToast(true);
    }
  };

  const handleDownloadToLocal = async (file: any) => {
    try {
      const fileName = file.name || file.id;
      
      // Check if file already exists locally
      const existingFiles = await local._getAllFiles();
      if (existingFiles[fileName]) {
        setToastMsg(`File "${fileName}" already exists locally. Please delete it first or rename the server file.`);
        setShowToast(true);
        return;
      }

      // Create a File object for local storage
      const localFile = {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        content: file.content,
        name: fileName,
        billType: file.billType || 1,
        passwordProtected: false
      };

      // Save file to local storage
      await local._saveFile(localFile);

      setToastMsg(`File "${fileName}" downloaded to local storage successfully.`);
      setShowToast(true);
      
      // Refresh local files if we're on the local tab
      if (activeTab === 'local') {
        loadLocalFiles();
      }
    } catch (error) {
      setToastMsg("Failed to download file: " + error.message);
      setShowToast(true);
    }
  };

  const handleUploadAllFiles = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.uid) {
      setToastMsg("You must be logged in to upload files to server.");
      setShowToast(true);
      return;
    }

    const localFileCount = Object.keys(localFiles).length;
    if (localFileCount === 0) {
      setToastMsg("No local files to upload.");
      setShowToast(true);
      return;
    }

    setShowUploadAlert(true);
  };

  const confirmUploadAllFiles = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.uid) {
      setToastMsg("You must be logged in to upload files.");
      setShowToast(true);
      return;
    }

    setUploading(true);
    setShowUploadAlert(false);
    
    try {
      const db = getFirestore();
      const filesCol = collection(db, `users/${user.uid}/files`);
      
      let uploadedCount = 0;
      let failedCount = 0;
      
      for (const fileName of Object.keys(localFiles)) {
        try {
          const fileData = await local._getFile(fileName);
          
          await addDoc(filesCol, {
            name: fileName,
            content: (fileData as any).content,
            billType: (fileData as any).billType || 1,
            uploadedAt: new Date().toISOString(),
            originalModified: localFiles[fileName].modified || localFiles[fileName]
          });
          
          uploadedCount++;
        } catch (error) {
          console.error(`Failed to upload ${fileName}:`, error);
          failedCount++;
        }
      }
      
      if (uploadedCount > 0) {
        setToastMsg(`Successfully uploaded ${uploadedCount} file(s) to server.${failedCount > 0 ? ` ${failedCount} file(s) failed.` : ''}`);
        // Refresh server files if we're on the server tab
        if (activeTab === 'server') {
          loadServerFiles();
        }
      } else {
        setToastMsg("Failed to upload any files to server.");
      }
      
    } catch (error) {
      setToastMsg("Failed to upload files: " + error.message);
    } finally {
      setUploading(false);
      setShowToast(true);
    }
  };

  // Filter files based on search text
  const getFilteredLocalFiles = () => {
    const fileKeys = Object.keys(localFiles);
    if (!searchText.trim()) return fileKeys;
    return fileKeys.filter(key => 
      key.toLowerCase().includes(searchText.toLowerCase())
    );
  };

  const getFilteredServerFiles = () => {
    if (!searchText.trim()) return serverFiles;
    return serverFiles.filter(file => 
      (file.name || file.id).toLowerCase().includes(searchText.toLowerCase())
    );
  };

  // Handle local file selection
  const handleLocalFileSelection = (fileName: string, checked: boolean) => {
    const newSelection = new Set(selectedLocalFiles);
    if (checked) {
      newSelection.add(fileName);
    } else {
      newSelection.delete(fileName);
    }
    setSelectedLocalFiles(newSelection);
  };

  // Handle server file selection
  const handleServerFileSelection = (fileId: string, checked: boolean) => {
    const newSelection = new Set(selectedServerFiles);
    if (checked) {
      newSelection.add(fileId);
    } else {
      newSelection.delete(fileId);
    }
    setSelectedServerFiles(newSelection);
  };

  // Handle select all local files
  const handleSelectAllLocal = (checked: boolean) => {
    if (checked) {
      setSelectedLocalFiles(new Set(getFilteredLocalFiles()));
    } else {
      setSelectedLocalFiles(new Set());
    }
  };

  // Handle select all server files
  const handleSelectAllServer = (checked: boolean) => {
    if (checked) {
      setSelectedServerFiles(new Set(getFilteredServerFiles().map(f => f.id)));
    } else {
      setSelectedServerFiles(new Set());
    }
  };

  // Upload selected files
  const handleUploadSelectedFiles = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.uid) {
      setToastMsg("You must be logged in to upload files to server.");
      setShowToast(true);
      return;
    }

    if (selectedLocalFiles.size === 0) {
      setToastMsg("No files selected for upload.");
      setShowToast(true);
      return;
    }

    setShowSelectedUploadAlert(true);
  };

  const confirmUploadSelectedFiles = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.uid) {
      setToastMsg("You must be logged in to upload files.");
      setShowToast(true);
      return;
    }

    setUploading(true);
    setShowSelectedUploadAlert(false);
    
    try {
      const db = getFirestore();
      const filesCol = collection(db, `users/${user.uid}/files`);
      
      let uploadedCount = 0;
      let failedCount = 0;
      
      for (const fileName of selectedLocalFiles) {
        try {
          const fileData = await local._getFile(fileName);
          
          await addDoc(filesCol, {
            name: fileName,
            content: (fileData as any).content,
            billType: (fileData as any).billType || 1,
            uploadedAt: new Date().toISOString(),
            originalModified: localFiles[fileName].modified || localFiles[fileName]
          });
          
          uploadedCount++;
        } catch (error) {
          console.error(`Failed to upload ${fileName}:`, error);
          failedCount++;
        }
      }
      
      if (uploadedCount > 0) {
        setToastMsg(`Successfully uploaded ${uploadedCount} file(s) to server.${failedCount > 0 ? ` ${failedCount} file(s) failed.` : ''}`);
        // Clear selection
        setSelectedLocalFiles(new Set());
        // Refresh server files if we're on the server tab
        if (activeTab === 'server') {
          loadServerFiles();
        }
      } else {
        setToastMsg("Failed to upload any files to server.");
      }
      
    } catch (error) {
      setToastMsg("Failed to upload files: " + error.message);
    } finally {
      setUploading(false);
      setShowToast(true);
    }
  };

  // Download selected files
  const handleDownloadSelectedFiles = () => {
    if (selectedServerFiles.size === 0) {
      setToastMsg("No files selected for download.");
      setShowToast(true);
      return;
    }

    setShowSelectedDownloadAlert(true);
  };

  const confirmDownloadSelectedFiles = async () => {
    setUploading(true);
    setShowSelectedDownloadAlert(false);
    
    try {
      let downloadedCount = 0;
      let failedCount = 0;
      
      for (const fileId of selectedServerFiles) {
        try {
          const file = serverFiles.find(f => f.id === fileId);
          if (!file) continue;

          const fileName = file.name || file.id;
          
          // Check if file already exists locally
          const existingFiles = await local._getAllFiles();
          if (existingFiles[fileName]) {
            console.warn(`File "${fileName}" already exists locally, skipping.`);
            failedCount++;
            continue;
          }

          // Create a File object for local storage
          const localFile = {
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            content: file.content,
            name: fileName,
            billType: file.billType || 1,
            passwordProtected: false
          };

          // Save file to local storage
          await local._saveFile(localFile);
          downloadedCount++;
        } catch (error) {
          console.error(`Failed to download file:`, error);
          failedCount++;
        }
      }
      
      if (downloadedCount > 0) {
        setToastMsg(`Successfully downloaded ${downloadedCount} file(s) to local storage.${failedCount > 0 ? ` ${failedCount} file(s) failed or already exist.` : ''}`);
        // Clear selection
        setSelectedServerFiles(new Set());
        // Refresh local files if we're on the local tab
        if (activeTab === 'local') {
          loadLocalFiles();
        }
      } else {
        setToastMsg("Failed to download any files or all files already exist locally.");
      }
      
    } catch (error) {
      setToastMsg("Failed to download files: " + error.message);
    } finally {
      setUploading(false);
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

        {/* Search Bar */}
        <IonSearchbar
          value={searchText}
          onIonInput={e => setSearchText(e.detail.value!)}
          placeholder="Search files..."
          style={{ padding: '0 16px' }}
        />
        {activeTab === 'local' ? (
          loading ? <IonSpinner /> : (
            <>
              {getFilteredLocalFiles().length > 0 && (
                <div style={{ padding: 16 }}>
                  <IonGrid>
                    <IonRow>
                      <IonCol size="12" sizeMd="6">
                        <IonButton 
                          expand="block" 
                          color="success" 
                          onClick={handleUploadAllFiles}
                          disabled={uploading}
                        >
                          <IonIcon icon={cloudUpload} slot="start" />
                          {uploading ? 'Uploading...' : `Upload All (${getFilteredLocalFiles().length})`}
                        </IonButton>
                      </IonCol>
                      <IonCol size="12" sizeMd="6">
                        <IonButton 
                          expand="block" 
                          color="secondary" 
                          onClick={handleUploadSelectedFiles}
                          disabled={uploading || selectedLocalFiles.size === 0}
                        >
                          <IonIcon icon={cloudUpload} slot="start" />
                          Upload Selected ({selectedLocalFiles.size})
                        </IonButton>
                      </IonCol>
                    </IonRow>
                  </IonGrid>
                  
                  {/* Select All Checkbox */}
                  <IonItem>
                    <IonCheckbox
                      checked={getFilteredLocalFiles().length > 0 && getFilteredLocalFiles().every(key => selectedLocalFiles.has(key))}
                      indeterminate={selectedLocalFiles.size > 0 && selectedLocalFiles.size < getFilteredLocalFiles().length}
                      onIonChange={e => handleSelectAllLocal(e.detail.checked)}
                    />
                    <IonLabel style={{ marginLeft: 12 }}>
                      Select All ({getFilteredLocalFiles().length} files)
                    </IonLabel>
                  </IonItem>
                </div>
              )}
              <IonList>
                {getFilteredLocalFiles().length === 0 && <IonItem>No local files found.</IonItem>}
                {getFilteredLocalFiles().map(key => (
                  <div key={key} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '12px 16px', 
                    borderBottom: '1px solid #e0e0e0',
                    backgroundColor: 'var(--ion-color-light)'
                  }}>
                    <IonCheckbox
                      checked={selectedLocalFiles.has(key)}
                      onIonChange={e => handleLocalFileSelection(key, e.detail.checked)}
                      style={{ marginRight: 12 }}
                    />
                    <div style={{ flex: 1, marginRight: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                        {key}
                      </div>
                      <div style={{ fontSize: 12, color: '#888' }}>
                        Last Modified: {new Date(localFiles[key].modified || localFiles[key]).toLocaleString()}
                      </div>
                    </div>
                    {/* Edit button */}
                    <div
                      style={{ 
                        marginRight: 8, 
                        cursor: 'pointer', 
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#3880ff',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '44px',
                        minHeight: '44px',
                        boxShadow: '0 2px 4px rgba(56, 128, 255, 0.3)',
                        transition: 'all 0.2s ease',
                        border: 'none'
                      }}
                      onClick={() => handleEditFile(key)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#2968ff';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(56, 128, 255, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#3880ff';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(56, 128, 255, 0.3)';
                      }}
                    >
                      <IonIcon icon={create} size="small" />
                    </div>
                    {/* Delete button */}
                    <div
                      style={{ 
                        cursor: 'pointer', 
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#eb445a',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '44px',
                        minHeight: '44px',
                        boxShadow: '0 2px 4px rgba(235, 68, 90, 0.3)',
                        transition: 'all 0.2s ease',
                        border: 'none'
                      }}
                      onClick={() => handleDeleteFile(key)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#d33a4a';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(235, 68, 90, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#eb445a';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(235, 68, 90, 0.3)';
                      }}
                    >
                      <IonIcon icon={trash} size="small" />
                    </div>
                  </div>
                ))}
              </IonList>
            </>
          )
        ) : (
          loading ? <IonSpinner /> : (
            <>
              {getFilteredServerFiles().length > 0 && (
                <div style={{ padding: 16 }}>
                  <IonButton 
                    expand="block" 
                    color="tertiary" 
                    onClick={handleDownloadSelectedFiles}
                    disabled={uploading || selectedServerFiles.size === 0}
                  >
                    <IonIcon icon={download} slot="start" />
                    Download Selected to Local ({selectedServerFiles.size})
                  </IonButton>
                  
                  {/* Select All Checkbox */}
                  <IonItem style={{ marginTop: 16 }}>
                    <IonCheckbox
                      checked={getFilteredServerFiles().length > 0 && getFilteredServerFiles().every(file => selectedServerFiles.has(file.id))}
                      indeterminate={selectedServerFiles.size > 0 && selectedServerFiles.size < getFilteredServerFiles().length}
                      onIonChange={e => handleSelectAllServer(e.detail.checked)}
                    />
                    <IonLabel style={{ marginLeft: 12 }}>
                      Select All ({getFilteredServerFiles().length} files)
                    </IonLabel>
                  </IonItem>
                </div>
              )}
              <div>
                {getFilteredServerFiles().length === 0 && (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#888' }}>
                    No server files found.
                  </div>
                )}
                {getFilteredServerFiles().map(file => (
                  <div key={file.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '12px 16px', 
                    borderBottom: '1px solid #e0e0e0',
                    backgroundColor: 'var(--ion-color-light)'
                  }}>
                    <IonCheckbox
                      checked={selectedServerFiles.has(file.id)}
                      onIonChange={e => handleServerFileSelection(file.id, e.detail.checked)}
                      style={{ marginRight: 12 }}
                    />
                    <div style={{ flex: 1, marginRight: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                        {file.name || file.id}
                      </div>
                      <div style={{ fontSize: 12, color: '#888' }}>
                        Uploaded: {file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                    {/* Edit button for server files */}
                    <div
                      style={{ 
                        marginRight: 8, 
                        cursor: 'pointer', 
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#3880ff',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '44px',
                        minHeight: '44px',
                        boxShadow: '0 2px 4px rgba(56, 128, 255, 0.3)',
                        transition: 'all 0.2s ease',
                        border: 'none'
                      }}
                      onClick={() => handleEditServerFile(file)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#2968ff';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(56, 128, 255, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#3880ff';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(56, 128, 255, 0.3)';
                      }}
                    >
                      <IonIcon icon={create} size="small" />
                    </div>
                    {/* Download to local button */}
                    <div
                      style={{ 
                        cursor: 'pointer', 
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#2dd36f',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '44px',
                        minHeight: '44px',
                        boxShadow: '0 2px 4px rgba(45, 211, 111, 0.3)',
                        transition: 'all 0.2s ease',
                        border: 'none'
                      }}
                      onClick={() => handleDownloadToLocal(file)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#24b85f';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(45, 211, 111, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#2dd36f';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(45, 211, 111, 0.3)';
                      }}
                    >
                      <IonIcon icon={download} size="small" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        )}

        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={2000} />
        
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete File"
          message={`Are you sure you want to delete "${fileToDelete}"? This action cannot be undone.`}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => {
                setFileToDelete(null);
                setShowDeleteAlert(false);
              }
            },
            {
              text: 'Delete',
              role: 'destructive',
              handler: confirmDeleteFile
            }
          ]}
        />

        <IonAlert
          isOpen={showUploadAlert}
          onDidDismiss={() => setShowUploadAlert(false)}
          header="Upload All Files"
          message={`Are you sure you want to upload all ${Object.keys(localFiles).length} local file(s) to the server?`}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => {
                setShowUploadAlert(false);
              }
            },
            {
              text: 'Upload',
              handler: confirmUploadAllFiles
            }
          ]}
        />

        <IonAlert
          isOpen={showSelectedUploadAlert}
          onDidDismiss={() => setShowSelectedUploadAlert(false)}
          header="Upload Selected Files"
          message={`Are you sure you want to upload ${selectedLocalFiles.size} selected file(s) to the server?`}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => {
                setShowSelectedUploadAlert(false);
              }
            },
            {
              text: 'Upload',
              handler: confirmUploadSelectedFiles
            }
          ]}
        />

        <IonAlert
          isOpen={showSelectedDownloadAlert}
          onDidDismiss={() => setShowSelectedDownloadAlert(false)}
          header="Download Selected Files"
          message={`Are you sure you want to download ${selectedServerFiles.size} selected file(s) to local storage?`}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => {
                setShowSelectedDownloadAlert(false);
              }
            },
            {
              text: 'Download',
              handler: confirmDownloadSelectedFiles
            }
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default FileList;
