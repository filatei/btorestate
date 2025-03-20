import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import { useEstate } from '../contexts/EstateContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const EstateSelector = () => {
  const { selectedEstate, availableEstates, setSelectedEstate } = useEstate();
  const navigate = useNavigate();

  const handleCreateEstate = () => {
    navigate('/estates/new');
  };

  if (availableEstates.length === 0) {
    return (
      <div className="flex items-center justify-between p-4 bg-background border-b border-border">
        <div className="text-sm text-muted-foreground">No estates available</div>
        <Button
          onClick={handleCreateEstate}
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary/80"
        >
          <Plus className="h-4 w-4 mr-1" />
          Create Estate
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mx-4 px-6 py-2 bg-background border-b border-border">
      <div className="flex items-center space-x-4">
        <Building2 className="h-5 w-5 text-primary" />
        <Select
          value={selectedEstate?.id || ''}
          onValueChange={(value) => {
            const estate = availableEstates.find(est => est.id === value);
            if (estate) setSelectedEstate(estate);
          }}
        >
          <SelectTrigger className="w-[200px] border-0 bg-transparent focus:ring-0">
            <SelectValue placeholder="Select an estate" />
          </SelectTrigger>
          <SelectContent>
            {availableEstates.map(estate => (
              <SelectItem key={estate.id} value={estate.id}>
                {estate.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={handleCreateEstate}
        variant="ghost"
        size="sm"
        className="text-primary hover:text-primary/80"
      >
        <Plus className="h-4 w-4 mr-1" />
        Create Estate
      </Button>
    </div>
  );
};

export default EstateSelector;