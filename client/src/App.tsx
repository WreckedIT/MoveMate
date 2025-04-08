import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";

import MainLayout from "@/layouts/main-layout";
import Dashboard from "@/pages/dashboard";
import ScanQR from "@/pages/scan-qr";
import Boxes from "@/pages/boxes";
import TruckLoading from "@/pages/truck-loading";
import ExportData from "@/pages/export-data";
import BoxDetails from "@/pages/box-details";
import Owners from "@/pages/owners";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/scan" component={ScanQR} />
      <Route path="/boxes" component={Boxes} />
      <Route path="/boxes/:id" component={BoxDetails} />
      <Route path="/truck" component={TruckLoading} />
      <Route path="/export" component={ExportData} />
      <Route path="/owners" component={Owners} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <MainLayout>
        <Router />
      </MainLayout>
      <Toaster />
    </>
  );
}

export default App;
