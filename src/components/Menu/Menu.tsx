import React, { useState, useRef } from "react";
import * as AppGeneral from "../socialcalc/index.js";
import { File, Local } from "../Storage/LocalStorage";
import { isPlatform, IonToast } from "@ionic/react";
import { EmailComposer } from "capacitor-email-composer";
import { Printer } from "@ionic-native/printer";
import { IonActionSheet, IonAlert } from "@ionic/react";
import { saveOutline, save, mail, print, cloudUpload, documentText, download, arrowUndo, arrowRedo } from "ionicons/icons";
import { APP_NAME } from "../../app-data.js";
import jsPDF from "jspdf";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getCurrentUser } from "../Firebase/auth";
import CryptoJS from "crypto-js";
import { AutoSaveService } from "../AutoSave/AutoSaveService";

const Menu: React.FC<{
  showM: boolean;
  setM: Function;
  file: string;
  updateSelectedFile: Function;
  store: Local;
  bT: number;
  setFile?: Function;
}> = (props) => {
  const [showAlert1, setShowAlert1] = useState(false);
  const [showAlert2, setShowAlert2] = useState(false);
  const [showAlert3, setShowAlert3] = useState(false);
  const [showAlert4, setShowAlert4] = useState(false);
  const [showToast1, setShowToast1] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const fileInputRef = useRef(null);
  const [showUploadToast, setShowUploadToast] = useState(false);
  const [uploadToastMsg, setUploadToastMsg] = useState("");
  const [showFileNamePrompt, setShowFileNamePrompt] = useState(false);
  const [pendingUploadContent, setPendingUploadContent] = useState(null);
  const [pendingUploadName, setPendingUploadName] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingPassword, setPendingPassword] = useState("");
  const [pendingFileName, setPendingFileName] = useState("");
  const [showFileNamePromptForPassword, setShowFileNamePromptForPassword] = useState(false);
  const [pendingPasswordAction, setPendingPasswordAction] = useState(null);

  /* Utility functions */
  const _validateName = async (filename) => {
    filename = filename.trim();
    if (filename === "default" || filename === "Untitled") {
      setToastMessage("Cannot update default file!");
      return false;
    } else if (filename === "" || !filename) {
      setToastMessage("Filename cannot be empty");
      return false;
    } else if (filename.length > 30) {
      setToastMessage("Filename too long");
      return false;
    } else if (/^[a-zA-Z0-9- ]*$/.test(filename) === false) {
      setToastMessage("Special Characters cannot be used");
      return false;
    } else if (await props.store._checkKey(filename)) {
      setToastMessage("Filename already exists");
      return false;
    }
    return true;
  };

  const getCurrentFileName = () => {
    return props.file;
  };

  const _formatString = (filename) => {
    /* Remove whitespaces */
    while (filename.indexOf(" ") !== -1) {
      filename = filename.replace(" ", "");
    }
    return filename;
  };

  const doPrint = () => {
    if (isPlatform("hybrid")) {
      const printer = Printer;
      printer.print(AppGeneral.getCurrentHTMLContent());
    } else {
      const content = AppGeneral.getCurrentHTMLContent();
      // useReactToPrint({ content: () => content });
      const printWindow = window.open("/printwindow", "Print Invoice");
      printWindow.document.write(content);
      printWindow.print();
    }
  };
  const doSave = async () => {
    if (props.file === "default") {
      setShowAlert1(true);
      return;
    }
    
    try {
      const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
      const data = await props.store._getFile(props.file);
      const file = new File(
        (data as any).created,
        new Date().toISOString(),
        content,
        props.file,
        props.bT
      );
      await props.store._saveFile(file);
      props.updateSelectedFile(props.file);
      
      // Update auto-save service with the new content
      const autoSaveService = AutoSaveService.getInstance();
      autoSaveService.updateCurrentFile(props.file, props.bT);
      
      setShowAlert2(true);
    } catch (error) {
      console.error('Save failed:', error);
      setToastMessage("Failed to save file: " + error.message);
      setShowToast1(true);
    }
  };

  const doSaveAs = async (filename) => {
    // event.preventDefault();
    if (filename) {
      // console.log(filename, _validateName(filename));
      if (await _validateName(filename)) {
        try {
          // filename valid . go on save
          const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
          // console.log(content);
          const file = new File(
            new Date().toISOString(),
            new Date().toISOString(),
            content,
            filename,
            props.bT
          );
          // const data = { created: file.created, modified: file.modified, content: file.content, password: file.password };
          // console.log(JSON.stringify(data));
          await props.store._saveFile(file);
          props.updateSelectedFile(filename);
          
          // Update auto-save service with the new file
          const autoSaveService = AutoSaveService.getInstance();
          autoSaveService.updateCurrentFile(filename, props.bT);
          
          setShowAlert4(true);
        } catch (error) {
          console.error('Save As failed:', error);
          setToastMessage("Failed to save file: " + error.message);
          setShowToast1(true);
        }
      } else {
        setShowToast1(true);
      }
    }
  };

  const sendEmail = () => {
    if (isPlatform("hybrid")) {
      const content = AppGeneral.getCurrentHTMLContent();
      const base64 = btoa(content);

      EmailComposer.open({
        to: ["jackdwell08@gmail.com"],
        cc: [],
        bcc: [],
        body: "PFA",
        attachments: [{ type: "base64", path: base64, name: "Invoice.html" }],
        subject: `${APP_NAME} attached`,
        isHtml: true,
      });
    } else {
      alert("This Functionality works on Anroid/IOS devices");
    }
  };

  const saveFileAs = async (fileName) => {
    const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
    const file = new File(
      new Date().toString(),
      new Date().toString(),
      content,
      fileName,
      props.bT
    );
    await props.store._saveFile(file);
    props.updateSelectedFile(fileName);
    return file;
  };

  const handleUploadCurrentFile = async () => {
    try {
      // Check if user is logged in
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setUploadToastMsg("You must be logged in to upload to server.");
        setShowUploadToast(true);
        return;
      }
      // Get the current file's content and name
      let fileName = props.file;
      let data = await props.store._getFile(props.file);
      let fileContent = data ? data.content : null;
      if (!fileName || !fileContent) {
        // Prompt for file name, then save as, then upload
        setShowFileNamePrompt(true);
        setPendingUploadContent(AppGeneral.getSpreadsheetContent());
        setPendingUploadName("");
        setPendingPasswordAction(() => async (fileName) => {
          await saveFileAs(fileName); // Save as logic
          setPendingUploadName(fileName);
          // Now upload
          const db = getFirestore();
          await setDoc(doc(db, `users/${currentUser.uid}/files`, fileName.endsWith('.json') ? fileName : fileName + '.json'), {
            name: fileName.endsWith('.json') ? fileName : fileName + '.json',
            content: encodeURIComponent(AppGeneral.getSpreadsheetContent()),
            uploadedAt: new Date().toISOString(),
          });
          setUploadToastMsg(`File '${fileName}' uploaded to Firestore!`);
          setShowUploadToast(true);
        });
        return;
      }
      fileName = fileName.endsWith('.json') ? fileName : fileName + '.json';
      const db = getFirestore();
      await setDoc(doc(db, `users/${currentUser.uid}/files`, fileName), {
        name: fileName,
        content: fileContent,
        uploadedAt: new Date().toISOString(),
      });
      setUploadToastMsg(`File '${fileName}' uploaded to Firestore!`);
      setShowUploadToast(true);
    } catch (err) {
      setUploadToastMsg("Upload failed: " + (err.message || err));
      setShowUploadToast(true);
    }
  };

  const handleFileNamePromptOk = async (alertData) => {
    const user = JSON.parse(localStorage.getItem('user'));
    let fileName = alertData.fileName;
    if (!fileName) {
      setUploadToastMsg("File name is required.");
      setShowUploadToast(true);
      return;
    }
    if (pendingPasswordAction) {
      await pendingPasswordAction(fileName);
      setShowFileNamePrompt(false);
      return;
    }
    fileName = fileName.endsWith('.json') ? fileName : fileName + '.json';
    const db = getFirestore();
    await setDoc(doc(db, `users/${user.uid}/files`, fileName), {
      name: fileName,
      content: encodeURIComponent(pendingUploadContent),
      uploadedAt: new Date().toISOString(),
    });
    setShowFileNamePrompt(false);
    setUploadToastMsg(`File '${fileName}' uploaded to Firestore!`);
    setShowUploadToast(true);
  };

  const handleExportAsPDF = async () => {
    try {
      // Get the current file's HTML content
      const htmlContent = AppGeneral.getCurrentHTMLContent();
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      // Add HTML to PDF
      await doc.html(htmlContent, { x: 20, y: 20 });
      const fileName = (props.file || 'export') + '.pdf';
      doc.save(fileName);
      
      // Call webhook after successful PDF generation
      const webhookPayload = {
        subject: "C4GT",
        message: "Completed",
        event: "pdf_generated",
        fileName: fileName,
        timestamp: new Date().toISOString(),
        fileSource: "govt-billing-app"
      };
      
      try {
        const webhookUrl = '/api/webhook'; // Use local proxy
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload)
        });
        
        console.log('Webhook called for PDF generation. Response status:', response.status);
        console.log('Webhook payload sent:', webhookPayload);
      } catch (webhookErr) {
        console.error('Webhook call failed:', webhookErr);
        console.log('Attempted to send webhook payload:', webhookPayload);
        // Don't show error to user for webhook failure, as PDF generation was successful
      }
      
      setUploadToastMsg("PDF exported!");
      setShowUploadToast(true);
    } catch (err) {
      setUploadToastMsg("PDF export failed: " + (err.message || err));
      setShowUploadToast(true);
    }
  };

  const handleExportAsCSV = async () => {
    try {
      // Get the current file's CSV content
      const csvContent = AppGeneral.getCSVContent();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (props.file || 'export') + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setUploadToastMsg("CSV exported!");
      setShowUploadToast(true);
    } catch (err) {
      setUploadToastMsg("CSV export failed: " + (err.message || err));
      setShowUploadToast(true);
    }
  };

  const handlePasswordProtect = async () => {
    setPendingFileName(props.file);
    // Try to get the file
    const data = await props.store._getFile(props.file);
    if (!data) {
      // Prompt for file name, then save as, then ask password
      setShowFileNamePromptForPassword(true);
      setPendingPasswordAction(() => async (fileName) => {
        await saveFileAs(fileName); // Save as logic
        setPendingFileName(fileName);
        setShowPasswordPrompt(true);
      });
      return;
    }
    setShowPasswordPrompt(true);
  };

  const handleFileNamePromptForPasswordOk = async (alertData) => {
    const fileName = alertData.fileName;
    if (!fileName) {
      setUploadToastMsg("File name is required.");
      setShowUploadToast(true);
      return;
    }
    if (pendingPasswordAction) {
      await pendingPasswordAction(fileName);
      setShowFileNamePromptForPassword(false);
    }
  };

  const handlePasswordPromptOk = async (alertData) => {
    const password = alertData.password;
    if (!password) {
      setUploadToastMsg("Password is required.");
      setShowUploadToast(true);
      return;
    }
    try {
      const data = await props.store._getFile(pendingFileName);
      if (!data) {
        setUploadToastMsg("File not found.");
        setShowUploadToast(true);
        return;
      }
      // Encrypt content
      const encrypted = CryptoJS.AES.encrypt(decodeURIComponent(data.content), password).toString();
      data.content = encrypted;
      data.passwordProtected = true;
      await props.store._saveFile(data);
      setShowPasswordPrompt(false);
      setUploadToastMsg("File password protected!");
      setShowUploadToast(true);
    } catch (err) {
      setUploadToastMsg("Failed to protect file: " + (err.message || err));
      setShowUploadToast(true);
    }
  };

  return (
    <React.Fragment>
      <IonActionSheet
        animated
        keyboardClose
        isOpen={props.showM}
        onDidDismiss={() => props.setM()}
        header="File Actions"
        buttons={[
          {
            text: "Save",
            icon: saveOutline,
            handler: () => { doSave(); },
            cssClass: 'action-sheet-save',
          },
          {
            text: "Save As",
            icon: save,
            handler: () => { setShowAlert3(true); },
            cssClass: 'action-sheet-saveas',
          },
          {
            text: "Print",
            icon: print,
            handler: () => { doPrint(); },
            cssClass: 'action-sheet-print',
          },
          {
            text: "Email",
            icon: mail,
            handler: () => { sendEmail(); },
            cssClass: 'action-sheet-email',
          },
          {
            text: "Upload File to Server",
            icon: cloudUpload,
            handler: handleUploadCurrentFile,
            cssClass: 'action-sheet-upload',
          },
          // Divider
          // {
          //   text: "---",
          //   role: 'destructive',
          //   cssClass: 'action-sheet-divider',
          //   handler: () => {},
          // },
          {
            text: "Export as PDF",
            icon: documentText,
            handler: handleExportAsPDF,
            cssClass: 'action-sheet-pdf',
          },
          {
            text: "Export as CSV",
            icon: download,
            handler: handleExportAsCSV,
            cssClass: 'action-sheet-csv',
          },
          {
            text: "Password Protect File",
            handler: handlePasswordProtect,
            cssClass: 'action-sheet-password',
          },
          {
            text: "Undo",
            icon: arrowUndo,
            handler: () => { AppGeneral.undo(); },
            cssClass: 'action-sheet-undo',
          },
          {
            text: "Redo",
            icon: arrowRedo,
            handler: () => { AppGeneral.redo(); },
            cssClass: 'action-sheet-redo',
          },
        ]}
      />
      <IonAlert
        animated
        isOpen={showAlert1}
        onDidDismiss={() => setShowAlert1(false)}
        header="Alert Message"
        message={
          "Cannot update " + getCurrentFileName() + " file!"
        }
        buttons={["Ok"]}
      />
      <IonAlert
        animated
        isOpen={showAlert2}
        onDidDismiss={() => setShowAlert2(false)}
        header="Save"
        message={
          "File " +
          getCurrentFileName() +
          " updated successfully"
        }
        buttons={["Ok"]}
      />
      <IonAlert
        animated
        isOpen={showAlert3}
        onDidDismiss={() => setShowAlert3(false)}
        header="Save As"
        inputs={[
          { name: "filename", type: "text", placeholder: "Enter filename" },
        ]}
        buttons={[
          {
            text: "Ok",
            handler: (alertData) => {
              doSaveAs(alertData.filename);
            },
          },
        ]}
      />
      <IonAlert
        animated
        isOpen={showAlert4}
        onDidDismiss={() => setShowAlert4(false)}
        header="Save As"
        message={
          "File " +
          getCurrentFileName() +
          " saved successfully"
        }
        buttons={["Ok"]}
      />
      <IonAlert
        isOpen={showFileNamePrompt}
        onDidDismiss={() => setShowFileNamePrompt(false)}
        header="Enter File Name"
        inputs={[
          { name: "fileName", type: "text", placeholder: "Enter file name" },
        ]}
        buttons={[
          { text: "Cancel", role: "cancel", handler: () => setShowFileNamePrompt(false) },
          { text: "OK", handler: handleFileNamePromptOk },
        ]}
      />
      <IonAlert
        isOpen={showPasswordPrompt}
        onDidDismiss={() => setShowPasswordPrompt(false)}
        header="Set Password"
        inputs={[
          { name: "password", type: "password", placeholder: "Enter password" },
        ]}
        buttons={[
          { text: "Cancel", role: "cancel", handler: () => setShowPasswordPrompt(false) },
          { text: "OK", handler: handlePasswordPromptOk },
        ]}
      />
      <IonAlert
        isOpen={showFileNamePromptForPassword}
        onDidDismiss={() => setShowFileNamePromptForPassword(false)}
        header="Enter File Name"
        inputs={[
          { name: "fileName", type: "text", placeholder: "Enter file name" },
        ]}
        buttons={[
          { text: "Cancel", role: "cancel", handler: () => setShowFileNamePromptForPassword(false) },
          { text: "OK", handler: handleFileNamePromptForPasswordOk },
        ]}
      />
      <IonToast
        animated
        isOpen={showToast1}
        onDidDismiss={() => {
          setShowToast1(false);
          setShowAlert3(true);
        }}
        position="bottom"
        message={toastMessage}
        duration={500}
      />
      <IonToast
        isOpen={showUploadToast}
        onDidDismiss={() => setShowUploadToast(false)}
        message={uploadToastMsg}
        duration={2000}
      />
      <style>{`
      .action-sheet-save, .action-sheet-saveas, .action-sheet-print, .action-sheet-email, .action-sheet-upload, .action-sheet-pdf, .action-sheet-csv {
        font-size: 1.1rem;
        font-weight: 500;
      }
      .action-sheet-divider {
        pointer-events: none;
        background: #f4f4f4;
        height: 2px;
        margin: 8px 0;
      }
      @media (max-width: 600px) {
        .action-sheet-save, .action-sheet-saveas, .action-sheet-print, .action-sheet-email, .action-sheet-upload, .action-sheet-pdf, .action-sheet-csv {
          font-size: 1.2rem;
          padding: 18px 0;
        }
      }
      `}</style>
    </React.Fragment>
  );
};

export default Menu;
