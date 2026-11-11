import React from "react";
import { SquadProvider, useSquad } from "@/context/SquadContext";
import { TopHeader } from "@/components/layout/TopHeader";
import { BottomNavbar } from "@/components/layout/BottomNavbar";
import { HomeSection } from "@/components/home/HomeSection";
import { TournamentsSection } from "@/components/tournaments/TournamentsSection";
import { VoiceSection } from "@/components/voice/VoiceSection";
import { DirectMessagesSection } from "@/components/chat/DirectMessagesSection";
import { ClanSection } from "@/components/clan/ClanSection";
import { ShopSection } from "@/components/shop/ShopSection";
import { ProfileSection } from "@/components/profile/ProfileSection";
import { AuthModal } from "@/components/auth/AuthModal";
import { PublicProfileModal } from "@/components/profile/PublicProfileModal";
import { ClanDetailModal } from "@/components/clan/ClanDetailModal";

const MainContent: React.FC = () => {
  const {
    activeTab,
    isAuthModalOpen,
    closeAuthModal,
    authModalTab,
    refreshUserData,
    selectedPublicUserId,
    closePublicProfile,
    openPublicProfile,
    selectedClanDetailId,
    closeClanDetail,
    openClanDetail,
  } = useSquad();

  return (
    <main className="min-h-screen bg-[#0b0e17] text-white flex flex-col relative overflow-x-hidden">
      {/* Cyberpunk subtle ambient glow spots */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-16 right-0 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Header */}
      <TopHeader />

      {/* Dynamic Subsection Rendering */}
      <div className="flex-1 w-full max-w-md mx-auto">
        {activeTab === "home" && <HomeSection />}
        {activeTab === "tournaments" && <TournamentsSection />}
        {activeTab === "voice" && <VoiceSection />}
        {activeTab === "messages" && <DirectMessagesSection />}
        {activeTab === "clan" && <ClanSection />}
        {activeTab === "shop" && <ShopSection />}
        {activeTab === "profile" && <ProfileSection />}
      </div>

      {/* Mobile-first Bottom Navigation Bar */}
      <BottomNavbar />

      {/* Authentication & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        defaultTab={authModalTab}
        onSuccess={refreshUserData}
      />

      {/* Public User Profile Modal */}
      <PublicProfileModal
        isOpen={Boolean(selectedPublicUserId)}
        userId={selectedPublicUserId}
        onClose={closePublicProfile}
        onOpenClanDetail={(clanId) => openClanDetail(clanId)}
      />

      {/* Clan Detail Modal */}
      <ClanDetailModal
        isOpen={Boolean(selectedClanDetailId)}
        clanId={selectedClanDetailId}
        onClose={closeClanDetail}
        onOpenUserProfile={(userId) => openPublicProfile(userId)}
      />
    </main>
  );
};

const Index = () => {
  return (
    <SquadProvider>
      <MainContent />
    </SquadProvider>
  );
};

export default Index;
