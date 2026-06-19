import NeuralBackground from '../components/NeuralBackground';
import Hero from '../components/Hero';

export default function Home() {
  return (
    <main className="relative min-h-screen w-full flex flex-col bg-background text-on-background selection:bg-secondary/30 selection:text-white">
      <NeuralBackground />
      <Hero />
    </main>
  );
}
