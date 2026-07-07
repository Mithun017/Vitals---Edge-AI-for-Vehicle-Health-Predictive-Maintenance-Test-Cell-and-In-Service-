import React from 'react';
import { Binary, X, Send, MessageSquare } from 'lucide-react';
import Button from './common/Button';

export default function Chatbot({
  isChatOpen,
  setIsChatOpen,
  chatMessages,
  chatInput,
  setChatInput,
  handleChatSubmit,
  isChatLoading,
  chatEndRef,
  sidebarPosition
}) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: sidebarPosition === 'right' ? undefined : '24px',
      left: sidebarPosition === 'right' ? '24px' : undefined,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: sidebarPosition === 'right' ? 'flex-start' : 'flex-end'
    }}>
      {/* Chatbot Window */}
      <div style={{
        width: '360px',
        height: '480px',
        background: 'var(--md-sys-color-surface-container-high)',
        borderRadius: '24px',
        border: '1px solid var(--md-sys-color-outline-variant)',
        boxShadow: '0 12px 40px var(--md-sys-color-shadow)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        marginBottom: '16px',
        color: 'var(--md-sys-color-on-surface)',
        opacity: isChatOpen ? 1 : 0,
        transform: isChatOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
        pointerEvents: isChatOpen ? 'auto' : 'none',
        transformOrigin: sidebarPosition === 'right' ? 'bottom left' : 'bottom right',
        transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
          {/* Chatbot Header */}
          <div style={{
            padding: '16px',
            background: 'var(--md-sys-color-surface-container-highest)',
            borderBottom: '1px solid var(--md-sys-color-outline-variant)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: 'var(--md-sys-color-primary)',
                color: 'var(--md-sys-color-on-primary)',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Binary size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold' }}>Qwen AI Assistant</h3>
                <span style={{ fontSize: '10px', color: 'var(--md-sys-color-tertiary)' }}>● Connected to C18 Node</span>
              </div>
            </div>
            <Button 
              variant="text"
              iconOnly
              size="sm"
              onClick={() => setIsChatOpen(false)}
            >
              <X size={18} />
            </Button>
          </div>

          {/* Quick Suggestion Chips */}
          <div style={{
            padding: '8px 12px',
            background: 'var(--md-sys-color-surface-container)',
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            borderBottom: '1px solid var(--md-sys-color-outline-variant)',
            whiteSpace: 'nowrap'
          }}>
            {[
              "Engine status?",
              "List the 6 zones",
              "Explain energy field",
              "Recommend action"
            ].map((chip, idx) => (
              <Button
                key={idx}
                variant="tonal"
                size="sm"
                onClick={() => handleChatSubmit(null, chip)}
              >
                {chip}
              </Button>
            ))}
          </div>

          {/* Messages stack */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {chatMessages.map((msg, index) => (
              <div 
                key={index}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '16px',
                  borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px',
                  borderBottomLeftRadius: msg.sender !== 'user' ? '4px' : '16px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  textAlign: 'left',
                  background: msg.sender === 'user' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container)',
                  color: msg.sender === 'user' ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface)',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--md-sys-color-outline-variant)'
                }}>
                  {msg.text}
                </div>
                <span style={{ fontSize: '10px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '4px', fontWeight: '500' }}>{msg.timestamp}</span>
              </div>
            ))}
            {isChatLoading && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: 'var(--md-sys-color-surface-variant)', borderRadius: '12px', fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                Analyzing residuals...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Message input form */}
          <form onSubmit={handleChatSubmit} style={{
            padding: '12px',
            borderTop: '1px solid var(--md-sys-color-outline-variant)',
            display: 'flex',
            gap: '8px',
            background: 'var(--md-sys-color-surface-container-lowest)'
          }}>
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask about coolant, turbo, RUL..."
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '20px',
                border: '1px solid var(--md-sys-color-outline)',
                background: 'var(--md-sys-color-surface)',
                color: 'var(--md-sys-color-on-surface)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <Button 
              type="submit"
              variant="primary"
              iconOnly
            >
              <Send size={16} />
            </Button>
          </form>
      </div>

      {/* Toggle Chat Icon Button */}
      <Button
        variant="primary"
        iconOnly
        size="xl"
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="pulse-warning"
        style={{ boxShadow: '0 4px 16px var(--md-sys-color-shadow)' }}
      >
        {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </Button>
    </div>
  );
}
