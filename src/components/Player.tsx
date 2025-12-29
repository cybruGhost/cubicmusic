/* Wavy progress bar effects */
.wavy-progress-bg {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.05) 25%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 75%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: wave-bg 3s linear infinite;
}

.wavy-progress-fill {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 25%,
    rgba(255, 255, 255, 0.4) 50%,
    rgba(255, 255, 255, 0.2) 75%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: wave-fill 1.5s linear infinite;
}

.wavy-overlay {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 25%,
    rgba(255, 255, 255, 0.6) 50%,
    rgba(255, 255, 255, 0.3) 75%,
    transparent 100%
  );
  animation: wave 2s linear infinite;
  background-size: 200% 100%;
}

@keyframes wave-bg {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@keyframes wave-fill {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@keyframes wave {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
