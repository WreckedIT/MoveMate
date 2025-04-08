import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: React.ReactNode;
}
 
const MainLayout = ({ children }: MainLayoutProps) => {
  const [location] = useLocation();
  const isMobile = useMobile();
  const [activeTab, setActiveTab] = useState<string>("/");

  // Update active tab when location changes
  useEffect(() => {
    const path = location.split("/")[1];
    setActiveTab(path ? `/${path}` : "/");
  }, [location]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* App Header */}
      <header className="bg-primary text-white p-4 shadow-md z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-medium">MoveMate</h1>
          <div className="flex space-x-2">
            <button className="p-2 rounded-full hover:bg-primary-light">
              <span className="material-icons">settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Tab Navigation */}
      {!isMobile && (
        <div className="bg-white shadow-sm">
          <div className="flex overflow-x-auto scrollbar-hide">
            <Link 
              href="/"
              className={`flex-none px-4 py-3 ${activeTab === "/" ? "tab-active" : "tab-inactive"}`}
            >
              Dashboard
            </Link>
            <Link 
              href="/scan"
              className={`flex-none px-4 py-3 ${activeTab === "/scan" ? "tab-active" : "tab-inactive"}`}
            >
              Scan QR
            </Link>
            <Link 
              href="/boxes"
              className={`flex-none px-4 py-3 ${activeTab === "/boxes" ? "tab-active" : "tab-inactive"}`}
            >
              Boxes
            </Link>
            <Link 
              href="/truck"
              className={`flex-none px-4 py-3 ${activeTab === "/truck" ? "tab-active" : "tab-inactive"}`}
            >
              Truck View
            </Link>
            <Link 
              href="/owners"
              className={`flex-none px-4 py-3 ${activeTab === "/owners" ? "tab-active" : "tab-inactive"}`}
            >
              Owners
            </Link>
            <Link 
              href="/export"
              className={`flex-none px-4 py-3 ${activeTab === "/export" ? "tab-active" : "tab-inactive"}`}
            >
              Export
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4">{children}</main>

      {/* Mobile Navigation */}
      {isMobile && (
        <nav className="bg-white border-t border-neutral-200 fixed bottom-0 left-0 right-0">
          <div className="flex justify-around">
            <Link 
              href="/"
              className={`mobile-nav-item ${activeTab === "/" ? "mobile-nav-item-active" : "mobile-nav-item-inactive"}`}
            >
              <span className="material-icons">dashboard</span>
              <span className="text-xs mt-1">Dashboard</span>
            </Link>
            <Link 
              href="/scan"
              className={`mobile-nav-item ${activeTab === "/scan" ? "mobile-nav-item-active" : "mobile-nav-item-inactive"}`}
            >
              <span className="material-icons">qr_code_scanner</span>
              <span className="text-xs mt-1">Scan</span>
            </Link>
            <Link 
              href="/boxes"
              className={`mobile-nav-item ${activeTab === "/boxes" ? "mobile-nav-item-active" : "mobile-nav-item-inactive"}`}
            >
              <span className="material-icons">inventory_2</span>
              <span className="text-xs mt-1">Boxes</span>
            </Link>
            <Link 
              href="/truck"
              className={`mobile-nav-item ${activeTab === "/truck" ? "mobile-nav-item-active" : "mobile-nav-item-inactive"}`}
            >
              <span className="material-icons">local_shipping</span>
              <span className="text-xs mt-1">Truck</span>
            </Link>
            <Link 
              href="/owners"
              className={`mobile-nav-item ${activeTab === "/owners" ? "mobile-nav-item-active" : "mobile-nav-item-inactive"}`}
            >
              <span className="material-icons">people</span>
              <span className="text-xs mt-1">Owners</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
};

export default MainLayout;
