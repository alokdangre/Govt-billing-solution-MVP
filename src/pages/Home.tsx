import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonPage,
  IonPopover,
  IonTitle,
  IonToolbar,
  IonAlert,
  IonModal,
} from "@ionic/react";
import { APP_NAME, DATA } from "../app-data";
import * as AppGeneral from "../components/socialcalc/index.js";
import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Local } from "../components/Storage/LocalStorage";
import { menu, settings, personCircle } from "ionicons/icons";
import "./Home.css";
import Menu from "../components/Menu/Menu";
import Files from "../components/Files/Files";
import NewFile from "../components/NewFile/NewFile";
import { login, register } from "../components/Firebase/auth";
import { AutoSaveService } from "../components/AutoSave/AutoSaveService";

const Home: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [showPopover, setShowPopover] = useState<{
    open: boolean;
    event: Event | undefined;
  }>({ open: false, event: undefined });
  const [selectedFile, updateSelectedFile] = useState("default");
  const [billType, updateBillType] = useState(1);
  const [device] = useState("default");
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const emailInputRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });
  const [authName, setAuthName] = useState("");
  const location = useLocation();

  const store = new Local();
  const autoSaveService = AutoSaveService.getInstance();

  const closeMenu = () => {
    setShowMenu(false);
  };

  const activateFooter = (footer) => {
    AppGeneral.activateFooterButton(footer);
  };

  useEffect(() => {
    const data = DATA["home"][device]["msc"];
    AppGeneral.initializeApp(JSON.stringify(data));
  }, []);

  // Check for selected file from FileList when location changes or component mounts
  useEffect(() => {
    const storedFile = localStorage.getItem('selectedFile');
    const storedBillType = localStorage.getItem('selectedBillType');
    if (storedFile && storedFile !== selectedFile) {
      updateSelectedFile(storedFile);
      if (storedBillType) {
        updateBillType(parseInt(storedBillType));
      }
      // Clear the stored values after using them
      localStorage.removeItem('selectedFile');
      localStorage.removeItem('selectedBillType');
    }
  }, [location.pathname, selectedFile]);

  useEffect(() => {
    activateFooter(billType);
  }, [billType]);

  // Initialize auto-save when selectedFile or billType changes
  useEffect(() => {
    autoSaveService.updateCurrentFile(selectedFile, billType);
  }, [selectedFile, billType]);

  // Cleanup auto-save on component unmount
  useEffect(() => {
    return () => {
      autoSaveService.stop();
    };
  }, []);

  const footers = DATA["home"][device]["footers"];
  const footersList = footers.map((footerArray) => {
    return (
      <IonButton
        key={footerArray.index}
        expand="full"
        color="light"
        className="ion-no-margin"
        onClick={() => {
          updateBillType(footerArray.index);
          activateFooter(footerArray.index);
          setShowPopover({ open: false, event: undefined });
        }}
      >
        {footerArray.name}
      </IonButton>
    );
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>{APP_NAME}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonToolbar color="primary">
          <IonButton slot="start" fill="clear" className="navbar-auth-btn" onClick={() => {
            if (user) {
              // Logout
              localStorage.removeItem('user');
              setUser(null);
            } else {
              setShowAuth(true);
            }
          }}>
            <IonIcon icon={personCircle} slot="icon-only" className="navbar-auth-icon" />
            {user ? 'Logout' : 'Login/Register'}
          </IonButton>
          <IonIcon
            icon={settings}
            slot="end"
            className="ion-padding-end"
            size="large"
            onClick={(e) => {
              setShowPopover({ open: true, event: e.nativeEvent });
              console.log("Popover clicked");
            }}
          />
          <Files
            store={store}
            file={selectedFile}
            updateSelectedFile={updateSelectedFile}
            updateBillType={updateBillType}
          />

          <NewFile
            file={selectedFile}
            updateSelectedFile={updateSelectedFile}
            store={store}
            billType={billType}
          />
          <IonPopover
            animated
            keyboardClose
            backdropDismiss
            event={showPopover.event}
            isOpen={showPopover.open}
            onDidDismiss={() =>
              setShowPopover({ open: false, event: undefined })
            }
          >
            {footersList}
          </IonPopover>
        </IonToolbar>
        <IonToolbar color="secondary">
          <IonTitle className="ion-text-center">
            Editing : {selectedFile}
          </IonTitle>
        </IonToolbar>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton type="button" onClick={() => setShowMenu(true)}>
            <IonIcon icon={menu} />
          </IonFabButton>
        </IonFab>

        <Menu
          showM={showMenu}
          setM={closeMenu}
          file={selectedFile}
          updateSelectedFile={updateSelectedFile}
          store={store}
          bT={billType}
        />

        <div id="container">
          <div id="workbookControl"></div>
          <div id="tableeditor"></div>
          <div id="msg"></div>
        </div>
      </IonContent>
        <IonModal isOpen={showAuth} onDidDismiss={() => { setShowAuth(false); setAuthName(""); }} className="auth-modal">
        <div className="auth-modal-content fade-in">
          <h2>{authMode === 'login' ? 'Login' : 'Register'}</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setAuthError("");
              setAuthSuccess("");
              try {
                let userCred;
                if (authMode === 'login') {
                  userCred = await login(authEmail, authPassword);
                  setAuthSuccess('Login successful!');
                  localStorage.setItem('user', JSON.stringify({ email: userCred.user.email, uid: userCred.user.uid }));
                  setUser({ email: userCred.user.email, uid: userCred.user.uid });
                } else {
                  userCred = await register(authEmail, authPassword);
                  setAuthSuccess('Registration successful!');
                  localStorage.setItem('user', JSON.stringify({ email: userCred.user.email, uid: userCred.user.uid, name: authName }));
                  setUser({ email: userCred.user.email, uid: userCred.user.uid, name: authName });
                }
                setTimeout(() => {
                  setShowAuth(false);
                  setAuthSuccess("");
                  setAuthName("");
                }, 1200);
              } catch (err) {
                setAuthError(err.message || 'Authentication failed');
              }
            }}
            className="auth-form"
          >
            {authMode === 'register' && (
              <>
                <label>Name</label>
                <input
                  type="text"
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  required
                  placeholder="Enter your name"
                />
              </>
            )}
            <label>Email</label>
            <input
              ref={emailInputRef}
              type="email"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
            <label>Password</label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
              <span
                onClick={() => setShowPassword(v => !v)}
                className="password-toggle"
              >
                {showPassword ? '🙈' : '👁️'}
              </span>
            </div>
            {authError && <div className="auth-error">{authError}</div>}
            {authSuccess && <div className="auth-success">{authSuccess}</div>}
            <IonButton expand="block" type="submit" color="primary">
              {authMode === 'login' ? 'Login' : 'Register'}
            </IonButton>
            <IonButton
              expand="block"
              fill="clear"
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError("");
                setAuthSuccess("");
                setAuthName("");
              }}
              color="primary"
            >
              {authMode === 'login' ? "Don't have an account? Register" : 'Already have an account? Login'}
            </IonButton>
            <IonButton expand="block" fill="clear" color="medium" type="button" onClick={() => { setShowAuth(false); setAuthName(""); }}>
              Cancel
            </IonButton>
          </form>
        </div>
      </IonModal>
    </IonPage>
  );
};

export default Home;
