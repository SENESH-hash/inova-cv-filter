'use client'
import { useState, useEffect, useCallback } from 'react'

const STATUS_COLORS: Record<string, string> = {
  New: '#2563eb', Shortlisted: '#059669', Interviewed: '#d97706', Rejected: '#dc2626',
  'Not Available': '#6b7280', Outsourced: '#7c3aed'
}

// ─── Filter row type ───────────────────────────────────────────────────────────
interface FilterRow {
  id: number
  filter: string
  filterValue: string
  languageType: string
}

const EMPTY_FILTER = (): FilterRow => ({
  id: Date.now() + Math.random(),
  filter: '',
  filterValue: '',
  languageType: '',
})

const FILTER_OPTIONS = [
  { value: 'years_experience', label: 'Years of Experience (min)' },
  { value: 'location',         label: 'Location' },
  { value: 'skills',           label: 'Skill / Code Language' },
  { value: 'methodologies',    label: 'Methodology (Agile, Scrum…)' },
  { value: 'degree_level',     label: 'Degree Level' },
  { value: 'field_of_study',   label: 'Field of Study' },
  { value: 'past_job_titles',  label: 'Past Job Title' },
  { value: 'language_level',   label: 'Language Level' },
  { value: 'desired_role',     label: 'Desired Role' },
  { value: 'status',           label: 'Application Status' },
]

// ─── Job Opening type ──────────────────────────────────────────────────────────
interface JobOpening {
  id: string
  title: string
  department: string
  employment_type: string
  location: string
  min_experience_years: number
  tech_stack: string[]
  required_methodologies: string[]
  degree_required: string
  job_description: string
  responsibilities: string
  nice_to_have: string
  notes: string
  status: string
  created_at: string
}

const EMPTY_JOB = (): Omit<JobOpening, 'id' | 'created_at'> => ({
  title: '',
  department: '',
  employment_type: 'Full-time',
  location: '',
  min_experience_years: 0,
  tech_stack: [],
  required_methodologies: [],
  degree_required: '',
  job_description: '',
  responsibilities: '',
  nice_to_have: '',
  notes: '',
  status: 'Open',
})

