import HomeHeader from "@/components/home/HomeHeader";
import HomeSidebar from "@/components/home/HomeSidebar";
import HeroSection from "@/components/home/HeroSection";
import RecentPortfolios from "@/components/home/RecentPortfolios";

export default function HomePage() {
  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-800">
      {/* Header */}
      <HomeHeader />

      {/* Body */}
      <div className="flex min-h-[calc(100vh-64px)] w-full">
        {/* Sidebar */}
        <HomeSidebar />

        {/* Main Content */}
        <main className="min-w-0 flex-1">
          <div className="w-full px-4 py-5 md:px-7 md:py-7 xl:px-8">
            <HeroSection />

            <RecentPortfolios />
          </div>
        </main>
      </div>
    </div>
  );
}