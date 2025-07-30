import React, { useState, useEffect } from "react";
import "./Files.css";
import * as AppGeneral from "../socialcalc/index.js";
import { DATA } from "../../app-data.js";
import { Local } from "../Storage/LocalStorage";
import {
  IonIcon,
  IonModal,
  IonItem,
  IonButton,
  IonList,
  IonLabel,
  IonAlert,
  IonItemGroup,
  IonBadge,
} from "@ionic/react";
import { fileTrayFull, trash, create, lockClosed } from "ionicons/icons";

const Files: React.FC<{
  store: Local;
  file: string;
  updateSelectedFile: Function;
  updateBillType: Function;
}> = (props) => {
  const [modal, setModal] = useState(null);
  const [listFiles, setListFiles] = useState(false);
  const [showAlert1, setShowAlert1] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [currentKey, setCurrentKey] = useState(null);
  const [passwordAttempt, setPasswordAttempt] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const editFile = async (key) => {
    try {
      const isProtected = await props.store._isPasswordProtected(key);
      
      if (isProtected) {
        setCurrentKey(key);
        setShowPasswordPrompt(true);
        setPasswordError("");
        return;
      }
      
      const data = await props.store._getFile(key);
      AppGeneral.viewFile(key, decodeURIComponent((data as any).content));
      props.updateSelectedFile(key);
      props.updateBillType((data as any).billType);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const editFileWithPassword = async (key, password) => {
    try {
      const data = await props.store._getFileWithPassword(key, password);
      AppGeneral.viewFile(key, decodeURIComponent(data.content));
      props.updateSelectedFile(key);
      props.updateBillType(data.billType);
      setShowPasswordPrompt(false);
      setPasswordAttempt("");
      setPasswordError("");
    } catch (error) {
      setPasswordError("Invalid password. Please try again.");
    }
  };

  const deleteFile = (key) => {
    setShowAlert1(true);
    setCurrentKey(key);
  };

  const loadDefault = () => {
    const msc = DATA["home"][AppGeneral.getDeviceType()]["msc"];
    AppGeneral.viewFile("default", JSON.stringify(msc));
    props.updateSelectedFile("default");
  };

  const _formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const temp = async () => {
    const files = await props.store._getAllFiles();
    const fileList = await Promise.all(
      Object.keys(files).map(async (key) => {
        const isProtected = await props.store._isPasswordProtected(key);
        return (
          <IonItemGroup key={key}>
            <IonItem>
              <IonLabel>
                {key}
                {isProtected && (
                  <IonBadge color="warning" style={{ marginLeft: '8px' }}>
                    <IonIcon icon={lockClosed} style={{ marginRight: '4px' }} />
                    Protected
                  </IonBadge>
                )}
              </IonLabel>
              {_formatDate(files[key])}

              <IonIcon
                icon={create}
                color="warning"
                slot="end"
                size="large"
                onClick={() => {
                  setListFiles(false);
                  editFile(key);
                }}
              />

              <IonIcon
                icon={trash}
                color="danger"
                slot="end"
                size="large"
                onClick={() => {
                  setListFiles(false);
                  deleteFile(key);
                }}
              />
            </IonItem>
          </IonItemGroup>
        );
      })
    );

    const ourModal = (
      <IonModal isOpen={listFiles} onDidDismiss={() => setListFiles(false)}>
        <IonList>{fileList}</IonList>
        <IonButton
          expand="block"
          color="secondary"
          onClick={() => {
            setListFiles(false);
          }}
        >
          Back
        </IonButton>
      </IonModal>
    );
    setModal(ourModal);
  };

  useEffect(() => {
    temp();
  }, [listFiles]);

  return (
    <React.Fragment>
      <IonIcon
        icon={fileTrayFull}
        className="ion-padding-end"
        slot="end"
        size="large"
        onClick={() => {
          setListFiles(true);
        }}
      />
      {modal}
      <IonAlert
        animated
        isOpen={showAlert1}
        onDidDismiss={() => setShowAlert1(false)}
        header="Delete file"
        message={"Do you want to delete the " + currentKey + " file?"}
        buttons={[
          { text: "No", role: "cancel" },
          {
            text: "Yes",
            handler: () => {
              props.store._deleteFile(currentKey);
              loadDefault();
              setCurrentKey(null);
            },
          },
        ]}
      />
      <IonAlert
        animated
        isOpen={showPasswordPrompt}
        onDidDismiss={() => {
          setShowPasswordPrompt(false);
          setPasswordAttempt("");
          setPasswordError("");
        }}
        header="Password Protected File"
        message={passwordError || "Enter password to open this file:"}
        inputs={[
          {
            name: "password",
            type: "password",
            placeholder: "Enter password",
            value: passwordAttempt,
          },
        ]}
        buttons={[
          {
            text: "Cancel",
            role: "cancel",
            handler: () => {
              setShowPasswordPrompt(false);
              setPasswordAttempt("");
              setPasswordError("");
            },
          },
          {
            text: "Open",
            handler: (alertData) => {
              if (alertData.password) {
                setPasswordAttempt(alertData.password);
                editFileWithPassword(currentKey, alertData.password);
              }
            },
          },
        ]}
      />
    </React.Fragment>
  );
};

export default Files;
