'use client';

export default function AethericBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div 
        className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-secondary opacity-5 blur-[120px] pulse-slow" 
      />
      <div 
        className="absolute -bottom-[5%] -right-[5%] w-[50%] h-[50%] rounded-full bg-tertiary opacity-5 blur-[100px] pulse-slow" 
        style={{ animationDelay: '-2s' }}
      />
    </div>
  );
}
