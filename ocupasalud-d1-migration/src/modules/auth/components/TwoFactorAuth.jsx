import React, { useState } from 'react';
import { Shield, Smartphone, Key, CheckCircle2, Loader2 } from 'lucide-react';

/**
 * TwoFactorAuth - Configuración y verificación 2FA TOTP
 * RFC 6238 con Web Crypto API (HMAC-SHA1)
 * Compatible con Google Authenticator, Authy, Microsoft Authenticator
 * Normativa: Res. 3100/2019 - Seguridad en sistemas de información
 */
export const TwoFactorAuth = ({
  user,
  onVerified,
  onCancel,
  totpGenSecret,
  totpVerify,
  totpGetQRCodeUrl,
  totpGetOtpAuthUrl,
}) => {
  const [step, setStep] = useState('setup'); // setup | verify | success
  const [secret] = useState(() => totpGenSecret());
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const qrUrl = totpGetQRCodeUrl(secret, user?.usuario || 'usuario');
  const otpAuthUrl = totpGetOtpAuthUrl(secret, user?.usuario || 'usuario');

  const handleVerify = async () => {
    if (token.length !== 6) {
      setError('El código debe tener exactamente 6 dígitos');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      const valid = await totpVerify(secret, token);
      if (valid) {
        setStep('success');
        setTimeout(() => {
          onVerified(secret);
        }, 1500);
      } else {
        setError('Código incorrecto. Verifique que la hora de su dispositivo esté sincronizada.');
      }
    } catch (e) {
      setError('Error al verificar: ' + (e.message || 'intente de nuevo'));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-5 text-white">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6" />
            <div>
              <h2 className="font-black text-base">Autenticación de Dos Factores</h2>
              <p className="text-indigo-200 text-xs">RFC 6238 · TOTP · Res. 3100/2019</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {step === 'setup' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-800 font-bold flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Paso 1: Escanee el código QR con su app de autenticación
                </p>
                <p className="text-[10px] text-blue-600 mt-1">
                  Compatible con Google Authenticator, Authy o Microsoft Authenticator
                </p>
              </div>

              <div className="flex justify-center">
                <img
                  src={qrUrl}
                  alt="Código QR para 2FA"
                  className="w-44 h-44 border-4 border-gray-100 rounded-xl"
                />
              </div>

              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">
                  Clave secreta (ingreso manual):
                </p>
                <p className="font-mono text-xs font-bold text-gray-800 break-all select-all bg-white p-2 rounded border">
                  {secret}
                </p>
              </div>

              <button
                onClick={() => setStep('verify')}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition"
              >
                Continuar → Verificar código
              </button>
            </>
          )}

          {step === 'verify' && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-800 font-bold flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Paso 2: Ingrese el código de 6 dígitos de su app
                </p>
              </div>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={token}
                onChange={(e) => {
                  setToken(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                placeholder="000000"
                className="w-full p-4 text-center text-2xl font-mono font-black border-2 border-gray-300 rounded-xl focus:border-indigo-500 outline-none tracking-[0.5em]"
                autoFocus
              />

              {error && (
                <p className="text-red-600 text-xs font-bold text-center">⚠️ {error}</p>
              )}

              <button
                onClick={handleVerify}
                disabled={verifying || token.length !== 6}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                ) : (
                  '✅ Verificar código'
                )}
              </button>
            </>
          )}

          {step === 'success' && (
            <div className="text-center py-6">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-black text-lg text-emerald-800">¡2FA Activado!</h3>
              <p className="text-xs text-gray-500 mt-1">
                La autenticación de dos factores ha sido configurada exitosamente.
              </p>
            </div>
          )}

          {step !== 'success' && (
            <button
              onClick={onCancel}
              className="w-full py-2 text-gray-500 text-xs font-bold hover:text-gray-700"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
