import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Key,
  Smartphone,
  CheckCheck,
  Clock,
  UserCheck,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import {
  getWhatsAppBusinessConfig,
  saveWhatsAppBusinessConfig,
  sendWhatsAppBusinessMessage,
  getWhatsAppBusinessMessageStatus,
  syncWhatsAppContacts,
  saveSyncedWhatsAppContact,
  suggestWhatsAppChats,
  simulateIncomingWhatsAppMessage,
  getWhatsAppMessageHistory,
  SyncedWhatsAppContact,
  WhatsAppMessageStatusResult,
  WhatsAppMessage
} from '@/lib/whatsappService';
import { toast } from 'sonner';

export const WhatsAppBusinessView: React.FC = () => {
  const [config, setConfig] = useState(getWhatsAppBusinessConfig());
  const [phoneNumberId, setPhoneNumberId] = useState(config.phoneNumberId || '');
  const [accessToken, setAccessToken] = useState(config.accessToken || '');
  const [businessAccountId, setBusinessAccountId] = useState(config.businessAccountId || '');
  const [webhookUrl, setWebhookUrl] = useState(config.webhookUrl || '');

  const [syncedContacts, setSyncedContacts] = useState<SyncedWhatsAppContact[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<SyncedWhatsAppContact | null>(null);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [messageText, setMessageText] = useState('');
  const [templateName, setTemplateName] = useState('none');
  const [isSending, setIsSending] = useState(false);
  const [sentMessages, setSentMessages] = useState<WhatsAppMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'composer' | 'contacts' | 'api_settings' | 'history'>('composer');

  const [copiedWebhook, setCopiedWebhook] = useState(false);

  useEffect(() => {
    const loaded = syncWhatsAppContacts();
    setSyncedContacts(loaded);
    if (loaded.length > 0) {
      setSelectedRecipient(loaded[0]);
      setRecipientPhone(loaded[0].phone);
    }
    setSentMessages(getWhatsAppMessageHistory());
  }, []);

  const handleSaveConfig = () => {
    const updated = {
      phoneNumberId,
      accessToken,
      businessAccountId,
      webhookUrl,
      isConfigured: !!(phoneNumberId && accessToken),
    };
    setConfig(updated);
    saveWhatsAppBusinessConfig(updated);
    toast.success('WhatsApp Business API settings saved!');
  };

  const handleSyncContacts = () => {
    const synced = syncWhatsAppContacts();
    setSyncedContacts(synced);
    toast.success(`Synced ${synced.length} WhatsApp contacts!`);
  };

  const handleSelectContact = (c: SyncedWhatsAppContact) => {
    setSelectedRecipient(c);
    setRecipientPhone(c.phone);
    toast.info(`Selected ${c.name} (${c.phone})`);
  };

  const handleSendMessage = async () => {
    if (!recipientPhone.trim()) {
      toast.error('Please enter or select a recipient phone number.');
      return;
    }
    if (!messageText.trim() && templateName === 'none') {
      toast.error('Please type a message or choose a template.');
      return;
    }

    setIsSending(true);
    try {
      const result = await sendWhatsAppBusinessMessage(
        recipientPhone,
        messageText || `Template: ${templateName}`,
        templateName !== 'none' ? { templateName } : undefined
      );

      toast.success(`Message sent to ${recipientPhone} via WhatsApp API! Status: ${result.status}`);
      setMessageText('');
      setSentMessages(getWhatsAppMessageHistory());
    } catch (err: any) {
      toast.error('Failed to send message: ' + (err?.message || 'Error'));
    } finally {
      setIsSending(false);
    }
  };

  const handleTestIncomingNotification = () => {
    const targetName = selectedRecipient?.name || 'Alex Johnson';
    const msg = simulateIncomingWhatsAppMessage(
      targetName,
      'Hey! Project update: The new WhatsApp API integration is live and working smoothly! 🚀'
    );
    setSentMessages(getWhatsAppMessageHistory());
  };

  const handleCopyWebhook = () => {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    toast.success('Webhook URL copied!');
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto text-white">
      {/* Top Banner Status */}
      <div className="bg-gradient-to-r from-[#121b22] via-[#1f2c34] to-[#111b21] border border-[#25d366]/30 p-5 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#25d366] text-black flex items-center justify-center font-extrabold shadow-lg shadow-[#25d366]/20">
            <MessageSquare size={26} className="fill-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">WhatsApp Business Cloud API</h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[#25d366]/20 text-[#25d366] border border-[#25d366]/40 flex items-center gap-1">
                <ShieldCheck size={12} /> Meta Authenticated
              </span>
            </div>
            <p className="text-xs text-white/60">
              Official Meta Business API Gateway • Direct Message Sending & Status Retrieval
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestIncomingNotification}
            className="py-2 px-3 rounded-xl bg-[#25d366]/20 text-[#25d366] hover:bg-[#25d366]/30 border border-[#25d366]/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Sparkles size={14} /> Test Received Toast
          </button>
          <button
            onClick={handleSyncContacts}
            className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} /> Sync Contacts
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-zinc-900/90 border border-white/10 rounded-2xl overflow-x-auto">
        {[
          { id: 'composer', label: 'Message Composer', icon: Send },
          { id: 'contacts', label: 'Synced Contacts', icon: UserCheck },
          { id: 'history', label: 'Status & Logs', icon: Clock },
          { id: 'api_settings', label: 'Meta API Credentials', icon: Key },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#25d366] text-black shadow-md shadow-[#25d366]/20'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <tab.icon size={15} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: COMPOSER */}
      {activeTab === 'composer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Proactive Chat Suggestions Sidebar (4 cols) */}
          <div className="lg:col-span-4 bg-[#111b21] border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#25d366]" /> AI Suggested Contacts
              </span>
              <span className="text-[10px] text-white/50">{syncedContacts.length} Synced</span>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {syncedContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleSelectContact(contact)}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    selectedRecipient?.id === contact.id
                      ? 'bg-[#25d366]/20 border-[#25d366]/60 text-white'
                      : 'bg-white/5 border-white/5 hover:border-white/20 text-white/80'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{contact.name}</div>
                    <div className="text-[11px] text-white/50 truncate">{contact.phone}</div>
                  </div>
                  {contact.isFavorite && (
                    <span className="text-[10px] bg-[#25d366]/20 text-[#25d366] px-1.5 py-0.5 rounded">
                      Fav
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Form Composer (8 cols) */}
          <div className="lg:col-span-8 bg-[#111b21] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/80">Recipient Phone Number (E.164 format)</label>
              <input
                type="text"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="+15550192834 or select contact"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#25d366]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/80">Message Template (Optional)</label>
              <select
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#25d366]"
              >
                <option value="none">Custom Text Message</option>
                <option value="hello_world">hello_world (Standard Welcome Template)</option>
                <option value="appointment_reminder">appointment_reminder (Automated Sync)</option>
                <option value="project_update">project_update (AI Status Briefing)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/80">Message Content</label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#25d366] resize-none"
                placeholder="Type your WhatsApp message..."
              />
            </div>

            <button
              onClick={handleSendMessage}
              disabled={isSending}
              className="w-full py-3 rounded-xl bg-[#25d366] hover:bg-[#20bd5a] text-black font-bold text-sm transition-all shadow-lg shadow-[#25d366]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send size={16} />
              <span>{isSending ? 'Sending via WhatsApp API...' : 'Send WhatsApp Message'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: SYNCED CONTACTS */}
      {activeTab === 'contacts' && (
        <div className="bg-[#111b21] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="text-sm font-bold text-white">Synced WhatsApp Contacts List</h3>
              <p className="text-xs text-white/50">Used by AI to proactively suggest chats</p>
            </div>
            <button
              onClick={handleSyncContacts}
              className="py-1.5 px-3 rounded-lg bg-[#25d366]/20 text-[#25d366] text-xs font-bold flex items-center gap-1.5 hover:bg-[#25d366]/30 transition-colors"
            >
              <RefreshCw size={14} /> Fetch & Sync Now
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {syncedContacts.map((contact) => (
              <div
                key={contact.id}
                className="p-3.5 bg-black/30 border border-white/10 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-bold text-white">{contact.name}</div>
                  <div className="text-xs text-white/60">{contact.phone}</div>
                  <div className="text-[11px] text-[#25d366] mt-0.5">{contact.status}</div>
                </div>

                <button
                  onClick={() => {
                    handleSelectContact(contact);
                    setActiveTab('composer');
                  }}
                  className="p-2 rounded-lg bg-[#25d366] text-black hover:bg-[#20bd5a] transition-colors"
                  title="Chat Now"
                >
                  <Send size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: HISTORY & STATUS */}
      {activeTab === 'history' && (
        <div className="bg-[#111b21] border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white pb-2 border-b border-white/10">
            Recent Sent Messages & Delivery Status
          </h3>

          {sentMessages.length === 0 ? (
            <p className="text-xs text-white/40 py-6 text-center">No message history recorded yet.</p>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {sentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{msg.recipientName}</span>
                      <span className="text-[10px] text-white/50">{msg.recipientPhone}</span>
                    </div>
                    <p className="text-xs text-white/80 mt-1">{msg.message}</p>
                    <span className="text-[10px] text-white/40">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[#25d366] text-xs font-bold">
                    <CheckCheck size={16} />
                    <span className="capitalize">{msg.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: META API SETTINGS */}
      {activeTab === 'api_settings' && (
        <div className="bg-[#111b21] border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white pb-2 border-b border-white/10">
            WhatsApp Business API Credentials (Meta Developer Portal)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/80">Phone Number ID</label>
              <input
                type="text"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="e.g. 109283749201"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#25d366]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/80">WhatsApp Business Account ID</label>
              <input
                type="text"
                value={businessAccountId}
                onChange={(e) => setBusinessAccountId(e.target.value)}
                placeholder="e.g. 293847291823"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#25d366]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80">Permanent Meta Access Token</label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="EAAG..."
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#25d366]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80 flex items-center justify-between">
              <span>Incoming Webhook Endpoint URL</span>
              <button
                onClick={handleCopyWebhook}
                className="text-[11px] text-[#25d366] hover:underline flex items-center gap-1"
              >
                {copiedWebhook ? <Check size={12} /> : <Copy size={12} />}
                {copiedWebhook ? 'Copied' : 'Copy'}
              </button>
            </label>
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white/70 font-mono"
            />
          </div>

          <button
            onClick={handleSaveConfig}
            className="w-full py-2.5 rounded-xl bg-[#25d366] hover:bg-[#20bd5a] text-black font-bold text-xs transition-colors cursor-pointer"
          >
            Save Meta API Credentials
          </button>
        </div>
      )}
    </div>
  );
};
