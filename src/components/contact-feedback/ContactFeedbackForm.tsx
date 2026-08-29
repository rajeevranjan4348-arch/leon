import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ContactCategory,
  FeedbackData,
  ValidationErrors,
  SubmissionStatus,
  submitFeedback,
  validateFeedbackForm,
} from './feedbackService';
import { exportDiagnosticsFile } from './DiagnosticsExport';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  MessageSquare,
  Bug,
  Lightbulb,
  HelpCircle,
  MoreHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';

interface ContactFeedbackFormProps {
  onSuccessClose?: () => void;
  sessionId?: string;
  activePanel?: string;
}

const CATEGORIES: { label: ContactCategory; description: string; icon: any }[] = [
  { label: 'Feedback', description: 'General thoughts & suggestions', icon: MessageSquare },
  { label: 'Bug Report', description: 'Something is broken or glitching', icon: Bug },
  { label: 'Feature Request', description: 'Propose a new tool or capability', icon: Lightbulb },
  { label: 'Contact Support', description: 'Get assistance with your account', icon: HelpCircle },
  { label: 'Other', description: 'Any other inquiries', icon: MoreHorizontal },
];

export const ContactFeedbackForm: React.FC<ContactFeedbackFormProps> = ({
  onSuccessClose,
  sessionId,
  activePanel,
}) => {
  const [formData, setFormData] = useState<FeedbackData>({
    name: '',
    email: '',
    category: 'Feedback',
    subject: '',
    message: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [status, setStatus] = useState<SubmissionStatus>('Idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleInputChange = (field: keyof FeedbackData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field-specific error as user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if (status === 'Error') {
      setStatus('Idle');
      setStatusMessage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status === 'Submitting' || status === 'Validating') return;

    setStatus('Validating');
    const validationErrors = validateFeedbackForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setStatus('Error');
      setStatusMessage('Please fix the highlighted fields below.');
      return;
    }

    setErrors({});
    setStatus('Submitting');

    const res = await submitFeedback(formData);

    if (res.success) {
      setStatus('Success');
      setStatusMessage(res.message);
      toast.success('Feedback submitted successfully!');

      // Reset form fields
      setFormData({
        name: '',
        email: '',
        category: 'Feedback',
        subject: '',
        message: '',
      });
    } else {
      setStatus('Error');
      setStatusMessage(res.message || 'Failed to submit feedback.');
      if (res.errors) {
        setErrors(res.errors);
      }
      toast.error(res.message || 'Submission failed');
    }
  };

  const handleExportDiagnostics = () => {
    setIsExporting(true);
    const success = exportDiagnosticsFile({
      sessionId,
      activePanel,
    });
    if (success) {
      toast.success('Diagnostics downloaded as diagnostics.json');
    } else {
      toast.error('Failed to export diagnostics report');
    }
    setTimeout(() => setIsExporting(false), 500);
  };

  return (
    <div className="space-y-6 text-white/90">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <MessageSquare size={18} className="text-cyan-400" />
          Contact & Feedback
        </h3>
        <p className="text-xs text-white/60 mt-1">
          Have feedback, found a bug, or need assistance? Send us a message below and export runtime diagnostics for troubleshooting.
        </p>
      </div>

      {/* Success View */}
      {status === 'Success' ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-emerald-300">Submission Received</h4>
            <p className="text-xs text-white/70 mt-1">{statusMessage}</p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={() => setStatus('Idle')}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Send Another Message
            </button>
            {onSuccessClose && (
              <button
                type="button"
                onClick={onSuccessClose}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* General Error Banner */}
          {status === 'Error' && statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
              role="alert"
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>{statusMessage}</span>
            </motion.div>
          )}

          {/* Contact Category Picker */}
          <div>
            <label className="block text-xs font-medium text-white/80 mb-2">
              Category <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const isSelected = formData.category === cat.label;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => handleInputChange('category', cat.label)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon size={16} className={isSelected ? 'text-cyan-400' : 'text-white/50'} />
                    <div>
                      <div className="text-xs font-semibold">{cat.label}</div>
                      <div className="text-[10px] text-white/50">{cat.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.category && (
              <p className="text-[11px] text-rose-400 mt-1" role="alert">
                {errors.category}
              </p>
            )}
          </div>

          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="feedback-name" className="block text-xs font-medium text-white/80 mb-1">
                Name <span className="text-rose-400">*</span>
              </label>
              <input
                id="feedback-name"
                type="text"
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                placeholder="Your full name"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white/5 border text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 transition-all ${
                  errors.name
                    ? 'border-rose-500/60 focus:ring-rose-500/40'
                    : 'border-white/10 focus:border-cyan-400 focus:ring-cyan-400/20'
                }`}
                disabled={status === 'Submitting'}
              />
              {errors.name && (
                <p className="text-[11px] text-rose-400 mt-1" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="feedback-email" className="block text-xs font-medium text-white/80 mb-1">
                Email <span className="text-rose-400">*</span>
              </label>
              <input
                id="feedback-email"
                type="email"
                value={formData.email}
                onChange={e => handleInputChange('email', e.target.value)}
                placeholder="name@example.com"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white/5 border text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 transition-all ${
                  errors.email
                    ? 'border-rose-500/60 focus:ring-rose-500/40'
                    : 'border-white/10 focus:border-cyan-400 focus:ring-cyan-400/20'
                }`}
                disabled={status === 'Submitting'}
              />
              {errors.email && (
                <p className="text-[11px] text-rose-400 mt-1" role="alert">
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="feedback-subject" className="block text-xs font-medium text-white/80 mb-1">
              Subject <span className="text-rose-400">*</span>
            </label>
            <input
              id="feedback-subject"
              type="text"
              value={formData.subject}
              onChange={e => handleInputChange('subject', e.target.value)}
              placeholder="Brief summary of your topic"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-white/5 border text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 transition-all ${
                errors.subject
                  ? 'border-rose-500/60 focus:ring-rose-500/40'
                  : 'border-white/10 focus:border-cyan-400 focus:ring-cyan-400/20'
              }`}
              disabled={status === 'Submitting'}
            />
            {errors.subject && (
              <p className="text-[11px] text-rose-400 mt-1" role="alert">
                {errors.subject}
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="feedback-message" className="block text-xs font-medium text-white/80">
                Message <span className="text-rose-400">*</span>
              </label>
              <span className="text-[10px] text-white/40 font-mono">
                {formData.message.length}/3000
              </span>
            </div>
            <textarea
              id="feedback-message"
              rows={4}
              value={formData.message}
              onChange={e => handleInputChange('message', e.target.value)}
              placeholder="Provide clear details regarding your feedback, feature request, or issue..."
              className={`w-full px-3.5 py-2.5 rounded-xl bg-white/5 border text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 transition-all resize-none ${
                errors.message
                  ? 'border-rose-500/60 focus:ring-rose-500/40'
                  : 'border-white/10 focus:border-cyan-400 focus:ring-cyan-400/20'
              }`}
              disabled={status === 'Submitting'}
            />
            {errors.message && (
              <p className="text-[11px] text-rose-400 mt-1" role="alert">
                {errors.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Diagnostics Export Button */}
            <button
              type="button"
              onClick={handleExportDiagnostics}
              disabled={isExporting}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              title="Download non-sensitive runtime diagnostics.json"
            >
              <Download size={14} className="text-cyan-400" />
              <span>Export Diagnostics</span>
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status === 'Submitting' || status === 'Validating'}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {status === 'Submitting' ? (
                <>
                  <Loader2 size={15} className="animate-spin text-white" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
