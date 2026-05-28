'use client'
import { useState } from 'react'

export default function ApplyPage() {
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', linkedin_url: '',
    portfolio_url: '', desired_role: '', referral_name: '', referral_email: ''
  })
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { setErrorMsg('Please upload your CV.'); setStatus('error'); return }
    setStatus('loading')
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    fd.append('cv_file', file)
    const res = await fetch('/api/submit', { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok) { setStatus('success') }
    else { setErrorMsg(data.error || 'Something went wrong.'); setStatus('error') }
  }

  if (status === 'success') return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ margin: '0 0 8px', color: '#1a1a1a' }}>Application Submitted!</h2>
        <p style={{ color: '#666', margin: 0 }}>Thank you for applying to Inova IT Systems (Pvt) Ltd. We'll review your CV and be in touch soon.</p>
      </div>
    </div>
  )

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 24, color: '#1a1a1a' }}>Inova IT Systems (Pvt) Ltd</h1>
          <p style={{ margin: 0, color: '#666', fontSize: 15 }}>Submit your CV — we'll be in touch if there's a match.</p>
        </div>
        <form onSubmit={submit}>
          <div style={styles.grid2}>
            <Field label="Full Name *" name="full_name" value={form.full_name} onChange={handle} required />
            <Field label="Email Address *" name="email" type="email" value={form.email} onChange={handle} required />
          </div>
          <div style={styles.grid2}>
            <Field label="Phone Number" name="phone" value={form.phone} onChange={handle} />
            <Field label="Role You're Applying For *" name="desired_role" value={form.desired_role} onChange={handle} required placeholder="e.g. Senior React Developer" />
          </div>
          <div style={styles.grid2}>
            <Field label="LinkedIn Profile URL" name="linkedin_url" value={form.linkedin_url} onChange={handle} placeholder="https://linkedin.com/in/..." />
            <Field label="Portfolio / GitHub URL" name="portfolio_url" value={form.portfolio_url} onChange={handle} placeholder="https://github.com/..." />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>Upload CV (PDF only, max 5MB) *</label>
            <div style={styles.fileBox} onClick={() => document.getElementById('cv-input')?.click()}>
              <input id="cv-input" type="file" accept=".pdf" style={{ display: 'none' }}
                onChange={e => setFile(e.target.files?.[0] || null)} />
              {file ? (
                <span style={{ color: '#0f6e56', fontWeight: 500 }}>📄 {file.name}</span>
              ) : (
                <span style={{ color: '#999' }}>Click to browse or drag & drop your PDF here</span>
              )}
            </div>
          </div>
          <div style={{ background: '#f8f8f8', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: '#555' }}>
              <strong>Referred by a current Inova employee?</strong> (Optional)
            </p>
            <div style={styles.grid2}>
              <Field label="Their Full Name" name="referral_name" value={form.referral_name} onChange={handle} />
              <Field label="Their Work Email" name="referral_email" type="email" value={form.referral_email} onChange={handle} />
            </div>
          </div>
          {status === 'error' && (
            <div style={{ background: '#fff0f0', border: '1px solid #fcc', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#c00', fontSize: 14 }}>
              {errorMsg}
            </div>
          )}
          <button type="submit" disabled={status === 'loading'} style={styles.btn}>
            {status === 'loading' ? 'Submitting...' : 'Submit Application →'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, name, value, onChange, type = 'text', required = false, placeholder = '' }: any) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={styles.label}>{label}</label>
      <input name={name} type={type} value={value} onChange={onChange} required={required}
        placeholder={placeholder} style={styles.input} />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px' },
  card: { background: '#fff', borderRadius: 14, padding: '36px 40px', width: '100%', maxWidth: 680, boxShadow: '0 2px 20px rgba(0,0,0,0.07)' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
  fileBox: { border: '2px dashed #ddd', borderRadius: 10, padding: '24px', textAlign: 'center' as const, cursor: 'pointer', background: '#fafafa' },
  btn: { width: '100%', padding: '13px', background: '#0f6e56', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: 'pointer' },
}