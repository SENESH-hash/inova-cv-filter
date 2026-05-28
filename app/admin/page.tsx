'use client'
import { useState, useEffect, useCallback } from 'react'

const STATUS_COLORS: Record<string, string> = {
  New: '#2563eb', Shortlisted: '#059669', Interviewed: '#d97706', Rejected: '#dc2626'
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [applicants, setApplicants] = useState<any[]>([])
  const [filter, setFilter] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    const t = localStorage.getItem('admin_token')
    if (t) setToken(t)
  }, [])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm)
    })
    const data = await res.json()
    if (res.ok) { localStorage.setItem('admin_token', data.token); setToken(data.token) }
    else setLoginError(data.error)
  }

  const fetchApplicants = useCallback(async () => {
    if (!token) return
    setLoading(true)
    const params = new URLSearchParams()
    if (filter && filterValue) { params.set('filter', filter); params.set('value', filterValue) }
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    const res = await fetch(`/api/admin/applicants?${params}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.status === 401) { localStorage.removeItem('admin_token'); setToken(null); return }
    let data = await res.json()

    if (searchText.trim()) {
      const s = searchText.toLowerCase()
      data = data.filter((a: any) => {
        const ed = a.extracted_data || {}
        return (
          a.full_name?.toLowerCase().includes(s) ||
          a.email?.toLowerCase().includes(s) ||
          a.desired_role?.toLowerCase().includes(s) ||
          a.status?.toLowerCase().includes(s) ||
          ed.location?.toLowerCase().includes(s) ||
          ed.degree_level?.toLowerCase().includes(s) ||
          ed.field_of_study?.toLowerCase().includes(s) ||
          ed.english_level?.toLowerCase().includes(s) ||
          ed.summary?.toLowerCase().includes(s) ||
          ed.skills?.some((sk: string) => sk.toLowerCase().includes(s)) ||
          ed.methodologies?.some((m: string) => m.toLowerCase().includes(s)) ||
          ed.past_job_titles?.some((t: string) => t.toLowerCase().includes(s)) ||
          ed.certifications?.some((c: string) => c.toLowerCase().includes(s))
        )
      })
    }

    setApplicants(data)
    setLoading(false)
  }, [token, filter, filterValue, dateFrom, dateTo, searchText])

  useEffect(() => { if (token) fetchApplicants() }, [token, fetchApplicants])

  const updateApplicant = async (id: string, updates: any) => {
    await fetch(`/api/admin/applicants/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates)
    })
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
    if (selected?.id === id) setSelected((s: any) => ({ ...s, ...updates }))
  }

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Experience (yrs)', 'Location', 'Skills', 'Degree', 'Submitted']
    const rows = applicants.map(a => {
      const ed = a.extracted_data || {}
      return [a.full_name, a.email, a.phone || '', a.desired_role, a.status,
        ed.years_experience || '', ed.location || '',
        (ed.skills || []).join('; '), ed.degree_level || '',
        new Date(a.submitted_at).toLocaleDateString()]
    })
    const csv = [headers, ...rows].map(r => r.map((v: string) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'applicants.csv'; a.click()
  }

  if (!token) return (
    <div style={styles.page}>
      <div style={{ ...styles.card, maxWidth: 380 }}>
        <h2 style={{ margin: '0 0 6px' }}>Inova IT — Admin</h2>
        <p style={{ color: '#666', margin: '0 0 24px', fontSize: 14 }}>Sign in to access the dashboard</p>
        <form onSubmit={login}>
          <input placeholder="Username" value={loginForm.username} style={styles.input}
            onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))} />
          <input placeholder="Password" type="password" value={loginForm.password} style={{ ...styles.input, marginTop: 10 }}
            onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} />
          {loginError && <p style={{ color: '#c00', fontSize: 13, marginTop: 8 }}>{loginError}</p>}
          <button style={{ ...styles.btn, marginTop: 16, width: '100%' }}>Sign In</button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Inova IT — CV Dashboard</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#888' }}>{applicants.length} applicant{applicants.length !== 1 ? 's' : ''}</span>
          <button onClick={exportCSV} style={styles.secondaryBtn}>Export CSV</button>
          <button onClick={() => { localStorage.removeItem('admin_token'); setToken(null) }} style={{ ...styles.secondaryBtn, color: '#c00' }}>Sign Out</button>
        </div>
      </div>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 28px', display: 'flex', gap: 12, flexWrap: 'wrap' as const, alignItems: 'flex-end' }}>
        <div>
          <label style={styles.label}>🔍 Search anything</label>
          <input value={searchText} onChange={e => setSearchText(e.target.value)}
            placeholder="e.g. React, Colombo, MBA, Agile..."
            style={{ ...styles.input, width: 240 }} />
        </div>
        <div>
          <label style={styles.label}>Filter by</label>
          <select value={filter} onChange={e => { setFilter(e.target.value); setFilterValue('') }} style={styles.select}>
            <option value="">All applicants</option>
            <option value="years_experience">Years of Experience (min)</option>
            <option value="location">Location</option>
            <option value="skills">Skill / Code Language</option>
            <option value="methodologies">Methodology (Agile, Scrum…)</option>
            <option value="degree_level">Degree Level</option>
            <option value="field_of_study">Field of Study</option>
            <option value="past_job_titles">Past Job Title</option>
            <option value="english_level">English Level</option>
            <option value="desired_role">Desired Role</option>
            <option value="status">Application Status</option>
          </select>
        </div>
        {filter && (
          <div>
            <label style={styles.label}>Search value</label>
            {filter === 'status' ? (
              <select value={filterValue} onChange={e => setFilterValue(e.target.value)} style={styles.select}>
                <option value="">Any</option>
                {['New', 'Shortlisted', 'Interviewed', 'Rejected'].map(s => <option key={s}>{s}</option>)}
              </select>
            ) : filter === 'degree_level' ? (
              <select value={filterValue} onChange={e => setFilterValue(e.target.value)} style={styles.select}>
                <option value="">Any</option>
                {['Bachelor', 'Master', 'PhD', 'Diploma', 'None'].map(s => <option key={s}>{s}</option>)}
              </select>
            ) : filter === 'english_level' ? (
              <select value={filterValue} onChange={e => setFilterValue(e.target.value)} style={styles.select}>
                <option value="">Any</option>
                {['Native', 'Fluent', 'Intermediate', 'Basic'].map(s => <option key={s}>{s}</option>)}
              </select>
            ) : (
              <input value={filterValue} onChange={e => setFilterValue(e.target.value)}
                placeholder={filter === 'years_experience' ? 'e.g. 3' : 'Type to search...'}
                style={styles.input} />
            )}
          </div>
        )}
        <div>
          <label style={styles.label}>From date</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={styles.input} />
        </div>
        <div>
          <label style={styles.label}>To date</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={styles.input} />
        </div>
        {(filter || dateFrom || dateTo || searchText) && (
          <button onClick={() => { setFilter(''); setFilterValue(''); setDateFrom(''); setDateTo(''); setSearchText('') }}
            style={{ ...styles.secondaryBtn, alignSelf: 'flex-end' }}>Clear filters</button>
        )}
      </div>
      <div style={{ padding: '24px 28px' }}>
        {loading ? (
          <p style={{ color: '#888', textAlign: 'center' as const, marginTop: 60 }}>Loading applicants…</p>
        ) : applicants.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center' as const, marginTop: 60 }}>No applicants found.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {applicants.map(a => <ApplicantCard key={a.id} applicant={a} onSelect={setSelected} onUpdate={updateApplicant} />)}
          </div>
        )}
      </div>
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24 }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <ApplicantDetail applicant={selected} onClose={() => setSelected(null)} onUpdate={updateApplicant} />
        </div>
      )}
    </div>
  )
}

