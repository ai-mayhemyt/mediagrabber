import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { BrandLogo } from './BrandLogo';

interface PWAInstallButtonProps {
  onInstalled?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ onInstalled }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;
  if (!isInstallable && !isIOS) return null;

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) onInstalled?.();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Install MediaGrabber App"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 hover:opacity-90"
        style={{
          backgroundColor: 'var(--mg-card)',
          borderColor: 'var(--mg-accent)',
          color: 'var(--mg-text)',
        }}
      >
        <Download className="w-3.5 h-3.5" style={{ color: 'var(--mg-accent)' }} />
        <span className="hidden lg:inline">Install App</span>
      </button>

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Install MediaGrabber on iOS"
        >
          <div
            className="w-full max-w-sm rounded-xl border p-5 flex flex-col gap-4 shadow-xl"
            style={{ backgroundColor: 'var(--mg-card)', borderColor: 'var(--mg-border)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <BrandLogo className="w-7 h-7 shrink-0" />
                <div>
                  <h2 className="font-display text-sm font-semibold" style={{ color: 'var(--mg-text)' }}>
                    Install MediaGrabber
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--mg-muted)' }}>
                    Add to your iPhone or iPad Home Screen
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                aria-label="Close install instructions"
                className="p-1 rounded-md opacity-70 hover:opacity-100"
                style={{ color: 'var(--mg-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="flex flex-col gap-2.5 text-xs" style={{ color: 'var(--mg-text)' }}>
              <li className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center font-mono text-[11px] shrink-0"
                  style={{ backgroundColor: 'var(--mg-bg)', border: '1px solid var(--mg-border)' }}
                >
                  1
                </span>
                <span className="inline-flex items-center gap-1 flex-wrap">
                  Tap the <Share className="w-3.5 h-3.5 inline" style={{ color: 'var(--mg-accent)' }} />{' '}
                  <strong>Share</strong> button in Safari.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center font-mono text-[11px] shrink-0"
                  style={{ backgroundColor: 'var(--mg-bg)', border: '1px solid var(--mg-border)' }}
                >
                  2
                </span>
                <span>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center font-mono text-[11px] shrink-0"
                  style={{ backgroundColor: 'var(--mg-bg)', border: '1px solid var(--mg-border)' }}
                >
                  3
                </span>
                <span>
                  Tap <strong>Add</strong> to launch MediaGrabber as a standalone app.
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: 'var(--mg-accent)' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
