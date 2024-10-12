import React, { useState, useEffect } from 'react';

interface AISettingsProps {
  onSettingsChange: (settings: AISettings) => void;
}

export interface AISettings {
  apiKey: string;
  assistantId: string;
  mode: 'teacher' | 'player';
  level: number;
}

const AISettings: React.FC<AISettingsProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<AISettings>({
    apiKey: '',
    assistantId: '',
    mode: 'player',
    level: 1,
  });

  useEffect(() => {
    const storedSettings = localStorage.getItem('aiSettings');
    if (storedSettings) {
      setSettings(JSON.parse(storedSettings));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('aiSettings', JSON.stringify(settings));
    onSettingsChange(settings);
  }, [settings, onSettingsChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: name === 'level' ? parseInt(value) : value }));
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-4">AI Settings</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">API Key</label>
        <input
          type="password"
          name="apiKey"
          value={settings.apiKey}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Assistant ID</label>
        <input
          type="text"
          name="assistantId"
          value={settings.assistantId}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Mode</label>
        <select
          name="mode"
          value={settings.mode}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        >
          <option value="player">Player</option>
          <option value="teacher">Teacher</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Level</label>
        <select
          name="level"
          value={settings.level}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        >
          <option value="1">Beginner</option>
          <option value="2">Intermediate</option>
          <option value="3">Advanced</option>
          <option value="4">Expert</option>
          <option value="5">Master</option>
        </select>
      </div>
    </div>
  );
};

export default AISettings;