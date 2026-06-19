'use client'
import { useState, useEffect, useRef } from 'react'

const REFERRAL_OPTIONS = ['Social Networks', 'Company Website', 'Referrals and Networking', 'LinkedIn Jobs Section']

const TECH_STACK_OPTIONS = [
  'Java',
  'Node.js & PHP',
  'Drools',
  'ReactJS & Angular',
  'Web 2.0 Tech',
  'MySQL & Oracle DB',
  'Amazon Web Services (AWS)',
  'Docker & Linux',
]

const PROFICIENCY_OPTIONS = [
  { value: 'Basic (A1/A2)',        label: 'Basic (A1/A2)' },
  { value: 'Conversational (B1/B2)', label: 'Conversational (B1/B2)' },
  { value: 'Fluent (C1)',          label: 'Fluent (C1)' },
  { value: 'Native (C2)',          label: 'Native (C2)' },
]

interface LanguageEntry {
  language: string
  proficiency: string
}

function DotBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    const N = 90
    const dots = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 1.1 + 0.5,
      base: Math.random() * 0.4 + 0.5,
      phase: Math.random() * Math.PI * 2,
      tw: Math.random() * 0.04 + 0.02,
    }))
    let frame = 0
    const tick = () => {
      frame++
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.shadowColor = 'rgba(226,35,26,0.9)'
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy
        if (d.x < 0) d.x = canvas.width
        if (d.x > canvas.width) d.x = 0
        if (d.y < 0) d.y = canvas.height
        if (d.y > canvas.height) d.y = 0
        const a = d.base * (0.55 + 0.45 * Math.sin(d.phase + frame * d.tw))
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,80,70,${a})`
        ctx.fill()
      }
      ctx.shadowBlur = 0
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'fixed' as const, inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' as const }} />
}

export default function ApplyPage() {
  const [roles, setRoles] = useState<{id: string, title: string}[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [customRole, setCustomRole] = useState('')
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', linkedin_url: '', portfolio_url: '',
    experience_years: '', experience_months: '', domain_experience: '',
    professional_qualifications: '',
  })
  const [techHighlights, setTechHighlights] = useState([
    { tech: '', years: '' }, { tech: '', years: '' }, { tech: '', years: '' }
  ])
  const [techStack, setTechStack] = useState(
    TECH_STACK_OPTIONS.map(name => ({ name, selected: false, years: '' }))
  )

  // Language entries — replaces the single "languages" text field
  const [languageEntries, setLanguageEntries] = useState<LanguageEntry[]>([
    { language: '', proficiency: '' }
  ])

  const [keySkills, setKeySkills] = useState({
    frameworks: '', databases: '', other: ''
  })
  const [file, setFile] = useState<File | null>(null)
  const [openToOutsourcing, setOpenToOutsourcing] = useState('')
  const [expectedSalary, setExpectedSalary] = useState('')
  const [noticePeriod, setNoticePeriod] = useState('')
  const [workAvailability, setWorkAvailability] = useState<string[]>([])
  const [workComments, setWorkComments] = useState('')
  const toggleAvailability = (v: string) => setWorkAvailability(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  const [referralSource, setReferralSource] = useState('')
  const [gender, setGender] = useState('')
  const [referralName, setReferralName] = useState('')
  const [internalStaffNote, setInternalStaffNote] = useState('')
  const [isInternship, setIsInternship] = useState<'Yes' | 'No' | ''>('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/roles').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setRoles(data)
    })
  }, [])

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const toggleRole = (title: string) => {
    setSelectedRoles(prev =>
      prev.includes(title) ? prev.filter(r => r !== title) : [...prev, title]
    )
  }

  // Language entry helpers
  const updateLanguageEntry = (index: number, field: keyof LanguageEntry, value: string) => {
    setLanguageEntries(prev => prev.map((entry, i) => i === index ? { ...entry, [field]: value } : entry))
  }

  const addLanguageEntry = () => {
    setLanguageEntries(prev => [...prev, { language: '', proficiency: '' }])
  }

  const removeLanguageEntry = (index: number) => {
    if (languageEntries.length === 1) {
      setLanguageEntries([{ language: '', proficiency: '' }])
    } else {
      setLanguageEntries(prev => prev.filter((_, i) => i !== index))
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { setErrorMsg('Please upload your CV.'); setStatus('error'); return }
    if (selectedRoles.length === 0 && !customRole.trim()) {
      setErrorMsg('Please select or enter at least one role.'); setStatus('error'); return
    }
    if (!form.linkedin_url.trim()) {
      setErrorMsg('LinkedIn URL is required.'); setStatus('error'); return
    }
    if (!referralSource) {
      setErrorMsg('Please tell us how you heard about us.'); setStatus('error'); return
    }
    setStatus('loading')

    // Build key_skills with structured languages array
    const validLanguages = languageEntries.filter(l => l.language.trim())
    const fullKeySkills = {
      languages: validLanguages,   // array of {language, proficiency}
      frameworks: keySkills.frameworks,
      databases: keySkills.databases,
      other: keySkills.other,
    }

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    const allRoles = [...selectedRoles, ...(customRole.trim() ? [customRole.trim()] : [])]
    fd.append('selected_roles', JSON.stringify(allRoles))
    fd.append('tech_highlights', JSON.stringify(techHighlights))
    fd.append('tech_stack', JSON.stringify(techStack.filter(t => t.selected).map(t => ({ tech: t.name, years: t.years }))))
    fd.append('key_skills', JSON.stringify(fullKeySkills))
    fd.append('open_to_outsourcing', openToOutsourcing)
    fd.append('expected_salary', expectedSalary)
    fd.append('notice_period', noticePeriod)
    fd.append('work_preference', workAvailability.join(', '))
    fd.append('work_arrangement_comments', workComments)
    fd.append('referral_source', referralSource)
    fd.append('gender', gender)
    fd.append('referral_name', referralName)
    fd.append('internal_staff_note', internalStaffNote)
    fd.append('is_internship', isInternship)
    fd.append('cv_file', file)

    const res = await fetch('/api/submit', { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok) setStatus('success')
    else { setErrorMsg(data.error || 'Something went wrong.'); setStatus('error') }
  }

  if (status === 'success') return (
    <div style={styles.page}>
      <DotBackground />
      <div style={styles.card}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>Application Received!</div>
        <br/>
        <p style={{ color: '#666', margin: 0 }}>Thank you for your interest in joining Inova IT Systems (PVT) LTD. We have successfully received your CV. Our talent acquisition team reviews every application on a rolling basis. If your experience aligns with our needs, we will reach out to discuss the next steps.</p>
      </div>
    </div>
  )

  return (
    <div style={styles.page}>
      <DotBackground />
      <div style={styles.card}>
        <div style={{ background: '#C41E3A', margin: '-36px -40px 28px', padding: '24px 40px', borderRadius: '14px 14px 0 0' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, color: '#fff', fontWeight: 700 }}>Inova IT Systems (Pvt) Ltd</h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>Submit your CV — we'll be in touch if there's a match.</p>
        </div>

        <form onSubmit={submit}>
          {/* Basic Info */}
          <div style={styles.grid2}>
            <Field label="Full Name *" name="full_name" value={form.full_name} onChange={handle} required />
            <Field label="Email Address *" name="email" type="email" value={form.email} onChange={handle} required />
          </div>

          {/* Gender */}
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>Gender</label>
            <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' as const }}>
              {['Male', 'Female', 'Prefer not to say'].map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                  <input type="radio" name="gender" value={opt} checked={gender === opt} onChange={() => setGender(opt)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          <div style={styles.grid2}>
            <Field label="Phone Number" name="phone" value={form.phone} onChange={handle} />
            <Field label="LinkedIn Profile URL *" name="linkedin_url" value={form.linkedin_url} onChange={handle} required placeholder="https://linkedin.com/in/..." />
          </div>
          <Field label="Portfolio / GitHub URL (Optional)" name="portfolio_url" value={form.portfolio_url} onChange={handle} placeholder="https://github.com/..." />

          {/* For Internships? */}
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>For Internships?</label>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>Are you applying for an internship? If you select "Yes", the fields that don't apply to interns will be hidden.</p>
            <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
              {(['Yes', 'No'] as const).map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="is_internship"
                    value={opt}
                    checked={isInternship === opt}
                    onChange={() => {
                      setIsInternship(opt)
                      if (opt === 'Yes') {
                        setExpectedSalary('')
                        setOpenToOutsourcing('')
                        setForm(f => ({ ...f, domain_experience: '' }))
                      }
                    }}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          {/* Roles */}
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>Role(s) You're Applying For *</label>
            {roles.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 10 }}>
                {roles.map(r => (
                  <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: `1.5px solid ${selectedRoles.includes(r.title) ? '#0f6e56' : '#ddd'}`, borderRadius: 20, cursor: 'pointer', background: selectedRoles.includes(r.title) ? '#e8f5f1' : '#fff', fontSize: 14 }}>
                    <input type="checkbox" checked={selectedRoles.includes(r.title)} onChange={() => toggleRole(r.title)} style={{ display: 'none' }} />
                    {selectedRoles.includes(r.title) ? '✓ ' : ''}{r.title}
                  </label>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>No roles posted yet — please type your preferred role below.</p>
            )}
            <input placeholder="Or type your preferred role..." value={customRole} onChange={e => setCustomRole(e.target.value)}
              style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const }} />
          </div>

          {/* CV Upload */}
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>Upload CV (PDF or Word, max 5MB) *</label>
            <div style={styles.fileBox} onClick={() => document.getElementById('cv-input')?.click()}>
              <input id="cv-input" type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                onChange={e => setFile(e.target.files?.[0] || null)} />
              {file ? (
                <span style={{ color: '#0f6e56', fontWeight: 500 }}>📄 {file.name}</span>
              ) : (
                <span style={{ color: '#999' }}>Click to browse or drag & drop (PDF or Word)</span>
              )}
            </div>
          </div>

          {/* Experience */}
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>Total Years of Experience *</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <input name="experience_years" type="number" min="0" max="50" placeholder="Years" value={form.experience_years}
                  onChange={handle} style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const }} />
              </div>
              <div style={{ flex: 1 }}>
                <input name="experience_months" type="number" min="0" max="11" placeholder="Months" value={form.experience_months}
                  onChange={handle} style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const }} />
              </div>
            </div>
          </div>

          {/* Technology Highlights */}
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>Technology Highlights</label>

            {/* Predefined tech stacks — tick + years */}
            <p style={{ fontSize: 13, color: '#555', margin: '0 0 8px', fontWeight: 500 }}>Tick the technologies you have experience with, then enter the number of years for each.</p>
            <div style={{ marginBottom: 18 }}>
              {techStack.map((t, i) => (
                <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer', fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={t.selected}
                      onChange={e => setTechStack(prev => prev.map((x, j) => j === i ? { ...x, selected: e.target.checked, years: e.target.checked ? x.years : '' } : x))}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    {t.name}
                  </label>
                  <input
                    placeholder="Years"
                    type="number"
                    min="0"
                    value={t.years}
                    disabled={!t.selected}
                    onChange={e => setTechStack(prev => prev.map((x, j) => j === i ? { ...x, years: e.target.value } : x))}
                    style={{ ...styles.input, width: 90, flex: 'none', background: t.selected ? '#fff' : '#f5f5f5' }}
                  />
                </div>
              ))}
            </div>

            {/* Other / additional technologies — free text */}
            <label style={{ fontSize: 13, color: '#555', fontWeight: 500, display: 'block', marginBottom: 6 }}>Other technologies</label>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>Add any other technologies not listed above, and how many years you've used each</p>
            {techHighlights.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input placeholder="Technology (e.g. React JS)" value={t.tech}
                  onChange={e => setTechHighlights(prev => prev.map((x, j) => j === i ? { ...x, tech: e.target.value } : x))}
                  style={{ ...styles.input, flex: 2 }} />
                <input placeholder="Years" type="number" min="0" value={t.years}
                  onChange={e => setTechHighlights(prev => prev.map((x, j) => j === i ? { ...x, years: e.target.value } : x))}
                  style={{ ...styles.input, flex: 1 }} />
                {i === techHighlights.length - 1 && (
                  <button type="button" onClick={() => setTechHighlights(prev => [...prev, { tech: '', years: '' }])}
                    style={{ padding: '8px 12px', background: '#0f6e56', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>+</button>
                )}
              </div>
            ))}
          </div>

          {/* Domain Experience — hidden for interns */}
          {isInternship !== 'Yes' && (
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>Domain Experience</label>
            <input name="domain_experience" placeholder="e.g. Banking & Finance, Healthcare, E-commerce"
              value={form.domain_experience} onChange={handle}
              style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const }} />
          </div>
          )}

          {/* Outsourcing — hidden for interns */}
          {isInternship !== 'Yes' && (
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>Are you open to outsourcing opportunities?</label>
            <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
              {['Yes', 'No'].map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                  <input type="radio" name="outsourcing" value={opt}
                    checked={openToOutsourcing === opt}
                    onChange={() => setOpenToOutsourcing(opt)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          )}

          {/* Desired Compensation — hidden for interns */}
          {isInternship !== 'Yes' && (
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>Desired Compensation (please specify currency)</label>
            <input
              placeholder="e.g. LKR 150,000 / USD 1,500"
              value={expectedSalary}
              onChange={e => setExpectedSalary(e.target.value)}
              style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const }}
            />
          </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>Notice Period</label>
            <select
              value={noticePeriod}
              onChange={e => setNoticePeriod(e.target.value)}
              style={{ ...styles.select, width: '100%', boxSizing: 'border-box' as const }}
            >
              <option value="">Select notice period...</option>
              <option value="Immediate">Immediate</option>
              <option value="1 Week">1 Week</option>
              <option value="2 Weeks">2 Weeks</option>
              <option value="1 Month">1 Month</option>
              <option value="2+ Months">2+ Months</option>
            </select>
          </div>

          {/* Work Arrangement Availability */}
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>Work Arrangement Availability</label>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 10px' }}>This role may require on-site, hybrid, or remote work depending on project requirements. Please indicate your availability:</p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              {[
                { value: 'On-site', label: 'Available for On-site work' },
                { value: 'Hybrid', label: 'Available for Hybrid work' },
                { value: 'Remote/WFH', label: 'Available for Remote/WFH work' },
              ].map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                  <input type="checkbox" checked={workAvailability.includes(opt.value)} onChange={() => toggleAvailability(opt.value)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  {opt.label}
                </label>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={styles.label}>Additional Comments (Optional)</label>
              <input value={workComments} onChange={e => setWorkComments(e.target.value)} style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const }} />
            </div>
          </div>

          {/* Key Skills */}
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>Key Skills</label>

            {/* Languages — structured entries */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: '#555', fontWeight: 500, display: 'block', marginBottom: 6 }}>Languages</label>
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>Add each language you speak and your proficiency level</p>
              {languageEntries.map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  {/* Language name */}
                  <input
                    placeholder="Language (e.g. English)"
                    value={entry.language}
                    onChange={e => updateLanguageEntry(i, 'language', e.target.value)}
                    style={{ ...styles.input, flex: 2 }}
                  />
                  {/* Proficiency dropdown */}
                  <select
                    value={entry.proficiency}
                    onChange={e => updateLanguageEntry(i, 'proficiency', e.target.value)}
                    style={{ ...styles.select, flex: 2 }}
                  >
                    <option value="">Select level...</option>
                    {PROFICIENCY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {/* Remove button (always visible but resets if only 1 row) */}
                  {languageEntries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLanguageEntry(i)}
                      style={{ padding: '8px 10px', background: '#fff0f0', border: '1px solid #fcc', borderRadius: 8, color: '#c00', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
                    >×</button>
                  )}
                  {/* Add button — only on last row */}
                  {i === languageEntries.length - 1 && (
                    <button
                      type="button"
                      onClick={addLanguageEntry}
                      style={{ padding: '8px 12px', background: '#0f6e56', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 700, lineHeight: 1 }}
                    >+</button>
                  )}
                </div>
              ))}
            </div>

            {/* Other key skill fields */}
            {(['frameworks', 'databases', 'other'] as const).map(cat => (
              <div key={cat} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 13, color: '#555', fontWeight: 500, textTransform: 'capitalize' as const, display: 'block', marginBottom: 4 }}>{cat}</label>
                <input placeholder={`Enter ${cat}...`} value={keySkills[cat]}
                  onChange={e => setKeySkills(prev => ({ ...prev, [cat]: e.target.value }))}
                  style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const }} />
              </div>
            ))}
          </div>

          {/* Professional Qualifications */}
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>Professional Qualifications & Experience</label>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>Include your education, certifications, and work experience details</p>
            <textarea name="professional_qualifications" value={form.professional_qualifications} onChange={handle}
              placeholder="Education:&#10;BSc (Hons) Software Engineering - University of Plymouth (2023)&#10;&#10;Certifications:&#10;OOP JAVA - JAVA Institute&#10;&#10;Experience:&#10;Software Engineer - Inova IT Systems (2023-Present)&#10;- Led front-end development..."
              style={{ width: '100%', minHeight: 200, padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, resize: 'vertical' as const, boxSizing: 'border-box' as const, fontFamily: 'inherit', lineHeight: 1.6 }} />
          </div>

          {/* Referral */}
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>How did you hear about us? *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: referralSource === 'Referrals and Networking' ? 10 : 0 }}>
              {REFERRAL_OPTIONS.map(opt => (
                <button key={opt} type="button"
                  onClick={() => setReferralSource(referralSource === opt ? '' : opt)}
                  style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${referralSource === opt ? '#0f6e56' : '#ddd'}`, background: referralSource === opt ? '#e8f5f1' : '#fff', color: referralSource === opt ? '#0f6e56' : '#555', fontSize: 13, cursor: 'pointer', fontWeight: referralSource === opt ? 600 : 400 }}>
                  {opt}
                </button>
              ))}
            </div>
            {referralSource === 'Referrals and Networking' && (
              <input placeholder="Enter the person's name who referred you" value={referralName}
                onChange={e => setReferralName(e.target.value)}
                style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const, marginTop: 8 }} />
            )}
          </div>

          {/* For Staff Use Only */}
          <div style={{ marginBottom: 20, background: '#f1f3f5', border: '1px solid #e0e3e7', borderRadius: 10, padding: '14px 16px' }}>
            <label style={{ ...styles.label, color: '#555' }}>For Staff Use Only</label>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>Internal staff only — if you work at Inova IT and are submitting on behalf of the company, enter your name and department here. External applicants, please leave this blank.</p>
            <input
              placeholder="e.g. John Silva — HR Department"
              value={internalStaffNote}
              onChange={e => setInternalStaffNote(e.target.value)}
              style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const }}
            />
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
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 }}>{label}</label>
      <input name={name} type={type} value={value} onChange={onChange} required={required}
        placeholder={placeholder} style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0d0d0d', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px' },
  card: { background: '#fff', borderRadius: 14, padding: '36px 40px', width: '100%', maxWidth: 700, boxShadow: '0 2px 20px rgba(196,30,58,0.08)', position: 'relative' as const, zIndex: 1 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
  select: { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, background: '#fff', cursor: 'pointer' },
  fileBox: { border: '2px dashed #C41E3A', borderRadius: 10, padding: '24px', textAlign: 'center' as const, cursor: 'pointer', background: '#FFF0F0' },
  btn: { width: '100%', padding: '13px', background: '#C41E3A', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: 'pointer' },
}