
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal, Button } from '../common';
import {
  Smartphone,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { proctorService } from '../../services';

export const MobileQRModal = ({
  isOpen,
  onClose,
  sessionId,
  mobileConnected = false
}) => {
  const [pairingData, setPairingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const generateToken = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await proctorService.createPairingToken(sessionId);
      setPairingData(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to generate mobile pairing token'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !pairingData && sessionId) {
      generateToken();
    }
  }, [isOpen, sessionId]);

  const currentToken = pairingData?.pairingToken || '';

  // Automatically use the current website origin.
  // Production: https://secureproctor.gapxcareers.com
  // Development: current local development origin.
  const mobileUrl = currentToken
    ? `${window.location.origin}/mobile-camera/${currentToken}`
    : '';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(mobileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      setError('Unable to copy link. Please copy it manually.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pair Secondary Mobile Camera (Third-Eye)"
      maxWidth="max-w-md"
    >
      <div className="space-y-4 text-center">
        <p className="text-xs text-slate-300">
          Position your mobile phone to the side of your workspace showing
          your desk, hands, and keyboard.
        </p>

        {mobileConnected ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-7 h-7" />
            </div>

            <div>
              <h4 className="text-sm font-bold text-emerald-300">
                Mobile Third-Eye Connected
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Secondary camera is streaming your desk view in real-time.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            {loading ? (
              <div className="w-52 h-52 bg-slate-950 rounded-2xl flex flex-col items-center justify-center border border-slate-800 gap-2">
                <RefreshCw className="w-7 h-7 text-brand-400 animate-spin" />
                <span className="text-xs text-slate-400">
                  Generating Secure QR...
                </span>
              </div>
            ) : pairingData ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-white rounded-2xl shadow-xl inline-block border-2 border-indigo-400/30">
                  <QRCodeSVG
                    value={mobileUrl}
                    size={190}
                    level="M"
                  />
                </div>

                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Mobile Camera URL:</span>
                  <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-200 font-mono">
                    {window.location.host}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>

                  <a
                    href={mobileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open on this PC (Test Mode)
                  </a>
                </div>
              </div>
            ) : null}

            {error && (
              <p className="text-xs text-rose-400 mt-2 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                {error}
              </p>
            )}

            {pairingData && (
              <p className="text-[11px] text-slate-400 font-mono">
                Scan with Phone Camera or Google Lens • Encrypted WebRTC Session
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={generateToken}
            isLoading={loading}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh QR
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
