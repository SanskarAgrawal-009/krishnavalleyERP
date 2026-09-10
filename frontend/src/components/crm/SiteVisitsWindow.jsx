import {
  Car,
  Calendar,
  Clock,
  CheckCircle2,
  Star,
  Users,
  Home,
  MapPin,
  RefreshCw,
  Search,
  X,
  ArrowRight,
  UserCheck,
  Bell
} from 'lucide-react';

export const SiteVisitsWindow = ({
  allSiteVisits = [],
  displayedSiteVisits = [],
  siteVisitSearch = '',
  setSiteVisitSearch,
  siteVisitFilter = 'all',
  setSiteVisitFilter,
  scheduledVisitsCount = 0,
  completedVisitsCount = 0,
  highInterestVisitsCount = 0,
  cabVisitsCount = 0,
  loading = false,
  onRefresh,
  onScheduleVisit,
  onLogWalkInVisit,
  onCompleteTour,
  onOpenLeadDrawer,
  onSendReminder
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ========================================================================= */}
      {/* 1. TOP TOOLBAR: SEARCH INPUT, SUB-FILTER TABS & FAST ACTION BUTTONS       */}
      {/* ========================================================================= */}
      <div className="g-card" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px', borderRadius: '12px' }}>
        {/* Top Controls Row */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {/* Integrated Search Input */}
          <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search site visits by visitor name, phone, flat/unit, executive, cab/driver..."
              value={siteVisitSearch}
              onChange={(e) => setSiteVisitSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.86rem',
                outline: 'none',
                boxSizing: 'border-box',
                background: '#ffffff',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#7c3aed';
                e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.12)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.boxShadow = 'none';
              }}
            />
            {siteVisitSearch && (
              <button
                type="button"
                onClick={() => setSiteVisitSearch('')}
                title="Clear Search"
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Action Buttons: Refresh, + Schedule Visit, + Log Walk-in */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
            {/* Refresh Button */}
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh Site Visits"
              style={{
                height: '38px',
                width: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>

            {/* Schedule Site Visit Button */}
            <button
              type="button"
              onClick={onScheduleVisit}
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 5px rgba(37,99,235,0.25)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.06)'}
              onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
            >
              <Calendar size={15} />
              <span>+ Schedule Site Visit</span>
            </button>

            {/* Log Walk-in Tour Button */}
            <button
              type="button"
              onClick={onLogWalkInVisit}
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 5px rgba(22,163,74,0.25)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.06)'}
              onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
            >
              <Car size={15} />
              <span>+ Log Completed Tour</span>
            </button>
          </div>
        </div>

        {/* Sub-Filter Segmented Tabs */}
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '10px',
          alignItems: 'center',
          scrollbarWidth: 'none'
        }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '4px', flexShrink: 0 }}>
            Show:
          </span>

          {[
            { id: 'all', label: 'All Site Visits', count: allSiteVisits.length, color: '#7c3aed' },
            { id: 'scheduled', label: '📅 Scheduled & Upcoming', count: scheduledVisitsCount, color: '#2563eb' },
            { id: 'completed', label: '✅ Completed Tours', count: completedVisitsCount, color: '#16a34a' },
            { id: 'high_interest', label: '⭐ High Interest (4-5★)', count: highInterestVisitsCount, color: '#d97706' },
            { id: 'cab', label: '🚗 Cab Assisted', count: cabVisitsCount, color: '#0284c7' },
          ].map((tab) => {
            const isActive = siteVisitFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSiteVisitFilter(tab.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.76rem',
                  fontWeight: isActive ? '800' : '600',
                  border: isActive ? `1px solid ${tab.color}` : '1px solid #e2e8f0',
                  background: isActive ? (tab.id === 'scheduled' ? '#eff6ff' : (tab.id === 'completed' ? '#f0fdf4' : (tab.id === 'high_interest' ? '#fffbeb' : (tab.id === 'cab' ? '#f0f9ff' : '#f5f3ff')))) : '#ffffff',
                  color: isActive ? tab.color : '#475569',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: '800',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: isActive ? tab.color : '#f1f5f9',
                  color: isActive ? '#ffffff' : '#64748b',
                  minWidth: '16px',
                  textAlign: 'center'
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}

          {/* Reset Filters button */}
          {(siteVisitSearch || siteVisitFilter !== 'all') && (
            <button
              type="button"
              onClick={() => { setSiteVisitSearch(''); setSiteVisitFilter('all'); }}
              style={{
                padding: '4px 10px',
                borderRadius: '14px',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#dc2626',
                fontSize: '0.74rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginLeft: 'auto'
              }}
            >
              <X size={12} /> Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SITE VISITS DIRECTORY TABLE & CARDS                                    */}
      {/* ========================================================================= */}
      {displayedSiteVisits.length === 0 ? (
        <div className="g-card" style={{ textAlign: 'center', padding: '60px 24px', borderRadius: '12px' }}>
          <Car size={48} style={{ opacity: 0.25, margin: '0 auto 16px', color: '#7c3aed' }} />
          <h3 style={{ color: '#111827', marginBottom: '8px', fontWeight: '800', fontSize: '1.2rem' }}>
            No Site Visits Found
          </h3>
          <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: '20px', fontWeight: '500', maxWidth: '440px', margin: '0 auto 20px' }}>
            {siteVisitSearch || siteVisitFilter !== 'all'
              ? 'No property tours match your active sub-filter or search query.'
              : 'No client site visits have been recorded yet. Use the buttons above to schedule upcoming tours or log walk-in visits.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {(siteVisitSearch || siteVisitFilter !== 'all') && (
              <button
                type="button"
                onClick={() => { setSiteVisitSearch(''); setSiteVisitFilter('all'); }}
                className="btn-secondary"
                style={{ padding: '8px 18px', fontSize: '0.84rem' }}
              >
                Reset Filters
              </button>
            )}
            <button
              type="button"
              onClick={onScheduleVisit}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: '#2563eb',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Calendar size={15} /> Schedule Site Visit
            </button>
          </div>
        </div>
      ) : (
        <div className="g-card" style={{ padding: '0', borderRadius: '12px', overflow: 'hidden', width: '100%', boxSizing: 'border-box' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 18px', width: '25%', fontSize: '0.74rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  VISITOR / PROSPECT
                </th>
                <th style={{ padding: '14px 16px', width: '27%', fontSize: '0.74rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  SCHEDULE & STATUS
                </th>
                <th style={{ padding: '14px 16px', width: '18%', fontSize: '0.74rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  UNIT INSPECTED
                </th>
                <th style={{ padding: '14px 16px', width: '18%', fontSize: '0.74rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  EXECUTIVE & CAB LOGISTICS
                </th>
                <th style={{ padding: '14px 18px', width: '12%', textAlign: 'right', fontSize: '0.74rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedSiteVisits.map((visit) => {
                const isScheduled = visit.status === 'scheduled';
                const visitDateObj = visit.visitDate ? new Date(visit.visitDate) : null;
                const isValidDate = visitDateObj && !isNaN(visitDateObj.getTime());
                const isToday = isValidDate && visitDateObj.toDateString() === new Date().toDateString();
                const isPastDue = isScheduled && isValidDate && visitDateObj < new Date() && !isToday;

                return (
                  <tr
                    key={visit.id}
                    onClick={() => {
                      if (visit.leadRef) onOpenLeadDrawer(visit.leadRef);
                    }}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      cursor: visit.leadRef ? 'pointer' : 'default',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {/* Column 1: VISITOR / PROSPECT */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '800', fontSize: '0.94rem', color: '#0f172a' }}>
                          {visit.visitorName}
                        </span>
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: '800',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: visit.source === 'Site Visit Log' ? '#ede9fe' : (visit.source === 'Scheduled Follow-Up' ? '#eff6ff' : '#f1f5f9'),
                          color: visit.source === 'Site Visit Log' ? '#7c3aed' : (visit.source === 'Scheduled Follow-Up' ? '#1d4ed8' : '#475569'),
                          border: '1px solid rgba(0,0,0,0.06)'
                        }}>
                          {visit.source}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontWeight: '700', color: '#334155' }}>
                          📞 {visit.visitorPhone || 'No phone'}
                        </span>
                        {(visit.city || visit.state) && (
                          <>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#64748b' }}>
                              <MapPin size={11} color="#94a3b8" />
                              {[visit.city, visit.state].filter(Boolean).join(', ')}
                            </span>
                          </>
                        )}
                      </div>

                      {visit.visitorEmail && (
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                          ✉️ {visit.visitorEmail}
                        </div>
                      )}
                    </td>

                    {/* Column 2: SCHEDULE & STATUS */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      {/* Status Badge + Date */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        {isScheduled ? (
                          isPastDue ? (
                            <span style={{ fontSize: '0.7rem', fontWeight: '800', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '2px 7px', borderRadius: '5px' }}>
                              ⚠️ Tour Due
                            </span>
                          ) : isToday ? (
                            <span style={{ fontSize: '0.7rem', fontWeight: '800', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '2px 7px', borderRadius: '5px' }}>
                              ⏰ Today's Visit
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', fontWeight: '800', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 7px', borderRadius: '5px' }}>
                              📅 Upcoming Visit
                            </span>
                          )
                        ) : (
                          <span style={{ fontSize: '0.7rem', fontWeight: '800', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 7px', borderRadius: '5px' }}>
                            ✅ Tour Completed
                          </span>
                        )}

                        {isValidDate && (
                          <span style={{ fontSize: '0.76rem', fontWeight: '700', color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} color="#64748b" />
                            {visitDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at {visitDateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {/* Star Rating if completed */}
                      {visit.interestRating && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={13}
                                color="#f59e0b"
                                fill={visit.interestRating >= s ? '#f59e0b' : 'none'}
                              />
                            ))}
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#b45309' }}>
                            ({visit.interestRating}/5 {visit.interestRating >= 4 ? 'High Interest' : ''})
                          </span>
                        </div>
                      )}

                      {/* Remarks / Feedback */}
                      {visit.feedback && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={visit.feedback}>
                          "{visit.feedback}"
                        </div>
                      )}
                      {visit.nextStep && (
                        <div style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: '600', marginTop: '2px' }}>
                          🎯 Next: {visit.nextStep}
                        </div>
                      )}
                    </td>

                    {/* Column 3: UNIT INSPECTED */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      <div style={{
                        background: '#faf5ff',
                        border: '1px solid #e9d5ff',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        marginBottom: '4px'
                      }}>
                        <Home size={12} color="#9333ea" />
                        <span style={{ fontWeight: '800', color: '#7e22ce', fontSize: '0.76rem' }}>
                          {visit.flatNumber ? `Flat ${visit.flatNumber}` : (visit.flatLabel || 'Project Tour')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>
                        {visit.projectName || 'Krishna Valley'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
                        <Users size={11} /> {visit.partySize || 1} Visitor(s)
                      </div>
                    </td>

                    {/* Column 4: EXECUTIVE & CAB LOGISTICS */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <UserCheck size={13} color="#16a34a" />
                        <span>{visit.accompaniedBy || 'Sales Executive'}</span>
                      </div>

                      {/* Cab Logistics */}
                      {visit.isCabProvided ? (
                        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '4px 7px', fontSize: '0.72rem' }}>
                          <div style={{ fontWeight: '800', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Car size={11} />
                            <span>Cab: {visit.cabDetails?.cabNumber || 'Arranged'}</span>
                          </div>
                          {visit.cabDetails?.driverName && (
                            <div style={{ color: '#0284c7', marginTop: '2px' }}>
                              Driver: {visit.cabDetails.driverName} {visit.cabDetails.driverPhone ? `(📞 ${visit.cabDetails.driverPhone})` : ''}
                            </div>
                          )}
                          {visit.cabDetails?.pickupLocation && (
                            <div style={{ color: '#64748b', marginTop: '1px', fontSize: '0.68rem' }}>
                              📍 {visit.cabDetails.pickupLocation}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          🚶 Self-Arranged / Walk-in
                        </div>
                      )}
                    </td>

                    {/* Column 5: ACTION */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                        {isScheduled && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSendReminder) onSendReminder(visit);
                              }}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '6px',
                                border: '1px solid #fde68a',
                                background: '#fffbeb',
                                color: '#b45309',
                                fontSize: '0.72rem',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap'
                              }}
                              title="Send 30-Minute Reminder to Client (by Handling Executive) or Sales Rep via WhatsApp / Email"
                            >
                              <Bell size={11} color="#b45309" />
                              <span>Remind</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCompleteTour(visit);
                              }}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#16a34a',
                                color: '#ffffff',
                                fontSize: '0.72rem',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 1px 3px rgba(22,163,74,0.3)',
                                whiteSpace: 'nowrap'
                              }}
                              title="Record completed tour feedback & rating"
                            >
                              <CheckCircle2 size={11} />
                              <span>Complete</span>
                            </button>
                          </div>
                        )}

                        {visit.leadRef && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenLeadDrawer(visit.leadRef);
                            }}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #bfdbfe',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap'
                            }}
                            title="Open Lead Workspace Drawer"
                          >
                            <span>Lead Workspace</span>
                            <ArrowRight size={11} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Table Summary Footer */}
          <div style={{
            padding: '12px 18px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#475569',
            fontWeight: '600',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              Showing <span style={{ color: '#0f172a', fontWeight: '800' }}>{displayedSiteVisits.length}</span> of {allSiteVisits.length} Site Visits (Window 3: Site Visits)
            </div>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Scheduled: <strong style={{ color: '#2563eb' }}>{scheduledVisitsCount}</strong></span>
              <span>Completed: <strong style={{ color: '#16a34a' }}>{completedVisitsCount}</strong></span>
              <span>High Interest: <strong style={{ color: '#d97706' }}>{highInterestVisitsCount}</strong></span>
              <span>Cab Logistics: <strong style={{ color: '#0284c7' }}>{cabVisitsCount}</strong></span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SiteVisitsWindow;
