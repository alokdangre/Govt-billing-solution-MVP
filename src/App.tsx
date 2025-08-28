import { IonApp, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Route, Redirect, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import FileList from "./pages/FileList";
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet } from "@ionic/react";
import { home, folderOpen } from "ionicons/icons";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import PWAUpdatePrompt from "./components/PWAUpdatePrompt";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

/* Theme variables */
import "./theme/variables.css";

setupIonicReact();

const MainTabs: React.FC = () => {
  const location = useLocation();
  const isFiles = location.pathname === "/files";
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route path="/" exact component={Home} />
        <Route path="/files" exact component={FileList} />
        <Redirect exact from="/home" to="/" />
      </IonRouterOutlet>
      <IonTabBar slot="bottom">
        <IonTabButton tab="home" href="/" selected={!isFiles}>
          <IonIcon icon={home} color={!isFiles ? "primary" : undefined} />
          <IonLabel color={!isFiles ? "primary" : undefined}>Home</IonLabel>
        </IonTabButton>
        <IonTabButton tab="files" href="/files" selected={isFiles}>
          <IonIcon icon={folderOpen} color={isFiles ? "primary" : undefined} />
          <IonLabel color={isFiles ? "primary" : undefined}>Files</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
};

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <MainTabs />
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
    </IonReactRouter>
  </IonApp>
);

export default App;
