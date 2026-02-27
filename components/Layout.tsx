import Navbar from "./Navbar";
import Footer from "./Footer";
import ContentWrapper from "./ContentWrapper";
import TournamentDashboard from "./TournamentDashboard";
import MainContentArea from "./MainContentArea";
import ResizableMain from "./ResizableMain";
import OBSConnectionNotification from "./OBSConnectionNotification";
import { OBS_CONNECTION_ENABLED, SIDENAV_VISIBLE } from "@/lib/featureFlags";

export default function Layout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black">
      {OBS_CONNECTION_ENABLED && <OBSConnectionNotification />}
      <Navbar />
      <main className="flex flex-1 min-h-0 w-full overflow-hidden">
        {SIDENAV_VISIBLE ? (
          <ResizableMain>
            <ContentWrapper>
              <TournamentDashboard />
            </ContentWrapper>
            <MainContentArea />
          </ResizableMain>
        ) : (
          <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
            <MainContentArea />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
