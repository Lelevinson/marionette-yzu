import React from "react"
import { useMediaDevice } from "../lib/media-device-context"

export const MicSelector = () => {
  const { selectedMicId, availableMics, setSelectedMicId } = useMediaDevice()

  if (availableMics.length <= 1) {
    return null
  }

  return (
    <select
      value={selectedMicId || ''}
      onChange={(e) => setSelectedMicId(e.target.value)}
      className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-gray-500 max-w-full truncate"
      style={{ maxWidth: '150px' }}
    >
      {availableMics.map((mic) => (
        <option key={mic.deviceId} value={mic.deviceId}>
          {mic.label || `Mic ${mic.deviceId.substring(0, 8)}`}
        </option>
      ))}
    </select>
  )
}

