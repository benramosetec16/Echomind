import Sidebar from '../components/Sidebar';
import AethericBackground from '../components/AethericBackground';

export default function BiometricsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative md:flex md:flex-row">
      <AethericBackground />
      <Sidebar />
      <div className="md:flex-1 md:ml-20 w-full relative pb-24 md:pb-0">
        {children}
      </div>
    </div>
  );
}
