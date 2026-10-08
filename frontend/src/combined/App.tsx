import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import HealthCheckIn from './HealthCheckIn';
import Shell, { type Page } from '../components/Shell';
import { systems } from './domains';
import type { BookingFocus } from './CalendarAppointments';
import Dashboard, { HealthLauncher } from './Dashboard';
import Onboarding from './Onboarding';
import Confirmation from './Confirmation';
import PlanView from './PlanView';
import SystemDetail from './SystemDetail';
import { exampleProfiles, type ExampleProfileId } from './example-profiles';
import { isEmmaDemo, loadEmmaDemo } from './emma-demo';
import { planTodos, calendarProgress, type Bookings, type Progress } from './plan-progress';
import CalendarDialog, { type CalendarHandle, type CalendarItem } from './CalendarDialog';
import { checkedContact, checkedProfile, request, safeLink, type RecordNote, type Plan, type Contact } from './api';

export default function CombinedApp() {
  const [text, setText] = useState(''), [records, setRecords] = useState<RecordNote[]>([]);
  const [exampleId, setExampleId] = useState<ExampleProfileId | null>(null);
  const [reviewing, setReviewing] = useState(false), [plan, setPlan] = useState<Plan | null>(null), [contact, setContact] = useState<Contact | null>(null);
  const [page, setPage] = useState<Page>('home'), [system, setSystem] = useState<string | null>(null), [pending, setPending] = useState(false), [error, setError] = useState(''), [checkingIn, setCheckingIn] = useState(false);
  const operation = useRef<AbortController | null>(null), revision = useRef(0), root = useRef<HTMLDivElement>(null), calendar = useRef<CalendarHandle>(null);
  const [progress, setProgress] = useState<Progress>({});
  const [planFocusId, setPlanFocusId] = useState<string>();
  const [bookings, setBookings] = useState<Bookings>({}), [bookedFocus, setBookedFocus] = useState<BookingFocus | null>(null);
  const bookingSequence = useRef(0);
  const planGeneration = useRef(0);
  const replacePlan = (next: Plan | null) => { planGeneration.current++; setProgress({}); setBookings({}); setBookedFocus(null); setPlanFocusId(undefined); setPlan(next); };
  const beforeExample = useRef<{ text:string; records:RecordNote[] } | null>(null);
  const cancel = () => { revision.current++; operation.current?.abort(); setPending(false); };
  const reset = () => { cancel(); beforeExample.current=null; setExampleId(null); setText(''); setRecords([]); setReviewing(false); replacePlan(null); setContact(null); setSystem(null); setPage('home'); setError(''); setCheckingIn(false); calendar.current?.close(); window.speechSynthesis?.cancel(); };
  useEffect(() => { window.addEventListener('pagehide', reset); return () => { window.removeEventListener('pagehide', reset); revision.current++; operation.current?.abort(); window.speechSynthesis?.cancel(); }; }, []);
  const screenKey = contact ? 'contact' : reviewing || page === 'profile' ? 'review' : !plan ? 'onboarding' : system || page;
  useEffect(() => { root.current?.focus(); window.scrollTo?.(0,0); window.speechSynthesis?.cancel(); }, [screenKey]);
  function reviewStory() { void buildPlan(text); }
  function selectExample(id: ExampleProfileId | null) {
    if (!id) { leaveExample(); return; }
    cancel();
    beforeExample.current ||= { text, records };
    const example = exampleProfiles[id];
    setExampleId(id); setText(example.text); setRecords(example.records.map(record => ({ ...record })));
    replacePlan(null); setReviewing(false); setContact(null); setCheckingIn(false); setPage('home'); setSystem(null); setError('');
    window.speechSynthesis?.cancel();
  }
  function closeCheckIn() { cancel(); setCheckingIn(false); setError(''); }
  async function buildPlan(intake: string) {
    cancel(); const current = revision.current, controller = new AbortController(); operation.current = controller; setPending(true); setError('');
    try {
      // Only the unchanged, explicitly selected Emma demo uses the prepared result.
      // Everything else keeps Rob's submitted-story contract and guardrails.
      const data = isEmmaDemo(exampleId, intake, records)
        ? await loadEmmaDemo(controller.signal)
        : await request<Plan | Contact>('/api/plan', { intake, records }, controller.signal);
      if (revision.current !== current) return;
      if (data.route === 'emergency' || data.route === 'human') { setContact(checkedContact(data)); setText(intake); setCheckingIn(false); }
      else if (data.route === 'prevention' && Array.isArray(data.actions)) { checkedProfile(data.profile); setText(intake); replacePlan(data); setReviewing(true); setCheckingIn(false); setPage('home'); setSystem(null); }
      else throw new Error();
    } catch { if (revision.current === current) setError('The request did not finish. Your words are still here. Please try again.'); }
    finally { if (revision.current === current) setPending(false); }
  }
  async function showBupaExample() {
    cancel(); const current=revision.current, controller=new AbortController(); operation.current=controller; setPending(true); setError('');
    try {
      const data=await loadEmmaDemo(controller.signal);
      if(revision.current!==current)return;
      checkedProfile(data.profile);
      beforeExample.current ||= {text,records};setExampleId('family-history');setText(exampleProfiles['family-history'].text);setRecords([]);replacePlan(data);setReviewing(true);setContact(null);setCheckingIn(false);setPage('home');setSystem(null);
    } catch { if(revision.current===current)setError('The example could not load. Your story is still here.'); }
    finally { if(revision.current===current)setPending(false); }
  }
  function leaveExample() {
    cancel();const previous=beforeExample.current;beforeExample.current=null;
    setExampleId(null);setText(previous?.text||'');setRecords(previous?.records||[]);replacePlan(null);setContact(null);setReviewing(false);setCheckingIn(false);setPage('home');setSystem(null);setError('');calendar.current?.close();window.speechSynthesis?.cancel();root.current?.focus();
  }
  function checkIn(message: string) {
    const intake = `${text}\n\nToday's health check-in:\n${message}`;
    if (intake.length > 8000) { setError('Your story is too long to extend. Close this check-in and edit your story from your profile.'); return; }
    void buildPlan(intake);
  }
  function edit() { cancel(); setReviewing(false); replacePlan(null); setPage('home'); setError(''); }
  const selected = systems.find(s => s.id === system);
  const openPlan = (recommendationId?: string) => { setPlanFocusId(recommendationId); setSystem(null); setPage('plan'); };
  const exampleNotice = exampleId && <div className="example-banner"><span>{plan?.demoScenario ? 'Bupa example · fictional story' : `${exampleProfiles[exampleId].name} · example profile`}</span>{!contact && <button type="button" className="text-button" onClick={leaveExample}>Return to my story</button>}</div>;
  const openCalendar = (item: CalendarItem) => {
    const todo = plan && planTodos(plan).find(row => row.sourceId === item.id && row.title === item.title);
    calendar.current?.open({ ...item, todoId: todo?.id, generation: planGeneration.current });
  };
  return <div className="combined-app view-root" ref={root} tabIndex={-1}>
    {contact ? <main className="contact-screen">{exampleNotice}<h1>{contact.title}</h1><p>{contact.message}</p><a className="primary-button" href={safeLink(contact.primary.href)}>{contact.primary.label}</a>{contact.secondary && <a className="secondary-button" href={safeLink(contact.secondary.href)}>{contact.secondary.label}</a>}<p>{contact.note}</p><button className="text-button" onClick={reset}>Start again</button></main>
    : (reviewing || page === 'profile') && plan?.profile ? <Confirmation text={text} profile={plan.profile} exampleNotice={exampleNotice} onEdit={edit} onConfirm={() => { setReviewing(false); setPage('home'); }} />
    : !plan ? <Onboarding key={exampleId || 'own-story'} text={text} setText={setText} records={records} setRecords={setRecords} pending={pending} error={error} onSubmit={reviewStory} onCancel={cancel} onExample={() => { void showBupaExample(); }} exampleId={exampleId} exampleNotice={exampleNotice} onSelectExample={selectExample} />
    : <Shell page={page} onNavigate={p => { if(p==='profile' && plan?.demoScenario){leaveExample();return;} setPage(p); setSystem(null); setPlanFocusId(undefined); }} onReset={reset}>
      {exampleNotice}
      {selected ? <SystemDetail system={selected} plan={plan} onBack={() => setSystem(null)} onPlan={openPlan} onCalendar={openCalendar} /> : <>
        {page !== 'home' && <header className="page-heading"><div><div className="eyebrow">WELL AHEAD</div><h1>{page === 'plan' ? 'Your health plan' : 'Your health'}</h1></div></header>}
        {page === 'home' && <Dashboard agentControl={<button type="button" className="summary-glass agent-checkin-button" onClick={() => { cancel(); setError(''); if(plan.demoScenario){leaveExample();return;} setCheckingIn(true); }}><Mic size={18} aria-hidden="true" /><span>How are you feeling today?</span></button>} bookings={bookings} bookedFocus={bookedFocus} progress={progress} onProgress={(id, status) => setProgress(current => ({ ...current, [id]: status }))} plan={plan} onOpen={setSystem} onPlan={openPlan} onCalendar={openCalendar} />}
        {page === 'health' && <HealthLauncher plan={plan} onOpen={setSystem} />}
        {page === 'plan' && <PlanView plan={plan} focusId={planFocusId} onRefine={reply => { setText(text + '\nMore about me: ' + reply); edit(); }} />}
      </>}
      {checkingIn && <HealthCheckIn pending={pending} error={error} onSubmit={checkIn} onClose={closeCheckIn} />}
    </Shell>}
    <CalendarDialog ref={calendar} onSaved={(item, kind, event) => {
      if (!plan || kind !== 'appointment' || item.generation !== planGeneration.current || !planTodos(plan).some(todo => todo.id === item.todoId)) return;
      setProgress(current => calendarProgress(current, planTodos(plan), item, kind, planGeneration.current));
      const todoId = item.todoId!;
      if (Number.isFinite(Date.parse(event.start?.dateTime)) && safeLink(event.htmlLink)) setBookings(current => ({ ...current, [todoId]: { startsAt:event.start.dateTime, htmlLink:event.htmlLink } }));
      if (item.intent === 'schedule') setBookedFocus({ todoId, sequence:++bookingSequence.current });
    }} />
  </div>;
}
