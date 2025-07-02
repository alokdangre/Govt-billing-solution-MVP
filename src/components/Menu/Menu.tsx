import React, { useState, useRef } from "react";
import * as AppGeneral from "../socialcalc/index.js";
import { File, Local } from "../Storage/LocalStorage";
import { isPlatform, IonToast } from "@ionic/react";
import { EmailComposer } from "capacitor-email-composer";
import { Printer } from "@ionic-native/printer";
import { IonActionSheet, IonAlert } from "@ionic/react";
import { saveOutline, save, mail, print, cloudUpload, documentText, download } from "ionicons/icons";
import { APP_NAME } from "../../app-data.js";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import jsPDF from "jspdf";

const Menu: React.FC<{
  showM: boolean;
  setM: Function;
  file: string;
  updateSelectedFile: Function;
  store: Local;
  bT: number;
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
  const doSave = () => {
    if (props.file === "default") {
      setShowAlert1(true);
      return;
    }
    const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
    const data = props.store._getFile(props.file);
    const file = new File(
      (data as any).created,
      new Date().toString(),
      content,
      props.file,
      props.bT
    );
    props.store._saveFile(file);
    props.updateSelectedFile(props.file);
    setShowAlert2(true);
  };

  const doSaveAs = async (filename) => {
    // event.preventDefault();
    if (filename) {
      // console.log(filename, _validateName(filename));
      if (await _validateName(filename)) {
        // filename valid . go on save
        const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
        // console.log(content);
        const file = new File(
          new Date().toString(),
          new Date().toString(),
          content,
          filename,
          props.bT
        );
        // const data = { created: file.created, modified: file.modified, content: file.content, password: file.password };
        // console.log(JSON.stringify(data));
        props.store._saveFile(file);
        props.updateSelectedFile(filename);
        setShowAlert4(true);
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

  const handleUploadCurrentFile = async () => {
    try {
      // Get the current file's content and name
      const data = await props.store._getFile(props.file);
      const fileContent = data.content;
      const fileName = props.file.endsWith('.json') ? props.file : props.file + '.json';
      const storage = getStorage();
      const storageRef = ref(storage, `uploads/${fileName}`);
      // Upload as a Blob
      const blob = new Blob([decodeURIComponent(fileContent)], { type: 'application/json' });
      await uploadBytes(storageRef, blob);
      setUploadToastMsg("Current file uploaded to server!");
      setShowUploadToast(true);
    } catch (err) {
      setUploadToastMsg("Upload failed: " + (err.message || err));
      setShowUploadToast(true);
    }
  };

  const handleExportAsPDF = async () => {
    try {
      // Get the current file's HTML content
      const htmlContent = AppGeneral.getCurrentHTMLContent();
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      // Add HTML to PDF
      await doc.html(htmlContent, { x: 20, y: 20 });
      doc.save((props.file || 'export') + '.pdf');
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
        ]}
      />
      <IonAlert
        animated
        isOpen={showAlert1}
        onDidDismiss={() => setShowAlert1(false)}
        header="Alert Message"
        message={
          "Cannot update <strong>" + getCurrentFileName() + "</strong> file!"
        }
        buttons={["Ok"]}
      />
      <IonAlert
        animated
        isOpen={showAlert2}
        onDidDismiss={() => setShowAlert2(false)}
        header="Save"
        message={
          "File <strong>" +
          getCurrentFileName() +
          "</strong> updated successfully"
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
          "File <strong>" +
          getCurrentFileName() +
          "</strong> saved successfully"
        }
        buttons={["Ok"]}
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
