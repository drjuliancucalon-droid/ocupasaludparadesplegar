import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, User, Loader2, Sparkles } from 'lucide-react';

/**
 * AIAssistant - Asistente IA para consultas normativas
 * Especializado en normatividad colombiana de SST y salud ocupacional
 */
export const AIAssistant = ({ aiConfig, callAI, onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de normatividad ocupacional colombiana. ' +
        'Puedo ayudarte con consultas sobre:\n\n' +
        '• Resolución 1843/2025 (evaluaciones médicas ocupacionales)\n' +
        '• Decreto 1072/2015 (SG-SST)\n' +
        '• Ley 1562/2012 (riesgos laborales)\n' +
        '• Resolución 0312/2019 (estándares mínimos SG-SST)\n' +
        '• Resolución 4272/2021 (trabajo en alturas)\n' +
        '• Guías GATISO y tablas CIE-10 ocupacional\n\n' +
        '¿En qué puedo ayudarte?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const systemPrompt =
    `Eres un asistente experto en normatividad colombiana de Seguridad y Salud en el Trabajo (SST) ` +
    `y salud ocupacional. Respondes en español colombiano de forma precisa, citando siempre la norma aplicable. ` +
    `Tu conocimiento incluye: Res. 1843/2025, Decreto 1072/2015, Ley 1562/2012, Res. 0312/2019, ` +
    `Res. 4272/2021 (alturas), Guías GATISO, Res. 1995/1999 (historias clínicas), Ley 1581/2012 (habeas data), ` +
    `Res. 2346/2007, NTC-OHSAS 18001, ISO 45001:2018. ` +
    `Responde de forma concisa pero completa. Si no estás seguro de algo, indícalo.`;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      if (!callAI) throw new Error('IA no configurada');
      const conversationContext = messages
        .slice(-6)
        .map((m) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
        .join('\n');
      const fullPrompt = `${conversationContext}\nUsuario: ${text}\nAsistente:`;
      const response = await callAI(fullPrompt, systemPrompt);
      setMessages((prev) => [...prev, { role: 'assistant', content: response || 'Sin respuesta del modelo.' }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `⚠️ Error: ${err.message || 'No se pudo conectar con la IA'}.\n\n` +
          'Verifique la configuración de IA en el panel de configuración.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    '¿Qué exámenes exige la Res. 1843/2025?',
    '¿Cuándo aplica examen de retorno laboral?',
    '¿Qué restricciones se pueden dar para trabajo en alturas?',
    '¿Cuánto tiempo se debe conservar una HC?',
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg h-[85vh] sm:h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-sm">Asistente Normativo SST</h2>
                <p className="text-emerald-200 text-[10px]">
                  Normatividad colombiana · IA {aiConfig?.activeProvider || 'no configurada'}
                </p>
              </div>
            </div>
            <button onClick={onClose}><X className="w-5 h-5 text-white/70 hover:text-white" /></button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-xl p-3 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 items-center">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              </div>
              <p className="text-xs text-gray-400 italic">Consultando normativa...</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick questions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {quickQuestions.map((q, i) => (
              <button key={i} onClick={() => { setInput(q); }}
                className="text-[10px] px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 font-bold hover:bg-emerald-100 transition">
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t p-3 flex gap-2 flex-shrink-0 bg-white">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Pregunta sobre normatividad SST..."
            className="flex-1 p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-400 outline-none"
            disabled={loading}
          />
          <button onClick={handleSend} disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-1">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
