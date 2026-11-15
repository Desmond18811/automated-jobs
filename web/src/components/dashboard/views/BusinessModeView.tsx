import { useEffect, useState, type FC } from 'react';
import {
  CheckIcon,
  ExternalLinkIcon,
  MailIcon,
  MapPinIcon,
  RefreshCwIcon,
  SparklesIcon,
  StarIcon,
} from '@/assets/icons';
import { useUserProfile } from '@/context/ProfileContext';
import { businessApi } from '@/api';
import { OpenFreeMap, type MapMarkerItem } from '../OpenFreeMap';

interface BusinessLead {
  _id: string;
  id?: string;
  name: string;
  category: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  distanceKm: number;
  rating?: number;
  reviewsCount?: number;
  websiteUrl?: string;
  websiteAudit: {
    hasWebsite: boolean;
    mobileResponsive: boolean;
    hasSsl: boolean;
    techStack: string[];
    issues: string[];
  };
  socialPresence: {
    linkedinUrl?: string;
    twitterUrl?: string;
    instagramUrl?: string;
    facebookUrl?: string;
    notes: string[];
  };
  contacts: Array<{
    name: string;
    title: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
  }>;
  needsServices: boolean;
  qualificationReason: string;
  pitchSnippet: string;
  sequence?: Array<{
    stepNumber: number;
    channel: 'email' | 'whatsapp' | 'linkedin';
    scheduledAt: string;
    status: 'pending' | 'sent' | 'replied' | 'paused';
    subject?: string;
    body: string;
  }>;
  stage: 'discovered' | 'qualified' | 'pitch_drafted' | 'sequence_active' | 'sequence_paused' | 'replied' | 'converted' | 'dismissed';
}

const DEFAULT_CENTER: [number, number] = [3.4723, 6.4474]; // [lng, lat] for candidate location (Lekki/Lagos)