function ApplicantCard({ applicant: a, onSelect, onUpdate }: any) {
  const ed = a.extracted_data || {}
  return (
    <div style={styles.card} onClick={() => onSelect(a)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{a.full_name}</div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{a.desired_role}</div>
        </div>
        <span style={{ background: STATUS_COLORS[a.status] + '18', color: STATUS_COLORS[a.status], fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>{a.status}</span>
      </div>
      <div style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
        <div>📧 {a.email}</div>
        {ed.location && <div>📍 {ed.location}</div>}
        {ed.years_experience != null && <div>⏱ {ed.years_experience} yrs experience</div>}
        {ed.degree_level && <div>🎓 {ed.degree_level}{ed.field_of_study ? ` · ${ed.field_of_study}` : ''}</div>}
      </div>
      {ed.skills?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
          {ed.skills.slice(0, 5).map((s: string) => (
            <span key={s} style={{ background: '#f0f0f0', borderRadius: 4, padding: '2px 7px', fontSize: 11, color: '#444' }}>{s}</span>
          ))}
          {ed.skills.length > 5 && <span style={{ fontSize: 11, color: '#999' }}>+{ed.skills.length - 5} more</span>}
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 12, color: '#bbb' }}>{new Date(a.submitted_at).toLocaleDateString()}</div>
      {a.referral_name && <div style={{ marginTop: 6, fontSize: 12, color: '#888', background: '#fffbe6', borderRadius: 5, padding: '4px 8px' }}>👥 Referred by {a.referral_name}</div>}
    </div>
  )
}

function ApplicantDetail({ applicant: a, onClose, onUpdate }: any) {
  const ed = a.extracted_data || {}
  const [notes, setNotes] = useState(a.admin_notes || '')
  const [saving, setSaving] = useState(false)

  const saveNotes = async () => {
    setSaving(true)
    await onUpdate(a.id, { admin_notes: notes })
    setSaving(false)
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 640, maxHeight: '88vh', overflowY: 'auto' as const, padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>{a.full_name}</h2>
          <div style={{ color: '#666', marginTop: 4 }}>{a.desired_role}</div>
        </div>
        <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#999' }}>×</button>
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={styles.label}>Application Status</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['New', 'Shortlisted', 'Interviewed', 'Rejected'].map(s => (
            <button key={s} onClick={() => onUpdate(a.id, { status: s })}
              style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${STATUS_COLORS[s]}`, background: a.status === s ? STATUS_COLORS[s] : 'transparent', color: a.status === s ? '#fff' : STATUS_COLORS[s], fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <Section title="Contact">
        <Row label="Email" value={a.email} />
        <Row label="Phone" value={a.phone} />
        {a.linkedin_url && <Row label="LinkedIn" value={<a href={a.linkedin_url} target="_blank" rel="noreferrer">{a.linkedin_url}</a>} />}
        {a.portfolio_url && <Row label="Portfolio" value={<a href={a.portfolio_url} target="_blank" rel="noreferrer">{a.portfolio_url}</a>} />}
      </Section>
      <Section title="Extracted from CV">
        <Row label="Experience" value={ed.years_experience != null ? `${ed.years_experience} years` : null} />
        <Row label="Location" value={ed.location} />
        <Row label="Degree" value={ed.degree_level} />
        <Row label="Field of Study" value={ed.field_of_study} />
        <Row label="English" value={ed.english_level} />
        {ed.past_job_titles?.length > 0 && <Row label="Past Titles" value={ed.past_job_titles.join(', ')} />}
        {ed.methodologies?.length > 0 && <Row label="Methodologies" value={ed.methodologies.join(', ')} />}
        {ed.skills?.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#888', width: 130, display: 'inline-block' }}>Skills</span>
            <div style={{ display: 'inline-flex', flexWrap: 'wrap' as const, gap: 4 }}>
              {ed.skills.map((s: string) => <span key={s} style={{ background: '#f0f0f0', borderRadius: 4, padding: '2px 7px', fontSize: 12 }}>{s}</span>)}
            </div>
          </div>
        )}
        {ed.summary && <div style={{ marginTop: 10, fontSize: 13, color: '#555', fontStyle: 'italic', background: '#f9f9f9', borderRadius: 8, padding: '10px 12px' }}>{ed.summary}</div>}
      </Section>
      {a.referral_name && (
        <Section title="Referral">
          <Row label="Referred by" value={a.referral_name} />
          <Row label="Referral email" value={a.referral_email} />
        </Section>
      )}
      <a href={a.cv_file_url} target="_blank" rel="noreferrer"
        style={{ display: 'inline-block', marginBottom: 20, padding: '9px 18px', background: '#0f6e56', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
        📄 Download CV
      </a>
      <Section title="Admin Notes (private)">
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          style={{ width: '100%', minHeight: 80, padding: 10, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, resize: 'vertical' as const, boxSizing: 'border-box' as const }} />
        <button onClick={saveNotes} style={{ ...styles.btn, marginTop: 8, padding: '8px 20px', width: 'auto' }}>
          {saving ? 'Saving…' : 'Save Notes'}
        </button>
      </Section>
    </div>
  )
}

function Section({ title, children }: any) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#999', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}

function Row({ label, value }: any) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', marginBottom: 6, fontSize: 14 }}>
      <span style={{ color: '#888', width: 130, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#1a1a1a' }}>{value}</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #eee', cursor: 'pointer' },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 4 },
  input: { padding: '8px 11px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' },
  select: { padding: '8px 11px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fff', cursor: 'pointer' },
  btn: { background: '#0f6e56', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '10px 20px' },
  secondaryBtn: { background: 'transparent', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, cursor: 'pointer', padding: '7px 14px', color: '#444' },
}