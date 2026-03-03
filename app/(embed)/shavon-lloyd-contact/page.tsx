'use client';

import React, { useMemo, useState } from 'react';
import { EmbedShell } from '../_shared/EmbedShell';
import styles from './shavon-lloyd-contact.module.css';

type FormState = {
  name: string;
  email: string;
  message: string;
  company?: string;
  website?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function ShavonLloydContactPage() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    company: '',
    message: '',
    website: '',
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

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || status.type === 'submitting') return;

    setStatus({ type: 'submitting' });

    try {
      const res = await fetch('/api/features/shavon-lloyd-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const json = (await res.json()) as
        | { ok: true; message?: string }
        | { ok: false; error?: string };

      if (!res.ok || !json.ok) {
        setStatus({
          type: 'error',
          message: 'error' in json && json.error ? json.error : 'Request failed.',
        });
        return;
      }

      setStatus({ type: 'success' });
      setForm({
        name: '',
        email: '',
        company: '',
        message: '',
        website: '',
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Network error.',
      });
    }
  }

  return (
    <EmbedShell defaultBg="transparent">
      <section className={styles.root}>
        <form onSubmit={onSubmit} className={styles.form}>
          <div className={styles.topRow}>
            <Field
              label="Name"
              value={form.name}
              onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
              placeholder="Name"
              required
            />

            <Field
              label="Email"
              value={form.email}
              onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
              placeholder="Email"
              required
              type="email"
              hint={
                form.email.length > 0 && !isValidEmail(form.email)
                  ? 'Please enter a valid email.'
                  : undefined
              }
            />
          </div>

          <Field
            label="Company"
            value={form.company ?? ''}
            onChange={(value) => setForm((prev) => ({ ...prev, company: value }))}
            placeholder="Company (optional)"
          />

          <TextArea
            label="Message"
            value={form.message}
            onChange={(value) => setForm((prev) => ({ ...prev, message: value }))}
            placeholder="Message"
            required
            hint={
              form.message.length > 0 && form.message.trim().length < 10
                ? 'Message should be at least 10 characters.'
                : undefined
            }
          />

          <label className={styles.honeypot} aria-hidden="true">
            <span>Website</span>
            <input
              tabIndex={-1}
              autoComplete="off"
              value={form.website ?? ''}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, website: event.target.value }))
              }
            />
          </label>

          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.submit}
              disabled={!canSubmit || status.type === 'submitting'}
            >
              {status.type === 'submitting' ? 'SENDING...' : 'SEND'}
            </button>

            {status.type === 'success' ? (
              <span className={styles.success}>Sent. Thank you.</span>
            ) : null}

            {status.type === 'error' ? (
              <span className={styles.error}>{status.message}</span>
            ) : null}
          </div>
        </form>
      </section>
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
  const invalid = Boolean(props.hint);
  return (
    <label className={styles.field}>
      <span className={styles.label}>
        {props.label}
        {props.required ? ' *' : ''}
      </span>
      <input
        type={props.type ?? 'text'}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        required={props.required}
        aria-invalid={invalid}
        className={styles.input}
      />
      {props.hint ? <span className={styles.hint}>{props.hint}</span> : null}
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
  const invalid = Boolean(props.hint);
  return (
    <label className={styles.field}>
      <span className={styles.label}>
        {props.label}
        {props.required ? ' *' : ''}
      </span>
      <textarea
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        required={props.required}
        rows={5}
        aria-invalid={invalid}
        className={styles.textarea}
      />
      {props.hint ? <span className={styles.hint}>{props.hint}</span> : null}
    </label>
  );
}
