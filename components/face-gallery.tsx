'use client';

import { useState } from 'react';
import { Camera, Clock, AlertTriangle, Users, Grid3X3, User, ChevronLeft, Download } from 'lucide-react';
import type { FaceEntry } from '@/lib/types';

export type { FaceEntry };

export function InlineGallery({ faces }: { faces: FaceEntry[] }) {
  const [tab, setTab] = useState<'captures' | 'persons'>('captures');
  const [selectedFrame, setSelectedFrame] = useState<FaceEntry | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<number | null>(null);

  // Group faces by personId — merge all negative/undefined IDs into one "Unidentified" group
  const personGroups = new Map<number, FaceEntry[]>();
  faces.forEach(f => {
    const pid = (f.personId && f.personId > 0) ? f.personId : 0; // 0 = unidentified
    if (!personGroups.has(pid)) personGroups.set(pid, []);
    personGroups.get(pid)!.push(f);
  });
  // Sort: recognized persons first (by sighting count), unidentified last
  const uniquePersons = Array.from(personGroups.entries()).sort((a, b) => {
    if (a[0] === 0) return 1;  // unidentified goes last
    if (b[0] === 0) return -1;
    return b[1].length - a[1].length;
  });

  if (faces.length === 0) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-red-400" />
          <span className="text-sm font-semibold text-white">Detection Gallery</span>
          <span className="text-xs text-gray-500">{faces.length} capture{faces.length !== 1 ? 's' : ''}</span>
        </div>
        {/* Tab switcher */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
          <button onClick={() => { setTab('captures'); setSelectedPerson(null); setSelectedFrame(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === 'captures' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            <Grid3X3 className="w-3 h-3" />All Captures
          </button>
          <button onClick={() => { setTab('persons'); setSelectedFrame(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === 'persons' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            <Users className="w-3 h-3" />{uniquePersons.length} Person{uniquePersons.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Full frame view */}
        {selectedFrame && (
          <div className="mb-4">
            <button onClick={() => setSelectedFrame(null)} className="text-xs text-blue-400 hover:text-blue-300 mb-2 flex items-center gap-1">
              <ChevronLeft className="w-3 h-3" />Back to gallery
            </button>
            <img src={selectedFrame.fullFrame} alt="Full frame" className="w-full rounded-xl border border-white/10 mb-2" />
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="text-red-400 font-medium">{selectedFrame.confidence}%</span>
              <span>{selectedFrame.alertDescription}</span>
              <span className="ml-auto"><Clock className="w-3 h-3 inline mr-1" />{new Date(selectedFrame.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        )}

        {/* All Captures tab */}
        {tab === 'captures' && !selectedFrame && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {faces.map(face => (
              <button key={face.id} onClick={() => setSelectedFrame(face)}
                className="group relative rounded-xl overflow-hidden border border-white/10 hover:border-red-500/50 transition-all aspect-square">
                <img src={face.faceImage} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                  <p className="text-[9px] text-white truncate">{new Date(face.timestamp).toLocaleTimeString()}</p>
                  <p className="text-[8px] text-red-300">{face.confidence}%{face.personId ? ` · P${face.personId}` : ''}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Unique Persons tab */}
        {tab === 'persons' && !selectedFrame && !selectedPerson && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {uniquePersons.map(([personId, entries]) => (
              <button key={personId} onClick={() => setSelectedPerson(personId)}
                className="group bg-white/5 border border-white/10 rounded-xl p-3 hover:border-red-500/30 transition-all text-left">
                <div className="flex items-center gap-3 mb-2">
                  <img src={entries[0].faceImage} alt="" className="w-12 h-12 rounded-lg object-cover border-2 border-red-500/50" />
                  <div>
                    <p className="text-sm font-semibold text-white flex items-center gap-1">
                      <User className="w-3 h-3 text-red-400" />
                      {personId > 0 ? `Person ${personId}` : `Unidentified`}
                    </p>
                    <p className="text-[10px] text-gray-500">{entries.length} event{entries.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                {/* Mini timeline of appearances */}
                <div className="flex gap-1 overflow-hidden">
                  {entries.slice(0, 4).map((e, i) => (
                    <img key={i} src={e.faceImage} alt="" className="w-8 h-8 rounded object-cover border border-white/10 shrink-0" />
                  ))}
                  {entries.length > 4 && (
                    <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-[10px] text-gray-400 shrink-0">
                      +{entries.length - 4}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Person detail view — all events for selected person */}
        {tab === 'persons' && selectedPerson !== null && !selectedFrame && (
          <div>
            <button onClick={() => setSelectedPerson(null)} className="text-xs text-blue-400 hover:text-blue-300 mb-3 flex items-center gap-1">
              <ChevronLeft className="w-3 h-3" />Back to all persons
            </button>
            {(() => {
              const entries = personGroups.get(selectedPerson) || [];
              return (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <img src={entries[0]?.faceImage} alt="" className="w-14 h-14 rounded-xl object-cover border-2 border-red-500" />
                    <div>
                      <h3 className="text-base font-bold text-white">Person {selectedPerson || '?'}</h3>
                      <p className="text-xs text-gray-500">Appeared in {entries.length} detection{entries.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {entries.map(entry => (
                      <button key={entry.id} onClick={() => setSelectedFrame(entry)}
                        className="rounded-xl overflow-hidden border border-white/10 hover:border-red-500/50 transition-all">
                        <img src={entry.fullFrame} alt="" className="w-full aspect-video object-cover" />
                        <div className="p-2 bg-white/5">
                          <p className="text-[10px] text-red-400 font-medium">{entry.confidence}% confidence</p>
                          <p className="text-[9px] text-gray-500 truncate">{entry.alertDescription}</p>
                          <p className="text-[9px] text-gray-600"><Clock className="w-2.5 h-2.5 inline mr-0.5" />{new Date(entry.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
