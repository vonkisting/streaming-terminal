import Navbar from "./Navbar";
import Footer from "./Footer";
import ContentWrapper from "./ContentWrapper";
import TournamentDashboard from "./TournamentDashboard";
import { TournamentMarqueeProvider } from "./TournamentMarqueeContext";
import MainContentArea from "./MainContentArea";
import ResizableMain from "./ResizableMain";
import OBSConnectionNotification from "./OBSConnectionNotification";

export default function Layout() {
  return (
    <TournamentMarqueeProvider>
      <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <OBSConnectionNotification />
        <Navbar />
        <main className="flex flex-1 min-h-0 w-full overflow-hidden">
          <ResizableMain>
            <ContentWrapper>
              <TournamentDashboard />
            </ContentWrapper>
            <MainContentArea />
          </ResizableMain>
        </main>
        <Footer />
      </div>
    </TournamentMarqueeProvider>
  );
}
