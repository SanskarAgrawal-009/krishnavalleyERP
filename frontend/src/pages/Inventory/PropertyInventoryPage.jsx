import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { projectService } from '../../services/projectService.js';
import { ManualProjectModal } from '../../components/manual/ManualProjectModal.jsx';
import { ManualBuildingModal } from '../../components/manual/ManualBuildingModal.jsx';
import { ManualFloorModal } from '../../components/manual/ManualFloorModal.jsx';
import { ManualFlatModal } from '../../components/manual/ManualFlatModal.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';

import {
  Building2,
  Home,
  Plus,
  MapPin,
  Layers,
  ChevronRight,
  Edit,
  Trash2,
  RefreshCw,
  ArrowRight,
  Filter,
  Search,
  X,
  RotateCcw,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const PropertyInventoryPage = () => {
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view');

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Hierarchy Selection State
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [flats, setFlats] = useState([]);

  // Flat Filter States
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all' | 'available' | 'sold' | 'hold' | 'rental'
  const [floorFilter, setFloorFilter] = useState('all');
  const [bhkFilter, setBhkFilter] = useState('all');
  const [flatSearchQuery, setFlatSearchQuery] = useState('');

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
  const [isFlatModalOpen, setIsFlatModalOpen] = useState(false);
  const [editingFlat, setEditingFlat] = useState(null);

  // Fetch Projects
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await projectService.getProjects();
      if (res.data) {
        setProjects(res.data);
        if (selectedProject) {
          const updatedProj = res.data.find((p) => p._id === selectedProject._id || p.id === selectedProject.id);
          if (updatedProj) {
            setSelectedProject(updatedProj);
            if (selectedBuilding) {
              const updatedBld = updatedProj.buildings?.find((b) => b._id === selectedBuilding._id || b.id === selectedBuilding.id);
              if (updatedBld) setSelectedBuilding(updatedBld);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sync with URL parameters
  useEffect(() => {
    if (projects.length > 0) {
      if (viewParam === 'projects' || (!viewParam && !selectedProject)) {
        setSelectedProject(null);
        setSelectedBuilding(null);
      } else if (viewParam === 'buildings') {
        const proj = selectedProject || projects[0];
        setSelectedProject(proj);
        setSelectedBuilding(null);
      } else if (viewParam === 'flats') {
        const proj = selectedProject || projects[0];
        setSelectedProject(proj);
        if (proj.buildings && proj.buildings.length > 0) {
          const bld = (selectedBuilding && proj.buildings.find(b => (b._id === selectedBuilding._id || b.id === selectedBuilding.id))) || proj.buildings[0];
          setSelectedBuilding(bld);
        }
      }
    }
  }, [viewParam, projects]);

  // Fetch Flats when building is selected
  const fetchFlats = async () => {
    if (!selectedBuilding || !selectedProject) return;
    try {
      const pId = selectedProject._id || selectedProject.id;
      const bId = selectedBuilding._id || selectedBuilding.id;
      const res = await projectService.getFlats({ projectId: pId, buildingId: bId });
      if (res.data) setFlats(res.data);
    } catch (error) {
      console.error('Error loading flats:', error);
    }
  };

  // Reset flat filters when selected building changes
  useEffect(() => {
    setAvailabilityFilter('all');
    setFloorFilter('all');
    setBhkFilter('all');
    setFlatSearchQuery('');
  }, [selectedBuilding]);

  // Flat Availability Counts
  const availableCount = flats.filter(f => (f.status || '').toLowerCase() === 'available').length;
  const soldCount = flats.filter(f => (f.status || '').toLowerCase() === 'sold').length;
  const holdCount = flats.filter(f => ['hold', 'booked', 'on_hold', 'pending'].includes((f.status || '').toLowerCase())).length;
  const rentalCount = flats.filter(f => f.takenForRental || (f.status || '').toLowerCase() === 'leased').length;

  const uniqueFloors = Array.from(new Set(flats.map(f => f.floor).filter(f => f !== undefined && f !== null))).sort((a, b) => a - b);
  const uniqueBhkTypes = Array.from(new Set(flats.map(f => f.bhkType).filter(Boolean))).sort();

  // Filtered Flats List
  const filteredFlats = flats.filter((flat) => {
    const status = (flat.status || '').toLowerCase();
    if (availabilityFilter === 'available' && status !== 'available') return false;
    if (availabilityFilter === 'sold' && status !== 'sold') return false;
    if (availabilityFilter === 'hold' && !['hold', 'booked', 'on_hold', 'pending'].includes(status)) return false;
    if (availabilityFilter === 'rental' && !flat.takenForRental && status !== 'leased') return false;

    if (floorFilter !== 'all' && String(flat.floor) !== String(floorFilter)) return false;
    if (bhkFilter !== 'all' && (flat.bhkType || '').toLowerCase() !== bhkFilter.toLowerCase()) return false;
    if (flatSearchQuery.trim() && !flat.flatNumber?.toLowerCase().includes(flatSearchQuery.trim().toLowerCase())) return false;

    return true;
  });

  const hasActiveFilters = availabilityFilter !== 'all' || floorFilter !== 'all' || bhkFilter !== 'all' || flatSearchQuery.trim() !== '';

  const resetFlatFilters = () => {
    setAvailabilityFilter('all');
    setFloorFilter('all');
    setBhkFilter('all');
    setFlatSearchQuery('');
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedBuilding) {
      fetchFlats();
    } else {
      setFlats([]);
    }
  }, [selectedBuilding]);

  // Project CRUD Handlers
  const handleSaveProject = async (data) => {
    try {
      if (editingProject) {
        const id = editingProject._id || editingProject.id;
        await projectService.updateProject(id, data);
      } else {
        await projectService.createProject(data);
      }
      setIsProjectModalOpen(false);
      setEditingProject(null);
      fetchProjects();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteProject = async (proj) => {
    if (window.confirm(`Are you sure you want to delete project "${proj.projectName}"?`)) {
      try {
        const id = proj._id || proj.id;
        await projectService.deleteProject(id);
        if (selectedProject && (selectedProject._id === id || selectedProject.id === id)) {
          setSelectedProject(null);
          setSelectedBuilding(null);
        }
        fetchProjects();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Building CRUD Handlers
  const handleAddBuilding = async (data) => {
    try {
      const pId = selectedProject._id || selectedProject.id;
      await projectService.addBuilding(pId, data);
      setIsBuildingModalOpen(false);
      fetchProjects();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteBuilding = async (bld) => {
    if (window.confirm(`Are you sure you want to delete building "${bld.buildingName}"?`)) {
      try {
        const pId = selectedProject._id || selectedProject.id;
        const bId = bld._id || bld.id;
        await projectService.deleteBuilding(pId, bId);
        if (selectedBuilding && (selectedBuilding._id === bId || selectedBuilding.id === bId)) {
          setSelectedBuilding(null);
        }
        fetchProjects();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Floor CRUD Handler
  const handleAddFloor = async (data) => {
    try {
      const pId = selectedProject._id || selectedProject.id;
      const bId = selectedBuilding._id || selectedBuilding.id;
      await projectService.addFloor(pId, bId, data);
      setIsFloorModalOpen(false);
      await fetchProjects();
      await fetchFlats();
    } catch (err) {
      alert(err.message || 'Failed to add floor');
    }
  };

  // Flat CRUD Handlers
  const handleSaveFlat = async (data) => {
    try {
      if (editingFlat) {
        const fId = editingFlat._id || editingFlat.id;
        await projectService.updateFlat(fId, data);
      } else {
        await projectService.createFlat(data);
      }
      setIsFlatModalOpen(false);
      setEditingFlat(null);
      fetchFlats();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteFlat = async (flat) => {
    if (window.confirm(`Are you sure you want to delete flat "${flat.flatNumber}"?`)) {
      try {
        const fId = flat._id || flat.id;
        await projectService.deleteFlat(fId);
        fetchFlats();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 className="font-headline-lg text-on-surface">Sites & Property Inventory</h2>
          <p className="font-body-md" style={{ color: '#414754', marginTop: '2px' }}>
            Multi-project master structure, building towers, and unit-level availability management.
          </p>
        </div>

        <button
          onClick={fetchProjects}
          title="Refresh Inventory"
          style={{
            background: '#ffffff',
            border: '1px solid #dadce0',
            color: '#414754',
            padding: '8px 14px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Sites
        </button>
      </div>

      {/* Breadcrumb Navigation Trail */}
      <div className="g-card" style={{
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.875rem' }}>
          <button
            onClick={() => {
              setSelectedProject(null);
              setSelectedBuilding(null);
            }}
            style={{
              background: !selectedProject ? '#d8e2ff' : 'transparent',
              color: !selectedProject ? '#00285c' : '#414754',
              fontWeight: !selectedProject ? '700' : '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '6px'
            }}
          >
            <Building2 size={16} color="#1a73e8" />
            All Projects ({projects.length})
          </button>

          {selectedProject && (
            <>
              <ChevronRight size={14} color="#727785" />
              <button
                onClick={() => setSelectedBuilding(null)}
                style={{
                  background: !selectedBuilding ? '#d8e2ff' : 'transparent',
                  color: !selectedBuilding ? '#00285c' : '#414754',
                  fontWeight: !selectedBuilding ? '700' : '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                <Layers size={15} color="#1a73e8" />
                {selectedProject.projectName} ({selectedProject.projectCode})
              </button>
            </>
          )}

          {selectedBuilding && (
            <>
              <ChevronRight size={14} color="#727785" />
              <span
                style={{
                  background: '#e8f0fe',
                  color: '#1a73e8',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  borderRadius: '6px'
                }}
              >
                <Home size={15} />
                {selectedBuilding.buildingName} ({selectedBuilding.buildingCode})
              </span>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setEditingProject(null); setIsProjectModalOpen(true); }}
            style={{
              background: '#1a73e8',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              border: 'none',
              boxShadow: '0 1px 2px rgba(26,115,232,0.2)'
            }}
          >
            <Plus size={15} /> Add Project
          </button>

          {selectedProject && (
            <button
              onClick={() => setIsBuildingModalOpen(true)}
              style={{
                background: '#ffffff',
                border: '1px solid #dadce0',
                color: '#1a73e8',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Plus size={15} /> Add Building
            </button>
          )}

          {selectedBuilding && (
            <button
              onClick={() => setIsFloorModalOpen(true)}
              style={{
                background: '#ffffff',
                border: '1px solid #dadce0',
                color: '#1a73e8',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Plus size={15} /> Add Floor
            </button>
          )}

          {selectedBuilding && (
            <button
              onClick={() => { setEditingFlat(null); setIsFlatModalOpen(true); }}
              style={{
                background: '#1a73e8',
                color: '#ffffff',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <Plus size={15} /> Add Flat
            </button>
          )}
        </div>
      </div>

      {/* TIER 1: ALL PROJECTS */}
      {!selectedProject && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#191c1d' }}>
              Projects Overview ({projects.length})
            </h3>
          </div>

          {projects.length === 0 ? (
            <div className="g-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
              <Building2 size={42} style={{ opacity: 0.3, margin: '0 auto 12px', color: '#727785' }} />
              <h3 style={{ color: '#191c1d', marginBottom: '6px', fontWeight: '700' }}>No Projects Registered</h3>
              <p style={{ fontSize: '0.85rem', color: '#414754', marginBottom: '16px' }}>
                Add your first real estate development project to start configuring buildings and flats.
              </p>
              <button
                onClick={() => { setEditingProject(null); setIsProjectModalOpen(true); }}
                style={{
                  background: '#1a73e8',
                  color: '#ffffff',
                  padding: '9px 18px',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                <Plus size={15} /> Add First Project
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
              {projects.map((proj) => {
                const bldsCount = proj.buildings?.length || 0;
                return (
                  <div
                    key={proj._id || proj.id}
                    className="g-card"
                    onClick={() => {
                      setSelectedProject(proj);
                      setSelectedBuilding(null);
                    }}
                    style={{
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#191c1d' }}>{proj.projectName}</h4>
                          <span style={{ fontSize: '0.72rem', background: '#e8f0fe', padding: '2px 6px', borderRadius: '4px', color: '#1a73e8', fontWeight: '700' }}>
                            {proj.projectCode}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#414754', marginTop: '4px' }}>
                          <MapPin size={13} color="#727785" />
                          {proj.address?.city}, {proj.address?.state}
                        </div>
                      </div>
                      <StatusBadge status={proj.status} />
                    </div>

                    <div style={{
                      background: '#f8f9fa',
                      border: '1px solid #dadce0',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      color: '#414754',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} color="#1a73e8" style={{ flexShrink: 0 }} />
                        <span>{proj.address?.addressLine1} {proj.address?.locality ? `• ${proj.address.locality}` : ''} ({proj.address?.pincode})</span>
                      </div>
                      <div style={{ color: '#191c1d', fontWeight: '600', marginTop: '2px' }}>
                        Registered Buildings: <span style={{ color: '#1a73e8' }}>{bldsCount}</span>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid #dadce0',
                      paddingTop: '12px'
                    }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProject(proj);
                            setIsProjectModalOpen(true);
                          }}
                          title="Edit Project"
                          style={{ background: '#f3f4f5', color: '#414754', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #dadce0' }}
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(proj);
                          }}
                          title="Delete Project"
                          style={{ background: '#ffdad6', color: '#ba1a1a', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #ffdad6' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <span style={{ fontSize: '0.8rem', color: '#1a73e8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Explore Buildings <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TIER 2: SELECTED PROJECT BUILDINGS */}
      {selectedProject && !selectedBuilding && (
        <div>
          <div className="g-card" style={{
            padding: '20px 24px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#191c1d' }}>{selectedProject.projectName}</h3>
                <span style={{ fontSize: '0.75rem', background: '#e8f0fe', padding: '2px 8px', borderRadius: '4px', color: '#1a73e8', fontWeight: '700' }}>
                  {selectedProject.projectCode}
                </span>
                <StatusBadge status={selectedProject.status} />
              </div>
              <div style={{ fontSize: '0.82rem', color: '#414754', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} color="#1a73e8" style={{ flexShrink: 0 }} />
                <span>{selectedProject.address?.addressLine1}, {selectedProject.address?.city}, {selectedProject.address?.state} - {selectedProject.address?.pincode}</span>
              </div>
            </div>

            <button
              onClick={() => setIsBuildingModalOpen(true)}
              style={{
                background: '#1a73e8',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <Plus size={15} /> Add Building
            </button>
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#191c1d', marginBottom: '14px' }}>
            Towers & Buildings ({selectedProject.buildings?.length || 0})
          </h3>

          {(!selectedProject.buildings || selectedProject.buildings.length === 0) ? (
            <div className="g-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Layers size={36} style={{ opacity: 0.3, margin: '0 auto 10px', color: '#727785' }} />
              <p style={{ color: '#414754', marginBottom: '14px' }}>No buildings added to this project yet.</p>
              <button
                onClick={() => setIsBuildingModalOpen(true)}
                style={{ background: '#1a73e8', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', border: 'none', fontWeight: '600' }}
              >
                <Plus size={14} /> Add First Building
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {selectedProject.buildings.map((bld) => (
                <div
                  key={bld._id || bld.id}
                  className="g-card"
                  onClick={() => setSelectedBuilding(bld)}
                  style={{
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#191c1d' }}>{bld.buildingName}</h4>
                        <span style={{ fontSize: '0.7rem', background: '#e8f0fe', padding: '2px 6px', borderRadius: '4px', color: '#1a73e8', fontWeight: '700' }}>
                          {bld.buildingCode}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#414754', marginTop: '2px' }}>
                        Total Floors: <strong>{bld.numberOfFloors}</strong>
                      </div>
                    </div>
                    <StatusBadge status={bld.status} />
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid #dadce0',
                    paddingTop: '10px',
                    marginTop: '4px'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBuilding(bld);
                      }}
                      title="Delete Building"
                      style={{ background: '#ffdad6', color: '#ba1a1a', padding: '5px 8px', borderRadius: '4px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', border: '1px solid #ffdad6' }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>

                    <span style={{ fontSize: '0.8rem', color: '#1a73e8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      View Flats <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TIER 3: SELECTED BUILDING FLATS */}
      {selectedBuilding && (
        <div>
          <div className="g-card" style={{
            padding: '18px 24px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#191c1d' }}>{selectedBuilding.buildingName}</h3>
                <span style={{ fontSize: '0.72rem', background: '#e8f0fe', padding: '2px 8px', borderRadius: '4px', color: '#1a73e8', fontWeight: '700' }}>
                  {selectedBuilding.buildingCode}
                </span>
                <StatusBadge status={selectedBuilding.status} />
              </div>
              <div style={{ fontSize: '0.8rem', color: '#414754', marginTop: '2px' }}>
                Project: {selectedProject.projectName} • Floors: {selectedBuilding.numberOfFloors} • Flats: {flats.length}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setIsFloorModalOpen(true)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #dadce0',
                  color: '#1a73e8',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={15} /> Add Floor
              </button>

              <button
                onClick={() => { setEditingFlat(null); setIsFlatModalOpen(true); }}
                style={{
                  background: '#1a73e8',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                <Plus size={15} /> Add Flat Manually
              </button>
            </div>
          </div>

          {flats.length === 0 ? (
            <div className="g-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Home size={36} style={{ opacity: 0.3, margin: '0 auto 10px', color: '#727785' }} />
              <p style={{ color: '#414754', marginBottom: '14px' }}>No flats added to this building yet.</p>
              <button
                onClick={() => { setEditingFlat(null); setIsFlatModalOpen(true); }}
                style={{ background: '#1a73e8', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', border: 'none', fontWeight: '600' }}
              >
                <Plus size={14} /> Add First Flat
              </button>
            </div>
          ) : (
            <div>
              {/* Flat Filter & Search Controls */}
              <div className="g-card" style={{
                padding: '16px 20px',
                marginBottom: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                background: '#ffffff',
                border: '1px solid #dadce0',
                borderRadius: '12px'
              }}>
                {/* Availability Status Filter Tabs */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      color: '#414754',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      marginRight: '4px'
                    }}>
                      <Filter size={15} color="#1a73e8" />
                      <span>Availability:</span>
                    </div>

                    {/* All Flats */}
                    <button
                      onClick={() => setAvailabilityFilter('all')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: availabilityFilter === 'all' ? '700' : '500',
                        background: availabilityFilter === 'all' ? '#1a73e8' : '#f1f3f4',
                        color: availabilityFilter === 'all' ? '#ffffff' : '#3c4043',
                        border: availabilityFilter === 'all' ? '1px solid #1a73e8' : '1px solid #dadce0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>All</span>
                      <span style={{
                        background: availabilityFilter === 'all' ? 'rgba(255,255,255,0.25)' : '#e8eaed',
                        color: availabilityFilter === 'all' ? '#ffffff' : '#5f6368',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '0.72rem',
                        fontWeight: '700'
                      }}>
                        {flats.length}
                      </span>
                    </button>

                    {/* Available */}
                    <button
                      onClick={() => setAvailabilityFilter('available')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: availabilityFilter === 'available' ? '700' : '600',
                        background: availabilityFilter === 'available' ? '#137333' : '#e6f4ea',
                        color: availabilityFilter === 'available' ? '#ffffff' : '#137333',
                        border: availabilityFilter === 'available' ? '1px solid #137333' : '1px solid #ceead6',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <CheckCircle2 size={13} />
                      <span>Available</span>
                      <span style={{
                        background: availabilityFilter === 'available' ? 'rgba(255,255,255,0.25)' : '#ceead6',
                        color: availabilityFilter === 'available' ? '#ffffff' : '#0d652d',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '0.72rem',
                        fontWeight: '700'
                      }}>
                        {availableCount}
                      </span>
                    </button>

                    {/* Sold */}
                    <button
                      onClick={() => setAvailabilityFilter('sold')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: availabilityFilter === 'sold' ? '700' : '600',
                        background: availabilityFilter === 'sold' ? '#5f6368' : '#f1f3f4',
                        color: availabilityFilter === 'sold' ? '#ffffff' : '#5f6368',
                        border: availabilityFilter === 'sold' ? '1px solid #5f6368' : '1px solid #dadce0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>Sold</span>
                      <span style={{
                        background: availabilityFilter === 'sold' ? 'rgba(255,255,255,0.25)' : '#dadce0',
                        color: availabilityFilter === 'sold' ? '#ffffff' : '#414754',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '0.72rem',
                        fontWeight: '700'
                      }}>
                        {soldCount}
                      </span>
                    </button>

                    {/* On Hold / Booked */}
                    <button
                      onClick={() => setAvailabilityFilter('hold')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: availabilityFilter === 'hold' ? '700' : '600',
                        background: availabilityFilter === 'hold' ? '#b06000' : '#fef7e0',
                        color: availabilityFilter === 'hold' ? '#ffffff' : '#b06000',
                        border: availabilityFilter === 'hold' ? '1px solid #b06000' : '1px solid #feefc3',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Clock size={13} />
                      <span>On Hold / Booked</span>
                      <span style={{
                        background: availabilityFilter === 'hold' ? 'rgba(255,255,255,0.25)' : '#feefc3',
                        color: availabilityFilter === 'hold' ? '#ffffff' : '#8c4800',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '0.72rem',
                        fontWeight: '700'
                      }}>
                        {holdCount}
                      </span>
                    </button>

                    {/* Rental Program */}
                    <button
                      onClick={() => setAvailabilityFilter('rental')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: availabilityFilter === 'rental' ? '700' : '600',
                        background: availabilityFilter === 'rental' ? '#7e22ce' : '#f3e8fd',
                        color: availabilityFilter === 'rental' ? '#ffffff' : '#7e22ce',
                        border: availabilityFilter === 'rental' ? '1px solid #7e22ce' : '1px solid #e9d5ff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>Rental Program</span>
                      <span style={{
                        background: availabilityFilter === 'rental' ? 'rgba(255,255,255,0.25)' : '#e9d5ff',
                        color: availabilityFilter === 'rental' ? '#ffffff' : '#6b21a8',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '0.72rem',
                        fontWeight: '700'
                      }}>
                        {rentalCount}
                      </span>
                    </button>
                  </div>

                  {/* Summary & Clear Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.82rem', color: '#5f6368', fontWeight: '500' }}>
                      Showing <strong>{filteredFlats.length}</strong> of <strong>{flats.length}</strong> flats
                    </span>
                    {hasActiveFilters && (
                      <button
                        onClick={resetFlatFilters}
                        style={{
                          background: '#fff0ef',
                          border: '1px solid #ffcdd2',
                          color: '#c62828',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <RotateCcw size={12} /> Clear Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Secondary Search & Floor / BHK Dropdown Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                  borderTop: '1px solid #f1f3f4',
                  paddingTop: '12px'
                }}>
                  {/* Search Flat Number */}
                  <div style={{
                    position: 'relative',
                    flex: '1 1 200px',
                    minWidth: '180px'
                  }}>
                    <Search size={14} color="#727785" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Search flat number (e.g. 1003, A237)..."
                      value={flatSearchQuery}
                      onChange={(e) => setFlatSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 30px 7px 32px',
                        borderRadius: '6px',
                        border: '1px solid #dadce0',
                        fontSize: '0.82rem',
                        boxSizing: 'border-box',
                        outline: 'none'
                      }}
                    />
                    {flatSearchQuery && (
                      <button
                        onClick={() => setFlatSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          color: '#727785'
                        }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Floor Dropdown */}
                  {uniqueFloors.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#5f6368', fontWeight: '500' }}>Floor:</span>
                      <select
                        value={floorFilter}
                        onChange={(e) => setFloorFilter(e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #dadce0',
                          fontSize: '0.82rem',
                          background: '#ffffff',
                          color: '#3c4043',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="all">All Floors ({uniqueFloors.length})</option>
                        {uniqueFloors.map((floor) => (
                          <option key={floor} value={floor}>Floor {floor}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* BHK Configuration Dropdown */}
                  {uniqueBhkTypes.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#5f6368', fontWeight: '500' }}>Configuration:</span>
                      <select
                        value={bhkFilter}
                        onChange={(e) => setBhkFilter(e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #dadce0',
                          fontSize: '0.82rem',
                          background: '#ffffff',
                          color: '#3c4043',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="all">All BHKs</option>
                        {uniqueBhkTypes.map((bhk) => (
                          <option key={bhk} value={bhk}>{bhk}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Flats Listing / Empty State */}
              {filteredFlats.length === 0 ? (
                <div className="g-card" style={{ textAlign: 'center', padding: '50px 20px', background: '#ffffff', borderRadius: '12px', border: '1px solid #dadce0' }}>
                  <Filter size={40} style={{ opacity: 0.35, margin: '0 auto 12px', color: '#727785' }} />
                  <h4 style={{ color: '#191c1d', fontWeight: '700', marginBottom: '6px', fontSize: '1.05rem' }}>
                    No Flats Match Your Filters
                  </h4>
                  <p style={{ fontSize: '0.84rem', color: '#5f6368', marginBottom: '16px', maxWidth: '400px', margin: '0 auto 16px' }}>
                    There are no units matching the selected availability status or search terms in {selectedBuilding.buildingName}.
                  </p>
                  <button
                    onClick={resetFlatFilters}
                    style={{
                      background: '#1a73e8',
                      color: '#ffffff',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <RotateCcw size={14} /> Show All Flats ({flats.length})
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '14px' }}>
                  {filteredFlats.map((flat) => (
                <div
                  key={flat._id || flat.id}
                  className="g-card"
                  style={{
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: '#e8f0fe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1a73e8',
                        fontWeight: '800'
                      }}>
                        <Home size={16} />
                      </div>
                      <span style={{ fontSize: '1.05rem', fontWeight: '700', color: '#191c1d' }}>{flat.flatNumber}</span>
                    </div>
                    <StatusBadge status={flat.status} />
                  </div>

                  <div style={{
                    background: '#f8f9fa',
                    border: '1px solid #dadce0',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    color: '#414754'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Floor:</span>
                      <strong style={{ color: '#191c1d' }}>Floor {flat.floor || 1}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Configuration:</span>
                      <strong style={{ color: '#191c1d' }}>{flat.bhkType || '2BHK'} ({flat.carpetArea || 950} sq.ft)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Rental Program:</span>
                      <strong style={{ color: flat.takenForRental ? '#137333' : '#727785' }}>
                        {flat.takenForRental ? 'Taken for Rental' : 'Available'}
                      </strong>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '6px',
                    borderTop: '1px solid #dadce0',
                    paddingTop: '8px'
                  }}>
                    <button
                      onClick={() => {
                        setEditingFlat(flat);
                        setIsFlatModalOpen(true);
                      }}
                      style={{ padding: '5px 8px', background: '#f3f4f5', borderRadius: '4px', color: '#414754', cursor: 'pointer', border: '1px solid #dadce0' }}
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteFlat(flat)}
                      style={{ padding: '5px 8px', background: '#ffdad6', borderRadius: '4px', color: '#ba1a1a', cursor: 'pointer', border: '1px solid #ffdad6' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL DIALOGS FOR INVENTORY MANUAL ENTRY */}
      <ManualProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSubmit={handleSaveProject}
        project={editingProject}
      />

      <ManualBuildingModal
        isOpen={isBuildingModalOpen}
        onClose={() => setIsBuildingModalOpen(false)}
        onSubmit={handleAddBuilding}
        projectName={selectedProject?.projectName}
      />

      <ManualFloorModal
        isOpen={isFloorModalOpen}
        onClose={() => setIsFloorModalOpen(false)}
        onSubmit={handleAddFloor}
        projectName={selectedProject?.projectName}
        building={selectedBuilding}
      />

      <ManualFlatModal
        isOpen={isFlatModalOpen}
        onClose={() => setIsFlatModalOpen(false)}
        onSubmit={handleSaveFlat}
        projectId={selectedProject?._id || selectedProject?.id}
        buildingId={selectedBuilding?._id || selectedBuilding?.id}
        buildingName={selectedBuilding?.buildingName}
        flat={editingFlat}
      />
    </div>
  );
};
