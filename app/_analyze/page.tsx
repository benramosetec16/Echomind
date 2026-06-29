import EmotionAnalyzer from '@/components/EmotionAnalyzer';

export default function AnalyzePage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4 py-12">
      <div className="w-full relative z-10">
        <EmotionAnalyzer />
      </div>

      {/* Decorative background effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px]" />
      </div>
    </main>
  );
}
