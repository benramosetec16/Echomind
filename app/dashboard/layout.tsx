import Sidebar from '../components/Sidebar';
import AethericBackground from '../components/AethericBackground';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative flex flex-col md:flex-row">
      <AethericBackground />
      <Sidebar />
      <div className="flex-1 md:ml-20 w-full relative pb-20 md:pb-0">
        {children}
      </div>
    </div>
  );
}
