"use client";

import { useState, useEffect } from "react";
import { BookingSettings, DEFAULT_SETTINGS } from "@/types/booking";
import { getSettings, saveSettings } from "@/lib/booking/settings";

export default function SettingsForm() {
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGeocodeAddress = async () => {
    if (!settings.homeBaseAddress) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `/api/booking/directions?geocode=${encodeURIComponent(settings.homeBaseAddress)}`
      );
      const data = await res.json();
      if (data.lat && data.lng) {
        setSettings((s) => ({ ...s, homeBaseLat: data.lat, homeBaseLng: data.lng }));
      }
    } catch {
      // geocoding failed silently
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Adresse de base (domicile / bureau)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={settings.homeBaseAddress}
            onChange={(e) =>
              setSettings((s) => ({ ...s, homeBaseAddress: e.target.value }))
            }
            placeholder="123 rue Exemple, Montreal, QC"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button
            onClick={handleGeocodeAddress}
            disabled={geocoding || !settings.homeBaseAddress}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
          >
            {geocoding ? "..." : "Localiser"}
          </button>
        </div>
        {settings.homeBaseLat !== DEFAULT_SETTINGS.homeBaseLat && (
          <p className="text-xs text-gray-400 mt-1">
            Coords: {settings.homeBaseLat.toFixed(4)}, {settings.homeBaseLng.toFixed(4)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duree par defaut (min)
          </label>
          <input
            type="number"
            value={settings.defaultAppointmentDuration}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                defaultAppointmentDuration: Number(e.target.value),
              }))
            }
            min={15}
            max={240}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trajet max acceptable (min)
          </label>
          <input
            type="number"
            value={settings.maxAcceptableTravelMinutes}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                maxAcceptableTravelMinutes: Number(e.target.value),
              }))
            }
            min={10}
            max={120}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Debut de journee
          </label>
          <input
            type="time"
            value={settings.workingHoursStart}
            onChange={(e) =>
              setSettings((s) => ({ ...s, workingHoursStart: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fin de journee
          </label>
          <input
            type="time"
            value={settings.workingHoursEnd}
            onChange={(e) =>
              setSettings((s) => ({ ...s, workingHoursEnd: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        className="px-6 py-2.5 bg-accent text-white rounded-lg font-semibold hover:bg-accent-light transition-colors"
      >
        {saved ? "Sauvegarde !" : "Sauvegarder"}
      </button>
    </div>
  );
}