export const BusinessModeView: FC = () => {
  const { profile } = useUserProfile();
  const [keyword, setKeyword] = useState('Fintech & Software');
  const [locationStr, setLocationStr] = useState(profile.location || 'Lekki, Lagos');
  const [centerCoords, setCenterCoords] = useState<[number, number]>(DEFAULT_CENTER);
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<BusinessLead | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Google' | 'LinkedIn' | 'Social'>('All');
  const [toast, setToast] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadSavedLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await businessApi.list();
      const list = Array.isArray(res) ? res : res?.leads || [];
      setLeads(list);
      if (list.length > 0) {
        setSelectedLead((prev) => (prev ? list.find((l: any) => (l._id || l.id) === (prev._id || prev.id)) || list[0] : list[0]));
        if (list[0].location?.lat && list[0].location?.lng) {
          setCenterCoords([list[0].location.lng, list[0].location.lat]);
        }
      }
    } catch (e: any) {
      console.warn('Could not load saved business leads:', e);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    // 1. Sync location string with candidate profile
    if (profile.location) {
      setLocationStr(profile.location);
    }

    // 2. Auto-align search center and leads to candidate's physical GPS location
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCenterCoords([longitude, latitude]);
          setLocationStr(profile.location || 'Your Current Location');
          businessApi
            .search({
              query: keyword.trim(),
              location: profile.location || 'Your Current Location',
              lat: latitude,
              lng: longitude,
              radiusKm: 12,
            })
            .then((res: any) => {
              const list = res?.leads || (Array.isArray(res) ? res : []);
              const qualified = list.filter((l: any) => l.needsServices !== false);
              if (qualified.length > 0) {
                setLeads(qualified);
                setSelectedLead(qualified[0]);
              } else {
                loadSavedLeads();
              }
            })
            .catch(() => loadSavedLeads())
            .finally(() => setLoadingLeads(false));
        },
        () => {
          loadSavedLeads();
        },
        { timeout: 4000 },
      );
    } else {
      loadSavedLeads();
    }
  }, []);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setSearching(true);
    try {
      const res = await businessApi.search({
        query: keyword.trim(),
        location: locationStr.trim(),
        lat: centerCoords[1],
        lng: centerCoords[0],
        radiusKm: 12,
      });

      const list = res?.leads || (Array.isArray(res) ? res : []);
      // Filter out businesses that do not need our services
      const qualified = list.filter((l: any) => l.needsServices !== false);
      setLeads(qualified);

      if (qualified.length > 0) {
        setSelectedLead(qualified[0]);
        if (qualified[0].location?.lat && qualified[0].location?.lng) {
          setCenterCoords([qualified[0].location.lng, qualified[0].location.lat]);
        }
        showToast(`Discovered & qualified ${qualified.length} businesses with active needs near ${locationStr}!`);
      } else {
        showToast('All scanned businesses already have complete modern presence; none required services.');
      }
    } catch (e: any) {
      showToast('Search notice: ' + (e?.message || 'Check network'));
    } finally {
      setSearching(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCenterCoords([longitude, latitude]);
        setLocationStr('My Current Location');
        showToast('Location updated to your GPS coordinates!');
      },
      () => {
        showToast('Could not access GPS location; using default city.');
      },
    );
  };

  const handleStartSequence = async (lead: BusinessLead) => {
    const id = lead._id || lead.id;
    if (!id) return;
    try {
      await businessApi.startSequence(id);
      setLeads((prev) =>
        prev.map((l) => ((l._id || l.id) === id ? { ...l, stage: 'sequence_active' } : l)),
      );
      if (selectedLead && (selectedLead._id || selectedLead.id) === id) {
        setSelectedLead((prev) => (prev ? { ...prev, stage: 'sequence_active' } : null));
      }
      showToast(`Multi-channel outreach sequence launched for ${lead.name}!`);
    } catch (e: any) {
      showToast('Sequence error: ' + (e?.message || 'Server deferred'));
    }
  };

  const handlePauseSequence = async (lead: BusinessLead) => {
    const id = lead._id || lead.id;
    if (!id) return;
    try {
      await businessApi.pauseSequence(id);
      setLeads((prev) =>
        prev.map((l) => ((l._id || l.id) === id ? { ...l, stage: 'sequence_paused' } : l)),
      );
      if (selectedLead && (selectedLead._id || selectedLead.id) === id) {
        setSelectedLead((prev) => (prev ? { ...prev, stage: 'sequence_paused' } : null));
      }
      showToast(`Outreach sequence paused for ${lead.name}`);
    } catch (e: any) {
      showToast('Pause error: ' + (e?.message || 'Server deferred'));
    }
  };

  const handleRegeneratePitch = async (lead: BusinessLead) => {
    const id = lead._id || lead.id;
    if (!id) return;
    try {
      const updated = await businessApi.generatePitch(id);
      if (updated?.pitchSnippet) {
        setLeads((prev) =>
          prev.map((l) => ((l._id || l.id) === id ? { ...l, pitchSnippet: updated.pitchSnippet } : l)),
        );
        if (selectedLead && (selectedLead._id || selectedLead.id) === id) {
          setSelectedLead((prev) => (prev ? { ...prev, pitchSnippet: updated.pitchSnippet } : null));
        }
        showToast('Pitch regenerated based on candidate CV highlights!');
      }
    } catch (e: any) {
      showToast('Pitch regeneration notice: ' + (e?.message || 'Updated locally'));
    }
  };

  // Prepare markers for OpenFreeMap
  const mapMarkers: MapMarkerItem[] = leads.map((l) => ({
    id: l._id || l.id || l.name,
    name: l.name,
    category: l.category,
    location: l.location,
    address: l.address,
    rating: l.rating,
    opportunity: l.qualificationReason,
  }));

  const filteredLeads = leads.filter((l) => {
    if (activeFilter === 'Google') return l.address || l.rating;
    if (activeFilter === 'LinkedIn') return l.socialPresence?.linkedinUrl;
    if (activeFilter === 'Social') return l.socialPresence?.instagramUrl || l.socialPresence?.twitterUrl;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-.5px' }}>Business mode</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6a6a72' }}>
            Discover local businesses near you using OpenFreeMap &amp; Google, scan their website and social presence, and pitch how your CV solves their problems. Businesses with no needs are automatically discarded.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {toast && (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 11.5,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <CheckIcon size={14} color="#059669" />
              <span>{toast}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            style={{
              background: showMap ? '#edf3ff' : '#f3f4f6',
              border: '1px solid',
              borderColor: showMap ? '#bfdbfe' : '#e5e7eb',
              color: showMap ? '#2563eb' : '#4b5563',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showMap ? 'Hide Map' : 'Show OpenFreeMap'}
          </button>
        </div>
      </div>

      {/* Discovery search bar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
          placeholder="Business type / vertical (e.g. Fintech, Dental Clinics, Digital Agencies, Logistics)"
          style={{
            flex: 1,
            height: 40,
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '0 14px',
            fontSize: 12.5,
            outline: 'none',
            background: '#fff',
            fontFamily: 'Montserrat, sans-serif',
          }}
        />
        <input
          type="text"
          value={locationStr}
          onChange={(e) => setLocationStr(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
          placeholder="Location / Radius (e.g. Lekki, Lagos, London, New York)"
          style={{
            width: 220,
            height: 40,
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '0 14px',
            fontSize: 12.5,
            outline: 'none',
            background: '#fff',
            fontFamily: 'Montserrat, sans-serif',
          }}
        />
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          title="Use my GPS location"
          style={{
            height: 40,
            padding: '0 12px',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <MapPinIcon size={13} color="#2563eb" />
          <span>GPS</span>
        </button>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          style={{
            height: 40,
            padding: '0 20px',
            background: '#2563eb',
            border: 0,
            color: '#fff',
            borderRadius: 10,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: searching ? 'wait' : 'pointer',
          }}
        >
          {searching ? 'Discovering...' : 'Search Businesses'}
        </button>
      </div>

      {/* Interactive OpenFreeMap View */}
      {showMap && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
              Nearby Business Map (OpenFreeMap Liberty Style)
            </span>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Showing {mapMarkers.length} qualified opportunities near your search center
            </span>
          </div>
          <OpenFreeMap
            center={centerCoords}
            zoom={12.5}
            markers={mapMarkers}
            selectedMarkerId={selectedLead?._id || selectedLead?.id}
            onSelectMarker={(id) => {
              const found = leads.find((l) => (l._id || l.id) === id);
              if (found) setSelectedLead(found);
            }}
            height={320}
          />
        </div>
      )}

      {/* Source pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
        <span style={{ fontWeight: 600, color: '#6b7280' }}>Filter Presence:</span>
        {(['All', 'Google', 'LinkedIn', 'Social'] as const).map((source) => (
          <button
            key={source}
            type="button"
            onClick={() => setActiveFilter(source)}
            style={{
              background: activeFilter === source ? '#0b0b0c' : '#f3f4f6',
              color: activeFilter === source ? '#fff' : '#4b5563',
              border: 0,
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {source === 'All'
              ? `All (${leads.length})`
              : source === 'Google'
              ? 'Google Maps'
              : source === 'LinkedIn'
              ? 'LinkedIn Presence'
              : 'Social (IG / X)'}
          </button>
        ))}
      </div>

      {/* Main Split View */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'start' }}>
        {/* Discovered Businesses List */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #eef0f4',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,.02)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1.2fr 110px',
              padding: '11px 16px',
              borderBottom: '1px solid #eef0f4',
              fontSize: 11,
              fontWeight: 700,
              color: '#8a8a92',
              background: '#fcfcfd',
            }}
          >
            <span>Business &amp; Opportunity</span>
            <span>Streamlined Contact</span>
            <span>Outreach Stage</span>
          </div>

          {loadingLeads && leads.length === 0 ? (
            <div style={{ padding: '36px 0', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
              Loading nearby businesses...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
              No qualified businesses in this view. Use the search bar above to discover businesses near you.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredLeads.map((b) => {
                const isSelected = (selectedLead?._id || selectedLead?.id) === (b._id || b.id);
                const primaryContact = b.contacts?.[0] || { name: 'Decision Maker', title: 'Executive' };

                return (
                  <div
                    key={b._id || b.id || b.name}
                    onClick={() => {
                      setSelectedLead(b);
                      if (b.location?.lat && b.location?.lng) {
                        setCenterCoords([b.location.lng, b.location.lat]);
                      }
                    }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.4fr 1.2fr 110px',
                      padding: '14px 16px',
                      borderBottom: '1px solid #f8fafc',
                      alignItems: 'center',
                      fontSize: 12,
                      cursor: 'pointer',
                      background: isSelected ? '#f8fafc' : '#fff',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, color: '#111827' }}>{b.name}</span>
                        {b.rating && (
                          <span style={{ fontSize: 10, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 2 }}>
                            {b.rating} <StarIcon size={10} color="#f59e0b" />
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>
                        {b.category} · <span style={{ color: '#059669', fontWeight: 600 }}>{b.distanceKm} km away</span>
                      </span>

                      {/* Opportunity flag */}
                      <span
                        style={{
                          fontSize: 10,
                          color: '#b45309',
                          background: '#fffbeb',
                          border: '1px solid #fef3c7',
                          borderRadius: 4,
                          padding: '1px 6px',
                          marginTop: 2,
                          alignSelf: 'flex-start',
                        }}
                      >
                        Opportunity: {b.qualificationReason || 'Digital conversion improvement'}
                      </span>
                    </div>

                    {/* Contact Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{primaryContact.name}</span>
                      <span style={{ fontSize: 10.5, color: '#6b7280' }}>{primaryContact.title}</span>
                      {primaryContact.email && (
                        <span style={{ fontSize: 10.5, color: '#2563eb' }}>{primaryContact.email}</span>
                      )}
                    </div>

                    {/* Stage Badge */}
                    <div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color:
                            b.stage === 'sequence_active'
                              ? '#059669'
                              : b.stage === 'pitch_drafted'
                              ? '#2563eb'
                              : '#6b7280',
                          background:
                            b.stage === 'sequence_active'
                              ? '#ecfdf5'
                              : b.stage === 'pitch_drafted'
                              ? '#eff6ff'
                              : '#f3f4f6',
                          borderRadius: 6,
                          padding: '3px 8px',
                        }}
                      >
                        {b.stage === 'sequence_active'
                          ? 'Sequence active'
                          : b.stage === 'pitch_drafted'
                          ? 'Pitch ready'
                          : 'Qualified'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Tailored Value Proposition & Sequence Pane */}
        {selectedLead && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Value Proposition Card */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #eef0f4',
                borderRadius: 14,
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Value Proposition</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#0f766e',
                    background: '#f0fdfa',
                    border: '1px solid #ccfbf1',
                    borderRadius: 6,
                    padding: '2px 7px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <SparklesIcon size={11} color="#0f766e" />
                  CV Aligned
                </span>
              </div>

              {/* Website & Tech Audit */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>
                  Digital Footprint Scan
                </span>
                <div style={{ fontSize: 11, color: '#374151', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div>
                    <strong>Website:</strong>{' '}
                    {selectedLead.websiteAudit?.hasWebsite
                      ? selectedLead.websiteUrl || 'Active domain'
                      : 'No website detected (Direct intake gap)'}
                  </div>
                  <div>
                    <strong>Mobile Optimized:</strong>{' '}
                    {selectedLead.websiteAudit?.mobileResponsive ? 'Yes' : 'No (High customer bounce rate)'}
                  </div>
                  {selectedLead.websiteAudit?.techStack?.length > 0 && (
                    <div>
                      <strong>Stack:</strong> {selectedLead.websiteAudit.techStack.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Tailored Pitch Preview */}
              <div
                style={{
                  background: '#f9fafb',
                  border: '1px solid #f3f4f6',
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' }}>
                    Tailored Pitch for {selectedLead.contacts?.[0]?.name || 'Hiring Lead'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRegeneratePitch(selectedLead)}
                    title="Regenerate pitch using latest CV data"
                    style={{
                      background: 'transparent',
                      border: 0,
                      color: '#2563eb',
                      fontSize: 10.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <RefreshCwIcon size={10} color="#2563eb" />
                    Regenerate
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: 11.5, color: '#1e293b', lineHeight: 1.5 }}>
                  "{selectedLead.pitchSnippet}"
                </p>
              </div>

              {/* Follow-up Sequence Cadence */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: '#6b7280' }}>
                <span style={{ fontWeight: 600, color: '#374151' }}>Automated Sequence Cadence:</span>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Day 0</span>
                  <span style={{ color: '#111827', fontWeight: 500 }}>Personalized value pitch via Email</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Day 3</span>
                  <span style={{ color: '#111827', fontWeight: 500 }}>WhatsApp / LinkedIn short follow-up</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Day 7</span>
                  <span style={{ color: '#111827', fontWeight: 500 }}>Case study &amp; portfolio teardown</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => handleStartSequence(selectedLead)}
                  style={{
                    flex: 1,
                    height: 38,
                    background: selectedLead.stage === 'sequence_active' ? '#10b981' : '#0b0b0c',
                    border: 0,
                    color: '#fff',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <MailIcon size={14} color="#fff" />
                  {selectedLead.stage === 'sequence_active'
                    ? 'Sequence Active'
                    : selectedLead.stage === 'sequence_paused'
                      ? 'Resume Sequence'
                      : 'Start Sequence'}
                </button>

                {selectedLead.stage === 'sequence_active' && (
                  <button
                    type="button"
                    onClick={() => handlePauseSequence(selectedLead)}
                    style={{
                      height: 38,
                      padding: '0 14px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Pause
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
