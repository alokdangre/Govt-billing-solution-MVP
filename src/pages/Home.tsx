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
import { Local } from "../components/Storage/LocalStorage";
import { menu, settings, personCircle } from "ionicons/icons";
import "./Home.css";
import Menu from "../components/Menu/Menu";
import Files from "../components/Files/Files";
import NewFile from "../components/NewFile/NewFile";
import { login, register } from "../components/Firebase/auth";

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

  const store = new Local();

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

  useEffect(() => {
    activateFooter(billType);
  }, [billType]);

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
      <IonModal isOpen={showAuth} onDidDismiss={() => setShowAuth(false)}>
        <div style={{ padding: 32, maxWidth: 400, margin: '40px auto', background: '#23243a', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.15)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: 24, color: '#fff' }}>{authMode === 'login' ? 'Login' : 'Register'}</h2>
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
                } else {
                  userCred = await register(authEmail, authPassword);
                  setAuthSuccess('Registration successful!');
                }
                // Store user info in localStorage
                localStorage.setItem('user', JSON.stringify({ email: userCred.user.email, uid: userCred.user.uid }));
                setUser({ email: userCred.user.email, uid: userCred.user.uid });
                setTimeout(() => {
                  setShowAuth(false);
                  setAuthSuccess("");
                }, 1200);
              } catch (err) {
                setAuthError(err.message || 'Authentication failed');
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <label style={{ fontWeight: 500, color: '#fff' }}>Email</label>
            <input
              ref={emailInputRef}
              type="email"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              required
              placeholder="Enter your email"
              style={{ padding: 10, borderRadius: 8, border: '1px solid #444', fontSize: 16, color: '#fff', background: '#23243a' }}
            />
            <label style={{ fontWeight: 500, color: '#fff' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                required
                placeholder="Enter your password"
                style={{ padding: 10, borderRadius: 8, border: '1px solid #444', fontSize: 16, color: '#fff', background: '#23243a', width: '100%' }}
              />
              <span
                onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#fff', fontSize: 18 }}
              >
                {showPassword ? '🙈' : '👁️'}
              </span>
            </div>
            {authError && <div style={{ color: 'red', textAlign: 'center' }}>{authError}</div>}
            {authSuccess && <div style={{ color: 'lightgreen', textAlign: 'center' }}>{authSuccess}</div>}
            <IonButton expand="block" type="submit" color="primary" style={{ marginTop: 12, fontWeight: 600 }}>
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
              }}
              style={{ color: '#3880ff', fontWeight: 500 }}
            >
              {authMode === 'login' ? "Don't have an account? Register" : 'Already have an account? Login'}
            </IonButton>
            <IonButton expand="block" fill="clear" color="medium" type="button" onClick={() => setShowAuth(false)}>
              Cancel
            </IonButton>
          </form>
        </div>
      </IonModal>
    </IonPage>
  );
};

export default Home;
