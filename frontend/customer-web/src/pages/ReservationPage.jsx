import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Search,
  XCircle,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  CalendarPlus,
  RotateCcw,
} from 'lucide-react';
import SEOHelmet from '../components/SEOHelmet';
import LoadingSpinner from '../components/LoadingSpinner';
import reservationService from '../services/reservationService';

export default function ReservationPage() {
  const [activeTab, setActiveTab] = useState('book'); // 'book' | 'lookup'

  // Wizard state
  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);

  // Form selections
  const [branchId, setBranchId] = useState(1);
  const [reservationDate, setReservationDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  });
  const [partySize, setPartySize] = useState(2);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Slot discovery state
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(null);

  // Guest details state
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Lookup state
  const [lookupId, setLookupId] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(null);

  // Load branches
  useEffect(() => {
    async function fetchBranches() {
      try {
        setLoadingBranches(true);
        const data = await reservationService.getBranches();
        if (data && data.length > 0) {
          setBranches(data);
          setBranchId(data[0].BranchId);
        }
      } catch (err) {
        console.error('Failed to load branches:', err);
      } finally {
        setLoadingBranches(false);
      }
    }
    fetchBranches();
  }, []);

  // Fetch slots whenever step 2 is active or branch/date/partySize change
  useEffect(() => {
    if (step === 2 && branchId && reservationDate) {
      async function loadSlots() {
        try {
          setLoadingSlots(true);
          setSlotsError(null);
          const data = await reservationService.getTimeSlots(branchId, reservationDate, partySize);
          setSlots(data || []);
        } catch (err) {
          setSlotsError('Failed to load time slots. Please try another date or branch.');
          setSlots([]);
        } finally {
          setLoadingSlots(false);
        }
      }
      loadSlots();
    }
  }, [step, branchId, reservationDate, partySize]);

  // Handle booking submission
  async function handleBookingSubmit(e) {
    e.preventDefault();
    setSubmitError(null);

    if (!guestName.trim() || !guestPhone.trim()) {
      setSubmitError('Please provide your name and contact phone number.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        branchId: Number(branchId),
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim() || null,
        partySize: Number(partySize),
        reservationDate,
        startTime: selectedSlot.SlotTime,
        specialRequests: specialRequests.trim() || null,
      };

      const result = await reservationService.createReservation(payload);
      setConfirmedBooking(result);
      setStep(4);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit reservation.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle booking lookup
  async function handleLookup(e) {
    e.preventDefault();
    setLookupError(null);
    setLookupResult(null);
    setCancelSuccess(null);

    if (!lookupId.trim() && !lookupPhone.trim()) {
      setLookupError('Please enter a Reservation ID or Phone Number.');
      return;
    }

    try {
      setLookupLoading(true);
      const res = await reservationService.lookupReservation({
        reservationId: lookupId.trim() ? Number(lookupId.trim()) : null,
        guestPhone: lookupPhone.trim() || null,
      });

      if (Array.isArray(res)) {
        if (res.length === 0) setLookupError('No bookings found for the provided details.');
        else setLookupResult(res[0]);
      } else if (res) {
        setLookupResult(res);
      } else {
        setLookupError('No reservation found matching these details.');
      }
    } catch (err) {
      setLookupError(err.response?.data?.message || err.message || 'Lookup failed.');
    } finally {
      setLookupLoading(false);
    }
  }

  // Handle cancellation
  async function handleCancelBooking(reservationId) {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;

    try {
      setCancelling(true);
      await reservationService.cancelReservation(reservationId, {
        cancellationReason: 'Cancelled via customer self-service portal',
        guestPhone: lookupResult?.GuestPhone,
      });
      setCancelSuccess('Your reservation has been cancelled successfully.');
      setLookupResult(prev => prev ? { ...prev, Status: 'CANCELLED' } : null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel reservation.');
    } finally {
      setCancelling(false);
    }
  }

  const selectedBranchObj = branches.find(b => String(b.BranchId) === String(branchId)) || { BranchName: 'Selected Branch' };

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '85vh', color: '#f8fafc', padding: '3rem 1rem' }}>
      <SEOHelmet
        title="Table Reservations | Antigravity Bistro"
        description="Book your intimate table or celebration dining experience at Antigravity Bistro. Instant real-time confirmation."
      />

      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 1rem', borderRadius: '9999px', backgroundColor: 'rgba(217, 119, 6, 0.15)', border: '1px solid rgba(217, 119, 6, 0.3)', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            <Sparkles size={16} />
            <span>Table Reservations</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem 0' }}>
            Reserve Your Experience
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', margin: 0 }}>
            Curated dining, seasonal culinary artistry, and warm hospitality.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', backgroundColor: '#1e293b', padding: '0.3rem', borderRadius: '0.75rem', border: '1px solid #334155' }}>
            <button
              type="button"
              onClick={() => { setActiveTab('book'); setStep(1); }}
              style={{
                padding: '0.6rem 1.75rem',
                borderRadius: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                backgroundColor: activeTab === 'book' ? 'var(--primary-color, #d97706)' : 'transparent',
                color: activeTab === 'book' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Book a Table
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lookup')}
              style={{
                padding: '0.6rem 1.75rem',
                borderRadius: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                backgroundColor: activeTab === 'lookup' ? 'var(--primary-color, #d97706)' : 'transparent',
                color: activeTab === 'lookup' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Find / Cancel Booking
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: BOOKING WIZARD */}
        {/* =================================================================== */}
        {activeTab === 'book' && (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '1.25rem', border: '1px solid #334155', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            {/* Step Indicators */}
            {step < 4 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid #334155', paddingBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: step >= 1 ? '#fbbf24' : '#64748b' }}>
                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: step >= 1 ? '#d97706' : '#334155', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700 }}>1</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Branch & Guests</span>
                </div>
                <ChevronRight size={18} color="#64748b" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: step >= 2 ? '#fbbf24' : '#64748b' }}>
                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: step >= 2 ? '#d97706' : '#334155', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700 }}>2</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Time Slot</span>
                </div>
                <ChevronRight size={18} color="#64748b" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: step >= 3 ? '#fbbf24' : '#64748b' }}>
                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: step >= 3 ? '#d97706' : '#334155', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700 }}>3</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Guest Info</span>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* STEP 1: Branch, Date, and Party Size */}
            {/* --------------------------------------------------------------- */}
            {step === 1 && (
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#ffffff', marginBottom: '1.5rem' }}>
                  Select Dining Details
                </h2>

                {loadingBranches ? (
                  <LoadingSpinner />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Branch Picker */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.5rem' }}>
                        Restaurant Branch
                      </label>
                      <select
                        value={branchId}
                        onChange={e => setBranchId(Number(e.target.value))}
                        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#ffffff', fontSize: '1rem', outline: 'none' }}
                      >
                        {branches.map(b => (
                          <option key={b.BranchId} value={b.BranchId}>
                            {b.BranchName} {b.City ? `(${b.City})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date Picker */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.5rem' }}>
                        Reservation Date
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          value={reservationDate}
                          onChange={e => setReservationDate(e.target.value)}
                          style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#ffffff', fontSize: '1rem', outline: 'none' }}
                        />
                      </div>
                    </div>

                    {/* Party Size Buttons */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.5rem' }}>
                        Party Size (Guests)
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(65px, 1fr))', gap: '0.5rem' }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setPartySize(num)}
                            style={{
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              fontSize: '1rem',
                              fontWeight: 600,
                              backgroundColor: partySize === num ? '#d97706' : '#0f172a',
                              border: partySize === num ? '1px solid #f59e0b' : '1px solid #475569',
                              color: partySize === num ? '#ffffff' : '#cbd5e1',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {num} {num === 12 ? '+' : ''}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        backgroundColor: '#d97706',
                        color: '#ffffff',
                        fontSize: '1.05rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 14px 0 rgba(217, 119, 6, 0.39)',
                      }}
                    >
                      <span>Find Available Time Slots</span>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* STEP 2: Time Slot Picker */}
            {/* --------------------------------------------------------------- */}
            {step === 2 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>
                  <span style={{ color: '#fbbf24', fontSize: '0.9rem', fontWeight: 600 }}>
                    {selectedBranchObj.BranchName} â€¢ {partySize} Guests â€¢ {reservationDate}
                  </span>
                </div>

                <h2 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#ffffff', marginBottom: '1rem' }}>
                  Select an Available Time Slot
                </h2>

                {loadingSlots ? (
                  <LoadingSpinner />
                ) : slotsError ? (
                  <div style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', marginBottom: '1rem' }}>
                    {slotsError}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '1.5rem' }}>
                      {slots.map(slot => {
                        const isSelected = selectedSlot?.SlotTime === slot.SlotTime;
                        const isAvail = slot.IsAvailable;
                        const timeStr = String(slot.SlotTime).substring(0, 5);

                        return (
                          <button
                            key={slot.SlotTime}
                            type="button"
                            disabled={!isAvail}
                            onClick={() => setSelectedSlot(slot)}
                            style={{
                              padding: '0.75rem 0.5rem',
                              borderRadius: '0.5rem',
                              backgroundColor: isSelected ? '#d97706' : (isAvail ? '#0f172a' : '#1e293b'),
                              border: isSelected ? '1px solid #f59e0b' : (isAvail ? '1px solid #475569' : '1px solid #334155'),
                              color: isSelected ? '#ffffff' : (isAvail ? '#f1f5f9' : '#64748b'),
                              cursor: isAvail ? 'pointer' : 'not-allowed',
                              opacity: isAvail ? 1 : 0.45,
                              textAlign: 'center',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ fontSize: '1rem', fontWeight: 600 }}>{timeStr}</div>
                            <div style={{ fontSize: '0.7rem', marginTop: '0.2rem', color: isSelected ? '#fef3c7' : (isAvail ? '#10b981' : '#64748b') }}>
                              {isAvail ? `${slot.AvailableTableCount} tables` : 'Fully Booked'}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={!selectedSlot}
                      onClick={() => setStep(3)}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        backgroundColor: selectedSlot ? '#d97706' : '#475569',
                        color: '#ffffff',
                        fontSize: '1.05rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: selectedSlot ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span>Continue to Guest Details</span>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* STEP 3: Guest Details */}
            {/* --------------------------------------------------------------- */}
            {step === 3 && (
              <form onSubmit={handleBookingSubmit}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>
                  <span style={{ color: '#fbbf24', fontSize: '0.9rem', fontWeight: 600 }}>
                    {selectedBranchObj.BranchName} â€¢ {reservationDate} at {String(selectedSlot?.SlotTime).substring(0, 5)}
                  </span>
                </div>

                <h2 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#ffffff', marginBottom: '1.5rem' }}>
                  Primary Guest Information
                </h2>

                {submitError && (
                  <div style={{ padding: '0.85rem 1rem', borderRadius: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.9rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={18} />
                    <span>{submitError}</span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ananya Sharma"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#ffffff', fontSize: '0.95rem', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={guestPhone}
                        onChange={e => setGuestPhone(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#ffffff', fontSize: '0.95rem', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                        Email Address (for confirmation)
                      </label>
                      <input
                        type="email"
                        placeholder="ananya@example.com"
                        value={guestEmail}
                        onChange={e => setGuestEmail(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#ffffff', fontSize: '0.95rem', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                      Special Requests / Dietary Requirements
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Anniversary celebration, window table preference, allergen notes, high chair..."
                      value={specialRequests}
                      onChange={e => setSpecialRequests(e.target.value)}
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#ffffff', fontSize: '0.95rem', outline: 'none', resize: 'vertical' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      marginTop: '0.5rem',
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      backgroundColor: '#d97706',
                      color: '#ffffff',
                      fontSize: '1.05rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 14px 0 rgba(217, 119, 6, 0.39)',
                    }}
                  >
                    {submitting ? (
                      <span>Securing Your Reservation...</span>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span>Confirm Reservation</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* --------------------------------------------------------------- */}
            {/* STEP 4: Booking Confirmation Screen */}
            {/* --------------------------------------------------------------- */}
            {step === 4 && confirmedBooking && (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                  <CheckCircle2 size={36} color="#10b981" />
                </div>

                <h2 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                  Table Reserved Successfully!
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '2rem' }}>
                  We look forward to hosting you. A confirmation SMS/Email has been dispatched.
                </p>

                {/* Summary Box */}
                <div style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', border: '1px solid #334155', padding: '1.5rem', textAlign: 'left', maxWidth: '480px', margin: '0 auto 2rem auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Booking Reference:</span>
                    <span style={{ fontWeight: 700, color: '#fbbf24', fontSize: '1rem' }}>#{confirmedBooking.ReservationId}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Guest Name:</span>
                    <span style={{ fontWeight: 600, color: '#ffffff' }}>{confirmedBooking.GuestName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Branch:</span>
                    <span style={{ fontWeight: 600, color: '#ffffff' }}>{confirmedBooking.BranchName || selectedBranchObj.BranchName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Date & Time:</span>
                    <span style={{ fontWeight: 600, color: '#ffffff' }}>{confirmedBooking.ReservationDate} at {String(confirmedBooking.StartTime).substring(0, 5)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Party Size:</span>
                    <span style={{ fontWeight: 600, color: '#ffffff' }}>{confirmedBooking.PartySize} Guests</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setConfirmedBooking(null);
                      setSelectedSlot(null);
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.5rem',
                      backgroundColor: '#334155',
                      color: '#ffffff',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <RotateCcw size={16} />
                    <span>Book Another Table</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: LOOKUP & SELF-SERVICE CANCELLATION */}
        {/* =================================================================== */}
        {activeTab === 'lookup' && (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '1.25rem', border: '1px solid #334155', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
              Find Your Reservation
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Enter your booking reference ID or phone number to view details or cancel.
            </p>

            {cancelSuccess && (
              <div style={{ padding: '0.85rem 1rem', borderRadius: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {cancelSuccess}
              </div>
            )}

            {lookupError && (
              <div style={{ padding: '0.85rem 1rem', borderRadius: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {lookupError}
              </div>
            )}

            <form onSubmit={handleLookup} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>
                  Reservation ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1024"
                  value={lookupId}
                  onChange={e => setLookupId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#ffffff', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={lookupPhone}
                  onChange={e => setLookupPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#ffffff', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={lookupLoading}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#d97706', color: '#ffffff', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Search size={16} />
                  <span>{lookupLoading ? 'Searching...' : 'Search'}</span>
                </button>
              </div>
            </form>

            {/* Found Booking Card */}
            {lookupResult && (
              <div style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', border: '1px solid #334155', padding: '1.5rem', marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Booking #{lookupResult.ReservationId}</span>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', marginLeft: '0.75rem' }}>{lookupResult.GuestName}</span>
                  </div>
                  <span
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: lookupResult.Status === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.2)' : (lookupResult.Status === 'SEATED' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)'),
                      color: lookupResult.Status === 'CONFIRMED' ? '#34d399' : (lookupResult.Status === 'SEATED' ? '#60a5fa' : '#f87171'),
                    }}
                  >
                    {lookupResult.Status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '1.5rem' }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Branch: </span>
                    <span style={{ fontWeight: 600 }}>{lookupResult.BranchName || 'Flagship'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Date: </span>
                    <span style={{ fontWeight: 600 }}>{lookupResult.ReservationDate}</span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Time: </span>
                    <span style={{ fontWeight: 600 }}>{String(lookupResult.StartTime).substring(0, 5)}</span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Party: </span>
                    <span style={{ fontWeight: 600 }}>{lookupResult.PartySize} Guests</span>
                  </div>
                </div>

                {lookupResult.Status === 'CONFIRMED' && (
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={() => handleCancelBooking(lookupResult.ReservationId)}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '0.5rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: cancelling ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <XCircle size={16} />
                    <span>{cancelling ? 'Cancelling...' : 'Cancel Reservation'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

