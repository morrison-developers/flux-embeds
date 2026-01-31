'use client';

import React, { useMemo, useState } from 'react';
import { EmbedShell } from '../_shared/EmbedShell';

type FormState = {
  name: string;
  email: string;
  message: string;
  company?: string;
};

function isValidEmail(email: string) {
  // Good-enough client validation. Server still validates.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function ContactPage() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    message: '',
    company: '',
  });

  const [status, setStatus] = useState<
    | { type: 'idle' }
    | { type: 'submitting' }
    | { type: 'success' }
    | { type: 'error'; message: string }
  >({ type: 'idle' });

  const canSubmit = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      isValidEmail(form.email) &&
      form.message.trim().length >= 10
    );
  }, [form]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || status.type === 'submitting') return;

    setStatus({ type: 'submitting' });

    try {
      const res = await fetch('/api/features/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const json = (await res.json()) as
        | { ok: true }
        | { ok: false; error: string };

      if (!res.ok || !json.ok) {
        setStatus({
          type: 'error',
          message: 'error' in json ? json.error : 'Request failed.',
        });
        return;
      }

      setStatus({ type: 'success' });
      setForm({ name: '', email: '', message: '', company: '' });
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Network error.',
      });
    }
  }

  return (
    <EmbedShell title="Contact">
      <div style={{ display: 'grid', gap: 14, maxWidth: 560 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Contact us</div>
        <div style={{ opacity: 0.75 }}>
          This embed posts to <code>/api/features/contact</code>.
        </div>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
          <Field
            label="Name"
            value={form.name}
            onChange={(v) => setForm((p) => ({ ...p, name: v }))}
            placeholder="Jane Doe"
            required
          />

          <Field
            label="Email"
            value={form.email}
            onChange={(v) => setForm((p) => ({ ...p, email: v }))}
            placeholder="jane@company.com"
            required
            type="email"
            hint={
              form.email.length > 0 && !isValidEmail(form.email)
                ? 'Enter a valid email.'
                : undefined
            }
          />

          <Field
            label="Company (optional)"
            value={form.company ?? ''}
            onChange={(v) => setForm((p) => ({ ...p, company: v }))}
            placeholder="Company Inc."
          />

          <TextArea
            label="Message"
            value={form.message}
            onChange={(v) => setForm((p) => ({ ...p, message: v }))}
            placeholder="Tell us what you want to build… (min 10 chars)"
            required
            hint={
              form.message.length > 0 && form.message.trim().length < 10
                ? 'Message should be at least 10 characters.'
                : undefined
            }
          />

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="submit"
              disabled={!canSubmit || status.type === 'submitting'}
              style={{
                height: 42,
                padding: '0 14px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.12)',
                background:
                  !canSubmit || status.type === 'submitting'
                    ? 'rgba(0,0,0,0.04)'
                    : 'white',
                cursor:
                  !canSubmit || status.type === 'submitting'
                    ? 'not-allowed'
                    : 'pointer',
                fontWeight: 600,
              }}
            >
              {status.type === 'submitting' ? 'Sending…' : 'Send'}
            </button>

            {status.type === 'success' ? (
              <span style={{ color: '#1a7f37', fontWeight: 600 }}>
                Sent. Thanks.
              </span>
            ) : null}

            {status.type === 'error' ? (
              <span style={{ color: '#b42318', fontWeight: 600 }}>
                {status.message}
              </span>
            ) : null}
          </div>

          <div style={{ fontSize: 12, opacity: 0.65 }}>
            Tip: keep this embed stateless. Route real delivery to email/CRM
            later.
          </div>
        </form>
      </div>
    </EmbedShell>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  hint?: string;
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>
        {props.label}
        {props.required ? <span style={{ opacity: 0.6 }}> *</span> : null}
      </div>
      <input
        type={props.type ?? 'text'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        required={props.required}
        style={{
          height: 42,
          borderRadius: 10,
          border: '1px solid rgba(0,0,0,0.12)',
          padding: '0 12px',
        }}
      />
      {props.hint ? (
        <div style={{ fontSize: 12, color: '#b42318' }}>{props.hint}</div>
      ) : null}
    </label>
  );
}

function TextArea(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>
        {props.label}
        {props.required ? <span style={{ opacity: 0.6 }}> *</span> : null}
      </div>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        required={props.required}
        rows={5}
        style={{
          borderRadius: 10,
          border: '1px solid rgba(0,0,0,0.12)',
          padding: 12,
          resize: 'vertical',
        }}
      />
      {props.hint ? (
        <div style={{ fontSize: 12, color: '#b42318' }}>{props.hint}</div>
      ) : null}
    </label>
  );
}