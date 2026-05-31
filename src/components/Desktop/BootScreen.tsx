import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BOOT_MESSAGES = [
  { text: '» Initializing Aura kernel v1.0.0...', delay: 150 },
  { text: '» Memory subsystem: 8GB virtual ready', delay: 300 },
  { text: '» VFS: mounted at /root', delay: 450 },
  { text: '» Driver: IndexedDB storage driver active', delay: 600 },
  { text: '» Window compositor initialized (60fps)', delay: 750 },
  { text: '» Process manager: PID 1 daemon active', delay: 900 },
  { text: '» Service worker active (Offline enabled)', delay: 1050 },
  { text: '» AI engine: Gemini API channel ready', delay: 1200 },
  { text: '» Shell environment loaded successfully', delay: 1350 },
  { text: '» Systems verified. Launching DevAura OS...', delay: 1500 },
];

export const BootScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    BOOT_MESSAGES.forEach(({ text, delay }, i) => {
      timers.push(
        setTimeout(() => {
          setVisibleLines((prev) => [...prev, text]);
          setProgress(Math.round(((i + 1) / BOOT_MESSAGES.length) * 100));
        }, delay)
      );
    });

    timers.push(
      setTimeout(() => {
        setDone(true);
        setTimeout(onComplete, 600);
      }, 2000)
    );

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!done ? (
        <motion.div
          className="boot-screen"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Background Video */}
          <video
            ref={videoRef}
            className="boot-video"
            src="/mp.mp4"
            autoPlay
            loop
            muted
            playsInline
          />

          {/* Left Panel: Kernel Logs */}
          <div className="boot-left-panel">
            {visibleLines.slice(-8).map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  lineHeight: '1.6',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%',
                  color: i === visibleLines.slice(-8).length - 1 ? '#09090b' : '#71717a',
                  fontWeight: i === visibleLines.slice(-8).length - 1 ? 600 : 400,
                }}
              >
                {line}
              </motion.div>
            ))}
          </div>

          {/* Right Panel: OS Info & Progress */}
          <div className="boot-right-panel">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div className="boot-title">
                DevAura OS
              </div>
              <div className="boot-subtitle">
                V1.0.0 // READY
              </div>
            </div>

            {/* Clean, minimal progress track */}
            <div className="boot-progress-wrap">
              <div className="boot-progress-track">
                <div
                  className="boot-progress-bar"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
              <div className="boot-progress-text">
                LOADING {progress}%
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default BootScreen;
