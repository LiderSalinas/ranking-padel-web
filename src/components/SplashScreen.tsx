// src/components/SplashScreen.tsx
import React from "react";

type Props = {
  onSkip?: () => void;
};

const SplashScreen: React.FC<Props> = ({ onSkip }) => {
  return (
    <div
      className="fixed inset-0 z-[9999] bg-[#0f4b8c]"
      onClick={onSkip}
      role="button"
      aria-label="Splash"
    >
      <img
        src="/splash.jpg"
        alt="Ranking Padel Oficial"
        className="h-full w-full object-cover"
        draggable={false}
      />
    </div>
  );
};

export default SplashScreen;
