import Sidebar from '../components/Sidebar';
import AethericBackground from '../components/AethericBackground';

export default function BiometricsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative flex">
      <AethericBackground />
      <Sidebar />
      <div className="flex-1 ml-20 relative">
        {children}
      </div>
    </div>
  );
}
