import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import { useEstate } from '../contexts/EstateContext';

const EstateSelector = () => {
  const { selectedEstate, availableEstates, setSelectedEstate } = useEstate();
  const navigate = useNavigate();

  const handleCreateEstate = () => {
    navigate('/estates/new');
  };

  if (availableEstates.length === 0) {
    return (
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <div className="text-sm text-gray-500">No estates available</div>
        <button
          onClick={handleCreateEstate}
          className="flex items-center px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800"
        >
          <Plus className="h-4 w-4 mr-1" />
          Create Estate
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
      <div className="flex items-center space-x-4">
        <Building2 className="h-5 w-5 text-indigo-600" />
        <select
          value={selectedEstate?.id || ''}
          onChange={(e) => {
            const estate = availableEstates.find(est => est.id === e.target.value);
            if (estate) setSelectedEstate(estate);
          }}
          className="form-select text-sm border-0 focus:ring-0 py-1 pl-2 pr-8"
        >
          {availableEstates.map(estate => (
            <option key={estate.id} value={estate.id}>
              {estate.name}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={handleCreateEstate}
        className="flex items-center px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800"
      >
        <Plus className="h-4 w-4 mr-1" />
        Create Estate
      </button>
    </div>
  );
};

export default EstateSelector;