// ─── TagInput: array of strings with + button ─────────────────────────────────
function TagInput({ values, onChange, placeholder }: { values: string[], onChange: (v: string[]) => void, placeholder: string }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !values.includes(v)) { onChange([...values, v]); setInput('') }
  }
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5, marginBottom: 6 }}>
        {values.map(v => (
          <span key={v} style={{ background: '#e8f0ff', borderRadius: 5, padding: '3px 9px', fontSize: 13, color: '#1a3a8f', display: 'flex', alignItems: 'center', gap: 5 }}>
            {v}
            <button onClick={() => onChange(values.filter(x => x !== v))}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#999', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder} style={{ ...styles.input, flex: 1 }} />
        <button onClick={add} style={{ ...styles.btn, padding: '8px 14px', fontSize: 13 }}>+</button>
      </div>
    </div>
  )
}

// ─── CV Summary table config ────────────────────────────────────────────────────
const SUMMARY_ROWS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'notice_period', label: 'Notice Period' },
  { key: 'desired_compensation', label: 'Desired Compensation' },
  { key: 'technology_highlights', label: 'Technology Highlights' },
  { key: 'languages', label: 'Languages' },
]
function mapApplicantToSummary(a: any) {
  const ks = a.key_skills || {}
  const tech = Array.isArray(a.technology_highlights)
    ? a.technology_highlights.filter((t: any) => t.tech).map((t: any) => `${t.tech}${t.years ? ` (${t.years}Y)` : ''}`).join(', ')
    : ''
  const langs = Array.isArray(ks.languages)
    ? ks.languages.map((l: any) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ''}`).join(', ')
    : (ks.languages || '')
  return {
    name: a.full_name || '',
    email: a.email || '',
    phone: a.phone || '',
    notice_period: a.notice_period || '',
    desired_compensation: a.expected_salary || '',
    technology_highlights: tech,
    languages: langs,
  }
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Tab state
  const [activeTab, setActiveTab] = useState<'cvs' | 'jobs'>('cvs')

  // CV Dashboard state
  const [applicants, setApplicants] = useState<any[]>([])
  const [filteredApplicants, setFilteredApplicants] = useState<any[]>([])
  const [filterRows, setFilterRows] = useState<FilterRow[]>([EMPTY_FILTER()])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchText, setSearchText] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [aiRanking, setAiRanking] = useState(false)
  const [roles, setRoles] = useState<{id: string, title: string}[]>([])
  const [newRole, setNewRole] = useState('')
  const [showRoleManager, setShowRoleManager] = useState(false)

  // Job Openings state
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [showJobForm, setShowJobForm] = useState(false)
  const [jobForm, setJobForm] = useState(EMPTY_JOB())
  const [jobSaving, setJobSaving] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null)
  const [screeningJob, setScreeningJob] = useState<string | null>(null) // job id being screened
  const [screenedResults, setScreenedResults] = useState<{ jobId: string; applicants: any[] } | null>(null)
  const [summary, setSummary] = useState<any[] | null>(null) // built CV comparison summary
  const [confirmDialog, setConfirmDialog] = useState<{ message: string, onYes: () => void } | null>(null)
  const askConfirm = (message: string, onYes: () => void) => setConfirmDialog({ message, onYes })

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

  const fetchRoles = useCallback(async () => {
    const res = await fetch('/api/admin/roles')
    const data = await res.json()
    if (Array.isArray(data)) setRoles(data)
  }, [])

  // ─── Fetch job openings ──────────────────────────────────────────────────────
  const fetchJobOpenings = useCallback(async () => {
    if (!token) return
    setJobsLoading(true)
    const res = await fetch('/api/admin/job-openings', { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) {
      const data = await res.json()
      setJobOpenings(data)
    }
    setJobsLoading(false)
  }, [token])

  // ─── Apply filters ───────────────────────────────────────────────────────────
  const applyFilters = useCallback((allData: any[]) => {
    let result = [...allData]
    if (dateFrom) result = result.filter(a => new Date(a.submitted_at) >= new Date(dateFrom))
    if (dateTo)   result = result.filter(a => new Date(a.submitted_at) <= new Date(dateTo + 'T23:59:59Z'))

    for (const row of filterRows) {
      if (!row.filter || !row.filterValue.trim()) continue
      const v = row.filterValue.toLowerCase().trim()
      result = result.filter((a: any) => {
        const ed = a.extracted_data || {}
        switch (row.filter) {
          case 'years_experience':
            return (a.experience_years != null && a.experience_years >= parseInt(v)) ||
                   (ed.years_experience != null && ed.years_experience >= parseInt(v))
          case 'location':
            return ed.location?.toLowerCase().includes(v)
          case 'skills':
            return ed.skills?.some((s: string) => s.toLowerCase().includes(v)) ||
                   a.technology_highlights?.some((t: any) => t.tech?.toLowerCase().includes(v))
          case 'methodologies':
            return ed.methodologies?.some((m: string) => m.toLowerCase().includes(v))
          case 'degree_level':
            return ed.degree_level?.toLowerCase().includes(v)
          case 'field_of_study':
            return ed.field_of_study?.toLowerCase().includes(v)
          case 'past_job_titles':
            return ed.past_job_titles?.some((t: string) => t.toLowerCase().includes(v))
          case 'language_level': {
            const langType = row.languageType.toLowerCase().trim()
            const ks = a.key_skills || {}
            if (Array.isArray(ks.languages)) {
              return ks.languages.some((l: any) => {
                const nameMatch = !langType || l.language?.toLowerCase().includes(langType)
                const levelMatch = l.proficiency?.toLowerCase().includes(v)
                return nameMatch && levelMatch
              })
            }
            return ed.english_level?.toLowerCase().includes(v) || ed.language_level?.toLowerCase().includes(v)
          }
          case 'desired_role':
            return a.desired_role?.toLowerCase().includes(v) ||
                   a.selected_roles?.some((r: string) => r.toLowerCase().includes(v))
          case 'status':
            return a.status?.toLowerCase() === v
          default:
            return true
        }
      })
    }

    if (searchText.trim()) {
      const s = searchText.toLowerCase()
      result = result.filter((a: any) => {
        const ed = a.extracted_data || {}
        const ks = a.key_skills || {}
        const langStr = Array.isArray(ks.languages)
          ? ks.languages.map((l: any) => `${l.language} ${l.proficiency}`).join(' ')
          : (ks.languages || '')
        return (
          a.full_name?.toLowerCase().includes(s) ||
          a.email?.toLowerCase().includes(s) ||
          a.desired_role?.toLowerCase().includes(s) ||
          a.status?.toLowerCase().includes(s) ||
          a.domain_experience?.toLowerCase().includes(s) ||
          a.professional_qualifications?.toLowerCase().includes(s) ||
          langStr.toLowerCase().includes(s) ||
          ed.location?.toLowerCase().includes(s) ||
          ed.degree_level?.toLowerCase().includes(s) ||
          ed.field_of_study?.toLowerCase().includes(s) ||
          ed.english_level?.toLowerCase().includes(s) ||
          ed.summary?.toLowerCase().includes(s) ||
          ed.skills?.some((sk: string) => sk.toLowerCase().includes(s)) ||
          ed.methodologies?.some((m: string) => m.toLowerCase().includes(s)) ||
          ed.past_job_titles?.some((t: string) => t.toLowerCase().includes(s)) ||
          a.selected_roles?.some((r: string) => r.toLowerCase().includes(s)) ||
          a.technology_highlights?.some((t: any) => t.tech?.toLowerCase().includes(s))
        )
      })
    }
    setFilteredApplicants(result)
  }, [filterRows, dateFrom, dateTo, searchText])

  const fetchApplicants = useCallback(async () => {
    if (!token) return
    setLoading(true)
    const res = await fetch(`/api/admin/applicants`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.status === 401) { localStorage.removeItem('admin_token'); setToken(null); return }
    const data = await res.json()
    setApplicants(data)
    setLoading(false)
  }, [token])

  useEffect(() => { applyFilters(applicants) }, [applicants, applyFilters])
  useEffect(() => { if (token) { fetchApplicants(); fetchRoles(); fetchJobOpenings() } }, [token, fetchApplicants, fetchRoles, fetchJobOpenings])

  // ─── AI Ranking ──────────────────────────────────────────────────────────────
  const runAiRanking = async () => {
    if (filteredApplicants.length === 0) return
    setAiRanking(true)
    try {
      const criteria = filterRows
        .filter(r => r.filter && r.filterValue.trim())
        .map(r => {
          const label = FILTER_OPTIONS.find(o => o.value === r.filter)?.label || r.filter
          const langPart = r.filter === 'language_level' && r.languageType ? ` (${r.languageType})` : ''
          return `${label}${langPart}: ${r.filterValue}`
        }).join(', ')

      const res = await fetch('/api/admin/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          criteria: criteria || 'Best overall fit',
          applicants: filteredApplicants.map(a => ({
            id: a.id, full_name: a.full_name, experience_years: a.experience_years,
            experience_months: a.experience_months, desired_role: a.desired_role,
            selected_roles: a.selected_roles, domain_experience: a.domain_experience,
            technology_highlights: a.technology_highlights, key_skills: a.key_skills,
            professional_qualifications: a.professional_qualifications, extracted_data: a.extracted_data,
          }))
        })
      })
      if (res.ok) {
        const { rankedIds } = await res.json()
        if (Array.isArray(rankedIds)) {
          const ranked = rankedIds.map((id: string) => filteredApplicants.find(a => a.id === id)).filter(Boolean)
          const rest = filteredApplicants.filter(a => !rankedIds.includes(a.id))
          setFilteredApplicants([...ranked, ...rest])
        }
      }
    } catch (err) { console.error('AI ranking error:', err) }
    setAiRanking(false)
  }

  // ─── Screen CVs for a job ────────────────────────────────────────────────────
  const screenCVsForJob = async (jobId: string, topN: number) => {
    setScreeningJob(jobId)
    setScreenedResults(null)
    setSummary(null)
    try {
      const res = await fetch(`/api/admin/job-openings/${jobId}/screen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topN }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        alert(error || 'Screening failed')
        setScreeningJob(null)
        return
      }
      const { rankedApplicants } = await res.json()
      setScreenedResults({ jobId, applicants: rankedApplicants })
      setActiveTab('cvs')
      setSelectedJob(null)
    } catch (err) { console.error('Screening error:', err) }
    setScreeningJob(null)
  }

  const createSummary = () => {
    if (!screenedResults) return
    setSummary(screenedResults.applicants.map(mapApplicantToSummary))
  }

  const saveSummaryToJob = async (data: { highlights: Record<string, string>, note: string, selected: Record<string, boolean> }) => {
    if (!screenedResults || !summary) return
    const jobTitle = jobOpenings.find(j => j.id === screenedResults.jobId)?.title || ''
    const res = await fetch('/api/admin/cv-summaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        job_id: screenedResults.jobId,
        job_title: jobTitle,
        summary_data: { applicants: summary, highlights: data.highlights, note: data.note, selected: data.selected },
      }),
    })
    if (!res.ok) { const { error } = await res.json().catch(() => ({})); alert(error || 'Could not save summary') }
  }

  // ─── Job form helpers ────────────────────────────────────────────────────────
  const saveJob = async () => {
    if (!jobForm.title.trim()) return alert('Job title is required')
    setJobSaving(true)
    const res = await fetch('/api/admin/job-openings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(jobForm),
    })
    if (res.ok) {
      setShowJobForm(false)
      setJobForm(EMPTY_JOB())
      fetchJobOpenings()
    }
    setJobSaving(false)
  }

  const deleteJob = (id: string) => {
    askConfirm('This will permanently delete this job opening. This action cannot be undone.', async () => {
      const res = await fetch('/api/admin/job-openings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      })
      if (res.ok) { fetchJobOpenings(); if (selectedJob?.id === id) setSelectedJob(null) }
    })
  }

  const toggleJobStatus = async (job: JobOpening) => {
    const newStatus = job.status === 'Open' ? 'Closed' : 'Open'
    const res = await fetch('/api/admin/job-openings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: job.id, status: newStatus }),
    })
    if (res.ok) fetchJobOpenings()
  }

  // ─── Filter row helpers ──────────────────────────────────────────────────────
  const updateFilterRow = (id: number, updates: Partial<FilterRow>) => {
    setFilterRows(rows => rows.map(r => r.id === id ? { ...r, ...updates } : r))
  }
  const addFilterRow = () => setFilterRows(rows => [...rows, EMPTY_FILTER()])
  const removeFilterRow = (id: number) => {
    setFilterRows(rows => rows.length === 1 ? [EMPTY_FILTER()] : rows.filter(r => r.id !== id))
  }
  const hasActiveFilters = filterRows.some(r => r.filter && r.filterValue.trim()) || dateFrom || dateTo || searchText
  const clearAllFilters = () => { setFilterRows([EMPTY_FILTER()]); setDateFrom(''); setDateTo(''); setSearchText('') }

  // ─── Role management ─────────────────────────────────────────────────────────
  const addRole = async () => {
    if (!newRole.trim()) return
    const res = await fetch('/api/admin/roles', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: newRole.trim() })
    })
    if (res.ok) { setNewRole(''); fetchRoles() }
  }
  const deleteRole = (id: string) => {
    askConfirm('This will permanently delete this role. This action cannot be undone.', async () => {
      await fetch('/api/admin/roles', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id })
      })
      fetchRoles()
    })
  }

  const deleteApplicant = (id: string) => {
    askConfirm('This will permanently delete this applicant and their CV. This action cannot be undone.', async () => {
      await fetch(`/api/admin/applicants/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      setApplicants(prev => prev.filter(a => a.id !== id))
      setSelected(null)
    })
  }

  const updateApplicant = async (id: string, updates: any) => {
    await fetch(`/api/admin/applicants/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates)
    })
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
    if (selected?.id === id) setSelected((s: any) => ({ ...s, ...updates }))
  }

  // ─── Inova CV download ───────────────────────────────────────────────────────
  const downloadInovaCV = (applicant: any) => {
    const a = applicant
    const ed = a.extracted_data || {}
    const ks = a.key_skills || {}
    const logoBase64 = `iVBORw0KGgoAAAANSUhEUgAAAoQAAAGWCAYAAADhQZJCAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAIdUAACHVAQSctJ0AAHb+SURBVHhe7Z0HmCxVmYZrKvTMvYBkRcEVRREj5qyYM4rKYliz7ppRFMU1IwuKAcxxDbsqZgTTIkYUs5gDRkRBDCA53zuz33+qajpVd1V1V5q5bz9PPxemq04`
    const techData = (a.technology_highlights || []).filter((t: any) => t.tech)
    let langDisplay = ''
    if (Array.isArray(ks.languages)) {
      langDisplay = ks.languages.map((l: any) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ''}`).join(', ')
    } else { langDisplay = ks.languages || '' }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>body{font-family:Arial,sans-serif;font-size:12px;margin:40px 50px;color:#222}h1{text-align:center;font-size:20px;margin:8px 0 4px;text-transform:uppercase;letter-spacing:1px}.email{text-align:center;color:#c00;margin-bottom:16px;font-size:13px}.section-title{font-weight:bold;font-size:13px;border-bottom:2px solid #222;padding-bottom:3px;margin:14px 0 6px;text-transform:uppercase;letter-spacing:.5px}table{width:100%;border-collapse:collapse;margin-bottom:10px}td,th{padding:5px 8px;border:1px solid #ccc;font-size:12px;vertical-align:top}th{background:#f0f0f0;font-weight:bold;text-align:left;width:200px}ul{margin:4px 0 4px 20px;padding:0}li{margin-bottom:3px;font-size:12px}pre{white-space:pre-wrap;font-family:Arial;font-size:12px;margin:0;line-height:1.5}.logo{display:block;margin:0 auto 8px;height:55px}</style>
</head><body>
<img class="logo" src="data:image/png;base64,${logoBase64}"/>
<h1>${a.full_name || ''}</h1><div class="email">${a.email || ''}</div>
<div class="section-title">Skills Summary</div>
<table><tr><th>Total Years of Experience</th><td colspan="3">${a.experience_years||0} Years &nbsp; ${a.experience_months||0} Months</td></tr>
${techData.length>0?`<tr><th rowspan="${Math.max(Math.ceil(techData.length/2),1)}">Technology Highlights</th><td>${techData[0]?.tech||''}</td><td style="text-align:center;width:60px">${techData[0]?.years?techData[0].years+'Y':''}</td><td>${techData[1]?.tech||''}</td><td style="text-align:center;width:60px">${techData[1]?.years?techData[1].years+'Y':''}</td></tr>${techData.slice(2).reduce((rows:string,_:any,i:number,arr:any[])=>{if(i%2===0){return rows+`<tr><td>${arr[i]?.tech||''}</td><td style="text-align:center;width:60px">${arr[i]?.years?arr[i].years+'Y':''}</td><td>${arr[i+1]?.tech||''}</td><td style="text-align:center;width:60px">${arr[i+1]?.years?arr[i+1].years+'Y':''}</td></tr>`}return rows},'')}`:
'<tr><th>Technology Highlights</th><td colspan="3"></td></tr>'}
<tr><th>Domain Experience</th><td colspan="3">${a.domain_experience||''}</td></tr></table>
<div class="section-title">Key Skills</div>
<table><tr><th>Languages</th><td>${langDisplay}</td></tr><tr><th>Frameworks</th><td>${ks.frameworks||''}</td></tr><tr><th>Databases</th><td>${ks.databases||''}</td></tr><tr><th>Enterprise</th><td></td></tr><tr><th>Other</th><td>${ks.other||''}</td></tr></table>
<div class="section-title">Professional Qualifications</div>
<table><tr><th>Education</th><td>${ed.degree_level?`${ed.degree_level}${ed.field_of_study?' in '+ed.field_of_study:''}`:''}</td></tr><tr><th>Certifications</th><td>${(ed.certifications||[]).join(', ')}</td></tr><tr><th>Special Achievements</th><td></td></tr></table>
<div class="section-title">Experience</div>
<div style="font-weight:bold;font-size:13px;margin:8px 0 6px;text-transform:uppercase;">Inova IT Systems (Pvt) Ltd</div>
<pre>${a.professional_qualifications||''}</pre></body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `${(a.full_name||'applicant').replace(/ /g,'_')}_Inova_CV.html`; link.click()
  }

  // ─── Export CSV ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Name','Email','Phone','Role','Status','Experience','Location','Skills','Degree','Submitted']
    const rows = filteredApplicants.map(a => {
      const ed = a.extracted_data || {}
      return [a.full_name,a.email,a.phone||'',a.desired_role,a.status,
        `${a.experience_years||0}Y ${a.experience_months||0}M`,
        ed.location||'',(ed.skills||[]).join('; '),ed.degree_level||'',
        new Date(a.submitted_at).toLocaleDateString()]
    })
    const csv = [headers,...rows].map(r=>r.map((v:string)=>`"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href=url; link.download='applicants.csv'; link.click()
  }

  // ─── Login screen ─────────────────────────────────────────────────────────────
  if (!token) return (
    <div style={styles.page}>
      <div style={{ ...styles.card, maxWidth: 380, cursor: 'default', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <h2 style={{ margin: '0 0 6px' }}>Inova IT — Admin</h2>
        <p style={{ color: '#666', margin: '0 0 24px', fontSize: 14 }}>Sign in to access the dashboard</p>
        <form onSubmit={login}>
          <input placeholder="Username" value={loginForm.username} style={styles.input}
            onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))} />
          <div style={{ position: 'relative', marginTop: 10 }}>
            <input placeholder="Password" type={showPassword ? 'text' : 'password'} value={loginForm.password}
              style={{ ...styles.input, width: '100%', boxSizing: 'border-box', paddingRight: 40 }}
              onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} />
            <button type="button" onClick={() => setShowPassword(s => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, color: '#646C72', display: 'flex', alignItems: 'center' }}>
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {loginError && <p style={{ color: '#c00', fontSize: 13, marginTop: 8 }}>{loginError}</p>}
          <button style={{ ...styles.btn, marginTop: 16, width: '100%' }}>Sign In</button>
        </form>
      </div>
    </div>
  )

  // ─── Screened results banner ──────────────────────────────────────────────────
  const screenedJob = screenedResults ? jobOpenings.find(j => j.id === screenedResults.jobId) : null

  // The CV list to show — screened results take priority if active
  const displayApplicants = screenedResults ? screenedResults.applicants : filteredApplicants

  // ─── Main dashboard ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F3F3F3' }}>

      {/* Header */}
      <div style={{ background: '#C41E3A', borderBottom: '1px solid #8B0000', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#fff' }}>Inova IT — Admin</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {activeTab === 'cvs' && (
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
              {displayApplicants.length}{!screenedResults && displayApplicants.length !== applicants.length ? ` / ${applicants.length}` : ''} applicant{applicants.length !== 1 ? 's' : ''}
            </span>
          )}
          <button onClick={() => setShowRoleManager(!showRoleManager)} style={{ ...styles.secondaryBtn, background: showRoleManager ? '#f0f9f6' : 'transparent', color: showRoleManager ? '#0f6e56' : '#fff', borderColor: showRoleManager ? '#0f6e56' : 'rgba(255,255,255,0.5)' }}>Manage Roles</button>
          {activeTab === 'cvs' && <button onClick={exportCSV} style={{ ...styles.secondaryBtn, color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}>Export CSV</button>}
          <button onClick={() => { localStorage.removeItem('admin_token'); setToken(null) }} style={{ ...styles.secondaryBtn, color: '#ffaaaa', borderColor: 'rgba(255,255,255,0.3)' }}>Sign Out</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '2px solid #eee', padding: '0 28px', display: 'flex', gap: 0 }}>
        <button
          onClick={() => { setActiveTab('cvs'); setScreenedResults(null) }}
          style={{ padding: '14px 24px', border: 'none', borderBottom: activeTab === 'cvs' ? '3px solid #C41E3A' : '3px solid transparent', background: 'none', fontSize: 14, fontWeight: 600, color: activeTab === 'cvs' ? '#C41E3A' : '#888', cursor: 'pointer', marginBottom: -2 }}
        >
          CV Dashboard
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          style={{ padding: '14px 24px', border: 'none', borderBottom: activeTab === 'jobs' ? '3px solid #C41E3A' : '3px solid transparent', background: 'none', fontSize: 14, fontWeight: 600, color: activeTab === 'jobs' ? '#C41E3A' : '#888', cursor: 'pointer', marginBottom: -2 }}
        >
          Job Openings {jobOpenings.length > 0 && <span style={{ background: '#C41E3A', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, marginLeft: 5 }}>{jobOpenings.filter(j => j.status === 'Open').length}</span>}
        </button>
      </div>

      {/* Role Manager */}
      {showRoleManager && (
        <div style={{ background: '#f0f9f6', borderBottom: '1px solid #c8e6dc', padding: '16px 28px' }}>
          <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 14, color: '#0f6e56' }}>Manage Job Roles (these appear as checkboxes on the apply form)</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 12 }}>
            {roles.map(r => (
              <span key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: '#fff', border: '1px solid #0f6e56', borderRadius: 20, fontSize: 13 }}>
                {r.title}
                <button onClick={() => deleteRole(r.id)} style={{ border: 'none', background: 'none', color: '#c00', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
              </span>
            ))}
            {roles.length === 0 && <span style={{ fontSize: 13, color: '#888' }}>No roles added yet.</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newRole} onChange={e => setNewRole(e.target.value)}
              placeholder="Add new role (e.g. Senior React Developer)"
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRole())}
              style={{ ...styles.input, flex: 1 }} />
            <button onClick={addRole} style={styles.btn}>Add Role</button>
          </div>
        </div>
      )}

      {/* ══════════════════ CV DASHBOARD TAB ══════════════════ */}
      {activeTab === 'cvs' && (
        <>
          {/* Screened results banner */}
          {screenedResults && screenedJob && (
            <div style={{ background: '#1a3a8f', padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ color: '#fff', fontSize: 14 }}>
                <strong>AI Screening Results</strong> for <em>{screenedJob.title}</em> — {screenedResults.applicants.length} CVs ranked by match score
              </div>
              <button onClick={() => { setScreenedResults(null); setSummary(null) }}
                style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6, color: '#fff', padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>
                Clear Results
              </button>
            </div>
          )}

          {/* Filter Panel — hidden when showing screened results */}
          {!screenedResults && (
            <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 28px' }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, alignItems: 'flex-end', marginBottom: 12 }}>
                <div>
                  <label style={styles.label}>Search anything</label>
                  <input value={searchText} onChange={e => setSearchText(e.target.value)}
                    placeholder="e.g. React, Colombo, MBA..."
                    style={{ ...styles.input, width: 260 }} />
                </div>
                <div>
                  <label style={styles.label}>From date</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>To date</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={styles.input} />
                </div>
                {hasActiveFilters && (
                  <button onClick={clearAllFilters} style={{ ...styles.secondaryBtn, alignSelf: 'flex-end', color: '#c00', borderColor: '#fcc' }}>
                    Clear all filters
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {filterRows.map((row, idx) => (
                  <FilterRibbon key={row.id} row={row} index={idx} totalRows={filterRows.length} roles={roles}
                    onChange={updates => updateFilterRow(row.id, updates)} onRemove={() => removeFilterRow(row.id)} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
                <button onClick={addFilterRow}
                  style={{ padding: '7px 16px', background: '#fdecef', border: '1.5px dashed #C41E3A', borderRadius: 8, fontSize: 13, color: '#C41E3A', cursor: 'pointer', fontWeight: 500 }}>
                  + Add another filter
                </button>
                {filteredApplicants.length > 0 && (
                  <button onClick={runAiRanking} disabled={aiRanking}
                    style={{ padding: '7px 16px', background: aiRanking ? '#eee' : '#C41E3A', border: 'none', borderRadius: 8, fontSize: 13, color: aiRanking ? '#999' : '#fff', cursor: aiRanking ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                    {aiRanking ? 'AI is ranking...' : 'AI Rank Results'}
                  </button>
                )}
                {filteredApplicants.length > 0 && (
                  <span style={{ fontSize: 12, color: '#888' }}>
                    {filteredApplicants.length} match{filteredApplicants.length !== 1 ? 'es' : ''}
                    {filteredApplicants.length !== applicants.length && ` (of ${applicants.length} total)`}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Cards */}
          <div style={{ padding: '24px 28px' }}>
            {screenedResults && (
              <div style={{ marginBottom: 18 }}>
                {!summary ? (
                  <button onClick={createSummary}
                    style={{ padding: '9px 18px', background: '#C41E3A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    Create Summary
                  </button>
                ) : (
                  <CvSummaryTable applicants={summary} jobTitle={screenedJob?.title || ''} onClose={() => setSummary(null)} onSave={saveSummaryToJob} />
                )}
              </div>
            )}
            {loading ? (
              <p style={{ color: '#2C3740', textAlign: 'center' as const, marginTop: 60 }}>Loading applicants…</p>
            ) : displayApplicants.length === 0 ? (
              <p style={{ color: '#2C3740', textAlign: 'center' as const, marginTop: 60 }}>
                {applicants.length === 0 ? 'No applicants yet.' : 'No applicants match the current filters.'}
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {displayApplicants.map((a, idx) => (
                  <ApplicantCard key={a.id} applicant={a} rank={idx + 1}
                    showScore={!!screenedResults}
                    onSelect={setSelected} onUpdate={updateApplicant} onDelete={deleteApplicant} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════ JOB OPENINGS TAB ══════════════════ */}
      {activeTab === 'jobs' && (
        <div style={{ padding: '24px 28px' }}>

          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: '#1A232C' }}>Job Openings</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#646C72' }}>Manage open positions and screen CVs with AI</p>
            </div>
            <button onClick={() => { setShowJobForm(true); setSelectedJob(null) }} style={styles.btn}>
              + New Job Opening
            </button>
          </div>

          {/* Job openings grid */}
          {jobsLoading ? (
            <p style={{ color: '#888', textAlign: 'center' as const, marginTop: 40 }}>Loading…</p>
          ) : jobOpenings.length === 0 ? (
            <div style={{ textAlign: 'center' as const, marginTop: 60, color: '#888' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <p style={{ fontSize: 15 }}>No job openings yet.</p>
              <p style={{ fontSize: 13 }}>Click "New Job Opening" to add one.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {jobOpenings.map(job => (
                <JobCard key={job.id} job={job}
                  isScreening={screeningJob === job.id}
                  onSelect={() => setSelectedJob(job)}
                  onDelete={() => deleteJob(job.id)}
                  onToggleStatus={() => toggleJobStatus(job)}
                  onScreen={(topN) => screenCVsForJob(job.id, topN)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Applicant Detail Modal ── */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24 }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <ApplicantDetail applicant={selected} onClose={() => setSelected(null)} onUpdate={updateApplicant} onDelete={deleteApplicant} onDownloadInova={downloadInovaCV} />
        </div>
      )}

      {/* ── Job Opening Detail Modal ── */}
      {selectedJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24 }}
          onClick={e => e.target === e.currentTarget && setSelectedJob(null)}>
          <JobDetail
            job={selectedJob}
            isScreening={screeningJob === selectedJob.id}
            totalApplicants={applicants.length}
            askConfirm={askConfirm}
            onClose={() => setSelectedJob(null)}
            onDelete={() => { deleteJob(selectedJob.id) }}
            onToggleStatus={() => toggleJobStatus(selectedJob)}
            onScreen={(topN) => screenCVsForJob(selectedJob.id, topN)}
          />
        </div>
      )}

      {/* ── New Job Form Modal ── */}
      {showJobForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24 }}
          onClick={e => e.target === e.currentTarget && setShowJobForm(false)}>
          <JobForm form={jobForm} onChange={setJobForm} onSave={saveJob} onCancel={() => { setShowJobForm(false); setJobForm(EMPTY_JOB()) }} saving={jobSaving} />
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onYes={() => { confirmDialog.onYes(); setConfirmDialog(null) }}
          onNo={() => setConfirmDialog(null)}
        />
      )}
    </div>
  )
}

// ─── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ job, isScreening, onSelect, onDelete, onToggleStatus, onScreen }: {
  job: JobOpening
  isScreening: boolean
  onSelect: () => void
  onDelete: () => void
  onToggleStatus: () => void
  onScreen: (topN: number) => void
}) {
  const [showTopN, setShowTopN] = useState(false)
  return (
    <div style={{ ...styles.card, cursor: 'default', position: 'relative' as const }}>
      {/* Status badge */}
      <div style={{ position: 'absolute' as const, top: 14, right: 14 }}>
        <span style={{ background: job.status === 'Open' ? '#d1fae5' : '#f3f4f6', color: job.status === 'Open' ? '#065f46' : '#6b7280', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>
          {job.status}
        </span>
      </div>

      <div style={{ paddingRight: 60, marginBottom: 10, cursor: 'pointer' }} onClick={onSelect}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>{job.title}</div>
        {job.department && <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{job.department}</div>}
      </div>

      <div style={{ fontSize: 13, color: '#555', marginBottom: 10, cursor: 'pointer' }} onClick={onSelect}>
        {job.employment_type && <div>💼 {job.employment_type}</div>}
        {job.location && <div>📍 {job.location}</div>}
        {job.min_experience_years > 0 && <div>⏱ {job.min_experience_years}+ years experience</div>}
        {job.degree_required && <div>🎓 {job.degree_required}</div>}
      </div>

      {job.tech_stack?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 10, cursor: 'pointer' }} onClick={onSelect}>
          {job.tech_stack.slice(0, 4).map(t => (
            <span key={t} style={{ background: '#e8f0ff', borderRadius: 4, padding: '2px 7px', fontSize: 11, color: '#1a3a8f' }}>{t}</span>
          ))}
          {job.tech_stack.length > 4 && <span style={{ fontSize: 11, color: '#999' }}>+{job.tech_stack.length - 4}</span>}
        </div>
      )}

      <div style={{ fontSize: 12, color: '#bbb', marginBottom: 12 }}>{new Date(job.created_at).toLocaleDateString()}</div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 2, position: 'relative' as const }}>
          {!showTopN ? (
            <button onClick={() => setShowTopN(true)} disabled={isScreening}
              style={{ width: '100%', padding: '7px', background: isScreening ? '#eee' : '#C41E3A', border: 'none', borderRadius: 6, fontSize: 12, color: isScreening ? '#999' : '#fff', cursor: isScreening ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
              {isScreening ? 'Screening...' : 'Screen CVs'}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap' as const }}>Top:</span>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' as const }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} onClick={() => { setShowTopN(false); onScreen(n) }}
                    style={{ padding: '4px 7px', background: '#C41E3A', border: 'none', borderRadius: 5, fontSize: 12, color: '#fff', cursor: 'pointer', fontWeight: 600, minWidth: 26 }}>
                    {n}
                  </button>
                ))}
                <button onClick={() => setShowTopN(false)}
                  style={{ padding: '4px 6px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 5, fontSize: 11, color: '#888', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
        <button onClick={onToggleStatus}
          style={{ flex: 1, padding: '7px', background: '#f9fafb', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, color: '#555', cursor: 'pointer' }}>
          {job.status === 'Open' ? 'Close' : 'Reopen'}
        </button>
        <button onClick={onDelete}
          style={{ padding: '7px 10px', background: '#fff0f0', border: '1px solid #fcc', borderRadius: 6, fontSize: 12, color: '#c00', cursor: 'pointer' }}>
          🗑
        </button>
      </div>
    </div>
  )
}

// ─── Job Detail Modal ──────────────────────────────────────────────────────────
function JobDetail({ job, isScreening, totalApplicants, askConfirm, onClose, onDelete, onToggleStatus, onScreen }: {
  job: JobOpening
  isScreening: boolean
  totalApplicants: number
  askConfirm: (message: string, onYes: () => void) => void
  onClose: () => void
  onDelete: () => void
  onToggleStatus: () => void
  onScreen: (topN: number) => void
}) {
  const [savedSummaries, setSavedSummaries] = useState<any[]>([])
  const [loadingSummaries, setLoadingSummaries] = useState(true)
  useEffect(() => {
    const tok = localStorage.getItem('admin_token')
    fetch(`/api/admin/cv-summaries?job_id=${job.id}`, { headers: { Authorization: `Bearer ${tok}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => setSavedSummaries(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoadingSummaries(false))
  }, [job.id])
  const deleteSavedSummary = (id: string) => {
    askConfirm('This will permanently delete this saved CV summary. This action cannot be undone.', async () => {
      const tok = localStorage.getItem('admin_token')
      await fetch('/api/admin/cv-summaries', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ id }) })
      setSavedSummaries(s => s.filter(x => x.id !== id))
    })
  }
  return (
    <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 1100, maxHeight: '90vh', overflowY: 'auto' as const, padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ flex: 1, paddingRight: 16 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>{job.title}</h2>
          {job.department && <div style={{ color: '#666', fontSize: 14, marginTop: 3 }}>{job.department}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ background: job.status === 'Open' ? '#d1fae5' : '#f3f4f6', color: job.status === 'Open' ? '#065f46' : '#6b7280', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
            {job.status}
          </span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#999' }}>×</button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#bbb', marginBottom: 20 }}>Created {new Date(job.created_at).toLocaleDateString()}</div>

      {/* Key details row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const, marginBottom: 20, padding: '12px 16px', background: '#f8f9fa', borderRadius: 10 }}>
        {job.employment_type && <div style={{ fontSize: 13 }}><span style={{ color: '#888' }}>Type: </span>{job.employment_type}</div>}
        {job.location && <div style={{ fontSize: 13 }}><span style={{ color: '#888' }}>Location: </span>{job.location}</div>}
        {job.min_experience_years > 0 && <div style={{ fontSize: 13 }}><span style={{ color: '#888' }}>Min Exp: </span>{job.min_experience_years}+ yrs</div>}
        {job.degree_required && <div style={{ fontSize: 13 }}><span style={{ color: '#888' }}>Degree: </span>{job.degree_required}</div>}
      </div>

      {job.tech_stack?.length > 0 && (
        <Section title="Required Tech Stack">
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {job.tech_stack.map(t => <span key={t} style={{ background: '#e8f0ff', borderRadius: 6, padding: '4px 11px', fontSize: 13, color: '#1a3a8f' }}>{t}</span>)}
          </div>
        </Section>
      )}

      {job.required_methodologies?.length > 0 && (
        <Section title="Methodologies">
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {job.required_methodologies.map(m => <span key={m} style={{ background: '#f0fdf4', borderRadius: 6, padding: '4px 11px', fontSize: 13, color: '#065f46' }}>{m}</span>)}
          </div>
        </Section>
      )}

      {job.job_description && (
        <Section title="Job Description">
          <p style={{ fontSize: 14, color: '#333', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{job.job_description}</p>
        </Section>
      )}

      {job.responsibilities && (
        <Section title="Responsibilities">
          <p style={{ fontSize: 14, color: '#333', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{job.responsibilities}</p>
        </Section>
      )}

      {job.nice_to_have && (
        <Section title="Nice to Have">
          <p style={{ fontSize: 14, color: '#333', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{job.nice_to_have}</p>
        </Section>
      )}

      {job.notes && (
        <Section title="Notes (Internal)">
          <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6, margin: 0, background: '#fffbe6', borderRadius: 8, padding: '10px 12px', whiteSpace: 'pre-wrap' }}>{job.notes}</p>
        </Section>
      )}

      {/* Saved CV Summaries */}
      {!loadingSummaries && savedSummaries.length > 0 && (
        <div style={{ marginTop: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#999', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 10 }}>Saved CV Summaries ({savedSummaries.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
            {savedSummaries.map(s => (
              <CvSummaryTable key={s.id}
                applicants={s.summary_data?.applicants || []}
                jobTitle={''}
                subtitle={`Saved ${new Date(s.created_at).toLocaleString()}`}
                initialHighlights={s.summary_data?.highlights || {}}
                initialNote={s.summary_data?.note || ''}
                initialSelected={s.summary_data?.selected || {}}
                readOnly
                onDelete={() => deleteSavedSummary(s.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' as const }}>
        <select
          disabled={isScreening}
          defaultValue=""
          onChange={e => { if (e.target.value) { onScreen(parseInt(e.target.value)); (e.target as HTMLSelectElement).value = '' } }}
          style={{ flex: 1, minWidth: 160, padding: '11px 14px', background: isScreening ? '#eee' : '#1a3a8f', border: 'none', borderRadius: 8, fontSize: 14, color: isScreening ? '#999' : '#fff', cursor: isScreening ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
          <option value="" disabled>{isScreening ? 'Screening CVs...' : `Screen CVs — pick top N`}</option>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <option key={n} value={n} style={{ background: '#fff', color: '#111' }}>Show top {n}</option>
          ))}
        </select>
        <button onClick={onToggleStatus}
          style={{ padding: '11px 20px', background: '#f9fafb', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, color: '#555', cursor: 'pointer' }}>
          {job.status === 'Open' ? 'Close Job' : 'Reopen Job'}
        </button>
        <button onClick={onDelete}
          style={{ padding: '11px 20px', background: '#fff0f0', color: '#c00', border: '1px solid #fcc', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
          Delete
        </button>
      </div>
    </div>
  )
}

// ─── New Job Form Modal ────────────────────────────────────────────────────────
function JobForm({ form, onChange, onSave, onCancel, saving }: {
  form: Omit<JobOpening, 'id' | 'created_at'>
  onChange: (f: any) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  const set = (key: string, val: any) => onChange({ ...form, [key]: val })

  return (
    <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto' as const, padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>New Job Opening</h2>
        <button onClick={onCancel} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#999' }}>×</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={styles.label}>Job Title *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="e.g. Senior React Developer" style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const }} />
        </div>
        <div>
          <label style={styles.label}>Department</label>
          <input value={form.department} onChange={e => set('department', e.target.value)}
            placeholder="e.g. Engineering" style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const }} />
        </div>
        <div>
          <label style={styles.label}>Employment Type</label>
          <select value={form.employment_type} onChange={e => set('employment_type', e.target.value)} style={{ ...styles.select, width: '100%' }}>
            <option>Full-time</option>
            <option>Part-time</option>
            <option>Contract</option>
            <option>Internship</option>
          </select>
        </div>
        <div>
          <label style={styles.label}>Location</label>
          <input value={form.location} onChange={e => set('location', e.target.value)}
            placeholder="e.g. Colombo / Remote" style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const }} />
        </div>
        <div>
          <label style={styles.label}>Min. Years of Experience</label>
          <input type="number" min={0} value={form.min_experience_years} onChange={e => set('min_experience_years', parseInt(e.target.value) || 0)}
            style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const }} />
        </div>
        <div>
          <label style={styles.label}>Degree Required</label>
          <select value={form.degree_required} onChange={e => set('degree_required', e.target.value)} style={{ ...styles.select, width: '100%' }}>
            <option value="">None / Any</option>
            <option>Bachelor</option>
            <option>Master</option>
            <option>PhD</option>
            <option>Diploma</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={styles.label}>Required Tech Stack</label>
        <TagInput values={form.tech_stack} onChange={v => set('tech_stack', v)} placeholder="Type a technology and press +" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={styles.label}>Required Methodologies</label>
        <TagInput values={form.required_methodologies} onChange={v => set('required_methodologies', v)} placeholder="e.g. Agile, Scrum, Kanban" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={styles.label}>Job Description</label>
        <textarea value={form.job_description} onChange={e => set('job_description', e.target.value)}
          placeholder="Describe the role, its context, and what success looks like..."
          style={{ ...styles.input, width: '100%', minHeight: 90, resize: 'vertical' as const, boxSizing: 'border-box' as const }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={styles.label}>Responsibilities</label>
        <textarea value={form.responsibilities} onChange={e => set('responsibilities', e.target.value)}
          placeholder="List the main responsibilities..."
          style={{ ...styles.input, width: '100%', minHeight: 80, resize: 'vertical' as const, boxSizing: 'border-box' as const }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={styles.label}>Nice to Have (optional skills / bonus points)</label>
        <textarea value={form.nice_to_have} onChange={e => set('nice_to_have', e.target.value)}
          placeholder="e.g. Experience with AWS, knowledge of Sinhala..."
          style={{ ...styles.input, width: '100%', minHeight: 60, resize: 'vertical' as const, boxSizing: 'border-box' as const }} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={styles.label}>Notes (internal only)</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Internal notes, hiring manager comments, budget range, etc."
          style={{ ...styles.input, width: '100%', minHeight: 60, resize: 'vertical' as const, boxSizing: 'border-box' as const }} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onSave} disabled={saving}
          style={{ ...styles.btn, flex: 1, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Save Job Opening'}
        </button>
        <button onClick={onCancel}
          style={{ ...styles.secondaryBtn, padding: '10px 20px' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Filter Ribbon Component ───────────────────────────────────────────────────
function FilterRibbon({ row, index, totalRows, roles, onChange, onRemove }: {
  row: FilterRow; index: number; totalRows: number; roles: {id: string, title: string}[]
  onChange: (updates: Partial<FilterRow>) => void; onRemove: () => void
}) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'flex-end', padding: '10px 14px', background: index % 2 === 0 ? '#fafafa' : '#f4f4f4', borderRadius: 8, border: '1px solid #eee', position: 'relative' as const }}>
      <div>
        <label style={styles.label}>Filter by</label>
        <select value={row.filter} onChange={e => onChange({ filter: e.target.value, filterValue: '', languageType: '' })} style={styles.select}>
          <option value="">All applicants</option>
          {FILTER_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      {row.filter === 'language_level' && (
        <div>
          <label style={styles.label}>Language type</label>
          <input value={row.languageType} onChange={e => onChange({ languageType: e.target.value })}
            placeholder="e.g. French, Sinhala..." style={{ ...styles.input, width: 160 }} />
        </div>
      )}
      {row.filter && (
        <div>
          <label style={styles.label}>Search value</label>
          {row.filter === 'status' ? (
            <select value={row.filterValue} onChange={e => onChange({ filterValue: e.target.value })} style={styles.select}>
              <option value="">Any</option>
              {['New','Shortlisted','Interviewed','Rejected'].map(s => <option key={s}>{s}</option>)}
            </select>
          ) : row.filter === 'degree_level' ? (
            <select value={row.filterValue} onChange={e => onChange({ filterValue: e.target.value })} style={styles.select}>
              <option value="">Any</option>
              {['Bachelor','Master','PhD','Diploma','None'].map(s => <option key={s}>{s}</option>)}
            </select>
          ) : row.filter === 'language_level' ? (
            <select value={row.filterValue} onChange={e => onChange({ filterValue: e.target.value })} style={styles.select}>
              <option value="">Any level</option>
              <option value="Basic">Basic (A1/A2)</option>
              <option value="Conversational">Conversational (B1/B2)</option>
              <option value="Fluent">Fluent (C1)</option>
              <option value="Native">Native (C2)</option>
            </select>
          ) : row.filter === 'desired_role' ? (
            <select value={row.filterValue} onChange={e => onChange({ filterValue: e.target.value })} style={styles.select}>
              <option value="">Any role</option>
              {roles.map(r => <option key={r.id} value={r.title}>{r.title}</option>)}
            </select>
          ) : (
            <input value={row.filterValue} onChange={e => onChange({ filterValue: e.target.value })}
              placeholder={row.filter === 'years_experience' ? 'e.g. 3' : 'Type to filter...'} style={styles.input} />
          )}
        </div>
      )}
      {(totalRows > 1 || row.filter || row.filterValue) && (
        <button onClick={onRemove} title="Remove this filter"
          style={{ alignSelf: 'flex-end', padding: '8px 10px', background: '#fff0f0', border: '1px solid #fcc', borderRadius: 6, fontSize: 13, color: '#c00', cursor: 'pointer', lineHeight: 1 }}>
          ✕
        </button>
      )}
    </div>
  )
}

// ─── CV Summary Table ───────────────────────────────────────────────────────────
function CvSummaryTable({ applicants, jobTitle, subtitle, onClose, onSave, onDelete, initialHighlights, initialNote, initialSelected, readOnly }: {
  applicants: any[]
  jobTitle: string
  subtitle?: string
  onClose?: () => void
  onSave?: (data: { highlights: Record<string, string>, note: string, selected: Record<string, boolean> }) => Promise<void> | void
  onDelete?: () => void
  initialHighlights?: Record<string, string>
  initialNote?: string
  initialSelected?: Record<string, boolean>
  readOnly?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [highlights, setHighlights] = useState<Record<string, string>>(initialHighlights || {})
  const [note, setNote] = useState(initialNote || '')
  const [selected, setSelected] = useState<Record<string, boolean>>(initialSelected || {})
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const HILITE_CYCLE = ['', '#fff3cd', '#d1fae5', '#fde2e4'] // none, yellow, green, pink
  const cycleHighlight = (rowKey: string, col: number) => {
    if (!editing || readOnly) return
    const k = `${rowKey}_${col}`
    const cur = highlights[k] || ''
    const next = HILITE_CYCLE[(HILITE_CYCLE.indexOf(cur) + 1) % HILITE_CYCLE.length]
    setHighlights(h => { const n = { ...h }; if (next) n[k] = next; else delete n[k]; return n })
  }
  const toggleSelected = (i: number) => {
    if (readOnly) return
    const k = String(i)
    setSelected(s => ({ ...s, [k]: !s[k] }))
  }

  const exportExcel = () => {
    const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const headCells = SUMMARY_ROWS.map(row => `<th style="border:1px solid #999;padding:8px 14px;background:#C41E3A;color:#fff;font-weight:bold;">${row.label}</th>`).join('')
    const bodyRows = applicants.map((a, i) => {
      const detailCells = SUMMARY_ROWS.map(row => {
        const bg = highlights[`${row.key}_${i}`] || '#ffffff'
        return `<td style="border:1px solid #999;padding:8px 14px;background:${bg};">${esc(a[row.key] || '')}</td>`
      }).join('')
      const tick = `<td style="border:1px solid #999;padding:8px 14px;text-align:center;font-size:15pt;color:#111;">${selected[String(i)] ? '\u2713' : ''}</td>`
      return `<tr><td style="border:1px solid #999;padding:8px 14px;background:#f0f0f0;font-weight:bold;">Applicant ${i + 1}</td>${detailCells}${tick}</tr>`
    }).join('')
    const totalCols = SUMMARY_ROWS.length + 2
    const noteRow = note ? `<tr><td colspan="${totalCols}" style="border:1px solid #999;padding:8px 14px;background:#fffbe6;">Note: ${esc(note)}</td></tr>` : ''
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/></head><body><table style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:12pt;"><tr><th style="border:1px solid #999;padding:8px 14px;background:#C41E3A;color:#fff;font-weight:bold;text-align:left;">Applicant</th>${headCells}<th style="border:1px solid #999;padding:8px 14px;background:#C41E3A;color:#fff;font-weight:bold;">Selected</th></tr>${bodyRows}${noteRow}</table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `CV_Summary${jobTitle ? '_' + jobTitle.replace(/[^a-z0-9]+/gi, '_') : ''}.xls`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleSave = async () => {
    if (!onSave) return
    setSaving(true)
    await onSave({ highlights, note, selected })
    setSaving(false)
    setEditing(false)
    setSavedMsg('Saved to this job opening')
    setTimeout(() => setSavedMsg(''), 3000)
  }

  const thStyle: React.CSSProperties = { border: '1px solid #d1d5db', padding: '8px 12px', background: '#C41E3A', color: '#fff', fontWeight: 600, fontSize: 13, textAlign: 'center' }
  const tdStyle: React.CSSProperties = { border: '1px solid #d1d5db', padding: '8px 12px', color: '#1A232C', verticalAlign: 'top', fontSize: 13 }
  const btnOutline: React.CSSProperties = { padding: '8px 18px', background: '#fff', border: '1.5px solid #C41E3A', borderRadius: 8, color: '#C41E3A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
  const btnSolid: React.CSSProperties = { padding: '8px 18px', background: '#C41E3A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
  const btnDanger: React.CSSProperties = { padding: '8px 18px', background: '#fff0f0', border: '1px solid #fcc', borderRadius: 8, color: '#c00', fontSize: 13, fontWeight: 600, cursor: 'pointer' }

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1A232C' }}>CV Summary{jobTitle ? ` — ${jobTitle}` : ''}</div>
          {subtitle && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {onClose && <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#999', lineHeight: 1 }}>×</button>}
      </div>

      {editing && !readOnly && <div style={{ fontSize: 12, color: '#646C72', marginBottom: 8 }}>Click any detail cell to cycle its highlight colour (none → yellow → green → pink). Tick the Selected box to mark a candidate.</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left' }}>Applicant</th>
              {SUMMARY_ROWS.map(row => <th key={row.key} style={thStyle}>{row.label}</th>)}
              <th style={thStyle}>Selected</th>
            </tr>
          </thead>
          <tbody>
            {applicants.map((a, i) => (
              <tr key={i}>
                <td style={{ ...tdStyle, fontWeight: 600, background: '#f8f9fa', whiteSpace: 'nowrap' }}>Applicant {i + 1}</td>
                {SUMMARY_ROWS.map(row => {
                  const k = `${row.key}_${i}`
                  return (
                    <td key={row.key} onClick={() => cycleHighlight(row.key, i)}
                      style={{ ...tdStyle, background: highlights[k] || '#fff', cursor: editing && !readOnly ? 'pointer' : 'default' }}>
                      {a[row.key] || '—'}
                    </td>
                  )
                })}
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <div onClick={() => toggleSelected(i)}
                    style={{ width: 24, height: 24, margin: '0 auto', border: '1.5px solid #888', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: readOnly ? 'default' : 'pointer', background: '#fff' }}>
                    {selected[String(i)] && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && !readOnly ? (
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#646C72', marginBottom: 4 }}>Note (optional)</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a short note…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 11px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, outline: 'none' }} />
        </div>
      ) : note ? (
        <div style={{ marginTop: 12, fontSize: 13, color: '#555', background: '#fffbe6', borderRadius: 8, padding: '8px 12px' }}>Note: {note}</div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' as const }}>
        {!readOnly && <button onClick={() => setEditing(e => !e)} style={btnOutline}>{editing ? 'Done editing' : 'Edit'}</button>}
        <button onClick={exportExcel} style={btnOutline}>Export</button>
        {onSave && <button onClick={handleSave} disabled={saving} style={btnSolid}>{saving ? 'Saving…' : 'Save'}</button>}
        {onDelete && <button onClick={onDelete} style={btnDanger}>Delete</button>}
        {savedMsg && <span style={{ fontSize: 13, color: '#0f6e56', fontWeight: 600 }}>{savedMsg}</span>}
      </div>
    </div>
  )
}

function ApplicantCard({ applicant: a, rank, showScore, onSelect, onUpdate, onDelete }: any) {
  const ed = a.extracted_data || {}
  const ks = a.key_skills || {}
  const langDisplay = Array.isArray(ks.languages)
    ? ks.languages.slice(0, 2).map((l: any) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ''}`).join(', ')
    : ''

  return (
    <div style={{ ...styles.glassCard, position: 'relative' as const, height: 430, display: 'flex', flexDirection: 'column' as const }} onClick={() => onSelect(a)}>
      {/* Rank or Match Score badge */}
      <div style={{ position: 'absolute' as const, top: 10, right: 10 }}>
        {showScore && a.match_score != null ? (
          <span style={{
            background: a.match_score >= 70 ? '#d1fae5' : a.match_score >= 40 ? '#fef9c3' : '#fee2e2',
            color: a.match_score >= 70 ? '#065f46' : a.match_score >= 40 ? '#854d0e' : '#991b1b',
            borderRadius: 20, fontSize: 12, fontWeight: 700, padding: '3px 10px'
          }}>
            {a.match_score}% match
          </span>
        ) : (
          <span style={{ background: '#f0f0f0', borderRadius: 20, fontSize: 11, color: '#888', padding: '2px 8px', fontWeight: 600 }}>
            #{rank}
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'hidden' as const, minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, paddingRight: 80 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{a.full_name}</div>
          <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{a.desired_role}</div>
        </div>
        <span style={{ background: STATUS_COLORS[a.status] + '18', color: STATUS_COLORS[a.status], fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, flexShrink: 0 }}>{a.status}</span>
      </div>
      <div style={{ fontSize: 13, color: '#444', marginBottom: 8 }}>
        <div>📧 {a.email}</div>
        {ed.location && <div>📍 {ed.location}</div>}
        {(a.experience_years != null || a.experience_months != null) && <div>⏱ {a.experience_years || 0}Y {a.experience_months || 0}M experience</div>}
        {ed.degree_level && <div>🎓 {ed.degree_level}{ed.field_of_study ? ` · ${ed.field_of_study}` : ''}</div>}
        {langDisplay && <div>🌐 {langDisplay}</div>}
      </div>
      {(a.is_internship || a.work_preference || a.internal_staff_note) && (
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 6 }}>
          {a.is_internship && <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>Internship</span>}
          {a.work_preference && <span style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>{a.work_preference}</span>}
          {a.internal_staff_note && <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>Internal Staff</span>}
        </div>
      )}
      {a.selected_roles?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 6 }}>
          {a.selected_roles.slice(0, 2).map((r: string) => (
            <span key={r} style={{ background: '#e8f5f1', borderRadius: 4, padding: '2px 7px', fontSize: 11, color: '#0f6e56' }}>{r}</span>
          ))}
        </div>
      )}
      {ed.skills?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
          {ed.skills.slice(0, 4).map((s: string) => (
            <span key={s} style={{ background: '#f0f0f0', borderRadius: 4, padding: '2px 7px', fontSize: 11, color: '#444' }}>{s}</span>
          ))}
          {ed.skills.length > 4 && <span style={{ fontSize: 11, color: '#999' }}>+{ed.skills.length - 4} more</span>}
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 12, color: '#888' }}>
        {new Date(a.submitted_at).toLocaleDateString()}
        {a.updated_at && <span> · Updated {new Date(a.updated_at).toLocaleDateString()}</span>}
      </div>
      {a.referral_source && <div style={{ marginTop: 6, fontSize: 12, color: '#888', background: '#fffbe6', borderRadius: 5, padding: '4px 8px' }}>👥 Via {a.referral_source}{a.referral_name ? ` (${a.referral_name})` : ''}</div>}
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
        <button onClick={() => onDelete(a.id)} style={{ flex: 1, padding: '5px', background: '#fff0f0', border: '1px solid #fcc', borderRadius: 6, fontSize: 12, color: '#c00', cursor: 'pointer' }}>🗑 Delete</button>
      </div>
    </div>
  )
}

// ─── Applicant Detail Modal ────────────────────────────────────────────────────
function ApplicantEditForm({ a, onUpdate, onClose }: any) {
  const ks = a.key_skills || {}
  const [f, setF] = useState({
    full_name: a.full_name || '', email: a.email || '', phone: a.phone || '',
    linkedin_url: a.linkedin_url || '', portfolio_url: a.portfolio_url || '',
    roles: (a.selected_roles?.length ? a.selected_roles.join(', ') : a.desired_role) || '',
    experience_years: a.experience_years ?? '', experience_months: a.experience_months ?? '',
    domain_experience: a.domain_experience || '', expected_salary: a.expected_salary || '',
    notice_period: a.notice_period || '', work_preference: a.work_preference || '',
    open_to_outsourcing: a.open_to_outsourcing || '', is_internship: a.is_internship ? 'Yes' : 'No',
    internal_staff_note: a.internal_staff_note || '', professional_qualifications: a.professional_qualifications || '',
    frameworks: ks.frameworks || '', databases: ks.databases || '', other: ks.other || '',
  })
  const [languages, setLanguages] = useState<any[]>(Array.isArray(ks.languages) ? ks.languages.map((l: any) => ({ language: l.language || '', proficiency: l.proficiency || '' })) : [])
  const [techHi, setTechHi] = useState<any[]>(Array.isArray(a.technology_highlights) ? a.technology_highlights.map((t: any) => ({ tech: t.tech || '', years: t.years || '' })) : [])
  const [techStack, setTechStack] = useState<any[]>(Array.isArray(a.tech_stack) ? a.tech_stack.map((t: any) => ({ tech: t.tech || '', years: t.years || '' })) : [])
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setF(prev => ({ ...prev, [k]: v }))

  const save = async () => {
    setSaving(true)
    const rolesArr = f.roles.split(',').map((s: string) => s.trim()).filter(Boolean)
    await onUpdate(a.id, {
      full_name: f.full_name, email: f.email, phone: f.phone || null,
      linkedin_url: f.linkedin_url || null, portfolio_url: f.portfolio_url || null,
      selected_roles: rolesArr, desired_role: rolesArr.join(', '),
      experience_years: f.experience_years === '' ? null : parseInt(f.experience_years),
      experience_months: f.experience_months === '' ? null : parseInt(f.experience_months),
      domain_experience: f.domain_experience || null, expected_salary: f.expected_salary || null,
      notice_period: f.notice_period || null, work_preference: f.work_preference || null,
      open_to_outsourcing: f.open_to_outsourcing || null, is_internship: f.is_internship === 'Yes',
      internal_staff_note: f.internal_staff_note || null, professional_qualifications: f.professional_qualifications || null,
      key_skills: { languages: languages.filter(l => l.language.trim()), frameworks: f.frameworks, databases: f.databases, other: f.other },
      technology_highlights: techHi.filter(t => t.tech.trim()),
      tech_stack: techStack.filter(t => t.tech.trim()),
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    onClose()
  }

  const inp = { ...styles.input, width: '100%', boxSizing: 'border-box' as const }
  const sel = { ...styles.select, width: '100%', boxSizing: 'border-box' as const }
  const rowList = (list: any[], setList: any, ka: string, kb: string, pa: string, pb: string) => (
    <div>
      {list.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <input placeholder={pa} value={row[ka]} onChange={e => setList(list.map((x: any, j: number) => j === i ? { ...x, [ka]: e.target.value } : x))} style={{ ...styles.input, flex: 2 }} />
          <input placeholder={pb} value={row[kb]} onChange={e => setList(list.map((x: any, j: number) => j === i ? { ...x, [kb]: e.target.value } : x))} style={{ ...styles.input, flex: 1 }} />
          <button type="button" onClick={() => setList(list.filter((_: any, j: number) => j !== i))} style={{ padding: '6px 10px', background: '#fff0f0', border: '1px solid #fcc', borderRadius: 8, color: '#c00', cursor: 'pointer' }}>×</button>
        </div>
      ))}
      <button type="button" onClick={() => setList([...list, { [ka]: '', [kb]: '' }])} style={{ padding: '5px 12px', background: '#0f6e56', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>+ Add</button>
    </div>
  )

  return (
    <div style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: 16, marginBottom: 20, background: '#fafafa' }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Edit Applicant Details</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div><label style={styles.label}>Full Name</label><input value={f.full_name} onChange={e => set('full_name', e.target.value)} style={inp} /></div>
        <div><label style={styles.label}>Email</label><input value={f.email} onChange={e => set('email', e.target.value)} style={inp} /></div>
        <div><label style={styles.label}>Phone</label><input value={f.phone} onChange={e => set('phone', e.target.value)} style={inp} /></div>
        <div><label style={styles.label}>LinkedIn URL</label><input value={f.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} style={inp} /></div>
        <div><label style={styles.label}>Portfolio URL</label><input value={f.portfolio_url} onChange={e => set('portfolio_url', e.target.value)} style={inp} /></div>
        <div><label style={styles.label}>Role(s) (comma-separated)</label><input value={f.roles} onChange={e => set('roles', e.target.value)} style={inp} /></div>
        <div><label style={styles.label}>Experience (Years)</label><input type="number" min="0" value={f.experience_years} onChange={e => set('experience_years', e.target.value)} style={inp} /></div>
        <div><label style={styles.label}>Experience (Months)</label><input type="number" min="0" max="11" value={f.experience_months} onChange={e => set('experience_months', e.target.value)} style={inp} /></div>
        <div><label style={styles.label}>Domain Experience</label><input value={f.domain_experience} onChange={e => set('domain_experience', e.target.value)} style={inp} /></div>
        <div><label style={styles.label}>Desired Compensation</label><input value={f.expected_salary} onChange={e => set('expected_salary', e.target.value)} style={inp} /></div>
        <div><label style={styles.label}>Notice Period</label><select value={f.notice_period} onChange={e => set('notice_period', e.target.value)} style={sel}><option value="">Select...</option><option value="Immediate">Immediate</option><option value="1 Week">1 Week</option><option value="2 Weeks">2 Weeks</option><option value="1 Month">1 Month</option><option value="2+ Months">2+ Months</option></select></div>
        <div><label style={styles.label}>Work Arrangement (comma-separated)</label><input value={f.work_preference} onChange={e => set('work_preference', e.target.value)} style={inp} /></div> 
        <div><label style={styles.label}>Open to Outsourcing</label><select value={f.open_to_outsourcing} onChange={e => set('open_to_outsourcing', e.target.value)} style={sel}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
        <div><label style={styles.label}>Internship?</label><select value={f.is_internship} onChange={e => set('is_internship', e.target.value)} style={sel}><option value="No">No</option><option value="Yes">Yes</option></select></div>
      </div>
      <div style={{ marginBottom: 12 }}><label style={styles.label}>Internal Staff Note</label><input value={f.internal_staff_note} onChange={e => set('internal_staff_note', e.target.value)} style={inp} /></div>
      <div style={{ marginBottom: 12 }}><label style={styles.label}>Professional Qualifications</label><textarea value={f.professional_qualifications} onChange={e => set('professional_qualifications', e.target.value)} style={{ ...inp, minHeight: 100, resize: 'vertical' as const, fontFamily: 'inherit' }} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div><label style={styles.label}>Frameworks</label><input value={f.frameworks} onChange={e => set('frameworks', e.target.value)} style={inp} /></div>
        <div><label style={styles.label}>Databases</label><input value={f.databases} onChange={e => set('databases', e.target.value)} style={inp} /></div>
        <div><label style={styles.label}>Other Skills</label><input value={f.other} onChange={e => set('other', e.target.value)} style={inp} /></div>
      </div>
      <div style={{ marginBottom: 12 }}><label style={styles.label}>Languages (language / proficiency)</label>{rowList(languages, setLanguages, 'language', 'proficiency', 'Language', 'Proficiency')}</div>
      <div style={{ marginBottom: 12 }}><label style={styles.label}>Technology Highlights (tech / years)</label>{rowList(techHi, setTechHi, 'tech', 'years', 'Technology', 'Years')}</div>
      <div style={{ marginBottom: 16 }}><label style={styles.label}>Tech Stack (tech / years)</label>{rowList(techStack, setTechStack, 'tech', 'years', 'Tech', 'Years')}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} disabled={saving} style={{ ...styles.btn, padding: '8px 20px', width: 'auto' }}>{saving ? 'Saving…' : 'Save Changes'}</button>
        <button onClick={onClose} style={{ ...styles.secondaryBtn, padding: '8px 20px' }}>Cancel</button>
      </div>
    </div>
  )
}

function ApplicantDetail({ applicant: a, onClose, onUpdate, onDelete, onDownloadInova }: any) {
  const ed = a.extracted_data || {}
  const ks = a.key_skills || {}
  const [notes, setNotes] = useState(a.admin_notes || '')

  // Outsourced details (Task 3)
  const od = a.outsourced_details || {}
  const [outsourced, setOutsourced] = useState({ company_name: od.company_name || '', role: od.role || '', time_period: od.time_period || '', notes: od.notes || '' })
  const [savingOutsourced, setSavingOutsourced] = useState(false)
  const saveOutsourced = async () => { setSavingOutsourced(true); await onUpdate(a.id, { outsourced_details: outsourced }); setSavingOutsourced(false) }

  // CV Summary (AI) (Task 3)
  const [cvSummary, setCvSummary] = useState(a.cv_summary || '')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [savingSummary, setSavingSummary] = useState(false)
  const generateSummary = async () => {
    setSummaryLoading(true)
    try {
      const tok = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/cv-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ applicant: a }),
      })
      const data = await res.json()
      if (res.ok) setCvSummary(data.summary || '')
      else alert(data.error || 'Could not generate summary')
    } catch { alert('Could not generate summary') }
    setSummaryLoading(false)
  }
  const saveSummary = async () => { setSavingSummary(true); await onUpdate(a.id, { cv_summary: cvSummary }); setSavingSummary(false) }
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveNotes = async () => { setSaving(true); await onUpdate(a.id, { admin_notes: notes }); setSaving(false) }

  // Interview details
  const iv = a.interview_details || {}
  const [interviewConducted, setInterviewConducted] = useState<'Yes' | 'No' | ''>(iv.conducted || '')
  const [interviewedBy, setInterviewedBy] = useState(iv.interviewed_by || '')
  const [languageProficiency, setLanguageProficiency] = useState(iv.language_proficiency || '')
  const [communicationSkills, setCommunicationSkills] = useState(iv.communication_skills || '')
  const [savingInterview, setSavingInterview] = useState(false)
  const saveInterview = async () => {
    setSavingInterview(true)
    await onUpdate(a.id, {
      interview_details: {
        conducted: interviewConducted,
        interviewed_by: interviewedBy,
        language_proficiency: languageProficiency,
        communication_skills: communicationSkills,
      },
    })
    setSavingInterview(false)
  }
  const languageRows: any[] = Array.isArray(ks.languages) ? ks.languages : []
  const hasStructuredLangs = languageRows.length > 0

  return (
    <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' as const, padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>{a.full_name}</h2>
          <div style={{ color: '#666', marginTop: 4 }}>{a.desired_role}</div>
          {a.match_score != null && (
            <span style={{ display: 'inline-block', marginTop: 6, background: a.match_score >= 70 ? '#d1fae5' : a.match_score >= 40 ? '#fef9c3' : '#fee2e2', color: a.match_score >= 70 ? '#065f46' : a.match_score >= 40 ? '#854d0e' : '#991b1b', borderRadius: 20, fontSize: 13, fontWeight: 700, padding: '4px 12px' }}>
              {a.match_score}% AI Match Score
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          {!editing && (
            <button onClick={() => setEditing(true)} style={{ border: '1px solid #ddd', background: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '6px 12px', color: '#444' }}>✎ Edit</button>
          )}
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#999', lineHeight: 1 }}>×</button>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={styles.label}>Application Status</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {['New','Rejected','Not Available','Outsourced'].map(s => (
            <button key={s} onClick={() => onUpdate(a.id, { status: s })}
            style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${STATUS_COLORS[s]}`, background: a.status === s ? STATUS_COLORS[s] : 'transparent', color: a.status === s ? '#fff' : STATUS_COLORS[s], fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              {s}
            </button>
          ))}
          <a href={`mailto:${a.email}`}
          style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid #C41E3A', background: 'transparent', color: '#C41E3A', fontSize: 13, fontWeight: 500, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>
            Send Email
          </a>
          <button onClick={generateSummary} disabled={summaryLoading}
            style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid #C41E3A', background: 'transparent', color: '#C41E3A', fontSize: 13, fontWeight: 500, cursor: summaryLoading ? 'not-allowed' : 'pointer' }}>
            {summaryLoading ? 'Generating…' : 'Generate CV Summary'}
          </button>
        </div>
      </div>

      {a.status === 'Outsourced' && (
        <div style={{ marginBottom: 18, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#5b21b6', marginBottom: 10 }}>Outsourced Details</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div><label style={styles.label}>Company Name</label><input value={outsourced.company_name} onChange={e => setOutsourced(p => ({ ...p, company_name: e.target.value }))} style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const }} /></div>
            <div><label style={styles.label}>Role</label><input value={outsourced.role} onChange={e => setOutsourced(p => ({ ...p, role: e.target.value }))} style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const }} /></div>
            <div><label style={styles.label}>Time Period</label><input value={outsourced.time_period} onChange={e => setOutsourced(p => ({ ...p, time_period: e.target.value }))} style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const }} /></div>
            <div><label style={styles.label}>Notes</label><textarea value={outsourced.notes} onChange={e => setOutsourced(p => ({ ...p, notes: e.target.value }))} style={{ ...styles.input, width: '100%', minHeight: 60, resize: 'vertical' as const, boxSizing: 'border-box' as const }} /></div>
          </div>
          <button onClick={saveOutsourced} style={{ ...styles.btn, marginTop: 10, padding: '8px 20px', width: 'auto' }}>{savingOutsourced ? 'Saving…' : 'Save Outsourced Details'}</button>
        </div>
      )}

      {cvSummary && (
        <div style={{ marginBottom: 18, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 8 }}>CV Summary</div>
          <p style={{ fontSize: 14, color: '#333', lineHeight: 1.6, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{cvSummary}</p>
          <button onClick={saveSummary} style={{ ...styles.btn, padding: '8px 20px', width: 'auto' }}>{savingSummary ? 'Saving…' : 'Save Summary'}</button>
        </div>
      )}

      {/* Download buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' as const }}>
        <a href={a.cv_file_url} target="_blank" rel="noreferrer"
          style={{ padding: '9px 18px', background: '#C41E3A', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
          Download CV
        </a>
        <button onClick={() => onDownloadInova(a)}
          style={{ padding: '9px 18px', background: '#C41E3A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          Download Inova CV
        </button>
        <button onClick={() => onDelete(a.id)}
          style={{ padding: '9px 18px', background: '#fff0f0', color: '#c00', border: '1px solid #fcc', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          Delete Applicant
        </button>
      </div>

      {editing && <ApplicantEditForm a={a} onUpdate={onUpdate} onClose={() => setEditing(false)} />}

      <Section title="Contact">
        <Row label="Email" value={a.email} />
        <Row label="Phone" value={a.phone} />
        <Row label="Gender" value={a.gender} />
        {a.linkedin_url && <Row label="LinkedIn" value={<a href={a.linkedin_url} target="_blank" rel="noreferrer">{a.linkedin_url}</a>} />}
        {a.portfolio_url && <Row label="Portfolio" value={<a href={a.portfolio_url} target="_blank" rel="noreferrer">{a.portfolio_url}</a>} />}
      </Section>

      {a.selected_roles?.length > 0 && (
        <Section title="Applied Roles">
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {a.selected_roles.map((r: string) => <span key={r} style={{ background: '#e8f5f1', borderRadius: 6, padding: '3px 10px', fontSize: 13, color: '#0f6e56' }}>{r}</span>)}
          </div>
        </Section>
      )}

      <Section title="Experience">
        <Row label="Total" value={`${a.experience_years || 0} Years ${a.experience_months || 0} Months`} />
        {a.domain_experience && <Row label="Domain" value={a.domain_experience} />}
        {a.technology_highlights?.filter((t: any) => t.tech).length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Technology Highlights</div>
            {a.technology_highlights.filter((t: any) => t.tech).map((t: any, i: number) => (
              <div key={i} style={{ fontSize: 13, display: 'flex', gap: 8 }}>
                <span style={{ color: '#1a1a1a' }}>{t.tech}</span>
                <span style={{ color: '#888' }}>{t.years}Y</span>
              </div>
            ))}
          </div>
        )}
        {a.tech_stack?.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Tech Stack (selected)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
              {a.tech_stack.map((t: any, i: number) => (
                <span key={i} style={{ background: '#e8f5f1', borderRadius: 6, padding: '3px 10px', fontSize: 13, color: '#0f6e56' }}>
                  {t.tech}{t.years ? ` · ${t.years}Y` : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </Section>

      {(hasStructuredLangs || ks.frameworks || ks.databases || ks.other || (!hasStructuredLangs && ks.languages)) && (
        <Section title="Key Skills">
          {hasStructuredLangs ? (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Languages</span>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                {languageRows.map((l: any, i: number) => (
                  <span key={i} style={{ background: '#e8f0ff', borderRadius: 6, padding: '3px 10px', fontSize: 13, color: '#1a3a8f' }}>
                    {l.language}{l.proficiency ? <span style={{ color: '#666', fontSize: 11 }}> · {l.proficiency}</span> : ''}
                  </span>
                ))}
              </div>
            </div>
          ) : ks.languages ? (
            <Row label="Languages" value={ks.languages} />
          ) : null}
          {ks.frameworks && <Row label="Frameworks" value={ks.frameworks} />}
          {ks.databases && <Row label="Databases" value={ks.databases} />}
          {ks.other && <Row label="Other" value={ks.other} />}
        </Section>
      )}

      {a.professional_qualifications && (
        <Section title="Professional Qualifications & Experience">
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, color: '#333', background: '#f9f9f9', padding: 12, borderRadius: 8, margin: 0 }}>{a.professional_qualifications}</pre>
        </Section>
      )}

      <Section title="AI Extracted Info">
        <Row label="Location" value={ed.location} />
        <Row label="Degree" value={ed.degree_level} />
        <Row label="Field of Study" value={ed.field_of_study} />
        <Row label="English" value={ed.english_level} />
        {ed.skills?.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#888', width: 130, display: 'inline-block' }}>Skills</span>
            <div style={{ display: 'inline-flex', flexWrap: 'wrap' as const, gap: 4 }}>
              {ed.skills.map((s: string) => <span key={s} style={{ background: '#f0f0f0', borderRadius: 4, padding: '2px 7px', fontSize: 12 }}>{s}</span>)}
            </div>
          </div>
        )}
        {ed.summary && <div style={{ marginTop: 8, fontSize: 13, color: '#555', fontStyle: 'italic', background: '#f9f9f9', borderRadius: 8, padding: '10px 12px' }}>{ed.summary}</div>}
      </Section>

      {(a.open_to_outsourcing || a.expected_salary || a.notice_period || a.work_preference || a.is_internship) && (
        <Section title="Availability & Compensation">
          {a.is_internship && <Row label="Applying As" value="Internship" />}
          {a.work_preference && <Row label="Work Arrangement" value={a.work_preference} />}
          {a.work_arrangement_comments && <Row label="Arrangement Notes" value={a.work_arrangement_comments} />}
          {a.open_to_outsourcing && <Row label="Open to Outsourcing" value={a.open_to_outsourcing} />}
          {a.expected_salary && <Row label="Desired Compensation" value={a.expected_salary} />}
          {a.notice_period && <Row label="Notice Period" value={a.notice_period} />}
        </Section>
      )}

      {a.referral_source && (
        <Section title="Referral">
          <Row label="Source" value={a.referral_source} />
          {a.referral_name && <Row label="Referred by" value={a.referral_name} />}
        </Section>
      )}

      <Section title="Admin Notes (private)">
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          style={{ width: '100%', minHeight: 80, padding: 10, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, resize: 'vertical' as const, boxSizing: 'border-box' as const }} />
        <button onClick={saveNotes} style={{ ...styles.btn, marginTop: 8, padding: '8px 20px', width: 'auto' }}>
          {saving ? 'Saving…' : 'Save Notes'}
        </button>
      </Section>

      <Section title="Interview">
        <label style={{ fontSize: 13, color: '#666', marginBottom: 6, display: 'block' }}>Has this applicant been interviewed?</label>
        <div style={{ display: 'flex', gap: 16, marginBottom: interviewConducted === 'Yes' ? 12 : 0 }}>
          {(['Yes', 'No'] as const).map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
              <input type="radio" name="interview_conducted" value={opt} checked={interviewConducted === opt}
                onChange={() => setInterviewConducted(opt)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              {opt}
            </label>
          ))}
        </div>
        {interviewConducted === 'Yes' && (
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <label style={styles.label}>Interviewed By</label>
              <input value={interviewedBy} onChange={e => setInterviewedBy(e.target.value)}
                style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const }} />
            </div>
            <div>
              <label style={styles.label}>Language Proficiency</label>
              <input value={languageProficiency} onChange={e => setLanguageProficiency(e.target.value)}
                style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const }} />
            </div>
            <div>
              <label style={styles.label}>Communication Skills</label>
              <input value={communicationSkills} onChange={e => setCommunicationSkills(e.target.value)}
                style={{ ...styles.input, width: '100%', boxSizing: 'border-box' as const }} />
            </div>
          </div>
        )}
        <button onClick={saveInterview} style={{ ...styles.btn, marginTop: 12, padding: '8px 20px', width: 'auto' }}>
          {savingInterview ? 'Saving…' : 'Save Interview Details'}
        </button>
      </Section>

      {a.updated_at && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #eee', fontSize: 12, color: '#999' }}>
          Last updated: {new Date(a.updated_at).toLocaleString()}
        </div>
      )}
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

// ─── Delete Confirmation Dialog ──────────────────────────────────────────────
function ConfirmDialog({ message, onYes, onNo }: { message: string, onYes: () => void, onNo: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, paddingTop: 80 }}
      onClick={e => e.target === e.currentTarget && onNo()}>
      <style>{`@keyframes confirmPop { 0% { transform: scale(0.1); opacity: 0; border-radius: 50%; } 55% { opacity: 1; } 100% { transform: scale(1); opacity: 1; border-radius: 14px; } }`}</style>
      <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', width: '100%', maxWidth: 380, boxShadow: '0 12px 40px rgba(0,0,0,0.28)', transformOrigin: 'top center', animation: 'confirmPop 0.30s cubic-bezier(0.16,1,0.3,1)', textAlign: 'center' as const }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1A232C', marginBottom: 6 }}>Confirm deletion</div>
        <div style={{ fontSize: 14, color: '#555', marginBottom: 20, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onYes} style={{ padding: '9px 30px', background: '#C41E3A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Yes</button>
          <button onClick={onNo} style={{ padding: '9px 30px', background: '#fff', color: '#646C72', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>No</button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#F2F2F3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid #eee', cursor: 'pointer' },
  glassCard: { background: '#F2F2F3', borderRadius: 20, padding: '20px', border: '1px solid #cdd0d2', boxShadow: '0 4px 14px rgba(26,35,44,0.12)', color: '#1A232C', cursor: 'pointer' },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 4 },
  input: { padding: '8px 11px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' },
  select: { padding: '8px 11px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fff', cursor: 'pointer' },
  btn: { background: '#C41E3A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '10px 20px' },
  secondaryBtn: { background: 'transparent', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, cursor: 'pointer', padding: '7px 14px' },
}