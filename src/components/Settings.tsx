import React, { useState } from 'react';

interface SettingsProps {
  initialSettings: { apiKey: string; assistantId: string };
  onSave: (apiKey: string, assistantId: string) => void;
  onCancel: () => void;
}

const Settings: React.FC<SettingsProps> = ({ initialSettings, onSave, onCancel }) => {
  const [apiKey, setApiKey] = useState(initialSettings.apiKey);
  const [assistantId, setAssistantId] = useState(initialSettings.assistantId);

  const handleSave = () => {
    onSave(apiKey, assistantId);
  };

  return (
    <div className="flex flex-col items-center p-8 bg-gray-800 min-h-screen text-white">
      <h2 className="text-3xl font-bold mb-6">Settings</h2>
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">OpenAI API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-64 p-2 border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Assistant ID</label>
          <input
            type="text"
            value={assistantId}
            onChange={(e) => setAssistantId(e.target.value)}
            className="w-64 p-2 border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
          />
        </div>
      </div>
      <div className="space-x-4">
        <button
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-200 shadow-md"
          onClick={handleSave}
        >
          Save
        </button>
        <button
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-200 shadow-md"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default Settings;